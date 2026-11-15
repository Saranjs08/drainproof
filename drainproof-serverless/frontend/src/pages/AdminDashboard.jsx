import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Upload, ShieldCheck, Eye } from 'lucide-react';
import api from '../services/api';

function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [afterImageFile, setAfterImageFile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState('');

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.listReports(statusFilter);
      setReports(data.reports || []);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const handleStatusChange = async (reportId, newStatus) => {
    setActionLoading(true);
    try {
      await api.updateStatus(reportId, newStatus, note);
      alert(`Status changed to ${newStatus}`);
      await loadReports();
      if (selectedReport?.report_id === reportId) {
        const updated = await api.getReport(reportId);
        setSelectedReport(updated);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadAfterImage = async (e) => {
    e.preventDefault();
    if (!afterImageFile || !selectedReport) return;
    setActionLoading(true);
    try {
      const uploadData = await api.getUploadUrl(selectedReport.report_id, {
        contentType: afterImageFile.type || 'image/jpeg',
        fileExtension: afterImageFile.name.split('.').pop() || 'jpg',
        evidenceType: 'after',
      });
      await api.uploadImageToS3(uploadData.upload_url, afterImageFile);
      await api.submitResolution(selectedReport.report_id, uploadData.object_key, note);
      alert('After-cleanup evidence uploaded successfully!');
      setAfterImageFile(null);
      const updated = await api.getReport(selectedReport.report_id);
      setSelectedReport(updated);
      await loadReports();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyResolution = async (decision) => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      await api.verifyResolution(selectedReport.report_id, decision, 'Officer_Rajesh', note);
      alert(`Resolution decision saved: ${decision}`);
      const updated = await api.getReport(selectedReport.report_id);
      setSelectedReport(updated);
      await loadReports();
    } catch (err) {
      alert(err.response?.data?.error || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Drainage Reviewer & Verification Console</h2>
          <p className="text-xs text-slate-500">Monitor reported hazards, review potential duplicates, and verify cleanup evidence.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLUTION_PENDING_VERIFICATION">PENDING VERIFICATION</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          <button
            onClick={loadReports}
            className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports Table / List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Report Queue ({reports.length})</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[700px]">
            {reports.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No reports matching current filter.</div>
            ) : (
              reports.map((item) => (
                <div
                  key={item.report_id}
                  onClick={() => setSelectedReport(item)}
                  className={`p-4 hover:bg-blue-50/50 cursor-pointer transition flex items-start justify-between gap-3 ${
                    selectedReport?.report_id === item.report_id ? 'bg-blue-50/80 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{item.report_id}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {item.issue_type}
                      </span>
                      {item.possible_duplicate_ids?.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3" /> Duplicate Alert ({item.possible_duplicate_ids.length})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1">{item.description}</p>
                    <p className="text-[11px] text-slate-400">{item.location_name} • {item.created_at?.slice(0, 16)}</p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      {item.status}
                    </span>
                    <span className="text-xs font-semibold text-blue-600">Score: {item.priority_score || 0}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Report Detail & Verification Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
            Verification & Action Panel
          </h3>

          {!selectedReport ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              Select a report from the queue to inspect before/after evidence and perform admin actions.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-400">SELECTED CASE</span>
                <h4 className="font-mono font-bold text-lg text-slate-900">{selectedReport.report_id}</h4>
                <p className="text-xs text-slate-600 mt-1">{selectedReport.description}</p>
              </div>

              {/* Duplicate Warning */}
              {selectedReport.possible_duplicate_ids?.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Potential Nearby Duplicates Detected:</span>
                  </div>
                  <p>{selectedReport.possible_duplicate_ids.join(', ')}</p>
                  <p className="text-[11px] text-amber-700">Flagged by distance heuristic. Review before dispatching duplicate crews.</p>
                </div>
              )}

              {/* Photos Comparison */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Evidence Photographs:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-1">
                    <p className="text-[10px] font-bold text-slate-500 mb-1">Before Cleanup</p>
                    {selectedReport.before_image_url ? (
                      <img src={selectedReport.before_image_url} alt="Before" className="h-28 w-full object-cover rounded" />
                    ) : (
                      <div className="h-28 bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400">None</div>
                    )}
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-1">
                    <p className="text-[10px] font-bold text-slate-500 mb-1">After Cleanup</p>
                    {selectedReport.after_image_url ? (
                      <img src={selectedReport.after_image_url} alt="After" className="h-28 w-full object-cover rounded" />
                    ) : (
                      <div className="h-28 bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400">Pending</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload After Image Section */}
              {selectedReport.status === 'IN_PROGRESS' && (
                <form onSubmit={handleUploadAfterImage} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Maintenance Evidence Upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setAfterImageFile(e.target.files[0])}
                    className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-indigo-600 file:text-white"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition"
                  >
                    Submit Resolution Evidence
                  </button>
                </form>
              )}

              {/* Verify Resolution Actions */}
              {selectedReport.status === 'RESOLUTION_PENDING_VERIFICATION' && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Proof of Resolution Audit
                  </span>
                  <p className="text-[11px] text-purple-700">Review the before-and-after photos above. Confirm that the blockage has been completely cleared.</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleVerifyResolution('APPROVE')}
                      disabled={actionLoading}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Approve & Mark Resolved
                    </button>
                    <button
                      onClick={() => handleVerifyResolution('REJECT')}
                      disabled={actionLoading}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Reject (Need More Evidence)
                    </button>
                  </div>
                </div>
              )}

              {/* Status Transition Quick Buttons */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-xs font-bold text-slate-600">Manual Workflow Transitions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedReport.status === 'SUBMITTED' && (
                    <button
                      onClick={() => handleStatusChange(selectedReport.report_id, 'UNDER_REVIEW')}
                      className="px-2.5 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded font-medium"
                    >
                      Move to Under Review
                    </button>
                  )}
                  {selectedReport.status === 'UNDER_REVIEW' && (
                    <button
                      onClick={() => handleStatusChange(selectedReport.report_id, 'IN_PROGRESS')}
                      className="px-2.5 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded font-medium"
                    >
                      Assign / Mark In-Progress
                    </button>
                  )}
                  {selectedReport.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleStatusChange(selectedReport.report_id, 'REJECTED')}
                      className="px-2.5 py-1 text-xs bg-rose-100 hover:bg-rose-200 text-rose-800 rounded font-medium"
                    >
                      Reject Invalid Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
