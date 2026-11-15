import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ShieldCheck, PlusCircle, Search, LayoutDashboard, MapPin } from 'lucide-react';
import Home from './pages/Home';
import ReportIssue from './pages/ReportIssue';
import TrackReport from './pages/TrackReport';
import AdminDashboard from './pages/AdminDashboard';
import MapView from './pages/MapView';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        {/* Navigation Header */}
        <header className="bg-blue-900 text-white shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2 font-bold text-xl tracking-tight">
              <ShieldCheck className="w-7 h-7 text-cyan-400" />
              <span>Drain<span className="text-cyan-400">Proof</span></span>
            </Link>

            <nav className="flex items-center space-x-1 sm:space-x-4 text-sm font-medium">
              <Link
                to="/report"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Report Issue</span>
              </Link>
              <Link
                to="/track"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-blue-800 transition"
              >
                <Search className="w-4 h-4 text-cyan-300" />
                <span>Track Status</span>
              </Link>
              <Link
                to="/map"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-blue-800 transition"
              >
                <MapPin className="w-4 h-4 text-cyan-300" />
                <span>Civic Map</span>
              </Link>
              <Link
                to="/admin"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-blue-800/80 hover:bg-blue-700 transition"
              >
                <LayoutDashboard className="w-4 h-4 text-cyan-300" />
                <span>Admin</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Route Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/report" element={<ReportIssue />} />
            <Route path="/track" element={<TrackReport />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/map" element={<MapView />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <p>DrainProof – Smart Community Drainage Monitoring & Verification System</p>
          <p className="mt-1">Powered by AWS Serverless: Lambda, API Gateway, DynamoDB, S3 & Step Functions.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
