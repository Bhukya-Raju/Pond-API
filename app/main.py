from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .services.analysis import analyze_contour_file

app = FastAPI(
    title="Village Pond Catchment Analysis API",
    version="1.0.0",
    description="Analyzes KML/KMZ contour maps and estimates a suitable pond location and catchment."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict this to your frontend domain in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyzeContour")
async def analyze_contour(
    file: UploadFile = File(...),
    grid_size: int = Query(180, ge=60, le=350, description="Approximate DEM grid cells per side"),
    sample_spacing_m: float = Query(10.0, gt=0, le=1000, description="Contour sampling spacing in metres"),
):
    name = (file.filename or "").lower()
    if not (name.endswith(".kml") or name.endswith(".kmz")):
        raise HTTPException(status_code=400, detail="Upload a .kml or .kmz contour file.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        result = analyze_contour_file(
            data,
            filename=file.filename or "contours.kml",
            grid_size=grid_size,
            sample_spacing_m=sample_spacing_m,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        # Do not expose stack traces to API users.
        raise HTTPException(status_code=500, detail=f"Terrain analysis failed: {exc}") from exc
