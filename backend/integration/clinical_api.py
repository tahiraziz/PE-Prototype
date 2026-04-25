"""
Clinical API endpoints for History & Risk modules.

These endpoints provide anticoagulation status, diagnoses, vitals, labs,
and imaging data for the PE Rule-Out dashboard.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging
import httpx

from .clinical_mappings import (
    classify_medication,
    is_anticoagulant,
    get_diagnosis_flags,
    classify_diagnosis,
    match_vital_type,
    match_lab_type,
    is_pe_relevant_imaging,
    extract_imaging_snippet,
    LAB_LOINC
)

logger = logging.getLogger(__name__)

# ============================================================================
# In-memory cache (per patient, 5 minute TTL)
# ============================================================================

_clinical_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes


def _cache_key(patient_id: str, endpoint: str) -> str:
    return f"{patient_id}:{endpoint}"


def _get_cached(patient_id: str, endpoint: str) -> Optional[Dict]:
    key = _cache_key(patient_id, endpoint)
    if key in _clinical_cache:
        entry = _clinical_cache[key]
        if datetime.now().timestamp() < entry["expires_at"]:
            logger.debug(f"Cache HIT: {key}")
            return entry["data"]
        else:
            del _clinical_cache[key]
    return None


def _set_cache(patient_id: str, endpoint: str, data: Dict):
    key = _cache_key(patient_id, endpoint)
    _clinical_cache[key] = {
        "data": data,
        "expires_at": datetime.now().timestamp() + CACHE_TTL_SECONDS
    }
    logger.debug(f"Cache SET: {key}")


def clear_cache(patient_id: Optional[str] = None):
    """Clear cache for a patient or all patients."""
    global _clinical_cache
    if patient_id:
        keys_to_delete = [k for k in _clinical_cache if k.startswith(f"{patient_id}:")]
        for k in keys_to_delete:
            del _clinical_cache[k]
    else:
        _clinical_cache = {}


# ============================================================================
# FHIR Query Helpers
# ============================================================================

async def fhir_search(
    fhir_base: str,
    access_token: str,
    resource_type: str,
    params: Dict[str, str],
    debug_calls: List[str]
) -> List[Dict]:
    """
    Execute a FHIR search and return entries.
    Appends the URL to debug_calls for transparency.
    """
    url = f"{fhir_base}/{resource_type}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/fhir+json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params, timeout=15.0)
        
        # Log the call (without token)
        call_url = f"GET {resource_type}?" + "&".join(f"{k}={v}" for k, v in params.items())
        debug_calls.append(call_url)
        
        if response.status_code == 403:
            logger.warning(f"FHIR 403 Forbidden: {resource_type}")
            return []
        
        if response.status_code == 404:
            logger.debug(f"FHIR 404: {resource_type} - no results")
            return []
        
        response.raise_for_status()
        bundle = response.json()
    
    entries = []
    if bundle.get("entry"):
        for entry in bundle["entry"]:
            if entry.get("resource"):
                entries.append(entry["resource"])
    
    return entries


# ============================================================================
# Anticoagulation Status
# ============================================================================

async def get_anticoagulation_status(
    fhir_base: str,
    access_token: str,
    patient_id: str,
    debug: bool = False
) -> Dict[str, Any]:
    """
    GET /api/clinical/anticoagulation
    
    Returns anticoagulation status and medication list.
    """
    cached = _get_cached(patient_id, "anticoagulation")
    if cached:
        return cached
    
    debug_calls = []
    medications = []
    
    # Query MedicationRequest for last 1 year
    one_year_ago = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    
    try:
        med_requests = await fhir_search(
            fhir_base, access_token, "MedicationRequest",
            {
                "patient": patient_id,
                "authoredon": f"ge{one_year_ago}",
                "_count": "100"
            },
            debug_calls
        )
        
        for med in med_requests:
            # Extract medication name
            med_name = None
            if med.get("medicationCodeableConcept"):
                med_name = med["medicationCodeableConcept"].get("text", "")
                if not med_name and med["medicationCodeableConcept"].get("coding"):
                    med_name = med["medicationCodeableConcept"]["coding"][0].get("display", "")
            elif med.get("medicationReference"):
                med_name = med["medicationReference"].get("display", "Unknown")
            
            if not med_name:
                continue
            
            # Classify medication
            med_type = classify_medication(med_name)
            if med_type == "Other":
                continue  # Only include anticoagulants/antiplatelets
            
            # Extract status
            status = med.get("status", "unknown")
            
            # Extract start date
            start_date = None
            if med.get("authoredOn"):
                start_date = med["authoredOn"][:10]
            
            # Get RxNorm code if available
            rxnorm = None
            if med.get("medicationCodeableConcept", {}).get("coding"):
                for coding in med["medicationCodeableConcept"]["coding"]:
                    if coding.get("system", "").endswith("rxnorm"):
                        rxnorm = coding.get("code")
                        break
            
            medications.append({
                "name": med_name,
                "rxnorm": rxnorm,
                "type": med_type,
                "start": start_date,
                "status": status
            })
    
    except Exception as e:
        logger.error(f"Error fetching medications: {e}")
    
    # Determine overall status
    active_anticoag = [m for m in medications if m["status"] == "active" and m["type"] in ["DOAC", "Warfarin", "Heparin_LMWH"]]
    has_warfarin = any(m["type"] == "Warfarin" for m in medications if m["status"] == "active")
    
    if active_anticoag:
        status = "on_anticoagulant"
    elif medications:
        status = "unknown"  # Has history but nothing active
    else:
        status = "none"
    
    result = {
        "status": status,
        "medications": medications,
        "has_warfarin": has_warfarin
    }
    
    if debug:
        result["debug"] = {"fhir_calls": debug_calls}
    
    _set_cache(patient_id, "anticoagulation", result)
    return result


# ============================================================================
# INR Trend
# ============================================================================

async def get_inr_trend(
    fhir_base: str,
    access_token: str,
    patient_id: str,
    days: int = 30,
    debug: bool = False
) -> Dict[str, Any]:
    """
    GET /api/clinical/inr
    
    Returns INR time series for the last N days.
    """
    cache_key = f"inr_{days}"
    cached = _get_cached(patient_id, cache_key)
    if cached:
        return cached
    
    debug_calls = []
    series = []
    
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    try:
        # Try LOINC codes first
        inr_codes = ",".join(LAB_LOINC["inr"])
        observations = await fhir_search(
            fhir_base, access_token, "Observation",
            {
                "patient": patient_id,
                "code": inr_codes,
                "date": f"ge{start_date}",
                "_count": "100",
                "_sort": "-date"
            },
            debug_calls
        )
        
        # Fallback: text search if no results
        if not observations:
            observations = await fhir_search(
                fhir_base, access_token, "Observation",
                {
                    "patient": patient_id,
                    "category": "laboratory",
                    "date": f"ge{start_date}",
                    "_count": "200",
                    "_sort": "-date"
                },
                debug_calls
            )
            # Filter for INR
            observations = [
                o for o in observations
                if "inr" in (o.get("code", {}).get("text", "") or "").lower()
            ]
        
        for obs in observations:
            time_str = obs.get("effectiveDateTime")
            if not time_str:
                continue
            
            value = None
            unit = ""
            if obs.get("valueQuantity"):
                value = obs["valueQuantity"].get("value")
                unit = obs["valueQuantity"].get("unit", "")
            
            if value is not None:
                # Get LOINC code
                code = None
                if obs.get("code", {}).get("coding"):
                    code = obs["code"]["coding"][0].get("code")
                
                series.append({
                    "time": time_str,
                    "value": value,
                    "unit": unit,
                    "source": "Observation",
                    "code": code
                })
    
    except Exception as e:
        logger.error(f"Error fetching INR: {e}")
    
    result = {"series": series}
    if debug:
        result["debug"] = {"fhir_calls": debug_calls}
    
    _set_cache(patient_id, cache_key, result)
    return result


# ============================================================================
# Diagnoses
# ============================================================================

async def get_diagnoses(
    fhir_base: str,
    access_token: str,
    patient_id: str,
    years: int = 5,
    debug: bool = False
) -> Dict[str, Any]:
    """
    GET /api/clinical/diagnoses
    
    Returns diagnosis flags and top conditions.
    """
    cache_key = f"diagnoses_{years}"
    cached = _get_cached(patient_id, cache_key)
    if cached:
        return cached
    
    debug_calls = []
    conditions = []
    
    start_date = (datetime.now() - timedelta(days=years * 365)).strftime("%Y-%m-%d")
    
    try:
        # Fetch conditions
        condition_resources = await fhir_search(
            fhir_base, access_token, "Condition",
            {
                "patient": patient_id,
                "onset-date": f"ge{start_date}",
                "_count": "100",
                "_sort": "-onset-date"
            },
            debug_calls
        )
        
        for cond in condition_resources:
            # Extract display text
            display = None
            code = None
            if cond.get("code"):
                display = cond["code"].get("text")
                if cond["code"].get("coding"):
                    coding = cond["code"]["coding"][0]
                    if not display:
                        display = coding.get("display")
                    code = coding.get("code")
            
            if not display:
                continue
            
            # Extract clinical status
            clinical_status = "unknown"
            if cond.get("clinicalStatus", {}).get("coding"):
                clinical_status = cond["clinicalStatus"]["coding"][0].get("code", "unknown")
            
            # Extract onset
            onset = None
            if cond.get("onsetDateTime"):
                onset = cond["onsetDateTime"][:10]
            elif cond.get("recordedDate"):
                onset = cond["recordedDate"][:10]
            
            conditions.append({
                "display": display,
                "code": code,
                "clinical_status": clinical_status,
                "onset": onset
            })
    
    except Exception as e:
        logger.error(f"Error fetching diagnoses: {e}")
    
    # Compute flags
    flags = get_diagnosis_flags(conditions)
    
    # Top 10 conditions by recency
    top_conditions = conditions[:10]
    
    result = {
        "flags": flags,
        "top_conditions": top_conditions
    }
    
    if debug:
        result["debug"] = {"fhir_calls": debug_calls}
    
    _set_cache(patient_id, cache_key, result)
    return result


# ============================================================================
# Vitals Trend
# ============================================================================

async def get_vitals_trend(
    fhir_base: str,
    access_token: str,
    patient_id: str,
    hours: int = 24,
    debug: bool = False
) -> Dict[str, Any]:
    """
    GET /api/clinical/vitals
    
    Returns vital signs time series.
    """
    cache_key = f"vitals_{hours}"
    cached = _get_cached(patient_id, cache_key)
    if cached:
        return cached
    
    debug_calls = []
    series = {
        "hr": [],
        "spo2": [],
        "rr": [],
        "sbp": []
    }
    
    start_time = (datetime.now() - timedelta(hours=hours)).isoformat()
    
    try:
        observations = await fhir_search(
            fhir_base, access_token, "Observation",
            {
                "patient": patient_id,
                "category": "vital-signs",
                "date": f"ge{start_time}",
                "_count": "500",
                "_sort": "-date"
            },
            debug_calls
        )
        
        for obs in observations:
            time_str = obs.get("effectiveDateTime")
            if not time_str:
                continue
            
            # Get codes
            codes = []
            display = ""
            if obs.get("code"):
                display = obs["code"].get("text", "")
                if obs["code"].get("coding"):
                    codes = [c.get("code", "") for c in obs["code"]["coding"]]
            
            # Match vital type
            vital_type = match_vital_type(codes, display)
            if vital_type not in series:
                continue
            
            # Extract value
            value = None
            if obs.get("valueQuantity"):
                value = obs["valueQuantity"].get("value")
            elif obs.get("component"):
                # Handle BP components
                for comp in obs["component"]:
                    comp_codes = [c.get("code", "") for c in comp.get("code", {}).get("coding", [])]
                    comp_display = comp.get("code", {}).get("text", "")
                    comp_type = match_vital_type(comp_codes, comp_display)
                    if comp_type in series and comp.get("valueQuantity"):
                        series[comp_type].append({
                            "time": time_str,
                            "value": comp["valueQuantity"]["value"]
                        })
                continue
            
            if value is not None:
                series[vital_type].append({
                    "time": time_str,
                    "value": value
                })
    
    except Exception as e:
        logger.error(f"Error fetching vitals: {e}")
    
    # Downsample if > 200 points per series (keep 1 per 10-min bucket)
    for vital_type in series:
        if len(series[vital_type]) > 200:
            series[vital_type] = _downsample_series(series[vital_type], 200)
    
    result = {"series": series}
    if debug:
        result["debug"] = {"fhir_calls": debug_calls}
    
    _set_cache(patient_id, cache_key, result)
    return result


def _downsample_series(data: List[Dict], max_points: int) -> List[Dict]:
    """Keep approximately max_points by bucketing."""
    if len(data) <= max_points:
        return data
    
    # Simple: keep every Nth point
    step = len(data) // max_points
    return data[::step][:max_points]


# ============================================================================
# D-dimer Trend
# ============================================================================

async def get_ddimer_trend(
    fhir_base: str,
    access_token: str,
    patient_id: str,
    days: int = 30,
    debug: bool = False
) -> Dict[str, Any]:
    """
    GET /api/clinical/ddimer
    
    Returns D-dimer time series.
    """
    cache_key = f"ddimer_{days}"
    cached = _get_cached(patient_id, cache_key)
    if cached:
        return cached
    
    debug_calls = []
    series = []
    
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    try:
        # Try LOINC codes first
        ddimer_codes = ",".join(LAB_LOINC["ddimer"])
        observations = await fhir_search(
            fhir_base, access_token, "Observation",
            {
                "patient": patient_id,
                "code": ddimer_codes,
                "date": f"ge{start_date}",
                "_count": "100",
                "_sort": "-date"
            },
            debug_calls
        )
        
        # Fallback: text search
        if not observations:
            observations = await fhir_search(
                fhir_base, access_token, "Observation",
                {
                    "patient": patient_id,
                    "category": "laboratory",
                    "date": f"ge{start_date}",
                    "_count": "200",
                    "_sort": "-date"
                },
                debug_calls
            )
            observations = [
                o for o in observations
                if any(x in (o.get("code", {}).get("text", "") or "").lower() 
                       for x in ["d-dimer", "ddimer", "d dimer"])
            ]
        
        for obs in observations:
            time_str = obs.get("effectiveDateTime")
            if not time_str:
                continue
            
            value = None
            unit = ""
            if obs.get("valueQuantity"):
                value = obs["valueQuantity"].get("value")
                unit = obs["valueQuantity"].get("unit", "")
            
            if value is not None:
                series.append({
                    "time": time_str,
                    "value": value,
                    "unit": unit
                })
    
    except Exception as e:
        logger.error(f"Error fetching D-dimer: {e}")
    
    result = {"series": series}
    if debug:
        result["debug"] = {"fhir_calls": debug_calls}
    
    _set_cache(patient_id, cache_key, result)
    return result


# ============================================================================
# Imaging Studies
# ============================================================================

async def get_imaging_studies(
    fhir_base: str,
    access_token: str,
    patient_id: str,
    years: int = 5,
    study_type: str = "ctpa",
    debug: bool = False
) -> Dict[str, Any]:
    """
    GET /api/clinical/imaging
    
    Returns PE-relevant imaging studies.
    """
    cache_key = f"imaging_{years}_{study_type}"
    cached = _get_cached(patient_id, cache_key)
    if cached:
        return cached
    
    debug_calls = []
    studies = []
    
    start_date = (datetime.now() - timedelta(days=years * 365)).strftime("%Y-%m-%d")
    
    try:
        # Try DiagnosticReport first (more common)
        reports = await fhir_search(
            fhir_base, access_token, "DiagnosticReport",
            {
                "patient": patient_id,
                "category": "RAD",  # Radiology
                "date": f"ge{start_date}",
                "_count": "50",
                "_sort": "-date"
            },
            debug_calls
        )
        
        for report in reports:
            # Get title/description
            title = ""
            if report.get("code"):
                title = report["code"].get("text", "")
                if not title and report["code"].get("coding"):
                    title = report["code"]["coding"][0].get("display", "")
            
            # Check if PE-relevant
            is_relevant, imaging_type = is_pe_relevant_imaging(title)
            
            # If type filter specified, check it
            if study_type.lower() != "all":
                if study_type.lower() == "ctpa" and imaging_type not in ["CTPA", "CTA Chest"]:
                    continue
                elif study_type.lower() == "vq" and imaging_type != "VQ":
                    continue
                elif not is_relevant:
                    continue
            
            # Get date
            date_str = report.get("effectiveDateTime") or report.get("issued") or ""
            if date_str:
                date_str = date_str[:10]
            
            # Get conclusion/snippet
            conclusion = report.get("conclusion", "")
            snippet = extract_imaging_snippet(conclusion)
            
            # Get full text if available
            full_text = conclusion
            if report.get("presentedForm"):
                for form in report["presentedForm"]:
                    if form.get("data"):
                        # Base64 encoded text
                        import base64
                        try:
                            full_text = base64.b64decode(form["data"]).decode("utf-8")
                            snippet = extract_imaging_snippet(full_text)
                        except:
                            pass
            
            studies.append({
                "date": date_str,
                "type": imaging_type,
                "title": title,
                "snippet": snippet,
                "full_text": full_text,
                "resource_ref": f"DiagnosticReport/{report.get('id', '')}"
            })
    
    except Exception as e:
        logger.error(f"Error fetching imaging: {e}")
    
    # Limit to 3 most recent
    studies = studies[:3]
    
    result = {"studies": studies}
    if debug:
        result["debug"] = {"fhir_calls": debug_calls}
    
    _set_cache(patient_id, cache_key, result)
    return result


# ============================================================================
# Summary Aggregator
# ============================================================================

async def get_clinical_summary(
    fhir_base: str,
    access_token: str,
    patient_id: str,
    debug: bool = False
) -> Dict[str, Any]:
    """
    GET /api/clinical/summary
    
    Returns a compact payload for the Essentials tab.
    Aggregates anticoagulation + diagnoses + recent vitals.
    """
    import asyncio
    
    # Parallel fetch
    anticoag_task = get_anticoagulation_status(fhir_base, access_token, patient_id, debug)
    diagnoses_task = get_diagnoses(fhir_base, access_token, patient_id, years=5, debug=debug)
    vitals_task = get_vitals_trend(fhir_base, access_token, patient_id, hours=12, debug=debug)
    
    anticoag, diagnoses, vitals = await asyncio.gather(
        anticoag_task, diagnoses_task, vitals_task,
        return_exceptions=True
    )
    
    # Handle exceptions
    if isinstance(anticoag, Exception):
        logger.error(f"Anticoag fetch failed: {anticoag}")
        anticoag = {"status": "unknown", "medications": [], "has_warfarin": False}
    if isinstance(diagnoses, Exception):
        logger.error(f"Diagnoses fetch failed: {diagnoses}")
        diagnoses = {"flags": {}, "top_conditions": []}
    if isinstance(vitals, Exception):
        logger.error(f"Vitals fetch failed: {vitals}")
        vitals = {"series": {"hr": [], "spo2": [], "rr": [], "sbp": []}}
    
    result = {
        "anticoagulation": {
            "status": anticoag.get("status", "unknown"),
            "has_warfarin": anticoag.get("has_warfarin", False),
            "active_meds": [m["name"] for m in anticoag.get("medications", []) if m.get("status") == "active"]
        },
        "diagnosis_flags": diagnoses.get("flags", {}),
        "vitals_available": {
            "hr": len(vitals.get("series", {}).get("hr", [])) > 0,
            "spo2": len(vitals.get("series", {}).get("spo2", [])) > 0,
            "rr": len(vitals.get("series", {}).get("rr", [])) > 0,
            "sbp": len(vitals.get("series", {}).get("sbp", [])) > 0
        }
    }
    
    if debug:
        result["debug"] = {
            "anticoag_debug": anticoag.get("debug"),
            "diagnoses_debug": diagnoses.get("debug"),
            "vitals_debug": vitals.get("debug")
        }
    
    return result

