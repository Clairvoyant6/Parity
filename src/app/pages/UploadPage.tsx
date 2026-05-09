import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useDropzone } from 'react-dropzone';
import { Navbar } from '../components/Navbar';
import { PrimaryButton } from '../components/ui/Button';
import {
  Upload, CloudUpload, Shield, CheckCircle,
  AlertCircle, ChevronRight, Loader2, X
} from 'lucide-react';
import { previewCSV, analyzeDataset } from '../../services/api';
import { useAnalysis } from '../../context/AnalysisContext';

type ColumnRole = 'target' | 'protected' | 'ignore' | '';

interface ColumnConfig {
  name: string;
  role: ColumnRole;
  sample: string[];
}

export function UploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    setFile, setTargetColumn, setSensitiveColumns,
    setDomain, setAnalysisResult, setAvailableColumns,
  } = useAnalysis();

  // Local state
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileInfo, setFileInfo] = useState<{ rows: number; cols: number } | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const onboardingMode = searchParams.get('mode');
  const onboardingPreset = {
    model: {
      title: 'Audit a model',
      domain: 'hiring',
      eyebrow: 'Onboarding preset',
      helper: 'We preselected Hiring so the flow starts with a concrete consequential-decisions lens. You can change the domain anytime before analysis.',
    },
    dataset: {
      title: 'Check a dataset',
      domain: 'general',
      eyebrow: 'Onboarding preset',
      helper: 'We preselected General so you can label the target and sensitive columns first, then switch to a domain-specific audit if needed.',
    },
    output: {
      title: 'Understand an output',
      domain: 'general',
      eyebrow: 'Onboarding preset',
      helper: 'We preselected General so you can inspect the decision first and then tune the audit for the source domain if you know it.',
    },
    groups: {
      title: 'Compare groups',
      domain: 'general',
      eyebrow: 'Onboarding preset',
      helper: 'We preselected General so the upload flow stays focused on group comparison and protected-attribute labeling.',
    },
    report: {
      title: 'Generate a report',
      domain: 'general',
      eyebrow: 'Onboarding preset',
      helper: 'We preselected General so you can gather audit evidence quickly before exporting the compliance report.',
    },
  } as const;
  const activePreset = onboardingMode && onboardingMode in onboardingPreset
    ? onboardingPreset[onboardingMode as keyof typeof onboardingPreset]
    : null;
  const [selectedDomain, setSelectedDomain] = useState(activePreset?.domain ?? 'general');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const domains = [
    { value: 'general', label: 'General' },
    { value: 'hiring', label: 'Hiring' },
    { value: 'lending', label: 'Lending / Credit' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'criminal_justice', label: 'Criminal Justice' },
    { value: 'education', label: 'Education' },
  ];

  useEffect(() => {
    setSelectedDomain(activePreset?.domain ?? 'general');
  }, [activePreset?.domain]);

  // File drop handler — calls /api/preview
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setError(null);
    setLocalFile(file);
    setFileName(file.name);
    setIsPreviewing(true);
    setColumns([]);
    setPreviewRows([]);

    try {
      const preview = await previewCSV(file);
      setFileInfo(preview.shape);
      setAvailableColumns(preview.columns);
      setColumns(
        preview.columns.map((name) => ({
          name,
          role: '' as ColumnRole,
          sample: preview.preview
            .map((r) => String(r[name] ?? ''))
            .slice(0, 3),
        }))
      );
      setPreviewRows(preview.preview);
    } catch (e) {
      setError(String(e));
      setLocalFile(null);
      setFileName('');
    } finally {
      setIsPreviewing(false);
    }
  }, [setAvailableColumns]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  function setColumnRole(colName: string, role: ColumnRole) {
    setColumns((prev) =>
      prev.map((c) => {
        // Enforce single target
        if (role === 'target' && c.role === 'target' && c.name !== colName) {
          return { ...c, role: '' };
        }
        return c.name === colName ? { ...c, role } : c;
      })
    );
  }

  const targetCol = columns.find((c) => c.role === 'target')?.name ?? '';
  const protectedCols = columns.filter((c) => c.role === 'protected').map((c) => c.name);
  const canRunAnalysis = !!localFile && !!targetCol && protectedCols.length > 0;

  async function handleRunAnalysis() {
    if (!canRunAnalysis) return;
    setError(null);
    setIsAnalysing(true);
    try {
      // Store selections in context
      setFile(localFile);
      setTargetColumn(targetCol);
      setSensitiveColumns(protectedCols);
      setDomain(selectedDomain);

      const result = await analyzeDataset(localFile!, targetCol, protectedCols, selectedDomain);
      setAnalysisResult(result);
      navigate('/app/analysis');
    } catch (e) {
      setError(String(e));
    } finally {
      setIsAnalysing(false);
    }
  }

  function handleClear() {
    setLocalFile(null);
    setFileName('');
    setFileInfo(null);
    setColumns([]);
    setPreviewRows([]);
    setError(null);
  }

  const stepState = (i: number) => {
    if (i === 0) return localFile ? 'done' : 'active';
    if (i === 1) return localFile ? 'active' : 'idle';
    return isAnalysing ? 'active' : 'idle';
  };

  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      <Navbar variant="app" />

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-10 max-w-lg">
          {['Choose Goal', 'Upload & Configure', 'Analyse'].map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor:
                      stepState(i) === 'done' ? '#10B981' :
                      stepState(i) === 'active' ? '#2563EB' : '#E5E7EB',
                    color: stepState(i) !== 'idle' ? 'white' : '#9CA3AF',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {stepState(i) === 'done' ? '✓' : i + 1}
                </div>
                <span
                  className="text-xs hidden sm:block"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    color:
                      stepState(i) === 'done' ? '#10B981' :
                      stepState(i) === 'active' ? '#2563EB' : '#9CA3AF',
                    fontWeight: stepState(i) === 'active' ? 600 : 400,
                  }}
                >
                  {step}
                </span>
              </div>
              {i < 2 && (
                <div
                  className="flex-1 h-px mx-3"
                  style={{ backgroundColor: stepState(i) === 'done' ? '#10B981' : '#E5E7EB' }}
                />
              )}
            </div>
          ))}
        </div>

        {activePreset && (
          <div className="mb-8 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#2563EB] border border-[#BFDBFE]">
                <Shield size={18} />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#2563EB]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {activePreset.eyebrow}
                </div>
                <div className="mt-0.5 text-sm font-semibold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {activePreset.title}
                </div>
                <p className="mt-1 text-sm text-[#1D4ED8]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {activePreset.helper}
                </p>
              </div>
            </div>
            <div className="text-xs font-medium text-[#1D4ED8] sm:text-right" style={{ fontFamily: 'Inter, sans-serif' }}>
              Domain preset: <span className="font-semibold">{domains.find((d) => d.value === activePreset.domain)?.label ?? activePreset.domain}</span>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1" style={{ fontFamily: 'Inter, sans-serif' }}>{error}</p>
            <button onClick={() => setError(null)}><X size={14} className="text-red-400" /></button>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Upload */}
          <div>
            <h2 className="mb-6" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: '#111827' }}>
              Upload Your Dataset
            </h2>

            {!localFile ? (
              <>
                <div
                  {...getRootProps()}
                  className="rounded-xl border-2 border-dashed p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                  style={{
                    borderColor: isDragActive ? '#2563EB' : isPreviewing ? '#93C5FD' : '#93C5FD',
                    backgroundColor: isDragActive ? '#EFF6FF' : 'white',
                  }}
                >
                  <input {...getInputProps()} />
                  {isPreviewing ? (
                    <Loader2 size={40} className="text-blue-400 animate-spin mb-4" />
                  ) : (
                    <CloudUpload size={48} style={{ color: isDragActive ? '#2563EB' : '#93C5FD' }} className="mb-4" />
                  )}
                  <p className="text-center mb-2" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.125rem', color: '#111827' }}>
                    {isPreviewing ? 'Reading your file…' : isDragActive ? 'Drop your file here' : 'Drop your CSV here'}
                  </p>
                  {!isPreviewing && (
                    <>
                      <p className="text-sm text-center mb-4" style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>
                        or{' '}<span style={{ color: '#2563EB', cursor: 'pointer' }}>browse files</span>
                      </p>
                      <p className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
                        Supports CSV · Max 500 MB
                      </p>
                    </>
                  )}
                </div>

                {/* Demo datasets */}
                <div className="mt-6 border border-[#E5E7EB] rounded-xl p-4 bg-white shadow-sm ring-4 ring-blue-500/20">
                  <label className="block text-sm font-semibold text-[#374151] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Or try a demo dataset:
                  </label>
                  <div className="flex flex-col gap-2">
                    {[
                      { name: 'COMPAS Recidivism (Criminal Justice)', file: 'compas-scores-two-years.csv' },
                      { name: 'Adult Income (General/Hiring)', file: 'adult-income.csv' },
                      { name: 'German Credit (Lending)', file: 'german-credit.csv' },
                      { name: 'Heart Disease (Healthcare)', file: 'heart-disease.csv' },
                      { name: 'Student Performance (Education)', file: 'student-performance.csv' },
                    ].map((demo) => (
                      <button
                        key={demo.file}
                        onClick={async () => {
                          try {
                            const res = await fetch(`/datasets/${demo.file}`);
                            if (!res.ok) throw new Error('Dataset not found');
                            const blob = await res.blob();
                            const demoFile = new File([blob], demo.file, { type: 'text/csv' });
                            await onDrop([demoFile]);
                          } catch {
                            setError(`Could not load ${demo.name}. Make sure it exists in public/datasets/.`);
                          }
                        }}
                        className="w-full py-2.5 px-4 rounded-lg border border-[#E5E7EB] text-sm text-left transition-colors hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 flex justify-between items-center"
                        style={{ fontFamily: 'Inter, sans-serif', color: '#4B5563' }}
                      >
                        {demo.name}
                        <ChevronRight size={16} className="text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-6 flex items-center gap-4">
                <CheckCircle size={28} style={{ color: '#10B981' }} />
                <div className="flex-1">
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#111827' }}>{fileName}</div>
                  {fileInfo && (
                    <div className="text-sm mt-0.5" style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>
                      {fileInfo.rows.toLocaleString()} rows · {fileInfo.cols} columns
                    </div>
                  )}
                </div>
                <button onClick={handleClear} className="text-xs text-[#6B7280] hover:text-[#374151] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Change
                </button>
              </div>
            )}

            {/* Data preview table */}
            {previewRows.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-[#374151] mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Data Preview (first {previewRows.length} rows)
                </h3>
                <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB' }}>
                        {columns.map((col) => (
                          <th key={col.name} className="px-3 py-2 text-left font-medium text-[#6B7280] border-b border-[#E5E7EB]" style={{ fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b border-[#F3F4F6] hover:bg-[#FAFAFA]">
                          {columns.map((col) => (
                            <td key={col.name} className="px-3 py-2 text-[#374151]" style={{ fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                              {String(row[col.name] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right: Configure */}
          <div>
            <h2 className="mb-6" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: '#111827' }}>
              Configure Analysis
            </h2>

            {!localFile ? (
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 flex flex-col items-center justify-center text-center h-64">
                <Upload size={32} className="text-[#D1D5DB] mb-3" />
                <p className="text-sm text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>Upload a CSV to configure column roles</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1D4ED8' }}>
                  <strong>Step 2 of 3:</strong> Label each column so Parity knows how to use it.
                </div>

                {/* Domain selector */}
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide block mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Analysis Domain
                  </label>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="w-full text-sm rounded-lg px-3 py-2 border border-[#E5E7EB] bg-white"
                    style={{ fontFamily: 'Inter, sans-serif', color: '#374151', outline: 'none' }}
                  >
                    {domains.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  {activePreset && (
                    <p className="mt-2 text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Preselected from onboarding: <strong>{activePreset.title}</strong>
                    </p>
                  )}
                </div>

                {/* Column labelling */}
                <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#F3F4F6] bg-[#F9FAFB]">
                    <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>Label Features</span>
                  </div>
                  <div className="divide-y divide-[#F3F4F6] max-h-80 overflow-y-auto">
                    {columns.map((col) => (
                      <div key={col.name} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#111827] truncate" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {col.name}
                            </span>
                            {col.role === 'protected' && <Shield size={12} style={{ color: '#2563EB' }} />}
                          </div>
                          <span className="text-xs text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>
                            e.g. {col.sample.join(', ')}
                          </span>
                        </div>
                        <select
                          value={col.role}
                          onChange={(e) => setColumnRole(col.name, e.target.value as ColumnRole)}
                          className="text-xs rounded-lg px-3 py-1.5 border border-[#E5E7EB] bg-white flex-shrink-0"
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            color: col.role === 'protected' ? '#2563EB' : col.role === 'target' ? '#D97706' : '#374151',
                            borderColor: col.role === 'protected' ? '#93C5FD' : col.role === 'target' ? '#FDE68A' : '#E5E7EB',
                            outline: 'none',
                          }}
                        >
                          <option value="">— Skip —</option>
                          <option value="target">Target Variable</option>
                          <option value="protected">Sensitive Variable</option>
                          <option value="ignore">Ignore</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validation hints */}
                {!targetCol && (
                  <div className="flex items-center gap-2 text-xs text-[#D97706]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <AlertCircle size={14} />
                    Label one column as <strong>Target Variable</strong>
                  </div>
                )}
                {targetCol && protectedCols.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-[#D97706]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <AlertCircle size={14} />
                    Label at least one column as <strong>Sensitive Variable</strong>
                  </div>
                )}

                {/* Run button */}
                <PrimaryButton
                  className="w-full justify-center"
                  disabled={!canRunAnalysis || isAnalysing}
                  loading={isAnalysing}
                  onClick={handleRunAnalysis}
                >
                  {isAnalysing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Analysing… (this may take 15–30s)
                    </>
                  ) : (
                    <>Run Analysis <ChevronRight size={18} /></>
                  )}
                </PrimaryButton>

                {canRunAnalysis && !isAnalysing && (
                  <p className="text-xs text-center text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Target: <strong>{targetCol}</strong> · Sensitive: <strong>{protectedCols.join(', ')}</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
