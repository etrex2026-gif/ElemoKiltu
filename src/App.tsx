/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, Users, ShieldAlert, BookOpen, Sun, Moon, 
  HelpCircle, Calendar, Award, ExternalLink, RefreshCw,
  Code, Mail, Phone, Send
} from 'lucide-react';
import { GlobalState, Teacher, Grade, Student, Subject } from './types';
import { getSampleData } from './utils';
import StudentPortal from './components/StudentPortal';
import AdminPortal from './components/AdminPortal';
import TeacherPortal from './components/TeacherPortal';
import DeveloperPortal from './components/DeveloperPortal';
import { 
  db, 
  seedInitialDataIfNecessary,
  dbAddTeacher,
  dbDeleteTeacher,
  dbAddGrade,
  dbPublishGrade,
  dbDeleteGrade,
  dbAddSubject,
  dbDeleteSubject,
  dbAddStudent,
  dbDeleteStudent,
  dbInitializeGrade
} from './firebase';
import { collection, onSnapshot, doc, setDoc, writeBatch } from 'firebase/firestore';

export default function App() {
  // Global Application State loading in real-time from Firestore
  const [state, setState] = useState<GlobalState>({ teachers: [], grades: [] });
  const [loading, setLoading] = useState(true);

  // Active portal selection pane: student, teacher, admin, developer
  const [currentPortal, setCurrentPortal] = useState<'student' | 'teacher' | 'admin' | 'developer'>('student');

  // Dark & Light theme mode (persisted simple display preference)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Basic setting preference can fall back inline
    return 'light';
  });

  // Seed data on first launch if Firestore is completely blank
  useEffect(() => {
    const defaultData = getSampleData();
    seedInitialDataIfNecessary(defaultData.teachers, defaultData.grades);
  }, []);

  // Set up cloud-based real-time subscriptions for real-time synchronization
  useEffect(() => {
    // 1. Subscribe to /teachers
    const unsubscribeTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      const teachersList: Teacher[] = [];
      snapshot.forEach((doc) => {
        teachersList.push(doc.data() as Teacher);
      });
      setState((prev) => ({ ...prev, teachers: teachersList }));
    }, (error) => {
      console.error('Error fetching teachers: ', error);
    });

    // 2. Subscribe to /grades and all corresponding subcollections
    const subSubscriptions: { [gradeId: string]: (() => void)[] } = {};

    const unsubscribeGrades = onSnapshot(collection(db, 'grades'), (snapshot) => {
      const gradesSummaryList: Omit<Grade, 'students' | 'subjects'>[] = [];
      snapshot.forEach((doc) => {
        gradesSummaryList.push(doc.data() as Omit<Grade, 'students' | 'subjects'>);
      });

      // Synchronize listeners for student and subject subcollections
      gradesSummaryList.forEach((gradeSummary) => {
        const gradeId = gradeSummary.id;
        if (!subSubscriptions[gradeId]) {
          subSubscriptions[gradeId] = [];

          const unsubStudents = onSnapshot(collection(db, 'grades', gradeId, 'students'), (studSnap) => {
            const studentsList: Student[] = [];
            studSnap.forEach((studDoc) => {
              studentsList.push(studDoc.data() as Student);
            });
            setState((prev) => {
              const updatedGrades = prev.grades.map((g) => {
                if (g.id === gradeId) {
                  return { ...g, students: studentsList };
                }
                return g;
              });
              return { ...prev, grades: updatedGrades };
            });
          });

          const unsubSubjects = onSnapshot(collection(db, 'grades', gradeId, 'subjects'), (subjSnap) => {
            const subjectsList: Subject[] = [];
            subjSnap.forEach((subjDoc) => {
              subjectsList.push(subjDoc.data() as Subject);
            });
            setState((prev) => {
              const updatedGrades = prev.grades.map((g) => {
                if (g.id === gradeId) {
                  return { ...g, subjects: subjectsList };
                }
                return g;
              });
              return { ...prev, grades: updatedGrades };
            });
          });

          subSubscriptions[gradeId].push(unsubStudents, unsubSubjects);
        }
      });

      // Clean up deleted grade subscriptions
      Object.keys(subSubscriptions).forEach((gradeId) => {
        if (!gradesSummaryList.find((g) => g.id === gradeId)) {
          subSubscriptions[gradeId].forEach((unsub) => unsub());
          delete subSubscriptions[gradeId];
        }
      });

      // Synchronize top-level grade summaries with full subcollections
      setState((prev) => {
        const updatedGrades = gradesSummaryList.map((gradeSummary) => {
          const existingGrade = prev.grades.find((g) => g.id === gradeSummary.id);
          return {
            id: gradeSummary.id,
            numStudents: gradeSummary.numStudents,
            numSubjects: gradeSummary.numSubjects,
            isInitialized: gradeSummary.isInitialized,
            isPublished: gradeSummary.isPublished,
            students: existingGrade?.students || [],
            subjects: existingGrade?.subjects || [],
          };
        });
        return { ...prev, grades: updatedGrades };
      });

      setLoading(false);
    }, (error) => {
      console.error('Error fetching grades: ', error);
      setLoading(false);
    });

    return () => {
      unsubscribeTeachers();
      unsubscribeGrades();
      Object.values(subSubscriptions).forEach((unsubs) => {
        unsubs.forEach((unsub) => unsub());
      });
    };
  }, []);

  // Sync theme class to HTML node
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Global Cloud-Perserving Mutators
  const handleAddTeacher = async (name: string, id: string) => {
    await dbAddTeacher({ id, name });
  };

  const handleAddGrade = async (id: string) => {
    await dbAddGrade(id);
  };

  const handleInitializeGrade = async (gradeId: string, students: Student[], subjects: Subject[]) => {
    await dbInitializeGrade(gradeId, students, subjects);
  };

  const handlePublishGrade = async (gradeId: string, isPublished: boolean) => {
    await dbPublishGrade(gradeId, isPublished);
  };

  const handleDeleteGrade = async (gradeId: string) => {
    await dbDeleteGrade(gradeId);
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    await dbDeleteTeacher(teacherId);
    
    // Dissociate the deleted teacher from any assigned subjects in Firestore
    for (const grade of state.grades) {
      if (grade.isInitialized) {
        for (const sub of grade.subjects) {
          if (sub.teacherId === teacherId) {
            await dbAddSubject(grade.id, { ...sub, teacherId: '' });
          }
        }
      }
    }
  };

  const handleDeleteStudent = async (gradeId: string, studentId: string) => {
    await dbDeleteStudent(gradeId, studentId);
    
    const currentGrade = state.grades.find((g) => g.id === gradeId);
    if (currentGrade) {
      await setDoc(doc(db, 'grades', gradeId), {
        numStudents: Math.max(0, currentGrade.numStudents - 1)
      }, { merge: true });
    }
  };

  const handleDeleteSubject = async (gradeId: string, subjectId: string) => {
    await dbDeleteSubject(gradeId, subjectId);
    
    const currentGrade = state.grades.find((g) => g.id === gradeId);
    if (currentGrade) {
      await setDoc(doc(db, 'grades', gradeId), {
        numSubjects: Math.max(0, currentGrade.numSubjects - 1)
      }, { merge: true });

      // Clean up subject reference from all student mark entries
      for (const student of currentGrade.students) {
        const resetMarks = { ...student.marks };
        delete resetMarks[subjectId];
        await dbAddStudent(gradeId, { ...student, marks: resetMarks });
      }
    }
  };

  const handleClearStudentMarks = async (gradeId: string, studentId: string) => {
    const grade = state.grades.find((g) => g.id === gradeId);
    if (grade) {
      const student = grade.students.find((s) => s.id === studentId);
      if (student) {
        const resetMarks = { ...student.marks };
        Object.keys(resetMarks).forEach((subId) => {
          resetMarks[subId] = { sem1: null, sem2: null };
        });
        await dbAddStudent(gradeId, { ...student, marks: resetMarks });
      }
    }
  };

  const handleUpdateStudentMarks = async (
    gradeId: string,
    studentId: string,
    subjectId: string,
    sem1: number | null,
    sem2: number | null
  ) => {
    const grade = state.grades.find((g) => g.id === gradeId);
    if (grade) {
      const student = grade.students.find((s) => s.id === studentId);
      if (student) {
        await dbAddStudent(gradeId, {
          ...student,
          marks: {
            ...student.marks,
            [subjectId]: { sem1, sem2 }
          }
        });
      }
    }
  };

  const resetAllData = async () => {
    if (confirm('Are you absolutely sure you want to clear all cloud database records? This will erase all teachers, grades, and student scores.')) {
      const batch = writeBatch(db);
      
      // Delete teachers
      state.teachers.forEach((t) => {
        batch.delete(doc(db, 'teachers', t.id));
      });

      // Delete grades and nested subcollections
      state.grades.forEach((g) => {
        batch.delete(doc(db, 'grades', g.id));
        g.subjects.forEach((sub) => {
          batch.delete(doc(db, 'grades', g.id, 'subjects', sub.id));
        });
        g.students.forEach((stud) => {
          batch.delete(doc(db, 'grades', g.id, 'students', stud.id));
        });
      });

      await batch.commit();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white p-6">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-sky-450 animate-spin text-[#38BDF8]" />
          <p className="text-xs font-bold tracking-widest text-slate-400 font-mono text-center uppercase">
            Connecting to Chercher Sec. Cloud Database...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F1F5F9] dark:bg-[#0B0F19] text-[#1E293B] dark:text-slate-100 font-sans transition-colors duration-250">
      
      {/* 1. SOLID EMBEDDED LEFT SIDEBAR (Desktop only, responsive container) */}
      <aside className="hidden md:flex flex-col w-[260px] bg-[#0F172A] text-[#E2E8F0] border-r border-[#1E293B] sticky top-0 h-screen shrink-0 overflow-y-auto select-none font-sans">
        
        {/* Sidebar Header branding */}
        <div className="p-5 pb-6 border-b border-[#1E293B] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-555 bg-[#38BDF8] text-[#0F172A] flex items-center justify-center font-black shadow-md shrink-0">
            <GraduationCap className="w-5 h-5 text-[#0F172A]" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#38BDF8] leading-none block">
              CHERCHER
            </span>
            <h2 className="text-sm font-extrabold text-white leading-tight mt-0.5">
              SECONDARY SCHOOL
            </h2>
          </div>
        </div>

        {/* Ethiopia National Ribbon Accent on sidebar */}
        <div className="h-[2px] w-full flex shrink-0">
          <div className="bg-[#009b3a] h-full w-1/3" />
          <div className="bg-[#fcd116] h-full w-1/3" />
          <div className="bg-[#da121a] h-full w-1/3" />
        </div>

        {/* Navigation list */}
        <div className="p-4 flex-1 space-y-1">
          <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 px-2">
            MAIN PORTALS
          </span>

          {/* Student Portal Nav item */}
          <button
            onClick={() => setCurrentPortal('student')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[13px] font-medium flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
              currentPortal === 'student'
                ? 'bg-[#38BDF8] text-[#0F172A] font-bold shadow-md'
                : 'text-[#E2E8F0] hover:bg-[#1E293B] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Student Portal</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
              currentPortal === 'student' ? 'bg-[#0F172A] text-[#38BDF8]' : 'bg-[#1E293B] text-slate-400'
            }`}>
              Live
            </span>
          </button>

          {/* Teacher Portal Nav item */}
          <button
            onClick={() => setCurrentPortal('teacher')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[13px] font-medium flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
              currentPortal === 'teacher'
                ? 'bg-[#38BDF8] text-[#0F172A] font-bold shadow-md'
                : 'text-[#E2E8F0] hover:bg-[#1E293B] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 shrink-0" />
              <span>Teacher Portal</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
              currentPortal === 'teacher' ? 'bg-[#0F172A] text-[#38BDF8]' : 'bg-[#1E293B] text-slate-400'
            }`}>
              {state.teachers.length}
            </span>
          </button>

          {/* Admin Portal Nav item */}
          <button
            onClick={() => setCurrentPortal('admin')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[13px] font-medium flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
              currentPortal === 'admin'
                ? 'bg-[#38BDF8] text-[#0F172A] font-bold shadow-md'
                : 'text-[#E2E8F0] hover:bg-[#1E293B] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Admin Portal</span>
            </div>
          </button>

          {/* Developer/About Nav item */}
          <button
            onClick={() => setCurrentPortal('developer')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[13px] font-medium flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
              currentPortal === 'developer'
                ? 'bg-[#10B981] text-white font-bold shadow-md'
                : 'text-[#E2E8F0] hover:bg-[#1E293B] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Code className="w-4 h-4 shrink-0" />
              <span>Developer Panel</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
              currentPortal === 'developer' ? 'bg-[#111827] text-[#10B981]' : 'bg-[#1E293B] text-slate-400'
            }`}>
              Info
            </span>
          </button>

          <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider pt-6 mb-2 px-2">
            ACADEMIC METRICS
          </span>
          <div className="px-2 space-y-3.5 text-xs text-slate-400">
            <div>
              <span className="text-[10px] uppercase block text-slate-500">Active Students</span>
              <span className="font-bold text-slate-200">1,248 enrolled</span>
            </div>
            <div>
              <span className="text-[10px] uppercase block text-slate-500">Teachers Assigned</span>
              <span className="font-bold text-slate-200">{state.teachers.length} active</span>
            </div>
            <div>
              <span className="text-[10px] uppercase block text-slate-500">Grades Active</span>
              <span className="font-bold text-slate-200">{state.grades.length} sections defined</span>
            </div>
          </div>
        </div>

        {/* Sidebar Footer layout controls and theme settings */}
        <div className="p-4 border-t border-[#1E293B] bg-[#0A0F1D] flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-450">
            <span className="font-medium text-[11px]">System Controls</span>
            <div className="flex gap-1">
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-1 px-2 bg-[#1E293B] text-[#38BDF8] hover:bg-slate-800 rounded transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-1"
                title="Toggle visual theme palette"
              >
                {theme === 'light' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>
              
            </div>
          </div>
          <span className="text-[9px] text-slate-600 block mt-1">Chercher Academic Suite v1.4</span>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTENT ENVELOPE */}
      <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] overflow-x-hidden">
        
        {/* RESPONSIVE TOP BAR: Dynamic Switcher on mobile, Navigation status on Desktop */}
        <div className="h-16 bg-white dark:bg-[#111827] border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between px-3 sm:px-6 z-20 shrink-0">
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Header Branding (Visible only on mobile) */}
            <div className="md:hidden flex items-center gap-1.5 sm:gap-2">
              <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded bg-[#38BDF8] text-[#0F172A] flex items-center justify-center font-extrabold shadow-sm">
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0F172A]" />
              </div>
              <span className="font-extrabold font-sans text-[10px] sm:text-xs tracking-tight text-[#0F172A] dark:text-white uppercase">
                <span className="sm:hidden">Chercher Sec.</span>
                <span className="hidden sm:inline">Chercher Secondary School</span>
              </span>
            </div>
            
            {/* Context breadcrumb (Visible on desktop) */}
            <div className="hidden md:flex items-center gap-1 text-[13px] font-semibold text-slate-400">
              <span>CHERCHER SECONDARY SCHOOL</span>
              <span>&rsaquo;</span>
              <span className="text-[#0F172A] dark:text-[#38BDF8] capitalize">{currentPortal} Workspace</span>
            </div>
          </div>

          {/* User view switcher: High Density tab design as a segment controller */}
          <div className="flex items-center bg-[#F1F5F9] dark:bg-slate-800 p-[3px] sm:p-[4px] rounded-lg gap-0.5 sm:gap-1 border border-neutral-200 dark:border-slate-755 max-w-[280px] sm:max-w-[340px] md:max-w-none">
            <button
              onClick={() => setCurrentPortal('student')}
              className={`px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-[11px] font-bold cursor-pointer transition-all ${
                currentPortal === 'student'
                  ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-[#38BDF8] shadow-xs'
                  : 'text-slate-500 dark:text-slate-450 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => setCurrentPortal('teacher')}
              className={`px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-[11px] font-bold cursor-pointer transition-all ${
                currentPortal === 'teacher'
                  ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-[#38BDF8] shadow-xs'
                  : 'text-slate-500 dark:text-slate-450 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              Teacher
            </button>
            <button
              onClick={() => setCurrentPortal('admin')}
              className={`px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-[11px] font-bold cursor-pointer transition-all ${
                currentPortal === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-[#38BDF8] shadow-xs'
                  : 'text-slate-500 dark:text-slate-450 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              <span className="sm:hidden">Admin</span>
              <span className="hidden sm:inline">Admin Portal</span>
            </button>
            <button
              onClick={() => setCurrentPortal('developer')}
              className={`px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-[11px] font-bold cursor-pointer transition-all ${
                currentPortal === 'developer'
                  ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-[#38BDF8] shadow-xs'
                  : 'text-slate-500 dark:text-slate-450 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              <span className="sm:hidden">Dev</span>
              <span className="hidden sm:inline">Developer</span>
            </button>

            {/* Mobile-only theme switch trigger */}
            <div className="md:hidden flex items-center border-l border-slate-300 dark:border-slate-700 pl-0.5 sm:pl-1 ml-0.5 sm:ml-1">
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-1 px-1 sm:px-1.5 text-slate-500 dark:text-slate-400 rounded cursor-pointer"
              >
                {theme === 'light' ? <Moon className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              </button>
            </div>
          </div>

        </div>

        {/* Work Area View Scroll Wrapper */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col justify-between overflow-x-hidden">
          
          <div className="flex-1 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPortal}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="w-full"
              >
                {currentPortal === 'student' && (
                  <StudentPortal grades={state.grades} />
                )}
                {currentPortal === 'teacher' && (
                  <TeacherPortal 
                    teachers={state.teachers} 
                    grades={state.grades} 
                    onUpdateStudentMarks={handleUpdateStudentMarks} 
                  />
                )}
                {currentPortal === 'admin' && (
                  <AdminPortal
                    teachers={state.teachers}
                    grades={state.grades}
                    onAddTeacher={handleAddTeacher}
                    onAddGrade={handleAddGrade}
                    onInitializeGrade={handleInitializeGrade}
                    onPublishGrade={handlePublishGrade}
                    onDeleteGrade={handleDeleteGrade}
                    onDeleteTeacher={handleDeleteTeacher}
                    onDeleteStudent={handleDeleteStudent}
                    onDeleteSubject={handleDeleteSubject}
                    onClearStudentMarks={handleClearStudentMarks}
                    onUpdateStudentMarks={handleUpdateStudentMarks}
                  />
                )}
                {currentPortal === 'developer' && (
                  <DeveloperPortal />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* High Density Layout Status Footer Bar */}
          <footer className="mt-16 pt-6 border-t border-[#E2E8F0] dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 dark:text-slate-400 text-center md:text-left print:hidden shrink-0">
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-350">
                CHERCHER SECONDARY SCHOOL - Result Management & Verification System
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                System Developed by <span className="font-semibold text-sky-500 hover:underline cursor-pointer" onClick={() => setCurrentPortal('developer')}>Ramoda Technologies</span> &bull; Academic Year: 2026/27
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end gap-1 font-mono text-[9px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span>System Developed by Ramoda Technologies &bull; Active</span>
              </div>
              <span>Academic Integrity Seal: Verified</span>
            </div>
          </footer>

        </main>
      </div>
      
    </div>
  );
}
