import hashlib
from typing import Dict, Any

def calculate_fingerprint(finding: Dict[str, Any]) -> str:
    """
    Calculates a deterministic SHA256 hash for a finding to identify duplicates.
    
    Fields used for fingerprinting:
    - Title (Alert Name)
    - Method (GET/POST)
    - URL (Endpoint)
    - Parameter (Input Vector)
    
    We excludes things like evidence or description which might vary slightly.
    """
    
    # Normalize inputs to prevent spurious changes
    title = (finding.get('title') or '').strip().lower()
    method = (finding.get('method') or '').strip().upper()
    
    # URL: We might want to strip query params for the base URL, 
    # but the vulnerability might be specific to a query param.
    # ZAP usually provides the full URL.
    url = (finding.get('url') or '').strip()
    
    param = (finding.get('param') or '').strip()
    
    # Construct the raw string
    raw = f"{title}|{method}|{url}|{param}"
    
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()
