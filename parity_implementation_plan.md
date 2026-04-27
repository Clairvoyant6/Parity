# PARITY — Full-Stack Integration & Enhancement Plan
**For use in Anty / Antigravity AI Code Editor**
April 2026 | React + Vite + TypeScript (Frontend) · FastAPI + AIF360 (Backend)

---

## OVERVIEW OF CHANGES

This plan covers four distinct work streams:

1. **Backend ↔ Frontend wiring** — Connect all React pages to the FastAPI backend via a typed API service layer.
2. **"About" page** — Build the marketing/landing page with an **orange** accent palette matching Cloud7's warm-gradient aesthetic (replacing the current blue).
3. **Remove pricing/subscription** — Strip all pricing tiers, billing UI, and upgrade CTAs from every page.
4. **Dashboard upgrade** — Replace the static mock chart with live D3.js charts wired to real `/api/analyze` response data.

---

## PART 0 — PROJECT STRUCTURE (TARGET STATE)

```
parity/
├── backend/                        # (existing — do not refactor)
│   ├── main.py
│   ├── app/
│   │   ├── api/routes.py
│   │   ├── core/config.py
│   │   ├── services/bias_engine.py
│   │   └── ...
│   └── .env                        # Add GROQ_API_KEY here
│
└── frontend/                       # Vite + React + TS
    ├── index.html
    ├── vite.config.ts              # Add proxy: /api → localhost:8000
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx                 # React Router v7 layout
    │   ├── styles/
    │   │   └── tokens.css          # CSS custom props for both blue & orange palettes
    │   ├── services/
    │   │   └── api.ts              # ← single source of truth for all backend calls
    │   ├── types/
    │   │   └── analysis.ts         # TypeScript types matching backend JSON shapes
    │   ├── pages/
    │   │   ├── LandingPage.tsx     # /  ← ORANGE theme
    │   │   ├── OnboardPage.tsx     # /app/onboard
    │   │   ├── UploadPage.tsx      # /app/upload
    │   │   ├── DashboardPage.tsx   # /app/analysis/:id
    │   │   └── WhatIfPage.tsx      # /app/analysis/:id/whatif
    │   └── components/
    │       ├── SideNav.tsx
    │       ├── charts/
    │       │   ├── BiasBarChart.tsx  # D3 group comparison
    │       │   ├── RiskRing.tsx      # Animated SVG ring
    │       │   └── ShapChart.tsx     # SHAP horizontal bars
    │       └── ui/                   # shadcn primitives already in package.json
```

---

## PART 1 — VITE PROXY (CRITICAL FIRST STEP)

In `vite.config.ts`, add the dev proxy so the frontend can call `/api/*` without CORS issues during development:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

> **Backend startup command:** `cd backend && uvicorn main:app --reload --port 8000`

---

## PART 2 — TYPE DEFINITIONS (`src/types/analysis.ts`)

Create this file so every component has the same understanding of backend shapes:

```ts
// src/types/analysis.ts

export interface GroupMetric {
  group_name: string;
  approval_rate: number;
  count: number;
}

export interface BiasMetrics {
  bias_risk_score: number;           // 0–100
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  disparate_impact_ratio: number;    // threshold >0.8
  demographic_parity_difference: number; // threshold <0.2
  equalized_odds: number;            // threshold >0.8
  predictive_parity: number;         // threshold >0.9
  model_accuracy: number;
  group_metrics: Record<string, GroupMetric[]>;
  feature_importance: Array<{ feature: string; shap_value: number }>;
  proxy_flags: string[];
  explanation: string;
  citations: string[];
  sources: string[];
}

export interface AnalyzeResponse {
  status: 'success' | 'error';
  filename: string;
  target_column: string;
  sensitive_columns: string[];
  domain: string;
  results: BiasMetrics;
}

export interface PreviewResponse {
  columns: string[];
  shape: { rows: number; cols: number };
  preview: Record<string, unknown>[];
}

export interface WhatIfResponse {
  changed_feature: string;
  original_value: string;
  new_value: string;
  original_risk_score: number;
  modified_risk_score: number;
  impact: 'IMPROVED' | 'WORSENED';
  original_metrics: BiasMetrics;
  modified_metrics: BiasMetrics;
}
```

---

## PART 3 — API SERVICE LAYER (`src/services/api.ts`)

Single file that wraps all backend endpoints. Every page imports from here — never calls `fetch` directly.

```ts
// src/services/api.ts
import type { AnalyzeResponse, PreviewResponse, WhatIfResponse } from '../types/analysis';

const BASE = '/api';

export async function previewCSV(file: File): Promise<PreviewResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/preview`, { method: 'POST', body: form });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}

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
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}

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
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}

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

// Store uploaded file in sessionStorage reference (not the file itself)
// Use React Context or Zustand to pass the File object between pages
```

---

## PART 4 — GLOBAL STATE (React Context)

Create `src/context/AnalysisContext.tsx` to share the uploaded file, analysis result, and column selections across pages without prop-drilling:

```tsx
// src/context/AnalysisContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import type { AnalyzeResponse } from '../types/analysis';

interface AnalysisState {
  file: File | null;
  setFile: (f: File | null) => void;
  targetColumn: string;
  setTargetColumn: (s: string) => void;
  sensitiveColumns: string[];
  setSensitiveColumns: (s: string[]) => void;
  domain: string;
  setDomain: (s: string) => void;
  analysisResult: AnalyzeResponse | null;
  setAnalysisResult: (r: AnalyzeResponse | null) => void;
}

const Ctx = createContext<AnalysisState | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [sensitiveColumns, setSensitiveColumns] = useState<string[]>([]);
  const [domain, setDomain] = useState('general');
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);

  return (
    <Ctx.Provider value={{
      file, setFile, targetColumn, setTargetColumn,
      sensitiveColumns, setSensitiveColumns, domain, setDomain,
      analysisResult, setAnalysisResult
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAnalysis = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAnalysis must be inside AnalysisProvider');
  return ctx;
};
```

Wrap `App.tsx` with `<AnalysisProvider>`.

---

## PART 5 — ROUTING (`src/App.tsx`)

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router';
import { AnalysisProvider } from './context/AnalysisContext';
import LandingPage    from './pages/LandingPage';
import OnboardPage    from './pages/OnboardPage';
import UploadPage     from './pages/UploadPage';
import DashboardPage  from './pages/DashboardPage';
import WhatIfPage     from './pages/WhatIfPage';

export default function App() {
  return (
    <AnalysisProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                           element={<LandingPage />} />
          <Route path="/app/onboard"                element={<OnboardPage />} />
          <Route path="/app/upload"                 element={<UploadPage />} />
          <Route path="/app/analysis"               element={<DashboardPage />} />
          <Route path="/app/analysis/whatif"        element={<WhatIfPage />} />
        </Routes>
      </BrowserRouter>
    </AnalysisProvider>
  );
}
```

---

## PART 6 — UPLOAD PAGE WIRING (`src/pages/UploadPage.tsx`)

This page replaces the static HTML design. Key integration points:

**Step 1 — File drop triggers `/api/preview`:**
```tsx
const onFileDrop = async (file: File) => {
  setFile(file);  // store in context
  setLoading(true);
  try {
    const preview = await previewCSV(file);
    setColumns(preview.columns);
    setPreviewRows(preview.preview);
    setStep(1); // unlock Data Preview panel
  } catch (e) {
    setError(String(e));
  } finally {
    setLoading(false);
  }
};
```

**Step 2 — Column selectors populate from `preview.columns`.**

**Step 3 — "Start Analysis" button triggers `/api/analyze`:**
```tsx
const onStartAnalysis = async () => {
  if (!file || !targetColumn || sensitiveColumns.length === 0) return;
  setLoading(true);
  try {
    const result = await analyzeDataset(file, targetColumn, sensitiveColumns, domain);
    setAnalysisResult(result);  // store in context
    navigate('/app/analysis');
  } catch (e) {
    setError(String(e));
  } finally {
    setLoading(false);
  }
};
```

Use `react-dropzone` (already in `package.json`) for the drop zone.

---

## PART 7 — DASHBOARD PAGE (UPGRADED)

This is the most critical upgrade. Replace all static mock data with live data from `analysisResult` in context.

### 7.1 Overall Risk Ring

Replace the static SVG ring with a `RiskRing` component that reads `results.bias_risk_score`:

```tsx
// src/components/charts/RiskRing.tsx
import { useEffect, useRef } from 'react';

interface Props { score: number; } // 0–100

export function RiskRing({ score }: Props) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const ringColor =
    score >= 70 ? '#b12600' :   // high risk — tertiary-container
    score >= 40 ? '#F59E0B' :   // caution — amber
    '#10B981';                   // fair — green

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none"
          stroke="#222a3d" strokeWidth="6" />
        <circle cx="50" cy="50" r={radius} fill="none"
          stroke={ringColor} strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[48px] font-bold text-on-surface leading-none">{score}</span>
        <span className="text-[12px] text-on-surface-variant mt-1">/ 100</span>
      </div>
    </div>
  );
}
```

### 7.2 Metric Cards

Four cards reading directly from the results object:

```tsx
// In DashboardPage.tsx
const { analysisResult } = useAnalysis();
const r = analysisResult?.results;

const metrics = [
  {
    label: 'Disparate Impact',
    value: r?.disparate_impact_ratio?.toFixed(2),
    threshold: '>0.8',
    status: (r?.disparate_impact_ratio ?? 0) < 0.8 ? 'RISK' : 'FAIR',
    icon: 'group_remove',
  },
  {
    label: 'Demographic Parity',
    value: r?.demographic_parity_difference?.toFixed(2),
    threshold: '<0.2',
    status: (r?.demographic_parity_difference ?? 1) > 0.2 ? 'CAUTION' : 'FAIR',
    icon: 'balance',
  },
  {
    label: 'Equalized Odds',
    value: r?.equalized_odds?.toFixed(2),
    threshold: '>0.8',
    status: (r?.equalized_odds ?? 0) < 0.8 ? 'CAUTION' : 'FAIR',
    icon: 'equalizer',
  },
  {
    label: 'Predictive Parity',
    value: r?.predictive_parity?.toFixed(2),
    threshold: '>0.9',
    status: (r?.predictive_parity ?? 0) < 0.9 ? 'CAUTION' : 'FAIR',
    icon: 'analytics',
  },
];
```

### 7.3 D3 Group Comparison Bar Chart

Replace the static height-percentage bars with a real D3 chart:

```tsx
// src/components/charts/BiasBarChart.tsx
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { GroupMetric } from '../../types/analysis';

interface Props {
  groupMetrics: Record<string, GroupMetric[]>;
}

export function BiasBarChart({ groupMetrics }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !groupMetrics) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const attributes = Object.keys(groupMetrics);
    const width = svgRef.current.clientWidth;
    const height = 220;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand().domain(attributes).rangeRound([0, innerW]).paddingInner(0.3);
    const x1 = d3.scaleBand().paddingInner(0.05);
    const y = d3.scaleLinear().rangeRound([innerH, 0]).domain([0, 1]);

    attributes.forEach(attr => {
      const groups = groupMetrics[attr];
      x1.domain(groups.map(g => g.group_name)).rangeRound([0, x0.bandwidth()]);

      g.append('g')
        .selectAll('rect')
        .data(groups)
        .join('rect')
        .attr('x', d => (x0(attr) ?? 0) + (x1(d.group_name) ?? 0))
        .attr('y', d => y(d.approval_rate))
        .attr('width', x1.bandwidth())
        .attr('height', d => innerH - y(d.approval_rate))
        .attr('rx', 3)
        .attr('fill', (_, i) => i === 0 ? '#b7c4ff' : '#434655');
    });

    // X axis
    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x0))
      .selectAll('text').style('fill', '#c4c5d7').style('font-size', '12px');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.1f')))
      .selectAll('text').style('fill', '#c4c5d7').style('font-size', '10px');
  }, [groupMetrics]);

  return <svg ref={svgRef} width="100%" height="220" />;
}
```

### 7.4 SHAP Feature Importance Chart

```tsx
// src/components/charts/ShapChart.tsx
// Reads: results.feature_importance — Array<{ feature: string; shap_value: number }>
// Renders horizontal bars sorted by shap_value descending
// Color: positive shap → primary (#b7c4ff), highest bar flagged in tertiary (#ffb4a3)
// Width: (shap_value / maxShapValue) * 100 + '%'
```

### 7.5 AI Explanation Panel (NEW)

Add a new panel below SHAP that renders `results.explanation` and `results.citations`:

```tsx
// In DashboardPage.tsx — add after SHAP section
<div className="bg-surface-container/40 border border-outline-variant rounded-xl p-6">
  <div className="flex items-center gap-2 mb-4">
    <span className="material-symbols-outlined text-secondary">psychology</span>
    <h3 className="font-headline-sm text-on-surface">AI Explanation</h3>
    <span className="text-[11px] text-outline font-mono ml-auto">Powered by Groq / LLaMA</span>
  </div>
  <p className="text-on-surface-variant text-body-md leading-relaxed whitespace-pre-wrap">
    {analysisResult?.results.explanation ?? 'No explanation available.'}
  </p>
  {analysisResult?.results.citations.length > 0 && (
    <div className="mt-4 pt-4 border-t border-outline-variant/30">
      <p className="text-label-caps text-outline mb-2">CITATIONS</p>
      <ul className="space-y-1">
        {analysisResult.results.citations.map((c, i) => (
          <li key={i} className="text-body-sm text-on-surface-variant font-mono">[{i+1}] {c}</li>
        ))}
      </ul>
    </div>
  )}
</div>
```

### 7.6 Export Report Button

Wire the "Export Report" button to call `exportReport()` from the API service:

```tsx
const onExport = async () => {
  if (!file) return;
  const blob = await exportReport(file, targetColumn, sensitiveColumns, domain);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'parity_report.pdf';
  a.click();
  URL.revokeObjectURL(url);
};
```

---

## PART 8 — WHAT-IF EXPLORER WIRING

The What-If page stores the original file via context and lets users pick a feature + value pair.

```tsx
// In WhatIfPage.tsx

// Sliders control `changedFeature`, `newValue`
// On "Run Simulation" button click:
const onRunSimulation = async () => {
  if (!file) return;
  const result = await runWhatIf(
    file, targetColumn, sensitiveColumns,
    changedFeature, originalValue, newValue
  );
  setWhatIfResult(result);
};

// Display:
// Left panel: Before card — result.original_risk_score, result.original_metrics
// Right panel: After card — result.modified_risk_score, result.modified_metrics
// Impact badge: result.impact === 'IMPROVED' → green, 'WORSENED' → red
// Trajectory chart: plot [original_risk_score, modified_risk_score] as two points
```

---

## PART 9 — ABOUT / LANDING PAGE (ORANGE THEME)

The landing page (`/`) uses an **orange accent palette** exclusively, replacing the blue used in the app. This follows the Cloud7 visual pattern: warm gradient hero, stat counters, feature grid.

### 9.1 Orange Color Tokens (add to `tokens.css`)

```css
/* tokens.css — orange theme for landing page only */
.theme-orange {
  --brand-primary: #F97316;       /* orange-500 */
  --brand-primary-light: #FDBA74; /* orange-300 */
  --brand-primary-dark: #C2410C;  /* orange-700 */
  --brand-glow: rgba(249, 115, 22, 0.25);
  --hero-bg: #0C0A09;             /* near-black warm */
  --hero-text: #FFF7ED;           /* orange-50 */
  --surface-card: #1C1917;        /* stone-900 */
  --border-card: rgba(249,115,22,0.2);
}
```

### 9.2 Landing Page Sections

**Hero Section:**
- Background: `#0C0A09` (warm near-black)
- Headline: `"Detect the Bias. Fix It."` — the word "Bias" uses CSS gradient text: `linear-gradient(135deg, #F97316, #FDBA74)`
- Subhead: `"The fairness auditing platform trusted by compliance teams, ML engineers, and regulators."`
- Two CTAs: `"Start Free Audit"` (orange filled button → `/app/onboard`) and `"View Demo"` (ghost button)
- Hero visual: Animated SVG balance scale with floating metric cards (DI: 0.82, DP: 0.15) — **use orange glow instead of blue**
- Remove all pricing/subscription references

**Stats Section (light warm background #FFF7ED):**
- Animate on scroll via `IntersectionObserver`
- Stats to display:
  - `85%` — of hiring algorithms show gender bias
  - `26.3%` — healthcare disparity in diagnostic AI
  - `44.9%` — criminal justice tools with racial bias flags
- Text color: `#1C1917` (stone-900)
- Accent bars: orange `#F97316`

**Feature Grid (2×3, dark background):**
Cards with orange icon accent, dark card surface `#1C1917`, orange border on hover:
1. Multi-Metric Bias Detection — icon: `fact_check`
2. Proxy Corruption Detector — icon: `link_off`
3. Plain-Language AI Explanations — icon: `psychology`
4. What-If Explorer — icon: `compare_arrows`
5. One-Click Compliance Report — icon: `description`
6. Domain-Specific Benchmarks — icon: `domain`

**Interactive Calculator Section:**
- Two sliders (Training data % by group, Decision threshold)
- Live D3 bar chart showing Male vs Female predicted hire rates
- Orange bar fill for the simulated group

**CTA Section (orange gradient background):**
```css
background: linear-gradient(135deg, #C2410C 0%, #F97316 50%, #FDBA74 100%);
```
- `"Start your first free audit"` heading
- Single button: `"Get Started — It's Free"` → `/app/onboard`

**Footer:**
- Dark warm background `#0C0A09`
- Logo + tagline
- **NO pricing links, NO billing links, NO subscription tiers**
- Links: Features, Docs, GitHub, Support

### 9.3 What to REMOVE (Pricing/Subscription)

Remove the following completely from the codebase:
- Any `PricingPage.tsx` or `PlansPage.tsx` file
- Any pricing tier component (`FreePlan`, `ProPlan`, `EnterprisePlan`)
- Navigation links labeled "Pricing", "Plans", "Upgrade", "Billing"
- Any "Upgrade to Pro" banner or tooltip inside the app
- The screenshot you attached (Free/$0, Pro/$49, Enterprise/Custom cards) — **this entire UI is removed**
- Any `useSubscription`, `usePlan`, or billing-related hooks/services
- Any `stripe`, `paddle`, or payment library imports

---

## PART 10 — SIDENAV UPDATES

Remove from `SideNav.tsx`:
- Any "Upgrade" button or plan badge
- Any link to a billing/pricing page

Keep:
- Dashboard, Datasets, Models, What-If Explorer, Settings
- Documentation, Support (footer links)
- User profile display at the bottom (static name, no plan badge)

---

## PART 11 — BACKEND ENVIRONMENT SETUP

Ensure `backend/.env` is configured before running:

```env
DATABASE_URL=sqlite:///./fairlens.db
GROQ_API_KEY=your_groq_api_key_here
SECRET_KEY=your_secret_key_here
```

Required Python packages (verify all present in virtualenv):
```
fastapi
uvicorn
pandas
numpy
aif360
scikit-learn
shap
groq
fpdf2
pydantic-settings
sqlalchemy
python-multipart
```

Install command:
```bash
pip install fastapi uvicorn pandas numpy aif360 scikit-learn shap groq fpdf2 pydantic-settings sqlalchemy python-multipart
```

---

## PART 12 — IMPLEMENTATION ORDER (RECOMMENDED)

Execute in this sequence to avoid blocked work:

| Step | Task | Estimated Time |
|------|------|----------------|
| 1 | Add Vite proxy config | 5 min |
| 2 | Create `types/analysis.ts` | 15 min |
| 3 | Create `services/api.ts` | 20 min |
| 4 | Create `AnalysisContext.tsx` | 20 min |
| 5 | Wire `App.tsx` routes | 10 min |
| 6 | Wire `UploadPage.tsx` to `/preview` + `/analyze` | 45 min |
| 7 | Build `RiskRing.tsx` component | 20 min |
| 8 | Build `BiasBarChart.tsx` with D3 | 45 min |
| 9 | Build `ShapChart.tsx` | 30 min |
| 10 | Wire `DashboardPage.tsx` with live data | 45 min |
| 11 | Add AI Explanation panel to Dashboard | 20 min |
| 12 | Wire `WhatIfPage.tsx` to `/whatif` | 45 min |
| 13 | Build `LandingPage.tsx` with orange theme | 90 min |
| 14 | Remove all pricing/subscription UI | 20 min |
| 15 | Update SideNav (remove upgrade CTA) | 10 min |
| 16 | End-to-end test with COMPAS dataset | 30 min |

---

## PART 13 — END-TO-END TEST CHECKLIST

After implementation, verify these flows work:

- [ ] Backend health: `GET http://localhost:8000/api/health` returns `{"status": "FairLens backend is running ✅"}`
- [ ] Landing page loads at `/` with orange theme, no pricing section visible
- [ ] Onboarding page at `/app/onboard` — clicking a card enables "Continue" button
- [ ] Upload page: drag `backend/datasets/compas-scores-two-years.csv`, columns appear in dropdowns
- [ ] Set `target_column = two_year_recid`, `sensitive_columns = race,sex`, click "Start Analysis"
- [ ] Dashboard loads with real scores (not mock 72/0.82/0.15)
- [ ] SHAP chart shows real feature names from COMPAS dataset
- [ ] AI Explanation panel shows Groq-generated text
- [ ] "Export Report" downloads a valid PDF
- [ ] What-If Explorer: change `race` → see before/after risk scores update
- [ ] No pricing page accessible at any route
- [ ] No "Upgrade" button in SideNav

---

## PART 14 — KNOWN BACKEND CONSTRAINTS

- **File is not stored server-side.** The user's `File` object must be kept in React Context and re-sent on every API call (preview, analyze, whatif, export).
- **AIF360 requires binary target variable.** If the CSV target is not binary, the backend will throw. Handle this error gracefully on the frontend with a clear message.
- **SHAP computation can be slow** (10–30s for large datasets). Show a loading state with progress indicator on the Dashboard page during analysis.
- **Groq API key must be present** in `.env` for the explanation to generate. If missing, `results.explanation` will be an empty string — the frontend should handle this gracefully.
- **CORS is already configured** in `main.py` for `localhost:3000` and `localhost:5173`. The Vite proxy means you won't hit CORS in development. For production, update `allow_origins` to the deployed frontend URL.
