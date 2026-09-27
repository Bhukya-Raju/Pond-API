# Phase 3 VIVA & Video Demo Guide (5-Minute Script)

This guide provides a structured script and operational checklist to record your **5-minute YouTube demo video** and ace the **VIVA session**.

---

## 5-Minute YouTube Video Script Breakdown

### Minute 0:00 – 0:45: Introduction & Mandatory Details
- **Visual:** Open browser showing your frontend at `http://localhost:5173`.
- **Spoken:**
  > *"Hello, my name is Bhukya Raju (ID: 12340520). This is my demonstration for Assignment 1 — Phase 3: Village Pond Catchment & Water Harvesting Optimization. In this video, I will demonstrate the complete working frontend, interactive land area selection on the map, hydrological volume estimation, algorithm mechanics, and our stress test benchmarks across four systems."*

### Minute 0:45 – 2:00: Interactive GIS Map & Land Area Selection
- **Visual:** 
  1. Show the interactive Leaflet map. Switch basemaps (Satellite, Dark Matter, Topographic).
  2. Click **"Draw Land Area"** in the sidebar. Click 4–5 points on the map to draw a custom land parcel.
  3. Adjust the **Annual Rainfall** (e.g., 1000 mm) and **Runoff Coefficient** (e.g., 0.35 for loam).
  4. Click **"Run AI Catchment & Volume Analysis"**.
- **Spoken:**
  > *"Here is our responsive GIS frontend. Users can inspect preloaded 1-meter contour datasets or draw a custom boundary directly on the map. I have delineated a parcel in the watershed. When I trigger the analysis, the backend projects the polygon to local UTM coordinates, derives a DEM surface, and computes the optimal pond siting and catchment boundary."*

### Minute 2:00 – 3:15: Results Visualization & Mathematical Formulation
- **Visual:** 
  1. Point out the animated **pulsing pond marker** at the lowest natural thalweg depression.
  2. Highlight the **blue contributing catchment polygon** overlaid on the terrain.
  3. Highlight the **Live Harvest HUD** showing the Expected Water Volume in $\text{m}^3$ and million liters.
  4. Switch to the **"Hydrology & Volume"** tab. Show the dynamic recalculator and civil reservoir sizing.
- **Spoken:**
  > *"The system overlays all results in real time. The pulsing marker indicates the optimal pond outlet based on our multi-criteria suitability score: 55% flow accumulation, 30% gentle slope, and 15% low elevation. The blue polygon delineates the upstream catchment cells using the D8 steepest descent flow routing. Expected water volume is computed via the Rational Runoff formula: Volume = Area × Rainfall × Runoff Coefficient. For this parcel, we capture over 900 cubic meters of water, sufficient to support rural residents through the dry season."*

### Minute 3:15 – 4:15: Stress, Scaling & 4-System Architectural Benchmarks
- **Visual:** Click the **"Stress & Benchmarks"** button in the navbar. Show the comparison table of the 4 systems. Run the live latency probe.
- **Spoken:**
  > *"To evaluate system limits under stress, we tested four architectural configurations using our custom Go load generator (main.go with goroutines) and Python concurrent harness. System 1 (single-worker) provides a baseline at 14.6 requests/second. System 2 with multi-worker Uvicorn achieves nearly 60 requests/second with average latency dropping to 16.8 milliseconds. System 3 proved zero error rates under concurrent load, and System 4 demonstrates containerized deployment."*

### Minute 4:15 – 5:00: VIVA Report & Conclusion
- **Visual:** Click the **"VIVA Report"** button in the navbar. Show the student details and LaTeX code compliant with the Overleaf template.
- **Spoken:**
  > *"Our documentation strictly adheres to the instructor's Overleaf template, including mandatory student details, mathematical derivations, and limitations such as siltation traps and soil percolation. All code is committed to our GitHub repository. Thank you."*

---

## Pre-Demo Checklist
- [ ] Run `./run_demo.sh` to have both servers active.
- [ ] Check `http://localhost:8000/docs` to verify FastAPI Swagger.
- [ ] Check `http://localhost:5173` to verify the frontend.
- [ ] Test drawing a land parcel on the map and running analysis once before recording.
