import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { parseResultPDF, type ParseResult, type StudentResult } from '../utils/pdfParser';
import { useAnalytics } from '../hooks/useAnalytics';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend 
} from 'recharts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  Upload, BrainCircuit, GraduationCap, ShieldCheck, Building2, GitFork, 
  FileText, Copy, AlertTriangle, TrendingUp, Check, Activity, Lightbulb, 
  Star, Download, X, ArrowUpDown, ArrowUp, ArrowDown, MessageSquare, Info, Github, Globe, User 
} from 'lucide-react';
import { FilterBar } from './FilterBar';

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`; 
};

const GRADE_COLORS = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9", "#10b981", 
  "#84cc16", "#eab308", "#f97316", "#ef4444", "#be123c", 
  "#881337", "#64748b", "#94a3b8"
];

// --- CUSTOM TOOLTIPS ---
const CustomTooltip = ({ active, payload, label, type, deptMap, subjectMap }: any) => {
  if (active && payload && payload.length) {
    const fullName = deptMap?.[label] || subjectMap?.[label] || label;
    const value = payload[0].value;
    const name = type === 'pass' ? "Pass %" : "Health Score";
    const colorCode = stringToColor(label);

    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg max-w-[300px] z-50">
        <p className="font-bold text-slate-800 mb-1 leading-tight">{fullName}</p>
        <p className="text-xs text-slate-500 mb-2 font-mono">{label}</p>
        <p className="text-sm font-semibold" style={{ color: colorCode }}>
          {name}: {value}{type === 'pass' ? '%' : ''}
        </p>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload, totalStudents, subjectTitle }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const percentage = totalStudents > 0 ? ((data.value / totalStudents) * 100).toFixed(1) : 0;
    const gradeLabel = data.name.split(' (')[0];
    
    return (
      <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl border border-slate-700">
        <p className="text-xs font-semibold text-slate-400 mb-1 border-b border-slate-600 pb-1">
          {subjectTitle}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.payload.fill }}></div>
          <span className="font-bold text-lg">{gradeLabel} Grade</span>
        </div>
        <div className="mt-2 text-sm">
          <p>Students: <span className="font-mono font-bold">{data.value}</span></p>
          <p>Share: <span className="font-mono font-bold text-emerald-400">{percentage}%</span></p>
        </div>
      </div>
    );
  }
  return null;
};

// --- SMART BAR LABEL ---
const CustomBarLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  const isShort = value < 15; 
  return (
    <text 
      x={isShort ? x + width + 5 : x + width - 5} 
      y={y + height / 2 + 1} 
      fill={isShort ? "#475569" : "#fff"} 
      textAnchor={isShort ? "start" : "end"} 
      dominantBaseline="middle" 
      fontSize={11} 
      fontWeight="bold"
    >
      {value}%
    </text>
  );
};

// --- STUDENT LIST TILE ---
const StudentListTile = ({ title, students, color, icon: Icon, valueLabel = "Count" }: any) => {
  const [copiedList, setCopiedList] = useState(false);
  const [copiedRow, setCopiedRow] = useState<string | null>(null);

  const handleCopyList = () => {
    const list = students.map((s: any) => `${s.registerNo} - ${s.sgpa ? s.sgpa + ' SGPA' : s.failedCount + ' Failed'}`).join('\n');
    navigator.clipboard.writeText(list);
    setCopiedList(true);
    setTimeout(() => setCopiedList(false), 2000);
  };

  const handleCopyRow = (regNo: string) => {
    navigator.clipboard.writeText(regNo);
    setCopiedRow(regNo);
    setTimeout(() => setCopiedRow(null), 1500);
  };

  const colorStyles: any = {
    orange: "bg-orange-50 border-orange-200 text-orange-800",
    red: "bg-red-50 border-red-200 text-red-800",
    green: "bg-emerald-50 border-emerald-200 text-emerald-800"
  };

  const isScrollable = students.length > 8;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-96">
      <div className={`p-4 border-b flex justify-between items-center rounded-t-xl ${colorStyles[color] || ""}`}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5" />}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wide flex items-center gap-2">
              {title}
            </h3>
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium opacity-80">{students.length} Students</span>
                {isScrollable && (
                    <span className="text-[10px] bg-white/40 px-1.5 py-0.5 rounded text-inherit font-semibold animate-pulse">
                        Scroll ↓
                    </span>
                )}
            </div>
          </div>
        </div>
        <button 
          onClick={handleCopyList}
          className="p-2 bg-white/50 hover:bg-white rounded-lg transition text-xs font-bold flex items-center gap-1"
          title="Copy Entire List"
        >
          {copiedList ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
          {copiedList ? "Copied" : "Copy All"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
        `}</style>
        {students.length > 0 ? (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-3 py-2 bg-slate-50">Register No</th>
                <th className="px-3 py-2 text-right bg-slate-50">{valueLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s: any) => (
                <tr key={s.registerNo} className="hover:bg-slate-50 group">
                  <td className="px-3 py-2 text-slate-700 select-text">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{s.registerNo}</span>
                            <button 
                                onClick={() => handleCopyRow(s.registerNo)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-600"
                                title="Copy Register No"
                            >
                                {copiedRow === s.registerNo ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                        </div>
                        {s.hasWithheld && (
                            <span className="text-[10px] text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded w-fit mt-0.5 font-medium">
                                Withheld Subjects Included
                            </span>
                        )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-slate-600 select-text align-top">
                    {s.sgpa || s.failedCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <p className="text-sm">No students found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const FacultyDashboard: React.FC = () => {
  const [data, setData] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [viewBatch, setViewBatch] = useState("23");
  const [viewDept, setViewDept] = useState("");      
  const [viewSubject, setViewSubject] = useState(""); 
  
  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [fileName, setFileName] = useState<string>(""); 

  const [creditMap, setCreditMap] = useState<Record<string, number>>({});
  
  // MODAL STATES
  const [sgpaModalOpen, setSgpaModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // --- NEW REPORT STATE ---
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDept, setReportDept] = useState("");

  // --- DEFAULT SORTING STATE FOR SGPA LIST ---
  const [sgpaDept, setSgpaDept] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: 'registerNo' | 'sgpa', direction: 'asc' | 'desc' }>({ 
    key: 'sgpa', 
    direction: 'desc' 
  });

  const detectedBatch = data?.metadata?.regularBatch || "23";
  const schemeYear = data?.metadata?.scheme || "Unknown";
  const is2024Scheme = schemeYear.includes("2024");

  const { departmentAnalytics, globalStats, viewStats, getSgpaListForDept } = useAnalytics(
    data?.students || [], 
    detectedBatch, 
    viewBatch,
    creditMap
  );

  const formatBatch = (yy: string) => `20${yy}`;
  const availableDepts = departmentAnalytics.map(d => d.dept);

  // --- 1. FETCH CREDITS ON MOUNT ---
  useEffect(() => {
    fetch('/credits.csv')
      .then(response => response.text())
      .then(text => {
        const lines = text.split(/\r?\n/);
        const map: Record<string, number> = {};
        lines.forEach(line => {
          const [code, cred] = line.split(',');
          if (code && cred) map[code.trim()] = parseFloat(cred.trim());
        });
        setCreditMap(map);
      })
      .catch(err => console.error("Could not load credits.csv", err));
  }, []);

  const getDeptName = (code: string) => data?.metadata?.deptMap?.[code] || code;
  const getSubjectName = (code: string) => data?.metadata?.subjectMap?.[code] || code;

  const currentDeptHealth = useMemo(() => {
      const deptData = departmentAnalytics.find(d => d.dept === viewDept);
      return deptData ? deptData.healthScore : "0";
  }, [departmentAnalytics, viewDept]);

  const sgpaList = useMemo(() => {
    if (!sgpaDept) return [];
    const rawList = getSgpaListForDept(sgpaDept);
    return [...rawList].sort((a, b) => {
        if (sortConfig.key === 'registerNo') {
            return sortConfig.direction === 'asc' 
                ? a.registerNo.localeCompare(b.registerNo)
                : b.registerNo.localeCompare(a.registerNo);
        } else {
            return sortConfig.direction === 'asc'
                ? parseFloat(a.sgpa) - parseFloat(b.sgpa)
                : parseFloat(b.sgpa) - parseFloat(a.sgpa);
        }
    });
  }, [sgpaDept, getSgpaListForDept, sortConfig]);

  const handleSort = (key: 'registerNo' | 'sgpa') => {
    setSortConfig(current => ({
        key,
        direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const exportSgpaCSV = () => {
    const header = "Register No,SGPA\n";
    const rows = sgpaList.map(s => `${s.registerNo},${s.sgpa}`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sgpaDept}_SGPA_List.csv`;
    a.click();
  };

  const deptSpecificStats = useMemo(() => {
    if (!viewDept || !data) return null;

    const students = data.students.filter((s: StudentResult) => {
       const isDeptMatch = s.dept === viewDept;
       const studentBatch = String(s.batch || data.metadata.regularBatch || "");
       const selectedBatch = String(viewBatch);
       const isBatchMatch = studentBatch.endsWith(selectedBatch) || studentBatch.includes(selectedBatch);
       return isDeptMatch && isBatchMatch;
    });

    const deptSubjectStats: Record<string, { total: number, passed: number }> = {}; 
    const specificGradeCounts: Record<string, number> = {}; 
    
    const improvableList: any[] = [];
    const atRiskList: any[] = [];
    
    let statsAppeared = 0;
    let statsPassed = 0;
    let totalGradesForPie = 0;

    students.forEach((student: StudentResult) => {
       Object.entries(student.grades || {}).forEach(([subCode, grade]) => {
          if (!deptSubjectStats[subCode]) deptSubjectStats[subCode] = { total: 0, passed: 0 };
          deptSubjectStats[subCode].total++;
          if (!['F', 'FE', 'Absent', 'Withheld'].includes(grade)) {
             deptSubjectStats[subCode].passed++;
          }
       });

       const gradeValues = Object.values(student.grades || {});
       const failedCount = gradeValues.filter(g => ['F', 'FE', 'Absent', 'Withheld'].includes(g)).length;
       const hasWithheld = gradeValues.includes('Withheld'); 
       
       const studentEntry = { registerNo: student.registerNo, failedCount, hasWithheld };

       if (failedCount > 0 && failedCount <= 2) improvableList.push(studentEntry);
       else if (failedCount >= 3) atRiskList.push(studentEntry);

       if (viewSubject) {
          const grade = student.grades[viewSubject];
          if (grade) {
             statsAppeared++; 
             if (!['F', 'FE', 'Absent', 'Withheld'].includes(grade)) statsPassed++;
             specificGradeCounts[grade] = (specificGradeCounts[grade] || 0) + 1;
             totalGradesForPie++;
          }
       } else {
          statsAppeared++; 
          if (gradeValues.length > 0) {
             const hasFail = gradeValues.some(g => ['F', 'FE', 'Absent', 'Withheld'].includes(g));
             if (!hasFail) statsPassed++;
             
             gradeValues.forEach(g => {
                specificGradeCounts[g] = (specificGradeCounts[g] || 0) + 1;
                totalGradesForPie++;
             });
          }
       }
    });

    const potentialPassCount = statsPassed + improvableList.length;
    const projectedPassRate = statsAppeared > 0 ? ((potentialPassCount / statsAppeared) * 100).toFixed(1) : "0.0";

    const gradeOrder = ['S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'P', 'F', 'FE', 'Withheld', 'Absent'];
    const rawPieData = Object.keys(specificGradeCounts).map((g) => ({ grade: g, value: specificGradeCounts[g] }));
    
    rawPieData.sort((a, b) => {
        const idxA = gradeOrder.indexOf(a.grade);
        const idxB = gradeOrder.indexOf(b.grade);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    const pieData = rawPieData.map((item, index) => {
        const percentage = totalGradesForPie > 0 ? ((item.value / totalGradesForPie) * 100).toFixed(1) : "0.0";
        return {
            name: `${item.grade} (${percentage}%)`,
            value: item.value,
            fill: GRADE_COLORS[index % GRADE_COLORS.length]
        };
    });
    
    const barChartData = Object.keys(deptSubjectStats).map(sub => ({
      name: sub,
      passRate: parseFloat(((deptSubjectStats[sub].passed / deptSubjectStats[sub].total) * 100).toFixed(1))
    }));
    barChartData.sort((a, b) => b.passRate - a.passRate); 

    improvableList.sort((a, b) => b.failedCount - a.failedCount);
    atRiskList.sort((a, b) => b.failedCount - a.failedCount);

    return { 
        pieData,
        totalGradesForPie,
        totalAppeared: statsAppeared,
        totalPass: statsPassed, 
        subjectData: barChartData,
        metricLabel: viewSubject ? "Subject Code" : "Subjects",
        metricValue: viewSubject ? viewSubject : Object.keys(deptSubjectStats).length,
        improvableList,
        atRiskList,
        projectedPassRate
    };
  }, [data, viewDept, viewBatch, viewSubject]);

  const availableSubjects = deptSpecificStats ? deptSpecificStats.subjectData.map(s => s.name) : [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setFileName(file.name); 
      setLoading(true);
      try {
        const parsed = await parseResultPDF(file);
        setData(parsed);
        if (parsed.metadata.regularBatch) {
            setViewBatch(parsed.metadata.regularBatch);
        } else {
            setViewBatch("23"); // Default fallback if detection fails
        }
        setViewDept("");    // Clear Department Filter
        setViewSubject(""); // Clear Subject Filter
        setQuestion("");    // Clear any previous AI question
        setAiAnswer("");    // Clear previous AI answer
      } catch (err) {
        alert("Error parsing PDF. Make sure it's a valid KTU result PDF.");
        console.error(err);
      }
      setLoading(false);
    }
  };

// --- HELPER FOR REPORT (UPDATED FOR 2024 SCHEME) ---
  const calculateSGPA = (grades: { [code: string]: string }) => {
    // New Syllabus Grade Points
    const points: { [key: string]: number } = {
        "S": 10, "A+": 9, "A": 8.5, "B+": 8, "B": 7.5,
        "C+": 7, "C": 6.5, "D": 6, "P": 5.5, "PASS": 5.5, // P and Pass are same
        "F": 0, "FE": 0, "Absent": 0, "Withheld": 0, "I": 0
    };
    const validGrades = Object.values(grades).filter(g => points[g] !== undefined);
    if (validGrades.length === 0) return "0.00";
    const sum = validGrades.reduce((acc, g) => acc + (points[g] || 0), 0);
    return (sum / validGrades.length).toFixed(2);
  };

  // --- GENERATE REPORT FUNCTION (FIXED) ---
  const generateCSVReport = () => {
    if (!reportDept || !data) return;

    // 1. Get Full Dept Name
    const fullDeptName = data.metadata.deptMap[reportDept]?.toUpperCase() || reportDept;
    const currentBatch = data.metadata.regularBatch;

    // 2. Filter Students
    const deptStudents = data.students.filter((s: any) => s.dept === reportDept && s.batch === currentBatch);

    if (deptStudents.length === 0) {
        alert("No students found for this department in the regular batch.");
        return;
    }

    // 3. Get All Subjects
    const allSubjects = new Set<string>();
    deptStudents.forEach((s: any) => Object.keys(s.grades).forEach(code => allSubjects.add(code)));
    const subjectList = Array.from(allSubjects).sort();

    const rows: string[] = [];
    
    // --- TABLE 1: MAIN TITLE & STUDENT LIST ---
    rows.push(`DEPT OF ${fullDeptName},,,,,,,,,,,,`);
    rows.push(`UNIVERSITY RESULT ANALYSIS - ${currentBatch} BATCH,,,,,`);
    rows.push(`,,,,,,,,,,,,`); 

    // Columns (include SGPA only for 2024 scheme)
    const includeSGPA = !!(is2024Scheme);
    const headerCols = [`ROLL NO`, ...subjectList, `No.of arrears`, `Remarks`];
    if (includeSGPA) headerCols.push(`SGPA`);
    rows.push(headerCols.join(','));

    // Sort & Add Students
    deptStudents.sort((a: any, b: any) => a.registerNo.localeCompare(b.registerNo));

    deptStudents.forEach((s: any) => {
        const row = [s.registerNo];
        let arrears = 0;
        
        subjectList.forEach(sub => {
            const grade = s.grades[sub] || "-";
            row.push(grade);
            if (['F', 'FE', 'Absent', 'Withheld', 'I'].includes(grade)) arrears++;
        });

        row.push(arrears.toString());
        row.push(arrears === 0 ? "PASSED" : "FAILED");
        if (includeSGPA) {
            row.push(calculateSGPA(s.grades));
        }
        rows.push(row.join(','));
    });

    // Spacer
    rows.push(`,,,,,,,,,,,,`); 
    rows.push(`,,,,,,,,,,,,`); 

    // --- TABLE 2: SUBJECT STATISTICS ---
    rows.push(`SUBJECT WISE ANALYSIS,,,,,,,,,,,,`); // Table Title
    rows.push(`METRIC,${subjectList.join(',')}`); // Header

    const getSubjectStat = (sub: string, type: 'PASS' | 'FAIL' | 'TOTAL' | 'PERCENT') => {
        let pass = 0, fail = 0, total = 0;
        deptStudents.forEach((s: any) => {
            const g = s.grades[sub];
            if (g) {
                total++;
                if (['F', 'FE', 'Absent', 'Withheld', 'I'].includes(g)) fail++;
                else pass++;
            }
        });
        if (type === 'PASS') return pass;
        if (type === 'FAIL') return fail;
        if (type === 'TOTAL') return total;
        if (type === 'PERCENT') return total > 0 ? ((pass / total) * 100).toFixed(2) : "0";
        return 0;
    };

    const statTypes = [
        { label: "NO OF PASS", key: 'PASS' },
        { label: "NO OF FAILURES", key: 'FAIL' },
        { label: "NO OF CANDIDATES", key: 'TOTAL' },
        { label: "PASS PERCENTAGE", key: 'PERCENT' }
    ];

    statTypes.forEach(stat => {
        const row = [stat.label];
        subjectList.forEach(sub => {
            // @ts-ignore
            row.push(getSubjectStat(sub, stat.key));
        });
        rows.push(row.join(','));
    });

    rows.push(`,,,,,,,,,,,,`); 
    rows.push(`,,,,,,,,,,,,`); 

    // --- TABLE 3: GRADE DISTRIBUTION (NEW SYLLABUS) ---
    rows.push(`GRADE WISE ANALYSIS,,,,,,,,,,,,`); // Table Title
    rows.push(`GRADE,${subjectList.join(',')}`); // Header

    // Updated Grade List (S instead of O)
    const gradesToCheck = ["S", "A+", "A", "B+", "B", "C+", "C", "D", "P", "F", "FE", "Absent", "Withheld"];
    
    gradesToCheck.forEach(grade => {
        const row = [`NO OF ${grade} GRADE`];
        subjectList.forEach(sub => {
            const count = deptStudents.filter((s: any) => {
                const g = s.grades[sub];
                // Handle "P" and "Pass" as the same
                if (grade === "P") return g === "P" || g === "PASS" || g === "Pass";
                return g === grade;
            }).length;
            row.push(count.toString());
        });
        rows.push(row.join(','));
    });

    rows.push(`,,,,,,,,,,,,`); 
    rows.push(`,,,,,,,,,,,,`); 

    // --- TABLE 4: SUBJECT CODE AND NAMES ---
    rows.push(`SUBJECT CODE AND NAMES,,,,,,,,,,,,`);
    rows.push(`Subject Code,Subject Name`);
    subjectList.forEach(code => {
        const subjectName = data.metadata.subjectMap?.[code] || code;
        rows.push(`${code},${subjectName}`);
    });
    rows.push(`,,,,,,,,,,,,`);
    rows.push(`,,,,,,,,,,,,`); 

    // --- TABLE 5: FAILURE STATUS ANALYSIS ---
    rows.push(`FAILURE STATUS,,,,,,,,,,,,`); // Table Title
    rows.push(`Category,Count`); // Header

    // Calculate failure distribution
    const failureDistribution: Record<number, number> = {};
    deptStudents.forEach((s: any) => {
        let failCount = 0;
        Object.values(s.grades).forEach((grade: any) => {
            if (['F', 'FE', 'Absent', 'Withheld', 'I'].includes(grade)) failCount++;
        });
        if (failCount > 0) {
            failureDistribution[failCount] = (failureDistribution[failCount] || 0) + 1;
        }
    });

    // Add failure distribution rows (1 to total subjects)
    for (let i = 1; i <= subjectList.length; i++) {
        const count = failureDistribution[i] || 0;
        rows.push(`Failed in ${i} subject${i > 1 ? 's' : ''},${count}`);
    }

    rows.push(`,,,,,,,,,,,,`); 
    rows.push(`,,,,,,,,,,,,`); 

    // --- TABLE 6: SUMMARY STATISTICS ---
    const totalAppeared = deptStudents.length;
    const totalPassed = deptStudents.filter((s: any) => {
        const grades = Object.values(s.grades);
        return !grades.some((g: any) => ['F', 'FE', 'Absent', 'Withheld', 'I'].includes(g));
    }).length;
    const totalFailures = totalAppeared - totalPassed;
    const passPercentage = totalAppeared > 0 ? ((totalPassed / totalAppeared) * 100).toFixed(2) : "0.00";

    rows.push(`Summary Statistics,,,,,,,,,,,,`);
    rows.push(`Metric,Value`);
    rows.push(`No of Passed,${totalPassed}`);
    rows.push(`No of failures,${totalFailures}`);
    rows.push(`Total,${totalAppeared}`);
    rows.push(`Pass percentage,${passPercentage}`);

    // Trigger Download
    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportDept}_Result_Analysis_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowReportModal(false);
  };

  // --- UPDATED: POWERFUL AI CONTEXT GENERATION ---
  const askAI = async () => {
    if (!data) return;
    setIsAiLoading(true);
    setAiAnswer("");

    // 1. Filter students based on current view (Batch + Dept)
    const activeStudents = data.students.filter(s => {
        const isBatchMatch = s.batch === viewBatch;
        const isDeptMatch = viewDept ? s.dept === viewDept : true;
        return isBatchMatch && isDeptMatch;
    });

    // 2. Build rich context object
    const richContext = {
       meta: {
           exam: data.metadata.examName,
           scheme: data.metadata.scheme,
           viewing: `Batch 20${viewBatch} | ${viewDept ? viewDept : "All Departments"}`
       },
       stats: {
           totalStudents: activeStudents.length,
           passedCount: activeStudents.filter(s => s.isPassed).length,
           departmentPerformance: departmentAnalytics.map(d => ({
               dept: d.dept,
               passPercentage: d.passPercentage,
               failures: d.atRisk
           })),
           // Include specific subject stats if viewing a department
           subjectPerformance: deptSpecificStats?.subjectData.map(s => ({
               subject: s.name,
               passRate: s.passRate
           })) || "Select a department to see subject stats"
       },
       // 3. FULL STUDENT LIST (Passes everything to LLM)
       studentRecords: activeStudents.map(s => ({
           id: s.registerNo.length > 3 ? s.registerNo.slice(3) : s.registerNo,
           dept: s.dept,
           status: s.isPassed ? "PASS" : "FAIL",
           grades: s.grades, // Contains exact grades for every subject
           failedSubjects: s.failedSubjects
       }))
    };

    const contextString = JSON.stringify(richContext);
    
    // 4. Detailed System Prompt
    const prompt = `
      You are an expert academic data analyst for KTU (APJ Abdul Kalam Technological University). 
      You are analyzing the result of an exam. 

      DEFINITIONS:
        - "Dept. Health Score": A custom performance metric (0-100) calculated using a weighted point system:
        * Formula: Health Score = (Pass_Percentage * 1.0) + (Improvable_Percentage * 0.5).
        * "Pass Percentage": % of students who passed ALL subjects (contributes full points).
        * "Improvable Percentage": % of students with 1-2 failed subjects (contributes half points).
        * "At Risk Percentage": % of students with 3+ failed subjects (contributes zero points).
        * Purpose: This score rewards high pass rates while also acknowledging departments that keep struggling students out of the "At Risk" category.

      Here is the complete data for the currently selected batch/department in JSON format:
      ${contextString}

      INSTRUCTIONS:
      1. Use the 'studentRecords' list to answer specific questions like "Who got the highest grade?" or "Did Student X pass?".
      2. Use 'stats' for general performance questions.
      3. If asked about a specific subject (e.g., "MAT202"), look at the 'grades' inside 'studentRecords' to calculate counts if needed.
      4. Be concise but precise. If listing students, limit to top 5 unless asked otherwise.
      5. PRIVACY RULE: Refer to students only by their ID (e.g., "24CS030"). Do not mention college names.
      6. User Question: "${question}"
    `;
    
    try {
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Flash handles large context (1M tokens) easily
      const result = await model.generateContent(prompt);
      const response = await result.response;
      setAiAnswer(response.text());
    } catch (error: any) {
      console.error("AI Error:", error);
      setAiAnswer("AI Service Unavailable. Please try again after some time.");
    }
    setIsAiLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-3 mb-2">
                <GraduationCap className="w-8 h-8 text-indigo-600" />
                <h1 className="text-xl font-bold text-slate-800">KTU Result Analyser</h1>
            </div>
            <div className="animate-in fade-in slide-in-from-top-1">
                <p className="text-[10px] md:text-xs font-medium text-slate-500 bg-slate-100 inline-block px-3 py-1 rounded-full border border-slate-200">
                    Developed by Department Of Data Science, IES College Of Engineering, Thrissur.
                </p>
            </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* --- 1. UPLOAD TILE (Always Visible) --- */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 w-full">
          <label className="block text-sm font-medium text-slate-700 mb-2">Upload Result PDF</label>
          <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-3 hover:bg-slate-50 transition cursor-pointer group flex flex-col items-center justify-center min-h-[80px]">
            <input 
              type="file" 
              accept=".pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {fileName ? (
                <div className="flex flex-col items-center text-indigo-600">
                    <FileText className="h-6 w-6 mb-1" />
                    <p className="font-semibold text-sm">{fileName}</p>
                    <p className="text-[10px] text-slate-500">Click to replace file</p>
                </div>
            ) : (
                <div className="text-center pointer-events-none group-hover:scale-105 transition-transform">
                  <Upload className="mx-auto h-6 w-6 text-slate-400 mb-1 group-hover:text-indigo-500" />
                  <p className="text-sm text-slate-600 font-medium">Click to upload result PDF</p>
                </div>
            )}
          </div>
        </div>

        {/* --- DATA VISUALIZATION SECTION --- */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">Analyzing Exam Results...</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             <div className="bg-indigo-900 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row gap-6 md:items-center justify-between">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm hidden md:block">
                        <Building2 className="w-8 h-8 text-indigo-200" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold mb-1 leading-tight text-white">
                            {data.metadata.examName}
                        </h2>
                        <p className="text-indigo-200 text-sm font-medium flex items-center gap-2">
                            <Building2 className="w-4 h-4 md:hidden" />
                            {data.metadata.college}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 bg-white/10 px-5 py-3 rounded-lg backdrop-blur-sm border border-white/10 self-start md:self-center">
                    <GitFork className="w-5 h-5 text-indigo-300" />
                    <div className="text-right">
                        <p className="text-2xl font-bold leading-none">{departmentAnalytics.length}</p>
                        <p className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold">Branches</p>
                    </div>
                </div>
             </div>

             {/* --- SPLIT ACTION TILES --- */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                
                {/* 1. NEW REPORT BUTTON */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-green-600" />
                            Analysis Report
                        </h3>
                        <p className="text-xs text-slate-500">Download Excel-style report</p>
                    </div>
                    <button 
                        onClick={() => setShowReportModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download Report
                    </button>
                </div>

                {/* 2. EXISTING SGPA BUTTON */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Star className="w-4 h-4 text-emerald-500" />
                            SGPA Rank List
                        </h3>
                        <p className="text-xs text-slate-500">Generate Rank list for 2024 Scheme</p>
                    </div>
                    <button 
                        onClick={() => is2024Scheme && setSgpaModalOpen(true)}
                        disabled={!is2024Scheme}
                        className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2 ${
                          is2024Scheme 
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                            : "bg-slate-300 text-slate-500 cursor-not-allowed"
                        }`}
                    >
                        <Star className="w-4 h-4" />
                        {is2024Scheme ? "View SGPA Rank List" : "For 2024 Scheme only"}
                    </button>
                </div>
             </div>

             {/* --- SGPA MODAL --- */}
             {sgpaModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        {/* Header */}
                        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Regular Student SGPA List</h3>
                                <p className="text-xs text-slate-500">Only students who passed all subjects in Batch {detectedBatch}</p>
                            </div>
                            <button onClick={() => setSgpaModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Controls */}
                        <div className="p-5 border-b bg-white flex flex-col sm:flex-row gap-4">
                            <select 
                                value={sgpaDept}
                                onChange={(e) => setSgpaDept(e.target.value)}
                                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="">-- Select Department --</option>
                                {availableDepts.map(d => (
                                    <option key={d} value={d}>{getDeptName(d)}</option>
                                ))}
                            </select>
                            
                            <button 
                                onClick={exportSgpaCSV}
                                disabled={!sgpaDept || sgpaList.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                <Download className="w-4 h-4" />
                                Export CSV
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-0">
                            {sgpaDept ? (
                                sgpaList.length > 0 ? (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th 
                                                    className={`px-5 py-3 cursor-pointer transition select-none ${sortConfig.key === 'registerNo' ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50'}`}
                                                    onClick={() => handleSort('registerNo')}
                                                    title="Click to sort by Register Number"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        Register No
                                                        {sortConfig.key === 'registerNo' ? (
                                                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 text-indigo-500" /> : <ArrowDown className="w-4 h-4 text-indigo-500" />
                                                        ) : (
                                                            <ArrowUpDown className="w-4 h-4 text-slate-300" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th 
                                                    className={`px-5 py-3 text-right cursor-pointer transition select-none ${sortConfig.key === 'sgpa' ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50'}`}
                                                    onClick={() => handleSort('sgpa')}
                                                    title="Click to sort by SGPA"
                                                >
                                                    <div className="flex items-center justify-end gap-2">
                                                        SGPA
                                                        {sortConfig.key === 'sgpa' ? (
                                                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4 text-emerald-500" /> : <ArrowDown className="w-4 h-4 text-emerald-500" />
                                                        ) : (
                                                            <ArrowUpDown className="w-4 h-4 text-slate-300" />
                                                        )}
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {sgpaList.map((s: any) => (
                                                <tr key={s.registerNo} className="hover:bg-slate-50">
                                                    <td className="px-5 py-3 font-mono text-slate-700">{s.registerNo}</td>
                                                    <td className="px-5 py-3 text-right font-bold text-emerald-600">{s.sgpa}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-10 text-center text-slate-400">
                                        No passed students found in this department. (Or credits data missing)
                                    </div>
                                )
                            ) : (
                                <div className="p-10 text-center text-slate-400">
                                    Please select a department to view the list.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
             )}

             {/* --- NEW REPORT MODAL --- */}
             {showReportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-green-600" />
                                Download Report
                            </h3>
                            <button onClick={() => setShowReportModal(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-4">Select a department to generate the detailed CSV analysis report.</p>
                        <p className="text-sm font-bold text-slate-600 mb-4">SGPA COLUMN WILL BE THERE FOR 2024 SCHEME ONLY</p>


                        <select 
                            value={reportDept}
                            onChange={(e) => setReportDept(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none mb-6"
                        >
                            <option value="">-- Select Department --</option>
                            {availableDepts.map(d => (
                                <option key={d} value={d}>{getDeptName(d)}</option>
                            ))}
                        </select>

                        <button 
                            onClick={generateCSVReport}
                            disabled={!reportDept}
                            className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download CSV Report
                        </button>
                    </div>
                </div>
             )}

             <FilterBar 
               batches={['25', '24', '23', '22', '21']}
               departments={availableDepts}
               subjects={availableSubjects}
               selectedBatch={viewBatch}
               setSelectedBatch={setViewBatch}
               selectedDept={viewDept}
               setSelectedDept={setViewDept}
               selectedSubject={viewSubject}
               setSelectedSubject={setViewSubject}
               deptMap={data.metadata.deptMap}
               subjectMap={data.metadata.subjectMap}
             />

            {!viewDept ? (
                // --- GENERAL DASHBOARD (ALL DEPTS) ---
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard 
                        label="Total Regular Students" 
                        value={globalStats.totalRegular} 
                        color="blue" 
                        subtext={`${globalStats.totalRegularPassed} Passed • Batch ${formatBatch(detectedBatch)}`}
                    />
                    <StatCard 
                        label="Total Non Regular Students" 
                        value={globalStats.totalSupply} 
                        color="orange" 
                        subtext={`${globalStats.totalSupplyPassed} Passed • Others`}
                    />
                    <StatCard 
                        label={`Students in Batch ${formatBatch(viewBatch)}`} 
                        value={viewStats.totalAppeared} 
                        color="indigo" 
                        subtext={`${viewStats.totalPassed} Passed • ${viewStats.type}`}
                        highlight
                    />
                    <StatCard 
                        label={`Batch ${formatBatch(viewBatch)} Pass %`} 
                        value={`${viewStats.passPercentage}%`} 
                        color={parseFloat(viewStats.passPercentage) > 50 ? "green" : "red"} 
                        subtext={parseFloat(viewStats.passPercentage) > 50 ? "Good Performance" : "Needs Improvement"}
                        highlight
                    />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-6 text-slate-800">
                            Department Pass % <span className="text-sm font-normal text-slate-400 ml-2">(Batch {formatBatch(viewBatch)})</span>
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={departmentAnalytics} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="dept" type="category" width={50} tick={{fill: '#475569', fontWeight: 500}} />
                            {/* UPDATED: Pass Maps to Tooltip */}
                            <Tooltip content={<CustomTooltip type="pass" deptMap={data.metadata.deptMap} subjectMap={data.metadata.subjectMap} />} cursor={{fill: 'transparent'}} />
                            <Bar 
                                dataKey="passPercentage" 
                                radius={[0, 4, 4, 0]} 
                                barSize={32} 
                                label={<CustomBarLabel />}
                            >
                                {departmentAnalytics.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={stringToColor(entry.dept)} />
                                ))}
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="mb-6">
                            <h3 className="font-bold text-lg text-slate-800">
                                Dept. Health Score <span className="text-sm font-normal text-slate-400 ml-2">(Batch {formatBatch(viewBatch)})</span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <BrainCircuit className="w-3 h-3 text-indigo-500" />
                                Ask our AI Chatbot below to know how this is calculated.
                            </p>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={departmentAnalytics} margin={{ bottom: 20 }}>
                            <XAxis dataKey="dept" tick={{fill: '#475569', fontWeight: 500}} />
                            <YAxis domain={[0, 100]} hide />
                            <Tooltip content={<CustomTooltip type="health" deptMap={data.metadata.deptMap} subjectMap={data.metadata.subjectMap} />} cursor={{fill: 'transparent'}} />
                            <Bar dataKey="healthScore" radius={[4, 4, 0, 0]} barSize={40} label={{ position: 'top', fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}>
                                {departmentAnalytics.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={stringToColor(entry.dept)} />
                                ))}
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Detailed Analysis</h3>
                            <span className="text-xs font-mono px-2 py-1 bg-white rounded border">Viewing: Batch {formatBatch(viewBatch)}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                                <tr>
                                <th className="p-4">Dept</th>
                                <th className="p-4">Appeared</th>
                                <th className="p-4">Pass %</th>
                                <th className="p-4 text-red-600">At Risk (&gt;3 Fails)</th>
                                <th className="p-4 text-orange-600">Improvable (1-2 Fails)</th>
                                <th className="p-4">Health Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {departmentAnalytics.map((dept: any) => (
                                <tr key={dept.dept} className="hover:bg-slate-50 transition">
                                    <td className="p-4 font-bold text-slate-800">
                                        <div className="flex flex-col">
                                            <span>{getDeptName(dept.dept)}</span>
                                            <span className="text-xs text-slate-400 font-normal" style={{ color: stringToColor(dept.dept) }}>{dept.dept}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-500">{dept.totalAppeared}</td>
                                    <td className="p-4">
                                        <span className={`font-bold ${parseFloat(dept.passPercentage) < 50 ? 'text-red-500' : 'text-slate-700'}`}>
                                            {dept.passPercentage}%
                                        </span>
                                    </td>
                                    <td className="p-4 text-red-600 font-medium">{dept.atRisk}</td>
                                    <td className="p-4 text-orange-600 font-medium">{dept.improvable}</td>
                                    <td className="p-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm ${Number(dept.healthScore) > 75 ? 'bg-green-500' : Number(dept.healthScore) > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                        {dept.healthScore}
                                    </span>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                // --- VIEW B: SPECIFIC DEPARTMENT DASHBOARD ---
                <div className="space-y-6 animate-in fade-in">
                    
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center text-indigo-900">
                        <div>
                            Showing analysis for: <span className="font-bold">{getDeptName(viewDept)}</span>
                            {viewSubject && <span className="text-indigo-600"> | Subject: {getSubjectName(viewSubject)}</span>}
                        </div>
                        <button onClick={() => setViewDept("")} className="text-xs underline text-indigo-500 hover:text-indigo-700">Clear Filter</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard 
                            label="Total Appeared" 
                            value={deptSpecificStats?.totalAppeared || 0} 
                            color="blue" 
                            subtext={viewSubject ? "This Subject" : `Batch ${formatBatch(viewBatch)}`}
                        />
                         <StatCard 
                            label="Total Passed" 
                            value={deptSpecificStats?.totalPass || 0} 
                            color="green" 
                        />
                         <StatCard 
                            label="Pass Rate" 
                            value={`${deptSpecificStats && deptSpecificStats.totalAppeared > 0 ? ((deptSpecificStats.totalPass / deptSpecificStats.totalAppeared) * 100).toFixed(1) : 0}%`}
                            color={deptSpecificStats && ((deptSpecificStats.totalPass / deptSpecificStats.totalAppeared) > 0.5) ? "green" : "red"} 
                        />
                        <StatCard 
                            label={deptSpecificStats?.metricLabel || "Subjects"} 
                            value={deptSpecificStats?.metricValue || 0} 
                            color="indigo" 
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pie Chart: Grade Distribution */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4">Grade Distribution {viewSubject && `(${viewSubject})`}</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie 
                                        data={deptSpecificStats?.pieData} 
                                        dataKey="value" 
                                        nameKey="name" 
                                        cx="50%" 
                                        cy="50%" 
                                        outerRadius={100} 
                                        innerRadius={0}
                                        paddingAngle={1}
                                    >
                                        {deptSpecificStats?.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        content={
                                            <CustomPieTooltip 
                                                totalStudents={deptSpecificStats?.totalGradesForPie || 1} 
                                                subjectTitle={viewSubject ? `${getSubjectName(viewSubject)}` : `${getDeptName(viewDept)} Overview`}
                                            />
                                        } 
                                    />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Bar Chart: Subject Wise Pass % */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <h3 className="font-bold text-slate-800 mb-4">Subject-wise Performance (Pass %)</h3>
                            <ResponsiveContainer width="100%" height={deptSpecificStats ? deptSpecificStats.subjectData.length * 50 : 300} maxHeight={500}>
                                <BarChart data={deptSpecificStats?.subjectData} layout="vertical" margin={{ left: 50, right: 20 }}>
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fontWeight: 500}} interval={0} />
                                    {/* UPDATED: Pass Maps to Tooltip */}
                                    <Tooltip content={<CustomTooltip type="pass" deptMap={data.metadata.deptMap} subjectMap={data.metadata.subjectMap} />} cursor={{fill: 'transparent'}} />
                                    <Bar 
                                        dataKey="passRate" 
                                        radius={[0, 4, 4, 0]} 
                                        barSize={32} 
                                        label={<CustomBarLabel />}
                                    >
                                        {deptSpecificStats?.subjectData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.passRate > 50 ? "#10b981" : "#ef4444"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* --- NEW: Health & Projection Tile --- */}
                    {!viewSubject && deptSpecificStats && (
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-md p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-2">
                         {/* Left: Health Score */}
                         <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                               <Activity className="w-8 h-8 text-white" />
                            </div>
                            <div>
                               <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider">Dept. Health Score</p>
                               <p className="text-4xl font-bold">{currentDeptHealth}</p>
                            </div>
                         </div>

                         {/* Divider (Mobile hidden) */}
                         <div className="hidden md:block w-px h-12 bg-indigo-400/50"></div>

                         {/* Right: Projection */}
                         <div className="flex-1">
                            <div className="flex items-start gap-3">
                               <Lightbulb className="w-6 h-6 text-yellow-300 mt-1 flex-shrink-0" />
                               <div>
                                  <h4 className="font-bold text-lg">Potential Growth</h4>
                                  <p className="text-indigo-100 leading-relaxed text-sm">
                                     If the <span className="font-bold text-white border-b border-indigo-300">{deptSpecificStats.improvableList.length} improvable students</span> clear their subjects, 
                                     this department's pass percentage would rise from <span className="font-bold bg-white/10 px-1 rounded">{((deptSpecificStats.totalPass/deptSpecificStats.totalAppeared)*100).toFixed(1)}%</span> to <span className="font-bold text-green-300 text-lg ml-1">{deptSpecificStats.projectedPassRate}%</span>.
                                  </p>
                               </div>
                            </div>
                         </div>
                      </div>
                    )}

                    {/* --- NEW: IMPROVABLE & AT RISK STUDENTS (Only visible if no specific subject selected) --- */}
                    {!viewSubject && deptSpecificStats && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-3">
                        
                        <StudentListTile 
                          title="Improvable (1-2 Failed Subjects)"
                          students={deptSpecificStats.improvableList}
                          color="orange"
                          icon={TrendingUp}
                        />

                        <StudentListTile 
                          title="At Risk (>3 Failed Subjects)"
                          students={deptSpecificStats.atRiskList}
                          color="red"
                          icon={AlertTriangle}
                        />

                      </div>
                    )}

                </div>
            )}

            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl shadow-lg p-6 text-white relative overflow-hidden mt-8">
               <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                   <BrainCircuit className="w-32 h-32" />
               </div>
               
               <div className="relative z-10">
                   <div className="flex items-center gap-2 mb-2">
                     <BrainCircuit className="w-6 h-6 text-indigo-200" />
                     <h3 className="text-xl font-bold">AI Assistant</h3>
                   </div>
                   <p className="mb-6 text-indigo-100 text-sm opacity-90 max-w-2xl">
                       Context: <strong>Batch {formatBatch(viewBatch)} {viewDept ? `| Dept: ${getDeptName(viewDept)}` : ''}</strong>. 
                       Ask questions like "Which subject has the lowest pass rate?" or "Compare {getDeptName(viewDept) || 'CS'} performance with others."
                   </p>
                   <div className="flex gap-2 mb-4">
                     <input 
                       className="flex-1 p-3 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-slate-400 shadow-inner"
                       placeholder="Type your question here..."
                       value={question}
                       onChange={(e) => setQuestion(e.target.value)}
                       onKeyPress={(e) => e.key === 'Enter' && askAI()}
                     />
                     <button 
                       onClick={askAI}
                       disabled={isAiLoading}
                       className="bg-white text-indigo-700 font-bold py-2 px-6 rounded-lg hover:bg-indigo-50 transition disabled:opacity-50 shadow-md flex items-center gap-2"
                     >
                       {isAiLoading ? (
                         <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-700"></span>
                       ) : "Ask"}
                     </button>
                   </div>
                   <div className="flex items-center gap-1.5 text-[10px] text-indigo-200 bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                       <ShieldCheck className="w-3 h-3 text-green-300" />
                       <span>
                            <strong>Privacy First:</strong> Student data is processed locally. Only anonymous department statistics are analyzed by AI.
                       </span>
                   </div>
                   {aiAnswer && (
                        <div className="mt-6 bg-white/10 rounded-lg p-4 border border-white/20 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 shadow-inner text-indigo-50">
                            <div className="prose prose-sm prose-invert max-w-none">
                                <ReactMarkdown>{aiAnswer}</ReactMarkdown>
                            </div>
                        </div>
                    )}
               </div>
            </div>

          </div>
        )}

        {/* --- NEW: PROJECT & SUPPORT TILE (Always Visible) --- */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 mt-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                    <Activity className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">Project & Support</h3>
                    <p className="text-slate-500 text-xs">Learn more about this tool or share your feedback</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    onClick={() => setAboutModalOpen(true)}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition group"
                >
                    <Info className="w-8 h-8 text-indigo-500 mb-3 group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-slate-800">About Project</h4>
                    <p className="text-xs text-slate-500 text-center mt-1">Developers & Info</p>
                </button>

                <button 
                    onClick={() => setFeedbackModalOpen(true)}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition group"
                >
                    <MessageSquare className="w-8 h-8 text-emerald-500 mb-3 group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-slate-800">Feedback & Support</h4>
                    <p className="text-xs text-slate-500 text-center mt-1">Report bugs or request features</p>
                </button>
            </div>
        </div>

        {/* --- ABOUT MODAL --- */}
        {aboutModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="p-5 border-b bg-indigo-900 text-white flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold">About KTU Result Analyser</h3>
                            <p className="text-xs text-indigo-200">Developed by Department of Data Science, IES College of Engineering</p>
                        </div>
                        <button onClick={() => setAboutModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        <p className="text-slate-600 text-sm leading-relaxed mb-6">
                            The KTU Result Analyser is an academic intelligence tool designed to streamline result analysis by instantly transforming official KTU result PDFs into actionable insights, grade distribution charts, and automated SGPA calculations. Built with a modern React tech stack for secure local processing, and is integrated with AI Data Analyst powered by Google's Gemini models. This context-aware assistant acts as an expert academic consultant, allowing users to ask complex questions about subject performance and student trends while ensuring strict data privacy through anonymized processing.
                        </p>
                        
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-500" />
                            Development Team
                        </h4>
                        
                        <div className="space-y-3">
                            {/* Developer 1 */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Avin P S</p>
                                    <p className="text-xs text-slate-500">Lead Developer</p>
                                </div>
                                <div className="flex gap-2">
                                    <a href="#" className="p-1.5 text-slate-400 hover:text-slate-800 transition"><Github className="w-4 h-4" /></a>
                                    <a href="#" className="p-1.5 text-slate-400 hover:text-indigo-600 transition"><Globe className="w-4 h-4" /></a>
                                </div>
                            </div>

                            {/* Developer 2 */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Clevin Saji</p>
                                    <p className="text-xs text-slate-500">UI/UX Design & Data Collection</p>
                                </div>
                                <div className="flex gap-2">
                                    <a href="#" className="p-1.5 text-slate-400 hover:text-slate-800 transition"><Github className="w-4 h-4" /></a>
                                    <a href="#" className="p-1.5 text-slate-400 hover:text-indigo-600 transition"><Globe className="w-4 h-4" /></a>
                                </div>
                            </div>
                            {/* Project Guide */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Mrs Santhi P</p>
                                    <p className="text-xs text-slate-500">Project Guide</p>
                                    <p className="text-xs text-slate-500">HOD, Dept of CSE Data Science, IESCE, Thrissur</p>
                                </div>
                                <div className="flex gap-2">
                                    <a href="#" className="p-1.5 text-slate-400 hover:text-indigo-600 transition"><Globe className="w-4 h-4" /></a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- FEEDBACK MODAL --- */}
        {feedbackModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col h-[85vh]">
                    <div className="p-5 border-b bg-slate-900 text-white flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="text-lg font-bold">Feedback & Support</h3>
                            <p className="text-xs text-slate-300">We'd love to hear from you</p>
                        </div>
                        <button onClick={() => setFeedbackModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto bg-slate-50">
                        {/* Guidance Text */}
                        <div className="bg-slate-900 text-slate-200 px-6 pb-6 pt-2 text-sm leading-relaxed">
                            <p className="mb-3 font-medium text-white">We value your feedback and invite you to help us improve the platform. Please feel free to report any bugs you encounter, suggest new features, share your thoughts on the design and user experience, or identify areas where website performance can be optimized.</p>
                        </div>

                        {/* Google Form */}
                        <div className="w-full h-full min-h-[500px]">
                            <iframe 
                                src="https://docs.google.com/forms/d/e/1FAIpQLSeA0PP7AyQhvPW6F8dtj1BgQgdEDtuZ1cLZtDMJUdRX0-zYQA/viewform?embedded=true" 
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                marginHeight={0} 
                                marginWidth={0}
                                title="Feedback Form"
                                className="w-full h-full bg-slate-50"
                            >
                                Loading Feedback Form...
                            </iframe>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

const StatCard = ({ label, value, color, subtext, highlight = false }: any) => {
  const colorClasses: any = {
    blue: "border-l-blue-500 text-blue-600 bg-blue-50/50",
    green: "border-l-green-500 text-green-600 bg-green-50/50",
    indigo: "border-l-indigo-500 text-indigo-600 bg-indigo-50/50",
    orange: "border-l-orange-500 text-orange-600 bg-orange-50/50",
    red: "border-l-red-500 text-red-600 bg-red-50/50",
  };
  return (
    <div className={`p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 ${colorClasses[color]} transition hover:shadow-md ${highlight ? 'ring-2 ring-offset-2 ring-indigo-100' : ''}`}>
      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 opacity-80">{label}</h3>
      <div className="flex items-end justify-between">
          <p className="text-3xl font-bold text-slate-800">{value}</p>
          {subtext && <span className="text-xs font-medium bg-white/50 px-2 py-1 rounded text-slate-500">{subtext}</span>}
      </div>
    </div>
  );
}

export default FacultyDashboard;