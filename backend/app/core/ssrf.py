import socket
import ipaddress
from urllib.parse import urlparse
from fastapi import HTTPException

# Blacklist of private/reserved IP ranges
PRIVATE_RANGES = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("224.0.0.0/4"), # Multicast
    ipaddress.ip_network("240.0.0.0/4"), # Reserved
]

def is_ip_allowed(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        for network in PRIVATE_RANGES:
            if ip in network:
                return False
        return True
    except ValueError:
        return False

def validate_target_url(url: str) -> str:
    parsed = urlparse(url)
    
    # 1. Scheme Check
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must be http or https")
    
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid URL: No hostname")
        
    # 2. Localhost Check (String based)
    if hostname.lower() in ("localhost", "127.0.0.1", "::1"):
        raise ValueError("Scanning localhost is not allowed")
    
    # 3. DNS Resolution & IP Check
    try:
        # Resolve to IP (Get info for both IPv4 and IPv6)
        # Note: This is a point-in-time check. DNS rebinding is still a risk during the actual scan.
        # We mitigate that by re-resolving in the scanner or using a dedicated proxy, 
        # but this is the first line of defense.
        addr_infos = socket.getaddrinfo(hostname, None)
        
        for family, type, proto, canonname, sockaddr in addr_infos:
            ip_addr = sockaddr[0]
            if not is_ip_allowed(ip_addr):
                raise ValueError(f"Target resolves to a private/reserved IP: {ip_addr}")
                
    except socket.gaierror:
        raise ValueError("Could not resolve hostname")
        
    # Normalize: Strip trailing slash
    normalized = url.rstrip("/")
    return normalized
