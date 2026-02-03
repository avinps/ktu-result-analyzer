import { useMemo } from 'react';
import type { StudentResult } from '../utils/pdfParser';

const GRADE_POINTS: Record<string, number> = {
  "S": 10, "A+": 9, "A": 8.5, "B+": 8, "B": 7.5,
  "C+": 7, "C": 6.5, "D": 6, "P": 5.5, "PASS": 5.5, "Pass": 5.5,
  "F": 0, "FE": 0, "Absent": 0, "Withheld": 0, "TBP": 0
};

export const useAnalytics = (
  students: StudentResult[], 
  detectedRegularBatch: string, 
  viewBatch: string,
  creditMap: Record<string, number> 
) => {
  
  const analytics = useMemo(() => {
    // --- PART 1: GLOBAL STATS ---
    const globalRegulars = students.filter(s => s.batch === detectedRegularBatch);
    const globalSupply = students.filter(s => s.batch !== detectedRegularBatch);

    const globalRegularPassed = globalRegulars.filter(s => s.isPassed).length;
    const globalSupplyPassed = globalSupply.filter(s => s.isPassed).length;

    // --- PART 2: VIEW SPECIFIC STATS ---
    const viewStudents = students.filter(s => s.batch === viewBatch);
    
    // Group by Department
    const deptStats: any = {};
    
    viewStudents.forEach(student => {
      if (!deptStats[student.dept]) {
        deptStats[student.dept] = {
          total: 0,
          passed: 0,
          failed: 0,
          subjects: {},
          students: []
        };
      }
      
      const ds = deptStats[student.dept];
      ds.total++;
      if (student.isPassed) ds.passed++;
      else ds.failed++;
      ds.students.push(student);

      Object.entries(student.grades).forEach(([subject, grade]) => {
        if (!ds.subjects[subject]) ds.subjects[subject] = { appeared: 0, passed: 0, failed: 0 };
        ds.subjects[subject].appeared++;
        if (['F', 'FE', 'Absent', 'Withheld'].includes(grade)) ds.subjects[subject].failed++;
        else ds.subjects[subject].passed++;
      });
    });

    // Helper: Calculate SGPA
    const calculateSGPA = (grades: { [code: string]: string }): string | null => {
      let totalPoints = 0;
      let totalCredits = 0;
      let missingCredit = false;

      const entries = Object.entries(grades);
      
      for (const [subject, grade] of entries) {
        if (['F', 'FE', 'Absent', 'Withheld', 'TBP'].includes(grade)) continue;

        if (GRADE_POINTS[grade] !== undefined) {
            const credit = creditMap[subject]; 
            
            if (credit === undefined) {
                missingCredit = true;
                break;
            }
            
            const point = GRADE_POINTS[grade];
            totalPoints += point * credit;
            totalCredits += credit;
        }
      }

      if (missingCredit || totalCredits === 0) return null;
      return (totalPoints / totalCredits).toFixed(2);
    };

    // Calculate Metrics
    const departmentAnalytics = Object.keys(deptStats)
      .map(dept => {
        const data = deptStats[dept];
        const passPercentage = data.total > 0 ? (data.passed / data.total) * 100 : 0;
        
        const atRiskCount = data.students.filter((s: StudentResult) => s.failedSubjects.length >= 3).length;
        const improvableCount = data.students.filter((s: StudentResult) => s.failedSubjects.length > 0 && s.failedSubjects.length <= 2).length;

        // --- NEW HEALTH SCORE LOGIC ---
        // Formula: (Fully Passed * 1.0) + (Improvable * 0.5) + (At Risk * 0)
        // This explicitly rewards Pass (100% weight) and Improvable (50% weight).
        const improvablePercentage = data.total > 0 ? (improvableCount / data.total) * 100 : 0;
        let healthScore = passPercentage + (improvablePercentage * 0.5);

        // Cap at 100 just in case (though math implies max 100)
        if (healthScore > 100) healthScore = 100;
        if (isNaN(healthScore)) healthScore = 0;
        
        return {
          dept,
          totalAppeared: data.total,
          totalPassed: data.passed,
          passPercentage: passPercentage.toFixed(2),
          atRisk: atRiskCount,
          improvable: improvableCount,
          healthScore: healthScore.toFixed(1),
          subjectStats: data.subjects,
          students: data.students
        };
      })
      .sort((a, b) => parseFloat(b.passPercentage) - parseFloat(a.passPercentage));

    const viewStats = {
      batch: viewBatch,
      type: viewBatch === detectedRegularBatch ? "Regular" : "Supply",
      totalAppeared: viewStudents.length,
      totalPassed: viewStudents.filter(s => s.isPassed).length,
      passPercentage: viewStudents.length > 0 
        ? ((viewStudents.filter(s => s.isPassed).length / viewStudents.length) * 100).toFixed(2) 
        : "0"
    };

    const getSgpaListForDept = (dept: string) => {
        const eligibleStudents = students.filter(s => 
            s.batch === detectedRegularBatch && 
            s.dept === dept && 
            s.isPassed
        );

        return eligibleStudents
            .map(s => ({
                registerNo: s.registerNo,
                sgpa: calculateSGPA(s.grades)
            }))
            // Type Guard: Ensure 'sgpa' is treated as string, removing TS error
            .filter((s): s is { registerNo: string; sgpa: string } => s.sgpa !== null) 
            .sort((a, b) => parseFloat(b.sgpa) - parseFloat(a.sgpa));
    };

    return { 
      globalStats: {
        totalRegular: globalRegulars.length,
        totalRegularPassed: globalRegularPassed,
        totalSupply: globalSupply.length,
        totalSupplyPassed: globalSupplyPassed
      },
      viewStats,
      departmentAnalytics,
      getSgpaListForDept
    };
  }, [students, detectedRegularBatch, viewBatch, creditMap]);

  return analytics;
};