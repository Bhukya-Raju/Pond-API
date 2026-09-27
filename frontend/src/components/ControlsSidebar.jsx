import React, { useState } from 'react';
import { 
  UploadCloud, 
  MapPin, 
  Layers, 
  Sliders, 
  CloudRain, 
  Droplet, 
  Play, 
  RotateCcw, 
  Square, 
  Info, 
  Check, 
  Sparkles,
  HelpCircle,
  FileCheck
} from 'lucide-react';

export default function ControlsSidebar({
  samples,
  selectedSample,
  onSelectSample,
  onFileUpload,
  uploadedFile,
  rainfallMm,
  setRainfallMm,
  runoffCoeff,
  setRunoffCoeff,
  gridSize,
  setGridSize,
  sampleSpacing,
  setSampleSpacing,
  onRunAnalysis,
  loading,
  isDrawingMode,
  setIsDrawingMode,
  selectedPolygon,
  onClearPolygon,
  analysisResult,
}) {
  const [activeAccordion, setActiveAccordion] = useState('input');
  const [showTooltip, setShowTooltip] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <aside className="w-full lg:w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Header Banner */}
      <div className="p-4 border-b border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-900/60">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="h-4 w-4 text-sky-400" />
          Planning & Parameter Controls
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Select region, draw land boundary, and tune hydrological parameters.
        </p>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Step 1: Input Data Source */}
        <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-mono font-bold">1</span>
              Contour Map / Region
            </label>
            <span className="text-[10px] text-slate-400">KML / KMZ / Presets</span>
          </div>

          {/* Sample Preset Buttons */}
          <div className="space-y-1.5 mb-3">
            <span className="text-[11px] font-medium text-slate-400 block">Preloaded Datasets:</span>
            {(samples || []).map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSample(s)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition border flex items-center justify-between ${
                  selectedSample?.id === s.id && !uploadedFile
                    ? 'bg-sky-950/70 border-sky-500/60 text-sky-200 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-200">{s.name}</div>
                  <div className="text-[10px] text-slate-400">{s.contour_count} contours • {s.elevation_range}</div>
                </div>
                {selectedSample?.id === s.id && !uploadedFile && (
                  <Check className="h-4 w-4 text-sky-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* File Upload Drop Area */}
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Or Upload Custom Map:</span>
            <label className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center ${
              uploadedFile
                ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300'
                : 'border-slate-700/80 hover:border-sky-500/50 bg-slate-900/40 hover:bg-slate-800/30 text-slate-400'
            }`}>
              <input
                type="file"
                accept=".kml,.kmz"
                onChange={handleFileChange}
                className="hidden"
              />
              {uploadedFile ? (
                <div className="flex items-center gap-2 text-xs">
                  <FileCheck className="h-5 w-5 text-emerald-400" />
                  <div className="text-left">
                    <p className="font-semibold text-emerald-300 truncate max-w-[180px]">{uploadedFile.name}</p>
                    <p className="text-[10px] text-emerald-400/80">{(uploadedFile.size / 1024).toFixed(1)} KB (Ready)</p>
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud className="h-5 w-5 text-sky-400 mb-1" />
                  <p className="text-xs font-medium text-slate-300">Click or drop .kml / .kmz file</p>
                  <p className="text-[10px] text-slate-500">Auto-derives DEM and elevations</p>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Step 2: Land Area Selection on Map */}
        <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-mono font-bold">2</span>
              Map Land Area Selection
            </label>
            <span className="text-[10px] text-amber-400 font-medium">Assignment Core Req</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Draw a custom polygon or rectangle on the interactive map to select the land area parcel for pond siting.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                isDrawingMode
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/30 animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <Square className="h-3.5 w-3.5" />
              <span>{isDrawingMode ? 'Drawing Active...' : 'Draw Land Area'}</span>
            </button>

            <button
              onClick={onClearPolygon}
              disabled={!selectedPolygon}
              className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                selectedPolygon
                  ? 'bg-rose-950/60 border-rose-800 text-rose-300 hover:bg-rose-900/60'
                  : 'bg-slate-950 border-slate-800/60 text-slate-600 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear Boundary</span>
            </button>
          </div>

          {selectedPolygon && (
            <div className="mt-2.5 p-2 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <Check className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span>Custom land parcel selected on map ({selectedPolygon.coordinates?.[0]?.length || 0} vertices).</span>
            </div>
          )}
        </div>

        {/* Step 3: Hydrology & Water Collection Parameters */}
        <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-mono font-bold">3</span>
              Hydrology & Water Parameters
            </label>
            <span className="text-[10px] text-sky-400 font-mono">Volume Model</span>
          </div>

          {/* Rainfall Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 flex items-center gap-1 font-medium">
                <CloudRain className="h-3.5 w-3.5 text-sky-400" />
                Annual / Monsoon Rainfall:
              </span>
              <span className="font-mono font-bold text-sky-300">{rainfallMm} mm/yr</span>
            </div>
            <input
              type="range"
              min="200"
              max="3000"
              step="50"
              value={rainfallMm}
              onChange={(e) => setRainfallMm(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <button onClick={() => setRainfallMm(650)} className="hover:text-slate-300">Arid (650mm)</button>
              <button onClick={() => setRainfallMm(1000)} className="hover:text-slate-300 font-semibold text-sky-400">Normal (1000mm)</button>
              <button onClick={() => setRainfallMm(1500)} className="hover:text-slate-300">Heavy (1500mm)</button>
            </div>
          </div>

          {/* Runoff Coefficient Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 flex items-center gap-1 font-medium">
                <Droplet className="h-3.5 w-3.5 text-cyan-400" />
                Runoff Coefficient (C):
              </span>
              <span className="font-mono font-bold text-cyan-300">{runoffCoeff.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.80"
              step="0.05"
              value={runoffCoeff}
              onChange={(e) => setRunoffCoeff(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <button onClick={() => setRunoffCoeff(0.20)} className="hover:text-slate-300">Sandy (0.20)</button>
              <button onClick={() => setRunoffCoeff(0.35)} className="hover:text-slate-300 font-semibold text-cyan-400">Loam/Agri (0.35)</button>
              <button onClick={() => setRunoffCoeff(0.55)} className="hover:text-slate-300">Clay/Rock (0.55)</button>
            </div>
          </div>

          {/* DEM Advanced Parameters */}
          <div className="pt-2 border-t border-slate-800/80">
            <details className="group">
              <summary className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer list-none flex items-center justify-between">
                <span>Advanced DEM Resolution Tuning</span>
                <span className="group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="pt-3 space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>DEM Grid Size:</span>
                    <span className="font-mono text-sky-300">{gridSize} cells</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="300"
                    step="20"
                    value={gridSize}
                    onChange={(e) => setGridSize(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Sampling Spacing:</span>
                    <span className="font-mono text-sky-300">{sampleSpacing} m</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={sampleSpacing}
                    onChange={(e) => setSampleSpacing(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
                  />
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Big Action Button */}
        <button
          onClick={onRunAnalysis}
          disabled={loading}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-xl flex items-center justify-center gap-2 transition transform active:scale-98 ${
            loading
              ? 'bg-slate-800 cursor-wait'
              : 'bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 shadow-sky-600/30'
          }`}
        >
          {loading ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Running Hydrological Analysis...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-cyan-200 animate-spin-slow" />
              <span>Run AI Catchment & Volume Analysis</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
