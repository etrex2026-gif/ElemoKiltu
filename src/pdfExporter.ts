import { jsPDF } from 'jspdf';
import { Grade, Student } from './types';

export function downloadStudentTranscriptPDF(student: Student, grade: Grade, schoolName: string = 'CHERCHER SECONDARY SCHOOL') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Page width and height
  const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~297mm

  // 1. National Ribbon Accents (Top Border)
  doc.setFillColor(0, 155, 58); // Green
  doc.rect(10, 8, (pageWidth - 20) / 3, 2, 'F');
  doc.setFillColor(252, 209, 22); // Yellow
  doc.rect(10 + (pageWidth - 20) / 3, 8, (pageWidth - 20) / 3, 2, 'F');
  doc.setFillColor(218, 18, 26); // Red
  doc.rect(10 + (2 * (pageWidth - 20)) / 3, 8, (pageWidth - 20) / 3, 2, 'F');

  // 2. School Header Information
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(schoolName, pageWidth / 2, 19, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('OFFICIAL ACADEMIC TRANSCRIPT SHEET', pageWidth / 2, 25, { align: 'center' });

  // Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(10, 31, pageWidth - 10, 31);

  // 3. Student Bio Information Grid
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(10, 35, pageWidth - 20, 24, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(10, 35, pageWidth - 20, 24, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('STUDENT ID', 14, 41);
  doc.text('FULL NAME', 14, 48);
  doc.text('SEX', 14, 55);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(9.5);
  doc.text(student.id, 45, 41);
  doc.text(student.name, 45, 48);
  doc.text(student.sex === 'M' ? 'Male' : 'Female', 45, 55);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('GRADE / SECTION', pageWidth / 2 + 10, 41);
  doc.text('STUDENT AGE', pageWidth / 2 + 10, 48);
  doc.text('ACADEMIC YEAR', pageWidth / 2 + 10, 55);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(9.5);
  doc.text(`Grade ${grade.id}`, pageWidth / 2 + 45, 41);
  doc.text(`${student.age} years old`, pageWidth / 2 + 45, 48);
  doc.text(`${new Date().getFullYear()} EC (2026/27 GC)`, pageWidth / 2 + 45, 55);

  // 4. Academic Performance Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('SUBJECT-WISE SEMESTER GRADE PERFORMANCE MATRIX', 10, 66);

  // Table Headers
  let currentY = 70;
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(10, currentY, pageWidth - 20, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Subject Name', 14, currentY + 5);
  doc.text('1st Semester (50%)', 90, currentY + 5, { align: 'center' });
  doc.text('2nd Semester (50%)', 135, currentY + 5, { align: 'center' });
  doc.text('Subject Average', 180, currentY + 5, { align: 'center' });

  // Rows of Subjects
  currentY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85); // slate-700

  grade.subjects.forEach((subj, idx) => {
    // Alternate row styling
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(10, currentY, pageWidth - 20, 8, 'F');
    }
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.line(10, currentY + 8, pageWidth - 10, currentY + 8);

    const mark = student.marks[subj.id];
    const s1Val = mark?.sem1 !== null && mark?.sem1 !== undefined ? mark.sem1.toFixed(1) : '—';
    const s2Val = mark?.sem2 !== null && mark?.sem2 !== undefined ? mark.sem2.toFixed(1) : '—';
    let avgVal = '—';
    if (mark?.sem1 !== null && mark?.sem1 !== undefined && mark?.sem2 !== null && mark?.sem2 !== undefined) {
      avgVal = ((mark.sem1 + mark.sem2) / 2).toFixed(1);
    }

    doc.setFont('helvetica', 'bold');
    doc.text(subj.name, 14, currentY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(s1Val, 90, currentY + 5.5, { align: 'center' });
    doc.text(s2Val, 135, currentY + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(avgVal, 180, currentY + 5.5, { align: 'center' });

    currentY += 8;
  });

  // Table Outer Border
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.rect(10, 70, pageWidth - 20, currentY - 70, 'S');

  // 5. Separated Term-Wise Summary Section
  currentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('VERIFIED TERM-WISE BREAKDOWN SUMMARY', 10, currentY);

  currentY += 4;
  // Three parallel summary tables or a clean stacked list. Let's make an elegant 3-column comparative card layout
  const cardW = (pageWidth - 20) / 3 - 3;
  
  // Card 1: Semester 1
  doc.setFillColor(248, 250, 252);
  doc.rect(10, currentY, cardW, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(10, currentY, cardW, 30, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('SEMESTER 1 RESULTS', 13, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Score: ${student.sem1Total !== undefined ? student.sem1Total.toFixed(1) : '—'}`, 13, currentY + 11);
  doc.text(`Term Average: ${student.sem1Average !== undefined ? `${student.sem1Average.toFixed(2)}%` : 'Incomplete'}`, 13, currentY + 16);
  doc.text(`Class Section Rank: #${student.sem1Rank !== undefined ? student.sem1Rank : '—'}`, 13, currentY + 21);
  doc.setFont('helvetica', 'bold');
  doc.text(`Result Decision: ${student.sem1Status || 'Incomplete'}`, 13, currentY + 26);

  // Card 2: Semester 2
  doc.setFillColor(248, 250, 252);
  doc.rect(10 + cardW + 4.5, currentY, cardW, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(10 + cardW + 4.5, currentY, cardW, 30, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('SEMESTER 2 RESULTS', 10 + cardW + 7.5, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Score: ${student.sem2Total !== undefined ? student.sem2Total.toFixed(1) : '—'}`, 10 + cardW + 7.5, currentY + 11);
  doc.text(`Term Average: ${student.sem2Average !== undefined ? `${student.sem2Average.toFixed(2)}%` : 'Incomplete'}`, 10 + cardW + 7.5, currentY + 16);
  doc.text(`Class Section Rank: #${student.sem2Rank !== undefined ? student.sem2Rank : '—'}`, 10 + cardW + 7.5, currentY + 21);
  doc.setFont('helvetica', 'bold');
  doc.text(`Result Decision: ${student.sem2Status || 'Incomplete'}`, 10 + cardW + 7.5, currentY + 26);

  // Card 3: Final Cumulative
  doc.setFillColor(239, 253, 245); // light green bg
  doc.rect(10 + 2 * cardW + 9, currentY, cardW, 30, 'F');
  doc.setDrawColor(187, 247, 208); // green border
  doc.rect(10 + 2 * cardW + 9, currentY, cardW, 30, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 124, 65); // green text
  doc.text('CUMULATIVE YEAR AVERAGES', 10 + 2 * cardW + 12, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Cumulative Total: ${student.finalTotal !== undefined ? student.finalTotal.toFixed(1) : '—'}`, 10 + 2 * cardW + 12, currentY + 11);
  doc.text(`Cumulative Avg: ${student.finalAverage !== undefined ? `${student.finalAverage.toFixed(2)}%` : 'Incomplete'}`, 10 + 2 * cardW + 12, currentY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(218, 18, 26); // red rank
  doc.text(`Cumulative Rank: #${student.finalRank !== undefined ? student.finalRank : '—'}`, 10 + 2 * cardW + 12, currentY + 21);
  doc.setTextColor(16, 124, 65);
  doc.text(`Decision Status: ${student.finalStatus === 'Pass' ? 'PROMOTED' : student.finalStatus === 'Fail' ? 'RETAINED' : 'INCOMPLETE'}`, 10 + 2 * cardW + 12, currentY + 26);

  // 6. Signature Footers Section
  currentY += 42;
  doc.setLineWidth(0.35);
  doc.setDrawColor(148, 163, 184); // slate-400
  
  // Signature Lines
  doc.line(15, currentY, 65, currentY);
  doc.line(pageWidth / 2 - 25, currentY, pageWidth / 2 + 25, currentY);
  doc.line(pageWidth - 65, currentY, pageWidth - 15, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('HOMEROOM TEACHER SIGNATURE', 40, currentY + 5, { align: 'center' });
  doc.text('OFFICE OF THE REGISTRAR', pageWidth / 2, currentY + 5, { align: 'center' });
  doc.text('SCHOOL PRINCIPAL SIGNATURE', pageWidth - 40, currentY + 5, { align: 'center' });

  // Seal / Watermark placeholder in signature lines
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Official Stamp Location', pageWidth / 2, currentY + 11, { align: 'center' });

  // Footer metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`System Developed by Ramoda Technologies • Generated dynamically via Chercher secondary school student database on ${new Date().toLocaleDateString()}.`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Trigger Save to File Download
  doc.save(`Transcript_${student.id}_${student.name.replace(/\s+/g, '_')}.pdf`);
}
