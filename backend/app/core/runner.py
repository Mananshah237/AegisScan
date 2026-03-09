import os
import docker
import logging
import uuid
from pathlib import Path
from app.models.scan import ScanProfile

logger = logging.getLogger(__name__)

# Container-internal artifacts dir (for reading reports back after scan)
ARTIFACTS_DIR = Path("artifacts")
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

# Host-side path used when bind-mounting into sibling ZAP containers.
# Must be the real path on the Docker host (Windows), not the container-internal path.
HOST_ARTIFACTS_PATH = os.environ.get(
    "HOST_ARTIFACTS_PATH", str(ARTIFACTS_DIR.absolute())
)


class ZapRunner:
    def __init__(self, target_url: str, scan_id: uuid.UUID, profile: ScanProfile):
        self.target_url = target_url
        self.scan_id = str(scan_id)
        self.profile = profile
        self.client = docker.from_env()
        self.container = None

        # Container-internal path (for reading reports after ZAP finishes)
        self.scan_dir = ARTIFACTS_DIR / self.scan_id
        self.scan_dir.mkdir(parents=True, exist_ok=True)
        self.scan_dir.chmod(0o777)  # Allow ZAP (uid 1000) to write into this dir

        # Host path passed to Docker daemon for the ZAP volume mount
        self.host_scan_dir = f"{HOST_ARTIFACTS_PATH}/{self.scan_id}"

    def start(self):
        image = "ghcr.io/zaproxy/zaproxy:stable"

        if self.profile == ScanProfile.QUICK:
            cmd = [
                "zap-baseline.py",
                "-t", self.target_url,
                "-J", "report.json",
                "-r", "report.html",
                "-I",
            ]
        else:
            cmd = [
                "zap-full-scan.py",
                "-t", self.target_url,
                "-J", "report.json",
                "-r", "report.html",
                "-I",
            ]

        logger.info(
            f"Starting ZAP scan: target={self.target_url} profile={self.profile} "
            f"host_volume={self.host_scan_dir}"
        )

        try:
            self.container = self.client.containers.run(
                image,
                command=cmd,
                detach=True,
                volumes={self.host_scan_dir: {"bind": "/zap/wrk", "mode": "rw"}},
                mem_limit="4g",
                nano_cpus=2_000_000_000,  # 2 CPUs
                user="zap",
            )
            logger.info(f"ZAP container started: {self.container.short_id}")
            return self.container.id
        except Exception as e:
            logger.error(f"Failed to start ZAP container: {e}")
            raise

    def wait(self, timeout=3600):
        if not self.container:
            return {"StatusCode": -1}
        try:
            result = self.container.wait(timeout=timeout)
            exit_code = result.get("StatusCode", -1)
            # Always capture ZAP output for diagnostics
            try:
                logs = self.container.logs(stdout=True, stderr=True).decode(
                    "utf-8", errors="replace"
                )
                if exit_code != 0:
                    logger.error(f"ZAP exited with code {exit_code}. Output:\n{logs[-3000:]}")
                else:
                    logger.info(f"ZAP finished OK (code 0). Last lines:\n{logs[-500:]}")
            except Exception:
                pass
            if exit_code not in (0, 2):
                # 0 = success, 2 = warnings only (ZAP baseline treats WARN as exit 2 with -I flag)
                raise RuntimeError(f"ZAP exited with code {exit_code}")
            return result
        except RuntimeError:
            raise
        except Exception as e:
            logger.error(f"Error waiting for ZAP container: {e}")
            raise

    def stop(self):
        if self.container:
            try:
                self.container.stop(timeout=5)
            except Exception:
                pass
            try:
                self.container.remove()
            except Exception:
                pass

    def get_logs(self):
        if self.container:
            try:
                return self.container.logs()
            except Exception:
                return b""
        return b""
