# KTU Result Analyser & AI Assistant

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Tech Stack](https://img.shields.io/badge/Stack-React_|_TypeScript_|_Vite-blue)
![Deployment](https://img.shields.io/badge/Deployed_on-Vercel-black)
![License](https://img.shields.io/badge/License-All_Rights_Reserved-red)

**An intelligent academic intelligence tool designed to streamline the analysis of APJ Abdul Kalam Technological University (KTU) exam results.**

**Visit Project:** https://ktu-result-analyzer.vercel.app/

This application instantly transforms complex official result PDFs into actionable insights, visual charts, and automated reports. It features an integrated **AI Data Analyst** (powered by Google Gemini) that allows faculty to ask natural language questions about student performance.

## Key Features

### **Instant PDF Analysis**
* **Local Processing:** Upload official KTU result PDFs. Data is parsed locally in the browser for maximum privacy.
* **Batch & Dept Filtering:** Automatically detects batches and departments. Filter data by Batch, Department, or specific Subjects.

### **Advanced Visualizations**
* **Performance Charts:** Interactive Bar charts for Department-wise Pass % and Health Scores.
* **Grade Distribution:** Pie charts showing the distribution of grades (S, A+, A, etc.) for specific subjects or departments.
* **At-Risk Identification:** Automatically categorizes students into:
    * **Improvable:** 1-2 failed subjects.
    * **At Risk:** 3+ failed subjects.

### **AI Academic Assistant**
* **Context-Aware Chat:** Ask questions like *"Who is the topper in CS?"* or *"Which subject has the lowest pass rate?"*.
* **Multi-Model Support:** Integrated with **Groq SDK (Llama 3)** and **Google Gemini** for fast and accurate insights.

### **Automated Reporting**
* **Detailed CSV Reports:** Generate comprehensive Excel-ready CSV reports including:
    * Student Rank List.
    * Subject-wise Statistics (Pass/Fail counts).
    * Grade Analysis (Count of S, A+, Withheld, etc.).
* **SGPA Calculation:** Automatic SGPA calculation for the 2019/2024 schemes.
* **Topper List:** One-click download of the SGPA rank list sorted by performance.


## Tech Stack

### **Frontend Framework**
* ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) **React.js** - UI Library.
* ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white) **TypeScript** - Type safety and logic.
* ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white) **Vite** - High-speed build tool.

### **Styling & Components**
* ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white) **Tailwind CSS** - Utility-first styling.
* **Lucide React** - Beautiful, consistent icons.

### **Data & AI**
* **PDF.js (pdfjs-dist)** - Parsing raw text from PDF files.
* **Recharts** - Data visualization library for React.
* **Google Generative AI** - Interface for Gemini models.


## 📂 Project Structure

```bash
src/
├── components/
│   ├── FacultyDashboard.tsx   # Main Dashboard Logic & UI
│   ├── FilterBar.tsx          # Filtering Logic (Batch/Dept)
│   └── ...
├── hooks/
│   └── useAnalytics.ts        # Custom hook for calculating stats
├── utils/
│   └── pdfParser.ts           # PDF Parsing Logic (Regex & PDF.js)
├── App.tsx
└── main.tsx
```
## Development Team
Developed by the Department of Data Science, IES College of Engineering, Thrissur.

**Avin P S** - Lead Developer

**Clevin Saji** - UI/UX Design & Data Collection

**Mrs. Santhi P** - Project Guide - HOD, Dept of CSE (Data Science)
Push to the branch (git push origin feature/AmazingFeature).

All Rights Reserved.