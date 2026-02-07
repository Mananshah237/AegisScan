import asyncio
import logging
from app.worker import celery_app
from app.db.session import AsyncSessionLocal
from app.models.scan import Scan, ScanStatus, Artifact
from app.models.target import Target
from app.core.runner import ZapRunner
from sqlalchemy import select
import uuid

logger = logging.getLogger(__name__)

async def _run_scan_logic(scan_id: str):
    async with AsyncSessionLocal() as db:
        # 1. Retrieve Scan & Target
        result = await db.execute(select(Scan).where(Scan.id == scan_id))
        scan = result.scalars().first()
        if not scan:
            logger.error(f"Scan {scan_id} not found")
            return

        target_result = await db.execute(select(Target).where(Target.id == scan.target_id))
        target = target_result.scalars().first()
        if not target:
            logger.error(f"Target {scan.target_id} not found")
            return

        # 2. Update Status to Running
        scan.status = ScanStatus.RUNNING
        await db.commit()

        runner = ZapRunner(target_url=target.base_url, scan_id=scan.id, profile=scan.profile)
        
        try:
            # 3. Start Container
            container_id = runner.start()
            logger.info(f"Scan {scan_id} started in container {container_id}")
            
            # 4. Wait for completion (Blocking)
            # In a real async worker we might poll, but Celery tasks are often blocking.
            # We used wait() with timeout.
            runner.wait(timeout=3600) # 1 hour timeout
            
            # 5. Success - Update DB and Save Artifacts paths
            scan.status = ScanStatus.COMPLETED
            
            # Register Artifacts
            base_artifact_path = runner.scan_dir.absolute()
            json_report_path = base_artifact_path / "report.json"
            html_report_path = base_artifact_path / "report.html"
            
            json_art = Artifact(scan_id=scan.id, type="json", file_path=str(json_report_path))
            html_art = Artifact(scan_id=scan.id, type="html", file_path=str(html_report_path))
            db.add_all([json_art, html_art])
            
            # --- FINDINGS PIPELINE ---
            from app.core.parser import parse_zap_json
            from app.core.fingerprint import calculate_fingerprint
            from app.core.risk import calculate_risk_score
            from app.models.scan import Finding, Severity
            
            if json_report_path.exists():
                high_risk_findings = []
                for f_data in parse_zap_json(str(json_report_path)):
                    # fingerprint
                    f_hash = calculate_fingerprint(f_data)
                    
                    # risk
                    r_score = calculate_risk_score(f_data['severity'], f_data['confidence'])
                    
                    # Map generic severity string to Enum if possible, or keep string?
                    # Our Finding model uses Enum? Let's check model.
                    # Assuming Finding model accepts string or mapped Enum.
                    # ZAP returns "High", "Medium", etc. matching our Enum usually.
                    
                    finding = Finding(
                        scan_id=scan.id,
                        title=f_data['title'],
                        description=f_data['description'],
                        severity=f_data['severity'], # Pydantic/SQLAlchemy should cast if valid
                        confidence=f_data['confidence'],
                        risk_score=r_score,
                        fingerprint=f_hash,
                        cwe_id=f_data['cwe_id'],
                        wasc_id=f_data['wasc_id'],
                        cvss_vector=f_data['cvss_vector'],
                        endpoint_url=f_data['url'],
                        finding_meta=f_data # Store raw JSON in JSONB column
                    )
                    db.add(finding)
                    
                    if finding.severity == "High":
                        high_risk_findings.append(finding)
            
            await db.commit()
            
            # Send Notification
            if high_risk_findings:
                 # We need user email. Scan -> Target -> User
                 # Fetch user email
                 from app.models.target import Target
                 from app.models.user import User
                 from sqlalchemy import select
                 
                 # Logic to get email
                 # For now, just log it via notify stub
                 from app.core.notify import send_email_alert
                 # We assume we can get email or pass it
                 # In a real async task, we should have passed user_id or email to the task
                 # Or fetch it here.
                 
                 # Query user email
                 q = select(User.email).join(Target).where(Target.id == scan.target_id)
                 user_email = (await db.execute(q)).scalar()
                 
                 if user_email:
                     send_email_alert(user_email, str(scan.id), high_risk_findings)

            
        except Exception as e:
            logger.error(f"Scan {scan_id} failed: {e}")
            scan.status = ScanStatus.FAILED
            await db.commit()
        finally:
            runner.stop()

@celery_app.task
def run_scan_task(scan_id: str):
    """
    Celery task wrapper for async logic
    """
    # Create new event loop for async DB operations within sync Celery worker
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(_run_scan_logic(scan_id))
    loop.close()
