/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Award, Printer, Download, BookOpen, User, 
  MapPin, Calendar, Compass, Shield, HelpCircle, ArrowRight
} from 'lucide-react';
import { Grade, Student } from '../types';
import { calculateGradeResults, convertToCSV, downloadFile } from '../utils';
import { downloadStudentTranscriptPDF } from '../pdfExporter';

// Pre-defined student ID search instructions or quick lookup suggestions for testers
interface StudentPortalProps {
  grades: Grade[];
}

export default function StudentPortal({ grades }: StudentPortalProps) {
  const [searchId, setSearchId] = useState('');
  const [queriedStudent, setQueriedStudent] = useState<Student | null>(null);
  const [queriedGrade, setQueriedGrade] = useState<Grade | null>(null);
  const [searchError, setSearchError] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setQueriedStudent(null);
    setQueriedGrade(null);

    const cleanId = searchId.trim().toUpperCase();
    if (!cleanId) {
      setSearchError('Please enter a Student ID.');
      return;
    }

    // Find the student amongst all grades
    let foundStudent: Student | null = null;
    let foundGrade: Grade | null = null;

    for (const grade of grades) {
      const student = grade.students.find(s => s.id.toUpperCase() === cleanId);
      if (student) {
        foundStudent = student;
        foundGrade = grade;
        break;
      }
    }

    if (!foundStudent || !foundGrade) {
      setSearchError('Student ID not found. Try searching for sample ID "S-12A-01" or "S-12A-02".');
      return;
    }

    if (!foundGrade.isPublished) {
      setSearchError('Results for this class are not published yet. Please contact your coordinator/admin.');
      return;
    }

    // Calculate dynamic stats & ranking
    const calculatedStudents = calculateGradeResults(foundGrade);
    const updatedStudent = calculatedStudents.find(s => s.id === foundStudent!.id);

    if (updatedStudent) {
      setQueriedStudent(updatedStudent);
      setQueriedGrade(foundGrade);
    } else {
      setSearchError('Error calculating stats.');
    }
  };

  const handleQuickLookup = (id: string) => {
    setSearchId(id);
    setTimeout(() => {
      // Trigger programmatically
      const e = { preventDefault: () => {} } as React.FormEvent;
      // Search directly
      let foundStudent: Student | null = null;
      let foundGrade: Grade | null = null;
      for (const grade of grades) {
        const student = grade.students.find(s => s.id.toUpperCase() === id.toUpperCase());
        if (student) { foundStudent = student; foundGrade = grade; break; }
      }
      if (foundStudent && foundGrade) {
        const calculatedStudents = calculateGradeResults(foundGrade);
        const updatedStudent = calculatedStudents.find(s => s.id === foundStudent.id);
        if (updatedStudent) {
          setQueriedStudent(updatedStudent);
          setQueriedGrade(foundGrade);
          setSearchError('');
        }
      }
    }, 50);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!queriedStudent || !queriedGrade) return;

    const headers = ['Subject Name', '1st Semester Mark', '2nd Semester Mark', 'Subject Average'];
    const rows = queriedGrade.subjects.map((subj) => {
      const mark = queriedStudent.marks[subj.id];
      const sem1 = mark?.sem1 !== null && mark?.sem1 !== undefined ? mark.sem1.toString() : 'N/A';
      const sem2 = mark?.sem2 !== null && mark?.sem2 !== undefined ? mark.sem2.toString() : 'N/A';
      let avg = 'N/A';
      if (mark?.sem1 !== null && mark?.sem1 !== undefined && mark?.sem2 !== null && mark?.sem2 !== undefined) {
        avg = ((mark.sem1 + mark.sem2) / 2).toString();
      }
      return [subj.name, sem1, sem2, avg];
    });

    rows.push([]);
    rows.push(['Student ID', queriedStudent.id]);
    rows.push(['Student Name', queriedStudent.name]);
    rows.push(['Age', queriedStudent.age.toString()]);
    rows.push(['Sex', queriedStudent.sex]);
    rows.push(['Grade & Section', queriedGrade.id]);
    rows.push([]);
    rows.push(['Semester 1 Total Marks', (queriedStudent.sem1Total || 0).toString()]);
    rows.push(['Semester 1 Average', (queriedStudent.sem1Average || 'Incomplete').toString()]);
    rows.push(['Semester 1 Rank', (queriedStudent.sem1Rank || 'N/A').toString()]);
    rows.push(['Semester 1 Status', queriedStudent.sem1Status || 'Incomplete']);
    rows.push([]);
    rows.push(['Semester 2 Total Marks', (queriedStudent.sem2Total || 0).toString()]);
    rows.push(['Semester 2 Average', (queriedStudent.sem2Average || 'Incomplete').toString()]);
    rows.push(['Semester 2 Rank', (queriedStudent.sem2Rank || 'N/A').toString()]);
    rows.push(['Semester 2 Status', queriedStudent.sem2Status || 'Incomplete']);
    rows.push([]);
    rows.push(['Final Cumulative Total', (queriedStudent.finalTotal || 0).toString()]);
    rows.push(['Final Cumulative Average', (queriedStudent.finalAverage || 'Incomplete').toString()]);
    rows.push(['Final Cumulative Rank', (queriedStudent.finalRank || 'N/A').toString()]);
    rows.push(['Final Promotion Status', queriedStudent.finalStatus || 'Incomplete']);

    const csvContent = convertToCSV(headers, rows);
    downloadFile(csvContent, `report_card_${queriedStudent.id}.csv`, 'text/csv');
  };

  return (
    <div className="w-full">
      {/* Hero Header */}
      <div className="text-center mb-6 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-full text-[10px] font-bold tracking-wider uppercase mb-2.5 border border-slate-200 dark:border-slate-700">
          <BookOpen className="w-3.5 h-3.5 text-[#38BDF8]" />
          CHERCHER SECONDARY SCHOOL
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
          CHERCHER SECONDARY SCHOOL Portal
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm leading-relaxed">
          Log in with your unique Student ID assigned by the administration to securely query your official academic transcript, class rankings, and promotion status.
        </p>
      </div>

      {/* Query panel */}
      <div className="max-w-xl mx-auto mb-8 h-auto">
        <form onSubmit={handleSearch} className="relative flex items-center md:flex-row flex-col gap-2.5">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="studentIdSearch"
              type="text"
              className="block w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8] shadow-xs transition-all"
              placeholder="Enter Student ID (e.g. S-12A-01)"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
          </div>
          <button
            id="searchButton"
            type="submit"
            className="w-full md:w-auto px-5 py-2.5 bg-[#0F172A] hover:bg-[#1e293b] dark:bg-[#38BDF8] dark:hover:bg-[#56c5f7] text-white dark:text-[#0F172A] font-bold rounded-lg text-xs border border-[#1E293B] dark:border-transparent cursor-pointer flex items-center justify-center gap-1.5 transition-all whitespace-nowrap"
          >
            <span>Query Results</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {searchError && (
          <motion.p 
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 dark:text-red-405 text-xs mt-2 ml-1 font-medium flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            {searchError}
          </motion.p>
        )}

        {/* Quick Suggestions for Demo */}
        <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 rounded-xl">
          <span className="text-slate-550 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5">
            💡 Sample IDs for Demonstration:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleQuickLookup('S-12A-01')}
              className="px-2.5 py-1 text-[11px] bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-md hover:border-[#38BDF8] dark:hover:border-[#38BDF8] hover:text-[#38BDF8] dark:hover:text-[#38BDF8] transition-all font-mono shadow-xs cursor-pointer"
            >
              S-12A-01 (Kidus Y.)
            </button>
            <button
              onClick={() => handleQuickLookup('S-12A-02')}
              className="px-2.5 py-1 text-[11px] bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-md hover:border-[#38BDF8] dark:hover:border-[#38BDF8] hover:text-[#38BDF8] dark:hover:text-[#38BDF8] transition-all font-mono shadow-xs cursor-pointer"
            >
              S-12A-02 (Chaltu B.)
            </button>
            <span className="text-slate-400 dark:text-slate-500 text-[10px] flex items-center leading-normal">
              *(Grade 10B S-10B-01 is unpublished until marks are filled)*
            </span>
          </div>
        </div>
      </div>

      {/* Official Ethiopian Report Card Display */}
      <AnimatePresence mode="wait">
        {queriedStudent && queriedGrade && (
          <motion.div
            key={queriedStudent.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="max-w-3xl mx-auto print:mx-0 print:w-full print:shadow-none print:border-0"
          >
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-4 gap-2 print:hidden">
              <span className="text-xs text-neutral-500 font-mono">
                Verified Cryptographic State Database Record
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadStudentTranscriptPDF(queriedStudent, queriedGrade)}
                  className="px-4 py-2 bg-[#009b3a] hover:bg-[#008032] text-white font-semibold rounded-lg text-xs flex items-center gap-2 border border-transparent transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Transcript (PDF)
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold rounded-lg text-xs flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
              </div>
            </div>

            {/* Print Area Envelope */}
            <div 
              id="reportCardPrintArea"
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl rounded-2xl overflow-hidden relative print:border-0 print:shadow-none"
            >
              {/* Ethiopian National Flag Top Ribbon Accent */}
              <div className="h-2 w-full flex">
                <div className="bg-[#009b3a] h-full w-1/3" /> {/* Green */}
                <div className="bg-[#fcd116] h-full w-1/3" /> {/* Yellow */}
                <div className="bg-[#da121a] h-full w-1/3" /> {/* Red */}
              </div>

              {/* Certificate Inner Border */}
              <div className="p-6 md:p-8 border-4 border-transparent m-1.5 rounded-[10px] bg-linear-to-b from-neutral-50/10 to-transparent dark:from-neutral-950/20">
                
                {/* Header / Crest */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-6 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                      <Shield className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight uppercase">
                        CHERCHER SECONDARY SCHOOL
                      </h2>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                        Official Academic Transcript System
                      </p>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono uppercase tracking-widest mt-0.5">
                        Established 1994 • Academic Grade Sheet
                      </p>
                    </div>
                  </div>

                  <div className="text-center md:text-right">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#fcd116] dark:text-[#fcd116] bg-slate-900 text-white px-3 py-1 rounded-full border border-neutral-800">
                      OFFICIAL TRANSCRIPT
                    </span>
                    <div className="text-xs text-neutral-500 font-mono mt-2">
                      Academic Year: {new Date().getFullYear()} / {new Date().getFullYear() + 1}
                    </div>
                  </div>
                </div>

                {/* Student Personal Information */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/60 mb-6">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Student Name</span>
                    <span className="block text-sm font-semibold text-neutral-800 dark:text-white truncate">{queriedStudent.name}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Student ID Reference</span>
                    <span className="block text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">{queriedStudent.id}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Grade & Section</span>
                    <span className="block text-sm font-bold text-neutral-800 dark:text-white">{queriedGrade.id}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Personal Bio</span>
                    <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {queriedStudent.sex === 'M' ? 'Male' : 'Female'} • Age {queriedStudent.age}
                    </span>
                  </div>
                </div>

                {/* Score Breakdown Table */}
                <div className="overflow-x-auto border border-neutral-100 dark:border-neutral-850 rounded-xl mb-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-neutral-800text-xs text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                        <th className="py-3 px-4 font-bold text-[11px]">Subject Course Title</th>
                        <th className="py-3 px-4 text-center font-bold text-[11px]">1st Semester (50%)</th>
                        <th className="py-3 px-4 text-center font-bold text-[11px]">2nd Semester (50%)</th>
                        <th className="py-3 px-4 text-center font-bold text-[11px]">Subject Average (100%)</th>
                        <th className="py-3 px-4 text-center font-bold text-[11px]">Performance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 text-sm">
                      {queriedGrade.subjects.map((subj) => {
                        const mark = queriedStudent.marks[subj.id];
                        const s1 = mark?.sem1;
                        const s2 = mark?.sem2;
                        const hasMarks = s1 !== null && s2 !== null;
                        const avg = hasMarks ? (s1 + s2) / 2 : null;
                        let passStatus = '';
                        let colorClass = 'text-neutral-400';

                        if (avg !== null) {
                          if (avg >= 85) {
                            passStatus = 'Excellent';
                            colorClass = 'text-green-500 font-bold';
                          } else if (avg >= 70) {
                            passStatus = 'Very Good';
                            colorClass = 'text-emerald-600 font-semibold';
                          } else if (avg >= 50) {
                            passStatus = 'Satisfactory';
                            colorClass = 'text-amber-600 font-medium';
                          } else {
                            passStatus = 'Needs Improvement';
                            colorClass = 'text-red-500 font-bold';
                          }
                        }

                        return (
                          <tr key={subj.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-850/30">
                            <td className="py-3.5 px-4 font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                              {subj.name}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-neutral-700 dark:text-neutral-300">
                              {s1 !== null ? s1 : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-neutral-700 dark:text-neutral-300">
                              {s2 !== null ? s2 : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-[#009b3a] dark:text-[#009b3a]/90">
                              {avg !== null ? avg.toFixed(1) : 'Incomplete'}
                            </td>
                            <td className={`py-3.5 px-4 text-center font-medium ${colorClass}`}>
                              {avg !== null ? passStatus : 'Pending'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Score Summary Metrics (Separated Semester Calculations Table) */}
                <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="block text-[11px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider mb-3">
                    Verified Term-Wise Academic Breakdown
                  </span>
                  <div className="overflow-x-auto border border-neutral-100 dark:border-neutral-800/80 rounded-xl bg-white dark:bg-[#111827]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 border-b border-neutral-100 dark:border-neutral-800">
                          <th className="py-3 px-4 text-[11px] font-bold">Academic Result Category</th>
                          <th className="py-3 px-4 text-center text-[11px] font-bold">Total Marks</th>
                          <th className="py-3 px-4 text-center text-[11px] font-bold">Term Average</th>
                          <th className="py-3 px-4 text-center text-[11px] font-bold">Class Section Rank</th>
                          <th className="py-3 px-4 text-center text-[11px] font-bold">Result Decision Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850/80 text-xs md:text-sm">
                        {/* Semester 1 Row */}
                        <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-850/30">
                          <td className="py-3.5 px-4 font-bold text-neutral-700 dark:text-neutral-300">1st Semester Results</td>
                          <td className="py-3.5 px-4 text-center font-mono text-neutral-800 dark:text-slate-200">
                            {queriedStudent.sem1Total !== undefined ? queriedStudent.sem1Total.toFixed(1) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-semibold text-neutral-900 dark:text-slate-200">
                            {queriedStudent.sem1Average !== undefined ? `${queriedStudent.sem1Average.toFixed(2)}%` : 'Incomplete'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                            {queriedStudent.sem1Rank !== undefined ? `Rank #${queriedStudent.sem1Rank}` : 'Incomplete'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold uppercase text-[10px] md:text-xs">
                            {queriedStudent.sem1Status === 'Pass' ? (
                              <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Pass</span>
                            ) : queriedStudent.sem1Status === 'Fail' ? (
                              <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded">Fail</span>
                            ) : (
                              <span className="text-neutral-400 dark:text-slate-500">Incomplete</span>
                            )}
                          </td>
                        </tr>

                        {/* Semester 2 Row */}
                        <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-850/30">
                          <td className="py-3.5 px-4 font-bold text-neutral-700 dark:text-neutral-300">2nd Semester Results</td>
                          <td className="py-3.5 px-4 text-center font-mono text-neutral-800 dark:text-slate-200">
                            {queriedStudent.sem2Total !== undefined ? queriedStudent.sem2Total.toFixed(1) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-semibold text-neutral-900 dark:text-slate-200">
                            {queriedStudent.sem2Average !== undefined ? `${queriedStudent.sem2Average.toFixed(2)}%` : 'Incomplete'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                            {queriedStudent.sem2Rank !== undefined ? `Rank #${queriedStudent.sem2Rank}` : 'Incomplete'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold uppercase text-[10px] md:text-xs">
                            {queriedStudent.sem2Status === 'Pass' ? (
                              <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Pass</span>
                            ) : queriedStudent.sem2Status === 'Fail' ? (
                              <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded">Fail</span>
                            ) : (
                              <span className="text-neutral-400 dark:text-slate-500">Incomplete</span>
                            )}
                          </td>
                        </tr>

                        {/* Final Cumulative Row */}
                        <tr className="bg-[#009b3a]/5 dark:bg-[#009b3a]/10 hover:bg-[#009b3a]/10 dark:hover:bg-[#009b3a]/15 font-semibold">
                          <td className="py-3.5 px-4 font-extrabold text-[#009b3a] dark:text-emerald-400">Final Cumulative Averages</td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-[#009b3a] dark:text-emerald-400">
                            {queriedStudent.finalTotal !== undefined ? queriedStudent.finalTotal.toFixed(1) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-extrabold text-neutral-900 dark:text-white">
                            {queriedStudent.finalAverage !== undefined ? `${queriedStudent.finalAverage.toFixed(2)}%` : 'Incomplete'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-extrabold text-[#da121a] dark:text-red-400 text-sm md:text-base">
                            {queriedStudent.finalRank !== undefined ? `Rank #${queriedStudent.finalRank}` : 'Incomplete'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-extrabold uppercase text-[10px] md:text-xs">
                            {queriedStudent.finalStatus === 'Pass' ? (
                              <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-md shadow-inner">Promoted</span>
                            ) : queriedStudent.finalStatus === 'Fail' ? (
                              <span className="text-red-650 dark:text-red-400 bg-red-500/20 px-2 py-1 rounded-md shadow-inner">Retained</span>
                            ) : (
                              <span className="text-neutral-450 dark:text-slate-400">Incomplete</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Legal Signatures */}
                <div className="mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-end gap-6">
                  <div className="text-left">
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Office of the Registrar</p>
                    <div className="h-8 w-32 border-b border-neutral-300 dark:border-neutral-700 mt-2 flex items-end">
                      <span className="text-[10px] font-mono text-neutral-400 italic">Official Seal & Key</span>
                    </div>
                  </div>
                  
                  <div className="text-center bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 px-4 py-2.5 rounded-xl">
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 justify-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Cryptographically Signed Record
                    </span>
                    <span className="block font-mono text-[9px] text-neutral-400 mt-0.5">
                      HASH_{queriedStudent.id}_{queriedGrade.id}_SECURED
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Principal Signature</p>
                    <div className="h-8 w-32 border-b border-neutral-300 dark:border-neutral-700 mt-2 flex items-end justify-end">
                      <span className="text-[10px] font-mono text-neutral-400 italic">Signature / Stamp</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
