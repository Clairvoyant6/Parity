import { useState } from 'react';
import { Link } from 'react-router';
import { Navbar } from '../components/Navbar';
import { ProgressRing } from '../components/ui/ProgressRing';
import { PrimaryButton } from '../components/ui/Button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer, BarChart as HBarChart,
} from 'recharts';
import { Download, ChevronRight, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';
import { exportReport, triggerDownload } from '../../services/api';

export function AnalysisDashboard() {
  const { analysisResult, file, targetColumn, sensitiveColumns, domain } = useAnalysis();
  const [showExplanation, setShowExplanation] = useState(false);
  const [showGroupChartHelp, setShowGroupChartHelp] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!analysisResult) {
    return (
      <RecoverableEmptyState />
    );
  }

  const r = analysisResult.results;

  // ── Build group comparison chart data ──────────────────────────────
  const groupChartData = Object.entries(r.group_metrics ?? {}).flatMap(([attr, groups]) => {
    if (Array.isArray(groups)) {
      return groups.map((g) => ({
        group: `${g.group_name}`,
        rate: Math.round((g.approval_rate ?? 0) * 100),
        attr,
      }));
    }
    // Backend returns flat dicts with keys like "group_X_positive_rate"
    return Object.entries(groups as Record<string, unknown>)
      .filter(([k]) => k.endsWith('_positive_rate'))
      .map(([k, v]) => ({
        group: k.replace(`group_`, '').replace('_positive_rate', ''),
        rate: Math.round(Number(v) * 100),
        attr,
      }));
  });

  const maxRate = Math.max(...groupChartData.map((d) => d.rate), 1);

  function barColor(rate: number) {
    const ratio = rate / maxRate;
    if (ratio >= 0.8) return '#3B82F6';
    if (ratio >= 0.6) return '#F59E0B';
    return '#EF4444';
  }

  // ── SHAP / feature-importance chart data ───────────────────────────
  const shapEntries = Array.isArray(r.feature_importance)
    ? r.feature_importance
    : Object.entries(r.feature_importance || {}).map(([k, v]) => ({ feature: k, shap_value: v }));

  const shapData = shapEntries
    .map((fi) => ({
      feature: fi.feature ?? Object.keys(fi)[0],
      importance: fi.shap_value ?? (Object.values(fi)[0] as number),
      isProxy: (r.proxy_flags ?? []).some((p) => p.feature === (fi.feature ?? Object.keys(fi)[0])),
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 8);

  // ── Metric card values ─────────────────────────────────────────────
  const di = r.disparate_impact_ratio ?? r.disparate_impact_avg ?? 1;
  const dp = r.demographic_parity_difference ?? r.demographic_parity_avg ?? 0;
  const eoMaxDiff = r.equalized_odds
    ? Math.max(
        r.equalized_odds.true_positive_rate_difference,
        r.equalized_odds.false_positive_rate_difference
      )
    : undefined;
  const ppDiff = r.predictive_parity?.positive_predictive_value_difference;

  const metrics = [
    {
      label: 'Disparate Impact',
      value: di.toFixed(2),
      threshold: 'Target: >= 0.8',
      status: di < 0.8 ? 'risk' : 'fair',
      detail: di < 0.8 ? 'Below parity threshold' : 'Within threshold',
    },
    {
      label: 'Demographic Parity Diff',
      value: dp.toFixed(2),
      threshold: 'Target: < 0.2',
      status: dp > 0.2 ? 'risk' : 'fair',
      detail: dp > 0.2 ? 'Gap remains large' : 'Within threshold',
    },
    {
      label: 'Equalized Odds',
      value: eoMaxDiff !== undefined ? eoMaxDiff.toFixed(2) : '—',
      threshold: 'Max gap target: <= 0.2',
      status: eoMaxDiff === undefined ? 'unavailable' : eoMaxDiff > 0.2 ? 'caution' : 'fair',
      detail: eoMaxDiff === undefined ? 'Not reported by backend' : eoMaxDiff > 0.2 ? 'Error-rate gap needs review' : 'Within threshold',
    },
    {
      label: 'Predictive Parity',
      value: ppDiff !== undefined ? ppDiff.toFixed(2) : '—',
      threshold: 'Precision gap target: <= 0.1',
      status: ppDiff === undefined ? 'unavailable' : ppDiff > 0.1 ? 'caution' : 'fair',
      detail: ppDiff === undefined ? 'Not reported by backend' : ppDiff > 0.1 ? 'Precision gap needs review' : 'Within threshold',
    },
  ];

  const unavailableMetrics = metrics.filter((m) => m.status === 'unavailable');
  const riskMetrics = metrics.filter((m) => m.status === 'risk');
  const violations = metrics.filter((m) => m.status === 'risk').length;
  const proxyCount = (r.proxy_flags ?? []).length;
  const executiveSummary = (() => {
    if (riskMetrics.length === 0 && proxyCount === 0) {
      return 'The current run is within the primary fairness thresholds and does not show proxy warnings.';
    }
    const items = [
      di < 0.8 ? 'disparate impact is below the 80% rule' : null,
      dp > 0.2 ? 'demographic parity spread is above the guidance line' : null,
      proxyCount > 0 ? `${proxyCount} proxy feature${proxyCount > 1 ? 's' : ''} are still correlated with protected attributes` : null,
    ].filter(Boolean);
    return `The run shows ${items.join('; ')}.`;
  })();
  const nextActions = [
    di < 0.8 ? 'Inspect the affected groups and consider reweighting or threshold adjustment.' : null,
    proxyCount > 0 ? 'Open Bias Details to review the proxy heatmap before export.' : null,
    unavailableMetrics.length > 0 ? 'Fill the missing metric gaps before sign-off.' : null,
    'Run a What-If simulation to test a mitigation idea.',
  ].filter((item, index, list) => Boolean(item) && list.indexOf(item) === index).slice(0, 3) as string[];

  // ── Export PDF handler ─────────────────────────────────────────────
  async function handleExport() {
    if (!file) return;
    setIsExporting(true);
    try {
      const blob = await exportReport(file, targetColumn, sensitiveColumns, domain);
      triggerDownload(blob, 'parity_bias_report.pdf');
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      <Navbar variant="app" />

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Top bar */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>
                {analysisResult.filename}
              </span>
              <span className="text-xs text-[#9CA3AF]">·</span>
              <span className="text-xs text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>
                target: {analysisResult.target_column}
              </span>
              <span className="text-xs text-[#9CA3AF]">·</span>
              <span className="text-xs text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>
                {analysisResult.domain}
              </span>
            </div>
            <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1.75rem', color: '#111827' }}>
              Bias Analysis Dashboard
            </h1>
          </div>
          <div className="flex gap-3">
            <Link to="/app/analysis/details">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm text-[#374151] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                Drilldown <ChevronRight size={14} />
              </button>
            </Link>
            <PrimaryButton size="sm" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {isExporting ? 'Exporting…' : 'Export Report'}
            </PrimaryButton>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,0.95fr)] mb-8">
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Executive summary
                </div>
                <h2 className="mt-1 text-lg font-semibold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  What this run says
                </h2>
              </div>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: violations > 0 ? '#FEF2F2' : proxyCount > 0 ? '#FFFBEB' : '#ECFDF5',
                  color: violations > 0 ? '#DC2626' : proxyCount > 0 ? '#D97706' : '#059669',
                }}
              >
                {violations > 0 ? 'Mitigation required' : proxyCount > 0 ? 'Review recommended' : 'Ready'}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#374151]" style={{ fontFamily: 'Inter, sans-serif' }}>
              {executiveSummary}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniSummary label="Risk score" value={`${r.bias_risk_score}/100`} note={r.risk_level} />
              <MiniSummary label="Metrics reported" value={`${metrics.length - unavailableMetrics.length}/${metrics.length}`} note="Live from backend" />
              <MiniSummary label="Proxy flags" value={String(proxyCount)} note={proxyCount > 0 ? 'Needs review' : 'None detected'} />
            </div>
          </section>

          <aside className="rounded-2xl border border-[#E5E7EB] bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Next actions
            </div>
            <ul className="mt-3 space-y-3">
              {nextActions.map((item) => (
                <li key={item} className="flex gap-3 rounded-xl border border-[#F3F4F6] bg-[#FAFAFA] px-3 py-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#2563EB] flex-shrink-0" />
                  <span className="text-sm text-[#374151]" style={{ fontFamily: 'Inter, sans-serif' }}>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/app/analysis/whatif" className="text-xs font-medium rounded-lg border border-[#E5E7EB] px-3 py-2 text-[#374151] hover:border-[#10B981] hover:text-[#10B981] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                Open What-If
              </Link>
              <Link to="/app/analysis/details" className="text-xs font-medium rounded-lg border border-[#E5E7EB] px-3 py-2 text-[#374151] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                View drilldown
              </Link>
            </div>
          </aside>
        </div>

        {/* Score + Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-8">
          <div className="flex justify-center items-center bg-white rounded-2xl border border-[#E5E7EB] p-6">
            <ProgressRing value={r.bias_risk_score} label="Bias Risk Score" />
          </div>
          <div className="col-span-1 md:col-span-3 lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <FairnessMetricCard
                key={m.label}
                label={m.label}
                value={m.value}
                status={m.status}
                threshold={m.threshold}
                detail={m.detail}
              />
            ))}
          </div>
        </div>

        {/* Violations alert */}
        {violations > 0 && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 mb-8 flex items-start gap-3">
            <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
            <div>
              <span className="font-semibold text-sm" style={{ color: '#EF4444', fontFamily: 'DM Sans, sans-serif' }}>
                {violations} critical fairness violation{violations > 1 ? 's' : ''} detected
              </span>
              <p className="text-xs mt-1" style={{ color: '#B91C1C', fontFamily: 'Inter, sans-serif' }}>
                Risk level: <strong>{r.risk_level}</strong> · Model accuracy: <strong>{(r.model_accuracy * 100).toFixed(1)}%</strong>
              </p>
            </div>
          </div>
        )}

        {/* Group Comparison Chart */}
        <div className="grid lg:grid-cols-5 gap-8 mb-8">
          <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E5E7EB] p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.0625rem', color: '#111827' }}>
                Group Comparison — Positive Prediction Rate
              </h2>
              <button
                type="button"
                onClick={() => setShowGroupChartHelp((value) => !value)}
                aria-expanded={showGroupChartHelp}
                className="text-xs text-[#6B7280] hover:text-[#374151] flex items-center gap-1"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <Info size={12} /> How to read
              </button>
            </div>
            <p className="text-xs text-[#9CA3AF] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
              Dashed line = 80% of majority group rate (legal threshold). Bars below indicate potential violations.
            </p>
            {showGroupChartHelp && (
              <div className="mb-5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-sm text-[#1D4ED8]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Compare each group against the highest positive prediction rate. Blue bars are close to the leading group, amber bars need review, and red bars indicate a material gap that should be investigated before export.
              </div>
            )}
            {groupChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={groupChartData} barSize={44}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="group" tick={{ fontFamily: 'Inter', fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontFamily: 'JetBrains Mono', fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ payload, label }) => {
                        if (!payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm p-3" style={{ fontFamily: 'Inter' }}>
                            <div className="font-semibold text-sm text-[#111827] mb-1">{label}</div>
                            <div className="text-xs text-[#6B7280]">Positive rate: <span className="font-mono font-bold">{d.rate}%</span></div>
                            <div className="text-xs text-[#6B7280]">Attribute: <span className="font-mono">{d.attr}</span></div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                      {groupChartData.map((entry, i) => (
                        <Cell key={i} fill={barColor(entry.rate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 flex items-center gap-4 flex-wrap">
                  {[
                    { color: '#3B82F6', label: 'Fair (DI ≥ 0.8)' },
                    { color: '#F59E0B', label: 'Caution (0.6–0.8)' },
                    { color: '#EF4444', label: 'Violation (< 0.6)' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                      <span className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Group comparison data not available for this dataset configuration.
              </div>
            )}
          </div>

          {/* Proxy Flags + readiness panels */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
              <h2 className="mb-4" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.0625rem', color: '#111827' }}>
                Proxy Feature Detection
              </h2>
              {(r.proxy_flags ?? []).length === 0 ? (
                <div className="text-sm text-[#9CA3AF] flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <CheckCircle size={16} className="text-green-500" /> No high-risk proxy features detected.
                </div>
              ) : (
                <div className="space-y-3">
                  {(r.proxy_flags ?? []).map((flag, i) => (
                    <div key={i} className="rounded-lg p-3 border" style={{
                      backgroundColor: flag.risk_level === 'HIGH' ? '#FEF2F2' : '#FFFBEB',
                      borderColor: flag.risk_level === 'HIGH' ? '#FECACA' : '#FDE68A',
                    }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: flag.risk_level === 'HIGH' ? '#991B1B' : '#92400E' }}>
                          {flag.feature}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                          backgroundColor: flag.risk_level === 'HIGH' ? '#FEE2E2' : '#FEF3C7',
                          color: flag.risk_level === 'HIGH' ? '#DC2626' : '#D97706',
                        }}>
                          {flag.risk_level}
                        </span>
                      </div>
                      <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#6B7280' }}>
                        Proxies <strong>{flag.sensitive_attribute}</strong>
                        {flag.correlation ? ` (r=${flag.correlation.toFixed(2)})` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-[#F3F4F6]">
                <p className="text-xs text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Detected via Pearson correlation + SHAP differential importance
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.0625rem', color: '#111827' }}>
                    Audit Readiness
                  </h2>
                  <p className="text-xs text-[#9CA3AF] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Uses the metrics already returned by the analysis run. Missing values stay missing.
                  </p>
                </div>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: unavailableMetrics.length > 0 ? '#F3F4F6' : riskMetrics.length > 0 ? '#FEF2F2' : '#ECFDF5',
                    color: unavailableMetrics.length > 0 ? '#6B7280' : riskMetrics.length > 0 ? '#DC2626' : '#059669',
                  }}
                >
                  {unavailableMetrics.length > 0 ? 'Evidence incomplete' : riskMetrics.length > 0 ? 'Mitigation required' : 'Ready for review'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <div className="text-xs text-[#6B7280] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>Reported metrics</div>
                  <div className="text-2xl font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {metrics.length - unavailableMetrics.length}/{metrics.length}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <div className="text-xs text-[#6B7280] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>Proxy flags</div>
                  <div className="text-2xl font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {(r.proxy_flags ?? []).length}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {unavailableMetrics.length > 0 && (
                  <ReadinessStep tone="neutral" title="Close the evidence gap" body={unavailableMetrics.map((m) => m.label).join(' and ')} />
                )}
                {di < 0.8 && (
                  <ReadinessStep tone="risk" title="Address representation imbalance" body="Disparate impact is below the threshold, so the demo should call out the affected groups before sign-off." />
                )}
                {dp > 0.2 && (
                  <ReadinessStep tone="risk" title="Reduce parity spread" body="Demographic parity difference remains above the 20% guidance line." />
                )}
                {(r.proxy_flags ?? []).length > 0 && (
                  <ReadinessStep tone="caution" title="Review proxy features" body={`${(r.proxy_flags ?? []).length} proxy feature(s) still correlate with protected attributes.`} />
                )}
                {unavailableMetrics.length === 0 && di >= 0.8 && dp <= 0.2 && (r.proxy_flags ?? []).length === 0 && (
                  <ReadinessStep tone="fair" title="Ready to export" body="The current run has no reported metric gaps, no major parity violations, and no proxy warnings." />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SHAP Feature Importance */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.0625rem', color: '#111827' }}>
                Feature Importance (SHAP Values)
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                Features marked ⚠ correlate with protected attributes (&gt;0.5 correlation)
              </p>
            </div>
            <button
              onClick={() => setShowExplanation(true)}
              className="text-xs font-medium px-4 py-2 rounded-lg border border-[#BFDBFE] text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Explain This Bias
            </button>
          </div>

          {shapData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <HBarChart data={shapData} layout="vertical" barSize={14} margin={{ left: 100, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => v.toFixed(3)} tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="feature"
                  tick={({ x, y, payload }) => {
                    const isProxy = shapData.find((d) => d.feature === payload.value)?.isProxy;
                    return (
                      <g>
                        {isProxy && <text x={x - 96} y={y} textAnchor="start" dominantBaseline="middle" fontSize={10} fill="#F59E0B">⚠</text>}
                        <text x={x - 4} y={y} textAnchor="end" dominantBaseline="middle" fontSize={11} fontFamily="JetBrains Mono" fill={isProxy ? '#EF4444' : '#374151'}>
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                  axisLine={false} tickLine={false} width={100}
                />
                <Tooltip formatter={(v: number) => [v.toFixed(4), 'Importance']} contentStyle={{ fontFamily: 'Inter', fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {shapData.map((entry, i) => (
                    <Cell key={i} fill={entry.isProxy ? '#EF4444' : '#3B82F6'} />
                  ))}
                </Bar>
              </HBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-[#9CA3AF]">
              Feature importance data not available.
            </div>
          )}

          <div className="flex gap-4 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#3B82F6]" /><span className="text-xs text-[#6B7280]">Neutral feature</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#EF4444]" /><span className="text-xs text-[#6B7280]">Proxy for protected attribute</span></div>
          </div>

          <div className="mt-6 flex gap-3 flex-wrap">
            <Link to="/app/analysis/details">
              <button className="text-xs font-medium px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#374151] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                View Proxy Heatmap →
              </button>
            </Link>
            <Link to="/app/analysis/whatif">
              <button className="text-xs font-medium px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#374151] hover:border-[#10B981] hover:text-[#10B981] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                Open What-If Explorer →
              </button>
            </Link>
            <Link to="/app/analysis/report">
              <button className="text-xs font-medium px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#374151] hover:border-[#D97706] hover:text-[#D97706] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                Generate Report →
              </button>
            </Link>
          </div>
        </div>

        {/* AI Explanation Panel */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.0625rem', color: '#111827' }}>
              AI Explanation
            </h2>
            <span className="text-[11px] text-[#9CA3AF] font-mono ml-auto">
              Powered by Groq / LLaMA
            </span>
          </div>
          <p className="text-sm leading-relaxed text-[#374151] whitespace-pre-wrap" style={{ fontFamily: 'Inter, sans-serif' }}>
            {r.explanation || 'No explanation available. Ensure GROQ_API_KEY is set in backend/.env'}
          </p>
          {(r.citations ?? []).length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#F3F4F6]">
              <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Citations</p>
              <ul className="space-y-1">
                {r.citations.map((c, i) => (
                  <li key={i} className="text-xs text-[#6B7280] font-mono">[{i + 1}] {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Explanation Drawer */}
      {showExplanation && <ExplanationDrawer result={r} onClose={() => setShowExplanation(false)} />}
    </div>
  );
}

function CheckCircle({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 4 12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FairnessMetricCard({
  label,
  value,
  status,
  threshold,
  detail,
}: {
  label: string;
  value: string;
  status: 'fair' | 'caution' | 'risk' | 'unavailable';
  threshold: string;
  detail: string;
}) {
  const config = {
    fair: { color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', tag: 'Fair' },
    caution: { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', tag: 'Caution' },
    risk: { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', tag: 'Risk' },
    unavailable: { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', tag: 'Unavailable' },
  }[status];

  return (
    <div className="rounded-xl p-5 border bg-white" style={{ borderColor: config.border }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">{label}</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: config.color, backgroundColor: config.bg }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
          {config.tag}
        </span>
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color: config.color, fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </div>
      <div className="text-xs text-[#6B7280] mt-1">{threshold}</div>
      <div className="text-xs mt-2" style={{ color: config.color }}>
        {detail}
      </div>
    </div>
  );
}

function ReadinessStep({
  tone,
  title,
  body,
}: {
  tone: 'fair' | 'caution' | 'risk' | 'neutral';
  title: string;
  body: string;
}) {
  const palette = {
    fair: { dot: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
    caution: { dot: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
    risk: { dot: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
    neutral: { dot: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  }[tone];

  return (
    <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: palette.bg, borderColor: palette.border }}>
      <div className="flex items-start gap-3">
        <span className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: palette.dot }} />
        <div>
          <div className="text-sm font-semibold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{title}</div>
          <p className="text-xs text-[#6B7280] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{body}</p>
        </div>
      </div>
    </div>
  );
}

function ExplanationDrawer({ result, onClose }: { result: ReturnType<typeof useAnalysis>['analysisResult']['results']; onClose: () => void }) {
  const proxyFlags = result?.proxy_flags ?? [];
  const explanation = result?.explanation ?? '';
  const citations = result?.citations ?? [];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-50 overflow-y-auto shadow-2xl" style={{ animation: 'slideInRight 0.3s ease' }}>
        <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between sticky top-0 bg-white">
          <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: '#111827' }}>Why This Bias Exists</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151] text-xl">✕</button>
        </div>
        <div className="p-6 space-y-6">
          {explanation ? (
            <p className="text-sm leading-relaxed text-[#374151]" style={{ fontFamily: 'Inter, sans-serif' }}>{explanation}</p>
          ) : (
            <p className="text-sm text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>AI explanation not available.</p>
          )}
          {citations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Citations</p>
              <ul className="space-y-1">
                {citations.map((c, i) => (
                  <li key={i} className="text-xs text-[#6B7280] font-mono">[{i + 1}] {c}</li>
                ))}
              </ul>
            </div>
          )}
          {proxyFlags.length > 0 && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[#991B1B] mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>Detected Proxy Features</h3>
              <ul className="space-y-1">
                {proxyFlags.map((p, i) => (
                  <li key={i} className="text-xs text-[#B91C1C] font-mono">
                    {p.feature} → proxies {p.sensitive_attribute}
                    {p.correlation ? ` (r=${p.correlation.toFixed(2)})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function RecoverableEmptyState() {
  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      <Navbar variant="app" />
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-24">
        <div className="w-full rounded-2xl border border-[#E5E7EB] bg-white p-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Recoverable state
          </div>
          <h1 className="mt-2 text-2xl font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            No analysis is loaded
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#374151]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Upload a CSV or open a demo dataset to recover the analysis flow. Once a run exists in session storage, this page restores the saved summary and selections instead of redirecting away.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/app/upload" className="inline-flex items-center rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1D4ED8]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Go to upload
            </Link>
            <Link to="/app/onboard" className="inline-flex items-center rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#374151] hover:border-[#3B82F6] hover:text-[#3B82F6]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Start from onboarding
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniSummary({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
      <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>{label}</div>
      <div className="mt-1 text-lg font-semibold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{value}</div>
      <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>{note}</div>
    </div>
  );
}
