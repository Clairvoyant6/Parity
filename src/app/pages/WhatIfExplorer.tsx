import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Navbar } from '../components/Navbar';
import { PrimaryButton } from '../components/ui/Button';
import { Shield, RefreshCw, ChevronLeft, TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';
import { runWhatIf } from '../../services/api';
import type { WhatIfResponse } from '../../types/analysis';

export function WhatIfExplorer() {
  const { analysisResult, file, targetColumn, sensitiveColumns, availableColumns } = useAnalysis();

  // Feature selection state
  const allColumns = availableColumns.length > 0 ? availableColumns : [];
  const [selectedFeature, setSelectedFeature] = useState(allColumns[0] ?? '');
  const [originalValue, setOriginalValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextFeature = allColumns.find((col) => col !== targetColumn) ?? '';
    if (!selectedFeature || selectedFeature === targetColumn || !allColumns.includes(selectedFeature)) {
      setSelectedFeature(nextFeature);
    }
  }, [allColumns, selectedFeature, targetColumn]);

  if (!analysisResult || !file || availableColumns.length === 0) {
    return (
      <RecoverableEmptyState
        title={!analysisResult ? 'What-If Explorer is not loaded' : 'What-If Explorer needs the source CSV'}
        body={!analysisResult
          ? 'Upload a dataset or restore a saved analysis to run counterfactual simulations. The saved summary will be reused if it exists in session storage.'
          : 'The analysis summary is available, but simulations need the original CSV and column list. Re-upload the file or load a demo dataset to restore the file-backed session.'}
      />
    );
  }

  const isProtected = sensitiveColumns.includes(selectedFeature);
  const impact = whatIfResult?.impact;
  const origScore = whatIfResult?.original_risk_score ?? analysisResult.results.bias_risk_score;
  const modScore = whatIfResult?.modified_risk_score;

  async function handleRunSimulation() {
    if (!file || !selectedFeature || !originalValue || !newValue) return;
    setError(null);
    setIsRunning(true);
    setWhatIfResult(null);
    try {
      const result = await runWhatIf(
        file, targetColumn, sensitiveColumns,
        selectedFeature, originalValue, newValue
      );
      setWhatIfResult(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRunning(false);
    }
  }

  function handleReset() {
    setSelectedFeature(allColumns.find((col) => col !== targetColumn) ?? '');
    setOriginalValue('');
    setNewValue('');
    setWhatIfResult(null);
    setError(null);
  }

  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      <Navbar variant="app" />

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link to="/app/analysis" className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#374151] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
            <ChevronLeft size={14} /> Dashboard
          </Link>
          <span className="text-[#D1D5DB]">/</span>
          <span className="text-sm font-medium text-[#374151]" style={{ fontFamily: 'Inter, sans-serif' }}>What-If Explorer</span>
        </div>

        <h1 className="mb-2" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1.75rem', color: '#111827' }}>
          What-If Explorer
        </h1>
        <p className="text-sm text-[#6B7280] mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
          Change a feature value across all rows and see how the bias risk score changes. Make bias visible.
        </p>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1" style={{ fontFamily: 'Inter, sans-serif' }}>{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: Feature Selector */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
                <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: '#111827' }}>
                  Simulation Parameters
                </h2>
                <button onClick={handleReset} className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#374151] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <RefreshCw size={12} /> Reset
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Feature selector */}
                <div>
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wide block mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Feature to Change
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedFeature}
                      onChange={(e) => { setSelectedFeature(e.target.value); setOriginalValue(''); setNewValue(''); setWhatIfResult(null); }}
                      className="flex-1 text-sm rounded-lg px-3 py-2 border border-[#E5E7EB] bg-white"
                      style={{ fontFamily: 'JetBrains Mono, monospace', color: '#374151', outline: 'none',
                        borderColor: isProtected ? '#BFDBFE' : '#E5E7EB',
                        backgroundColor: isProtected ? '#EFF6FF' : 'white',
                      }}
                    >
                      {allColumns.filter((c) => c !== targetColumn).map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                    {isProtected && (
                      <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                        <Shield size={10} /> Protected
                      </div>
                    )}
                  </div>
                  {isProtected && (
                    <p className="text-xs text-[#2563EB] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      ⚠ Changing a protected attribute reveals counterfactual bias.
                    </p>
                  )}
                </div>

                {/* Original value */}
                <div>
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wide block mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Original Value (replace in dataset)
                  </label>
                  <input
                    type="text"
                    value={originalValue}
                    onChange={(e) => setOriginalValue(e.target.value)}
                    placeholder={`e.g. "Female" or "0"`}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ fontFamily: 'JetBrains Mono, monospace', borderColor: '#E5E7EB', outline: 'none' }}
                  />
                </div>

                {/* New value */}
                <div>
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wide block mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Replace With
                  </label>
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={`e.g. "Male" or "1"`}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ fontFamily: 'JetBrains Mono, monospace', borderColor: '#E5E7EB', outline: 'none' }}
                  />
                </div>

                <p className="text-xs text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  The backend will replace all occurrences of the original value in the <strong>{selectedFeature}</strong> column and re-run the full bias analysis.
                </p>

                <PrimaryButton
                  className="w-full justify-center"
                  onClick={handleRunSimulation}
                  disabled={isRunning || !selectedFeature || !originalValue || !newValue || !file}
                >
                  {isRunning ? (
                    <><Loader2 size={16} className="animate-spin" /> Running… (15–30s)</>
                  ) : (
                    'Run Simulation'
                  )}
                </PrimaryButton>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-3 space-y-6">
            {/* Before / After Score Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Before */}
              <ScoreCard
                label="ORIGINAL RISK SCORE"
                score={origScore}
                description={`Dataset: ${analysisResult.filename}`}
              />
              {/* After */}
              <ScoreCard
                label={whatIfResult ? 'MODIFIED RISK SCORE' : 'PENDING — Click Run Simulation'}
                score={modScore ?? null}
                description={whatIfResult ? `${selectedFeature}: "${originalValue}" → "${newValue}"` : ''}
                pending={!whatIfResult}
              />
            </div>

            {/* Impact banner */}
            {whatIfResult && (
              <div
                className="rounded-xl p-4 flex items-center gap-4"
                style={{
                  backgroundColor: impact === 'IMPROVED' ? '#ECFDF5' : '#FEF2F2',
                  border: `2px solid ${impact === 'IMPROVED' ? '#A7F3D0' : '#FECACA'}`,
                  animation: 'fadeInUp 0.4s ease',
                }}
              >
                {impact === 'IMPROVED' ? <TrendingDown size={24} className="text-green-600 flex-shrink-0" /> : <TrendingUp size={24} className="text-red-500 flex-shrink-0" />}
                <div>
                  <div className="font-bold" style={{ fontFamily: 'DM Sans, sans-serif', color: impact === 'IMPROVED' ? '#065F46' : '#991B1B', fontSize: '1.0625rem' }}>
                    Bias {impact === 'IMPROVED' ? 'Improved' : 'Worsened'}
                  </div>
                  <div className="text-xs mt-0.5" style={{ fontFamily: 'Inter, sans-serif', color: impact === 'IMPROVED' ? '#047857' : '#B91C1C' }}>
                    Risk score: {origScore} → {modScore} ({impact === 'IMPROVED' ? '↓' : '↑'} {Math.abs((modScore ?? 0) - origScore).toFixed(1)} points)
                  </div>
                </div>
              </div>
            )}

            {/* Modified metrics summary */}
            {whatIfResult && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6" style={{ animation: 'fadeInUp 0.5s ease 0.1s both' }}>
                <h3 className="mb-4" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: '#111827' }}>
                  Metric Change
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: 'Disparate Impact',
                      before: whatIfResult.original_metrics.disparate_impact_ratio ?? whatIfResult.original_metrics.disparate_impact_avg ?? 'N/A',
                      after: whatIfResult.modified_metrics.disparate_impact_ratio ?? whatIfResult.modified_metrics.disparate_impact_avg ?? 'N/A',
                    },
                    {
                      label: 'Dem. Parity Diff',
                      before: whatIfResult.original_metrics.demographic_parity_difference ?? whatIfResult.original_metrics.demographic_parity_avg ?? 'N/A',
                      after: whatIfResult.modified_metrics.demographic_parity_difference ?? whatIfResult.modified_metrics.demographic_parity_avg ?? 'N/A',
                    },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg p-3 bg-[#F9FAFB] border border-[#F3F4F6]">
                      <p className="text-xs text-[#6B7280] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>{m.label}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-[#374151]">{typeof m.before === 'number' ? m.before.toFixed(3) : m.before}</span>
                        <span className="text-[#9CA3AF]">→</span>
                        <span className="text-sm font-mono font-bold" style={{ color: typeof m.after === 'number' && typeof m.before === 'number' && m.after > m.before ? '#10B981' : '#EF4444' }}>
                          {typeof m.after === 'number' ? m.after.toFixed(3) : m.after}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!whatIfResult && !isRunning && (
              <div className="bg-white rounded-2xl border border-dashed border-[#E5E7EB] p-12 flex flex-col items-center justify-center text-center">
                <RefreshCw size={32} className="text-[#D1D5DB] mb-3" />
                <p className="text-sm text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Select a feature, enter original and replacement values, then click <strong>Run Simulation</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecoverableEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      <Navbar variant="app" />
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-24">
        <div className="w-full rounded-2xl border border-[#E5E7EB] bg-white p-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Recoverable state
          </div>
          <h1 className="mt-2 text-2xl font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#374151]" style={{ fontFamily: 'Inter, sans-serif' }}>
            {body}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/app/upload" className="inline-flex items-center rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1D4ED8]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Go to upload
            </Link>
            <Link to="/app/analysis" className="inline-flex items-center rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#374151] hover:border-[#3B82F6] hover:text-[#3B82F6]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, score, description, pending = false }: { label: string; score: number | null; description: string; pending?: boolean }) {
  const riskColor = score === null ? '#9CA3AF' : score >= 70 ? '#EF4444' : score >= 40 ? '#F59E0B' : '#10B981';
  return (
    <div className="rounded-2xl p-6 border" style={{ borderColor: pending ? '#E5E7EB' : riskColor + '60', backgroundColor: pending ? '#F9FAFB' : riskColor + '10', opacity: pending ? 0.7 : 1 }}>
      <div className="text-xs font-medium mb-3" style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>{label}</div>
      <div className="text-4xl font-bold mb-1" style={{ fontFamily: 'DM Sans, sans-serif', color: pending ? '#9CA3AF' : riskColor }}>
        {score !== null ? score.toFixed(1) : '—'}
      </div>
      <div className="text-xs mt-1" style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>{description || '\u00A0'}</div>
    </div>
  );
}
