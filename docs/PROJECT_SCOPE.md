# Hawkseye — Project Scope

**Version**: 1.0  
**Date**: 2026-02-16  
**Classification**: Internal — Development Reference

---

## 1. Executive Summary

Hawkseye is a **telemetry ingestion, storage, and visualization platform** for low-bandwidth, off-grid devices that transmit intermittent satellite data (GPS fixes + environmental sensors). Incoming packets are decoded, stored as time-series data, grouped by organization and mission, exposed via REST APIs, and visualized on maps and charts in a military-grade "Command Intelligence Watch Floor."

### Core Pipeline

```
Device (field)
  ↓  Iridium SBD packet (≤340 bytes)
Satellite Network
  ↓  HTTP POST / email
Ingestion Endpoint
  ↓  decode, validate, dedup
RawPacket + Telemetry (DB)
  ↓  signal handler derives AssetState
AssetState (freshness, confidence, position, battery, movement)
  ↓  REST API  +  WebSocket push
Frontend (maps, charts, tables)
```

---

## 2. Project Vision

> **Give operators instant, honest visibility of every asset — making silence, age, and uncertainty as visible as the data itself.**

### Design Principles

| Principle | Meaning |
|-----------|---------|
| **Honest data** | Never fabricate readings. If data is old, show it as old. If missing, show absence. |
| **Silence is signal** | "No contact for 6 hours" is critical information, not an empty state. |
| **Confidence over certainty** | Every reading carries a confidence score. Stale data wins over no data. |
| **Separation of concerns** | Ingestion ≠ visualization. Device auth ≠ operator auth. Billing ≠ tactical. |
| **Read-only dashboards** | Operators view telemetry; they cannot mutate it. |

---

## 3. Functional Requirements

### 3.1 Telemetry Ingestion
- Receive Iridium SBD payloads via HTTP POST (`RawPacket`)
- Decode binary payloads → structured `Telemetry` records (lat, lon, alt, speed, heading, temp, battery, activity)
- Reject unknown devices (IMEI whitelist via `AssetComms`)
- Reject replayed / stale packets (timestamp + CDR dedup)
- Store raw bytes for audit + reprocessing

### 3.2 Asset State Derivation
- On each new telemetry record, signal handler updates `AssetState`:
  - **Freshness**: live (<5 min), recent (<1 hr), stale (<24 hr), silent (>24 hr)
  - **Confidence**: 0.0–1.0 based on GPS accuracy + data age
  - **Position**: last known lat/lon/alt with timestamp
  - **Battery**: last voltage reading
  - **Movement**: moving / stationary flag from speed + activity

### 3.3 Multi-Tenant Organization
- `CommandCenter` → `Mission` → `TacticalAsset` hierarchy
- Operator→CommandCenter assignment via `OperatorCommand`
- Data isolation: operators see only assets within their assigned command center(s)

### 3.4 Visualization
- **Tactical Map**: Leaflet/Mapbox with markers color-coded by freshness
  - Solid markers = fresh data
  - Faded/dimmed markers = stale data
  - Warning panel / red markers = no contact (silent)
- **Asset Table**: sortable, filterable by command center, mission, freshness
- **Dashboard Metrics**: total assets, active count, silent count, battery warnings
- **Telemetry History**: time-series charts for individual assets

### 3.5 Security (RBAC)
- 5-tier role model: `OBSERVER` → `FIELD_OPERATOR` → `ANALYST` → `MISSION_COMMANDER` → `ADMIN`
- Read-only dashboards for Observer and Field Operator roles
- Audit logging on all API requests (`AuditLog` model + middleware)
- JWT + session authentication with token refresh

---

## 4. Current State Assessment

### ✅ Done

| Layer | Component | Status |
|-------|-----------|--------|
| **Backend — Models** | 19 Django models (`CommandCenter`, `Operator`, `Mission`, `MissionPlan`, `MissionRecord`, `DataUplink`, `MissionUplinkPermission`, `Products`, `SbdBundles`, `RawPacket`, `AssetComms`, `TacticalAsset`, `AssetUplink`, `Parameters`, `ParamUpdates`, `ParamSchema`, `Telemetry`, `AssetState`, `AuditLog`, `OperationalRole`) | ✅ |
| **Backend — API** | 8 v1 endpoints (assets, states, telemetry, missions, command centers, user roles, dashboard summary) | ✅ |
| **Backend — Signals** | Auto-derive `AssetState` from `Telemetry` on save | ✅ |
| **Backend — Audit** | `AuditLog` model + middleware logging all `/api/` requests | ✅ |
| **Backend — Seed Data** | `seed_operational_data` management command (3 CCs, missions, assets, telemetry) | ✅ |
| **Backend — Admin** | All models registered in custom admin site | ✅ |
| **Frontend — API Layer** | `api.js` with 5 service modules — no mock data | ✅ |
| **Frontend — Dashboard** | Real data from API, auto-refresh, error handling | ✅ |
| **Frontend — Devices Page** | Real data, filter by command center + mission | ✅ |
| **Frontend — UI Theme** | Dark/tactical aesthetic, Inter + Outfit fonts | ✅ |

### 🔴 Not Done

| Layer | Component | Gap |
|-------|-----------|-----|
| **Backend** | Telemetry ingestion endpoint (HTTP POST from Iridium) | Missing — no way to receive real device data |
| **Backend** | Binary payload decoder | Missing — raw SBD bytes → Telemetry struct |
| **Backend** | Device identity enforcement | Missing — no IMEI whitelist check on ingestion |
| **Backend** | Replay / stale packet rejection | Missing — timestamps not enforced |
| **Backend** | DRF permission classes per role | Missing — all endpoints open |
| **Backend** | WebSocket consumer (Channels + Daphne) | Skeleton only — not authenticated, not consumed by frontend |
| **Frontend** | Tactical map markers (Leaflet) | Component exists but not wired to real data |
| **Frontend** | Map marker freshness visualization (faded/solid/warning) | Not implemented |
| **Frontend** | Telemetry history charts | Page exists but uses dummy data |
| **Frontend** | WebSocket connection to live telemetry | Not connected |
| **Frontend** | RBAC route guards | Not implemented |
| **Frontend** | Device detail page real data | Uses placeholder data |
| **Infrastructure** | HTTPS / TLS termination | Not configured for production |
| **Infrastructure** | CORS allowlist | Default / permissive |
| **Infrastructure** | Rate limiting | Not configured |

---

## 5. Technology Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | Django 5.x |
| API | Django REST Framework |
| Real-time | Django Channels + Daphne (ASGI) |
| Database | SQLite (dev) — production target: PostgreSQL / MySQL |
| Cache / Queue | Redis |
| Auth | JWT (DRF SimpleJWT) + Django sessions |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 18 (Vite 6.x) |
| Routing | React Router DOM v6 |
| Maps | react-leaflet |
| Charts | Chart.js / recharts |
| HTTP | Native fetch (via `api.js` wrapper) |
| Styling | Tailwind CSS + custom dark theme |
| Typography | Inter (body) + Outfit (headings) |

### Infrastructure
| Component | Technology |
|-----------|------------|
| OS | Linux (Ubuntu) |
| Web server | Django dev server (production: Gunicorn + Nginx) |
| Static files | Vite build → WhiteNoise |
| Containerization | Docker-ready structure |

---

## 6. Data Model (ERD Summary)

```mermaid
erDiagram
    CommandCenter ||--o{ Mission : owns
    CommandCenter ||--o{ OperatorCommand : employs
    Operator ||--o{ OperatorCommand : assigned_to
    Mission ||--o{ TacticalAsset : tracks
    TacticalAsset ||--|| AssetComms : has_modem
    AssetComms ||--o{ RawPacket : receives
    TacticalAsset ||--o{ Telemetry : generates
    TacticalAsset ||--|| AssetState : derived_state
    Mission ||--o{ MissionPlan : billing
    Mission ||--o{ MissionRecord : invoices
    TacticalAsset ||--o{ AssetUplink : data_routes
    AssetUplink }o--|| DataUplink : destination
    Operator ||--o{ OperationalRole : has_role
    OperationalRole }o--|| CommandCenter : scoped_to

    CommandCenter {
        int id PK
        string name
        string email
        string country_code
    }
    TacticalAsset {
        int id PK
        string serial_num UK
        string callsign
        string description
        FK product_id
        FK billing_group_id
    }
    Telemetry {
        bigint id PK
        FK modem_id
        datetime device_time
        float lat
        float lon
        float speed
        float battery_voltage
    }
    AssetState {
        int id PK
        FK asset OneToOne
        string freshness
        float confidence
        float last_lat
        float last_lon
        float last_battery_voltage
        bool is_moving
        datetime last_seen
    }
```

---

## 7. Out of Scope (This Phase)

- Mobile application (iOS/Android)
- AI/ML predictive movement analytics
- Geofencing with automated alerts
- OTA firmware updates to devices
- Multi-region deployment / failover
- Offline-first field operator mode
- Video integration

---

## 8. Success Criteria

| Metric | Target |
|--------|--------|
| All frontend pages show real data | 100% — zero mock arrays |
| Map markers reflect freshness visually | Solid/faded/warning |
| Silence visible | "No contact" panel for silent assets |
| API response time (p95) | < 200ms |
| RBAC enforced on all endpoints | 100% coverage |
| Audit log captures all API access | 100% coverage |
| Frontend build | Zero errors |

---

*Last Updated: 2026-02-16*
