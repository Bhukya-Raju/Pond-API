from __future__ import annotations

import os
import json
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from .services.analysis import (
    analyze_contour_file,
    analyze_land_area_polygon,
    calculate_water_volume
)
from .services.kml_parser import parse_contours

app = FastAPI(
    title="Village Pond Catchment & Water Harvesting Analysis API",
    version="2.0.0",
    description="Analyzes KML/KMZ contour maps, user-selected land areas, calculates optimal pond locations, upstream catchment boundaries, and expected water volume collection."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class PolygonAnalysisRequest(BaseModel):
    polygon: Dict[str, Any] = Field(..., description="GeoJSON Polygon geometry representing user-selected land area")
    rainfall_mm: float = Field(1000.0, ge=10.0, le=10000.0, description="Annual or monsoon rainfall in mm")
    runoff_coefficient: float = Field(0.35, ge=0.01, le=1.0, description="Hydrological runoff coefficient (0.10 to 0.90)")
    grid_size: int = Field(180, ge=60, le=350, description="DEM grid resolution per dimension")
    sample_spacing_m: float = Field(10.0, gt=0, le=1000.0, description="Contour sampling spacing in metres")
    dataset_preset: Optional[str] = Field("contours_1m.kml", description="Base contour dataset to clip from, or 'auto'")


class VolumeRecalcRequest(BaseModel):
    catchment_area_m2: float = Field(..., gt=0, description="Catchment area in square metres")
    rainfall_mm: float = Field(1000.0, ge=0, le=10000.0, description="Rainfall in mm")
    runoff_coefficient: float = Field(0.35, ge=0.01, le=1.0, description="Runoff coefficient")
    pond_depth_m: float = Field(3.0, gt=0.5, le=20.0, description="Estimated pond depth in metres")


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Pond Catchment & Water Harvesting Analysis API",
        "version": "2.0.0",
        "phase": "Phase 3 VIVA & Demo",
        "endpoints": [
            "/health",
            "/docs",
            "/samples",
            "/analyzeContour",
            "/analyzeArea",
            "/calculateVolume"
        ]
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "system": "Village Pond Catchment Engine",
        "phase": "Phase 3 Ready"
    }


@app.get("/samples")
def list_samples():
    """Lists preloaded real-world contour sample datasets available for instant demonstration."""
    samples = [
        {
            "id": "contours_1m",
            "filename": "contours_1m.kml",
            "name": "IIT Bhilai / Durg Watershed (1m Contours)",
            "description": "High-resolution 1-metre contour dataset containing 1356 elevation contours.",
            "center": [21.2518, 81.2970],
            "bounds": [81.2814, 21.2398, 81.3126, 21.2635],
            "contour_count": 1356,
            "elevation_range": "30m - 298m"
        },
        {
            "id": "sample_test_contours",
            "filename": "sample_test_contours.kml",
            "name": "Semi-Arid Valley Region (Sample Contours)",
            "description": "Concentric depression valley contour dataset ideal for quick testing.",
            "center": [17.0000, 78.0000],
            "bounds": [77.9955, 16.9954, 78.0045, 17.0045],
            "contour_count": 6,
            "elevation_range": "270m - 320m"
        }
    ]
    return {"samples": samples}


@app.get("/samples/{filename}/geojson")
def get_sample_geojson(filename: str, max_features: int = 150):
    """Returns simplified GeoJSON contours for map overlay display."""
    file_path = os.path.join(BASE_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Sample dataset not found.")

    try:
        with open(file_path, "rb") as f:
            data = f.read()
        contours = parse_contours(data, filename)

        features = []
        step = max(1, len(contours) // max_features)
        for i in range(0, len(contours), step):
            c = contours[i]
            features.append({
                "type": "Feature",
                "geometry": c.geometry.__geo_interface__,
                "properties": {
                    "elevation_m": c.elevation_m,
                    "name": c.source_name
                }
            })

        return {
            "type": "FeatureCollection",
            "features": features,
            "total_contours": len(contours)
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate GeoJSON: {exc}")


@app.post("/calculateVolume")
def recalculate_volume(req: VolumeRecalcRequest):
    """Interactive endpoint to recalculate expected harvestable water volume dynamically."""
    return calculate_water_volume(
        catchment_area_m2=req.catchment_area_m2,
        rainfall_mm=req.rainfall_mm,
        runoff_coefficient=req.runoff_coefficient,
        pond_depth_m=req.pond_depth_m
    )


@app.post("/analyzeContour")
async def analyze_contour(
    file: UploadFile = File(...),
    grid_size: int = Query(180, ge=60, le=350, description="Approximate DEM grid cells per side"),
    sample_spacing_m: float = Query(10.0, gt=0, le=1000, description="Contour sampling spacing in metres"),
    rainfall_mm: float = Query(1000.0, ge=10.0, le=10000.0, description="Annual rainfall in mm"),
    runoff_coefficient: float = Query(0.35, ge=0.01, le=1.0, description="Runoff coefficient C (0.1 to 0.9)"),
    polygon_geojson: Optional[str] = Form(None, description="Optional GeoJSON Polygon to restrict analysis to a selected land parcel")
):
    name = (file.filename or "").lower()
    if not (name.endswith(".kml") or name.endswith(".kmz")):
        raise HTTPException(status_code=400, detail="Upload a .kml or .kmz contour file.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    parsed_poly = None
    if polygon_geojson:
        try:
            parsed_poly = json.loads(polygon_geojson)
        except Exception:
            pass

    try:
        result = analyze_contour_file(
            data,
            filename=file.filename or "contours.kml",
            grid_size=grid_size,
            sample_spacing_m=sample_spacing_m,
            rainfall_mm=rainfall_mm,
            runoff_coefficient=runoff_coefficient,
            selected_polygon=parsed_poly
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Terrain analysis failed: {exc}") from exc


@app.post("/analyzeArea")
def analyze_selected_area(req: PolygonAnalysisRequest):
    """
    Accepts a user-drawn polygon on the map and computes optimal pond location,
    catchment delineation, and expected water volume for that exact land parcel.
    """
    try:
        default_kml = os.path.join(BASE_DIR, "contours_1m.kml")
        result = analyze_land_area_polygon(
            polygon_geojson=req.polygon,
            rainfall_mm=req.rainfall_mm,
            runoff_coefficient=req.runoff_coefficient,
            grid_size=req.grid_size,
            sample_spacing_m=req.sample_spacing_m,
            default_kml_path=default_kml if os.path.exists(default_kml) else None
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Area analysis failed: {exc}") from exc
