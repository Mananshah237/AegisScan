import logging
# from app.core.config import settings
# import smtplib
# from email.mime.text import MIMEText
# from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

def send_email_alert(user_email: str, scan_id: str, high_risk_findings: list):
    """
    Sends an email alert to the user about high risk findings.
    
    This is a stub implementation. In production, use SMTP or SendGrid.
    """
    count = len(high_risk_findings)
    if count == 0:
        return

    logger.info(f"MOCK EMAIL TO {user_email}: Found {count} High Risk vulnerabilities in Scan {scan_id}. Please check the dashboard.")
    
    # Real implementation would be:
    # msg = MIMEMultipart()
    # msg['From'] = settings.EMAILS_FROM_EMAIL
    # msg['To'] = user_email
    # msg['Subject'] = f"Security Alert: {count} High Risk Findings Detected"
    # ...
    # with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
    #    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
    #    server.send_message(msg)
