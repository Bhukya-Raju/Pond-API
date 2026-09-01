from __future__ import annotations

import math
import numpy as np
from scipy.interpolate import LinearNDInterpolator, NearestNDInterpolator
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union


def sample_contours(contours, spacing_m: float):
    xs, ys, zs = [], [], []
    for c in contours:
        # Number of samples is based on line length, with endpoints included.
        n = max(2, int(math.ceil(c.geometry.length / spacing_m)) + 1)
        for d in np.linspace(0, c.geometry.length, n):
            p = c.geometry.interpolate(float(d))
            xs.append(p.x)
            ys.append(p.y)
            zs.append(c.elevation_m)
    return np.asarray(xs), np.asarray(ys), np.asarray(zs)


def make_dem(contours, grid_size=180, sample_spacing_m=10.0):
    xs, ys, zs = sample_contours(contours, sample_spacing_m)
    if len(xs) < 20:
        raise ValueError("Not enough contour samples to build a terrain surface.")

    minx, maxx = float(xs.min()), float(xs.max())
    miny, maxy = float(ys.min()), float(ys.max())

    # Limit memory/time while preserving the input aspect ratio.
    width, height = maxx - minx, maxy - miny
    if width <= 0 or height <= 0:
        raise ValueError("Contour extent is invalid.")

    nx = max(40, int(grid_size))
    ny = max(40, int(round(grid_size * height / width)))
    ny = min(max(ny, 40), 350)

    gx = np.linspace(minx, maxx, nx)
    gy = np.linspace(miny, maxy, ny)
    X, Y = np.meshgrid(gx, gy)

    linear = LinearNDInterpolator(np.column_stack([xs, ys]), zs)
    Z = np.asarray(linear(X, Y), dtype=float)

    # Fill holes outside the convex hull using nearest interpolation.
    missing = ~np.isfinite(Z)
    if missing.any():
        nearest = NearestNDInterpolator(np.column_stack([xs, ys]), zs)
        Z[missing] = nearest(X[missing], Y[missing])

    return X, Y, Z, (minx, miny, maxx, maxy)


def slope_degrees(Z, X, Y):
    dx = float(np.mean(np.diff(X[0, :])))
    dy = float(np.mean(np.diff(Y[:, 0])))
    dz_dy, dz_dx = np.gradient(Z, dy, dx)
    return np.degrees(np.arctan(np.hypot(dz_dx, dz_dy)))


def d8_flow_direction(Z):
    """
    Return a downstream cell index for every DEM cell.
    Flat cells point to themselves. Sinks are retained as outlets.
    """
    rows, cols = Z.shape
    downstream = np.full((rows, cols, 2), -1, dtype=np.int32)

    for r in range(rows):
        for c in range(cols):
            best = None
            best_z = Z[r, c]
            for dr, dc in (
                (-1,-1), (-1,0), (-1,1),
                (0,-1),           (0,1),
                (1,-1),  (1,0),  (1,1)
            ):
                rr, cc = r + dr, c + dc
                if 0 <= rr < rows and 0 <= cc < cols and Z[rr, cc] < best_z:
                    best_z = Z[rr, cc]
                    best = (rr, cc)
            if best:
                downstream[r, c] = best
    return downstream


def flow_accumulation(downstream):
    rows, cols = downstream.shape[:2]
    total = rows * cols
    acc = np.ones((rows, cols), dtype=np.float64)

    # Process cells from high to low elevation indirectly using repeated
    # indegree/topological traversal.
    indegree = np.zeros((rows, cols), dtype=np.int32)
    for r in range(rows):
        for c in range(cols):
            rr, cc = downstream[r, c]
            if rr >= 0:
                indegree[rr, cc] += 1

    queue = [(r, c) for r in range(rows) for c in range(cols) if indegree[r, c] == 0]
    head = 0
    processed = 0

    while head < len(queue):
        r, c = queue[head]
        head += 1
        processed += 1
        rr, cc = downstream[r, c]
        if rr >= 0:
            acc[rr, cc] += acc[r, c]
            indegree[rr, cc] -= 1
            if indegree[rr, cc] == 0:
                queue.append((rr, cc))

    # In rare flat/cyclic cases, remaining cells keep their local value.
    return acc


def choose_pond_candidate(Z, slope, accumulation, X, Y):
    """
    Generalized candidate selection:
      - prefer high flow accumulation,
      - prefer lower slope,
      - prefer moderate/low elevation,
      - avoid the outer 3% border.
    This is a planning heuristic, not a civil-engineering design.
    """
    rows, cols = Z.shape
    border_r = max(1, int(rows * 0.03))
    border_c = max(1, int(cols * 0.03))

    valid = np.ones_like(Z, dtype=bool)
    valid[:border_r, :] = valid[-border_r:, :] = False
    valid[:, :border_c] = valid[:, -border_c:] = False

    z = Z[valid]
    s = slope[valid]
    a = accumulation[valid]

    def norm(v, inverse=False):
        lo, hi = np.percentile(v, 5), np.percentile(v, 95)
        if hi <= lo:
            out = np.ones_like(v, dtype=float)
        else:
            out = np.clip((v - lo) / (hi - lo), 0, 1)
        return 1 - out if inverse else out

    # Higher accumulation is better; lower slope and lower elevation are preferred.
    score = (
        0.55 * norm(a) +
        0.30 * norm(s, inverse=True) +
        0.15 * norm(z, inverse=True)
    )

    idx = np.flatnonzero(valid)
    best_flat = idx[int(np.argmax(score))]
    r, c = np.unravel_index(best_flat, Z.shape)

    return r, c, float(score.max())


def trace_catchment(outlet_r, outlet_c, downstream):
    """Reverse-trace all cells whose D8 path reaches the selected outlet."""
    rows, cols = downstream.shape[:2]
    total = rows * cols
    upstream = [[] for _ in range(total)]

    # Build reverse links once: target cell -> cells that flow into it.
    for r in range(rows):
        for c in range(cols):
            rr, cc = downstream[r, c]
            if rr >= 0:
                upstream[rr * cols + cc].append(r * cols + c)

    start = outlet_r * cols + outlet_c
    visited = np.zeros(total, dtype=bool)
    visited[start] = True
    queue = [start]
    head = 0

    while head < len(queue):
        current = queue[head]
        head += 1
        for source in upstream[current]:
            if not visited[source]:
                visited[source] = True
                queue.append(source)

    return visited.reshape(rows, cols)


def catchment_area_m2(catchment, X, Y):
    dx = abs(float(np.mean(np.diff(X[0, :]))))
    dy = abs(float(np.mean(np.diff(Y[:, 0]))))
    return float(catchment.sum() * dx * dy)
