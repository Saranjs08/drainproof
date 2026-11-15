import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';

// Fix standard Leaflet default marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapView() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await api.listReports();
        setReports(data.reports || []);
      } catch (err) {
        console.error('Error fetching map points', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  const defaultCenter = [11.0001, 77.0250];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Community Drainage GIS Map</h2>
        <p className="text-xs text-slate-500">Live geographic distribution of reported stormwater blockages and priority zones.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[600px] relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center text-sm font-semibold text-slate-600">
            Loading geographic reports...
          </div>
        )}
        <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {reports.map((report) => {
            const lat = parseFloat(report.latitude);
            const lng = parseFloat(report.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;

            return (
              <Marker key={report.report_id} position={[lat, lng]}>
                <Popup>
                  <div className="p-1 space-y-1 text-xs">
                    <p className="font-bold text-blue-700">{report.report_id}</p>
                    <p className="font-semibold">{report.issue_type}</p>
                    <p className="text-slate-600">{report.description}</p>
                    <p className="font-medium text-amber-600">Status: {report.status}</p>
                    <p className="font-bold">Priority: {report.priority_score || 0}/100</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

export default MapView;
