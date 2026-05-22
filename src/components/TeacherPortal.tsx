/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Key, Grid, CheckCircle2, ChevronRight, Lock, 
  Layers, ArrowLeft, ArrowRight, BookOpen, AlertCircle, Save, Download
} from 'lucide-react';
import { Grade, Student, Subject, Teacher } from '../types';
import { calculateGradeResults, convertToCSV, downloadFile } from '../utils';
import { downloadStudentTranscriptPDF } from '../pdfExporter';

interface TeacherPortalProps {
  teachers: Teacher[];
  grades: Grade[];
  onUpdateStudentMarks: (gradeId: string, studentId: string, subjectId: string, sem1: number | null, sem2: number | null) => void;
}

export default function TeacherPortal({
  teachers,
  grades,
  onUpdateStudentMarks,
}: TeacherPortalProps) {
  // Authentication states
  const [loggedInTeacher, setLoggedInTeacher] = useState<Teacher | null>(null);
  const [loginNameInput, setLoginNameInput] = useState('');
  const [loginIdInput, setLoginIdInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Selected class & subject state
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [isPasskeyAuthorized, setIsPasskeyAuthorized] = useState(false);

  // Spreadsheet editor form values
  // Locally holding current inputs so they don't jump around during multiple keystrokes, standard form optimization
  const [editingMarksRegistry, setEditingMarksRegistry] = useState<{ [studentId: string]: { sem1: string; sem2: string } }>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanName = loginNameInput.trim().toLowerCase();
    const cleanId = loginIdInput.trim().toUpperCase();

    if (!cleanName || !cleanId) {
      setLoginError('Please enter both your name and unique ID.');
      return;
    }

    const match = teachers.find(t => t.id === cleanId && t.name.toLowerCase() === cleanName);
    if (match) {
      setLoggedInTeacher(match);
      setLoginError('');
    } else {
      setLoginError('Invalid login credentials. Ask your Administrator to register lockups in "Teacher Registry".');
    }
  };

  const handleQuickDemoLogin = (id: string, name: string) => {
    setLoginIdInput(id);
    setLoginNameInput(name);
    setTimeout(() => {
      const match = teachers.find(t => t.id === id);
      if (match) {
        setLoggedInTeacher(match);
        setLoginError('');
      }
    }, 50);
  };

  const handleOpenGradeDeck = (grade: Grade) => {
    setSelectedGrade(grade);
    setSelectedSubject(null);
    setIsPasskeyAuthorized(false);
    setPasskeyInput('');
    setPasskeyError('');
    setSaveSuccessMsg('');
  };

  const handleSelectSubject = (subj: Subject) => {
    setSelectedSubject(subj);
    setIsPasskeyAuthorized(false);
    setPasskeyInput('');
    setPasskeyError('');
    setSaveSuccessMsg('');
  };

  const handleAuthorizePasskey = (e: React.FormEvent) => {
    e.preventDefault();
    setPasskeyError('');

    if (!selectedSubject) return;

    if (passkeyInput.trim().toUpperCase() === selectedSubject.passkey.toUpperCase()) {
      setIsPasskeyAuthorized(true);
      setPasskeyError('');

      // Initialize the editing grid registry with current saved values
      const initialRegistry: { [studentId: string]: { sem1: string; sem2: string } } = {};
      selectedGrade?.students.forEach((student) => {
        const mark = student.marks[selectedSubject.id];
        initialRegistry[student.id] = {
          sem1: mark?.sem1 !== null && mark?.sem1 !== undefined ? mark.sem1.toString() : '',
          sem2: mark?.sem2 !== null && mark?.sem2 !== undefined ? mark.sem2.toString() : '',
        };
      });
      setEditingMarksRegistry(initialRegistry);
    } else {
      setPasskeyError('Incorrect subject passkey. Check with your Admin for teacher course permissions.');
    }
  };

  const handleSaveAllGrades = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccessMsg('');

    if (!selectedGrade || !selectedSubject) return;

    // Save each student's input marks to global store through parent trigger
    selectedGrade.students.forEach((student) => {
      const record = editingMarksRegistry[student.id];
      if (record) {
        // Validation & Parsing
        const s1Raw = record.sem1.trim();
        const s2Raw = record.sem2.trim();

        const sem1 = s1Raw === '' ? null : Math.min(Math.max(parseFloat(s1Raw), 0), 100);
        const sem2 = s2Raw === '' ? null : Math.min(Math.max(parseFloat(s2Raw), 0), 100);

        onUpdateStudentMarks(selectedGrade.id, student.id, selectedSubject.id, sem1, sem2);
      }
    });

    setSaveSuccessMsg('🎉 Semester Marks saved successfully! Student rosters averages and class rankings updated.');
    setTimeout(() => setSaveSuccessMsg(''), 5000);
  };

  const handleExportCourseCSV = () => {
    if (!selectedGrade || !selectedSubject) return;

    const headers = ['Student ID', 'Student Name', 'Sex', 'Age', 'Semester 1 Mark', 'Semester 2 Mark', 'Subject Average'];
    const rows = selectedGrade.students.map((student) => {
      const record = editingMarksRegistry[student.id];
      const s1 = record?.sem1 !== '' ? record.sem1 : 'Unfilled';
      const s2 = record?.sem2 !== '' ? record.sem2 : 'Unfilled';
      
      let avg = 'Unfilled';
      if (record?.sem1 !== '' && record?.sem2 !== '') {
        const v1 = parseFloat(record.sem1);
        const v2 = parseFloat(record.sem2);
        avg = ((v1 + v2) / 2).toFixed(1);
      }

      return [student.id, student.name, student.sex, student.age.toString(), s1, s2, avg];
    });

    const csvContent = convertToCSV(headers, rows);
    downloadFile(csvContent, `grade_sheets_${selectedGrade.id}_${selectedSubject.name}.csv`, 'text/csv');
  };

  // Find other grades where teacher has courses
  const getTeacherGrades = (): Grade[] => {
    if (!loggedInTeacher) return [];
    return grades.filter(g => {
      return g.isInitialized && g.subjects.some(s => s.teacherId === loggedInTeacher.id);
    });
  };

  if (!loggedInTeacher) {
    return (
      <div className="max-w-md mx-auto my-12" id="teacherLogin">
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-8">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-[#38BDF8] rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-850">
            <Users className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
            Instructor Portal Sign-In
          </h2>
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-6 font-medium">
            Authorized teachers log in here using administrator credentials to securely record terminal transcript results.
          </p>

          <form onSubmit={handleTeacherLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-505 uppercase tracking-wider mb-2">Instructor ID</label>
              <input
                id="teacherIdInput"
                type="text"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8] font-mono text-xs uppercase"
                placeholder="e.g. T-101"
                value={loginIdInput}
                onChange={(e) => setLoginIdInput(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-505 uppercase tracking-wider mb-2">Instructor Registered Name</label>
              <input
                id="teacherNameInput"
                type="text"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8] text-xs"
                placeholder="e.g. Abebe Kebede"
                value={loginNameInput}
                onChange={(e) => setLoginNameInput(e.target.value)}
              />
            </div>

            {loginError && (
              <p className="text-red-500 text-xs font-semibold text-center">{loginError}</p>
            )}

            <button
              id="teacherSignButton"
              type="submit"
              className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#38BDF8] dark:hover:bg-[#56c5f7] text-white dark:text-[#0F172A] font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all border border-transparent dark:border-transparent"
            >
              <span>Verify Instructor ID</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick Demo Assist */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <span className="block text-[10px] text-slate-455 font-mono mb-2 uppercase tracking-wide">💡 Demo accounts:</span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('T-101', 'Abebe Kebede')}
                  className="p-2 border border-slate-250 dark:border-slate-800 hover:border-[#38BDF8] dark:hover:border-[#38BDF8] bg-slate-50 dark:bg-slate-850 rounded-lg text-left cursor-pointer transition-colors"
                >
                  <span className="block font-bold text-slate-800 dark:text-slate-200 truncate">Abebe Kebede</span>
                  <span className="block font-mono text-slate-400 uppercase text-[9px] mt-0.5">id: T-101</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('T-103', 'Mulugeta Tesfaye')}
                  className="p-2 border border-slate-250 dark:border-slate-800 hover:border-[#38BDF8] dark:hover:border-[#38BDF8] bg-slate-50 dark:bg-slate-850 rounded-lg text-left cursor-pointer transition-colors"
                >
                  <span className="block font-bold text-slate-800 dark:text-slate-200 truncate">Mulugeta T.</span>
                  <span className="block font-mono text-slate-400 uppercase text-[9px] mt-0.5">id: T-103</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const teacherGrades = getTeacherGrades();

  return (
    <div className="w-full">
      {/* Back button and profile details */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5 mb-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800/80 flex items-center justify-center font-bold text-slate-800 dark:text-[#38BDF8] text-xs">
            {loggedInTeacher.name.split(' ').map(w => w[0]).join('')}
          </div>
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">authorized faculty</span>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white leading-tight mt-0.5">{loggedInTeacher.name}</h3>
            <p className="text-xs font-mono text-neutral-500">Instructor ID: {loggedInTeacher.id}</p>
          </div>
        </div>

        <button
          onClick={() => { setLoggedInTeacher(null); setSelectedGrade(null); setSelectedSubject(null); }}
          className="px-4 py-2 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg cursor-pointer transition-colors"
        >
          Sign Out Portal
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* VIEW 1: SELECT GRADE CLASS CARD */}
        {!selectedGrade && (
          <motion.div
            key="gradeList"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-left border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-6">
              <h4 className="text-base font-bold text-neutral-900 dark:text-white">Assigned Academic Classes</h4>
              <p className="text-xs text-neutral-500 leading-none mt-0.5">Select a room to access courses definitions assigned to your credentials.</p>
            </div>

            {teacherGrades.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-2xl">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h5 className="font-bold text-neutral-800 dark:text-neutral-100 text-sm">No Configured Assignments</h5>
                <p className="text-xs text-neutral-500 mt-1.5 max-w-sm mx-auto">
                  The administrator registered your profile, but you are not assigned to as an instructor to any subject course in initialized classrooms yet. Ask the Admin to assign your lecturer ID under Grade Setup.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {teacherGrades.map((grade) => {
                  const teacherSubjs = grade.subjects.filter(s => s.teacherId === loggedInTeacher.id);
                  return (
                    <div
                      key={grade.id}
                      onClick={() => handleOpenGradeDeck(grade)}
                      className="bg-white dark:bg-neutral-900 border border-neutral-205 dark:border-neutral-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xl font-extrabold text-neutral-900 dark:text-white">Classroom {grade.id}</span>
                          <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <span className="block text-[10px] text-neutral-400 font-mono tracking-wider">ROSTER: {grade.students.length} REGISTERED STUDENTS</span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-neutral-50 dark:border-neutral-850/80">
                        <span className="block text-[9px] uppercase font-bold text-neutral-400 tracking-wider mb-2">Your Assigned Courses</span>
                        <div className="flex flex-wrap gap-1.5">
                          {teacherSubjs.map((s) => (
                            <span key={s.id} className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold rounded text-[9px] border border-emerald-100 dark:border-emerald-900/30">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 2: GRADE SELECTED -> SELECT SUBJECT & VERIFY PASSKEY CHALLENGE */}
        {selectedGrade && !isPasskeyAuthorized && (
          <motion.div
            key="subjectChallenge"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl shadow-md max-w-2xl mx-auto"
          >
            <button
              onClick={() => setSelectedGrade(null)}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-700 hover:underline mb-4 flex items-center gap-1 cursor-pointer"
            >
              ← Back to Classroom Listing
            </button>

            <h4 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-500" />
              Classroom {selectedGrade.id} Terminal Grading
            </h4>
            <p className="text-xs text-neutral-500 mb-6">First select a course, then type the security passkey to access student sheets.</p>

            {/* Course Selector */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Courses assigned to you</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedGrade.subjects
                  .filter(s => s.teacherId === loggedInTeacher.id)
                  .map((subj) => (
                    <button
                      key={subj.id}
                      onClick={() => handleSelectSubject(subj)}
                      className={`p-3 border rounded-xl text-left transition-all flex items-center gap-2 cursor-pointer ${
                        selectedSubject?.id === subj.id
                          ? 'bg-emerald-500/5 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850/30 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      <div>
                        <span className="block text-xs font-bold">{subj.name}</span>
                        <span className="block text-[9px] font-mono text-neutral-400">ID: {subj.id}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Passkey authentication input */}
            {selectedSubject && (
              <motion.form
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleAuthorizePasskey}
                className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-150 dark:border-neutral-850/80 space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    Enter Subject Passkey
                  </label>
                  <input
                    type="password"
                    id="subjectPasskeyInput"
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-mono text-neutral-900 dark:text-white uppercase placeholder-neutral-400"
                    placeholder="Enter Security Password (e.g. MATH12)"
                    value={passkeyInput}
                    onChange={(e) => setPasskeyInput(e.target.value)}
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    Assigned course authorization code. Demo Tip: check admin console or use <code className="text-amber-500 font-bold">{selectedSubject.passkey}</code>
                  </span>
                </div>

                {passkeyError && (
                  <p className="text-red-500 text-xs font-medium">{passkeyError}</p>
                )}

                <button
                  id="passkeyVerifyBtn"
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Key className="w-3.5 h-3.5" />
                  Unlock Grading Matrix
                </button>
              </motion.form>
            )}
          </motion.div>
        )}

        {/* VIEW 3: GRADING MATRIX EDITOR LOCK */}
        {selectedGrade && selectedSubject && isPasskeyAuthorized && (
          <motion.div
            key="marksEditor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl shadow-lg"
          >
            {/* Header controls list */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 mb-6 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <button
                  onClick={() => setIsPasskeyAuthorized(false)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline mb-1 flex items-center gap-1 cursor-pointer"
                >
                  ← Reset Passkey Clearance
                </button>
                <h4 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Grid className="w-5 h-5 text-indigo-505 text-emerald-500" />
                  {selectedSubject.name} Grading sheet (Class {selectedGrade.id})
                </h4>
                <p className="text-xs text-neutral-400 font-medium">
                  ID: {selectedSubject.id} • Instructor Code Clearance verified • Total students: {selectedGrade.students.length}
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex gap-2">
                <button
                  onClick={handleExportCourseCSV}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-850 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-bold rounded-lg text-xs flex items-center gap-1 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Backup Sheet CSV
                </button>
              </div>
            </div>

            {/* Editable spreadsheet list */}
            <form onSubmit={handleSaveAllGrades} className="space-y-6">
              <div className="overflow-x-auto border border-neutral-100 dark:border-neutral-800 rounded-xl">
                <table className="w-full text-left font-medium text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 border-b border-neutral-150 dark:border-neutral-850">
                      <th className="py-2.5 px-4 font-bold text-[10px] uppercase">Student Roster Details</th>
                      <th className="py-2.5 px-4 text-center font-bold text-[10px] uppercase w-40">1st semester (0–100%)</th>
                      <th className="py-2.5 px-4 text-center font-bold text-[10px] uppercase w-40">2nd semester (0–100%)</th>
                      <th className="py-2.5 px-4 text-center font-bold text-[10px] uppercase w-32">Course Average Score</th>
                      <th className="py-2.5 px-4 text-center font-bold text-[10px] uppercase w-12">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                    {selectedGrade.students.map((student) => {
                      const record = editingMarksRegistry[student.id];
                      if (!record) return null;

                      // Calculating current average as typed for live feedback
                      const s1 = parseFloat(record.sem1);
                      const s2 = parseFloat(record.sem2);
                      const hasValidAvg = !isNaN(s1) && !isNaN(s2);
                      const currentAvg = hasValidAvg ? ((s1 + s2) / 2).toFixed(1) : 'Incomplete';

                      return (
                        <tr key={student.id} className="hover:bg-neutral-55/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="block font-semibold text-neutral-805 dark:text-neutral-150">{student.name}</span>
                            <span className="block text-[10px] text-emerald-600 font-mono font-bold leading-normal">{student.id} • {student.sex} • Age {student.age}</span>
                          </td>

                          {/* Sem 1 edit cell */}
                          <td className="py-3.5 px-4 text-center w-40">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              className="w-24 text-center px-3 py-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono text-neutral-900 dark:text-white"
                              placeholder="Unfilled"
                              value={record.sem1}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditingMarksRegistry({
                                  ...editingMarksRegistry,
                                  [student.id]: { ...record, sem1: val }
                                });
                              }}
                            />
                          </td>

                          {/* Sem 2 edit cell */}
                          <td className="py-3.5 px-4 text-center w-40">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              className="w-24 text-center px-3 py-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono text-neutral-900 dark:text-white"
                              placeholder="Unfilled"
                              value={record.sem2}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditingMarksRegistry({
                                  ...editingMarksRegistry,
                                  [student.id]: { ...record, sem2: val }
                                });
                              }}
                            />
                          </td>

                          {/* Calculated aggregate preview column */}
                          <td className="py-3.5 px-4 text-center w-32 font-mono font-bold text-neutral-700 dark:text-neutral-300">
                            {hasValidAvg ? (
                              <span className="text-[#009b3a]">{currentAvg}%</span>
                            ) : (
                              <span className="text-neutral-400 text-[10px] uppercase font-bold italic tracking-wide">Unfilled</span>
                            )}
                          </td>

                          {/* Action Cell for dynamic Academic Transcript (PDF) */}
                          <td className="py-3.5 px-4 text-center w-12">
                            <button
                              type="button"
                              onClick={() => {
                                const calculatedStudents = calculateGradeResults(selectedGrade);
                                const updatedStudent = calculatedStudents.find(s => s.id === student.id);
                                if (updatedStudent) {
                                  downloadStudentTranscriptPDF(updatedStudent, selectedGrade);
                                } else {
                                  downloadStudentTranscriptPDF(student, selectedGrade);
                                }
                              }}
                              className="p-1 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-500 rounded cursor-pointer transition-colors"
                              title="Download Transcript (PDF)"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {saveSuccessMsg && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 text-center animate-pulse">
                  {saveSuccessMsg}
                </p>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t border-neutral-100 dark:border-neutral-850">
                <button
                  type="button"
                  onClick={() => setIsPasskeyAuthorized(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="saveMarksButton"
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 border border-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:bg-slate-800"
                >
                  <Save className="w-4 h-4" />
                  Save Terminal Semester Marks
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
