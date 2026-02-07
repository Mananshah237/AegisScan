from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from app.models.scan import Scan, Finding
from app.models.target import Target

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

def generate_html_report(scan: Scan, target: Target, findings: list[Finding]) -> str:
    """
    Renders the security report HTML using Jinja2.
    """
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
    template = env.get_template("report.html")
    
    return template.render(
        scan=scan,
        target=target,
        findings=findings
    )
