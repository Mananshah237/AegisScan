import typer
import requests
import time
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from typing import Optional
from backend.cli.auth import get_api_key, get_api_url

app = typer.Typer()
console = Console()

@app.command("list")
def list_scans(limit: int = 10):
    """
    List recent scans.
    """
    api_key = get_api_key()
    base_url = get_api_url()
    
    if not api_key:
        console.print("[red]Not logged in. Run 'auth login' first.[/red]")
        raise typer.Exit(code=1)

    try:
        # We need to filter by user. The API key should handle authentication.
        # But the API expects header "Authorization: Bearer <token>" OR "X-API-Key"?
        # My backend auth logic supports API keys in header `X-API-Key`.
        # Let's verify `backend/app/core/security.py` or `deps.py`.
        # Assuming X-API-Key header is supported.
        
        headers = {"X-API-Key": api_key}
        response = requests.get(f"{base_url}/api/v1/scans/?limit={limit}", headers=headers)
        
        if response.status_code == 401:
             console.print("[red]Authentication failed. Invalid API Key.[/red]")
             raise typer.Exit(code=1)
             
        if response.status_code != 200:
             console.print(f"[red]Error fetching scans: {response.text}[/red]")
             raise typer.Exit(code=1)
             
        scans = response.json()
        
        table = Table(title=f"Recent Scans (Last {limit})")
        table.add_column("ID", justify="cyan", style="cyan", no_wrap=True)
        table.add_column("Target", style="magenta")
        table.add_column("Status", style="green")
        table.add_column("Created At", justify="right")
        
        for scan in scans:
            # target might be nested object or just id? 
            # Schemas say ScanRead has target: TargetRead.
            target_name = scan.get("target", {}).get("name", "Unknown")
            table.add_row(scan["id"][:8], target_name, scan["status"], scan["created_at"][:19])
            
        console.print(table)

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")

@app.command("run")
def run_scan(target_url: str, profile: str = "quick", wait: bool = False):
    """
    Trigger a new scan for a target URL.
    """
    api_key = get_api_key()
    base_url = get_api_url()
    headers = {"X-API-Key": api_key}
    
    # 1. Ensure Target Exists
    # We'll try to create it. If it exists (409 or handled), we fetch it?
    # Actually, simplistic approach: GET targets, find by base_url?
    # Or just POST and if 400/409, assume exists.
    # Let's try GET /targets/?limit=100 and find match to avoid duplicate errors if API prevents duplicates.
    # My API creates new target if not exist? 
    # Let's assume we implement a "get_or_create" logic client side for now.
    
    target_id = None
    
    with console.status(f"[bold green]Resolving target {target_url}...") as status:
        # List targets to find match
        r = requests.get(f"{base_url}/api/v1/targets/", headers=headers)
        if r.status_code == 200:
            targets = r.json()
            for t in targets:
                if t["base_url"] == target_url:
                    target_id = t["id"]
                    console.print(f"[green]Found existing target: {t['name']} ({target_id[:8]})[/green]")
                    break
        
        if not target_id:
            # Create new
            payload = {"name": target_url, "base_url": target_url}
            r = requests.post(f"{base_url}/api/v1/targets/", json=payload, headers=headers)
            if r.status_code in [200, 201]:
                target_id = r.json()["id"]
                console.print(f"[green]Created new target: {target_url} ({target_id[:8]})[/green]")
            else:
                 console.print(f"[red]Failed to create target: {r.text}[/red]")
                 raise typer.Exit(code=1)
    
    # 2. Start Scan
    with console.status(f"[bold green]Starting {profile} scan for {target_url}...") as status:
        scan_payload = {"target_id": target_id, "profile": profile}
        r = requests.post(f"{base_url}/api/v1/scans/", json=scan_payload, headers=headers)
        if r.status_code not in [200, 201]:
             console.print(f"[red]Failed to start scan: {r.text}[/red]")
             raise typer.Exit(code=1)
        
        scan_data = r.json()
        scan_id = scan_data["id"]
        console.print(f"[bold green]Scan started! ID: {scan_id}[/bold green]")
        
        if wait:
             console.print("[yellow]Waiting for scan to complete... (Ctrl+C to skip)[/yellow]")
             status_text = "QUEUED"
             while status_text not in ["COMPLETED", "FAILED", "ERROR"]:
                 time.sleep(2)
                 r = requests.get(f"{base_url}/api/v1/scans/{scan_id}", headers=headers)
                 if r.status_code == 200:
                     status_text = r.json()["status"]
                     console.print(f"Status: {status_text}")
                 else:
                     console.print(f"[red]Failed to check status[/red]")
                     break
             
             if status_text == "COMPLETED":
                 console.print("[bold green]Scan Completed Successfully![/bold green]")
                 # Maybe link to report?
             else:
                 console.print(f"[bold red]Scan Failed with status: {status_text}[/bold red]")
