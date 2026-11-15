import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Clock, CheckCircle2, AlertTriangle, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';

function TrackReport() {
  const [searchParams] = useSearchParams();
  const [reportIdInput, setReportIdInput] = useState(searchParams.get('id') || '');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = async (idToFetch) => {
    if (!idToFetch) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getReport(idToFetch.trim());
      setReport(data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Report not found. Please verify the ID.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryId = searchParams.get('id');
    if (queryId) {
      setReportIdInput(queryId);
      fetchReport(queryId);
    }
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchReport(reportIdInput);
  };

  const getStatusBadge = (status) => {
    const styles = {
      SUBMITTED: 'bg-amber-100 text-amber-800 border-amber-300',
      UNDER_REVIEW: 'bg-blue-100 text-blue-800 border-blue-300',
      IN_PROGRESS: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      RESOLUTION_PENDING_VERIFICATION: 'bg-purple-100 text-purple-800 border-purple-300',
      RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      REJECTED: 'bg-rose-100 text-rose-800 border-rose-300',
      NEEDS_MORE_EVIDENCE: 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Track Drainage Report Status</h2>
        <p className="text-xs text-slate-500 mb-4">Enter your tracking ID (e.g. DRN-ABC12345) to inspect real-time workflow state.</p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Enter Report ID..."
            value={reportIdInput}
            onChange={(e) => setReportIdInput(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {report && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-semibold text-slate-400">REPORT ID</span>
              <h3 className="text-2xl font-black text-slate-900 font-mono">{report.report_id}</h3>
            </div>
            <div>{getStatusBadge(report.status)}</div>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <span className="text-xs font-semibold text-slate-500">Category</span>
              <p className="font-semibold text-slate-800 text-sm mt-0.5">{report.issue_type}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <span className="text-xs font-semibold text-slate-500">Location</span>
              <p className="font-semibold text-slate-800 text-sm mt-0.5">{report.location_name || 'Coordinates provided'}</p>
              <p className="text-xs text-slate-400">{report.latitude}, {report.longitude}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <span className="text-xs font-semibold text-slate-500">Priority Score</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-bold text-blue-600">{report.priority_score || 0} / 100</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">{report.priority_band || 'LOW'}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Citizen Description</h4>
            <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl">{report.description}</p>
          </div>

          {/* Priority Score Rationale */}
          {report.priority_factors && report.priority_factors.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Automated Priority Breakdown</h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 bg-blue-50/60 p-4 rounded-xl border border-blue-100">
                {report.priority_factors.map((factor, idx) => (
                  <li key={idx}>{factor}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Before & After Proof of Resolution Gallery */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Photographic Resolution Evidence</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Photo */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <div className="p-2.5 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>BEFORE (Initial Problem)</span>
                  <span className="text-amber-600">Reported</span>
                </div>
                {report.before_image_url ? (
                  <img src={report.before_image_url} alt="Before Drainage" className="w-full h-56 object-cover" />
                ) : (
                  <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span>No image available</span>
                  </div>
                )}
              </div>

              {/* After Photo */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <div className="p-2.5 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>AFTER (Proof of Resolution)</span>
                  <span className={report.after_image_url ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {report.after_image_url ? 'Uploaded' : 'Pending Cleanup'}
                  </span>
                </div>
                {report.after_image_url ? (
                  <img src={report.after_image_url} alt="After Cleanup" className="w-full h-56 object-cover" />
                ) : (
                  <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                    <Clock className="w-8 h-8 mb-2 text-slate-300" />
                    <span>Cleanup crew has not uploaded after-photo yet.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audit Verification Log */}
          {report.status === 'RESOLVED' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 space-y-1">
                <p className="font-bold text-sm">Verified & Resolved</p>
                <p>Audited by Administrator: <span className="font-semibold">{report.verified_by || 'Municipal Auditor'}</span></p>
                <p>Resolution Timestamp: <span className="font-semibold">{report.resolved_at}</span></p>
                {report.verification_feedback && <p className="italic">Note: "{report.verification_feedback}"</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TrackReport;
