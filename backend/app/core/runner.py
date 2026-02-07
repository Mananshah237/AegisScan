import os
import docker
import time
import logging
import uuid
from pathlib import Path
from app.core.config import settings
from app.models.scan import ScanProfile

logger = logging.getLogger(__name__)

# Ensure artifacts directory exists
ARTIFACTS_DIR = Path("artifacts")
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

class ZapRunner:
    def __init__(self, target_url: str, scan_id: uuid.UUID, profile: ScanProfile):
        self.target_url = target_url
        self.scan_id = str(scan_id)
        self.profile = profile
        self.client = docker.from_env()
        self.container = None
        
        # Define output paths
        self.scan_dir = ARTIFACTS_DIR / self.scan_id
        self.scan_dir.mkdir(parents=True, exist_ok=True)

    def start(self):
        """
        Starts the ZAP container.
        We mount the artifacts directory to /zap/wrk so ZAP can write reports there.
        """
        image = "ghcr.io/zaproxy/zaproxy:stable"
        
        # Command construction based on profile
        # baseline scan vs full scan logic
        # For MVP we use 'zap-baseline.py' for Quick and 'zap-full-scan.py' for Full
        
        cmd = []
        if self.profile == ScanProfile.QUICK:
            # -t: target
            # -J: json report name
            # -r: html report name
            # -I: ignore warning (don't fail on warnings)
            cmd = ["zap-baseline.py", "-t", self.target_url, "-J", "report.json", "-r", "report.html", "-I"]
        else:
            cmd = ["zap-full-scan.py", "-t", self.target_url, "-J", "report.json", "-r", "report.html", "-I"]

        logger.info(f"Starting ZAP scan for {self.target_url} with profile {self.profile}")
        
        try:
            self.container = self.client.containers.run(
                image,
                command=cmd,
                detach=True,
                # Mount local artifacts dir to /zap/wrk
                volumes={str(self.scan_dir.absolute()): {'bind': '/zap/wrk', 'mode': 'rw'}},
                # Security & Resources
                cap_drop=["ALL"],
                readonly=False, # ZAP needs to write to some tmp dirs, strict readonly is hard
                mem_limit="4g",
                nano_cpus=2000000000, # 2 CPUs
                user="zap", # Run as zap user (1000)
                network_mode="host" # Simplest for connectivity, but less isolated. Ideally bridge.
                # If using bridge, need to ensure it can reach target.
            )
            return self.container.id
        except Exception as e:
            logger.error(f"Failed to start ZAP container: {e}")
            raise

    def wait(self, timeout=3600):
        """Wait for container to finish or timeout"""
        if not self.container:
            return
            
        try:
            result = self.container.wait(timeout=timeout)
            return result
        except Exception as e:
            logger.error(f"Error waiting for ZAP: {e}")
            self.stop()
            raise

    def stop(self):
        if self.container:
            try:
                self.container.stop(timeout=5)
                self.container.remove()
            except Exception:
                pass

    def get_logs(self):
        if self.container:
            return self.container.logs()
        return b""
