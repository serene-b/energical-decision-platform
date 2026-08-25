# Energical Decision Platform (EIDP)

> **Executive Business Intelligence & Operational Decision Support Platform for Energical Algeria.**

The **Energical Decision Platform** provides commercial analytics, geographic revenue mapping across the **58 Algerian Wilayas**, customer RFM segmentation, seasonal stockout forecasting, Google Analytics 4 tracking, and an automated CSV data ingestion pipeline.

---

## 🏗️ Architecture & Stack

```
                              ┌───────────────────────────────┐
                              │      Client Web Browser       │
                              └───────────────┬───────────────┘
                                              │ (Port 80 / 443)
                                              ▼
                              ┌───────────────────────────────┐
                              │      Nginx Reverse Proxy      │
                              │ - Serves React SPA (dist/)    │
                              │ - Proxies /api/* to FastAPI   │
                              └───────┬───────────────┬───────┘
                                      │               │
                     (Static Content) │               │ (/api/v1 requests)
                                      ▼               ▼
                 ┌─────────────────────────┐    ┌─────────────────────────┐
                 │   React 19 + Vite SPA   │    │   FastAPI Backend API   │
                 │ (Plotly · Recharts)     │    │  (Uvicorn · SQLAlchemy) │
                 └─────────────────────────┘    └────────────┬────────────┘
                                                             │
                                                             ▼
                                                ┌─────────────────────────┐
                                                │  PostgreSQL 16 Database │
                                                │ (SQLAlchemy ORM Models) │
                                                └─────────────────────────┘
```

* **Frontend**: React 19, Vite, Plotly.js, Recharts, Lucide Icons, Vanilla CSS (Light/Dark mode, EN/FR localization).
* **Backend**: FastAPI, Uvicorn, Pandas, SQLAlchemy ORM, Pydantic, ReportLab (PDF generation).
* **Database**: PostgreSQL 16 (production default with automatic SQLite fallback for local development).
* **AI Engine**: Groq Cloud LLM integration (`llama-3.3-70b-versatile`) with local rule-based fallback.
* **Orchestration**: Docker Compose (multi-stage builds for frontend, backend, and database).

---

## 📁 Repository Structure

```
├── docker-compose.yml              # Multi-container orchestration
├── README.md                       # Platform documentation
├── sample_data/                    # Standardized CSV datasets for testing
├── pipeline/
│   └── Notebooks/                  # Data science & exploratory notebooks
├── backend/
│   ├── Dockerfile                  # Python 3.11 slim container
│   ├── requirements.txt            # Python dependencies
│   ├── main.py                     # FastAPI application entrypoint
│   ├── core/                       # Database connection and app configuration
│   ├── models/                     # SQLAlchemy declarative models
│   ├── routers/                    # API endpoints (health, pipeline, analytics, ga4, assistant)
│   └── services/                   # Business logic, aggregations, and data pipeline
└── frontend/
    ├── Dockerfile                  # Multi-stage build (Node 20 -> Nginx Alpine)
    ├── nginx.conf                  # Nginx configuration for SPA routing & proxying
    ├── package.json                # NPM scripts and dependencies
    ├── vite.config.js              # Vite build configuration
    └── src/                        # React components, pages, hooks, and styles
```

---

## 🌟 Modules Overview

1. **Executive Overview**: High-level KPIs, revenue time-series, Plotly bubble map, top SKU turnover, and operational alerts.
2. **Sales Intelligence**: Daily/weekly/monthly trends, B2B vs. B2C distribution, payment methods, and delivery channels.
3. **Wilaya Intelligence**: 58-Wilaya interactive map, regional ranking table, and regional drilldown drawer.
4. **Client Intelligence**: RFM segmentation (*Champions*, *Loyal*, *At-Risk*, *Lost*) and client profile search.
5. **Products & Seasonal Forecast**: Catalogue revenue concentration, stockout risk matrix, and winter heating demand projections.
6. **Customer Behavior (GA4)**: Traffic acquisition channels, device breakdown, top visited pages, and live GA4 sync.
7. **Data Preparation Pipeline**: CSV upload and validation, DZD currency cleaning, customer ID normalization, database ingestion, and downloadable PDF audit reports.
8. **Contextual AI Assistant**: Privacy-bounded assistant that answers business questions based on the active screen's verified metrics.

---

## ⚙️ Environment Variables

Configure these in a `.env` file in the project root or within `backend/.env`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:postgrespassword@localhost:5432/energical_platform` | PostgreSQL connection URL |
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgrespassword` | PostgreSQL password |
| `POSTGRES_DB` | `energical_platform` | PostgreSQL database name |
| `CORS_ORIGINS` | `http://localhost,http://localhost:5173,http://127.0.0.1:5173` | Allowed CORS origins |
| `GROQ_API_KEY` | `""` | Groq API key for the AI assistant |
| `ASSISTANT_PROVIDER_URL` | `https://api.groq.com/openai/v1` | AI Provider base URL |
| `ASSISTANT_MODEL` | `openai/gpt-oss-120b` | AI model identifier |
| `GA4_PROPERTY_ID` | `""` | Google Analytics 4 property ID (optional) |

---

## 🚀 Running the Platform

### Option 1: Docker Compose (Production Setup)

```bash
docker compose up --build -d
```

* **Frontend Web App**: [http://localhost](http://localhost) (Port 80)
* **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **PostgreSQL Database**: `localhost:5432`

To stop services:
```bash
docker compose down
```

---

### Option 2: Local Development Setup

#### 1. Backend
```bash
cd backend
python -m venv .venv

# Activate virtual environment:
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app uvicorn main:app --reload --port 8000
--reload --port 8000
```
Swagger documentation: [http://localhost:8000/docs](http://localhost:8000/docs).

#### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

---

## 🧪 Testing & Code Quality

```bash
# Frontend ESLint check
npm --prefix frontend run lint

# Frontend UI interaction and contract tests
npm --prefix frontend run test:interactions

# Production build verification
npm --prefix frontend run build
```

---

## 📡 REST API Reference (`/api/v1`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health and database status |
| `GET` | `/api/v1/pipeline/state` | Current database record counts and latest dates |
| `POST` | `/api/v1/pipeline/runs` | Upload and process raw CSV files |
| `GET` | `/api/v1/pipeline/runs` | List recent pipeline runs |
| `GET` | `/api/v1/pipeline/runs/{id}/report` | Download PDF audit report |
| `GET` | `/api/v1/pipeline/runs/{id}/cleaned.zip` | Download cleaned dataset archive |
| `GET` | `/api/v1/analytics/overview` | Executive KPI aggregates and growth metrics |
| `GET` | `/api/v1/analytics/overview/revenue-trend` | Revenue time-series (daily, weekly, monthly) |
| `GET` | `/api/v1/analytics/sales` | Sales breakdown (B2B/B2C, channels, delivery) |
| `GET` | `/api/v1/analytics/clients` | Client RFM segments and priority accounts |
| `GET` | `/api/v1/analytics/customers` | Web behavior metrics and channel attribution |
| `GET` | `/api/v1/analytics/wilayas` | 58-Wilaya regional metrics and rankings |
| `GET` | `/api/v1/analytics/products` | SKU performance and stockout matrix |
| `GET` | `/api/v1/analytics/forecast` | Seasonal demand projections |
| `GET` | `/api/v1/analytics/decisions` | Operational alert matrix and recommendations |
| `GET` | `/api/v1/search?q={query}` | Search across clients, products, and wilayas |
| `GET` | `/api/v1/integrations/ga4` | GA4 integration credentials and status |
| `POST` | `/api/v1/integrations/ga4` | Save and validate GA4 Service Account JSON |
| `POST` | `/api/v1/assistant/context` | Bounded context for AI Assistant |
| `POST` | `/api/v1/assistant/query` | Execute AI Assistant query |
