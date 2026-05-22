/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Grade, Student, Subject, Teacher } from './types';

// Helper to calculate student results and rankings within a grade
export function calculateGradeResults(grade: Grade): Student[] {
  const subjects = grade.subjects;
  if (!grade.students || grade.students.length === 0) return [];

  // Calculate stats for each student for sem1, sem2 and final
  const studentsWithStats = grade.students.map((student) => {
    let sem1Total = 0;
    let sem1Count = 0;
    let sem2Total = 0;
    let sem2Count = 0;
    let finalTotalSum = 0;
    let finalCount = 0;

    subjects.forEach((subj) => {
      const mark = student.marks[subj.id];
      if (mark) {
        if (mark.sem1 !== null && mark.sem1 !== undefined) {
          sem1Total += mark.sem1;
          sem1Count++;
        }
        if (mark.sem2 !== null && mark.sem2 !== undefined) {
          sem2Total += mark.sem2;
          sem2Count++;
        }
        if (mark.sem1 !== null && mark.sem1 !== undefined && mark.sem2 !== null && mark.sem2 !== undefined) {
          const avg = (mark.sem1 + mark.sem2) / 2;
          finalTotalSum += avg;
          finalCount++;
        }
      }
    });

    const isSem1Completed = sem1Count === subjects.length && subjects.length > 0;
    const isSem2Completed = sem2Count === subjects.length && subjects.length > 0;
    const isFinalCompleted = finalCount === subjects.length && subjects.length > 0;

    const sem1Average = isSem1Completed ? Number((sem1Total / subjects.length).toFixed(2)) : undefined;
    const sem1Status = isSem1Completed ? (sem1Average! >= 50 ? 'Pass' as const : 'Fail' as const) : undefined;

    const sem2Average = isSem2Completed ? Number((sem2Total / subjects.length).toFixed(2)) : undefined;
    const sem2Status = isSem2Completed ? (sem2Average! >= 50 ? 'Pass' as const : 'Fail' as const) : undefined;

    const finalAverage = isFinalCompleted ? Number((finalTotalSum / subjects.length).toFixed(2)) : undefined;
    const finalStatus = isFinalCompleted ? (finalAverage! >= 50 ? 'Pass' as const : 'Fail' as const) : undefined;

    return {
      ...student,
      sem1Total: Number(sem1Total.toFixed(2)),
      sem1Average,
      sem1Status,
      isSem1Completed,

      sem2Total: Number(sem2Total.toFixed(2)),
      sem2Average,
      sem2Status,
      isSem2Completed,

      finalTotal: Number(finalTotalSum.toFixed(2)),
      finalAverage,
      finalStatus,
      isFinalCompleted,

      // Fallbacks to match previous interface properties
      totalMarks: Number(finalTotalSum.toFixed(2)),
      overallAverage: finalAverage,
      status: finalStatus,
      isCompleted: isFinalCompleted,
    };
  });

  // Calculate rankings for Sem 1
  const completedSem1 = studentsWithStats
    .filter((s) => s.isSem1Completed)
    .sort((a, b) => (b.sem1Average || 0) - (a.sem1Average || 0));

  let r1Rank = 1;
  let r1PrevAvg = -1;
  let r1Tie = 0;
  const rankedSem1 = completedSem1.map((student, index) => {
    const avg = student.sem1Average || 0;
    if (avg === r1PrevAvg) {
      r1Tie++;
    } else {
      r1Rank = index + 1;
      r1Tie = 0;
      r1PrevAvg = avg;
    }
    return { id: student.id, rank: r1Rank };
  });

  // Calculate rankings for Sem 2
  const completedSem2 = studentsWithStats
    .filter((s) => s.isSem2Completed)
    .sort((a, b) => (b.sem2Average || 0) - (a.sem2Average || 0));

  let r2Rank = 1;
  let r2PrevAvg = -1;
  let r2Tie = 0;
  const rankedSem2 = completedSem2.map((student, index) => {
    const avg = student.sem2Average || 0;
    if (avg === r2PrevAvg) {
      r2Tie++;
    } else {
      r2Rank = index + 1;
      r2Tie = 0;
      r2PrevAvg = avg;
    }
    return { id: student.id, rank: r2Rank };
  });

  // Calculate rankings for Final
  const completedFinal = studentsWithStats
    .filter((s) => s.isFinalCompleted)
    .sort((a, b) => (b.finalAverage || 0) - (a.finalAverage || 0));

  let rFinalRank = 1;
  let rFinalPrevAvg = -1;
  let rFinalTie = 0;
  const rankedFinal = completedFinal.map((student, index) => {
    const avg = student.finalAverage || 0;
    if (avg === rFinalPrevAvg) {
      rFinalTie++;
    } else {
      rFinalRank = index + 1;
      rFinalTie = 0;
      rFinalPrevAvg = avg;
    }
    return { id: student.id, rank: rFinalRank };
  });

  // Map everything back onto the list of students
  return studentsWithStats.map((student) => {
    const sm1Match = rankedSem1.find((r) => r.id === student.id);
    const sm2Match = rankedSem2.find((r) => r.id === student.id);
    const fnlMatch = rankedFinal.find((r) => r.id === student.id);

    return {
      ...student,
      sem1Rank: sm1Match?.rank,
      sem2Rank: sm2Match?.rank,
      finalRank: fnlMatch?.rank,
      rank: fnlMatch?.rank, // For backwards compatibility
    };
  });
}

// Generate CSV string from a grid of data
export function convertToCSV(headers: string[], rows: string[][]): string {
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  return csvContent;
}

// Trigger browser download for text files
export function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate initial sample data to make the app immediate, rich, and testing-friendly
export function getSampleData(): { teachers: Teacher[]; grades: Grade[] } {
  const teachers: Teacher[] = [
    { id: 'T-101', name: 'Abebe Kebede' },
    { id: 'T-102', name: 'Aster Tolosa' },
    { id: 'T-103', name: 'Mulugeta Tesfaye' },
    { id: 'T-104', name: 'Almaz Demeke' },
  ];

  // Grade 12A - Fully Grade Completed & Already Published
  const g12aSubjects: Subject[] = [
    { id: '12A-SUB1', name: 'Mathematics', passkey: 'MATH12', teacherId: 'T-101' },
    { id: '12A-SUB2', name: 'English', passkey: 'ENG12', teacherId: 'T-102' },
    { id: '12A-SUB3', name: 'Physics', passkey: 'PHYS12', teacherId: 'T-103' },
    { id: '12A-SUB4', name: 'Amharic', passkey: 'AMH12', teacherId: 'T-104' },
    { id: '12A-SUB5', name: 'Civics', passkey: 'CIVIC12', teacherId: 'T-101' },
  ];

  const g12aStudentsRaw = [
    { name: 'Kidus Yohannes', sex: 'M' as const, age: 18, mMath: [85, 92], mEng: [78, 85], mPhys: [90, 88], mAmh: [82, 80], mCiv: [88, 90] },
    { name: 'Chaltu Bekele', sex: 'F' as const, age: 17, mMath: [92, 95], mEng: [88, 91], mPhys: [85, 89], mAmh: [90, 94], mCiv: [94, 96] },
    { name: 'Hagos Gebre', sex: 'M' as const, age: 18, mMath: [65, 70], mEng: [62, 68], mPhys: [70, 72], mAmh: [58, 64], mCiv: [75, 78] },
    { name: 'Mihretu Alemu', sex: 'M' as const, age: 19, mMath: [45, 52], mEng: [50, 48], mPhys: [48, 55], mAmh: [52, 50], mCiv: [60, 58] },
    { name: 'Saba Yohannes', sex: 'F' as const, age: 18, mMath: [78, 80], mEng: [85, 87], mPhys: [72, 75], mAmh: [80, 85], mCiv: [82, 85] },
    { name: 'Yonas Tesfaye', sex: 'M' as const, age: 17, mMath: [55, 60], mEng: [58, 62], mPhys: [60, 58], mAmh: [65, 68], mCiv: [70, 72] },
  ];

  const g12aStudents: Student[] = g12aStudentsRaw.map((s, idx) => {
    const id = `S-12A-0${idx + 1}`;
    return {
      id,
      name: s.name,
      sex: s.sex,
      age: s.age,
      gradeId: '12A',
      marks: {
        '12A-SUB1': { sem1: s.mMath[0], sem2: s.mMath[1] },
        '12A-SUB2': { sem1: s.mEng[0], sem2: s.mEng[1] },
        '12A-SUB3': { sem1: s.mPhys[0], sem2: s.mPhys[1] },
        '12A-SUB4': { sem1: s.mAmh[0], sem2: s.mAmh[1] },
        '12A-SUB5': { sem1: s.mCiv[0], sem2: s.mCiv[1] },
      }
    };
  });

  // Grade 10B - Unfilled / In Progress (So students can test Teacher/Admin portal workflows)
  const g10bSubjects: Subject[] = [
    { id: '10B-SUB1', name: 'Mathematics', passkey: 'MATH10', teacherId: 'T-101' },
    { id: '10B-SUB2', name: 'English', passkey: 'ENG10', teacherId: 'T-102' },
    { id: '10B-SUB3', name: 'Chemistry', passkey: 'CHEM10', teacherId: 'T-103' },
    { id: '10B-SUB4', name: 'Biology', passkey: 'BIO10', teacherId: 'T-104' },
  ];

  const g10bStudentsRaw = [
    { name: 'Helen Hailu', sex: 'F' as const, age: 16, mMath: [72, 78], mEng: [80, 84], mChem: [null, null], mBio: [85, 88] },
    { name: 'Tariku Birhanu', sex: 'M' as const, age: 15, mMath: [58, 62], mEng: [65, 70], mChem: [null, null], mBio: [60, 64] },
    { name: 'Feven Demisse', sex: 'F' as const, age: 16, mMath: [90, 94], mEng: [92, 95], mChem: [null, null], mBio: [91, 93] },
    { name: 'Kassa Tadesse', sex: 'M' as const, age: 17, mMath: [42, 45], mEng: [50, 52], mChem: [null, null], mBio: [48, 50] },
    { name: 'Solomon Worku', sex: 'M' as const, age: 16, mMath: [85, 88], mEng: [78, 80], mChem: [null, null], mBio: [82, 85] },
  ];

  const g10bStudents: Student[] = g10bStudentsRaw.map((s, idx) => {
    const id = `S-10B-0${idx + 1}`;
    return {
      id,
      name: s.name,
      sex: s.sex,
      age: s.age,
      gradeId: '10B',
      marks: {
        '10B-SUB1': { sem1: s.mMath[0], sem2: s.mMath[1] },
        '10B-SUB2': { sem1: s.mEng[0], sem2: s.mEng[1] },
        '10B-SUB3': { sem1: s.mChem[0], sem2: s.mChem[1] }, // Chemists haven't filled yet!
        '10B-SUB4': { sem1: s.mBio[0], sem2: s.mBio[1] },
      }
    };
  });

  const grades: Grade[] = [
    {
      id: '12A',
      numStudents: g12aStudents.length,
      numSubjects: g12aSubjects.length,
      isInitialized: true,
      isPublished: true,
      students: g12aStudents,
      subjects: g12aSubjects,
    },
    {
      id: '10B',
      numStudents: g10bStudents.length,
      numSubjects: g10bSubjects.length,
      isInitialized: true,
      isPublished: false, // Incomplete & Not Published yet
      students: g10bStudents,
      subjects: g10bSubjects,
    }
  ];

  return { teachers, grades };
}
