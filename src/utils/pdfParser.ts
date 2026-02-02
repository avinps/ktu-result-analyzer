import * as pdfjsLib from 'pdfjs-dist';

// @ts-ignore
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface StudentResult {
  registerNo: string;
  batch: string; 
  dept: string;  
  rollNo: string;
  grades: { [courseCode: string]: string };
  failedSubjects: string[];
  isPassed: boolean;
}

export interface ParseResult {
  metadata: {
    college: string;
    examName: string; 
    date: string;
    scheme: string; 
    regularBatch: string;
    deptMap: { [key: string]: string };    
    subjectMap: { [key: string]: string }; 
  };
  students: StudentResult[];
}

const calculateBatchFromTitle = (title: string): string => {
  try {
    // Updated to include ALL months and common abbreviations
    const yearMatch = title.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
    const examYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
    const semMatch = title.match(/S(\d+)/i);
    const sem = semMatch ? parseInt(semMatch[1]) : 0;
    if (sem > 0) {
      const calculatedYear = examYear - Math.floor(sem / 2);
      return calculatedYear.toString().slice(-2); 
    }
  } catch (e) {
    console.warn("Could not auto-detect batch", e);
  }
  return "23"; 
};

export const parseResultPDF = async (file: File): Promise<ParseResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join("\n"); 
    fullText += pageText + "\n";
  }

  const examNameMatch = fullText.match(/B\.Tech S\d+.*Exam.*20\d{2}/i) || fullText.match(/B\.Tech.*Result/i);
  const examName = examNameMatch ? examNameMatch[0].replace(/\n/g, " ") : "Exam Result";
  
  const schemeMatch = fullText.match(/\((\d{4})\s*Scheme\)/i);
  const detectedScheme = schemeMatch ? schemeMatch[1] : "Unknown";

  let collegeName = "Unknown College"; 
  const collegeMatch = fullText.match(/(?:Centre|Institution|College).*?:\s*([A-Z\s.&]+(?:ENGINEERING|TECHNOLOGY))/i);
  if (collegeMatch) {
     collegeName = collegeMatch[1].trim();
  }

  const detectedBatch = calculateBatchFromTitle(examName);

  const deptMap: { [key: string]: string } = {};
  const subjectMap: { [key: string]: string } = {};
  const students: StudentResult[] = [];

  const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  
  let currentDeptName = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // --- A. Detect Department Header ---
    if (line.includes("[Full Time]")) {
        const namePart = line.split("[Full Time]")[0];
        currentDeptName = namePart.replace(/^[^a-zA-Z]+/, '').trim();
        continue;
    }

    // --- B. Detect Subject Definition ---
    // 1. Try Same Line Match: "MAT202 PROBABILITY..."
    const sameLineMatch = line.match(/([A-Z]{2,6}\d{3})\s+(.{3,})$/);
    if (sameLineMatch && !line.includes("(") && !line.includes("Course Code")) {
        const code = sameLineMatch[1].trim();
        let name = sameLineMatch[2].trim();
        name = name.replace(/^["',]+|["',]+$/g, ''); // Clean quotes/commas
        
        // Ensure not a student ID
        if (!/[A-Z]{3}\d{2}/.test(name)) {
            
            // --- FIX: Check for Multi-line Subject Names ---
            while (i + 1 < lines.length) {
                 const nextLine = lines[i+1];
                 const isNextCode = /[A-Z]{2,6}\d{3}/.test(nextLine);
                 const isNextStudent = /[A-Z]{3}\d{2}/.test(nextLine);
                 const isHeader = nextLine.includes("Course") || nextLine.includes("Register");
                 
                 // If next line is just text (continuation), append it
                 if (!isNextCode && !isNextStudent && !isHeader) {
                     name += " " + nextLine.trim().replace(/^["',]+|["',]+$/g, '');
                     i++; // Consume line
                 } else {
                     break;
                 }
            }
            subjectMap[code] = name;
            continue;
        }
    }

    // 2. Try Split Line Match: "MAT202" on one line, Name on next
    const splitCodeMatch = line.match(/([A-Z]{2,6}\d{3})/);
    if (splitCodeMatch && !line.includes("(") && !line.includes("Course Code")) {
        const code = splitCodeMatch[1].trim();
        // If line is short (mostly just the code), peek at next line
        if (line.length < 15 && i + 1 < lines.length) {
             const nextLine = lines[i+1];
             const isNextCode = /[A-Z]{2,6}\d{3}/.test(nextLine);
             const isNextStudent = /[A-Z]{3}\d{2}/.test(nextLine);
             
             if (!isNextCode && !isNextStudent && !nextLine.includes("Course")) {
                 let name = nextLine.trim().replace(/^["',]+|["',]+$/g, ''); 
                 i++; // Consume first line of name
                 
                 // --- FIX: Check for MORE lines of Subject Name ---
                 while (i + 1 < lines.length) {
                     const next2Line = lines[i+1];
                     const isNext2Code = /[A-Z]{2,6}\d{3}/.test(next2Line);
                     const isNext2Student = /[A-Z]{3}\d{2}/.test(next2Line);
                     const isHeader = next2Line.includes("Course") || next2Line.includes("Register");

                     if (!isNext2Code && !isNext2Student && !isHeader) {
                         name += " " + next2Line.trim().replace(/^["',]+|["',]+$/g, '');
                         i++; // Consume continuation line
                     } else {
                         break;
                     }
                 }
                 subjectMap[code] = name;
                 continue;
             }
        }
    }

    // --- C. Detect Student Row ---
    const studentMatch = line.match(/([A-Z]{3})(\d{2})([A-Z]{2,3})(\d{3})/);
    if (studentMatch) {
        const registerNo = studentMatch[0]; 
        const batch = studentMatch[2]; 
        const deptCode = studentMatch[3]; 
        const rollNo = studentMatch[4]; 

        if (currentDeptName && deptCode && !deptMap[deptCode]) {
            deptMap[deptCode] = currentDeptName;
        }

        const idIndex = line.indexOf(registerNo);
        let rawGrades = line.substring(idIndex + registerNo.length);
        
        const gradeRegex = /([A-Z]{2,6}\d{3})\s*\(([^)]+)\)/g;
        const grades: { [code: string]: string } = {};
        const failedSubjects: string[] = [];
        let gMatch;

        const extractGrades = (text: string) => {
            while ((gMatch = gradeRegex.exec(text)) !== null) {
                const course = gMatch[1];
                const grade = gMatch[2].trim();
                grades[course] = grade;
                if (['F', 'FE', 'Absent', 'Withheld'].includes(grade)) {
                    failedSubjects.push(course);
                }
            }
        };

        extractGrades(rawGrades);

        while (i + 1 < lines.length) {
            const nextLine = lines[i+1];
            
            if (nextLine.match(/[A-Z]{3}\d{2}[A-Z]{2,3}\d{3}/)) break;
            if (nextLine.includes("[Full Time]")) break;
            if (nextLine.includes("Course Code")) break;

            if (nextLine.match(/[A-Z]{2,6}\d{3}\s*\(/)) {
                extractGrades(nextLine);
                i++; 
            } else {
                break; 
            }
        }

        if (Object.keys(grades).length > 0) {
            students.push({
                registerNo,
                batch,
                dept: deptCode,
                rollNo,
                grades,
                failedSubjects,
                isPassed: failedSubjects.length === 0
            });
        }
    }
  }

  return {
    metadata: {
      college: collegeName,
      examName,
      date: new Date().toLocaleDateString(),
      scheme: detectedScheme,
      regularBatch: detectedBatch,
      deptMap,
      subjectMap
    },
    students
  };
};