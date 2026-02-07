import typer
from rich.console import Console
from backend.cli.auth import save_config

app = typer.Typer()
console = Console()

@app.command()
def login(
    api_key: str = typer.Option(..., prompt=True, hide_input=True, help="Your API Key"),
    url: str = typer.Option("http://localhost:8000", help="Backend API URL")
):
    """
    Configure the CLI with your API Key.
    """
    save_config(api_key, url)
    console.print(f"[bold green]Successfully logged in to {url}![/bold green]")

@app.command()
def logout():
    """
    Clear stored credentials.
    """
    from backend.cli.auth import get_config_path
    path = get_config_path()
    if path.exists():
        path.unlink()
        console.print("[green]Logged out successfully.[/green]")
    else:
        console.print("[yellow]Not logged in.[/yellow]")
