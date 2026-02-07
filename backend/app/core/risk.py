from typing import Dict, Any

# Weights
SEVERITY_WEIGHTS = {
    "High": 10.0,
    "Medium": 5.0,
    "Low": 2.0,
    "Informational": 0.5,
    "Info": 0.5
}

CONFIDENCE_WEIGHTS = {
    "High": 1.0,
    "Medium": 0.8,
    "Low": 0.5
}

def calculate_risk_score(severity: str, confidence: str) -> float:
    """
    Calculates a risk score from 0 to 10 based on severity and confidence.
    """
    
    s_weight = SEVERITY_WEIGHTS.get(severity, 2.0) # Default to Low if unknown
    c_weight = CONFIDENCE_WEIGHTS.get(confidence, 0.5) # Default to Low
    
    # Basic formula: Score = Severity * Confidence
    # High * High = 10 * 1.0 = 10
    # Med * Med = 5 * 0.8 = 4.0
    # Low * Low = 2 * 0.5 = 1.0
    
    return round(s_weight * c_weight, 2)
