import axios from 'axios';

// When running locally in browser, route via '/api' to use Vite's proxy (eliminates all browser CORS errors)
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE_URL = isLocal ? '/api' : rawBaseUrl.trim().replace(/\/+$/, '');

console.log('Connecting to API Gateway via:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Citizen API endpoints
  createReport: async (reportData) => {
    const response = await apiClient.post('/reports', reportData);
    return response.data;
  },

  getUploadUrl: async (reportId, { contentType, fileExtension, evidenceType = 'before' }) => {
    const response = await apiClient.post(`/reports/${reportId}/upload-url`, {
      content_type: contentType || 'image/jpeg',
      file_extension: fileExtension || 'jpg',
      evidence_type: evidenceType,
    });
    return response.data;
  },

  uploadImageToS3: async (presignedUrl, file) => {
    const contentType = file.type || 'image/jpeg';
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`S3 upload failed (${response.status}): ${response.statusText}. ${errText}`);
    }
    return response;
  },

  submitReport: async (reportId, objectKey) => {
    const response = await apiClient.post(`/reports/${reportId}/submit`, {
      object_key: objectKey,
    });
    return response.data;
  },

  getReport: async (reportId) => {
    const response = await apiClient.get(`/reports/${reportId}`);
    return response.data;
  },

  listReports: async (statusFilter = '') => {
    const url = statusFilter ? `/reports?status=${statusFilter}` : '/reports';
    const response = await apiClient.get(url);
    return response.data;
  },

  // Admin / Reviewer API endpoints
  updateStatus: async (reportId, status, note = '') => {
    const response = await apiClient.patch(`/reports/${reportId}/status`, {
      status,
      note,
    });
    return response.data;
  },

  submitResolution: async (reportId, afterImageKey, notes = '') => {
    const response = await apiClient.post(`/reports/${reportId}/resolution`, {
      after_image_key: afterImageKey,
      resolution_notes: notes,
    });
    return response.data;
  },

  verifyResolution: async (reportId, decision, verifiedBy = 'Admin', feedback = '') => {
    const response = await apiClient.post(`/reports/${reportId}/verify-resolution`, {
      decision,
      verified_by: verifiedBy,
      feedback,
    });
    return response.data;
  },
};

export default api;
