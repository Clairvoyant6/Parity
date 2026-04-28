// src/app/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router';
import { AnalysisProvider } from '../context/AnalysisContext';
import { LandingPage }      from './pages/LandingPage';
import { OnboardPage }      from './pages/OnboardPage';
import { UploadPage }       from './pages/UploadPage';
import { AnalysisDashboard } from './pages/AnalysisDashboard';
import { BiasDetails }      from './pages/BiasDetails';
import { WhatIfExplorer }   from './pages/WhatIfExplorer';
import { ReportExport }     from './pages/ReportExport';

export default function App() {
  return (
    <AnalysisProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                         element={<LandingPage />} />
          <Route path="/app/onboard"              element={<OnboardPage />} />
          <Route path="/app/upload"               element={<UploadPage />} />
          <Route path="/app/analysis"             element={<AnalysisDashboard />} />
          <Route path="/app/analysis/details"     element={<BiasDetails />} />
          <Route path="/app/analysis/whatif"      element={<WhatIfExplorer />} />
          <Route path="/app/analysis/report"      element={<ReportExport />} />
        </Routes>
      </BrowserRouter>
    </AnalysisProvider>
  );
}
