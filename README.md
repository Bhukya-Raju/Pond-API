# AI-Based Village Pond Planning System
## Phase 2 - Pond Catchment Analysis Backend

This backend implements:

`POST /analyzeContour`

It accepts a `.kml` or `.kmz` contour map and returns:

- derived pond candidate location
- elevation and slope at the candidate
- suitability score
- estimated catchment area in m² and hectares
- catchment boundary as GeoJSON
- analysis method and weights

## 1. Setup

### Ubuntu/Linux

```bash
sudo apt update
sudo apt install -y python3-venv

cd pond_catchment_backend
python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

### Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open:

- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/health

## 2. Test the assignment API

```bash
curl -X POST \
  -F "file=@contours_1m.kml" \
  "http://127.0.0.1:8000/analyzeContour"
```

For a KMZ:

```bash
curl -X POST \
  -F "file=@contours_1m.kmz" \
  "http://127.0.0.1:8000/analyzeContour"
```

You can tune analysis resolution:

```bash
curl -X POST \
  -F "file=@contours_1m.kml" \
  "http://127.0.0.1:8000/analyzeContour?grid_size=220&sample_spacing_m=8"
```

## 3. Swagger demonstration

Go to `/docs` -> `POST /analyzeContour` -> `Try it out` -> choose the supplied KML -> `Execute`.

This automatically produces interactive API documentation suitable for the report/demo.

## 4. Approach

1. Parse contour LineStrings from KML/KMZ.
2. Read contour elevations from ExtendedData, name/description, or coordinate Z values.
3. Reproject the data to a local UTM CRS so area and distance are measured in metres.
4. Sample points along contours.
5. Interpolate those samples into a DEM grid.
6. Calculate slope.
7. Calculate D8 downhill flow direction.
8. Calculate flow accumulation.
9. Rank candidate cells using:
   - 55% flow accumulation
   - 30% low-slope preference
   - 15% low-elevation preference
10. Trace every upstream cell that drains to the selected outlet.
11. Calculate catchment area from the grid cell size.
12. Return the result as JSON, including a GeoJSON catchment boundary.

No coordinates, locations, or result values from the sample contour map are hard-coded.

## 5. Expected KML structure

The parser works with common KML structures such as:

- Placemark -> LineString -> coordinates
- ExtendedData/Data -> elevation
- name/description containing contour elevation
- 3D coordinates where the third coordinate is elevation

If your instructor's file uses a different elevation field, update only:
`app/services/kml_parser.py`

The rest of the analysis pipeline remains unchanged.

## 6. API response

Example shape:

```json
{
  "input": {
    "filename": "contours_1m.kml",
    "contour_count": 120,
    "elevation_min_m": 100.0,
    "elevation_max_m": 220.0,
    "analysis_crs": "EPSG:32644"
  },
  "pond": {
    "latitude": 17.98,
    "longitude": 79.59,
    "elevation_m": 135.0,
    "slope_degrees": 2.4,
    "flow_accumulation_cells": 540.0,
    "suitability_score": 87.4
  },
  "catchment": {
    "area_m2": 125000.0,
    "area_hectares": 12.5,
    "boundary": {
      "type": "Polygon",
      "coordinates": []
    }
  },
  "method": {}
}
```

The values above are illustrative only; the running API derives values from the uploaded file.

## 7. Project structure

```text
pond_catchment_backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   └── services/
│       ├── __init__.py
│       ├── kml_parser.py
│       ├── terrain.py
│       └── analysis.py
├── tests/
│   └── test_health.py
├── requirements.txt
├── README.md
└── .gitignore
```

## 8. Important limitation

This backend is a planning/research prototype. It does not replace a surveyed DEM, hydrological study, soil investigation, land ownership check, or civil-engineering design.
