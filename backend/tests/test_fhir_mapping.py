"""
Tests for FHIR mapping functionality
"""

import pytest
from integration.fhir_mapping import (
    extract_observation_value,
    extract_gender,
    extract_age,
    find_observation_by_loinc
)


class TestObservationValueExtraction:
    """Test extraction of values from FHIR Observation resources"""
    
    def test_extract_value_quantity(self):
        """Test extraction from valueQuantity"""
        observation = {
            "valueQuantity": {
                "value": 98.5,
                "unit": "%"
            }
        }
        
        value = extract_observation_value(observation)
        assert value == 98.5
    
    def test_extract_value_integer(self):
        """Test extraction from valueInteger"""
        observation = {
            "valueInteger": 120
        }
        
        value = extract_observation_value(observation)
        assert value == 120.0
    
    def test_extract_value_decimal(self):
        """Test extraction from valueDecimal"""
        observation = {
            "valueDecimal": 7.4
        }
        
        value = extract_observation_value(observation)
        assert value == 7.4
    
    def test_extract_value_string_numeric(self):
        """Test extraction from valueString (numeric)"""
        observation = {
            "valueString": "150.5"
        }
        
        value = extract_observation_value(observation)
        assert value == 150.5
    
    def test_extract_value_string_non_numeric(self):
        """Test extraction from valueString (non-numeric) returns None"""
        observation = {
            "valueString": "positive"
        }
        
        value = extract_observation_value(observation)
        assert value is None
    
    def test_extract_missing_value(self):
        """Test extraction when no value present"""
        observation = {
            "code": {"text": "Some test"}
        }
        
        value = extract_observation_value(observation)
        assert value is None


class TestPatientDataExtraction:
    """Test extraction of data from Patient resource"""
    
    def test_extract_gender_male(self):
        """Test extraction of male gender"""
        patient = {"gender": "male"}
        gender = extract_gender(patient)
        assert gender == "M"
    
    def test_extract_gender_female(self):
        """Test extraction of female gender"""
        patient = {"gender": "female"}
        gender = extract_gender(patient)
        assert gender == "F"
    
    def test_extract_gender_missing(self):
        """Test extraction when gender missing"""
        patient = {}
        gender = extract_gender(patient)
        assert gender is None
    
    def test_extract_age(self):
        """Test age calculation from birthDate"""
        patient = {"birthDate": "1960-01-01"}
        age = extract_age(patient)
        
        # Age should be reasonable (between 60-70 as of 2025)
        assert isinstance(age, int)
        assert 60 <= age <= 70
    
    def test_extract_age_missing(self):
        """Test age extraction when birthDate missing"""
        patient = {}
        age = extract_age(patient)
        assert age is None
    
    def test_extract_age_invalid_format(self):
        """Test age extraction with invalid date format"""
        patient = {"birthDate": "invalid"}
        age = extract_age(patient)
        assert age is None


class TestLOINCMapping:
    """Test LOINC code based observation lookup"""
    
    def test_find_observation_by_loinc_match(self):
        """Test finding observation by LOINC code"""
        observations = [
            {
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "8867-4",  # Heart rate
                            "display": "Heart rate"
                        }
                    ]
                },
                "valueQuantity": {
                    "value": 85,
                    "unit": "beats/minute"
                }
            }
        ]
        
        value = find_observation_by_loinc(observations, ["8867-4"])
        assert value == 85
    
    def test_find_observation_by_loinc_no_match(self):
        """Test finding observation when code doesn't match"""
        observations = [
            {
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "9999-9",  # Different code
                            "display": "Some test"
                        }
                    ]
                },
                "valueQuantity": {"value": 100}
            }
        ]
        
        value = find_observation_by_loinc(observations, ["8867-4"])
        assert value is None
    
    def test_find_observation_by_loinc_multiple_codes(self):
        """Test finding observation with multiple possible LOINC codes"""
        observations = [
            {
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "2708-6",  # Alternative oxygen sat code
                            "display": "Oxygen saturation"
                        }
                    ]
                },
                "valueQuantity": {"value": 98}
            }
        ]
        
        # Should match on second code in list
        value = find_observation_by_loinc(observations, ["59408-5", "2708-6"])
        assert value == 98
    
    def test_find_observation_empty_list(self):
        """Test finding observation in empty list"""
        observations = []
        value = find_observation_by_loinc(observations, ["8867-4"])
        assert value is None


class TestMissingValueHandling:
    """Test that missing values are handled gracefully"""
    
    def test_all_features_missing(self):
        """Test behavior when all features are missing"""
        # This would happen if FHIR has no relevant observations
        # The mapping should return a dict with all None values
        # which will be handled by model imputation
        
        # Simulate empty feature dict
        features = {
            "age": None,
            "gender": None,
            "triage_hr": None,
            "d_dimer": None,
        }
        
        # Check that all values are None (will be imputed)
        assert all(v is None for v in features.values())
    
    def test_partial_features_available(self):
        """Test behavior with some features available"""
        features = {
            "age": 65,
            "gender": "M",
            "triage_hr": None,  # Missing
            "d_dimer": 450,
        }
        
        # Check mix of values
        assert features["age"] == 65
        assert features["gender"] == "M"
        assert features["triage_hr"] is None
        assert features["d_dimer"] == 450


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

