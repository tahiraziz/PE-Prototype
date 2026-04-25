#!/usr/bin/env python3
"""
Epic Sandbox Demo Seeding Script - "Demo God" Script

Creates/updates test patient data in Epic Sandbox to demonstrate the Luminur PE
Decision Support system's clinical logic features.

Test Patient Configuration:
- Name: Test, PE-HighRisk
- Age: 55 (tests age-adjusted D-dimer threshold)
- Demographics: Male, for CKD-EPI calculation
- Medication: Active Apixaban order, but MedicationDispense from 60 days ago (gap alert)
- Vitals: HR 105, BP 110/70 (Shock Index ~0.95 - High Risk)
- Labs: D-Dimer 0.65 µg/mL (elevated for standard, but check age-adjusted)
- Allergy: Iodine (triggers Safety Badge warning)

Usage:
    python seed_epic_demo.py --client-id YOUR_CLIENT_ID --client-secret YOUR_SECRET

Requirements:
    pip install requests python-dotenv fhirpy
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# ===========================================================================
# Configuration
# ===========================================================================

EPIC_SANDBOX_BASE = "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"

# Test patient demographics
TEST_PATIENT = {
    "name_given": "PE-HighRisk",
    "name_family": "Test",
    "birth_date": None,  # Calculated for age 55
    "gender": "male",
    "mrn": "PE-DEMO-001",
}

# Vital signs for test patient
TEST_VITALS = {
    "heart_rate": 105,      # Tachycardia
    "systolic_bp": 110,     # Slightly low
    "diastolic_bp": 70,
    "respiratory_rate": 22, # Elevated
    "oxygen_saturation": 92, # Low normal
    "temperature": 37.2,    # Normal
}

# Lab values for test patient
TEST_LABS = {
    "d_dimer": 0.65,        # Elevated for standard (>0.5), check age-adjusted
    "d_dimer_unit": "ug/mL",
    "creatinine": 1.1,      # mg/dL - mild elevation
    "troponin": 0.03,       # ng/mL - borderline
    "inr": None,            # Not on warfarin
}

# Medication configuration
TEST_MEDICATIONS = {
    "anticoagulant": "apixaban",
    "anticoagulant_rxnorm": "1364430",  # Apixaban 5mg
    "anticoagulant_status": "active",
    "last_dispense_days_ago": 60,       # Creates "gap" alert
    "days_supply": 30,                  # 30-day supply
}

# Allergy configuration
TEST_ALLERGIES = [
    {
        "substance": "Iodine",
        "code": "1256",
        "system": "http://snomed.info/sct",
        "clinical_status": "active",
        "reaction": "Rash",
    }
]

# Conditions for problem list
TEST_CONDITIONS = [
    {
        "display": "History of deep vein thrombosis",
        "code": "128053003",
        "system": "http://snomed.info/sct",
    },
    {
        "display": "Essential hypertension",
        "code": "59621000",
        "system": "http://snomed.info/sct",
    }
]


# ===========================================================================
# FHIR Resource Builders
# ===========================================================================

def calculate_birth_date(age_years: int) -> str:
    """Calculate birth date for given age."""
    today = datetime.now()
    birth_year = today.year - age_years
    return f"{birth_year}-{today.month:02d}-{today.day:02d}"


def build_patient_resource() -> Dict[str, Any]:
    """Build FHIR Patient resource."""
    birth_date = calculate_birth_date(55)  # Age 55
    
    return {
        "resourceType": "Patient",
        "identifier": [
            {
                "system": "urn:oid:2.16.840.1.113883.4.1",
                "value": TEST_PATIENT["mrn"]
            }
        ],
        "name": [
            {
                "use": "official",
                "family": TEST_PATIENT["name_family"],
                "given": [TEST_PATIENT["name_given"]]
            }
        ],
        "gender": TEST_PATIENT["gender"],
        "birthDate": birth_date,
        "active": True
    }


def build_observation_vitals(patient_ref: str) -> List[Dict[str, Any]]:
    """Build FHIR Observation resources for vitals."""
    now = datetime.now().isoformat()
    observations = []
    
    # Heart Rate
    observations.append({
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "vital-signs",
                        "display": "Vital Signs"
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "8867-4",
                    "display": "Heart rate"
                }
            ]
        },
        "subject": {"reference": patient_ref},
        "effectiveDateTime": now,
        "valueQuantity": {
            "value": TEST_VITALS["heart_rate"],
            "unit": "/min",
            "system": "http://unitsofmeasure.org",
            "code": "/min"
        }
    })
    
    # Systolic Blood Pressure
    observations.append({
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "vital-signs",
                        "display": "Vital Signs"
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "8480-6",
                    "display": "Systolic blood pressure"
                }
            ]
        },
        "subject": {"reference": patient_ref},
        "effectiveDateTime": now,
        "valueQuantity": {
            "value": TEST_VITALS["systolic_bp"],
            "unit": "mmHg",
            "system": "http://unitsofmeasure.org",
            "code": "mm[Hg]"
        }
    })
    
    # Diastolic Blood Pressure
    observations.append({
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "vital-signs",
                        "display": "Vital Signs"
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "8462-4",
                    "display": "Diastolic blood pressure"
                }
            ]
        },
        "subject": {"reference": patient_ref},
        "effectiveDateTime": now,
        "valueQuantity": {
            "value": TEST_VITALS["diastolic_bp"],
            "unit": "mmHg",
            "system": "http://unitsofmeasure.org",
            "code": "mm[Hg]"
        }
    })
    
    # Respiratory Rate
    observations.append({
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "vital-signs",
                        "display": "Vital Signs"
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "9279-1",
                    "display": "Respiratory rate"
                }
            ]
        },
        "subject": {"reference": patient_ref},
        "effectiveDateTime": now,
        "valueQuantity": {
            "value": TEST_VITALS["respiratory_rate"],
            "unit": "/min",
            "system": "http://unitsofmeasure.org",
            "code": "/min"
        }
    })
    
    # Oxygen Saturation
    observations.append({
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "vital-signs",
                        "display": "Vital Signs"
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "2708-6",
                    "display": "Oxygen saturation in Arterial blood"
                }
            ]
        },
        "subject": {"reference": patient_ref},
        "effectiveDateTime": now,
        "valueQuantity": {
            "value": TEST_VITALS["oxygen_saturation"],
            "unit": "%",
            "system": "http://unitsofmeasure.org",
            "code": "%"
        }
    })
    
    return observations


def build_observation_labs(patient_ref: str) -> List[Dict[str, Any]]:
    """Build FHIR Observation resources for labs."""
    now = datetime.now().isoformat()
    observations = []
    
    # D-Dimer
    observations.append({
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "laboratory",
                        "display": "Laboratory"
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "48066-5",
                    "display": "Fibrin D-dimer FEU"
                }
            ]
        },
        "subject": {"reference": patient_ref},
        "effectiveDateTime": now,
        "valueQuantity": {
            "value": TEST_LABS["d_dimer"],
            "unit": TEST_LABS["d_dimer_unit"],
            "system": "http://unitsofmeasure.org",
            "code": "ug/mL{FEU}"
        },
        "interpretation": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                        "code": "H",
                        "display": "High"
                    }
                ]
            }
        ]
    })
    
    # Creatinine
    observations.append({
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "laboratory",
                        "display": "Laboratory"
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "2160-0",
                    "display": "Creatinine [Mass/volume] in Serum or Plasma"
                }
            ]
        },
        "subject": {"reference": patient_ref},
        "effectiveDateTime": now,
        "valueQuantity": {
            "value": TEST_LABS["creatinine"],
            "unit": "mg/dL",
            "system": "http://unitsofmeasure.org",
            "code": "mg/dL"
        }
    })
    
    # Troponin
    observations.append({
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "laboratory",
                        "display": "Laboratory"
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "6598-7",
                    "display": "Troponin T.cardiac [Mass/volume] in Serum or Plasma"
                }
            ]
        },
        "subject": {"reference": patient_ref},
        "effectiveDateTime": now,
        "valueQuantity": {
            "value": TEST_LABS["troponin"],
            "unit": "ng/mL",
            "system": "http://unitsofmeasure.org",
            "code": "ng/mL"
        }
    })
    
    return observations


def build_medication_request(patient_ref: str) -> Dict[str, Any]:
    """Build FHIR MedicationRequest for active anticoagulant."""
    return {
        "resourceType": "MedicationRequest",
        "status": "active",
        "intent": "order",
        "medicationCodeableConcept": {
            "coding": [
                {
                    "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                    "code": TEST_MEDICATIONS["anticoagulant_rxnorm"],
                    "display": "Apixaban 5 MG Oral Tablet"
                }
            ],
            "text": "Apixaban 5mg tablet"
        },
        "subject": {"reference": patient_ref},
        "authoredOn": datetime.now().isoformat(),
        "dosageInstruction": [
            {
                "text": "Take 5mg by mouth twice daily"
            }
        ]
    }


def build_medication_dispense(patient_ref: str) -> Dict[str, Any]:
    """Build FHIR MedicationDispense with gap (60 days ago)."""
    dispense_date = datetime.now() - timedelta(days=TEST_MEDICATIONS["last_dispense_days_ago"])
    
    return {
        "resourceType": "MedicationDispense",
        "status": "completed",
        "medicationCodeableConcept": {
            "coding": [
                {
                    "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                    "code": TEST_MEDICATIONS["anticoagulant_rxnorm"],
                    "display": "Apixaban 5 MG Oral Tablet"
                }
            ],
            "text": "Apixaban 5mg tablet"
        },
        "subject": {"reference": patient_ref},
        "whenHandedOver": dispense_date.isoformat(),
        "quantity": {
            "value": 60,
            "unit": "tablets"
        },
        "daysSupply": {
            "value": TEST_MEDICATIONS["days_supply"],
            "unit": "days"
        }
    }


def build_allergy_intolerance(patient_ref: str) -> List[Dict[str, Any]]:
    """Build FHIR AllergyIntolerance resources."""
    allergies = []
    
    for allergy in TEST_ALLERGIES:
        allergies.append({
            "resourceType": "AllergyIntolerance",
            "clinicalStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        "code": allergy["clinical_status"],
                        "display": allergy["clinical_status"].capitalize()
                    }
                ]
            },
            "verificationStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
                        "code": "confirmed",
                        "display": "Confirmed"
                    }
                ]
            },
            "type": "allergy",
            "category": ["medication"],
            "criticality": "high",
            "code": {
                "coding": [
                    {
                        "system": allergy["system"],
                        "code": allergy["code"],
                        "display": allergy["substance"]
                    }
                ],
                "text": allergy["substance"]
            },
            "patient": {"reference": patient_ref},
            "recordedDate": datetime.now().isoformat(),
            "reaction": [
                {
                    "manifestation": [
                        {
                            "coding": [
                                {
                                    "system": "http://snomed.info/sct",
                                    "display": allergy["reaction"]
                                }
                            ]
                        }
                    ],
                    "severity": "moderate"
                }
            ]
        })
    
    return allergies


def build_conditions(patient_ref: str) -> List[Dict[str, Any]]:
    """Build FHIR Condition resources."""
    conditions = []
    
    for condition in TEST_CONDITIONS:
        conditions.append({
            "resourceType": "Condition",
            "clinicalStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                        "code": "active",
                        "display": "Active"
                    }
                ]
            },
            "verificationStatus": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                        "code": "confirmed",
                        "display": "Confirmed"
                    }
                ]
            },
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                            "code": "problem-list-item",
                            "display": "Problem List Item"
                        }
                    ]
                }
            ],
            "code": {
                "coding": [
                    {
                        "system": condition["system"],
                        "code": condition["code"],
                        "display": condition["display"]
                    }
                ],
                "text": condition["display"]
            },
            "subject": {"reference": patient_ref},
            "recordedDate": (datetime.now() - timedelta(days=365)).isoformat()
        })
    
    return conditions


# ===========================================================================
# API Client
# ===========================================================================

class EpicSandboxClient:
    """Client for interacting with Epic Sandbox FHIR API."""
    
    def __init__(self, base_url: str, access_token: str):
        self.base_url = base_url.rstrip('/')
        self.access_token = access_token
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/fhir+json",
            "Accept": "application/fhir+json"
        })
    
    def create_resource(self, resource: Dict[str, Any]) -> Dict[str, Any]:
        """Create a FHIR resource."""
        resource_type = resource.get("resourceType")
        if not resource_type:
            raise ValueError("Resource must have resourceType")
        
        url = f"{self.base_url}/{resource_type}"
        response = self.session.post(url, json=resource)
        
        if response.status_code not in [200, 201]:
            print(f"Error creating {resource_type}: {response.status_code}")
            print(f"Response: {response.text}")
            raise Exception(f"Failed to create {resource_type}: {response.status_code}")
        
        return response.json()
    
    def update_resource(self, resource_type: str, resource_id: str, resource: Dict[str, Any]) -> Dict[str, Any]:
        """Update a FHIR resource."""
        url = f"{self.base_url}/{resource_type}/{resource_id}"
        resource["id"] = resource_id
        response = self.session.put(url, json=resource)
        
        if response.status_code not in [200, 201]:
            print(f"Error updating {resource_type}/{resource_id}: {response.status_code}")
            print(f"Response: {response.text}")
            raise Exception(f"Failed to update {resource_type}/{resource_id}")
        
        return response.json()
    
    def search_patient(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Search for a patient by identifier."""
        url = f"{self.base_url}/Patient"
        params = {"identifier": identifier}
        response = self.session.get(url, params=params)
        
        if response.status_code != 200:
            return None
        
        bundle = response.json()
        if bundle.get("total", 0) > 0 and bundle.get("entry"):
            return bundle["entry"][0]["resource"]
        
        return None


# ===========================================================================
# Main Seeding Logic
# ===========================================================================

def seed_demo_patient(client: EpicSandboxClient, dry_run: bool = False) -> Dict[str, Any]:
    """
    Seed the demo patient with all test data.
    
    Returns:
        Dict with created resource IDs and summary
    """
    results = {
        "patient_id": None,
        "resources_created": [],
        "errors": [],
    }
    
    print("\n" + "=" * 60)
    print("LUMINUR PE DECISION SUPPORT - DEMO SEEDING")
    print("=" * 60)
    
    # 1. Create/Update Patient
    print("\n[1/6] Creating patient: Test, PE-HighRisk (Age 55, Male)")
    patient_resource = build_patient_resource()
    
    if dry_run:
        print(f"  [DRY RUN] Would create Patient:")
        print(json.dumps(patient_resource, indent=2))
    else:
        try:
            # Check if patient exists
            existing = client.search_patient(TEST_PATIENT["mrn"])
            if existing:
                patient_id = existing["id"]
                print(f"  Found existing patient: {patient_id}")
            else:
                created = client.create_resource(patient_resource)
                patient_id = created["id"]
                results["resources_created"].append(f"Patient/{patient_id}")
                print(f"  Created patient: {patient_id}")
            
            results["patient_id"] = patient_id
            patient_ref = f"Patient/{patient_id}"
        except Exception as e:
            results["errors"].append(f"Patient creation failed: {e}")
            print(f"  ERROR: {e}")
            return results
    
    if dry_run:
        patient_ref = "Patient/demo-patient-id"
    
    # 2. Create Vital Signs
    print(f"\n[2/6] Creating vital signs:")
    print(f"  - HR: {TEST_VITALS['heart_rate']} bpm")
    print(f"  - BP: {TEST_VITALS['systolic_bp']}/{TEST_VITALS['diastolic_bp']} mmHg")
    print(f"  - SpO2: {TEST_VITALS['oxygen_saturation']}%")
    print(f"  - RR: {TEST_VITALS['respiratory_rate']}/min")
    shock_index = TEST_VITALS['heart_rate'] / TEST_VITALS['systolic_bp']
    print(f"  - Shock Index: {shock_index:.2f} (HIGH RISK)")
    
    vitals_obs = build_observation_vitals(patient_ref)
    
    if not dry_run:
        for obs in vitals_obs:
            try:
                created = client.create_resource(obs)
                results["resources_created"].append(f"Observation/{created['id']}")
            except Exception as e:
                results["errors"].append(f"Vitals creation failed: {e}")
    
    # 3. Create Labs
    print(f"\n[3/6] Creating laboratory values:")
    print(f"  - D-Dimer: {TEST_LABS['d_dimer']} {TEST_LABS['d_dimer_unit']}")
    print(f"    * Standard threshold: 0.50 µg/mL - ELEVATED")
    print(f"    * Age-adjusted (55): 0.55 µg/mL - ELEVATED")
    print(f"  - Creatinine: {TEST_LABS['creatinine']} mg/dL")
    print(f"  - Troponin: {TEST_LABS['troponin']} ng/mL")
    
    labs_obs = build_observation_labs(patient_ref)
    
    if not dry_run:
        for obs in labs_obs:
            try:
                created = client.create_resource(obs)
                results["resources_created"].append(f"Observation/{created['id']}")
            except Exception as e:
                results["errors"].append(f"Labs creation failed: {e}")
    
    # 4. Create Medications (with gap)
    print(f"\n[4/6] Creating medication history:")
    print(f"  - Active order: Apixaban 5mg BID")
    print(f"  - Last dispense: {TEST_MEDICATIONS['last_dispense_days_ago']} days ago")
    print(f"  - Days supply: {TEST_MEDICATIONS['days_supply']} days")
    gap_days = TEST_MEDICATIONS['last_dispense_days_ago'] - TEST_MEDICATIONS['days_supply']
    print(f"  - GAP ALERT: {gap_days} days without medication!")
    
    if not dry_run:
        try:
            med_request = build_medication_request(patient_ref)
            created = client.create_resource(med_request)
            results["resources_created"].append(f"MedicationRequest/{created['id']}")
            
            med_dispense = build_medication_dispense(patient_ref)
            created = client.create_resource(med_dispense)
            results["resources_created"].append(f"MedicationDispense/{created['id']}")
        except Exception as e:
            results["errors"].append(f"Medication creation failed: {e}")
    
    # 5. Create Allergies
    print(f"\n[5/6] Creating allergies:")
    for allergy in TEST_ALLERGIES:
        print(f"  - {allergy['substance']} (Reaction: {allergy['reaction']})")
    print(f"  - SAFETY BADGE: Iodine allergy warning!")
    
    if not dry_run:
        allergies = build_allergy_intolerance(patient_ref)
        for allergy in allergies:
            try:
                created = client.create_resource(allergy)
                results["resources_created"].append(f"AllergyIntolerance/{created['id']}")
            except Exception as e:
                results["errors"].append(f"Allergy creation failed: {e}")
    
    # 6. Create Conditions
    print(f"\n[6/6] Creating problem list:")
    for condition in TEST_CONDITIONS:
        print(f"  - {condition['display']}")
    
    if not dry_run:
        conditions = build_conditions(patient_ref)
        for condition in conditions:
            try:
                created = client.create_resource(condition)
                results["resources_created"].append(f"Condition/{created['id']}")
            except Exception as e:
                results["errors"].append(f"Condition creation failed: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("SEEDING COMPLETE")
    print("=" * 60)
    print(f"Patient ID: {results['patient_id']}")
    print(f"Resources created: {len(results['resources_created'])}")
    if results['errors']:
        print(f"Errors: {len(results['errors'])}")
        for error in results['errors']:
            print(f"  - {error}")
    
    print("\n📋 TEST SCENARIO SUMMARY:")
    print("-" * 40)
    print("This patient will trigger the following alerts:")
    print("  1. Age-Adjusted D-Dimer: 0.65 > 0.55 threshold (elevated)")
    print(f"  2. Shock Index: {shock_index:.2f} (HIGH RISK)")
    print(f"  3. Medication Gap: {gap_days} days without Apixaban")
    print("  4. Iodine Allergy: Safety Badge warning")
    print("  5. Prior DVT: VTE risk factor")
    print("-" * 40)
    
    return results


def get_access_token(client_id: str, client_secret: str) -> str:
    """
    Get access token from Epic Sandbox.
    
    Note: For sandbox testing, you may need to use a different auth flow.
    This is a placeholder for the OAuth2 client credentials flow.
    """
    # Epic Sandbox token endpoint
    token_url = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token"
    
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    }
    
    response = requests.post(token_url, data=data)
    
    if response.status_code != 200:
        print(f"Token request failed: {response.status_code}")
        print(f"Response: {response.text}")
        raise Exception("Failed to get access token")
    
    return response.json()["access_token"]


def main():
    parser = argparse.ArgumentParser(
        description="Seed Epic Sandbox with demo PE patient data"
    )
    parser.add_argument(
        "--client-id",
        default=os.getenv("EPIC_CLIENT_ID"),
        help="Epic client ID (or set EPIC_CLIENT_ID env var)"
    )
    parser.add_argument(
        "--client-secret",
        default=os.getenv("EPIC_CLIENT_SECRET"),
        help="Epic client secret (or set EPIC_CLIENT_SECRET env var)"
    )
    parser.add_argument(
        "--access-token",
        default=os.getenv("EPIC_ACCESS_TOKEN"),
        help="Pre-obtained access token (skips auth)"
    )
    parser.add_argument(
        "--base-url",
        default=EPIC_SANDBOX_BASE,
        help="FHIR server base URL"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be created without making API calls"
    )
    
    args = parser.parse_args()
    
    if args.dry_run:
        print("\n🔍 DRY RUN MODE - No API calls will be made\n")
        seed_demo_patient(None, dry_run=True)
        return
    
    # Get access token
    access_token = args.access_token
    if not access_token:
        if not args.client_id or not args.client_secret:
            print("Error: Either --access-token or --client-id and --client-secret required")
            sys.exit(1)
        
        print("Obtaining access token...")
        access_token = get_access_token(args.client_id, args.client_secret)
    
    # Create client and seed data
    client = EpicSandboxClient(args.base_url, access_token)
    results = seed_demo_patient(client)
    
    if results["errors"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
