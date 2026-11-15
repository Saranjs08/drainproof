import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

function ReportIssue() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    issue_type: 'BLOCKED_DRAIN',
    severity: 'MEDIUM',
    description: '',
    location_name: '',
    latitude: '',
    longitude: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [submittedReportId, setSubmittedReportId] = useState(null);
  const [error, setError] = useState('');

  const handleLocationCapture = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
          location_name: prev.location_name || 'Current GPS Location',
        }));
      },
      (err) => {
        alert('Could not retrieve your location. Please enter coordinates manually.');
      }
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!imageFile) {
      setError('Please select an evidence photograph of the drainage problem.');
      return;
    }
    if (!formData.latitude || !formData.longitude) {
      setError('Please provide coordinates or click Detect GPS Location.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Report in DynamoDB (Draft)
      setStatusMessage('Step 1/4: Creating draft report...');
      let draftRes;
      try {
        draftRes = await api.createReport({
          ...formData,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        });
      } catch (e1) {
        console.error('Step 1 Error:', e1);
        throw new Error(`Step 1 (API Gateway Create Report) failed: ${e1.message}`);
      }
      const reportId = draftRes.report_id;

      // 2. Request Presigned S3 Upload URL
      setStatusMessage('Step 2/4: Requesting S3 upload link...');
      let uploadData;
      try {
        uploadData = await api.getUploadUrl(reportId, {
          contentType: imageFile.type || 'image/jpeg',
          fileExtension: imageFile.name.split('.').pop() || 'jpg',
          evidenceType: 'before',
        });
      } catch (e2) {
        console.error('Step 2 Error:', e2);
        throw new Error(`Step 2 (Get Presigned S3 URL) failed: ${e2.message}`);
      }

      // 3. Direct Browser-to-S3 Upload
      setStatusMessage('Step 3/4: Uploading evidence directly to Amazon S3...');
      try {
        await api.uploadImageToS3(uploadData.upload_url, imageFile);
      } catch (e3) {
        console.error('Step 3 Error:', e3);
        const s3Host = uploadData.upload_url ? new URL(uploadData.upload_url).origin : '';
        throw new Error(`Step 3 (S3 Photo Upload) failed: ${e3.message}. Target S3: ${s3Host}. Please check F12 Console.`);
      }

      // 4. Confirm upload & Start Step Functions Orchestration
      setStatusMessage('Step 4/4: Starting AWS Step Functions analysis...');
      try {
        await api.submitReport(reportId, uploadData.object_key);
      } catch (e4) {
        console.error('Step 4 Error:', e4);
        throw new Error(`Step 4 (Trigger Step Functions) failed: ${e4.message}`);
      }

      setSubmittedReportId(reportId);
      setStatusMessage('Success! Report processed.');
    } catch (err) {
      console.error('Submission error details:', err);
      setError(err.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  if (submittedReportId) {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Drainage Report Submitted!</h2>
        <p className="text-slate-600 text-sm">
          Your issue has been submitted and queued for verification. Keep this Report ID handy to track progress:
        </p>
        <div className="p-3 bg-slate-100 font-mono text-lg font-bold text-blue-700 rounded-xl select-all">
          {submittedReportId}
        </div>
        <div className="flex justify-center gap-3 pt-4">
          <button
            onClick={() => navigate(`/track?id=${submittedReportId}`)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition"
          >
            Track Report Now
          </button>
          <button
            onClick={() => {
              setSubmittedReportId(null);
              setFormData({
                issue_type: 'BLOCKED_DRAIN',
                severity: 'MEDIUM',
                description: '',
                location_name: '',
                latitude: '',
                longitude: '',
              });
              setImageFile(null);
              setPreviewUrl(null);
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Report a Drainage Issue</h2>
        <p className="text-sm text-slate-500">Provide details and photographic evidence to trigger immediate workflow analysis.</p>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Category</label>
            <select
              value={formData.issue_type}
              onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="BLOCKED_DRAIN">Blocked Stormwater Drain</option>
              <option value="OVERFLOW">Sewage / Water Overflow</option>
              <option value="BROKEN_GRATE">Broken Drain Grate / Cover</option>
              <option value="STAGNANT_WATER">Severe Stagnant Water</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Severity</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="LOW">Low (Partial blockage)</option>
              <option value="MEDIUM">Medium (Slow draining)</option>
              <option value="HIGH">High (Waterlogging / Road blocked)</option>
              <option value="CRITICAL">Critical (Flood hazard / Near hospital)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Landmark</label>
          <textarea
            required
            rows={3}
            placeholder="Describe the issue, e.g., 'Storm drain choked with plastic debris near Singanallur bus stop'"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Location Details</label>
          <input
            type="text"
            placeholder="Location name / Street / Neighborhood"
            value={formData.location_name}
            onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-2"
          />

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Latitude (e.g. 11.0001)"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="text"
              placeholder="Longitude (e.g. 77.0250)"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="button"
              onClick={handleLocationCapture}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 flex-shrink-0"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Get GPS</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Before Photograph (Evidence)</label>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-400 transition cursor-pointer relative">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {previewUrl ? (
              <div className="space-y-2">
                <img src={previewUrl} alt="Preview" className="h-40 mx-auto object-cover rounded-lg" />
                <p className="text-xs text-slate-500">Click or tap to change photo</p>
              </div>
            ) : (
              <div className="py-4 space-y-1 text-slate-500">
                <Camera className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-sm font-medium">Click to upload photo of the drain</p>
                <p className="text-xs text-slate-400">JPEG, PNG, or WebP up to 10MB</p>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{statusMessage}</span>
            </>
          ) : (
            <span>Submit Drainage Report</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default ReportIssue;
