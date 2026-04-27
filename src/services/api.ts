// src/services/api.ts
// Single source of truth for all backend API calls.
// Pages import from here — never call fetch() directly.

import type { AnalyzeResponse, PreviewResponse, WhatIfResponse } from '../types/analysis';

const BASE = '/api';

/** Preview CSV columns + first 5 rows without running full analysis */
export async function previewCSV(file: File): Promise<PreviewResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/preview`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Preview failed' }));
    throw new Error(err.detail ?? 'Preview failed');
  }
  return res.json();
}

/** Run full bias analysis on a CSV file */
export async function analyzeDataset(
  file: File,
  targetColumn: string,
  sensitiveColumns: string[],
  domain = 'general'
): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append('file', file);
  form.append('target_column', targetColumn);
  form.append('sensitive_columns', sensitiveColumns.join(','));
  form.append('domain', domain);
  const res = await fetch(`${BASE}/analyze`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail ?? 'Analysis failed');
  }
  return res.json();
}

/** Counterfactual: change one feature value and re-run analysis */
export async function runWhatIf(
  file: File,
  targetColumn: string,
  sensitiveColumns: string[],
  changedFeature: string,
  originalValue: string,
  newValue: string
): Promise<WhatIfResponse> {
  const form = new FormData();
  form.append('file', file);
  form.append('target_column', targetColumn);
  form.append('sensitive_columns', sensitiveColumns.join(','));
  form.append('changed_feature', changedFeature);
  form.append('original_value', originalValue);
  form.append('new_value', newValue);
  const res = await fetch(`${BASE}/whatif`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'What-If analysis failed' }));
    throw new Error(err.detail ?? 'What-If analysis failed');
  }
  return res.json();
}

/** Run analysis and download PDF report as a Blob */
export async function exportReport(
  file: File,
  targetColumn: string,
  sensitiveColumns: string[],
  domain = 'general'
): Promise<Blob> {
  const form = new FormData();
  form.append('file', file);
  form.append('target_column', targetColumn);
  form.append('sensitive_columns', sensitiveColumns.join(','));
  form.append('domain', domain);
  const res = await fetch(`${BASE}/export-report`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Report generation failed');
  return res.blob();
}

/** Trigger browser download from a Blob */
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Health check — returns true if backend is reachable */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
