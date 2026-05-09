// src/context/AnalysisContext.tsx
// Shared state across all app pages — avoids prop-drilling.
// Stores: uploaded file, column selections, preview columns, analysis result.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AnalyzeResponse } from '../types/analysis';

const STORAGE_KEY = 'parity.analysis.session.v1';

interface PersistedAnalysisState {
  targetColumn: string;
  sensitiveColumns: string[];
  domain: string;
  availableColumns: string[];
  analysisResult: AnalyzeResponse | null;
  demoDatasetFile: string | null;
}

function readPersistedState(): Partial<PersistedAnalysisState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<PersistedAnalysisState>;
    return {
      targetColumn: typeof parsed.targetColumn === 'string' ? parsed.targetColumn : '',
      sensitiveColumns: Array.isArray(parsed.sensitiveColumns) ? parsed.sensitiveColumns.filter((value): value is string => typeof value === 'string') : [],
      domain: typeof parsed.domain === 'string' ? parsed.domain : 'general',
      availableColumns: Array.isArray(parsed.availableColumns) ? parsed.availableColumns.filter((value): value is string => typeof value === 'string') : [],
      analysisResult: parsed.analysisResult ?? null,
      demoDatasetFile: typeof parsed.demoDatasetFile === 'string' ? parsed.demoDatasetFile : null,
    };
  } catch {
    return {};
  }
}

interface AnalysisState {
  // The original File object — kept in memory and re-sent on every API call
  file: File | null;
  setFile: (f: File | null) => void;
  demoDatasetFile: string | null;
  setDemoDatasetFile: (file: string | null) => void;

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
  const persisted = readPersistedState();
  const [file, setFile] = useState<File | null>(null);
  const [demoDatasetFile, setDemoDatasetFile] = useState<string | null>(persisted.demoDatasetFile ?? null);
  const [targetColumn, setTargetColumn] = useState(persisted.targetColumn ?? '');
  const [sensitiveColumns, setSensitiveColumns] = useState<string[]>(persisted.sensitiveColumns ?? []);
  const [domain, setDomain] = useState(persisted.domain ?? 'general');
  const [availableColumns, setAvailableColumns] = useState<string[]>(persisted.availableColumns ?? []);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(persisted.analysisResult ?? null);

  const reset = () => {
    setFile(null);
    setDemoDatasetFile(null);
    setTargetColumn('');
    setSensitiveColumns([]);
    setDomain('general');
    setAvailableColumns([]);
    setAnalysisResult(null);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          targetColumn,
          sensitiveColumns,
          domain,
          availableColumns,
          analysisResult,
          demoDatasetFile,
        } satisfies PersistedAnalysisState)
      );
    } catch {
      // Ignore storage failures; the app still works without persistence.
    }
  }, [targetColumn, sensitiveColumns, domain, availableColumns, analysisResult, demoDatasetFile]);

  useEffect(() => {
    if (!demoDatasetFile || file) return;
    let cancelled = false;

    async function hydrateDemoFile() {
      try {
        const res = await fetch(`/datasets/${demoDatasetFile}`);
        if (!res.ok) return;
        const blob = await res.blob();
        if (cancelled) return;
        setFile(new File([blob], demoDatasetFile, { type: 'text/csv' }));
      } catch {
        // Leave file null; the saved summary/selections remain recoverable.
      }
    }

    void hydrateDemoFile();
    return () => {
      cancelled = true;
    };
  }, [demoDatasetFile, file]);

  return (
    <AnalysisContext.Provider
      value={{
        file, setFile,
        demoDatasetFile, setDemoDatasetFile,
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
