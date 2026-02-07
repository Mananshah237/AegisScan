# AutoAppSec

AutoAppSec is a multi-user web platform, API, and CLI designed to orchestrate OWASP ZAP scans, manage findings, and generate professional security reports.

## Features

- **Multi-Tenant System**: User accounts, teams, and isolation.
- **Scan Orchestration**: Asynchronous ZAP scans using Docker.
- **Risk Intelligence**: Normalized findings, deduplication, and risk scoring.
- **Professional Reporting**: PDF and HTML exports.
- **CI/CD Integration**: API and CLI for automated security testing.

## Tech Stack

- **Backend**: Python 3.11, FastAPI, Celery, SQLAlchemy
- **Frontend**: React, Vite, TailwindCSS
- **Database**: PostgreSQL, Redis
- **Infrastructure**: Docker, Docker Compose

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### Running with Docker

```bash
docker-compose up -d --build
```

### 💻 Using the CLI
The `autoappsec` CLI allows you to run scanning operations from the terminal.

1. **Install**:
   ```bash
   cd backend
   pip install .
   ```

2. **Login**:
   ```bash
   autoappsec auth login
   # Enter API Key from Dashboard -> Profile
   ```

3. **Run Scan**:
   ```bash
   autoappsec scan run http://example.com --profile quick --wait
   ```

### 📈 Reports & Dashboard
- Access the dashboard at `http://localhost:5173`.
- View risk trends and recent scan statuses.
- Download professional HTML reports for any completed scan.

### 🛡️ Security Features
- **ZAP Integration**: Automated DAST scanning.
- **Risk Scoring**: Severity * Confidence * Exposure.
- **Audit Logs**: Critical actions are logged.
- **Health Checks**: `/health/live` and `/health/ready` endpoints.

