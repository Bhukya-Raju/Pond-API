import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ControlsSidebar from './components/ControlsSidebar';
import MapViewer from './components/MapViewer';
import AnalyticsTab from './components/AnalyticsTab';
import StressModal from './components/StressModal';
import { api } from './services/api';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'analytics'
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [sampleContoursGeoJSON, setSampleContoursGeoJSON] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Form / Parameters
  const [rainfallMm, setRainfallMm] = useState(1000);
  const [runoffCoeff, setRunoffCoeff] = useState(0.35);
  const [gridSize, setGridSize] = useState(180);
  const [sampleSpacing, setSampleSpacing] = useState(10.0);

  // Map Drawing
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [selectedPolygon, setSelectedPolygon] = useState(null);

  // Analysis State
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Modals
  const [showStressModal, setShowStressModal] = useState(false);

  // Load sample presets on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const res = await api.getSamples();
        if (res.samples && res.samples.length > 0) {
          setSamples(res.samples);
          const defaultSample = res.samples[0];
          setSelectedSample(defaultSample);
          
          // Optionally fetch sample contours for preview
          try {
            const geojson = await api.getSampleGeoJSON(defaultSample.filename);
            setSampleContoursGeoJSON(geojson);
          } catch (e) {
            console.warn('Could not load sample preview contours:', e);
          }
        }
      } catch (err) {
        console.error('Initial samples loading error:', err);
      }
    }
    loadInitialData();
  }, []);

  const handleSelectSample = async (sample) => {
    setSelectedSample(sample);
    setUploadedFile(null);
    try {
      const geojson = await api.getSampleGeoJSON(sample.filename);
      setSampleContoursGeoJSON(geojson);
    } catch (e) {
      console.warn('Failed preview fetch:', e);
    }
  };

  const handleFileUpload = (file) => {
    setUploadedFile(file);
    setSelectedSample(null);
    setSuccessToast(`Uploaded file "${file.name}" ready for analysis.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleClearPolygon = () => {
    setSelectedPolygon(null);
    setIsDrawingMode(false);
    setSuccessToast('Cleared drawn parcel boundary.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleRunAnalysis = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      let result = null;

      if (selectedPolygon && !uploadedFile) {
        // Run analysis on user-drawn parcel on map
        result = await api.analyzeLandArea({
          polygon: selectedPolygon,
          rainfallMm,
          runoffCoeff,
          gridSize,
          sampleSpacingM: sampleSpacing,
        });
      } else if (uploadedFile) {
        // Run analysis on uploaded KML/KMZ file
        result = await api.analyzeContourFile({
          file: uploadedFile,
          gridSize,
          sampleSpacingM: sampleSpacing,
          rainfallMm,
          runoffCoeff,
          polygonGeoJSON: selectedPolygon,
        });
      } else if (selectedSample) {
        // Use preloaded preset contour dataset
        const response = await fetch(`${api.getBaseUrl()}/samples/${selectedSample.filename}/geojson`);
        // If file not locally uploaded, call analyzeArea with sample center or fallback
        if (selectedPolygon) {
          result = await api.analyzeLandArea({
            polygon: selectedPolygon,
            rainfallMm,
            runoffCoeff,
            gridSize,
            sampleSpacingM: sampleSpacing,
          });
        } else {
          // Create synthetic default parcel around preset center if not drawn
          const [lat, lon] = selectedSample.center;
          const delta = 0.008;
          const defaultPoly = {
            type: 'Polygon',
            coordinates: [[
              [lon - delta, lat - delta],
              [lon + delta, lat - delta],
              [lon + delta, lat + delta],
              [lon - delta, lat + delta],
              [lon - delta, lat - delta],
            ]]
          };
          result = await api.analyzeLandArea({
            polygon: defaultPoly,
            rainfallMm,
            runoffCoeff,
            gridSize,
            sampleSpacingM: sampleSpacing,
          });
        }
      }

      setAnalysisResult(result);
      setSuccessToast(`Analysis Complete! Catchment: ${result.catchment?.area_hectares} ha | Collectible: ${result.water_volume?.expected_water_volume_m3?.toLocaleString()} m³`);
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err) {
      console.error('Analysis error:', err);
      setErrorMsg(err.message || 'Analysis failed. Please verify the backend connection.');
    } finally {
      setLoading(false);
      setIsDrawingMode(false);
    }
  };

  const handleUpdateVolumeResult = (updatedVolume) => {
    if (analysisResult) {
      setAnalysisResult(prev => ({
        ...prev,
        water_volume: updatedVolume
      }));
      setSuccessToast('Updated water harvest volume calculations!');
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation */}
      <Navbar
        onOpenStressModal={() => setShowStressModal(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Layout */}
      <main className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Left Parameter & Data Sidebar (Only on Map Tab) */}
        {activeTab === 'map' && (
          <ControlsSidebar
            samples={samples}
            selectedSample={selectedSample}
            onSelectSample={handleSelectSample}
            onFileUpload={handleFileUpload}
            uploadedFile={uploadedFile}
            rainfallMm={rainfallMm}
            setRainfallMm={setRainfallMm}
            runoffCoeff={runoffCoeff}
            setRunoffCoeff={setRunoffCoeff}
            gridSize={gridSize}
            setGridSize={setGridSize}
            sampleSpacing={sampleSpacing}
            setSampleSpacing={setSampleSpacing}
            onRunAnalysis={handleRunAnalysis}
            loading={loading}
            isDrawingMode={isDrawingMode}
            setIsDrawingMode={setIsDrawingMode}
            selectedPolygon={selectedPolygon}
            onClearPolygon={handleClearPolygon}
            analysisResult={analysisResult}
          />
        )}

        {/* Tab 1: Interactive GIS Map */}
        {activeTab === 'map' && (
          <MapViewer
            analysisResult={analysisResult}
            selectedSample={selectedSample}
            isDrawingMode={isDrawingMode}
            setIsDrawingMode={setIsDrawingMode}
            selectedPolygon={selectedPolygon}
            setSelectedPolygon={setSelectedPolygon}
            sampleContoursGeoJSON={sampleContoursGeoJSON}
          />
        )}

        {/* Tab 2: Analytics & Hydrology Breakdown */}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            analysisResult={analysisResult}
            onUpdateVolumeResult={handleUpdateVolumeResult}
          />
        )}
      </main>

      {/* Floating Notifications / Toasts */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-rose-950/90 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 text-rose-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Modals */}
      <StressModal
        isOpen={showStressModal}
        onClose={() => setShowStressModal(false)}
      />
    </div>
  );
}
