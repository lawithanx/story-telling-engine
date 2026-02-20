# Hawkseye — System Architecture

**Version**: 1.0  
**Date**: 2026-02-16  
**Classification**: Internal — Technical Reference

---

## 1. High-Level Architecture

```mermaid
graph TB
    subgraph "Field Layer"
        D1["Collar / Tracker<br/>(Iridium Modem)"]
        D2["Bird Tracker<br/>(Solar + Iridium)"]
        D3["Marine Tag<br/>(Submersible)"]
    end

    subgraph "Satellite Layer"
        SAT["Iridium Satellite<br/>Constellation"]
        GW["Iridium Ground<br/>Station"]
    end

    subgraph "Ingestion Layer"
        ING["POST /api/v1/ingest/<br/>(Future)"]
        DEC["Binary Decoder"]
        VAL["Packet Validator<br/>(IMEI check, dedup,<br/>replay reject)"]
    end

    subgraph "Backend Layer"
        API["Django REST API<br/>Port 8000"]
        WS["Django Channels<br/>(WebSocket)"]
        SIG["Signal Handlers<br/>(AssetState derivation)"]
    end

    subgraph "Data Layer"
        DB["SQLite / PostgreSQL"]
        REDIS["Redis<br/>(Cache + WS broker)"]
    end

    subgraph "Frontend Layer"
        UI["React SPA<br/>(Vite, Port 5173)"]
        MAP["Leaflet Map"]
        TBL["Asset Tables"]
        CHT["Telemetry Charts"]
    end

    D1 & D2 & D3 -->|"SBD (≤340 bytes)"| SAT
    SAT --> GW
    GW -->|"HTTP POST / Email"| ING
    ING --> DEC --> VAL
    VAL -->|"RawPacket + Telemetry"| DB
    DB -->|"post_save signal"| SIG
    SIG -->|"update AssetState"| DB
    API --> DB
    API --> REDIS
    WS --> REDIS
    UI -->|"REST /api/v1/*"| API
    UI -->|"ws://telemetry"| WS
    UI --> MAP & TBL & CHT
```

---

## 2. Backend Architecture

### 2.1 Django App Structure

```
backend/webapp/
├── core/                          # Project settings
│   ├── settings.py                # Django config
│   ├── urls.py                    # Root URL conf
│   ├── asgi.py                    # ASGI entry (Channels)
│   ├── wsgi.py                    # WSGI entry (Gunicorn)
│   └── audit_middleware.py        # AuditLog middleware
├── apps/
│   └── operations/                # Main domain app
│       ├── models.py              # 19 domain models
│       ├── serializers.py         # DRF serializers (6)
│       ├── api_views.py           # V1 API views (8)
│       ├── views.py               # Legacy views + ViewSet
│       ├── urls.py                # URL routing
│       ├── admin.py               # Admin site registrations
│       ├── signals.py             # post_save → AssetState
│       ├── audit.py               # Audit logging helpers
│       └── management/commands/
│           └── seed_operational_data.py
├── templates/                     # Django templates
└── manage.py
```

### 2.2 Domain Models

```mermaid
graph LR
    subgraph "Organization"
        CC["CommandCenter<br/>(organisations)"]
        OP["Operator<br/>(users)"]
        OC["OperatorCommand<br/>(user_organisation)"]
        OR["OperationalRole"]
    end

    subgraph "Mission & Billing"
        M["Mission<br/>(billing_groups)"]
        MP["MissionPlan<br/>(billing_plans)"]
        MR["MissionRecord<br/>(billing_records)"]
        SB["SbdBundles"]
    end

    subgraph "Hardware"
        TA["TacticalAsset<br/>(hardware_info)"]
        AC["AssetComms<br/>(modem_data)"]
        PR["Products"]
        PS["ParamSchema"]
        PM["Parameters"]
        PU["ParamUpdates"]
    end

    subgraph "Telemetry"
        RP["RawPacket<br/>(sbd_payload)"]
        TM["Telemetry"]
        AS["AssetState"]
    end

    subgraph "Data Routing"
        DU["DataUplink<br/>(delivery_destination)"]
        AU["AssetUplink<br/>(hw_delivery_destinations)"]
        MUP["MissionUplinkPermission"]
    end

    subgraph "Audit"
        AL["AuditLog"]
    end

    CC --> M
    CC --> OC
    OP --> OC
    OP --> OR
    M --> TA
    TA --> AC
    AC --> RP
    TA --> TM
    TA --> AS
    M --> MP
    M --> MR
    TA --> AU
    AU --> DU
    M --> MUP
```

### 2.3 API Endpoints (V1)

| Method | Path | View | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/assets/` | `AssetListView` | All assets with computed state |
| `GET` | `/api/v1/assets/state/` | `AssetStateListView` | Filterable asset states |
| `GET` | `/api/v1/assets/<id>/state/` | `AssetStateDetailView` | Single asset state |
| `GET` | `/api/v1/assets/<id>/telemetry/` | `TelemetryHistoryView` | History + track + summary |
| `GET` | `/api/v1/missions/` | `MissionListView` | Missions scoped to user |
| `GET` | `/api/v1/command-centers/` | `CommandCenterListView` | Command centers scoped to user |
| `GET` | `/api/v1/me/roles/` | `UserRoleView` | User roles + permissions |
| `GET` | `/api/v1/dashboard/summary/` | `DashboardSummaryView` | Aggregated dashboard stats |

### 2.4 Signal Flow (Telemetry → AssetState)

```mermaid
sequenceDiagram
    participant SBD as SBD Payload
    participant DEC as Decoder
    participant RP as RawPacket
    participant TM as Telemetry
    participant SIG as post_save Signal
    participant AS as AssetState

    SBD->>DEC: Binary bytes arrive
    DEC->>RP: Store raw payload
    DEC->>TM: Create Telemetry record
    TM->>SIG: Django post_save fires
    SIG->>SIG: Compute freshness, confidence
    SIG->>SIG: Extract position, battery, movement
    SIG->>AS: update_or_create AssetState
    Note over AS: One AssetState per asset<br/>Always reflects latest truth
```

---

## 3. Frontend Architecture

### 3.1 Directory Structure

```
frontend/src/
├── api.js                           # API service layer (5 modules)
├── pages/
│   ├── auth/                        # Auth pages (login, register, etc.)
│   │   ├── dashboard.jsx            # Command Intelligence Watch Floor
│   │   ├── login.jsx
│   │   ├── register.jsx
│   │   └── profile.jsx
│   └── core/                        # Operational pages
│       ├── devices.jsx              # Asset registry table
│       ├── device.tsx               # Single asset detail
│       ├── home.jsx                 # Landing page
│       ├── billing.jsx              # Billing management
│       ├── projects.jsx             # Mission management
│       ├── Analytics.tsx            # Analytics dashboard
│       └── report.jsx               # Report viewer
├── components/
│   ├── ui/                          # shadcn-style components
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   ├── table.jsx
│   │   └── SidePanel.jsx
│   └── dashboard/                   # Dashboard-specific
│       ├── TacticalMap.jsx
│       └── AssetCommandList.jsx
└── hooks/                           # Custom React hooks
```

### 3.2 API Service Layer

```javascript
// api.js — 5 service modules
assetService     → getAssets(), getAssetStates(), getAssetState(id), getTelemetry(id)
missionService   → getMissions()
commandCenterService → getCommandCenters()
userService      → getMyRoles()
dashboardService → getSummary()
```

### 3.3 Data Flow

```mermaid
graph LR
    API["api.js<br/>(apiFetch)"] -->|"GET /api/v1/*"| BE["Django API"]
    API --> DASH["dashboard.jsx<br/>(30s auto-refresh)"]
    API --> DEV["devices.jsx<br/>(on mount)"]
    API --> DET["device.tsx<br/>(on mount)"]
    WS["WebSocket<br/>(future)"] -.->|"live push"| DASH
```

---

## 4. Data Ingestion Pipeline (Target State)

### 4.1 SBD Payload Flow

```
1. Device transmits binary fix via Iridium modem
2. Iridium gateway delivers to configured endpoint
3. POST /api/v1/ingest/  (authenticated by API key)
4. Validator checks:
   a. IMEI registered in AssetComms? → reject if unknown
   b. CDR reference unique? → reject if duplicate
   c. Timestamp within acceptable window? → reject if stale replay
5. Decoder parses binary → structured fields
6. RawPacket.objects.create(raw bytes + metadata)
7. Telemetry.objects.create(decoded fields)
8. post_save signal → AssetState updated
9. WebSocket push → connected dashboards update live
```

### 4.2 Packet Structure (Iridium SBD)

| Field | Bytes | Description |
|-------|-------|-------------|
| IMEI | 15 | Modem identifier |
| CDR Reference | 4 | Unique message ID |
| Session Status | 1 | Delivery status |
| MO Time | 4 | Message origination time |
| Latitude | 4 | IEI location (float) |
| Longitude | 4 | IEI location (float) |
| CEP Radius | 4 | Position accuracy (m) |
| Payload | 0–340 | Custom binary data |

---

## 5. Security Architecture

See [SECURITY_PLAN.md](file:///mnt/blacklotus/DEV/TECH-JCORP/HAWKSEYE/docs/SECURITY_PLAN.md) for detailed security controls.

### Summary

| Layer | Control |
|-------|---------|
| Device → Server | IMEI whitelist, CDR dedup, timestamp window |
| API | JWT authentication, role-based permissions |
| Data | Read-only dashboards, object-level isolation |
| Audit | AuditLog middleware on all `/api/` requests |
| Transport | HTTPS/TLS required in production |

---

## 6. Deployment Architecture (Target)

```mermaid
graph TB
    subgraph "Reverse Proxy"
        NG["Nginx<br/>(TLS termination,<br/>static files)"]
    end

    subgraph "Application"
        GU["Gunicorn<br/>(WSGI workers)"]
        DA["Daphne<br/>(ASGI / WebSocket)"]
    end

    subgraph "Data"
        PG["PostgreSQL"]
        RD["Redis<br/>(cache + channel layer)"]
    end

    NG -->|"HTTP"| GU
    NG -->|"WebSocket"| DA
    GU --> PG
    GU --> RD
    DA --> RD
    DA --> PG
```

### Environment Variables

```bash
DJANGO_SECRET_KEY=<secret>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=hawkseye.example.com
DATABASE_URL=postgres://user:pass@localhost:5432/hawkseye
REDIS_URL=redis://127.0.0.1:6379/0
VITE_API_URL=https://hawkseye.example.com/api/v1
```

---

*Last Updated: 2026-02-16*
