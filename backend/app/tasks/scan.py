import asyncio
import logging
from app.worker import celery_app
from app.models.scan import Scan, ScanStatus, Artifact, Finding, Severity
from app.models.target import Target
from app.models.user import User
from app.core.runner import ZapRunner
from app.core.notify import send_email_alert
from app.core.parser import parse_zap_json
from app.core.fingerprint import calculate_fingerprint
from app.core.risk import calculate_risk_score
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import uuid

logger = logging.getLogger(__name__)


def _make_session_factory():
    """Create a fresh engine + session factory bound to the current event loop.
    Called inside the async function so asyncpg pool is tied to the correct loop
    for each Celery task — avoids 'Future attached to a different loop' errors."""
    from app.core.config import settings
    engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_size=2, max_overflow=0)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return factory, engine


async def _run_scan_logic(scan_id: str):
    SessionLocal, engine = _make_session_factory()
    try:
        async with SessionLocal() as db:
            # 1. Retrieve Scan & Target
            result = await db.execute(select(Scan).where(Scan.id == uuid.UUID(scan_id)))
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
                # 3. Start ZAP container
                container_id = runner.start()
                logger.info(f"Scan {scan_id} started in container {container_id}")

                # 4. Wait for completion (blocking — up to 1 hour)
                runner.wait(timeout=3600)

                # 5. Mark completed + register artifact paths
                scan.status = ScanStatus.COMPLETED

                base_path = runner.scan_dir.absolute()
                json_report_path = base_path / "report.json"
                html_report_path = base_path / "report.html"

                db.add_all([
                    Artifact(scan_id=scan.id, type="json", file_path=str(json_report_path)),
                    Artifact(scan_id=scan.id, type="html", file_path=str(html_report_path)),
                ])

                # 6. Parse findings
                high_risk_findings = []
                if json_report_path.exists():
                    for f_data in parse_zap_json(str(json_report_path)):
                        f_hash = calculate_fingerprint(f_data)
                        r_score = calculate_risk_score(f_data["severity"], f_data["confidence"])
                        try:
                            severity_enum = Severity(f_data["severity"])
                        except ValueError:
                            severity_enum = Severity.INFO

                        finding = Finding(
                            scan_id=scan.id,
                            title=f_data["title"],
                            description=f_data["description"],
                            severity=severity_enum,
                            confidence=f_data["confidence"],
                            risk_score=r_score,
                            fingerprint=f_hash,
                            cwe_id=str(f_data["cwe_id"]) if f_data.get("cwe_id") else None,
                            wasc_id=str(f_data["wasc_id"]) if f_data.get("wasc_id") else None,
                            cvss_vector=f_data.get("cvss_vector") or None,
                            endpoint_url=f_data.get("url", ""),
                            finding_meta=f_data,
                        )
                        db.add(finding)

                        if severity_enum == Severity.HIGH:
                            high_risk_findings.append(finding)

                await db.commit()

                # 7. Alert on high-severity findings
                if high_risk_findings:
                    q = (
                        select(User.email)
                        .join(Target, Target.user_id == User.id)
                        .where(Target.id == scan.target_id)
                    )
                    user_email = (await db.execute(q)).scalar()
                    if user_email:
                        send_email_alert(user_email, str(scan.id), high_risk_findings)

            except Exception as e:
                logger.error(f"Scan {scan_id} failed: {e}", exc_info=True)
                scan.status = ScanStatus.FAILED
                await db.commit()
            finally:
                runner.stop()
    finally:
        await engine.dispose()


@celery_app.task
def run_scan_task(scan_id: str):
    """Celery entry point — runs the async scan logic in a fresh event loop."""
    asyncio.run(_run_scan_logic(scan_id))
