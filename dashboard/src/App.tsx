import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Overview from './components/pages/Overview';
import Campaigns from './components/pages/Campaigns';
import FunnelPage from './components/pages/FunnelPage';
import ROASTrends from './components/pages/ROASTrends';
import PipelinePage from './components/pages/PipelinePage';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          <Routes>
            <Route path="/"          element={<Overview />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/funnel"    element={<FunnelPage />} />
            <Route path="/roas"      element={<ROASTrends />} />
            <Route path="/pipeline"  element={<PipelinePage />} />
            <Route path="/settings"  element={<div className="page"><h1 className="page__title">Settings</h1><p style={{color:'#94a3b8'}}>Configure BigQuery connection, dbt schedules, and alert thresholds.</p></div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
