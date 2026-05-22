/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Layers, UserPlus, FolderPlus, ArrowRight, Eye, CheckCircle, 
  X, ShieldAlert, Award, Grid, Trash2, Globe, Send, Key, Edit3, Save, Download, BookOpen, Lock, RefreshCw
} from 'lucide-react';
import { Grade, Student, Subject, Teacher } from '../types';
import { calculateGradeResults, convertToCSV, downloadFile } from '../utils';
import { downloadStudentTranscriptPDF } from '../pdfExporter';

interface AdminPortalProps {
  teachers: Teacher[];
  grades: Grade[];
  onAddTeacher: (name: string, id: string) => void;
  onAddGrade: (id: string) => void;
  onInitializeGrade: (gradeId: string, students: Student[], subjects: Subject[]) => void;
  onPublishGrade: (gradeId: string, isPublished: boolean) => void;
  onDeleteGrade: (gradeId: string) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onDeleteStudent: (gradeId: string, studentId: string) => void;
  onDeleteSubject: (gradeId: string, subjectId: string) => void;
  onClearStudentMarks: (gradeId: string, studentId: string) => void;
  onUpdateStudentMarks: (gradeId: string, studentId: string, subjectId: string, sem1: number | null, sem2: number | null) => void;
}

export default function AdminPortal({
  teachers,
  grades,
  onAddTeacher,
  onAddGrade,
  onInitializeGrade,
  onPublishGrade,
  onDeleteGrade,
  onDeleteTeacher,
  onDeleteStudent,
  onDeleteSubject,
  onClearStudentMarks,
  onUpdateStudentMarks,
}: AdminPortalProps) {
  // Authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard navigation tab
  const [activeTab, setActiveTab] = useState<'grades' | 'teachers'>('grades');

  // Teacher Form State
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherId, setNewTeacherId] = useState('');
  const [teacherMsg, setTeacherMsg] = useState('');

  // Grade Card Form State
  const [newGradeId, setNewGradeId] = useState('');
  const [gradeMsg, setGradeMsg] = useState('');

  // Setup Wizard State
  const [selectedGradeForSetup, setSelectedGradeForSetup] = useState<Grade | null>(null);
  const [numStudents, setNumStudents] = useState<number>(5);
  const [numSubjects, setNumSubjects] = useState<number>(4);
  const [wizardStep, setWizardStep] = useState<'counts' | 'forms'>('counts');

  // Dynamic initialization state
  const [studentInputs, setStudentInputs] = useState<Array<{ id: string; name: string; sex: 'M' | 'F'; age: number }>>([]);
  const [subjectInputs, setSubjectInputs] = useState<Array<{ name: string; passkey: string; teacherId: string }>>([]);

  // Selected Grade View Page (Matrix spreadsheet)
  const [viewingGrade, setViewingGrade] = useState<Grade | null>(null);
  
  // Custom marks edit row override state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingMarks, setEditingMarks] = useState<{ [subjectId: string]: { sem1: string; sem2: string } }>({});

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'Nahom@110108') {
      setIsAdminLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Incorrect password. Please use the secure administrative credential.');
    }
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherMsg('');
    const name = newTeacherName.trim();
    const id = newTeacherId.trim().toUpperCase();

    if (!name || !id) {
      setTeacherMsg('Please enter both name and ID.');
      return;
    }

    if (teachers.some(t => t.id === id)) {
      setTeacherMsg('A teacher with this ID already exists.');
      return;
    }

    onAddTeacher(name, id);
    setNewTeacherName('');
    setNewTeacherId('');
    setTeacherMsg('✅ Teacher profile registered successfully!');
  };

  const handleCreateGrade = (e: React.FormEvent) => {
    e.preventDefault();
    setGradeMsg('');
    const id = newGradeId.trim().toUpperCase();

    if (!id) {
      setGradeMsg('Please enter a grade ID (e.g. 9C, 11B).');
      return;
    }

    // String validation (e.g. 9A, 10B, 11C)
    const gradeRegex = /^[0-9]{1,2}[A-Za-z]$/;
    if (!gradeRegex.test(id)) {
      setGradeMsg('Invalid format. Grade must look like e.g. "9A", "10C", "11B", "12A".');
      return;
    }

    if (grades.some(g => g.id === id)) {
      setGradeMsg('Grade setup card with this ID already exists.');
      return;
    }

    onAddGrade(id);
    setNewGradeId('');
    setGradeMsg('✅ Grade slot added successfully! Set it up below.');
  };

  const handleStartSetupWizard = (grade: Grade) => {
    setSelectedGradeForSetup(grade);
    setNumStudents(5);
    setNumSubjects(4);
    setWizardStep('counts');
  };

  const handleGenerateSetupForms = () => {
    // Basic clamping validation
    const studentsNum = Math.min(Math.max(numStudents, 1), 50);
    const subjectsNum = Math.min(Math.max(numSubjects, 1), 15);

    setNumStudents(studentsNum);
    setNumSubjects(subjectsNum);

    // Get all existing student IDs across all grades to guarantee absolute uniqueness
    const existingIds = grades.flatMap((g) => g.students?.map((s) => s.id) || []);
    const generatedIds: string[] = [];

    // Build empty templates for students with fully random ST#### IDs
    const initialStudents = Array.from({ length: studentsNum }, () => {
      let uniqueId = '';
      while (true) {
        const numStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const candidateId = `ST${numStr}`;
        if (!existingIds.includes(candidateId) && !generatedIds.includes(candidateId)) {
          uniqueId = candidateId;
          break;
        }
      }
      generatedIds.push(uniqueId);
      return {
        id: uniqueId,
        name: '',
        sex: 'M' as const,
        age: 15,
      };
    });

    // Common subjects names helper to auto-fill placeholders nicely
    const commonSubjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Amharic', 'Civics', 'History', 'Geography'];
    const initialSubjects = Array.from({ length: subjectsNum }, (_, idx) => ({
      name: commonSubjects[idx] || `Subject ${idx + 1}`,
      passkey: `PASSKEYS${idx + 1}`,
      teacherId: teachers[0]?.id || '',
    }));

    setStudentInputs(initialStudents);
    setSubjectInputs(initialSubjects);
    setWizardStep('forms');
  };

  const handleCompleteSetup = () => {
    if (!selectedGradeForSetup) return;

    // Validate inputs
    const isStudentsValid = studentInputs.every(s => s.name.trim() !== '');
    const isSubjectsValid = subjectInputs.every(sub => sub.name.trim() !== '' && sub.passkey.trim() !== '');

    if (!isStudentsValid || !isSubjectsValid) {
      alert('Please fill out all Student names, Subject names, and Teacher passkeys.');
      return;
    }

    // Convert wizard inputs to official state models
    const finalSubjects: Subject[] = subjectInputs.map((sub, idx) => ({
      id: `${selectedGradeForSetup.id}-SUB${idx + 1}`,
      name: sub.name.trim(),
      passkey: sub.passkey.trim().toUpperCase(),
      teacherId: sub.teacherId,
    }));

    const finalStudents: Student[] = studentInputs.map((stud) => {
      // Initialize completely empty marks
      const marksRegistry: { [subjectId: string]: { sem1: null; sem2: null } } = {};
      finalSubjects.forEach((sub) => {
        marksRegistry[sub.id] = { sem1: null, sem2: null };
      });

      return {
        id: stud.id,
        name: stud.name.trim(),
        sex: stud.sex,
        age: stud.age,
        gradeId: selectedGradeForSetup.id,
        marks: marksRegistry,
      };
    });

    onInitializeGrade(selectedGradeForSetup.id, finalStudents, finalSubjects);
    setSelectedGradeForSetup(null);
  };

  // Check if a grade is completely graded so we can highlight "Publish Results"
  const isGradeFullyGradedAndReadyToPublish = (grade: Grade): boolean => {
    if (!grade.isInitialized) return false;
    // Check if every student has values for all subjects
    return grade.students.every((stud) => {
      return grade.subjects.every((sub) => {
        const mark = stud.marks[sub.id];
        return mark && mark.sem1 !== null && mark.sem2 !== null;
      });
    });
  };

  // Matrix edit control triggers
  const handleStartEditRow = (student: Student, subjects: Subject[]) => {
    setEditingStudentId(student.id);
    const initialMarks: { [subId: string]: { sem1: string; sem2: string } } = {};
    subjects.forEach((sub) => {
      const mark = student.marks[sub.id];
      initialMarks[sub.id] = {
        sem1: mark?.sem1 !== null ? mark.sem1.toString() : '',
        sem2: mark?.sem2 !== null ? mark.sem2.toString() : '',
      };
    });
    setEditingMarks(initialMarks);
  };

  const handleSaveRow = (studentId: string, gradeId: string, subjects: Subject[]) => {
    subjects.forEach((sub) => {
      const s1Raw = editingMarks[sub.id]?.sem1 ?? '';
      const s2Raw = editingMarks[sub.id]?.sem2 ?? '';

      const sem1 = s1Raw === '' ? null : Math.min(Math.max(parseFloat(s1Raw), 0), 100);
      const sem2 = s2Raw === '' ? null : Math.min(Math.max(parseFloat(s2Raw), 0), 100);

      onUpdateStudentMarks(gradeId, studentId, sub.id, sem1, sem2);
    });

    setEditingStudentId(null);
    // Refresh viewing grade matching data to see visual changes
    const match = grades.find(g => g.id === gradeId);
    if (match) setViewingGrade(match);
  };

  // Download all students of a grade and marks in CSV matrix format
  const handleExportGradeMatrixCSV = (grade: Grade) => {
    const updatedStudents = calculateGradeResults(grade);

    // Headers: Student ID, Student Name, Sex, Age, sub1 sem1, sub1 sem2, sub1 avg, ... Semester stats
    const headers = ['Student ID', 'Student Name', 'Sex', 'Age'];
    grade.subjects.forEach((sub) => {
      headers.push(`${sub.name} Sem 1`, `${sub.name} Sem 2`, `${sub.name} Avg`);
    });
    headers.push(
      'Sem 1 Total', 'Sem 1 Avg', 'Sem 1 Rank', 'Sem 1 Status',
      'Sem 2 Total', 'Sem 2 Avg', 'Sem 2 Rank', 'Sem 2 Status',
      'Final Total', 'Final Avg', 'Final Rank', 'Final Status'
    );

    const rows = updatedStudents.map((stud) => {
      const row = [stud.id, stud.name, stud.sex, stud.age.toString()];
      grade.subjects.forEach((sub) => {
        const mark = stud.marks[sub.id];
        const s1 = mark?.sem1 !== null && mark?.sem1 !== undefined ? mark.sem1.toString() : 'Unfilled';
        const s2 = mark?.sem2 !== null && mark?.sem2 !== undefined ? mark.sem2.toString() : 'Unfilled';
        let avg = 'Unfilled';
        if (mark?.sem1 !== null && mark?.sem1 !== undefined && mark?.sem2 !== null && mark?.sem2 !== undefined) {
          avg = ((mark.sem1 + mark.sem2) / 2).toString();
        }
        row.push(s1, s2, avg);
      });
      row.push(
        stud.sem1Total !== undefined ? stud.sem1Total.toString() : '—',
        stud.sem1Average !== undefined ? stud.sem1Average.toString() : 'Incomplete',
        stud.sem1Rank !== undefined ? stud.sem1Rank.toString() : 'N/A',
        stud.sem1Status || 'Incomplete',

        stud.sem2Total !== undefined ? stud.sem2Total.toString() : '—',
        stud.sem2Average !== undefined ? stud.sem2Average.toString() : 'Incomplete',
        stud.sem2Rank !== undefined ? stud.sem2Rank.toString() : 'N/A',
        stud.sem2Status || 'Incomplete',

        stud.finalTotal !== undefined ? stud.finalTotal.toString() : '—',
        stud.finalAverage !== undefined ? stud.finalAverage.toString() : 'Incomplete',
        stud.finalRank !== undefined ? stud.finalRank.toString() : 'Pending',
        stud.finalStatus || 'Incomplete'
      );
      return row;
    });

    const csvContent = convertToCSV(headers, rows);
    downloadFile(csvContent, `school_matrix_${grade.id}.csv`, 'text/csv');
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-12" id="adminLogin">
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-8">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-[#38BDF8] rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-850">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
            Administrator Gateway
          </h2>
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-6 px-1">
            Enter the secure administrator passkey to initialize classroom sizes, provision teacher credentials, and publish academic records.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-505 uppercase tracking-wider mb-2">Secure Passkey</label>
              <input
                id="adminPasswordInput"
                type="password"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8] transition-all font-mono text-xs"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
            </div>

            {loginError && (
              <p className="text-red-500 text-xs font-semibold text-center">{loginError}</p>
            )}

            <button
              id="adminLoginSubmit"
              type="submit"
              className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#38BDF8] dark:hover:bg-[#56c5f7] text-white dark:text-[#0F172A] font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all border border-transparent dark:border-transparent"
            >
              <span>Unlock Admin Panel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <span className="block text-[10px] text-center text-slate-400 dark:text-slate-500 font-mono italic mt-4">
              Enter authorized administrator credentials to manage records.
            </span>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" id="adminDashboard">
      {/* Header and Quick Switch Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            Control Center Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Register teachers, initialize high schools, configure subjects, and review results sheets.
          </p>
        </div>

        {/* Toolbar Tabs */}
        <div className="flex items-center gap-2 w-full md:w-auto self-stretch md:self-auto border-b md:border-0 border-slate-200 dark:border-slate-800 pb-2 md:pb-0">
          <button
            onClick={() => { setActiveTab('grades'); setViewingGrade(null); setSelectedGradeForSetup(null); }}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              activeTab === 'grades'
                ? 'bg-[#0F172A] border-[#0F172A] dark:bg-[#38BDF8] dark:border-transparent text-white dark:text-[#0F172A] shadow-xs'
                : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Grade Setup ({grades.length})
          </button>
          <button
            onClick={() => { setActiveTab('teachers'); setViewingGrade(null); setSelectedGradeForSetup(null); }}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              activeTab === 'teachers'
                ? 'bg-[#0F172A] border-[#0F172A] dark:bg-[#38BDF8] dark:border-transparent text-white dark:text-[#0F172A] shadow-xs'
                : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Teacher Registry ({teachers.length})
          </button>
        </div>
      </div>

      {/* Main Content Layout based on active tab */}
      <AnimatePresence mode="wait">
        {/* VIEWING GRADE RESULT SHEET DETAIL OVERLAY (Interactive Matrix) */}
        {viewingGrade && (
          <motion.div
            key="viewingGrade"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 mb-10 shadow-lg"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4 mb-6">
              <div>
                <button
                  onClick={() => setViewingGrade(null)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline mb-1 flex items-center gap-1 cursor-pointer"
                >
                  ← Return to Classroom Setup Cards
                </button>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Grid className="w-5 h-5 text-indigo-505 text-emerald-500" />
                  Grade {viewingGrade.id} Academic Registry Matrix
                </h3>
                <p className="text-xs text-neutral-500 font-medium">
                  Configured {viewingGrade.students.length} students • {viewingGrade.subjects.length} subject courses
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleExportGradeMatrixCSV(viewingGrade)}
                  className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-850 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-bold rounded-lg text-xs flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Sheet CSV
                </button>

                {isGradeFullyGradedAndReadyToPublish(viewingGrade) ? (
                  <button
                    onClick={() => {
                      onPublishGrade(viewingGrade.id, !viewingGrade.isPublished);
                      setViewingGrade({ ...viewingGrade, isPublished: !viewingGrade.isPublished });
                    }}
                    className={`px-3.5 py-1.5 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                      viewingGrade.isPublished
                        ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {viewingGrade.isPublished ? 'Revoke Publication' : 'Publish Results to Portal'}
                  </button>
                ) : (
                  <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full inline-block animate-pulse" />
                    Teacher Input in Progress
                  </div>
                )}
              </div>
            </div>

            {/* Matrix spreadsheet view of the class */}
            <div className="overflow-x-auto border border-neutral-100 dark:border-neutral-800 rounded-xl mb-4 max-h-[500px]">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-10">
                    <th className="py-2.5 px-3 font-semibold text-[11px] uppercase text-neutral-400">Student Info</th>
                    {viewingGrade.subjects.map(sub => (
                      <th key={sub.id} className="py-2.5 px-3 text-center font-semibold text-[11px] uppercase text-neutral-400 border-l border-neutral-100 dark:border-neutral-800/80" colSpan={2}>
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-bold text-neutral-800 dark:text-neutral-200 line-clamp-1">{sub.name}</span>
                          <button
                            onClick={() => {
                              if (confirm(`Are you absolutely sure you want to delete subject "${sub.name}" from Grade ${viewingGrade.id}? This will permanently remove all student marks recorded for this subject.`)) {
                                onDeleteSubject(viewingGrade.id, sub.id);
                                setViewingGrade({
                                  ...viewingGrade,
                                  subjects: viewingGrade.subjects.filter(s => s.id !== sub.id),
                                  students: viewingGrade.students.map(std => {
                                    const nextMarks = { ...std.marks };
                                    delete nextMarks[sub.id];
                                    return { ...std, marks: nextMarks };
                                  })
                                });
                              }
                            }}
                            className="p-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded cursor-pointer transition-colors"
                            title="Delete subject"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[9px] font-normal leading-none font-mono text-neutral-400 mt-1">Key: {sub.passkey}</div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center font-semibold text-[11px] uppercase text-neutral-400 border-l border-neutral-100 dark:border-neutral-800">Summary</th>
                  </tr>
                  <tr className="bg-neutral-100 dark:bg-neutral-850 border-b border-neutral-200 dark:border-neutral-750 text-[10px] text-neutral-500 font-bold">
                    <th className="py-1 px-3">Unique Name & ID</th>
                    {viewingGrade.subjects.map(sub => (
                      <React.Fragment key={`${sub.id}-sc`}>
                        <th className="py-1 px-1.5 text-center border-l border-neutral-100 dark:border-neutral-800/80 w-12 font-mono">S-1</th>
                        <th className="py-1 px-1.5 text-center w-12 font-mono">S-2</th>
                      </React.Fragment>
                    ))}
                    <th className="py-1 px-3 border-l border-neutral-100 dark:border-neutral-800">Total • Avg • Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                  {calculateGradeResults(viewingGrade).map((stud) => {
                    const isEditing = editingStudentId === stud.id;

                    return (
                      <tr key={stud.id} className="hover:bg-neutral-55/30 transition-colors">
                        {/* Student metadata */}
                        <td className="py-2 px-3">
                          <div className="font-semibold text-neutral-800 dark:text-neutral-100">{stud.name}</div>
                          <div className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">{stud.id} • {stud.sex} ({stud.age})</div>
                        </td>

                        {/* Student Subject Marks columns */}
                        {viewingGrade.subjects.map((sub) => {
                          const mark = stud.marks[sub.id];

                          if (isEditing) {
                            return (
                              <React.Fragment key={`${stud.id}-${sub.id}`}>
                                <td className="py-1 px-1 text-center border-l border-neutral-100 dark:border-neutral-800">
                                  <input
                                    type="number"
                                    className="w-10 text-center px-1 py-0.5 bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-750 text-neutral-900 dark:text-white rounded text-xs font-mono"
                                    value={editingMarks[sub.id]?.sem1 ?? ''}
                                    placeholder="—"
                                    min="0"
                                    max="100"
                                    onChange={(e) => setEditingMarks({
                                      ...editingMarks,
                                      [sub.id]: { ...editingMarks[sub.id], sem1: e.target.value }
                                    })}
                                  />
                                </td>
                                <td className="py-1 px-1 text-center">
                                  <input
                                    type="number"
                                    className="w-10 text-center px-1 py-0.5 bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-750 text-neutral-900 dark:text-white rounded text-xs font-mono"
                                    value={editingMarks[sub.id]?.sem2 ?? ''}
                                    placeholder="—"
                                    min="0"
                                    max="100"
                                    onChange={(e) => setEditingMarks({
                                      ...editingMarks,
                                      [sub.id]: { ...editingMarks[sub.id], sem2: e.target.value }
                                    })}
                                  />
                                </td>
                              </React.Fragment>
                            );
                          }

                          return (
                            <React.Fragment key={`${stud.id}-${sub.id}`}>
                              <td className={`py-2 px-1 text-center border-l font-mono ${mark?.sem1 === null ? 'text-neutral-400 italic' : 'text-neutral-900 dark:text-neutral-300'}`}>
                                {mark?.sem1 !== null ? mark?.sem1 : '—'}
                              </td>
                              <td className={`py-2 px-1 text-center font-mono ${mark?.sem2 === null ? 'text-neutral-400 italic' : 'text-neutral-900 dark:text-neutral-300'}`}>
                                {mark?.sem2 !== null ? mark?.sem2 : '—'}
                              </td>
                            </React.Fragment>
                          );
                        })}

                        {/* Calculated Summary metrics side-by-side or stacked card */}
                        <td className="py-2 px-3 border-l border-neutral-100 dark:border-neutral-800 text-[10px]">
                          <div className="flex flex-col gap-1 text-right divide-y divide-neutral-100 dark:divide-neutral-800/60 pr-1 select-none">
                            {/* Semester 1 stats */}
                            <div>
                              <span className="text-neutral-400 dark:text-neutral-500 font-mono uppercase text-[7px] block tracking-tighter leading-none">Sem 1</span>
                              {stud.sem1Average !== undefined ? (
                                <span className="font-mono text-[9px] text-[#009b3a] font-bold block leading-tight">
                                  {stud.sem1Average.toFixed(1)}% <span className="text-neutral-550 font-normal">Rank:</span>#{stud.sem1Rank}
                                </span>
                              ) : (
                                <span className="text-neutral-400 italic text-[8.5px] block leading-tight">Incomplete</span>
                              )}
                            </div>
                            
                            {/* Semester 2 stats */}
                            <div className="pt-0.5">
                              <span className="text-neutral-400 dark:text-neutral-500 font-mono uppercase text-[7px] block tracking-tighter leading-none">Sem 2</span>
                              {stud.sem2Average !== undefined ? (
                                <span className="font-mono text-[9px] text-[#009b3a] font-bold block leading-tight">
                                  {stud.sem2Average.toFixed(1)}% <span className="text-neutral-550 font-normal">Rank:</span>#{stud.sem2Rank}
                                </span>
                              ) : (
                                <span className="text-neutral-400 italic text-[8.5px] block leading-tight">Incomplete</span>
                              )}
                            </div>

                            {/* Final Cumulative stats */}
                            <div className="pt-0.5">
                              <span className="text-indigo-500 font-mono uppercase text-[7px] block tracking-tighter font-extrabold leading-none">Final</span>
                              {stud.finalAverage !== undefined ? (
                                <span className="font-mono text-[9px] text-[#da121a] dark:text-red-400 font-extrabold block leading-tight">
                                  {stud.finalAverage.toFixed(1)}% <span className="text-neutral-550 font-bold">Rank:</span>#{stud.finalRank} ({stud.finalStatus})
                                </span>
                              ) : (
                                <span className="text-neutral-440 italic text-[8.5px] block leading-tight">Incomplete</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Action buttons per student */}
                        <td className="py-2 px-2 text-center">
                          {isEditing ? (
                            <div className="flex items-center gap-1 justify-center">
                              <button
                                onClick={() => handleSaveRow(stud.id, viewingGrade.id, viewingGrade.subjects)}
                                className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 rounded cursor-pointer"
                                title="Save changes"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingStudentId(null)}
                                className="p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 justify-center">
                              <button
                                onClick={() => handleStartEditRow(stud, viewingGrade.subjects)}
                                className="p-1 text-neutral-400 hover:text-indigo-500 dark:hover:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-neutral-850 rounded transition-colors cursor-pointer"
                                title="Modify student scores"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* PDF Download Transcript */}
                              <button
                                onClick={() => downloadStudentTranscriptPDF(stud, viewingGrade)}
                                className="p-1 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded transition-colors cursor-pointer"
                                title="Download Transcript (PDF)"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {/* Clear entire score record values */}
                              <button
                                onClick={() => {
                                  if (confirm(`Are you absolutely sure you want to clear/reset all marks for student ${stud.name}? This resets all their recorded semester results to unfilled.`)) {
                                    onClearStudentMarks(viewingGrade.id, stud.id);
                                    setViewingGrade({
                                      ...viewingGrade,
                                      students: viewingGrade.students.map(s => {
                                        if (s.id === stud.id) {
                                          const resetMarks = { ...s.marks };
                                          Object.keys(resetMarks).forEach(k => {
                                            resetMarks[k] = { sem1: null, sem2: null };
                                          });
                                          return { ...s, marks: resetMarks };
                                        }
                                        return s;
                                      })
                                    });
                                  }
                                }}
                                className="p-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded transition-colors cursor-pointer"
                                title="Clear student scores"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>

                              {/* Delete Student entirely */}
                              <button
                                onClick={() => {
                                  if (confirm(`Are you absolutely sure you want to delete student ${stud.name} (${stud.id}) from Grade ${viewingGrade.id}? All their recorded metrics will be permanently deleted.`)) {
                                    onDeleteStudent(viewingGrade.id, stud.id);
                                    setViewingGrade({
                                      ...viewingGrade,
                                      students: viewingGrade.students.filter(s => s.id !== stud.id)
                                    });
                                  }
                                }}
                                className="p-1 text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors cursor-pointer"
                                title="Delete student profile"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-neutral-150 dark:border-neutral-850 flex items-center justify-between text-xs text-neutral-500">
              <span className="font-medium">⚠️ Pro-Tip: S-1 stands for Semester 1, S-2 stands for Semester 2. Click the edit pencil icon to quickly patch results inline.</span>
              <button
                onClick={() => setViewingGrade(null)}
                className="font-bold text-emerald-500 uppercase tracking-widest hover:underline cursor-pointer"
              >
                Close Sheets
              </button>
            </div>
          </motion.div>
        )}

        {/* SETUP WIZARD DOCK SELECTOR (Setup Students or counts) */}
        {selectedGradeForSetup && (
          <motion.div
            key="wizardDock"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white dark:bg-neutral-900 border border-indigo-500/25 dark:border-indigo-500/25 shadow-xl rounded-2xl p-6 mb-10"
          >
            <div className="flex justify-between items-start border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-6">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-indigo-500" />
                  Grade {selectedGradeForSetup.id} Setup Wizard
                </h3>
                <p className="text-xs text-neutral-400">Configure size metrics and generate dynamic setup registration boards.</p>
              </div>
              <button
                onClick={() => setSelectedGradeForSetup(null)}
                className="p-1.5 hover:bg-neutral-150 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Counts step */}
            {wizardStep === 'counts' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Number of Students (1–50)</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={numStudents}
                      onChange={(e) => setNumStudents(parseInt(e.target.value) || 0)}
                    />
                    <span className="text-[10px] text-neutral-400 mt-1 block">Specify the count of active students inside Grade {selectedGradeForSetup.id} section.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Number of Subject Courses (1–15)</label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      value={numSubjects}
                      onChange={(e) => setNumSubjects(parseInt(e.target.value) || 0)}
                    />
                    <span className="text-[10px] text-neutral-400 mt-1 block">Define how many core courses the teachers will grade for calculation.</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setSelectedGradeForSetup(null)}
                    className="px-4 py-2 text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                  >
                    Cancel Setup
                  </button>
                  <button
                    onClick={handleGenerateSetupForms}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    Generate Dynamic Forms
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Forms validation step */}
            {wizardStep === 'forms' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-h-[450px] overflow-y-auto pr-2">
                  
                  {/* STUDENTS LISTING CARO */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                      <Users className="w-4 h-4 text-emerald-500" />
                      Student Information Roster Setup
                    </h4>

                    {studentInputs.map((stud, idx) => {
                      const computedID = stud.id;
                      return (
                        <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-150 dark:border-neutral-850 grid grid-cols-12 gap-2.5 items-center">
                          <div className="col-span-3 text-left">
                            <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Assigned ID</span>
                            <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{computedID}</span>
                          </div>

                          <div className="col-span-4">
                            <input
                              type="text"
                              required
                              className="w-full px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded font-medium text-xs text-neutral-900 dark:text-white"
                              placeholder="Full Name"
                              value={stud.name}
                              onChange={(e) => {
                                const copy = [...studentInputs];
                                copy[idx].name = e.target.value;
                                setStudentInputs(copy);
                              }}
                            />
                          </div>

                          <div className="col-span-2.5">
                            <select
                              className="w-full px-1.5 py-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-xs"
                              value={stud.sex}
                              onChange={(e) => {
                                const copy = [...studentInputs];
                                copy[idx].sex = e.target.value as 'M' | 'F';
                                setStudentInputs(copy);
                              }}
                            >
                              <option value="M">Male</option>
                              <option value="F">Female</option>
                            </select>
                          </div>

                          <div className="col-span-2.5">
                            <input
                              type="number"
                              min="5"
                              max="30"
                              className="w-full px-1.5 py-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-xs font-mono"
                              value={stud.age}
                              onChange={(e) => {
                                const copy = [...studentInputs];
                                copy[idx].age = parseInt(e.target.value) || 0;
                                setStudentInputs(copy);
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* SUBJECTS LIST COFFIN */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                      <BookOpen className="w-4 h-4 text-indigo-505" />
                      Subject Definitions & Teacher keys
                    </h4>

                    {subjectInputs.map((sub, idx) => {
                      const subjId = `${selectedGradeForSetup.id}-SUB${idx + 1}`;
                      return (
                        <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-150 dark:border-neutral-850 space-y-2.5">
                          <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono">
                            <span>COURSE #{idx + 1}</span>
                            <span>ID: {subjId}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Subject Title</label>
                              <input
                                type="text"
                                required
                                className="w-full px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-xs"
                                placeholder="e.g. Mathematics"
                                value={sub.name}
                                onChange={(e) => {
                                  const copy = [...subjectInputs];
                                  copy[idx].name = e.target.value;
                                  setSubjectInputs(copy);
                                }}
                              />
                            </div>

                            <div>
                              <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Passkey (Authorization Code)</label>
                              <input
                                type="text"
                                required
                                className="w-full px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-xs font-mono uppercase"
                                placeholder="Unique Key (e.g. MATH9)"
                                value={sub.passkey}
                                onChange={(e) => {
                                  const copy = [...subjectInputs];
                                  copy[idx].passkey = e.target.value;
                                  setSubjectInputs(copy);
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Assign Teacher Instructor</label>
                            <select
                              className="w-full px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-xs"
                              value={sub.teacherId}
                              onChange={(e) => {
                                const copy = [...subjectInputs];
                                copy[idx].teacherId = e.target.value;
                                setSubjectInputs(copy);
                              }}
                            >
                              <option value="">No Teacher assigned</option>
                              {teachers.map((teach) => (
                                <option key={teach.id} value={teach.id}>
                                  {teach.name} ({teach.id})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>

                <div className="flex justify-between items-center pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    onClick={() => setWizardStep('counts')}
                    className="px-4 py-2 text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                  >
                    ← Back to Size Metrics
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedGradeForSetup(null)}
                      className="px-4 py-2 text-xs font-bold text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                    >
                      Reset All
                    </button>
                    <button
                      onClick={handleCompleteSetup}
                      className="px-5 py-2.5 bg-[#009b3a] hover:bg-[#008030] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Save Grade & Generate Empty sheets
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 1: GRADE SETUP DOCK */}
        {activeTab === 'grades' && !viewingGrade && !selectedGradeForSetup && (
          <motion.div
            key="gradesTab"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* Inner setup card generator form */}
            <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="font-bold text-neutral-800 dark:text-white text-sm">Add New Grade Section Slots</h4>
                <p className="text-xs text-neutral-500 leading-none mt-0.5">Slots must represent unique rooms (e.g. "9C", "10A", "11B").</p>
              </div>

              <form onSubmit={handleCreateGrade} className="flex gap-2 w-full md:w-auto">
                <input
                  type="text"
                  maxLength={4}
                  className="px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg font-mono text-xs text-neutral-900 dark:text-white placeholder-neutral-400 w-full sm:w-28 uppercase"
                  placeholder="e.g. 9C"
                  value={newGradeId}
                  onChange={(e) => setNewGradeId(e.target.value)}
                />
                <button
                  id="addGradeButton"
                  type="submit"
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  Add Card
                </button>
              </form>
            </div>

            {gradeMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 ml-1 mt-1 font-medium">{gradeMsg}</p>
            )}

            {/* Interactive Cards grid of established classrooms */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {grades.map((grade) => {
                const isReady = isGradeFullyGradedAndReadyToPublish(grade);
                return (
                  <div
                    key={grade.id}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Visual indicators */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-2xl font-black text-neutral-900 dark:text-white tracking-widest">{grade.id}</span>
                        <span className="block text-[10px] text-neutral-400 font-mono mt-0.5">ID_REF: GRADE_{grade.id}</span>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        {grade.isInitialized ? (
                          <span className="px-2 py-0.5 bg-green-500/10 border border-green-55/20 text-green-600 dark:text-green-400 text-[9px] font-mono rounded font-bold uppercase">
                            Initialized
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-500/10 border border-red-55/20 text-red-500 text-[9px] font-mono rounded font-bold uppercase animate-pulse">
                            Empty Slot
                          </span>
                        )}

                        {grade.isPublished ? (
                          <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-55/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-mono rounded font-medium uppercase">
                            Published
                          </span>
                        ) : grade.isInitialized ? (
                          <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-850 text-neutral-400 text-[9px] font-mono rounded font-medium uppercase">
                            Draft Mode
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Stats body summary */}
                    <div className="space-y-2 mb-4 border-t border-b border-neutral-50 dark:border-neutral-850 py-3 text-xs text-neutral-500">
                      <div className="flex justify-between">
                        <span>Total Roster Students</span>
                        <span className="font-bold font-mono text-neutral-700 dark:text-neutral-300">
                          {grade.isInitialized ? grade.students.length : 'unconfigured'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subject Courses</span>
                        <span className="font-bold font-mono text-neutral-700 dark:text-neutral-300">
                          {grade.isInitialized ? grade.subjects.length : 'unconfigured'}
                        </span>
                      </div>
                    </div>

                    {/* Footer Trigger Operations based on initialized state */}
                    <div className="flex items-center gap-2 pt-2">
                      {grade.isInitialized ? (
                        <>
                          <button
                            onClick={() => setViewingGrade(grade)}
                            className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Open Sheets
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you absolutely sure you want to completely erase classroom ${grade.id}? All recorded marks data will be lost.`)) {
                                onDeleteGrade(grade.id);
                              }
                            }}
                            className="p-2 border border-red-500/10 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-700 rounded-lg cursor-pointer transition-colors"
                            title="Delete this grade"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStartSetupWizard(grade)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          Initialize Class Setup
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TAB 2: TEACHER REGISTRY */}
        {activeTab === 'teachers' && (
          <motion.div
            key="teachersTab"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Registration Box column */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 h-fit shadow-xs">
              <h4 className="text-base font-bold text-neutral-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 text-[#009b3a]" />
                Register Teacher Instructor
              </h4>
              <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
                Add teacher credentials to register authorized school lecturers. Instructors log in to grade subject matrices using these exact passwords.
              </p>

              <form onSubmit={handleCreateTeacher} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Teacher Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g. Aster Kebede"
                    value={newTeacherName}
                    onChange={(e) => setNewTeacherName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Unique Teacher ID Reference</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono uppercase"
                    placeholder="e.g. T-104"
                    value={newTeacherId}
                    onChange={(e) => setNewTeacherId(e.target.value)}
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">Specify matching codes like T-105, T-106, etc.</span>
                </div>

                {teacherMsg && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{teacherMsg}</p>
                )}

                <button
                  id="addTeacherSubmitBtn"
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Provision Instructor Accounts
                </button>
              </form>
            </div>

            {/* List column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
                <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Currently Provisioned Lecturers Info</span>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 border-b border-neutral-150 dark:border-neutral-850">
                        <th className="py-2.5 px-3 font-semibold text-[10px] uppercase">Lecturer Reference Key</th>
                        <th className="py-2.5 px-3 font-semibold text-[10px] uppercase">Teacher Instructor Name</th>
                        <th className="py-2.5 px-3 font-semibold text-[10px] uppercase">Active Assigned Rooms</th>
                        <th className="py-2.5 px-3 font-semibold text-[10px] uppercase text-center w-12">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                      {teachers.map((teach) => {
                        // Find rooms they teach
                        const assignedClasses: string[] = [];
                        grades.forEach(g => {
                          if (g.isInitialized && g.subjects.some(s => s.teacherId === teach.id)) {
                            assignedClasses.push(g.id);
                          }
                        });

                        return (
                          <tr key={teach.id} className="hover:bg-neutral-55/35">
                            <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {teach.id}
                            </td>
                            <td className="py-3 px-3 font-semibold text-neutral-805 dark:text-neutral-150">
                              {teach.name}
                            </td>
                            <td className="py-3 px-3">
                              {assignedClasses.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {assignedClasses.map(c => (
                                    <span key={c} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold rounded text-[9px]">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-neutral-400 text-[10px] italic">Not assigned to active rosters yet</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => {
                                  if (confirm(`Are you absolutely sure you want to delete teacher ${teach.name} (${teach.id})? This will unassign this teacher record from all subjects safely.`)) {
                                    onDeleteTeacher(teach.id);
                                  }
                                }}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded cursor-pointer transition-colors"
                                title="Delete Teacher"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
