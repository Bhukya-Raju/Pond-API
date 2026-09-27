import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_samples_endpoint():
    response = client.get("/samples")
    assert response.status_code == 200
    data = response.json()
    assert "samples" in data
    assert len(data["samples"]) >= 2


def test_calculate_volume_endpoint():
    response = client.post("/calculateVolume", json={
        "catchment_area_m2": 25000.0,
        "rainfall_mm": 1200.0,
        "runoff_coefficient": 0.40,
        "pond_depth_m": 3.5
    })
    assert response.status_code == 200
    data = response.json()
    assert data["expected_water_volume_m3"] == 12000.0
    assert data["expected_water_volume_million_liters"] == 12.0
    assert data["potential_population_supported"] > 0


def test_analyze_contour_sample():
    sample_path = os.path.join(BASE_DIR, "sample_test_contours.kml")
    with open(sample_path, "rb") as f:
        response = client.post(
            "/analyzeContour?rainfall_mm=1000&runoff_coefficient=0.35&grid_size=80",
            files={"file": ("sample_test_contours.kml", f, "application/vnd.google-earth.kml+xml")}
        )
    assert response.status_code == 200
    data = response.json()
    assert "pond" in data
    assert "catchment" in data
    assert "water_volume" in data
    assert data["pond"]["latitude"] != 0
    assert data["catchment"]["area_m2"] > 0
    assert data["water_volume"]["expected_water_volume_m3"] > 0


def test_invalid_file_extension():
    response = client.post(
        "/analyzeContour",
        files={"file": ("test.txt", b"invalid data", "text/plain")}
    )
    assert response.status_code == 400
