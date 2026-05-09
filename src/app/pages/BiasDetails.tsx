import { useState } from 'react';
import type { ComponentType } from 'react';
import { Link } from 'react-router';
import { Navbar } from '../components/Navbar';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, CheckCircle2, ChevronLeft, Filter, Gauge, Info, Network, ShieldAlert, SlidersHorizontal, Target } from 'lucide-react';
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
  const [minCorrelation, setMinCorrelation] = useState(0);
  const [showOnlyProxy, setShowOnlyProxy] = useState(false);
  const [selectedFeatureName, setSelectedFeatureName] = useState('');

  if (!analysisResult) {
    return (
      <RecoveryEmptyState />
    );
  }

  const r = analysisResult.results;
  const proxyFlags = r.proxy_flags ?? [];

  // Build correlation-like data from proxy_flags for heatmap
  // proxy_flags contain { feature, sensitive_attribute, correlation }
  const attrs = sensitiveColumns.length > 0 ? sensitiveColumns : [...new Set(proxyFlags.map((p) => p.sensitive_attribute))];

  // Build a correlation lookup
  const corrLookup: Record<string, Record<string, number>> = {};
  for (const flag of proxyFlags) {
    if (!corrLookup[flag.feature]) corrLookup[flag.feature] = {};
    corrLookup[flag.feature][flag.sensitive_attribute] = flag.correlation ?? 0;
  }
  const features = [...new Set(proxyFlags.map((p) => p.feature))]
    .filter((feature) => {
      const maxCorr = Math.max(...attrs.map((a) => corrLookup[feature]?.[a] ?? 0));
      if (showOnlyProxy && !proxyFlags.some((p) => p.feature === feature)) return false;
      return maxCorr >= minCorrelation;
    });

  // Feature importance for the "Why" panel
  const featureImportanceEntries = Array.isArray(r.feature_importance)
    ? r.feature_importance
    : Object.entries(r.feature_importance ?? {}).map(([feature, shap_value]) => ({ feature, shap_value }));

  const shapFeatures = featureImportanceEntries
    .map((fi) => ({ name: fi.feature ?? Object.keys(fi)[0], value: fi.shap_value ?? (Object.values(fi)[0] as number) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const highRiskCount = proxyFlags.filter((p) => (p.correlation ?? 0) >= 0.7 || p.risk_level === 'HIGH').length;
  const avgProxyCorrelation = proxyFlags.length
    ? proxyFlags.reduce((sum, p) => sum + (p.correlation ?? 0), 0) / proxyFlags.length
    : 0;
  const featureCards = shapFeatures.map((feature) => {
    const linkedProxy = proxyFlags.find((p) => p.feature === feature.name);
    return {
      ...feature,
      isProxy: Boolean(linkedProxy),
      sensitiveAttribute: linkedProxy?.sensitive_attribute ?? 'None detected',
      correlation: linkedProxy?.correlation ?? 0,
      priority: linkedProxy?.risk_level === 'HIGH' || (linkedProxy?.correlation ?? 0) >= 0.7 ? 'High' : linkedProxy ? 'Medium' : 'Low',
    };
  });
  const activeFeature = featureCards.find((feature) => feature.name === selectedFeatureName) ?? featureCards[0];
  const mitigationQueue = [
    highRiskCount > 0 ? 'Review high-correlation proxy features before export.' : null,
    proxyFlags.length > 0 ? 'Run a What-If scenario on each protected proxy relationship.' : 'No proxy flags detected. Keep monitoring feature importance drift.',
    'Document the mitigation decision in the PDF audit report.',
  ].filter(Boolean) as string[];

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

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1.75rem', color: '#111827' }}>
              Bias Details & Drilldown
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Explore proxy signals, feature importance, and mitigation priority with interactive filters.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SummaryPill label="Proxy flags" value={String(proxyFlags.length)} tone={proxyFlags.length ? 'risk' : 'fair'} />
            <SummaryPill label="High risk" value={String(highRiskCount)} tone={highRiskCount ? 'risk' : 'fair'} />
            <SummaryPill label="Avg corr." value={avgProxyCorrelation.toFixed(2)} tone={avgProxyCorrelation >= 0.5 ? 'caution' : 'fair'} />
          </div>
        </div>

        <div className="mb-8 grid gap-4 lg:grid-cols-4">
          <InsightWidget icon={Gauge} title="Risk posture" value={r.risk_level} body={`Bias score ${r.bias_risk_score}/100 with ${proxyFlags.length} proxy signal(s).`} tone={r.risk_level === 'HIGH' ? 'risk' : r.risk_level === 'MEDIUM' ? 'caution' : 'fair'} />
          <InsightWidget icon={Network} title="Proxy surface" value={`${proxyFlags.length}`} body={proxyFlags.length ? `${highRiskCount} high-priority feature(s) need review.` : 'No current protected-attribute proxies.'} tone={proxyFlags.length ? 'risk' : 'fair'} />
          <InsightWidget icon={Target} title="Top driver" value={activeFeature?.name ?? 'N/A'} body={activeFeature ? `Importance ${activeFeature.value.toFixed(4)} · ${activeFeature.priority} priority.` : 'No feature importance available.'} tone={activeFeature?.isProxy ? 'risk' : 'fair'} />
          <InsightWidget icon={CheckCircle2} title="Evidence state" value={proxyFlags.length ? 'Review' : 'Ready'} body={proxyFlags.length ? 'Export after mitigation notes are documented.' : 'Clean drilldown ready for report export.'} tone={proxyFlags.length ? 'caution' : 'fair'} />
        </div>

        {featureCards.length > 0 && (
          <div className="mb-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Interactive Feature Inspector</h2>
                <span className="text-xs text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>Click a feature</span>
              </div>
              <div className="space-y-2">
                {featureCards.slice(0, 8).map((feature) => {
                  const isActive = activeFeature?.name === feature.name;
                  return (
                    <button
                      key={feature.name}
                      onClick={() => setSelectedFeatureName(feature.name)}
                      className="w-full rounded-xl border px-3 py-3 text-left transition-all hover:border-[#3B82F6]"
                      style={{
                        borderColor: isActive ? '#93C5FD' : '#E5E7EB',
                        backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-mono text-sm text-[#111827]">{feature.name}</span>
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{
                          backgroundColor: feature.isProxy ? '#FEF2F2' : '#ECFDF5',
                          color: feature.isProxy ? '#DC2626' : '#047857',
                        }}>{feature.priority}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, feature.value / Math.max(featureCards[0].value, 0.001) * 100)}%`, backgroundColor: feature.isProxy ? '#EF4444' : '#3B82F6' }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>Selected feature</div>
                  <h2 className="mt-1 text-xl font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{activeFeature?.name ?? 'No feature selected'}</h2>
                </div>
                {activeFeature && (
                  <span className="rounded-full border px-3 py-1 text-xs font-medium" style={{
                    borderColor: activeFeature.isProxy ? '#FECACA' : '#A7F3D0',
                    backgroundColor: activeFeature.isProxy ? '#FEF2F2' : '#ECFDF5',
                    color: activeFeature.isProxy ? '#DC2626' : '#047857',
                  }}>{activeFeature.isProxy ? 'Proxy signal' : 'Model driver'}</span>
                )}
              </div>
              {activeFeature && (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <DetailMetric label="Importance" value={activeFeature.value.toFixed(4)} />
                    <DetailMetric label="Correlation" value={activeFeature.correlation ? activeFeature.correlation.toFixed(3) : 'N/A'} />
                    <DetailMetric label="Sensitive link" value={activeFeature.sensitiveAttribute} />
                  </div>
                  <div className="mt-5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                    <div className="mb-3 text-sm font-semibold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Mitigation queue</div>
                    <div className="space-y-2">
                      {mitigationQueue.map((item) => (
                        <div key={item} className="flex items-start gap-2 text-sm text-[#374151]" style={{ fontFamily: 'Inter, sans-serif' }}>
                          <ArrowRight size={14} className="mt-0.5 text-[#2563EB]" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Proxy Correlation Heatmap */}
        {features.length > 0 && attrs.length > 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 mb-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.125rem', color: '#111827' }}>
                  Proxy Correlation Heatmap
                </h2>
                <p className="text-xs text-[#9CA3AF] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Pearson correlation between features and protected attributes. Click a cell for details.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
                <Filter size={14} className="text-[#6B7280]" />
                <label className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Min corr.
                  <select
                    value={minCorrelation}
                    onChange={(e) => setMinCorrelation(Number(e.target.value))}
                    className="ml-2 rounded-md border border-[#E5E7EB] bg-white px-2 py-1 text-xs text-[#374151]"
                  >
                    <option value={0}>All</option>
                    <option value={0.3}>0.30+</option>
                    <option value={0.5}>0.50+</option>
                    <option value={0.7}>0.70+</option>
                  </select>
                </label>
                <button
                  onClick={() => setShowOnlyProxy((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-2 py-1 text-xs text-[#374151] hover:border-[#3B82F6]"
                >
                  <SlidersHorizontal size={12} /> {showOnlyProxy ? 'Proxy only' : 'All features'}
                </button>
              </div>
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
              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
                <div className="p-4 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#1D4ED8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    <Info size={15} /> Selected proxy relationship
                  </div>
                  <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1D4ED8' }}>
                    <strong>{selectedCell.feature}</strong> correlates with <strong>{selectedCell.attr}</strong> at r = <strong>{selectedCell.corr.toFixed(3)}</strong>
                    {selectedCell.corr >= 0.7 ? ' — classified as HIGH PROXY RISK. This feature may act as a substitute for the protected attribute.' : ' — moderate correlation, worth monitoring.'}
                  </p>
                </div>
                <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#92400E]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    <ShieldAlert size={15} /> Action
                  </div>
                  <p className="text-sm text-[#92400E]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {selectedCell.corr >= 0.7 ? 'Prioritize removal, transformation, or documented justification before export.' : 'Monitor this feature and retest after mitigation changes.'}
                  </p>
                </div>
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
            <div className="mt-8 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shapFeatures.slice(0, 8)} layout="vertical" margin={{ left: 80, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} width={90} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontFamily: 'Inter' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {shapFeatures.slice(0, 8).map((f) => (
                      <Cell key={f.name} fill={proxyFlags.some((p) => p.feature === f.name) ? '#EF4444' : '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: 'fair' | 'caution' | 'risk' }) {
  const palette = {
    fair: { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
    caution: { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
    risk: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  }[tone];
  return (
    <div className="rounded-xl border px-4 py-2" style={{ backgroundColor: palette.bg, borderColor: palette.border }}>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: palette.color, fontFamily: 'Inter, sans-serif' }}>{label}</div>
      <div className="font-mono text-lg font-bold" style={{ color: palette.color }}>{value}</div>
    </div>
  );
}

function InsightWidget({
  icon: Icon,
  title,
  value,
  body,
  tone,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  value: string;
  body: string;
  tone: 'fair' | 'caution' | 'risk';
}) {
  const palette = {
    fair: { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
    caution: { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
    risk: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  }[tone];
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: palette.border }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: palette.bg, color: palette.color }}>
          <Icon size={18} />
        </div>
        <span className="text-xs font-medium" style={{ color: palette.color }}>{title}</span>
      </div>
      <div className="truncate text-xl font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{value}</div>
      <p className="mt-2 text-xs leading-5 text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>{body}</p>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
      <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>{label}</div>
      <div className="mt-1 truncate font-mono text-sm font-bold text-[#374151]">{value}</div>
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
