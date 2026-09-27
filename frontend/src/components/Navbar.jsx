import React, { useState, useEffect } from 'react';
import { Droplets, Activity, Cpu, Settings, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function Navbar({ onOpenStressModal, activeTab, setActiveTab }) {
  const [backendHealth, setBackendHealth] = useState({ ok: false, latency: null, checking: true });
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(api.getBaseUrl());

  const checkStatus = async () => {
    setBackendHealth(prev => ({ ...prev, checking: true }));
    const res = await api.checkHealth();
    setBackendHealth({ ok: res.ok, latency: res.latency, checking: false });
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveUrl = (e) => {
    e.preventDefault();
    api.setBaseUrl(apiUrl);
    setShowSettings(false);
    checkStatus();
  };

  return (
    <header className="h-16 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 md:px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 via-sky-500 to-cyan-400 p-0.5 shadow-lg shadow-sky-500/20 flex items-center justify-center">
          <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Droplets className="h-5 w-5 text-sky-400 animate-bounce" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg bg-gradient-to-r from-sky-400 via-cyan-300 to-white bg-clip-text text-transparent">
              HydroPond AI
            </h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 tracking-wider">
              Phase 3 Live
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Village Pond Catchment & Water Harvesting Optimization
          </p>
        </div>
      </div>

      {/* Center Nav Tabs */}
      <div className="hidden md:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('map')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'map'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Interactive GIS Map
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'analytics'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Hydrology & Volume
        </button>
      </div>

      {/* Right Controls & Health Indicator */}
      <div className="flex items-center gap-3">
        {/* Backend Status Badge */}
        <div 
          onClick={() => setShowSettings(!showSettings)}
          className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
          title="Click to configure API URL"
        >
          {backendHealth.checking ? (
            <RefreshCw className="h-3.5 w-3.5 text-sky-400 animate-spin" />
          ) : backendHealth.ok ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
          )}
          <span className="text-xs font-mono text-slate-300">
            {backendHealth.ok ? `${backendHealth.latency}ms` : 'Offline'}
          </span>
        </div>

        {/* Stress & Scaling Button */}
        <button
          onClick={onOpenStressModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/60 hover:text-indigo-100 transition shadow-sm"
          title="View Stress, Scaling & 4-System Benchmarks"
        >
          <Cpu className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Stress & Benchmarks</span>
        </button>
      </div>

      {/* Backend Settings Popover */}
      {showSettings && (
        <div className="absolute right-4 top-18 w-80 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-4 z-50 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Settings className="h-4 w-4 text-sky-400" />
              API Server Settings
            </h4>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>
          <form onSubmit={handleSaveUrl}>
            <label className="block text-xs text-slate-300 mb-1">Backend Server URL:</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-500 mb-3"
              placeholder="http://127.0.0.1:8000"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setApiUrl('http://127.0.0.1:8000');
                  api.setBaseUrl('http://127.0.0.1:8000');
                  setShowSettings(false);
                  checkStatus();
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Reset Local
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg text-xs bg-sky-600 text-white font-medium hover:bg-sky-500"
              >
                Save & Connect
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
