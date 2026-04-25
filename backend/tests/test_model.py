"""
Tests for PE model serving functionality
"""

import pytest
import numpy as np
from pe_model.serve_model import (
    load_pe_model,
    predict_pe_probability,
    interpret_pe_result,
    get_required_features,
    get_model_info
)


class TestModelLoading:
    """Test model loading functionality"""
    
    def test_load_model(self):
        """Test that model loads without error"""
        load_pe_model()
        # If we get here, loading succeeded
        assert True
    
    def test_get_required_features(self):
        """Test that required features list is correct"""
        features = get_required_features()
        
        assert isinstance(features, list)
        assert len(features) == 25  # 25 features as specified
        
        # Check key features are present
        assert "age" in features
        assert "gender" in features
        assert "d_dimer" in features
        assert "triage_hr" in features
        assert "triage_o2sat" in features
    
    def test_get_model_info(self):
        """Test model info retrieval"""
        info = get_model_info()
        
        assert isinstance(info, dict)
        assert "model_type" in info
        assert "threshold" in info
        assert info["threshold"] == 0.08  # Correct threshold
        assert "performance" in info
        assert info["performance"]["sensitivity"] == 0.974  # Documented performance


class TestPrediction:
    """Test prediction functionality"""
    
    @classmethod
    def setup_class(cls):
        """Load model once for all tests"""
        load_pe_model()
    
    def test_predict_with_complete_features(self):
        """Test prediction with all features provided"""
        patient_features = {
            "age": 65,
            "gender": "M",
            "bmi": 28.5,
            "height_cm": 175,
            "weight_lbs": 180,
            "triage_hr": 95,
            "triage_rr": 18,
            "triage_o2sat": 96,
            "triage_temp": 37.0,
            "triage_sbp": 130,
            "triage_dbp": 80,
            "d_dimer": 450,
            "troponin_t": 0.01,
            "ntprobnp": 100,
            "creatinine": 1.0,
            "hemoglobin": 14.0,
            "wbc": 8.0,
            "platelet": 250,
            "sodium": 140,
            "potassium": 4.0,
            "bun": 15,
            "glucose": 100,
            "lactate": 1.5,
            "po2": 90,
            "pco2": 40
        }
        
        probability = predict_pe_probability(patient_features)
        
        # Check valid probability
        assert isinstance(probability, float)
        assert 0.0 <= probability <= 1.0
    
    def test_predict_with_missing_features(self):
        """Test prediction handles missing features gracefully"""
        patient_features = {
            "age": 50,
            "gender": "F",
            "triage_hr": 80,
            "triage_o2sat": 98,
            "d_dimer": 300,
            # Many features missing - should handle via imputation
        }
        
        probability = predict_pe_probability(patient_features)
        
        # Should still return valid probability
        assert isinstance(probability, float)
        assert 0.0 <= probability <= 1.0
    
    def test_predict_high_risk_patient(self):
        """Test prediction for high-risk features"""
        patient_features = {
            "age": 75,
            "gender": "M",
            "triage_hr": 120,  # Tachycardia
            "triage_o2sat": 88,  # Hypoxemia
            "d_dimer": 2000,  # Very elevated D-dimer
            "triage_sbp": 85,  # Hypotension
        }
        
        probability = predict_pe_probability(patient_features)
        
        # Expect higher probability for high-risk patient
        # (Note: actual value depends on model, but should be valid)
        assert isinstance(probability, float)
        assert 0.0 <= probability <= 1.0
    
    def test_predict_low_risk_patient(self):
        """Test prediction for low-risk features"""
        patient_features = {
            "age": 30,
            "gender": "F",
            "triage_hr": 70,  # Normal HR
            "triage_o2sat": 99,  # Normal O2
            "d_dimer": 150,  # Low D-dimer
            "triage_sbp": 120,
        }
        
        probability = predict_pe_probability(patient_features)
        
        # Expect lower probability for low-risk patient
        assert isinstance(probability, float)
        assert 0.0 <= probability <= 1.0


class TestInterpretation:
    """Test result interpretation"""
    
    def test_interpret_rule_out_threshold(self):
        """Test interpretation at rule-out threshold"""
        # Test below threshold (should rule out)
        result = interpret_pe_result(0.05)
        
        assert result["probability"] == 0.05
        assert result["threshold"] == 0.08
        assert result["decision"] == "rule_out"
        assert "explanation" in result
        assert "disclaimer" in result
    
    def test_interpret_continue_workup_threshold(self):
        """Test interpretation above threshold"""
        result = interpret_pe_result(0.15)
        
        assert result["probability"] == 0.15
        assert result["threshold"] == 0.08
        assert result["decision"] == "continue_workup"
        assert "explanation" in result
    
    def test_interpret_exactly_at_threshold(self):
        """Test interpretation exactly at threshold (should continue workup)"""
        result = interpret_pe_result(0.08)
        
        assert result["decision"] == "continue_workup"
    
    def test_interpret_edge_cases(self):
        """Test interpretation edge cases"""
        # Very low probability
        result_low = interpret_pe_result(0.01)
        assert result_low["decision"] == "rule_out"
        
        # Very high probability
        result_high = interpret_pe_result(0.90)
        assert result_high["decision"] == "continue_workup"
        
        # Zero probability
        result_zero = interpret_pe_result(0.0)
        assert result_zero["decision"] == "rule_out"
        
        # Maximum probability
        result_max = interpret_pe_result(1.0)
        assert result_max["decision"] == "continue_workup"
    
    def test_interpret_includes_performance_metrics(self):
        """Test that interpretation includes documented performance metrics"""
        result = interpret_pe_result(0.05)
        
        assert result["sensitivity"] == 0.974
        assert result["npv"] == 0.9895


class TestModelConsistency:
    """Test model consistency and reproducibility"""
    
    @classmethod
    def setup_class(cls):
        """Load model once"""
        load_pe_model()
    
    def test_prediction_reproducibility(self):
        """Test that same input gives same output"""
        patient_features = {
            "age": 60,
            "gender": "M",
            "triage_hr": 90,
            "d_dimer": 500,
        }
        
        prob1 = predict_pe_probability(patient_features)
        prob2 = predict_pe_probability(patient_features)
        
        # Should be identical (deterministic model)
        assert prob1 == prob2
    
    def test_threshold_boundary_behavior(self):
        """Test behavior around decision threshold"""
        # Test multiple probabilities around threshold
        test_probs = [0.06, 0.07, 0.079, 0.08, 0.081, 0.09, 0.10]
        
        for prob in test_probs:
            result = interpret_pe_result(prob)
            
            if prob < 0.08:
                assert result["decision"] == "rule_out"
            else:
                assert result["decision"] == "continue_workup"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

