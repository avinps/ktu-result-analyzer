import React from 'react';
import { Filter } from 'lucide-react';

interface FilterBarProps {
  batches: string[];
  departments: string[];
  subjects: string[];
  selectedBatch: string;
  setSelectedBatch: (val: string) => void;
  selectedDept: string;
  setSelectedDept: (val: string) => void;
  selectedSubject: string;
  setSelectedSubject: (val: string) => void;
  deptMap?: { [key: string]: string }; 
  subjectMap?: { [key: string]: string };
}

export const FilterBar: React.FC<FilterBarProps> = ({ 
  batches, departments, subjects, 
  selectedBatch, setSelectedBatch,
  selectedDept, setSelectedDept,
  selectedSubject, setSelectedSubject,
  deptMap = {},
  subjectMap = {} 
}) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Left Side: Label */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
          <Filter className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Filter Analytics</h3>
          <p className="text-xs text-slate-500">Drill down by Year, Dept & Subject</p>
        </div>
      </div>

      {/* Right Side: Selectors */}
      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        
        {/* Batch Selector */}
        <select 
          value={selectedBatch} 
          onChange={(e) => setSelectedBatch(e.target.value)}
          className="appearance-none border border-slate-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700"
        >
          {batches.map(b => <option key={b} value={b}>Batch 20{b}</option>)}
        </select>

        {/* Dept Selector */}
        <select 
          value={selectedDept}
          onChange={(e) => {
             setSelectedDept(e.target.value);
             setSelectedSubject(""); 
          }}
          className="appearance-none border border-slate-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700 max-w-[300px]"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d} value={d}>
                {deptMap[d] ? `${d} - ${deptMap[d]}` : d}
            </option>
          ))}
        </select>

        {/* Subject Selector */}
        <select 
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          disabled={!selectedDept}
          className={`appearance-none border border-slate-300 rounded-lg px-4 py-2 outline-none text-sm font-medium transition-colors max-w-[300px] ${
            !selectedDept ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500'
          }`}
        >
          <option value="">All Subjects</option>
          {subjects.map(s => (
            // Show Full Subject Name
            <option key={s} value={s}>
                {subjectMap[s] ? `${s} - ${subjectMap[s]}` : s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};