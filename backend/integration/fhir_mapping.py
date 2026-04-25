"""
FHIR Integration and Feature Mapping

Maps Epic FHIR resources (Patient, Observation) to PE model features.
Uses LOINC codes for standardized lab/vital mapping.
"""

import httpx
from typing import Dict, Any, Optional, Tuple, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class FHIRScopeError(Exception):
    """
    Error raised when FHIR request fails due to missing scope.
    
    Provides detailed info for debugging OAuth scope issues.
    """
    def __init__(self, message: str, failed_url: str = None, response_body: str = None, status_code: int = None):
        super().__init__(message)
        self.message = message
        self.failed_url = failed_url
        self.response_body = response_body
        self.status_code = status_code


class FHIRClient:
    """
    Simple FHIR client for Epic sandbox integration.
    """
    
    def __init__(self, base_url: str, access_token: str):
        """
        Initialize FHIR client.
        
        Args:
            base_url: FHIR server base URL (e.g., https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4)
            access_token: OAuth access token
        """
        self.base_url = base_url.rstrip("/")
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/fhir+json"
        }
    
    async def get_patient(self, patient_id: str) -> Dict[str, Any]:
        """
        Fetch Patient resource.
        
        Args:
            patient_id: Patient FHIR ID
        
        Returns:
            Patient resource as dict
            
        Raises:
            httpx.HTTPStatusError: On HTTP errors (401, 403, etc.)
        """
        url = f"{self.base_url}/Patient/{patient_id}"
        logger.info(f"Fetching Patient: {url}")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            
            if response.status_code == 401:
                logger.error("Patient fetch failed: 401 Unauthorized - token expired or invalid")
                raise httpx.HTTPStatusError("Token expired or invalid", request=response.request, response=response)
            if response.status_code == 403:
                error_body = ""
                try:
                    error_body = response.text[:500]
                except Exception:
                    pass
                logger.error(f"Patient fetch failed: 403 Forbidden")
                logger.error(f"  URL: {url}")
                logger.error(f"  Response body: {error_body}")
                raise FHIRScopeError(
                    message="Forbidden: token lacks user/Patient.read scope",
                    failed_url=url,
                    response_body=error_body,
                    status_code=403
                )
            
            response.raise_for_status()
            return response.json()
    
    async def get_observations(
        self, 
        patient_id: str, 
        category: Optional[str] = None,
        code: Optional[str] = None,
        max_results: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Fetch Observation resources for a patient.
        
        Args:
            patient_id: Patient FHIR ID
            category: Observation category (e.g., "vital-signs", "laboratory")
            code: LOINC code filter
            max_results: Maximum number of results to return
        
        Returns:
            List of Observation resources
        """
        url = f"{self.base_url}/Observation"
        params = {
            "patient": patient_id,
            "_count": max_results,
            "_sort": "-date"  # Most recent first
        }
        
        if category:
            params["category"] = category
        if code:
            params["code"] = code
        
        full_url = f"{url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
        logger.info(f"Fetching Observations: {full_url}")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params, timeout=10.0)
            
            if response.status_code == 401:
                logger.error("Observation fetch failed: 401 Unauthorized - token expired or invalid")
                raise httpx.HTTPStatusError("Token expired or invalid", request=response.request, response=response)
            if response.status_code == 403:
                # Get detailed error info
                error_body = ""
                try:
                    error_body = response.text[:500]
                except Exception:
                    pass
                logger.error(f"Observation fetch failed: 403 Forbidden")
                logger.error(f"  URL: {full_url}")
                logger.error(f"  Response body: {error_body}")
                raise FHIRScopeError(
                    message="Forbidden: token lacks user/Observation.read scope",
                    failed_url=full_url,
                    response_body=error_body,
                    status_code=403
                )
            
            response.raise_for_status()
            bundle = response.json()
        
        # Extract entries
        observations = []
        if bundle.get("entry"):
            for entry in bundle["entry"]:
                if "resource" in entry:
                    observations.append(entry["resource"])
        
        logger.info(f"Found {len(observations)} observations")
        return observations
    
    async def get_observations_by_categories(
        self,
        patient_id: str,
        categories: List[str] = None,
        max_results: int = 100
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Fetch Observations by category, trying each category separately.
        
        Returns (vitals, labs) tuple. If a category fails with 403, logs details
        and returns empty list for that category rather than failing entirely.
        """
        if categories is None:
            categories = ["vital-signs", "laboratory"]
        
        results = {"vital-signs": [], "laboratory": []}
        errors = []
        
        for category in categories:
            try:
                obs = await self.get_observations(
                    patient_id=patient_id,
                    category=category,
                    max_results=max_results
                )
                results[category] = obs
            except FHIRScopeError as e:
                logger.error(f"Failed to fetch {category}: {e.message}")
                errors.append({
                    "category": category,
                    "error": e.message,
                    "url": e.failed_url,
                    "status_code": e.status_code
                })
            except Exception as e:
                logger.error(f"Failed to fetch {category}: {e}")
                errors.append({
                    "category": category,
                    "error": str(e),
                    "url": None,
                    "status_code": None
                })
        
        if errors:
            logger.warning(f"Observation fetch errors: {errors}")
        
        return results.get("vital-signs", []), results.get("laboratory", [])


# ============================================================================
# LOINC Code Mappings
# ============================================================================

# Standard LOINC codes for vitals
VITAL_SIGNS_LOINC = {
    "heart_rate": ["8867-4"],  # Heart rate
    "respiratory_rate": ["9279-1"],  # Respiratory rate
    "oxygen_saturation": ["59408-5", "2708-6"],  # Oxygen saturation
    "body_temperature": ["8310-5", "8331-1"],  # Body temperature
    "systolic_bp": ["8480-6"],  # Systolic blood pressure
    "diastolic_bp": ["8462-4"],  # Diastolic blood pressure
    "height": ["8302-2"],  # Body height
    "weight": ["29463-7", "3141-9"],  # Body weight
}

# Standard LOINC codes for labs
LAB_LOINC = {
    "d_dimer": ["48065-7", "48066-5"],  # D-dimer
    "troponin_t": ["6598-7", "89579-7"],  # Troponin T
    "ntprobnp": ["33762-6"],  # NT-proBNP
    "creatinine": ["2160-0"],  # Creatinine
    "hemoglobin": ["718-7"],  # Hemoglobin
    "wbc": ["6690-2"],  # White blood cell count
    "platelet": ["777-3"],  # Platelet count
    "sodium": ["2951-2"],  # Sodium
    "potassium": ["2823-3"],  # Potassium
    "bun": ["3094-0"],  # Blood urea nitrogen
    "glucose": ["2345-7", "2339-0"],  # Glucose
    "lactate": ["2524-7"],  # Lactate
    "po2": ["2703-7"],  # Oxygen partial pressure
    "pco2": ["2019-8"],  # Carbon dioxide partial pressure
    "ph": ["2744-1"],  # pH
}


def extract_observation_value(observation: Dict[str, Any]) -> Optional[float]:
    """
    Extract numeric value from FHIR Observation resource.
    
    Handles different value types: valueQuantity, valueString, valueInteger, etc.
    """
    # Try valueQuantity first (most common for numeric obs)
    if "valueQuantity" in observation:
        return observation["valueQuantity"].get("value")
    
    # Try valueInteger
    if "valueInteger" in observation:
        return float(observation["valueInteger"])
    
    # Try valueDecimal
    if "valueDecimal" in observation:
        return float(observation["valueDecimal"])
    
    # Try valueString (attempt conversion)
    if "valueString" in observation:
        try:
            return float(observation["valueString"])
        except (ValueError, TypeError):
            pass
    
    # Try component (for blood pressure, etc.)
    if "component" in observation:
        # Return first component with value
        for component in observation["component"]:
            if "valueQuantity" in component:
                return component["valueQuantity"].get("value")
    
    return None


def find_observation_by_loinc(
    observations: List[Dict[str, Any]], 
    loinc_codes: List[str]
) -> Optional[float]:
    """
    Find and extract value from observation matching LOINC codes.
    
    Returns the most recent observation matching any of the provided codes.
    """
    for obs in observations:
        # Check if this observation matches any of the LOINC codes
        if "code" in obs and "coding" in obs["code"]:
            for coding in obs["code"]["coding"]:
                if coding.get("system") == "http://loinc.org":
                    if coding.get("code") in loinc_codes:
                        # Found match - extract value
                        value = extract_observation_value(obs)
                        if value is not None:
                            return value
    return None


async def map_fhir_to_features(
    fhir_client: FHIRClient,
    patient_id: str
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Map FHIR resources to PE model features.
    
    Args:
        fhir_client: Authenticated FHIR client
        patient_id: Patient FHIR ID
    
    Returns:
        Tuple of:
        - features: Dict mapping feature names to values (for model input)
        - summary: Dict with readable feature summary (for display)
    """
    logger.info(f"Mapping FHIR data for patient {patient_id}")
    
    # Initialize features dict with None (will be imputed by model)
    features = {
        "age": None,
        "gender": None,
        "bmi": None,
        "height_cm": None,
        "weight_lbs": None,
        "triage_hr": None,
        "triage_rr": None,
        "triage_o2sat": None,
        "triage_temp": None,
        "triage_sbp": None,
        "triage_dbp": None,
        "d_dimer": None,
        "troponin_t": None,
        "ntprobnp": None,
        "creatinine": None,
        "hemoglobin": None,
        "wbc": None,
        "platelet": None,
        "sodium": None,
        "potassium": None,
        "bun": None,
        "glucose": None,
        "lactate": None,
        "po2": None,
        "pco2": None,
    }
    
    try:
        # Fetch Patient resource
        patient = await fhir_client.get_patient(patient_id)
        
        # Extract demographics
        features["gender"] = extract_gender(patient)
        features["age"] = extract_age(patient)
        
        # Fetch all observations
        observations = await fhir_client.get_observations(patient_id, max_results=200)
        
        # Extract vitals (use triage_ prefix as model expects)
        height_m = find_observation_by_loinc(observations, VITAL_SIGNS_LOINC["height"])
        weight_kg = find_observation_by_loinc(observations, VITAL_SIGNS_LOINC["weight"])
        
        if height_m:
            features["height_cm"] = height_m * 100  # Convert m to cm
        
        if weight_kg:
            features["weight_lbs"] = weight_kg * 2.20462  # Convert kg to lbs
        
        # Calculate BMI if we have height and weight
        if height_m and weight_kg:
            features["bmi"] = weight_kg / (height_m ** 2)
        
        # Vital signs (triage values)
        features["triage_hr"] = find_observation_by_loinc(observations, VITAL_SIGNS_LOINC["heart_rate"])
        features["triage_rr"] = find_observation_by_loinc(observations, VITAL_SIGNS_LOINC["respiratory_rate"])
        features["triage_o2sat"] = find_observation_by_loinc(observations, VITAL_SIGNS_LOINC["oxygen_saturation"])
        features["triage_temp"] = find_observation_by_loinc(observations, VITAL_SIGNS_LOINC["body_temperature"])
        features["triage_sbp"] = find_observation_by_loinc(observations, VITAL_SIGNS_LOINC["systolic_bp"])
        features["triage_dbp"] = find_observation_by_loinc(observations, VITAL_SIGNS_LOINC["diastolic_bp"])
        
        # Lab values
        features["d_dimer"] = find_observation_by_loinc(observations, LAB_LOINC["d_dimer"])
        features["troponin_t"] = find_observation_by_loinc(observations, LAB_LOINC["troponin_t"])
        features["ntprobnp"] = find_observation_by_loinc(observations, LAB_LOINC["ntprobnp"])
        features["creatinine"] = find_observation_by_loinc(observations, LAB_LOINC["creatinine"])
        features["hemoglobin"] = find_observation_by_loinc(observations, LAB_LOINC["hemoglobin"])
        features["wbc"] = find_observation_by_loinc(observations, LAB_LOINC["wbc"])
        features["platelet"] = find_observation_by_loinc(observations, LAB_LOINC["platelet"])
        features["sodium"] = find_observation_by_loinc(observations, LAB_LOINC["sodium"])
        features["potassium"] = find_observation_by_loinc(observations, LAB_LOINC["potassium"])
        features["bun"] = find_observation_by_loinc(observations, LAB_LOINC["bun"])
        features["glucose"] = find_observation_by_loinc(observations, LAB_LOINC["glucose"])
        features["lactate"] = find_observation_by_loinc(observations, LAB_LOINC["lactate"])
        features["po2"] = find_observation_by_loinc(observations, LAB_LOINC["po2"])
        features["pco2"] = find_observation_by_loinc(observations, LAB_LOINC["pco2"])
        
        # Build human-readable summary
        summary = _build_feature_summary(features)
        
        # Log data availability
        available = sum(1 for v in features.values() if v is not None)
        logger.info(f"Mapped {available}/{len(features)} features from FHIR")
        
        return features, summary
        
    except Exception as e:
        logger.error(f"FHIR mapping failed: {e}", exc_info=True)
        raise


def extract_gender(patient: Dict[str, Any]) -> Optional[str]:
    """Extract gender from Patient resource"""
    gender = patient.get("gender")
    if gender:
        # Map FHIR gender to model format
        gender_map = {
            "male": "M",
            "female": "F",
            "other": "Other",
            "unknown": None
        }
        return gender_map.get(gender.lower(), gender)
    return None


def extract_age(patient: Dict[str, Any]) -> Optional[int]:
    """Calculate age from Patient birthDate"""
    birth_date_str = patient.get("birthDate")
    if birth_date_str:
        try:
            from datetime import datetime
            birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d")
            today = datetime.now()
            age = today.year - birth_date.year
            # Adjust if birthday hasn't occurred yet this year
            if (today.month, today.day) < (birth_date.month, birth_date.day):
                age -= 1
            return age
        except Exception as e:
            logger.warning(f"Failed to parse birthDate: {e}")
    return None


def _build_feature_summary(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build human-readable feature summary for display.
    
    Groups features into categories and formats values.
    """
    def format_value(value, unit=""):
        if value is None:
            return "Not available"
        return f"{value:.1f} {unit}".strip()
    
    summary = {
        "demographics": {
            "age": format_value(features.get("age"), "years"),
            "gender": features.get("gender") or "Not available",
            "bmi": format_value(features.get("bmi"), "kg/m²"),
            "height": format_value(features.get("height_cm"), "cm"),
            "weight": format_value(features.get("weight_lbs"), "lbs"),
        },
        "vital_signs": {
            "heart_rate": format_value(features.get("triage_hr"), "bpm"),
            "respiratory_rate": format_value(features.get("triage_rr"), "/min"),
            "oxygen_saturation": format_value(features.get("triage_o2sat"), "%"),
            "temperature": format_value(features.get("triage_temp"), "°C"),
            "blood_pressure": f"{format_value(features.get('triage_sbp'))}/{format_value(features.get('triage_dbp'))} mmHg",
        },
        "laboratory": {
            "d_dimer": format_value(features.get("d_dimer"), "ng/mL"),
            "troponin_t": format_value(features.get("troponin_t"), "ng/mL"),
            "nt_probnp": format_value(features.get("ntprobnp"), "pg/mL"),
            "creatinine": format_value(features.get("creatinine"), "mg/dL"),
            "hemoglobin": format_value(features.get("hemoglobin"), "g/dL"),
            "wbc": format_value(features.get("wbc"), "K/µL"),
            "platelet": format_value(features.get("platelet"), "K/µL"),
            "sodium": format_value(features.get("sodium"), "mEq/L"),
            "potassium": format_value(features.get("potassium"), "mEq/L"),
            "bun": format_value(features.get("bun"), "mg/dL"),
            "glucose": format_value(features.get("glucose"), "mg/dL"),
            "lactate": format_value(features.get("lactate"), "mmol/L"),
            "po2": format_value(features.get("po2"), "mmHg"),
            "pco2": format_value(features.get("pco2"), "mmHg"),
        },
        "data_completeness": {
            "total_features": len(features),
            "available_features": sum(1 for v in features.values() if v is not None),
            "missing_features": sum(1 for v in features.values() if v is None),
        }
    }
    
    return summary

