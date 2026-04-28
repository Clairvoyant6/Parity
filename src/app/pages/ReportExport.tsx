import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Navbar } from '../components/Navbar';
import { PrimaryButton } from '../components/ui/Button';
import { ChevronLeft, Download, Code, Copy, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';
import { exportReport, triggerDownload } from '../../services/api';

export function ReportExport() {
  const navigate = useNavigate();
  const { analysisResult, file, targetColumn, sensitiveColumns, domain } = useAnalysis();
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!analysisResult) navigate('/app/upload');
  }, [analysisResult, navigate]);

  if (!analysisResult) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F9FAFB' }}>
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  const r = analysisResult.results;
  const di = r.disparate_impact_ratio ?? r.disparate_impact_avg ?? 1;
  const dp = r.demographic_parity_difference ?? r.demographic_parity_avg ?? 0;
  const eo = r.equalized_odds ?? 1;

  // Compliance checks derived from live metrics
  const complianceChecks = [
    {
      regulation: 'EU AI Act Art. 10',
      scope: 'Training data & bias testing',
      check: 'Disparate Impact ≥ 0.8 for all groups',
      status: di >= 0.8,
      detail: `DI ratio: ${di.toFixed(3)}`,
    },
    {
      regulation: 'NYC Local Law 144',
      scope: 'Hiring AI annual audit',
      check: 'Demographic parity difference < 20%',
      status: dp < 0.2,
      detail: `Dem. Parity Diff: ${(dp * 100).toFixed(1)}%`,
    },
    {
      regulation: 'ECOA / Fair Housing',
      scope: 'Credit/mortgage algorithms',
      check: 'No protected class disparate impact',
      status: di >= 0.8 && (r.proxy_flags?.length ?? 0) === 0,
      detail: (r.proxy_flags?.length ?? 0) > 0 ? `${r.proxy_flags!.length} proxy feature(s) detected` : 'No proxy features',
    },
    {
      regulation: 'UK Equality Act 2010',
      scope: 'Indirect discrimination',
      check: 'Model does not adversely affect protected groups',
      status: r.risk_level === 'LOW',
      detail: `Risk level: ${r.risk_level}`,
    },
    {
      regulation: 'Equalized Odds',
      scope: 'Error rate parity',
      check: 'Equalized Odds ≥ 0.8',
      status: eo >= 0.8,
      detail: `EO: ${eo.toFixed(3)}`,
    },
    {
      regulation: 'Model Accuracy',
      scope: 'Predictive performance',
      check: 'Model accuracy > 60%',
      status: r.model_accuracy > 0.6,
      detail: `Accuracy: ${(r.model_accuracy * 100).toFixed(1)}%`,
    },
  ];

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.origin + '/app/analysis/report');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadJSON() {
    const data = {
      analysisId: analysisResult.filename.replace(/\W/g, '_'),
      dataset: analysisResult.filename,
      targetColumn: analysisResult.target_column,
      sensitiveColumns: analysisResult.sensitive_columns,
      domain: analysisResult.domain,
      date: new Date().toISOString().split('T')[0],
      riskLevel: r.risk_level,
      biasRiskScore: r.bias_risk_score,
      metrics: {
        disparateImpact: di,
        demographicParityDiff: dp,
        equalizedOdds: eo,
        modelAccuracy: r.model_accuracy,
      },
      proxyFlags: r.proxy_flags ?? [],
      featureImportance: r.feature_importance ?? [],
      explanation: r.explanation ?? '',
      citations: r.citations ?? [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `parity_report_${analysisResult.filename.replace(/\W/g, '_')}.json`);
  }

  async function handleDownloadPDF() {
    if (!file) return;
    setIsExporting(true);
    try {
      const blob = await exportReport(file, targetColumn, sensitiveColumns, domain);
      triggerDownload(blob, `parity_report_${analysisResult.filename.replace(/\W/g, '_')}.pdf`);
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setIsExporting(false);
    }
  }

  const passCount = complianceChecks.filter((c) => c.status).length;

  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      <Navbar variant="app" />

      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link to="/app/analysis" className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#374151] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
            <ChevronLeft size={14} /> Dashboard
          </Link>
          <span className="text-[#D1D5DB]">/</span>
          <span className="text-sm font-medium text-[#374151]" style={{ fontFamily: 'Inter, sans-serif' }}>Report Export</span>
        </div>

        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1.75rem', color: '#111827' }}>
            Bias Audit Report
          </h1>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadJSON}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm text-[#374151] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors bg-white"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <Code size={14} /> Download JSON
            </button>
            <PrimaryButton size="sm" onClick={handleDownloadPDF} disabled={isExporting || !file}>
              {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {isExporting ? 'Generating…' : 'Download PDF'}
            </PrimaryButton>
          </div>
        </div>

        {/* Report Preview */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm mb-8">
          {/* Header */}
          <div className="bg-[#1E3A5F] px-8 py-8 text-white">
            <div className="flex items-center gap-3 mb-6">
              <LogoIcon />
              <div>
                <div className="text-xl font-bold" style={{ fontFamily: 'DM Sans, sans-serif' }}>Parity AI Bias Audit Report</div>
                <div className="text-xs text-[#93C5FD] mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>Powered by AIF360 + SHAP + Groq</div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><div className="text-[#93C5FD] text-xs mb-1">Dataset</div><div className="font-mono text-sm truncate">{analysisResult.filename}</div></div>
              <div><div className="text-[#93C5FD] text-xs mb-1">Target</div><div className="font-mono text-sm">{analysisResult.target_column}</div></div>
              <div><div className="text-[#93C5FD] text-xs mb-1">Domain</div><div className="font-mono text-sm capitalize">{analysisResult.domain}</div></div>
              <div><div className="text-[#93C5FD] text-xs mb-1">Date</div><div className="font-mono text-sm">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="px-8 py-6 border-b border-[#F3F4F6]">
            <h3 className="mb-4" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: '#111827' }}>Executive Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Bias Risk Score', value: `${r.bias_risk_score.toFixed(0)}/100`, color: r.bias_risk_score >= 70 ? '#EF4444' : r.bias_risk_score >= 40 ? '#F59E0B' : '#10B981', note: r.risk_level },
                { label: 'Disparate Impact', value: di.toFixed(3), color: di < 0.8 ? '#EF4444' : '#10B981', note: di < 0.8 ? 'Violation' : 'Fair' },
                { label: 'Proxy Features', value: String(r.proxy_flags?.length ?? 0), color: (r.proxy_flags?.length ?? 0) > 0 ? '#F59E0B' : '#10B981', note: (r.proxy_flags?.length ?? 0) > 0 ? 'Detected' : 'None' },
                { label: 'Compliance', value: `${passCount}/${complianceChecks.length}`, color: passCount === complianceChecks.length ? '#10B981' : passCount >= 4 ? '#F59E0B' : '#EF4444', note: passCount === complianceChecks.length ? 'Passed' : 'Issues Found' },
              ].map((m) => (
                <div key={m.label} className="p-3 rounded-xl border border-[#E5E7EB] text-center">
                  <div className="text-xl font-bold mb-0.5" style={{ color: m.color, fontFamily: 'DM Sans, sans-serif' }}>{m.value}</div>
                  <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>{m.label}</div>
                  <div className="text-xs font-medium mt-1" style={{ color: m.color, fontFamily: 'Inter, sans-serif' }}>{m.note}</div>
                </div>
              ))}
            </div>
            {r.explanation && (
              <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-lg p-4">
                <p className="text-sm text-[#374151] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <strong>AI Finding:</strong> {r.explanation.slice(0, 400)}{r.explanation.length > 400 ? '…' : ''}
                </p>
              </div>
            )}
          </div>

          {/* Proxy features */}
          {(r.proxy_flags ?? []).length > 0 && (
            <div className="px-8 py-6 border-b border-[#F3F4F6]">
              <h3 className="mb-4" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: '#111827' }}>Identified Proxy Features</h3>
              <div className="grid grid-cols-2 gap-3">
                {r.proxy_flags!.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2]">
                    <span className="text-[#EF4444]">⚠</span>
                    <div>
                      <div className="text-sm font-bold text-[#991B1B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{p.feature}</div>
                      <div className="text-xs text-[#B91C1C]" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {p.correlation ? `r=${p.correlation.toFixed(2)} ` : ''} proxies {p.sensitive_attribute}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Compliance Checklist */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm mb-8">
          <div className="px-8 py-6 border-b border-[#F3F4F6]">
            <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.125rem', color: '#111827' }}>
              Regulatory Compliance Checklist
            </h2>
          </div>
          <div className="divide-y divide-[#F9FAFB]">
            {complianceChecks.map((item) => (
              <div key={item.regulation} className="px-8 py-4 flex items-center gap-4">
                <div className="flex-shrink-0">
                  {item.status ? (
                    <CheckCircle size={20} style={{ color: '#10B981' }} />
                  ) : (
                    <AlertCircle size={20} style={{ color: '#EF4444' }} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{item.regulation}</span>
                    <span className="text-xs text-[#9CA3AF]">— {item.scope}</span>
                  </div>
                  <div className="text-xs text-[#6B7280] mt-0.5">{item.check}</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: item.status ? '#ECFDF5' : '#FEF2F2', color: item.status ? '#10B981' : '#EF4444' }}>
                    {item.status ? '✓ Pass' : '✗ Fail'}
                  </span>
                  <div className="text-xs text-[#9CA3AF] mt-1 font-mono">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <PrimaryButton size="lg" onClick={handleDownloadPDF} disabled={isExporting || !file}>
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {isExporting ? 'Generating PDF…' : 'Download PDF Report'}
          </PrimaryButton>
          <button
            onClick={handleDownloadJSON}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#E5E7EB] text-sm text-[#374151] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors bg-white"
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem' }}
          >
            <Code size={18} /> Download JSON
          </button>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#E5E7EB] text-sm text-[#374151] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors bg-white"
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem' }}
          >
            {copied ? <CheckCircle size={18} style={{ color: '#10B981' }} /> : <Copy size={18} />}
            {copied ? 'Copied!' : 'Copy Audit URL'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LogoIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="14" fill="#3B82F6" />
      <rect x="13" y="6" width="2" height="16" rx="1" fill="white" />
      <rect x="8" y="10" width="12" height="1.5" rx="0.75" fill="white" />
      <path d="M6 15.5 Q8.5 13 11 15.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M17 15.5 Q19.5 13 22 15.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
