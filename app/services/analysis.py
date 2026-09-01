from __future__ import annotations

import numpy as np
from pyproj import CRS, Transformer
from shapely.geometry import Point, Polygon
from shapely.ops import transform
from .kml_parser import parse_contours
from .terrain import (
    make_dem, slope_degrees, d8_flow_direction, flow_accumulation,
    choose_pond_candidate, trace_catchment, catchment_area_m2
)


def _to_local_utm(contours):
    from shapely.ops import unary_union
    union = unary_union([c.geometry for c in contours])
    lon, lat = union.centroid.x, union.centroid.y

    utm_zone = int((lon + 180) // 6) + 1
    epsg = 32600 + utm_zone if lat >= 0 else 32700 + utm_zone
    src = CRS.from_epsg(4326)
    dst = CRS.from_epsg(epsg)
    transformer = Transformer.from_crs(src, dst, always_xy=True)

    projected = []
    for c in contours:
        projected.append(
            type(c)(
                geometry=transform(transformer.transform, c.geometry),
                elevation_m=c.elevation_m,
                source_name=c.source_name,
            )
        )
    return projected, dst


def analyze_contour_file(data: bytes, filename: str, grid_size: int, sample_spacing_m: float):
    contours = parse_contours(data, filename)
    projected, crs = _to_local_utm(contours)

    X, Y, Z, bounds = make_dem(
        projected,
        grid_size=grid_size,
        sample_spacing_m=sample_spacing_m,
    )
    slope = slope_degrees(Z, X, Y)
    downstream = d8_flow_direction(Z)
    accumulation = flow_accumulation(downstream)

    r, c, score = choose_pond_candidate(
        Z, slope, accumulation, X, Y
    )
    catchment = trace_catchment(r, c, downstream)
    area_m2 = catchment_area_m2(catchment, X, Y)

    # Approximate catchment polygon from the selected grid cells.
    dx = abs(float(np.mean(np.diff(X[0, :]))))
    dy = abs(float(np.mean(np.diff(Y[:, 0]))))
    cells = []
    for rr, cc in zip(*np.where(catchment)):
        x, y = X[rr, cc], Y[rr, cc]
        cells.append(
            Polygon([
                (x-dx/2, y-dy/2), (x+dx/2, y-dy/2),
                (x+dx/2, y+dy/2), (x-dx/2, y+dy/2)
            ])
        )

    # Keep the JSON reasonably small: return a simplified boundary rather than all cells.
    from shapely.ops import unary_union
    catchment_geom = unary_union(cells).buffer(0)
    simplified = catchment_geom.simplify(max(dx, dy) * 1.5, preserve_topology=True)

    # Convert the selected point and catchment polygon back to WGS84.
    to_wgs84 = Transformer.from_crs(crs, CRS.from_epsg(4326), always_xy=True).transform
    pond_wgs = transform(to_wgs84, Point(float(X[r, c]), float(Y[r, c])))
    catchment_wgs = transform(to_wgs84, simplified)

    def geojson_geometry(g):
        return g.__geo_interface__

    return {
        "input": {
            "filename": filename,
            "contour_count": len(projected),
            "elevation_min_m": float(min(c.elevation_m for c in projected)),
            "elevation_max_m": float(max(c.elevation_m for c in projected)),
            "analysis_crs": crs.to_string(),
            "bounds_projected_m": {
                "min_x": bounds[0], "min_y": bounds[1],
                "max_x": bounds[2], "max_y": bounds[3]
            }
        },
        "pond": {
            "latitude": float(pond_wgs.y),
            "longitude": float(pond_wgs.x),
            "elevation_m": float(Z[r, c]),
            "slope_degrees": float(slope[r, c]),
            "flow_accumulation_cells": float(accumulation[r, c]),
            "suitability_score": round(score * 100, 2)
        },
        "catchment": {
            "area_m2": round(area_m2, 2),
            "area_hectares": round(area_m2 / 10000.0, 4),
            "boundary": geojson_geometry(catchment_wgs)
        },
        "method": {
            "surface": "Contour vertices sampled and interpolated to a DEM grid.",
            "flow_model": "D8 steepest-downhill flow direction.",
            "catchment": "All DEM cells whose D8 flow path reaches the selected pond outlet.",
            "pond_selection": "Weighted terrain heuristic using flow accumulation, slope and elevation.",
            "weights": {
                "flow_accumulation": 0.55,
                "slope": 0.30,
                "elevation": 0.15
            },
            "note": "This is a planning-level estimate. Field survey and engineering validation are required before construction."
        }
    }
