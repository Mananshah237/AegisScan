# AegisScan (AutoAppSec)

**A self-hosted, full-stack web application security scanning platform powered by OWASP ZAP.**

![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)

---

## Table of Contents

1. [What is AegisScan](#what-is-aegisscan)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Security Methodology](#security-methodology)
5. [Prerequisites](#prerequisites)
6. [First-Time Setup](#first-time-setup)
7. [Everyday Usage](#everyday-usage)
8. [Running Scans](#running-scans)
9. [Understanding Results](#understanding-results)
10. [OWASP Top 10 Mapping](#owasp-top-10-mapping)
11. [Configuration Reference](#configuration-reference)
12. [API Reference](#api-reference)
13. [CI/CD Integration](#cicd-integration)
14. [Troubleshooting](#troubleshooting)
15. [Windows-Specific Notes](#windows-specific-notes)

---

## What is AegisScan

AegisScan (also known internally as AutoAppSec) is a self-hosted Dynamic Application Security Testing (DAST) platform. It orchestrates OWASP ZAP scans against target web applications, normalizes and stores the findings in a database, scores each finding by risk, and exposes everything through a web dashboard and REST API.

### The problem it solves

Commercial DAST platforms like StackHawk, BurpSuite Enterprise, or Invicti charge thousands of dollars per year and often require sending your target URLs to third-party infrastructure. AegisScan gives you the same core capability — authenticated scanning, finding management, risk scoring, HTML reports — entirely on your own infrastructure.

It is well-suited for:

- **Development teams** wanting security feedback in pull requests without a SaaS subscription
- **Security engineers** who need a programmable, API-first scanning platform
- **Organizations** with compliance requirements mandating on-premises tooling
- **Penetration testers** who want a persistent finding database across multiple engagements

### How it works

1. You register a **target** (a base URL such as `https://example.com`)
2. You submit a **scan** against that target, choosing a profile (`quick` or `full`)
3. The Celery worker spawns an OWASP ZAP **Docker container** as a sibling container via the Docker socket
4. ZAP runs the scan and writes JSON and HTML reports to a shared volume (`backend/artifacts/{scan_id}/`)
5. The worker parses the JSON report, calculates a risk score for each finding, generates a SHA-256 fingerprint for deduplication, and persists everything to PostgreSQL
6. You view results in the **web dashboard** at `http://localhost:3000` or query them via the **REST API** at `http://localhost:8000/api/v1`

---

## Architecture

```
                          ┌─────────────────────────────────────────┐
                          │           Docker Host (Windows)          │
                          │                                          │
  Browser / API Client    │   ┌─────────────┐   ┌───────────────┐  │
  ─────────────────────►  │   │  frontend   │   │    backend    │  │
  http://localhost:3000   │   │  (Nginx)    │   │  (FastAPI)    │  │
  http://localhost:8000   │   │  Port 3000  │   │  Port 8000    │  │
                          │   └──────┬──────┘   └──────┬────────┘  │
                          │          │ API calls        │           │
                          │          └──────────────────┤           │
                          │                             │           │
                          │   ┌─────────────┐   ┌──────▼────────┐  │
                          │   │    redis    │   │      db       │  │
                          │   │  (Redis 7)  │◄──│ (PostgreSQL   │  │
                          │   │  Port 6379  │   │     16)       │  │
                          │   └──────┬──────┘   │  Port 5432    │  │
                          │          │           └───────────────┘  │
                          │   ┌──────▼──────┐                       │
                          │   │   worker    │                       │
                          │   │  (Celery)   │                       │
                          │   └──────┬──────┘                       │
                          │          │ docker.sock                  │
                          │          ▼                              │
                          │   ┌─────────────┐                       │
                          │   │  ZAP (OCI)  │  spawned per scan    │
                          │   │  sibling    │──────────────────►   │
                          │   │  container  │   backend/artifacts/ │
                          │   └─────────────┘                       │
                          └─────────────────────────────────────────┘
```

### Service summary

| Service    | Image / Build        | Host Port | Purpose                                       |
|------------|----------------------|-----------|-----------------------------------------------|
| `db`       | `postgres:16-alpine` | 5432      | Persistent storage for all application data   |
| `redis`    | `redis:7-alpine`     | 6379      | Celery message broker and result backend      |
| `backend`  | `./backend`          | 8000      | FastAPI async REST API, hot-reload enabled    |
| `worker`   | `./backend`          | —         | Celery worker, spawns ZAP sibling containers  |
| `frontend` | `./frontend`         | 3000      | Nginx serving the built React SPA             |

---

## Features

- **OWASP ZAP integration** — Automated DAST using the official ZAP stable container image
- **Two scan profiles** — Passive-only quick scan (~1-3 min) and active full scan (~20-60 min)
- **Risk scoring** — Each finding scored 0-10 based on severity × confidence weighting
- **Deduplication** — SHA-256 fingerprinting on title + method + URL + parameter prevents duplicate findings across scans
- **HTML reports** — Download a formatted HTML security report for any completed scan
- **Multi-user** — User accounts with JWT authentication and per-user data isolation
- **API key management** — Create and revoke API keys for programmatic access and CI/CD
- **Dashboard** — React web UI with scan history, finding trends, and risk statistics
- **Async pipeline** — FastAPI + Celery + Redis keeps the API responsive while scans run in the background
- **CI/CD ready** — GitHub Actions workflow included for automated scanning on push/PR
- **Self-hosted** — All data stays on your infrastructure; no third-party services required

---

## Security Methodology

### What is DAST and how does it differ from SAST and SCA?

Application security testing falls into three complementary categories, each catching a different class of defect at a different stage of the development lifecycle:

| Approach | Full Name | When It Runs | What It Analyzes | Strengths | Blind Spots |
|----------|-----------|-------------|------------------|-----------|-------------|
| **SAST** | Static Application Security Testing | At build time, against source code | Source code, bytecode, or binaries | Finds issues early; no running application needed; can trace data flow through code paths | High false-positive rate; cannot detect runtime configuration issues or server-level misconfigurations |
| **SCA** | Software Composition Analysis | At build time, against dependency manifests | Third-party libraries and their known CVEs | Catches vulnerable dependencies before deployment; integrates with package managers | Only finds *known* vulnerabilities in *declared* dependencies; cannot detect logic flaws or misconfigurations |
| **DAST** | Dynamic Application Security Testing | At runtime, against a live application | HTTP requests and responses from the outside in | Finds real, exploitable issues as an attacker would see them; zero false positives on confirmed findings; language- and framework-agnostic | Slower than static analysis; requires a running target; coverage depends on crawl depth and authentication configuration |

AegisScan is a **DAST** platform. It treats the target application as a black box, probing it over HTTP the same way an external attacker would. This means the findings it produces reflect actual exploitable behavior, not theoretical code paths.

### Why automated DAST scanning matters in CI/CD pipelines

Manual penetration tests happen once or twice a year. Between those engagements, teams ship dozens or hundreds of releases, each potentially introducing new endpoints, parameters, or configuration changes. Automated DAST scanning closes that gap by running on every deployment or on a recurring schedule, providing continuous assurance that:

- **New endpoints are tested as soon as they exist** — A CI/CD-triggered scan catches missing security headers, exposed debug endpoints, or injection points within minutes of deployment to staging.
- **Regressions are caught immediately** — A vulnerability that was fixed in sprint 12 and accidentally reintroduced in sprint 15 is flagged before it reaches production.
- **Security gates enforce minimum standards** — Pipelines can fail the build if a scan returns any High-severity findings, preventing insecure code from being promoted.
- **Evidence is generated automatically** — Compliance frameworks (SOC 2, PCI DSS, ISO 27001) require documented proof of regular security testing. Automated scan reports satisfy this requirement without manual effort.
- **Developer feedback loops stay short** — When a developer gets a finding within minutes of pushing code, they still have full context on what they changed and why, making remediation faster and cheaper than findings discovered weeks later.

### What types of vulnerabilities does ZAP find?

OWASP ZAP, the scanning engine behind AegisScan, tests for a broad range of web application vulnerabilities across both its passive and active scan modes:

**Passive scan findings** (observed without sending attack traffic):
- Missing or misconfigured security headers (Content-Security-Policy, X-Frame-Options, Strict-Transport-Security, Permissions-Policy, CORP/COEP/COOP)
- Insecure cookie attributes (missing `Secure`, `HttpOnly`, or `SameSite` flags)
- Information leakage in HTTP responses (server version banners, stack traces, internal IP addresses)
- Mixed content and insecure resource loading
- Missing Subresource Integrity (SRI) on third-party scripts
- Sensitive data transmitted in URL query parameters

**Active scan findings** (discovered by sending crafted payloads):
- **SQL Injection (SQLi)** — Payloads injected into parameters to detect database query manipulation, including error-based, blind boolean, and time-based variants
- **Cross-Site Scripting (XSS)** — Reflected and stored XSS via script injection in input fields, URL parameters, and HTTP headers
- **Cross-Site Request Forgery (CSRF)** — Missing or ineffective anti-CSRF tokens on state-changing forms
- **Server-Side Request Forgery (SSRF)** — Attempts to make the server issue requests to internal resources
- **Path Traversal / Local File Inclusion** — Directory traversal payloads to access files outside the web root
- **Remote Code Execution (RCE)** — OS command injection and expression language injection
- **XML External Entity (XXE)** — Malicious XML payloads targeting parsers that process external entities
- **Security Misconfiguration** — Default credentials, unnecessary HTTP methods enabled, directory listings, verbose error pages
- **Broken Authentication indicators** — Weak session identifiers, session fixation, and credential exposure

The `quick` profile runs only passive checks and completes in 1-3 minutes. The `full` profile runs both passive and active checks, providing comprehensive coverage at the cost of longer scan times (20-60 minutes) and active attack traffic sent to the target.

---

## Prerequisites

| Requirement           | Version  | Notes                                                           |
|-----------------------|----------|-----------------------------------------------------------------|
| Docker Desktop        | 4.x+     | Must be running before any commands                            |
| Docker Compose        | v2+      | Included with Docker Desktop                                    |
| Available disk space  | ~5 GB    | For images, PostgreSQL data, and ZAP scan artifacts            |
| Available RAM         | 4 GB+    | ZAP is allocated up to 4 GB per scan container                 |

No local Python or Node.js installation is required — all dependencies run inside Docker containers.

> **Windows requirement**: Docker Desktop must be configured to use the WSL 2 backend (the default for new installations). Hyper-V backend is also supported but may require additional path handling.

---

## First-Time Setup

Follow these steps exactly in order. Each step must complete successfully before proceeding to the next.

### Step 1 — Clone or download the project

```
C:\Users\YourName\Downloads\AegisScan\
```

Ensure the project is at a path **without spaces**. Paths with spaces can cause volume mount failures on Windows Docker Desktop.

### Step 2 — Configure the host artifacts path

Open `docker-compose.yml` in a text editor. Find the `worker` service and update the `HOST_ARTIFACTS_PATH` environment variable to match your actual path:

```yaml
worker:
  environment:
    - HOST_ARTIFACTS_PATH=C:/Users/YourName/Downloads/AegisScan/backend/artifacts
```

Use **forward slashes**, not backslashes. This is the single most important configuration step — if this path is wrong, ZAP will complete but no findings will be saved.

### Step 3 — (Optional) Change the secret key

The default `SECRET_KEY` in `docker-compose.yml` is `changethisdevsecret`. For any non-development use, change it in both the `backend` and `worker` service environment sections:

```yaml
- SECRET_KEY=your-random-secret-here-at-least-32-chars
```

### Step 4 — Build and start all services

Open a terminal (PowerShell or Command Prompt) in the project directory and run:

```bash
docker-compose up -d --build
```

This pulls all images and builds the backend and frontend containers. On a first run over a typical internet connection, this takes 3-8 minutes.

Wait for all containers to show as running:

```bash
docker-compose ps
```

Expected output (all services should show `running` or `Up`):

```
NAME                    STATUS
aegisscan-backend-1     running
aegisscan-db-1          running
aegisscan-frontend-1    running
aegisscan-redis-1       running
aegisscan-worker-1      running
```

### Step 5 — Create the database tables

This step initializes the schema. It drops any existing tables and recreates them, so only run it once (or when you intentionally want to reset the database):

```bash
docker-compose exec backend python create_tables.py
```

Expected output:

```
Tables recreated successfully.
```

### Step 6 — Create your user account

Navigate to `http://localhost:3000/signup` in your browser and create an account, or use the API directly:

```bash
# curl (Linux/macOS/Git Bash)
curl -X POST http://localhost:8000/api/v1/users/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "YourPassword123"}'
```

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/users/signup" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email": "you@example.com", "password": "YourPassword123"}'
```

### Step 7 — Access the dashboard

Open `http://localhost:3000` in your browser and log in with the account you just created.

The FastAPI interactive docs are available at `http://localhost:8000/docs` and are useful for exploring the API manually.

---

## Everyday Usage

### Starting the platform

```bash
cd C:\Users\YourName\Downloads\AegisScan
docker-compose up -d
```

### Stopping the platform

```bash
docker-compose down
```

Data persists in the `postgres_data` Docker volume between restarts. To stop and **delete all data**:

```bash
docker-compose down -v
```

### Viewing logs

```bash
# All services
docker-compose logs -f

# A specific service
docker-compose logs -f worker
docker-compose logs -f backend
```

### Checking service health

```bash
curl http://localhost:8000/api/v1/health/
```

---

## Running Scans

### Authenticate and get a token

All scan endpoints require a Bearer token. Obtain one by logging in:

```bash
# curl / Git Bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/access-token \
  -F "username=you@example.com" \
  -F "password=YourPassword123" \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

```powershell
# PowerShell
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/access-token" `
  -Method POST `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "username=you@example.com&password=YourPassword123"
$TOKEN = $response.access_token
```

### Step 1 — Create a target

```bash
# curl
curl -X POST http://localhost:8000/api/v1/targets/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My App", "base_url": "https://example.com"}'
```

```powershell
# PowerShell
$target = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/targets/" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body '{"name": "My App", "base_url": "https://example.com"}'
$TARGET_ID = $target.id
```

Save the `id` field from the response — you need it for the next step.

### Step 2 — Start a scan

**Quick scan** (passive only, ~1-3 minutes):

```bash
# curl
curl -X POST http://localhost:8000/api/v1/scans/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"target_id\": \"$TARGET_ID\", \"profile\": \"quick\"}"
```

```powershell
# PowerShell
$scan = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/scans/" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body "{`"target_id`": `"$TARGET_ID`", `"profile`": `"quick`"}"
$SCAN_ID = $scan.id
```

**Full scan** (active + passive, ~20-60 minutes):

```bash
curl -X POST http://localhost:8000/api/v1/scans/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"target_id\": \"$TARGET_ID\", \"profile\": \"full\"}"
```

### Step 3 — Poll for scan status

```bash
curl http://localhost:8000/api/v1/scans/$SCAN_ID \
  -H "Authorization: Bearer $TOKEN"
```

The `status` field progresses through: `queued` → `running` → `completed` (or `failed`).

### Step 4 — Retrieve findings

```bash
curl "http://localhost:8000/api/v1/findings/?scan_id=$SCAN_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Step 5 — Download the HTML report

```bash
curl "http://localhost:8000/api/v1/scans/$SCAN_ID/report" \
  -H "Authorization: Bearer $TOKEN" \
  -o scan-report.html
```

Open `scan-report.html` in any browser for a formatted report.

---

## Understanding Results

### Scan profiles

| Profile | ZAP Script          | Duration     | Coverage                                              |
|---------|---------------------|--------------|-------------------------------------------------------|
| `quick` | `zap-baseline.py`   | ~1-3 minutes | Passive only. Security headers, cookies, info leakage |
| `full`  | `zap-full-scan.py`  | ~20-60 min   | Active attacks: SQLi, XSS, SSRF, full OWASP Top 10   |

The `quick` profile does **not** send attack traffic to the target. It only observes responses. The `full` profile actively fuzzes inputs and may trigger WAF rules or generate entries in server access logs.

### Severity levels

| Severity      | Risk Score Range | Description                                                              |
|---------------|------------------|--------------------------------------------------------------------------|
| High          | 5.0 – 10.0       | Exploitable vulnerability with significant potential impact              |
| Medium        | 2.0 – 5.0        | Issue that reduces security posture but requires specific conditions      |
| Low           | 0.5 – 2.0        | Best practice violation or hardening opportunity                         |
| Informational | 0.0 – 0.5        | Observed behavior that may be of interest but poses no direct risk       |

### Risk scoring formula

```
risk_score = severity_weight × confidence_weight

Severity weights:  High=10.0, Medium=5.0, Low=2.0, Informational=0.5
Confidence weights: High=1.0, Medium=0.8, Low=0.5

Examples:
  High severity + High confidence   = 10.0 × 1.0 = 10.0  (maximum)
  Medium severity + Medium confidence = 5.0 × 0.8 = 4.0
  Low severity + Low confidence     = 2.0 × 0.5 = 1.0
```

### Finding deduplication

Each finding is fingerprinted using SHA-256 over the tuple `(title, method, url, parameter)`. This means running the same scan twice will not create duplicate finding records — the fingerprint is stored on the `Finding` record and can be used to track whether the same issue persists across multiple scan runs.

### Sample results (compass-remodeling.com, quick scan)

This is a verified real-world result from the quick scan profile:

| Severity      | Count | Examples                                                              |
|---------------|-------|-----------------------------------------------------------------------|
| Medium        | 3     | CSP not set, Anti-clickjacking header missing, SRI missing            |
| Low           | 7     | COEP/COOP/CORP headers missing, Permissions-Policy, HSTS, X-Content-Type-Options |
| Informational | 4     | Cache-control header, sensitive info in URL, modern web app detection |
| **Total**     | **14**|                                                                       |

### Detailed sample findings

The table below shows individual findings from the scan above with their full classification, including risk scores, OWASP Top 10 mapping, and CWE references:

| Finding | Severity | Confidence | Risk Score | OWASP Category | CWE |
|---------|----------|------------|------------|----------------|-----|
| Content Security Policy (CSP) Header Not Set | Medium | High | 5.0 | A05:2021 Security Misconfiguration | CWE-693: Protection Mechanism Failure |
| Missing Anti-clickjacking Header | Medium | Medium | 4.0 | A05:2021 Security Misconfiguration | CWE-1021: Improper Restriction of Rendered UI Layers |
| Sub Resource Integrity Attribute Missing | Medium | High | 5.0 | A08:2021 Software and Data Integrity Failures | CWE-345: Insufficient Verification of Data Authenticity |
| Cross-Origin Embedder Policy (COEP) Header Missing | Low | Medium | 1.6 | A05:2021 Security Misconfiguration | CWE-693: Protection Mechanism Failure |
| Cross-Origin Opener Policy (COOP) Header Missing | Low | Medium | 1.6 | A05:2021 Security Misconfiguration | CWE-693: Protection Mechanism Failure |
| Cross-Origin Resource Policy (CORP) Header Missing | Low | Medium | 1.6 | A05:2021 Security Misconfiguration | CWE-693: Protection Mechanism Failure |
| Permissions-Policy Header Not Set | Low | Medium | 1.6 | A05:2021 Security Misconfiguration | CWE-693: Protection Mechanism Failure |
| Strict-Transport-Security Header Not Set | Low | High | 2.0 | A05:2021 Security Misconfiguration | CWE-319: Cleartext Transmission of Sensitive Information |
| X-Content-Type-Options Header Missing | Low | Medium | 1.6 | A05:2021 Security Misconfiguration | CWE-693: Protection Mechanism Failure |
| Server Leaks Information via "X-Powered-By" Header | Low | Medium | 1.6 | A05:2021 Security Misconfiguration | CWE-200: Exposure of Sensitive Information |
| Cache-control Header Not Set | Informational | Medium | 0.4 | A05:2021 Security Misconfiguration | CWE-525: Use of Web Browser Cache Containing Sensitive Information |
| Information Disclosure - Sensitive Information in URL | Informational | Medium | 0.4 | A02:2021 Cryptographic Failures | CWE-200: Exposure of Sensitive Information |
| Modern Web Application Detected | Informational | Medium | 0.4 | — | — |
| Non-Storable Content | Informational | Medium | 0.4 | — | CWE-524: Use of Cache That Contains Sensitive Information |

> **Note**: Risk scores are computed using the formula `severity_weight x confidence_weight` described above. Informational findings with no direct security impact are not mapped to an OWASP category.

---

## OWASP Top 10 Mapping

AegisScan findings map directly to the [OWASP Top 10 (2021)](https://owasp.org/Top10/) categories. This mapping helps teams prioritize remediation by industry-standard risk classification and satisfies compliance requirements that reference the OWASP Top 10.

| AegisScan Finding Category | OWASP Top 10 Category | OWASP ID | Common CWEs | Example Findings |
|---|---|---|---|---|
| SQL Injection | Injection | A03:2021 | CWE-89, CWE-564 | SQL injection via URL parameters, blind SQL injection in form fields |
| Cross-Site Scripting (XSS) | Injection | A03:2021 | CWE-79, CWE-80 | Reflected XSS in search parameters, stored XSS in user input fields |
| Command Injection | Injection | A03:2021 | CWE-78, CWE-77 | OS command injection via unsanitized input, expression language injection |
| XML External Entity (XXE) | Injection | A03:2021 | CWE-611 | External entity processing in XML parsers |
| Cross-Site Request Forgery (CSRF) | Broken Access Control | A01:2021 | CWE-352 | Missing anti-CSRF tokens on state-changing forms, predictable token values |
| Path Traversal / LFI | Broken Access Control | A01:2021 | CWE-22, CWE-98 | Directory traversal to access `/etc/passwd`, local file inclusion |
| Server-Side Request Forgery (SSRF) | Server-Side Request Forgery | A10:2021 | CWE-918 | Internal network scanning via URL parameters, cloud metadata endpoint access |
| Sensitive Data in URL | Cryptographic Failures | A02:2021 | CWE-200, CWE-319 | Session tokens in query strings, credentials in URL parameters |
| Missing HSTS Header | Cryptographic Failures | A02:2021 | CWE-319 | Strict-Transport-Security not set, allowing protocol downgrade attacks |
| Weak Session Management | Identification and Authentication Failures | A07:2021 | CWE-384, CWE-613 | Session fixation, insufficient session expiration, weak session IDs |
| Missing Security Headers | Security Misconfiguration | A05:2021 | CWE-693, CWE-1021 | CSP not set, X-Frame-Options missing, Permissions-Policy absent |
| Directory Listing Enabled | Security Misconfiguration | A05:2021 | CWE-548 | Web server directory indexing exposes file structure |
| Server Version Disclosure | Security Misconfiguration | A05:2021 | CWE-200 | X-Powered-By header, Server header exposing version info |
| Vulnerable JavaScript Libraries | Vulnerable and Outdated Components | A06:2021 | CWE-1104 | Outdated jQuery, known-vulnerable frontend dependencies |
| Sub Resource Integrity Missing | Software and Data Integrity Failures | A08:2021 | CWE-345 | Third-party scripts loaded without SRI hash verification |
| Insufficient Logging Indicators | Security Logging and Monitoring Failures | A09:2021 | CWE-778 | Missing error handling, absent security event logging |

> **Coverage note**: The `quick` scan profile primarily surfaces findings in A02, A05, and A06. The `full` scan profile extends coverage across all ten categories, including active testing for A01, A03, A07, and A10.

---

## Configuration Reference

All configuration is passed as environment variables in `docker-compose.yml`. No `.env` file is required for the default setup.

### Backend / Worker environment variables

| Variable                  | Default                                                    | Required to Change | Description                                                               |
|---------------------------|------------------------------------------------------------|--------------------|---------------------------------------------------------------------------|
| `DATABASE_URL`            | `postgresql+asyncpg://postgres:postgres@db:5432/autoappsec`| No                 | PostgreSQL connection string                                              |
| `REDIS_URL`               | `redis://redis:6379/0`                                     | No                 | Redis connection string                                                   |
| `CELERY_BROKER_URL`       | `redis://redis:6379/0`                                     | No                 | Celery message broker                                                     |
| `CELERY_RESULT_BACKEND`   | `redis://redis:6379/0`                                     | No                 | Celery result storage                                                     |
| `SECRET_KEY`              | `changethisdevsecret`                                      | **Yes (prod)**     | JWT signing key — must be secret and random in production                 |
| `BACKEND_CORS_ORIGINS`    | `["http://localhost:3000"]`                                | If changing port   | JSON array of allowed CORS origins                                        |
| `HOST_ARTIFACTS_PATH`     | *(none — defaults to container path)*                      | **Yes (Windows)**  | Windows host path to `backend/artifacts/` for ZAP volume mount           |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30`                                                   | No                 | JWT access token lifetime                                                 |

### Frontend environment variables

| Variable        | Default                    | Description                          |
|-----------------|----------------------------|--------------------------------------|
| `VITE_API_URL`  | `http://localhost:8000`    | Backend API URL used by the React app|

### PostgreSQL environment variables (db service)

| Variable             | Default       | Description              |
|----------------------|---------------|--------------------------|
| `POSTGRES_USER`      | `postgres`    | Database superuser name  |
| `POSTGRES_PASSWORD`  | `postgres`    | Database superuser password |
| `POSTGRES_DB`        | `autoappsec`  | Database name            |

> **Security note**: The default PostgreSQL credentials and `SECRET_KEY` are intentionally simple for local development. Before exposing this platform on a network, change all three to strong, unique values.

---

## API Reference

Base URL: `http://localhost:8000/api/v1`

Interactive documentation: `http://localhost:8000/docs` (Swagger UI)

### Authentication

| Method | Path                   | Auth Required | Body / Params                          | Description                  |
|--------|------------------------|---------------|----------------------------------------|------------------------------|
| POST   | `/auth/access-token`   | No            | Form: `username`, `password`           | Login, returns JWT           |
| POST   | `/auth/refresh`        | Yes (JWT)     | —                                      | Refresh access token         |

### Users

| Method | Path              | Auth Required | Body / Params                          | Description                  |
|--------|-------------------|---------------|----------------------------------------|------------------------------|
| POST   | `/users/signup`   | No            | JSON: `email`, `password`              | Register a new account       |
| GET    | `/users/me`       | Yes (JWT)     | —                                      | Get current user profile     |

### Targets

| Method | Path               | Auth Required | Body / Params                          | Description                  |
|--------|--------------------|---------------|----------------------------------------|------------------------------|
| POST   | `/targets/`        | Yes (JWT)     | JSON: `name`, `base_url`               | Create a scan target         |
| GET    | `/targets/`        | Yes (JWT)     | —                                      | List all targets             |
| DELETE | `/targets/{id}`    | Yes (JWT)     | —                                      | Delete a target              |

### Scans

| Method | Path                    | Auth Required | Body / Params                          | Description                  |
|--------|-------------------------|---------------|----------------------------------------|------------------------------|
| POST   | `/scans/`               | Yes (JWT)     | JSON: `target_id`, `profile`           | Start a new scan             |
| GET    | `/scans/`               | Yes (JWT)     | —                                      | List all scans               |
| GET    | `/scans/{id}`           | Yes (JWT)     | —                                      | Get scan status and details  |
| GET    | `/scans/{id}/report`    | Yes (JWT)     | —                                      | Download HTML report         |

### Findings

| Method | Path                       | Auth Required | Body / Params                          | Description                  |
|--------|----------------------------|---------------|----------------------------------------|------------------------------|
| GET    | `/findings/`               | Yes (JWT)     | Query: `scan_id` (UUID)                | Get all findings for a scan  |

### Statistics

| Method | Path              | Auth Required | Description                                          |
|--------|-------------------|---------------|------------------------------------------------------|
| GET    | `/stats/stats`    | Yes (JWT)     | Dashboard stats: total scans, targets, recent trend  |

### API Keys

| Method | Path          | Auth Required | Body / Params  | Description          |
|--------|---------------|---------------|----------------|----------------------|
| POST   | `/keys/`      | Yes (JWT)     | —              | Create an API key    |
| GET    | `/keys/`      | Yes (JWT)     | —              | List API keys        |
| DELETE | `/keys/{id}`  | Yes (JWT)     | —              | Revoke an API key    |

### Health

| Method | Path        | Auth Required | Description     |
|--------|-------------|---------------|-----------------|
| GET    | `/health/`  | No            | Service health check |

---

## CI/CD Integration

AegisScan includes a GitHub Actions workflow at `.github/workflows/security-scan.yml` for automated scanning.

The workflow can be triggered:
- Manually via `workflow_dispatch` with a target URL, API URL, API key, and profile
- On a schedule (daily at midnight by default)
- On push or pull request to `main`

### Required GitHub secrets / inputs

| Input / Secret  | Description                                      |
|-----------------|--------------------------------------------------|
| `target_url`    | The URL to scan (e.g., `https://staging.example.com`) |
| `api_url`       | Your AegisScan instance URL (e.g., `http://your-server:8000`) |
| `api_key`       | API key created in AegisScan under Profile → API Keys |
| `profile`       | `quick` or `full` (default: `quick`)             |

To use this in practice, your AegisScan instance must be reachable from GitHub Actions runners. This typically means either:
- Deploying AegisScan on a cloud VM with a public IP
- Using a tunneling tool (e.g., ngrok, Tailscale) to expose your local instance temporarily

---

## Troubleshooting

### ZAP scan completes but no findings appear in the database

**Cause**: `HOST_ARTIFACTS_PATH` in `docker-compose.yml` is incorrect. The ZAP container writes reports to `/zap/wrk/`, which is mounted from the host path. If the path is wrong, Docker creates an anonymous volume and the worker cannot read the reports.

**Fix**: In `docker-compose.yml`, set `HOST_ARTIFACTS_PATH` to the exact Windows path of the `backend/artifacts/` folder using forward slashes:

```yaml
- HOST_ARTIFACTS_PATH=C:/Users/YourName/Downloads/AegisScan/backend/artifacts
```

Restart the worker after changing:

```bash
docker-compose restart worker
```

---

### Frontend cannot reach the backend (CORS error in browser console)

**Cause**: `BACKEND_CORS_ORIGINS` does not include the origin from which the browser is loading the frontend.

**Fix**: Ensure the backend service in `docker-compose.yml` has:

```yaml
- BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

If you are accessing the frontend from a different host or port, add that origin to the JSON array.

---

### `docker-compose exec backend python create_tables.py` fails with a connection error

**Cause**: The `db` service has not yet passed its health check, or the backend container has not finished starting.

**Fix**: Wait 30-60 seconds after running `docker-compose up -d --build` and check that all services are healthy:

```bash
docker-compose ps
```

All services should show `running`. If `db` shows `starting`, wait longer. You can monitor the database startup with:

```bash
docker-compose logs -f db
```

---

### `docker-compose up --build` fails during frontend npm install

**Cause**: Windows generates a `package-lock.json` with paths and binary hashes specific to Windows/x64. When the Linux Alpine build container (which uses musl libc) tries to use this lockfile, native binary packages fail to install.

**Fix**: This is handled automatically — the frontend Dockerfile explicitly removes `package-lock.json` before running `npm install`:

```dockerfile
COPY package*.json ./
RUN rm -f package-lock.json && npm install
```

If you are still seeing this error, ensure you are using the Dockerfile in the repository and not an older cached layer. Run:

```bash
docker-compose build --no-cache frontend
```

---

### Worker container cannot access the Docker socket

**Cause**: On some Docker Desktop configurations, the socket is not available at `/var/run/docker.sock`.

**Fix**: Verify the socket path in the worker service volume definition in `docker-compose.yml`:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

On Windows with Docker Desktop + WSL 2, this path is correct. If using an alternative Docker runtime, adjust accordingly.

---

### Scan status stays `queued` and never moves to `running`

**Cause**: The Celery worker is not running or is not connected to Redis.

**Fix**: Check the worker logs:

```bash
docker-compose logs worker
```

Look for the line `celery@... ready.` which confirms the worker started successfully and connected to Redis. If you see connection refused errors, check the Redis service:

```bash
docker-compose logs redis
```

Restart both if needed:

```bash
docker-compose restart redis worker
```

---

### Scan fails immediately with `ZAP exited with code` error

**Cause**: The ZAP container image could not be pulled, or the target URL is unreachable from the Docker host network.

**Fix**:
1. Ensure Docker has internet access and can pull `ghcr.io/zaproxy/zaproxy:stable`
2. Pre-pull the image to verify access: `docker pull ghcr.io/zaproxy/zaproxy:stable`
3. Verify the target URL is reachable from your machine (not just from inside a corporate VPN that Docker cannot access)
4. Check the full ZAP container output in the worker logs: `docker-compose logs worker`

---

### JWT token expires during a long scan (full profile)

The default token lifetime is 30 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES=30`). A full scan can take up to 60 minutes, but the token is only needed at the moment the API requests are made — the scan itself runs in the background via Celery. Re-authenticate when your token expires to poll for results.

---

## Windows-Specific Notes

### HOST_ARTIFACTS_PATH — forward slashes required

Docker Desktop on Windows translates volume mount paths. The `HOST_ARTIFACTS_PATH` environment variable is passed directly to the Docker daemon as a volume source. It must use Windows-style absolute paths but with **forward slashes**, not backslashes:

```
# Correct
C:/Users/YourName/Downloads/AegisScan/backend/artifacts

# Incorrect — will silently fail
C:\Users\YourName\Downloads\AegisScan\backend\artifacts
```

### No host networking mode

`network_mode: host` is not supported on Docker Desktop for Windows. AegisScan does not use it — all inter-service communication goes through the default Docker Compose bridge network using service names (e.g., `redis://redis:6379`). Do not add `network_mode: host` to any service.

### Docker Desktop resource limits

ZAP is configured to use up to 4 GB RAM and 2 CPUs per scan container. Ensure Docker Desktop is allocated at least 6 GB RAM total (to leave headroom for the other services) via Docker Desktop Settings → Resources.

### Package-lock.json incompatibility

The `package-lock.json` generated on Windows encodes Windows-specific binary download URLs for native Node.js packages. These URLs point to `.exe` or `win32-x64` binaries that cannot be installed inside a Linux Alpine container. The frontend Dockerfile discards this file and performs a clean install every build. This is intentional and expected.

### Path length on Windows

Windows has a 260-character path limit by default. Deeply nested project paths can cause build failures. Keep the project at a short root path such as `C:\AegisScan\` or `C:\Users\YourName\AegisScan\` rather than nested inside multiple subdirectories.

### Resetting the database

If you need to reset all data and start fresh (e.g., after a schema change):

```bash
docker-compose down -v
docker-compose up -d
# wait ~60 seconds
docker-compose exec backend python create_tables.py
```

The `-v` flag removes the `postgres_data` named volume, which holds all database state. All scans, targets, users, and findings will be permanently deleted.

---

## Default Test Credentials

The following credentials are used for development and testing only. **Remove or change before any production use.**

| Field    | Value          |
|----------|----------------|
| Email    | `test@test.com` |
| Password | `TestPass123`   |

---

*AegisScan is an open-source project. Contributions, bug reports, and feature requests are welcome.*
