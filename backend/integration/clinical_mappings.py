"""
Clinical code mappings for medication types, diagnoses, and LOINC codes.

These mappings enable categorization of medications and conditions from FHIR resources
for the PE Rule-Out clinical decision support dashboard.
"""

from typing import Dict, List, Optional, Tuple
import re

# ============================================================================
# MEDICATION MAPPINGS
# ============================================================================

# Anticoagulant medication patterns (case-insensitive)
MEDICATION_PATTERNS: Dict[str, List[str]] = {
    "DOAC": [
        "apixaban", "eliquis",
        "rivaroxaban", "xarelto",
        "dabigatran", "pradaxa",
        "edoxaban", "savaysa", "lixiana",
        "betrixaban", "bevyxxa"
    ],
    "Warfarin": [
        "warfarin", "coumadin", "jantoven"
    ],
    "Heparin_LMWH": [
        "heparin", "unfractionated heparin",
        "enoxaparin", "lovenox",
        "dalteparin", "fragmin",
        "tinzaparin", "innohep",
        "fondaparinux", "arixtra"
    ],
    "Antiplatelet": [
        "aspirin", "asa", "acetylsalicylic",
        "clopidogrel", "plavix",
        "ticagrelor", "brilinta",
        "prasugrel", "effient",
        "dipyridamole", "aggrenox",
        "ticlopidine", "ticlid",
        "cangrelor", "kengreal",
        "vorapaxar", "zontivity"
    ]
}


def classify_medication(med_name: str) -> str:
    """
    Classify a medication name into anticoagulant type.
    
    Returns: DOAC | Warfarin | Heparin_LMWH | Antiplatelet | Other
    """
    if not med_name:
        return "Other"
    
    med_lower = med_name.lower()
    
    for med_type, patterns in MEDICATION_PATTERNS.items():
        for pattern in patterns:
            if pattern in med_lower:
                return med_type
    
    return "Other"


def is_anticoagulant(med_name: str) -> bool:
    """Check if medication is any type of anticoagulant (not antiplatelet)."""
    med_type = classify_medication(med_name)
    return med_type in ["DOAC", "Warfarin", "Heparin_LMWH"]


def is_anticoagulant_or_antiplatelet(med_name: str) -> bool:
    """Check if medication is anticoagulant or antiplatelet."""
    med_type = classify_medication(med_name)
    return med_type != "Other"


# ============================================================================
# DIAGNOSIS MAPPINGS (for PE differential/mimics)
# ============================================================================

# Diagnosis patterns for conditions that can mimic PE symptoms
DIAGNOSIS_PATTERNS: Dict[str, List[str]] = {
    "asthma": [
        "asthma", "reactive airway", "bronchospasm"
    ],
    "anxiety": [
        "anxiety", "panic", "hyperventilation syndrome", 
        "generalized anxiety", "panic disorder", "gad"
    ],
    "copd": [
        "copd", "chronic obstructive", "emphysema", 
        "chronic bronchitis", "obstructive lung disease"
    ],
    "chf": [
        "heart failure", "chf", "congestive heart", 
        "cardiomyopathy", "systolic dysfunction", 
        "diastolic dysfunction", "hfref", "hfpef",
        "left ventricular failure", "right heart failure"
    ],
    "pneumonia": [
        "pneumonia", "pneumonitis", "lower respiratory infection",
        "community acquired pneumonia", "cap", "hap",
        "aspiration pneumonia"
    ]
}

# ICD-10 code prefixes for diagnosis categories
DIAGNOSIS_ICD10_PREFIXES: Dict[str, List[str]] = {
    "asthma": ["J45"],
    "anxiety": ["F40", "F41"],
    "copd": ["J44", "J43"],
    "chf": ["I50", "I11.0", "I13.0", "I13.2"],
    "pneumonia": ["J12", "J13", "J14", "J15", "J16", "J17", "J18"]
}


def classify_diagnosis(display: str, code: Optional[str] = None) -> Optional[str]:
    """
    Classify a diagnosis into one of the PE mimic categories.
    
    Returns: asthma | anxiety | copd | chf | pneumonia | None
    """
    # Try code-based classification first (more reliable)
    if code:
        code_upper = code.upper()
        for category, prefixes in DIAGNOSIS_ICD10_PREFIXES.items():
            for prefix in prefixes:
                if code_upper.startswith(prefix):
                    return category
    
    # Fall back to text pattern matching
    if display:
        display_lower = display.lower()
        for category, patterns in DIAGNOSIS_PATTERNS.items():
            for pattern in patterns:
                if pattern in display_lower:
                    return category
    
    return None


def get_diagnosis_flags(conditions: List[Dict]) -> Dict[str, bool]:
    """
    Given a list of conditions, return flags for each PE mimic category.
    
    Each condition dict should have: display, code (optional), clinical_status
    """
    flags = {
        "asthma": False,
        "anxiety": False,
        "copd": False,
        "chf": False,
        "pneumonia": False
    }
    
    for condition in conditions:
        display = condition.get("display", "")
        code = condition.get("code")
        category = classify_diagnosis(display, code)
        if category:
            flags[category] = True
    
    return flags


# ============================================================================
# LOINC CODE MAPPINGS
# ============================================================================

# Vital signs LOINC codes
VITAL_SIGNS_LOINC: Dict[str, List[str]] = {
    "hr": ["8867-4"],  # Heart rate
    "spo2": ["2708-6", "59408-5"],  # SpO2
    "rr": ["9279-1"],  # Respiratory rate
    "sbp": ["8480-6"],  # Systolic BP
    "dbp": ["8462-4"],  # Diastolic BP
    "temp": ["8310-5", "8331-1"],  # Body temperature
}

# Lab LOINC codes
LAB_LOINC: Dict[str, List[str]] = {
    "inr": ["6301-6", "34714-6", "46418-0"],
    "ddimer": ["48066-5", "48065-7", "48067-3", "3246-6", "48058-2"],
    "troponin": ["6598-7", "10839-9", "49563-0", "89579-7"],
    "bnp": ["30934-4", "33762-6"],
    "creatinine": ["2160-0", "38483-4"]
}


def match_vital_type(codes: List[str], display: str) -> Optional[str]:
    """
    Match observation codes/display to a vital sign type.
    
    Returns: hr | spo2 | rr | sbp | dbp | temp | None
    """
    # Try LOINC code match first
    for vital_type, loinc_codes in VITAL_SIGNS_LOINC.items():
        for code in codes:
            if code in loinc_codes:
                return vital_type
    
    # Fall back to text matching
    display_lower = display.lower() if display else ""
    
    if any(x in display_lower for x in ["heart rate", "pulse", "hr"]):
        return "hr"
    if any(x in display_lower for x in ["oxygen saturation", "spo2", "o2 sat", "pulse ox"]):
        return "spo2"
    if any(x in display_lower for x in ["respiratory rate", "resp rate", "rr", "breathing rate"]):
        return "rr"
    if any(x in display_lower for x in ["systolic", "sbp"]):
        return "sbp"
    if any(x in display_lower for x in ["diastolic", "dbp"]):
        return "dbp"
    if any(x in display_lower for x in ["temperature", "temp"]):
        return "temp"
    
    return None


def match_lab_type(codes: List[str], display: str) -> Optional[str]:
    """
    Match observation codes/display to a lab type.
    
    Returns: inr | ddimer | troponin | bnp | creatinine | None
    """
    # Try LOINC code match first
    for lab_type, loinc_codes in LAB_LOINC.items():
        for code in codes:
            if code in loinc_codes:
                return lab_type
    
    # Fall back to text matching
    display_lower = display.lower() if display else ""
    
    if "inr" in display_lower:
        return "inr"
    if "d-dimer" in display_lower or "ddimer" in display_lower or "d dimer" in display_lower:
        return "ddimer"
    if "troponin" in display_lower:
        return "troponin"
    if "bnp" in display_lower or "natriuretic" in display_lower:
        return "bnp"
    if "creatinine" in display_lower:
        return "creatinine"
    
    return None


# ============================================================================
# IMAGING STUDY PATTERNS
# ============================================================================

# Patterns for PE-relevant imaging studies
IMAGING_PE_PATTERNS: List[str] = [
    "pulmonary embol",
    "ct angiography chest",
    "cta chest",
    "ctpa",
    "pe protocol",
    "v/q scan",
    "ventilation perfusion",
    "lung scan",
    "pulmonary angiography"
]


def is_pe_relevant_imaging(description: str) -> Tuple[bool, str]:
    """
    Check if imaging study description is relevant to PE workup.
    
    Returns: (is_relevant, imaging_type)
    """
    if not description:
        return False, "Other"
    
    desc_lower = description.lower()
    
    if any(x in desc_lower for x in ["ctpa", "ct pulmonary", "cta chest", "pe protocol"]):
        return True, "CTPA"
    if any(x in desc_lower for x in ["ct angiography chest", "ct angio chest"]):
        return True, "CTA Chest"
    if any(x in desc_lower for x in ["v/q", "ventilation perfusion", "lung scan"]):
        return True, "VQ"
    if "pulmonary embol" in desc_lower:
        return True, "CTPA"
    
    return False, "Other"


def extract_imaging_snippet(text: str, max_length: int = 200) -> str:
    """Extract first ~200 chars as snippet, breaking at word boundary."""
    if not text:
        return ""
    
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    if len(text) <= max_length:
        return text
    
    # Try to break at word boundary
    truncated = text[:max_length]
    last_space = truncated.rfind(' ')
    if last_space > max_length * 0.7:
        truncated = truncated[:last_space]
    
    return truncated + "..."

