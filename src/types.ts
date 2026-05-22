/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Teacher {
  id: string; // unique ID like "T-101"
  name: string;
}

export interface Subject {
  id: string; // unique ID
  name: string;
  passkey: string; // teacher's access code
  teacherId?: string; // assigned teacher
}

export interface StudentMarks {
  sem1: number | null; // null represents Unfilled
  sem2: number | null;
}

export interface Student {
  id: string; // unique ID, e.g. "S-9A-01"
  name: string;
  sex: 'M' | 'F';
  age: number;
  gradeId: string;
  marks: {
    [subjectId: string]: StudentMarks;
  };
  // Pre-calculated stats for easy rendering
  sem1Total?: number;
  sem1Average?: number;
  sem1Rank?: number;
  sem1Status?: 'Pass' | 'Fail';
  isSem1Completed?: boolean;

  sem2Total?: number;
  sem2Average?: number;
  sem2Rank?: number;
  sem2Status?: 'Pass' | 'Fail';
  isSem2Completed?: boolean;

  finalTotal?: number;
  finalAverage?: number;
  finalRank?: number;
  finalStatus?: 'Pass' | 'Fail';
  isFinalCompleted?: boolean;

  totalMarks?: number;
  overallAverage?: number;
  rank?: number;
  status?: 'Pass' | 'Fail';
}

export interface Grade {
  id: string; // e.g. "9A", "10B"
  numStudents: number;
  numSubjects: number;
  isInitialized: boolean;
  isPublished: boolean;
  students: Student[];
  subjects: Subject[];
}

export interface GlobalState {
  teachers: Teacher[];
  grades: Grade[];
}
