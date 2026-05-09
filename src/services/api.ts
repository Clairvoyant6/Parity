// src/services/api.ts
// Single source of truth for all backend API calls.
// Pages import from here — never call fetch() directly.

import type {
  AnalyzeResponse,
  DemoDatasetCatalogItem,
  DemoDatasetCatalogResponse,
  PreviewResponse,
  WhatIfResponse,
} from '../types/analysis';

const BASE = '/api';
const DEMO_DATASET_BASE = '/datasets';

const DEFAULT_DEMO_DATASETS: DemoDatasetCatalogItem[] = [
  {
    name: 'COMPAS Recidivism',
    description: 'Criminal justice risk scores with known racial disparity patterns.',
    domain: 'criminal_justice',
    file: 'compas-scores-two-years.csv',
    suggested_target: 'two_year_recid',
    suggested_sensitive: ['race', 'sex'],
  },
  {
    name: 'Adult Income',
    description: 'Census income prediction dataset for hiring and access audits.',
    domain: 'hiring',
    file: 'adult-income.csv',
    suggested_target: 'income_over_50k',
    suggested_sensitive: ['sex', 'race'],
  },
  {
    name: 'German Credit',
    description: 'Loan approval dataset for credit-risk fairness checks.',
    domain: 'lending',
    file: 'german-credit.csv',
    suggested_target: 'approved',
    suggested_sensitive: ['foreign_worker', 'age_group'],
  },
  {
    name: 'Heart Disease',
    description: 'Healthcare risk scoring dataset with demographic attributes.',
    domain: 'healthcare',
    file: 'heart-disease.csv',
    suggested_target: 'high_risk',
    suggested_sensitive: ['sex', 'age'],
  },
  {
    name: 'Student Performance',
    description: 'Education outcome dataset for socioeconomic fairness checks.',
    domain: 'education',
    file: 'student-performance.csv',
    suggested_target: 'passed',
    suggested_sensitive: ['socioeconomic_status'],
  },
];

function normalizeSensitiveColumns(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeCatalogEntry(entry: DemoDatasetCatalogResponse['datasets'][number]): DemoDatasetCatalogItem {
  const file = entry.file ?? entry.filename;
  const suggestedTarget = entry.suggested_target ?? entry.suggested_target_column;
  const suggestedSensitive = entry.suggested_sensitive ?? entry.suggested_sensitive_columns;

  return {
    name: entry.name,
    description: entry.description,
    domain: entry.domain,
    file: file ?? '',
    suggested_target: suggestedTarget,
    suggested_sensitive: normalizeSensitiveColumns(suggestedSensitive),
  };
}

function mergeCatalogEntries(entries: DemoDatasetCatalogItem[]): DemoDatasetCatalogItem[] {
  const map = new Map<string, DemoDatasetCatalogItem>();
  for (const item of DEFAULT_DEMO_DATASETS) {
    map.set(item.file, item);
  }
  for (const item of entries) {
    if (item.file) {
      map.set(item.file, { ...map.get(item.file), ...item });
    }
  }
  return Array.from(map.values());
}

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

/** Fetch demo dataset catalog from the backend, with local fallback metadata. */
export async function fetchDemoDatasetCatalog(): Promise<DemoDatasetCatalogItem[]> {
  try {
    const res = await fetch(`${BASE}/datasets`);
    if (!res.ok) throw new Error('Dataset catalog unavailable');
    const payload = (await res.json()) as DemoDatasetCatalogResponse;
    const datasets = Array.isArray(payload.datasets) ? payload.datasets.map(normalizeCatalogEntry) : [];
    return mergeCatalogEntries(datasets);
  } catch {
    return DEFAULT_DEMO_DATASETS;
  }
}

/** Fetch a bundled demo CSV file as a File object. */
export async function loadDemoDatasetFile(fileName: string): Promise<File> {
  const res = await fetch(`${DEMO_DATASET_BASE}/${fileName}`);
  if (!res.ok) {
    throw new Error(`Demo dataset not found: ${fileName}`);
  }
  const blob = await res.blob();
  return new File([blob], fileName, { type: 'text/csv' });
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
