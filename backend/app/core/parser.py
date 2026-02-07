import json
import logging
from typing import List, Dict, Any, Generator

logger = logging.getLogger(__name__)

def parse_zap_json(file_path: str) -> Generator[Dict[str, Any], None, None]:
    """
    Parses a ZAP JSON report and yields normalized finding dictionaries.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        site = data.get('site', [])
        # site can be a list or a single dict if only one site found? 
        # ZAP JSON structure usually has a 'site' list.
        
        sites = site if isinstance(site, list) else [site]
        
        for s in sites:
            alerts = s.get('alerts', [])
            for alert in alerts:
                yield {
                    "scan_id": None, # To be filled by caller
                    "title": alert.get('alert', 'Unknown Alert'),
                    "description": alert.get('desc', ''),
                    "solution": alert.get('solution', ''),
                    "severity": alert.get('riskdesc', '').split(' ')[0] if alert.get('riskdesc') else 'Info',
                    "confidence": alert.get('confidence', 'Low'),
                    "risk_score": 0.0, # To be calculated
                    "cwe_id": int(alert.get('cweid', 0)),
                    "wasc_id": int(alert.get('wascid', 0)),
                    "cvss_vector": alert.get('otherinfo', ''), # ZAP puts miscellaneous info here sometimes
                    # HTTP Info
                    "method": alert.get('method', ''),
                    "url": alert.get('url', ''),
                    "param": alert.get('param', ''),
                    "attack": alert.get('attack', ''),
                    "evidence": alert.get('evidence', ''),
                    "other_info": alert.get('otherinfo', ''),
                    "reference": alert.get('reference', ''),
                }
                
    except Exception as e:
        logger.error(f"Failed to parse ZAP JSON {file_path}: {e}")
        # We might want to re-raise or just stop yielding
        raise
