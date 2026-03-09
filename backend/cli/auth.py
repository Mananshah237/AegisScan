import json
import os
from pathlib import Path
from typing import Optional
import typer
from rich.console import Console

console = Console()

APP_NAME = "autoappsec"
CONFIG_DIR = Path.home() / f".{APP_NAME}"
CONFIG_FILE = CONFIG_DIR / "config.json"

def get_config_path() -> Path:
    if not CONFIG_DIR.exists():
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    return CONFIG_FILE

def save_config(api_key: str, api_url: str = "http://localhost:8000"):
    config = {
        "api_key": api_key,
        "api_url": api_url
    }
    with open(get_config_path(), "w") as f:
        json.dump(config, f, indent=4)
    console.print(f"[green]Configuration saved to {get_config_path()}[/green]")

def load_config() -> dict:
    if not CONFIG_FILE.exists():
        console.print("[yellow]No configuration found. Please run 'auth login' first.[/yellow]")
        raise typer.Exit(code=1)
    
    try:
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        console.print(f"[red]Failed to load configuration: {e}[/red]")
        raise typer.Exit(code=1)

def get_api_key() -> str:
    env_key = os.getenv("AUTOAPPSEC_API_KEY")
    if env_key:
        return env_key
    if "AUTOAPPSEC_API_KEY" in os.environ:
        console.print("[red]AUTOAPPSEC_API_KEY is set but empty. Check your CI secrets configuration.[/red]")
        raise typer.Exit(code=1)
    config = load_config()
    return config.get("api_key", "")

def get_api_url() -> str:
    env_url = os.getenv("AUTOAPPSEC_API_URL")
    if env_url:
        return env_url
    if "AUTOAPPSEC_API_URL" in os.environ:
        console.print("[red]AUTOAPPSEC_API_URL is set but empty. Check your CI secrets configuration.[/red]")
        raise typer.Exit(code=1)
    config = load_config()
    return config.get("api_url", "http://localhost:8000")
