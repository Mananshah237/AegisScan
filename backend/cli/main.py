import typer
from backend.cli.commands import auth, scan

app = typer.Typer(
    name="autoappsec",
    help="AutoAppSec CLI - Security Scanning for Developers",
    add_completion=False,
)

app.add_typer(auth.app, name="auth", help="Manage authentication")
app.add_typer(scan.app, name="scan", help="Manage security scans")

if __name__ == "__main__":
    app()
