import { useState } from 'react';
import { Link } from 'react-router';
import { Navbar } from '../components/Navbar';
import { ChevronLeft } from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';

function getHeatColor(val: number): string {
  if (val >= 0.7) return '#EF4444';
  if (val >= 0.5) return '#F59E0B';
  if (val >= 0.3) return '#FBBF24';
  return '#D1FAE5';
}

function getTextColor(val: number): string {
  return val >= 0.5 ? 'white' : '#374151';
}

export function BiasDetails() {
  const { analysisResult, sensitiveColumns } = useAnalysis();
  const [selectedCell, setSelectedCell] = useState<{ feature: string; attr: string; corr: number } | null>(null);

  if (!analysisResult) {
    return (
      <RecoveryEmptyState />
    );
  }

  const r = analysisResult.results;
  const proxyFlags = r.proxy_flags ?? [];

  // Build correlation-like data from proxy_flags for heatmap
  // proxy_flags contain { feature, sensitive_attribute, correlation }
  const features = [...new Set(proxyFlags.map((p) => p.feature))];
  const attrs = sensitiveColumns.length > 0 ? sensitiveColumns : [...new Set(proxyFlags.map((p) => p.sensitive_attribute))];

  // Build a correlation lookup
  const corrLookup: Record<string, Record<string, number>> = {};
  for (const flag of proxyFlags) {
    if (!corrLookup[flag.feature]) corrLookup[flag.feature] = {};
    corrLookup[flag.feature][flag.sensitive_attribute] = flag.correlation ?? 0;
  }

  // Feature importance for the "Why" panel
  const shapFeatures = (r.feature_importance ?? [])
    .map((fi) => ({ name: fi.feature ?? Object.keys(fi)[0], value: fi.shap_value ?? (Object.values(fi)[0] as number) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

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
          <span className="text-sm font-medium text-[#374151]" style={{ fontFamily: 'Inter, sans-serif' }}>Bias Details & Drilldown</span>
        </div>

        <h1 className="mb-8" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1.75rem', color: '#111827' }}>
          Bias Details & Drilldown
        </h1>

        {/* Proxy Correlation Heatmap */}
        {features.length > 0 && attrs.length > 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 mb-8">
            <div className="mb-6">
              <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.125rem', color: '#111827' }}>
                Proxy Correlation Heatmap
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                Pearson correlation between features and protected attributes. Red cells (≥0.7) indicate high proxy risk. Click a cell for details.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="w-40 text-left pb-3 text-xs text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>Feature</th>
                    {attrs.map((attr) => (
                      <th key={attr} className="pb-3 text-center text-xs font-semibold text-[#374151] px-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {attr}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9FAFB]">
                  {features.map((feature) => {
                    const maxCorr = Math.max(...attrs.map((a) => corrLookup[feature]?.[a] ?? 0));
                    return (
                      <tr key={feature}>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            {maxCorr >= 0.7 && <span className="text-[#EF4444] text-xs">⚠</span>}
                            <span className="text-sm font-mono" style={{ fontFamily: 'JetBrains Mono', color: maxCorr >= 0.7 ? '#EF4444' : '#374151' }}>
                              {feature}
                            </span>
                            {maxCorr >= 0.7 && (
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>High Proxy Risk</span>
                            )}
                          </div>
                        </td>
                        {attrs.map((attr) => {
                          const val = corrLookup[feature]?.[attr] ?? 0;
                          const isSelected = selectedCell?.feature === feature && selectedCell?.attr === attr;
                          return (
                            <td key={attr} className="py-2 px-2 text-center">
                              <button
                                onClick={() => setSelectedCell(isSelected ? null : { feature, attr, corr: val })}
                                className="w-full py-2 px-3 rounded-lg transition-all duration-200 font-mono text-xs font-bold"
                                style={{
                                  backgroundColor: val > 0 ? getHeatColor(val) : '#F3F4F6',
                                  color: val > 0 ? getTextColor(val) : '#9CA3AF',
                                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                                  boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                                }}
                              >
                                {val > 0 ? val.toFixed(2) : '—'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              {[
                { color: '#D1FAE5', label: '< 0.3 (Low)' },
                { color: '#FDE68A', label: '0.3–0.5 (Moderate)' },
                { color: '#F59E0B', label: '0.5–0.7 (High)' },
                { color: '#EF4444', label: '≥ 0.7 (Proxy Risk ⚠)' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: l.color }} />
                  <span className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>{l.label}</span>
                </div>
              ))}
            </div>

            {/* Selected cell detail */}
            {selectedCell && selectedCell.corr > 0 && (
              <div className="mt-6 p-4 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]">
                <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1D4ED8' }}>
                  <strong>{selectedCell.feature}</strong> correlates with <strong>{selectedCell.attr}</strong> at r = <strong>{selectedCell.corr.toFixed(3)}</strong>
                  {selectedCell.corr >= 0.7 ? ' — classified as HIGH PROXY RISK. This feature may act as a substitute for the protected attribute.' : ' — moderate correlation, worth monitoring.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 mb-8 text-center">
            <p className="text-sm text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>
              No proxy features were detected in this dataset — no correlation heatmap to display.
            </p>
          </div>
        )}

        {/* Feature Importance Table */}
        {shapFeatures.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 mb-8">
            <h2 className="mb-4" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.125rem', color: '#111827' }}>
              Feature Importance Breakdown (SHAP)
            </h2>
            <div className="space-y-2">
              {shapFeatures.map((f, i) => {
                const isProxy = proxyFlags.some((p) => p.feature === f.name);
                const maxVal = shapFeatures[0].value;
                const pct = Math.round((f.value / maxVal) * 100);
                return (
                  <div key={f.name} className="flex items-center gap-3">
                    <span className="w-5 text-xs text-[#9CA3AF] text-right" style={{ fontFamily: 'Inter' }}>{i + 1}</span>
                    <span className="w-36 text-xs truncate flex-shrink-0" style={{ fontFamily: 'JetBrains Mono', color: isProxy ? '#EF4444' : '#374151' }}>
                      {isProxy && '⚠ '}{f.name}
                    </span>
                    <div className="flex-1 h-5 rounded bg-[#F3F4F6] overflow-hidden">
                      <div
                        className="h-full rounded transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: isProxy ? '#EF4444' : '#3B82F6' }}
                      />
                    </div>
                    <span className="w-16 text-xs text-right font-mono" style={{ fontFamily: 'JetBrains Mono', color: '#374151' }}>
                      {f.value.toFixed(4)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Explanation */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
          <h2 className="mb-6" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.125rem', color: '#111827' }}>
            Why This Bias Exists
          </h2>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <p className="text-sm leading-relaxed text-[#374151] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                {r.explanation || 'No AI explanation available. Ensure GROQ_API_KEY is set in backend/.env'}
              </p>
              {(r.citations ?? []).length > 0 && (
                <ul className="space-y-1">
                  {r.citations.map((c, i) => (
                    <li key={i} className="text-xs text-[#6B7280] font-mono">[{i + 1}] {c}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Mitigation steps */}
            <div>
              <h3 className="text-sm font-semibold text-[#374151] mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Recommended Mitigations
              </h3>
              <div className="space-y-3">
                {[
                  { step: 1, action: 'Remove proxy features', detail: `Drop identified proxy columns: ${proxyFlags.map((p) => p.feature).join(', ') || 'none detected'}`, effort: 'Low', impact: 'High' },
                  { step: 2, action: 'Apply Data Reweighing', detail: 'Use AIF360 Reweighing algorithm to balance training samples across groups', effort: 'Med', impact: 'High' },
                  { step: 3, action: 'Adversarial debiasing', detail: 'Train adversarial network to remove protected-attribute signal (AIF360)', effort: 'High', impact: 'High' },
                  { step: 4, action: 'Post-processing calibration', detail: 'Apply AIF360 CalibratedEqOddsPostprocessing for error rate parity', effort: 'Med', impact: 'Med' },
                ].map((m) => (
                  <div key={m.step} className="flex gap-4 p-3 rounded-lg border border-[#E5E7EB]">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                      {m.step}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{m.action}</div>
                      <div className="text-xs text-[#6B7280] mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>{m.detail}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-[#9CA3AF]">Effort: {m.effort}</div>
                      <div className="text-xs font-medium text-[#10B981]">Impact: {m.impact}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecoveryEmptyState() {
  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      <Navbar variant="app" />
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-24">
        <div className="w-full rounded-2xl border border-[#E5E7EB] bg-white p-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Recoverable state
          </div>
          <h1 className="mt-2 text-2xl font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Bias drilldown is not loaded
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#374151]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Open a saved analysis or upload a CSV to rebuild the drilldown. When a result exists in session storage, this page will render the saved proxy analysis instead of bouncing you away.
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
