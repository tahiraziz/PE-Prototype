"""
Tests for FastAPI endpoints
"""

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


class TestHealthEndpoint:
    """Test health check endpoint"""
    
    def test_health_check(self, client):
        """Test /health endpoint"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data


class TestRootEndpoint:
    """Test root endpoint"""
    
    def test_root(self, client):
        """Test / endpoint returns API info"""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "endpoints" in data
        assert "disclaimer" in data


class TestPEAssessmentEndpoint:
    """Test PE assessment endpoint"""
    
    def test_assessment_with_direct_features(self, client):
        """Test assessment with directly provided features"""
        request_data = {
            "patient_id": "test-patient-123",
            "features": {
                "age": 60,
                "gender": "M",
                "triage_hr": 90,
                "triage_o2sat": 96,
                "d_dimer": 450,
                "triage_sbp": 120,
                "triage_dbp": 80
            }
        }
        
        response = client.post("/api/pe-assessment", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "patient_id" in data
        assert data["patient_id"] == "test-patient-123"
        assert "probability" in data
        assert "threshold" in data
        assert "decision" in data
        assert "explanation" in data
        assert "feature_summary" in data
        assert "safety_note" in data
        
        # Check values are reasonable
        assert 0.0 <= data["probability"] <= 1.0
        assert data["threshold"] == 0.08
        assert data["decision"] in ["rule_out", "continue_workup"]
    
    def test_assessment_missing_patient_id(self, client):
        """Test assessment fails without patient_id"""
        request_data = {
            "features": {"age": 60}
        }
        
        response = client.post("/api/pe-assessment", json=request_data)
        
        # Should fail validation (422 Unprocessable Entity)
        assert response.status_code == 422
    
    def test_assessment_without_session_or_features(self, client):
        """Test assessment fails without session or features"""
        request_data = {
            "patient_id": "test-patient-123"
            # No session_id and no features
        }
        
        response = client.post("/api/pe-assessment", json=request_data)
        
        # Should fail (401 Unauthorized or 500 error depending on implementation)
        assert response.status_code in [401, 500]


class TestOAuthEndpoints:
    """Test OAuth flow endpoints"""
    
    def test_launch_endpoint_exists(self, client):
        """Test that /launch endpoint exists"""
        # Without proper Epic config, this will fail, but endpoint should exist
        response = client.get("/launch")
        
        # Should respond (even if with error due to missing config)
        assert response.status_code in [200, 302, 500]
    
    def test_callback_endpoint_exists(self, client):
        """Test that /callback endpoint exists"""
        # Call with dummy params
        response = client.get("/callback?code=dummy&state=dummy")
        
        # Should respond (even if with error)
        assert response.status_code in [200, 302, 400, 500]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

