// src/context/AnalysisContext.tsx
// Shared state across all app pages — avoids prop-drilling.
// Stores: uploaded file, column selections, preview columns, analysis result.

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AnalyzeResponse } from '../types/analysis';

interface AnalysisState {
  // The original File object — kept in memory and re-sent on every API call
  file: File | null;
  setFile: (f: File | null) => void;

  // Column selections set on UploadPage
  targetColumn: string;
  setTargetColumn: (s: string) => void;
  sensitiveColumns: string[];
  setSensitiveColumns: (s: string[]) => void;
  domain: string;
  setDomain: (s: string) => void;

  // All column names from /api/preview — shared with WhatIfExplorer
  availableColumns: string[];
  setAvailableColumns: (cols: string[]) => void;

  // The analysis result from /api/analyze
  analysisResult: AnalyzeResponse | null;
  setAnalysisResult: (r: AnalyzeResponse | null) => void;

  // Clear all state (e.g. when starting a new analysis)
  reset: () => void;
}

const AnalysisContext = createContext<AnalysisState | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [sensitiveColumns, setSensitiveColumns] = useState<string[]>([]);
  const [domain, setDomain] = useState('general');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);

  const reset = () => {
    setFile(null);
    setTargetColumn('');
    setSensitiveColumns([]);
    setDomain('general');
    setAvailableColumns([]);
    setAnalysisResult(null);
  };

  return (
    <AnalysisContext.Provider
      value={{
        file, setFile,
        targetColumn, setTargetColumn,
        sensitiveColumns, setSensitiveColumns,
        domain, setDomain,
        availableColumns, setAvailableColumns,
        analysisResult, setAnalysisResult,
        reset,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis(): AnalysisState {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used inside <AnalysisProvider>');
  return ctx;
}
