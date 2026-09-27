import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  MapPin, 
  Maximize2, 
  Eye, 
  EyeOff, 
  Droplet, 
  CloudRain, 
  Activity, 
  Compass, 
  Crosshair,
  TrendingUp,
  Award
} from 'lucide-react';

const BASEMAPS = {
  satellite: {
    name: 'Satellite (Esri Imagery)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  dark: {
    name: 'CartoDB Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  },
  topo: {
    name: 'Topographic (OpenTopo)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
  },
  osm: {
    name: 'OpenStreetMap Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  }
};

export default function MapViewer({
  analysisResult,
  selectedSample,
  isDrawingMode,
  setIsDrawingMode,
  selectedPolygon,
  setSelectedPolygon,
  sampleContoursGeoJSON
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseTileLayerRef = useRef(null);
  
  // Layer Groups
  const pondLayerRef = useRef(null);
  const catchmentLayerRef = useRef(null);
  const drawingLayerRef = useRef(null);
  const contoursLayerRef = useRef(null);

  // States
  const [activeBasemap, setActiveBasemap] = useState('satellite');
  const [showContours, setShowContours] = useState(true);
  const [showCatchment, setShowCatchment] = useState(true);
  const [showPondMarker, setShowPondMarker] = useState(true);
  const [drawingPoints, setDrawingPoints] = useState([]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on default sample (IIT Bhilai region)
    const initialCenter = selectedSample?.center || [21.2518, 81.2970];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
    });

    // Add initial base tile layer
    baseTileLayerRef.current = L.tileLayer(BASEMAPS[activeBasemap].url, {
      attribution: BASEMAPS[activeBasemap].attribution,
      maxZoom: 19,
    }).addTo(map);

    // Zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layer groups for dynamic features
    pondLayerRef.current = L.layerGroup().addTo(map);
    catchmentLayerRef.current = L.layerGroup().addTo(map);
    drawingLayerRef.current = L.layerGroup().addTo(map);
    contoursLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !baseTileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(baseTileLayerRef.current);
    baseTileLayerRef.current = L.tileLayer(BASEMAPS[activeBasemap].url, {
      attribution: BASEMAPS[activeBasemap].attribution,
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);
  }, [activeBasemap]);

  // Handle Land Area Drawing Clicks
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e) => {
      if (!isDrawingMode) return;
      const { lat, lng } = e.latlng;
      const newPts = [...drawingPoints, [lng, lat]];
      setDrawingPoints(newPts);

      if (newPts.length >= 3) {
        // Complete the polygon geometry
        const closed = [...newPts, newPts[0]];
        const geojsonPoly = {
          type: 'Polygon',
          coordinates: [closed]
        };
        setSelectedPolygon(geojsonPoly);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDrawingMode, drawingPoints]);

  // Render Drawing Layer
  useEffect(() => {
    if (!drawingLayerRef.current) return;
    drawingLayerRef.current.clearLayers();

    if (drawingPoints.length > 0) {
      // Draw line and markers
      const latlngs = drawingPoints.map(pt => [pt[1], pt[0]]);
      
      drawingPoints.forEach((pt, i) => {
        const marker = L.circleMarker([pt[1], pt[0]], {
          radius: 5,
          color: '#fbbf24',
          fillColor: '#f59e0b',
          fillOpacity: 1,
          weight: 2
        });
        drawingLayerRef.current.addLayer(marker);
      });

      if (drawingPoints.length >= 2) {
        const polyline = L.polyline(latlngs, {
          color: '#fbbf24',
          weight: 3,
          dashArray: '5, 5'
        });
        drawingLayerRef.current.addLayer(polyline);
      }
    }

    if (selectedPolygon) {
      const polyLayer = L.geoJSON(selectedPolygon, {
        style: {
          color: '#f59e0b',
          weight: 3,
          dashArray: '6, 6',
          fillColor: '#fbbf24',
          fillOpacity: 0.15,
        }
      });
      drawingLayerRef.current.addLayer(polyLayer);
    }
  }, [drawingPoints, selectedPolygon]);

  // Render Contours Layer
  useEffect(() => {
    if (!contoursLayerRef.current) return;
    contoursLayerRef.current.clearLayers();

    if (!showContours) return;

    const contourData = analysisResult?.contours_preview || sampleContoursGeoJSON;
    if (contourData && contourData.features?.length > 0) {
      const layer = L.geoJSON(contourData, {
        style: (feature) => {
          const elev = feature.properties?.elevation_m || 200;
          return {
            color: '#38bdf8',
            weight: 1.5,
            opacity: 0.45,
          };
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties?.elevation_m) {
            layer.bindTooltip(`Elevation: ${feature.properties.elevation_m.toFixed(1)} m`, {
              sticky: true,
              className: 'custom-contour-tooltip'
            });
          }
        }
      });
      contoursLayerRef.current.addLayer(layer);
    }
  }, [analysisResult, sampleContoursGeoJSON, showContours]);

  // Render Catchment and Pond Results on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !pondLayerRef.current || !catchmentLayerRef.current) return;

    pondLayerRef.current.clearLayers();
    catchmentLayerRef.current.clearLayers();

    if (!analysisResult) return;

    const { pond, catchment } = analysisResult;

    // 1. Overlay Catchment Area Polygon
    if (showCatchment && catchment?.boundary) {
      const catchmentGeoLayer = L.geoJSON(catchment.boundary, {
        style: {
          color: '#0284c7',
          weight: 2.5,
          fillColor: '#0ea5e9',
          fillOpacity: 0.35,
        }
      }).bindPopup(`
        <div class="text-slate-900 font-sans p-1">
          <div class="font-bold text-sm text-sky-800 flex items-center gap-1">
            🌊 Contributing Catchment Basin
          </div>
          <div class="text-xs mt-1 text-slate-700">
            <strong>Area:</strong> ${catchment.area_m2?.toLocaleString()} m² (${catchment.area_hectares} ha)
          </div>
          <div class="text-xs text-slate-700">
            <strong>Runoff Collectible:</strong> ${analysisResult.water_volume?.expected_water_volume_m3?.toLocaleString()} m³
          </div>
        </div>
      `);

      catchmentLayerRef.current.addLayer(catchmentGeoLayer);

      // Fit map to catchment bounds
      try {
        const bounds = catchmentGeoLayer.getBounds();
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
        }
      } catch (err) {
        console.error('Fit bounds error:', err);
      }
    }

    // 2. Overlay Suggested Pond Location Marker
    if (showPondMarker && pond?.latitude && pond?.longitude) {
      // Create Custom Animated HTML Marker
      const pondCustomIcon = L.divIcon({
        className: 'custom-pond-marker',
        html: `
          <div class="pond-pulse"></div>
          <div class="pond-icon-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -12]
      });

      const pondMarker = L.marker([pond.latitude, pond.longitude], { icon: pondCustomIcon })
        .bindPopup(`
          <div class="text-slate-900 font-sans p-1.5 min-w-[200px]">
            <div class="font-bold text-sm text-sky-700 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              📍 Suggested Optimal Pond Location
            </div>
            <div class="grid grid-cols-2 gap-1.5 text-xs text-slate-700 mt-2">
              <div><strong>Lat:</strong> ${pond.latitude.toFixed(5)}°</div>
              <div><strong>Lon:</strong> ${pond.longitude.toFixed(5)}°</div>
              <div><strong>Elevation:</strong> ${pond.elevation_m} m</div>
              <div><strong>Slope:</strong> ${pond.slope_degrees}°</div>
              <div class="col-span-2 text-sky-800 font-semibold mt-1">
                ⭐ Suitability Score: ${pond.suitability_score} / 100
              </div>
            </div>
          </div>
        `);

      pondLayerRef.current.addLayer(pondMarker);
      pondMarker.openPopup();
    }
  }, [analysisResult, showCatchment, showPondMarker]);

  // Reset Extent Button Action
  const handleResetView = () => {
    if (!mapInstanceRef.current) return;
    if (analysisResult?.catchment?.boundary) {
      const geo = L.geoJSON(analysisResult.catchment.boundary);
      mapInstanceRef.current.fitBounds(geo.getBounds(), { padding: [50, 50] });
    } else if (selectedSample?.center) {
      mapInstanceRef.current.setView(selectedSample.center, 14);
    }
  };

  return (
    <div className="relative flex-1 h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-950">
      {/* The Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Left Floating Toolbar: Basemap & Layer Toggles */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {/* Basemap Selector */}
        <div className="glass-panel rounded-xl p-1.5 flex items-center gap-1 shadow-2xl">
          {Object.entries(BASEMAPS).map(([key, bm]) => (
            <button
              key={key}
              onClick={() => setActiveBasemap(key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                activeBasemap === key
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {key === 'satellite' ? '🛰️ Satellite' : key === 'dark' ? '🌙 Dark' : key === 'topo' ? '⛰️ Topo' : '🗺️ OSM'}
            </button>
          ))}
        </div>

        {/* Layer Visibility Toggles */}
        <div className="glass-panel rounded-xl p-1.5 flex items-center gap-1.5 shadow-2xl">
          <button
            onClick={() => setShowCatchment(!showCatchment)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
              showCatchment
                ? 'bg-sky-950/90 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Catchment Polygon Overlay"
          >
            {showCatchment ? <Eye className="h-3.5 w-3.5 text-sky-400" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>Catchment</span>
          </button>

          <button
            onClick={() => setShowPondMarker(!showPondMarker)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
              showPondMarker
                ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Pond Marker"
          >
            {showPondMarker ? <Eye className="h-3.5 w-3.5 text-cyan-400" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>Pond Marker</span>
          </button>

          <button
            onClick={() => setShowContours(!showContours)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
              showContours
                ? 'bg-indigo-950/90 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Elevation Contours"
          >
            {showContours ? <Eye className="h-3.5 w-3.5 text-indigo-400" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>Contours</span>
          </button>
        </div>

        {/* Reset Extent View Button */}
        <button
          onClick={handleResetView}
          className="glass-panel p-2 rounded-xl text-slate-300 hover:text-white hover:border-sky-500/40 transition shadow-2xl"
          title="Recenter & Fit View"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Drawing Instructions Banner (When Drawing Land Area on Map) */}
      {isDrawingMode && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30 bg-amber-500 text-slate-950 px-4 py-2 rounded-full shadow-2xl font-bold text-xs flex items-center gap-2 animate-bounce">
          <Crosshair className="h-4 w-4 animate-spin" />
          <span>Click on the map to define the corners of your Land Parcel (Min 3 points)</span>
          <button
            onClick={() => setIsDrawingMode(false)}
            className="ml-2 bg-slate-950 text-white px-2 py-0.5 rounded-full text-[10px] hover:bg-slate-900"
          >
            Done
          </button>
        </div>
      )}

      {/* Floating Expected Water Volume & Catchment Overlay HUD (Top Right) */}
      {analysisResult && (
        <div className="absolute top-4 right-4 z-20 w-80 glass-panel rounded-2xl p-4 shadow-2xl border border-sky-500/20 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Droplet className="h-4 w-4 text-sky-400" />
              Live Harvest Overlay
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Optimal Sited
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {/* Expected Water Volume Highlighting */}
            <div className="bg-sky-950/60 rounded-xl p-3 border border-sky-500/30">
              <span className="text-[11px] text-sky-300 font-medium block">Expected Collectible Water Volume:</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-white font-mono">
                  {analysisResult.water_volume?.expected_water_volume_m3?.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-sky-400">m³ / year</span>
              </div>
              <div className="text-[11px] text-sky-200/80 mt-1 flex items-center gap-1.5">
                <span>≈ {analysisResult.water_volume?.expected_water_volume_million_liters} Million Liters</span>
                <span>•</span>
                <span className="text-emerald-300 font-medium">
                  {analysisResult.water_volume?.potential_population_supported} villagers
                </span>
              </div>
            </div>

            {/* Catchment & Pond Specs Mini Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Catchment Area</span>
                <span className="font-bold text-slate-100">
                  {analysisResult.catchment?.area_hectares} ha
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ({analysisResult.catchment?.area_m2?.toLocaleString()} m²)
                </span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Pond Elevation</span>
                <span className="font-bold text-slate-100">
                  {analysisResult.pond?.elevation_m} m
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Slope: {analysisResult.pond?.slope_degrees}°
                </span>
              </div>
            </div>

            {/* Pond Suitability Score */}
            <div className="flex items-center justify-between bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-amber-400" />
                Suitability Score:
              </span>
              <span className="font-mono font-bold text-amber-300">
                {analysisResult.pond?.suitability_score} / 100
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend (Bottom Left) */}
      <div className="absolute bottom-6 left-4 z-20 glass-panel px-3 py-2 rounded-xl text-xs flex items-center gap-4 shadow-xl border border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-sky-500 border border-white shadow-sm"></span>
          <span className="text-slate-300 text-[11px]">Suggested Pond</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-4 rounded bg-sky-500/40 border border-sky-400"></span>
          <span className="text-slate-300 text-[11px]">Catchment Basin</span>
        </div>
        {selectedPolygon && (
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-4 rounded bg-amber-500/30 border border-dashed border-amber-400"></span>
            <span className="text-amber-300 text-[11px]">Selected Land</span>
          </div>
        )}
      </div>
    </div>
  );
}
