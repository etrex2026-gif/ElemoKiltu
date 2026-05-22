import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc,
  getDocFromServer,
  collection, 
  getDocs,
  setDoc, 
  deleteDoc, 
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Teacher, Grade, Student, Subject, StudentMarks } from './types';

// Initialize Firebase app and core services
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

// --- Skill-Mandated Firestore Error Handler ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Validation and Connection Verification ---
async function verifyConnection() {
  const pathForVerify = 'test/connection';
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration: client is offline.");
    }
  }
}
verifyConnection();

// --- DB Mutators & Cloud CRUD Functions ---

// 1. Teachers CRUD
export async function dbAddTeacher(teacher: Teacher) {
  const path = `teachers/${teacher.id}`;
  try {
    await setDoc(doc(db, 'teachers', teacher.id), {
      id: teacher.id,
      name: teacher.name,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbDeleteTeacher(teacherId: string) {
  const path = `teachers/${teacherId}`;
  try {
    await deleteDoc(doc(db, 'teachers', teacherId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 2. Grades CRUD
export async function dbAddGrade(gradeId: string) {
  const path = `grades/${gradeId}`;
  try {
    await setDoc(doc(db, 'grades', gradeId), {
      id: gradeId,
      numStudents: 0,
      numSubjects: 0,
      isInitialized: false,
      isPublished: false,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbPublishGrade(gradeId: string, isPublished: boolean) {
  const path = `grades/${gradeId}`;
  try {
    await setDoc(doc(db, 'grades', gradeId), {
      isPublished
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbDeleteGrade(gradeId: string) {
  const path = `grades/${gradeId}`;
  try {
    // Note: Deleting a document does not delete its subcollections in Firestore natively unless done individually.
    // For optimal reliability, delete the grade doc first, and subcollection listings can be treated as orphaned.
    await deleteDoc(doc(db, 'grades', gradeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 3. Subjects CRUD
export async function dbAddSubject(gradeId: string, subject: Subject) {
  const path = `grades/${gradeId}/subjects/${subject.id}`;
  try {
    await setDoc(doc(db, 'grades', gradeId, 'subjects', subject.id), {
      id: subject.id,
      name: subject.name,
      passkey: subject.passkey,
      teacherId: subject.teacherId || ''
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbDeleteSubject(gradeId: string, subjectId: string) {
  const path = `grades/${gradeId}/subjects/${subjectId}`;
  try {
    await deleteDoc(doc(db, 'grades', gradeId, 'subjects', subjectId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 4. Students CRUD
export async function dbAddStudent(gradeId: string, student: Student) {
  const path = `grades/${gradeId}/students/${student.id}`;
  try {
    await setDoc(doc(db, 'grades', gradeId, 'students', student.id), {
      id: student.id,
      name: student.name,
      sex: student.sex,
      age: student.age,
      gradeId: student.gradeId,
      marks: student.marks
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function dbDeleteStudent(gradeId: string, studentId: string) {
  const path = `grades/${gradeId}/students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'grades', gradeId, 'students', studentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 5. Initialize Grade with students and subjects inside Firestore using a batch
export async function dbInitializeGrade(gradeId: string, students: Student[], subjects: Subject[]) {
  const batch = writeBatch(db);
  
  // Update Grade status
  const gradeDocRef = doc(db, 'grades', gradeId);
  batch.update(gradeDocRef, {
    isInitialized: true,
    numStudents: students.length,
    numSubjects: subjects.length,
    isPublished: false,
  });

  // Write subjects
  subjects.forEach(sub => {
    const subDocRef = doc(db, 'grades', gradeId, 'subjects', sub.id);
    batch.set(subDocRef, {
      id: sub.id,
      name: sub.name,
      passkey: sub.passkey,
      teacherId: sub.teacherId || ''
    });
  });

  // Write students
  students.forEach(student => {
    const studDocRef = doc(db, 'grades', gradeId, 'students', student.id);
    batch.set(studDocRef, {
      id: student.id,
      name: student.name,
      sex: student.sex,
      age: student.age,
      gradeId: student.gradeId,
      marks: student.marks
    });
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `grades/${gradeId} [Batch Initialize]`);
  }
}

// 6. Double Check and Seed Initial realistic data if Firebase database is entirely empty
export async function seedInitialDataIfNecessary(sampleTeachers: Teacher[], sampleGrades: Grade[]) {
  try {
    const gradesSnapshot = await getDocs(collection(db, 'grades'));
    const teachersSnapshot = await getDocs(collection(db, 'teachers'));
    
    // Seed ONLY if both collections are empty. This ensures we don't overwrite user modifications.
    if (gradesSnapshot.empty && teachersSnapshot.empty) {
      console.log('Firebase collections are empty. Seeding highly polished academic sample database...');
      
      // 1. Seed Teachers
      for (const t of sampleTeachers) {
        await setDoc(doc(db, 'teachers', t.id), t);
      }

      // 2. Seed Grades and subcollections
      for (const g of sampleGrades) {
        await setDoc(doc(db, 'grades', g.id), {
          id: g.id,
          numStudents: g.numStudents,
          numSubjects: g.numSubjects,
          isInitialized: g.isInitialized,
          isPublished: g.isPublished
        });

        // Seed subjects
        for (const sub of g.subjects) {
          await setDoc(doc(db, 'grades', g.id, 'subjects', sub.id), sub);
        }

        // Seed students
        for (const stud of g.students) {
          await setDoc(doc(db, 'grades', g.id, 'students', stud.id), {
            id: stud.id,
            name: stud.name,
            sex: stud.sex,
            age: stud.age,
            gradeId: stud.gradeId,
            marks: stud.marks
          });
        }
      }
      console.log('Firebase Seeding completed.');
    }
  } catch (err) {
    console.error('Failed to double-check or seed initial sample records: ', err);
  }
}
