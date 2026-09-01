# Assignment 1 - Phase 2 Report
## Pond Catchment Analysis Backend

### 1. Student Details
- Name: __________________
- Course/Section: __________________
- GitHub Repository: __________________
- Working API URL: __________________

### 2. Problem Statement
Develop a backend API that accepts a contour map in KML/KMZ format, analyzes terrain, identifies a suitable pond region, estimates its catchment area, and returns the information in JSON.

### 3. System Architecture
```text
Client
  |
  | multipart/form-data
  v
POST /analyzeContour
  |
  v
KML/KMZ Parser
  |
  v
Local UTM Projection
  |
  v
Contour Sampling -> DEM Interpolation
  |
  v
Slope + D8 Flow Direction
  |
  v
Flow Accumulation
  |
  v
Pond Candidate Ranking
  |
  v
Catchment Delineation
  |
  v
JSON + GeoJSON Response
```

### 4. Catchment Estimation Approach

The implementation does not hard-code the supplied sample's coordinates or answer.

1. Contour lines are extracted from the uploaded KML/KMZ.
2. Elevation is read from ExtendedData, name/description, or 3D coordinates.
3. Contours are projected to a local UTM coordinate system.
4. Points are sampled along each contour.
5. A continuous elevation surface (DEM) is interpolated from those samples.
6. Slope is computed from the DEM.
7. D8 flow direction routes each cell toward its steepest lower neighbour.
8. Flow accumulation estimates how much upstream terrain drains through each cell.
9. Candidate pond cells are ranked using flow accumulation, slope, and elevation.
10. The upstream cells that drain to the selected outlet form the catchment.
11. Catchment area is calculated from the number of cells and cell dimensions.

### 5. Pond Selection Score

```text
Suitability =
    0.55 * normalized(flow accumulation)
  + 0.30 * normalized(inverse slope)
  + 0.15 * normalized(inverse elevation)
```

Higher flow accumulation and lower slope/elevation are preferred.

### 6. API Documentation

#### POST /analyzeContour

**Content-Type:** multipart/form-data

**Request field:**
- `file`: KML/KMZ contour file

**Optional query parameters:**
- `grid_size`: DEM resolution, default 180
- `sample_spacing_m`: contour sampling interval, default 10 m

**Success response:** HTTP 200 JSON containing:
- input information
- pond coordinates
- pond elevation
- slope
- suitability score
- catchment area
- catchment GeoJSON boundary
- analysis method

**Errors:**
- 400: wrong file type or empty file
- 422: contour/elevation data cannot be interpreted
- 500: unexpected processing failure

### 7. Demonstration

Attach screenshots of:
1. `GET /health`
2. Swagger UI at `/docs`
3. `POST /analyzeContour` with the instructor-provided `contours_1m.kml`
4. Successful JSON response
5. GitHub repository

### 8. Extensibility

The design separates:
- KML/KMZ parsing
- terrain interpolation
- hydrological analysis
- pond selection
- API layer

Therefore, future phases can add rainfall, land-cover, soil, satellite imagery, database storage, and frontend map visualization without rewriting the core API route.

### 9. Limitations

The current result is a planning-level estimate. A final pond design requires accurate DEM data, field survey, soil/geotechnical information, land ownership/availability, hydrological validation, and engineering design.

### 10. Conclusion

The backend provides a generalized contour-to-catchment pipeline through a single REST API and does not depend on hard-coded coordinates or results from the supplied sample.
