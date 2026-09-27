import React, { useState } from 'react';
import { 
  Droplet, 
  CloudRain, 
  Users, 
  Calculator, 
  Compass, 
  Layers, 
  TrendingUp, 
  CheckCircle2, 
  RefreshCw,
  Info,
  Maximize,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function AnalyticsTab({ analysisResult, onUpdateVolumeResult }) {
  const [rainfallMm, setRainfallMm] = useState(
    analysisResult?.water_volume?.rainfall_annual_mm || 1000
  );
  const [runoffCoeff, setRunoffCoeff] = useState(
    analysisResult?.water_volume?.runoff_coefficient || 0.35
  );
  const [pondDepth, setPondDepth] = useState(3.0);
  const [recalculating, setRecalculating] = useState(false);

  const catchmentArea = analysisResult?.catchment?.area_m2 || 25000;
  const currentVol = analysisResult?.water_volume;
  const pond = analysisResult?.pond;
  const terrainStats = analysisResult?.terrain_stats;

  const handleRecalculate = async () => {
    if (!analysisResult) return;
    setRecalculating(true);
    try {
      const updatedVol = await api.recalculateVolume({
        catchmentAreaM2: catchmentArea,
        rainfallMm: rainfallMm,
        runoffCoeff: runoffCoeff,
        pondDepthM: pondDepth,
      });
      if (onUpdateVolumeResult) {
        onUpdateVolumeResult(updatedVol);
      }
    } catch (err) {
      console.error('Recalculate error:', err);
    } finally {
      setRecalculating(false);
    }
  };

  if (!analysisResult) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <div className="h-16 w-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 animate-pulse">
          <Droplet className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Terrain Analysis Run Yet</h3>
        <p className="text-xs text-slate-400 max-w-md mb-4">
          Please select a sample region or draw a land parcel on the map, then click "Run AI Catchment & Volume Analysis" to view hydrological calculations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto bg-slate-950 p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-950/70 via-slate-900 to-indigo-950/60 p-6 rounded-2xl border border-sky-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Droplet className="h-4 w-4" />
            Hydrological Harvest Volume Analysis
          </span>
          <h2 className="text-xl font-extrabold text-white">
            Water Yield & Sizing Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Based on Rational Runoff Hydrological Formulation: <code className="text-sky-300">V = A × P × C</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase">Annual Expected Yield</span>
            <div className="text-2xl font-black text-white font-mono">
              {currentVol?.expected_water_volume_m3?.toLocaleString()}{' '}
              <span className="text-xs text-sky-400 font-normal">m³</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold">
              ≈ {currentVol?.expected_water_volume_million_liters} Million Liters
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Contributing Catchment</span>
            <Layers className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {analysisResult.catchment?.area_hectares}{' '}
            <span className="text-xs text-slate-400 font-normal">hectares</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total area: {analysisResult.catchment?.area_m2?.toLocaleString()} m²
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Village Population Sustained</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 font-mono">
            {currentVol?.potential_population_supported?.toLocaleString()}{' '}
            <span className="text-xs text-slate-400 font-normal">residents</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Assuming standard 50 LPCD (Liters per capita per day)
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Optimal Pond Suitability</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono">
            {pond?.suitability_score}{' '}
            <span className="text-xs text-slate-400 font-normal">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Elevation: {pond?.elevation_m}m • Slope: {pond?.slope_degrees}°
          </p>
        </div>
      </div>

      {/* Main Grid: Interactive Recalculation & Pond Sizing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recalculation Form */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Calculator className="h-4 w-4 text-sky-400" />
              Dynamic Hydrological Recalculator
            </h3>
            <span className="text-[10px] text-sky-400 bg-sky-950 px-2 py-0.5 rounded-full border border-sky-500/30">
              Interactive
            </span>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Annual Rainfall:</span>
              <span className="font-mono text-sky-300 font-bold">{rainfallMm} mm</span>
            </div>
            <input
              type="range"
              min="200"
              max="3000"
              step="50"
              value={rainfallMm}
              onChange={(e) => setRainfallMm(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Runoff Coefficient (C):</span>
              <span className="font-mono text-cyan-300 font-bold">{runoffCoeff.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.80"
              step="0.05"
              value={runoffCoeff}
              onChange={(e) => setRunoffCoeff(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-cyan-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Pond Excavation Depth:</span>
              <span className="font-mono text-indigo-300 font-bold">{pondDepth.toFixed(1)} m</span>
            </div>
            <input
              type="range"
              min="1.5"
              max="10.0"
              step="0.5"
              value={pondDepth}
              onChange={(e) => setPondDepth(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-indigo-500 cursor-pointer"
            />
          </div>

          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            {recalculating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Recalculate Harvest Volume</span>
          </button>
        </div>

        {/* Suggested Pond Excavation Sizing */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Maximize className="h-4 w-4 text-emerald-400" />
              Civil Sizing & Reservoir Specs
            </h3>
            <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Optimal Sizing
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Target Storage Capacity</span>
              <strong className="text-white text-base font-mono">
                {currentVol?.suggested_pond_specs?.target_storage_capacity_m3?.toLocaleString()} m³
              </strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                ({currentVol?.suggested_pond_specs?.target_storage_liters?.toLocaleString()} L)
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Excavation Depth</span>
              <strong className="text-white text-base font-mono">
                {currentVol?.suggested_pond_specs?.estimated_depth_m} m
              </strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">Standard rural design</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Estimated Surface Area</span>
              <strong className="text-emerald-300 text-base font-mono">
                {currentVol?.suggested_pond_specs?.estimated_surface_area_m2?.toLocaleString()} m²
              </strong>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Approx. Reservoir Radius</span>
              <strong className="text-cyan-300 text-base font-mono">
                {currentVol?.suggested_pond_specs?.estimated_radius_m} m
              </strong>
            </div>
          </div>

          {terrainStats && (
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
                Topographic Terrain Summary:
              </span>
              <div className="grid grid-cols-3 gap-2 text-slate-300 font-mono text-[11px]">
                <div>Min Elev: <strong>{terrainStats.min_elevation_m}m</strong></div>
                <div>Max Elev: <strong>{terrainStats.max_elevation_m}m</strong></div>
                <div>Mean Slope: <strong>{terrainStats.mean_slope_degrees}°</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
