"""
Export PE Model for Deployment

This script extracts and exports the final logistic regression model from the
PE_Complete_Discovery_to_Interpretable notebook for use in the SMART on FHIR integration.

Based on specifications from TECHNICAL_METHODS.md and COMPREHENSIVE_RESULTS_REPORT.md.
"""

import pandas as pd
import numpy as np
import pickle
import json
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Model configuration from documentation
RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

# 25 features as specified in COMPREHENSIVE_RESULTS_REPORT.md
FEATURE_NAMES = [
    # Demographics (5)
    "age", "gender", "bmi", "height_cm", "weight_lbs",
    # Triage vitals (6)
    "triage_hr", "triage_rr", "triage_o2sat", "triage_temp", "triage_sbp", "triage_dbp",
    # Lab values (14)
    "d_dimer", "troponin_t", "ntprobnp", "creatinine", "hemoglobin", "wbc", "platelet",
    "sodium", "potassium", "bun", "glucose", "lactate", "po2", "pco2"
]

CATEGORICAL_FEATURES = ["gender"]
NUMERIC_FEATURES = [f for f in FEATURE_NAMES if f not in CATEGORICAL_FEATURES]


def train_and_export_model():
    """
    Train the logistic regression model as specified in the documentation
    and export it for deployment.
    """
    logger.info("=" * 80)
    logger.info("PE Rule-Out Model Export")
    logger.info("=" * 80)
    
    # Check if data file exists
    data_path = Path("../MIMIC_BigQuery_with_ICD.csv")
    if not data_path.exists():
        data_path = Path("MIMIC_BigQuery_with_ICD.csv")
    
    if not data_path.exists():
        logger.warning("Data file not found. Creating minimal model for demo purposes.")
        create_minimal_model()
        return
    
    logger.info(f"Loading data from {data_path}")
    df = pd.read_csv(data_path)
    
    # Check for required columns
    if "label" not in df.columns:
        logger.error("'label' column not found in dataset")
        create_minimal_model()
        return
    
    # Check if all features are available
    missing_features = [f for f in FEATURE_NAMES if f not in df.columns]
    if missing_features:
        logger.warning(f"Missing features: {missing_features}")
        logger.warning("Creating minimal model for demo purposes.")
        create_minimal_model()
        return
    
    logger.info(f"Dataset loaded: {len(df)} samples")
    
    # Prepare features and outcome
    X = df[FEATURE_NAMES].copy()
    y = df["label"].copy()
    
    logger.info(f"Outcome distribution: {y.value_counts().to_dict()}")
    
    # Split data (70% train+val, 30% test)
    X_trainval, X_test, y_trainval, y_test = train_test_split(
        X, y,
        test_size=0.30,
        stratify=y,
        random_state=RANDOM_STATE
    )
    
    logger.info(f"Train+Val: {len(X_trainval)}, Test: {len(X_test)}")
    
    # Create preprocessing pipeline
    # NOTE: No scaling to preserve clinical interpretability (per TECHNICAL_METHODS.md)
    numeric_transformer = Pipeline([
        ('imputer', SimpleImputer(strategy='median'))
    ])
    
    categorical_transformer = Pipeline([
        ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False, drop='if_binary'))
    ])
    
    preprocessor = ColumnTransformer([
        ('num', numeric_transformer, NUMERIC_FEATURES),
        ('cat', categorical_transformer, CATEGORICAL_FEATURES)
    ], remainder='drop')
    
    # Fit preprocessor
    logger.info("Fitting preprocessor...")
    X_trainval_processed = preprocessor.fit_transform(X_trainval)
    
    # Train logistic regression
    # Hyperparameters from TECHNICAL_METHODS.md Appendix A
    logger.info("Training logistic regression model...")
    model = LogisticRegression(
        penalty='l2',
        C=1.0,
        solver='lbfgs',
        max_iter=1000,
        class_weight='balanced',
        random_state=RANDOM_STATE
    )
    
    model.fit(X_trainval_processed, y_trainval)
    
    # Evaluate on test set
    X_test_processed = preprocessor.transform(X_test)
    y_pred_proba = model.predict_proba(X_test_processed)[:, 1]
    
    # Apply 0.08 threshold
    threshold = 0.08
    y_pred = (y_pred_proba >= threshold).astype(int)
    
    # Compute metrics
    from sklearn.metrics import confusion_matrix, roc_auc_score
    
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    sensitivity = tp / (tp + fn)
    specificity = tn / (tn + fp)
    npv = tn / (tn + fn)
    ppv = tp / (tp + fp) if (tp + fp) > 0 else 0
    rule_out_rate = (tn + fn) / len(y_test)
    auc = roc_auc_score(y_test, y_pred_proba)
    
    logger.info("\n" + "=" * 80)
    logger.info("Model Performance (Test Set)")
    logger.info("=" * 80)
    logger.info(f"AUC: {auc:.4f}")
    logger.info(f"Threshold: {threshold}")
    logger.info(f"Sensitivity: {sensitivity:.4f} ({tp}/{tp+fn})")
    logger.info(f"Specificity: {specificity:.4f} ({tn}/{tn+fp})")
    logger.info(f"NPV: {npv:.4f}")
    logger.info(f"PPV: {ppv:.4f}")
    logger.info(f"Rule-out Rate: {rule_out_rate:.4f} ({tn+fn}/{len(y_test)})")
    logger.info(f"False Negatives: {fn}")
    logger.info(f"Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")
    
    # Export model artifacts
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    
    # Save model
    model_path = output_dir / "pe_lr_model.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    logger.info(f"✓ Model saved to {model_path}")
    
    # Save preprocessor
    preprocessor_path = output_dir / "pe_lr_preprocessor.pkl"
    with open(preprocessor_path, "wb") as f:
        pickle.dump(preprocessor, f)
    logger.info(f"✓ Preprocessor saved to {preprocessor_path}")
    
    # Save feature metadata
    features_meta = {
        "features": FEATURE_NAMES,
        "order": FEATURE_NAMES,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "threshold": threshold,
        "performance": {
            "auc": float(auc),
            "sensitivity": float(sensitivity),
            "specificity": float(specificity),
            "npv": float(npv),
            "ppv": float(ppv),
            "rule_out_rate": float(rule_out_rate),
            "false_negatives": int(fn)
        }
    }
    
    features_path = output_dir / "pe_lr_features.json"
    with open(features_path, "w") as f:
        json.dump(features_meta, f, indent=2)
    logger.info(f"✓ Feature metadata saved to {features_path}")
    
    logger.info("\n" + "=" * 80)
    logger.info("✓ Model export complete!")
    logger.info("=" * 80)


def create_minimal_model():
    """
    Create a minimal dummy model for demo purposes when data isn't available.
    """
    logger.info("Creating minimal model for demonstration...")
    
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    
    # Save feature metadata only (model will use dummy in serve_model.py)
    features_meta = {
        "features": FEATURE_NAMES,
        "order": FEATURE_NAMES,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "threshold": 0.08,
        "performance": {
            "auc": 0.696,
            "sensitivity": 0.974,
            "specificity": 0.270,
            "npv": 0.9895,
            "ppv": 0.127,
            "rule_out_rate": 0.246,
            "false_negatives": 9
        },
        "note": "Using dummy model - train on real data for actual deployment"
    }
    
    features_path = output_dir / "pe_lr_features.json"
    with open(features_path, "w") as f:
        json.dump(features_meta, f, indent=2)
    logger.info(f"✓ Feature metadata saved to {features_path}")
    logger.info("Note: Dummy model will be used by serve_model.py")


if __name__ == "__main__":
    train_and_export_model()

