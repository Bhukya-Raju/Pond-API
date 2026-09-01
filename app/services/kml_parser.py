from __future__ import annotations

import io
import re
import zipfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import List

from shapely.geometry import LineString


@dataclass
class Contour:
    geometry: LineString
    elevation_m: float
    source_name: str


_NUM_RE = re.compile(r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)")


def _numbers(text: str) -> list[float]:
    return [float(x) for x in _NUM_RE.findall(text or "")]


def _elevation_from_placemark(pm: ET.Element) -> float | None:
    # 1) ExtendedData: <Data name="elevation"><value>123</value></Data>
    for elem in pm.iter():
        tag = elem.tag.rsplit("}", 1)[-1].lower()
        if tag in {"data", "simpledata"}:
            name = (elem.attrib.get("name") or elem.attrib.get("NAME") or "").lower()
            if any(k in name for k in ("elev", "height", "contour", "level", "z")):
                value = next((c.text for c in elem.iter() if c.tag.rsplit("}", 1)[-1].lower() == "value"), None)
                if value is None:
                    value = elem.text
                nums = _numbers(value or "")
                if nums:
                    return nums[0]

    # 2) Name/description such as "Contour 123 m" or "123.0"
    for tag_name in ("name", "description"):
        for elem in pm.iter():
            if elem.tag.rsplit("}", 1)[-1].lower() == tag_name:
                nums = _numbers(elem.text or "")
                if nums:
                    # Prefer a number followed by m/metre/meters in text; otherwise first number.
                    text = elem.text or ""
                    m = re.search(r"([-+]?\d+(?:\.\d+)?)\s*(?:m|meter|meters|metre|metres)\b", text, re.I)
                    return float(m.group(1)) if m else nums[0]

    # 3) If altitude is embedded as the third coordinate, parser handles it separately.
    return None


def _parse_coordinates(pm: ET.Element):
    for elem in pm.iter():
        if elem.tag.rsplit("}", 1)[-1].lower() == "coordinates":
            raw = (elem.text or "").strip()
            pts = []
            for token in raw.split():
                vals = token.split(",")
                if len(vals) >= 2:
                    try:
                        x, y = float(vals[0]), float(vals[1])
                        z = float(vals[2]) if len(vals) >= 3 and vals[2] else None
                        pts.append((x, y, z))
                    except ValueError:
                        continue
            return pts
    return []


def _read_kml_bytes(data: bytes, filename: str) -> bytes:
    if filename.lower().endswith(".kmz"):
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            kml_names = [n for n in z.namelist() if n.lower().endswith(".kml")]
            if not kml_names:
                raise ValueError("KMZ does not contain a KML file.")
            # Prefer doc.kml if present.
            kml_name = next((n for n in kml_names if n.lower().endswith("doc.kml")), kml_names[0])
            return z.read(kml_name)
    return data


def parse_contours(data: bytes, filename: str) -> List[Contour]:
    kml = _read_kml_bytes(data, filename)
    try:
        root = ET.fromstring(kml)
    except ET.ParseError as exc:
        raise ValueError("The uploaded file is not valid KML/XML.") from exc

    contours: List[Contour] = []

    for pm in root.iter():
        if pm.tag.rsplit("}", 1)[-1].lower() != "placemark":
            continue

        coords = _parse_coordinates(pm)
        if len(coords) < 2:
            continue

        elevation = _elevation_from_placemark(pm)

        # If KML contains Z values, use the median non-zero/valid Z.
        z_values = [p[2] for p in coords if p[2] is not None]
        if elevation is None and z_values:
            elevation = sum(z_values) / len(z_values)

        if elevation is None:
            continue

        xy = [(p[0], p[1]) for p in coords]
        line = LineString(xy)
        if line.is_empty or line.length == 0:
            continue

        name = next(
            ((e.text or "").strip() for e in pm.iter()
             if e.tag.rsplit("}", 1)[-1].lower() == "name" and (e.text or "").strip()),
            "unnamed"
        )
        contours.append(Contour(line, float(elevation), name))

    if len(contours) < 3:
        raise ValueError(
            "Fewer than 3 usable contour lines were found. "
            "Make sure the KML contains LineString contours and an elevation value "
            "in ExtendedData, name/description, or the coordinate Z value."
        )

    elevations = sorted({round(c.elevation_m, 6) for c in contours})
    if len(elevations) < 2:
        raise ValueError("Contour elevations could not be distinguished.")

    return contours
