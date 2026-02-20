# Hawkseye: Overwatch — Production Transition Tickets

**Date**: 2026-02-16  
**Author**: Engineering Assessment  
**Classification**: Production Planning  
**Status**: PROPOSED

---

## PART 1: FEASIBILITY ASSESSMENT & RESEARCH

### Current State Summary (What Actually Exists Today)

After a thorough audit of every model, view, serializer, consumer, route, component, and configuration file in the codebase, here is the **honest truth** about where Hawkseye stands:

#### ✅ What's Real and Working
| Component | Status | Evidence |
|-----------|--------|----------|
| **Django Models (operations)** | ✅ Solid | 14 models: `CommandCenter`, `Operator`, `Mission`, `TacticalAsset`, `AssetComms`, `Telemetry`, `RawPacket`, `Parameters` (40 params), `Products`, `SbdBundles`, `DataUplink`, etc. All mapped to real DB tables. |
| **REST API Endpoints** | ✅ Exist | `GET /api/v1/assets/` (AssetListView), `GET /api/v1/assets/<id>/telemetry/` (TelemetryHistoryView), `GET /api/assets/lookup/` (search), ViewSet CRUD at `/api/assets/` |
| **WebSocket Consumer** | ✅ Skeleton | `TelemetryConsumer` at `/ws/telemetry/` — connects, joins `ops_room`, can push `telemetry_update` events. No authentication or scoping. |
| **Django Auth System** | ✅ Functional | JWT (SimpleJWT, 30min/1day), session auth, email-based login, registration, password reset, email change, CAPTCHA, CSRF, CORS configured. |
| **Frontend Auth Flow** | ✅ Working | `AuthContext.jsx` with JWT decode, refresh, session management, `ProtectedRoute` component, login/register/reset pages. |
| **Frontend Routing** | ✅ Comprehensive | 30+ routes with lazy loading, auth guards, page layouts. |
| **Dashboard Components** | ✅ Exist | `TacticalMap.jsx`, `AssetCommandList.jsx`, `OperationalMetrics.jsx`, `RoleDashboard.tsx` |
| **Device Management Page** | ✅ Feature-Rich | `devices.jsx` (1,239 lines) — table, search, sort, bulk actions, serial validation, add device flow. |
| **Leaflet Integration** | ✅ Installed | `leaflet`, `react-leaflet`, `leaflet.heat` in package.json. |
| **Django Channels (ASGI)** | ✅ Configured | Daphne, `InMemoryChannelLayer`, ASGI application, routing defined. |
| **Accounts Models** | ✅ Exist | `Profile`, `Organization`, `Team`, `Role` (OWNER/ADMIN/COACH/PLAYER), `DeliveryAddress`, `Country` |

#### ❌ What's Simulated / Broken / Missing
| Component | Status | Detail |
|-----------|--------|--------|
| **Frontend uses MOCK data** | ❌ Critical | `dashboard.jsx` has `MOCK_ASSETS` (6 hardcoded assets). `devices.jsx` has hardcoded `const devices = [...]` and `const organizations = [...]`. **No fetch() calls to backend.** |
| **API returns placeholders** | ❌ Critical | `AssetListView` returns `"battery": 85` (hardcoded), `"signal": 90` (hardcoded), `"gridRef": "38SMB 4421 9822"` (hardcoded). |
| **Signals are empty** | ❌ Critical | `signals.py` — all 3 signal handlers (`create_telemetry_payload`, `update_modem_status`, `update_hardware_status`) are `pass` stubs. |
| **WebSocket has no auth** | ❌ High | `TelemetryConsumer.connect()` accepts all connections, no user verification, no mission scoping. |
| **No RBAC enforcement** | ❌ Critical | `Profile` model has no `role` field. No permission classes exist. `AssetViewSet` has no permission_classes defined (defaults to `IsAuthenticated` only). The `Role` model in accounts is for Player1Sport legacy (OWNER/ADMIN/COACH/PLAYER), not Hawkseye operational roles. |
| **No Audit Logging** | ❌ Critical | No `AuditLog` model. No request logging middleware. No action attribution. |
| **No derived asset state** | ❌ High | No freshness calculation, no silence detection, no confidence scoring. |
| **Map not connected** | ❌ High | `TacticalMap.jsx` exists but uses no live data from API. |
| **No MFA** | ❌ Medium | No TOTP, no hardware token support. |
| **No request signing** | ❌ Medium | No HMAC-SHA256 on mutating requests. |
| **Database is empty** | ⚠️ | SQLite `db.sqlite3` exists (708KB) but likely only has Django system tables + test data from management commands. |
| **Channel layer is InMemory** | ⚠️ | Not production-viable. Needs Redis channel layer. |

### Feasibility Verdict

**YES — this scope is achievable.** Here's why:

1. **The foundation is real.** Django models correctly represent the operational domain (TacticalAsset, AssetComms, Telemetry, CommandCenter, Mission). These aren't toy models — they map to real Iridium satellite SBD protocol tables.

2. **The auth infrastructure exists.** JWT + session auth, CSRF, CORS, email flows, protected routes — this is 60% of identity/auth already done.

3. **The frontend architecture is sound.** React 18, Vite, lazy routing, component library (Radix UI, Lucide icons, MUI), Leaflet installed — the scaffolding is there.

4. **The WebSocket plumbing exists.** Daphne + Channels + consumer + routing. Just needs auth, scoping, and frontend subscription.

5. **The gap is integration, not invention.** The backend has data models and APIs. The frontend has UIs. They just don't talk to each other yet.

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Legacy Player1Sport code creates confusion | High | Medium | Clear separation via app boundaries; document what's Hawkseye vs legacy |
| RBAC model conflicts with existing Role model | Medium | High | New `OperationalRole` model separate from accounts `Role` |
| SQLite won't scale for telemetry time-series | High | High | Migrate to PostgreSQL before TKT-002 |
| InMemoryChannelLayer drops messages under load | High | High | Switch to `channels_redis` in TKT-002 |
| No test coverage makes refactoring risky | High | Medium | Each ticket includes test requirements |

### Technology Recommendations

| Concern | Current | Recommended | Reason |
|---------|---------|-------------|--------|
| Database | SQLite | PostgreSQL 16 | Time-series queries, concurrent writes, production viability |
| Channel Layer | InMemory | Redis (channels_redis) | Multi-process, persistence, pub/sub |
| MFA | None | django-otp + TOTP | Lightweight, proven, no external dependency |
| Audit Log | None | Custom model + middleware | Full control, append-only, no third-party risk |
| Map Tiles | None configured | Leaflet + CartoDB Dark Matter | Free, tactical aesthetic, no API key needed |
| Request Signing | None | HMAC-SHA256 middleware | Lightweight, no PKI infrastructure needed |

---

## PART 2: ENGINEERING TICKETS

### Ticket Dependency Graph

```
TKT-000 (DB Migration)
    ├── TKT-001 (Frontend ↔ Backend Integration)
    │       └── TKT-003 (Geospatial Visualization)
    ├── TKT-005 (Identity & RBAC)
    │       ├── TKT-006 (Authorization & ABAC)
    │       │       └── TKT-007 (Dashboard Architecture)
    │       └── TKT-002 (Real-Time Telemetry)
    ├── TKT-004 (Audit & Security)
    └── TKT-008 (Hardening & Compliance)
```

---

### TKT-000: Database Migration & Operational State Layer

**Severity**: BLOCKER  
**Priority**: P0 — Must be done first  
**Estimated Effort**: 3-5 days  
**Dependencies**: None  
**Blocks**: All other tickets

#### Purpose
SQLite cannot serve a production overwatch system. The telemetry table will grow unboundedly. Concurrent WebSocket writes will cause `database is locked` errors. PostgreSQL is required for time-series indexing, concurrent access, and production reliability. Additionally, the "derived asset state" layer (freshness, silence, confidence) must be established as the foundation for all downstream work.

#### Deliverables

**D1: PostgreSQL Setup**
- [ ] Install and configure PostgreSQL 16
- [ ] Create `hawkseye` database with dedicated user
- [ ] Update `settings.py` → `DATABASES` to use `django.db.backends.postgresql`
- [ ] Update `.env` / `.env.example` with PG connection vars (`DB_ENGINE`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)
- [ ] Run `python manage.py migrate` against PostgreSQL
- [ ] Verify all 14 operations models create correctly
- [ ] Add `psycopg2-binary` to `requirements.txt`

**D2: Derived Asset State Model**
```python
# New model in operations/models.py
class AssetState(models.Model):
    """
    Computed operational state for each tactical asset.
    Updated on every telemetry ingest. Queried for dashboard rendering.
    """
    asset = models.OneToOneField('TacticalAsset', on_delete=models.CASCADE, related_name='state')
    last_telemetry = models.ForeignKey('Telemetry', null=True, on_delete=models.SET_NULL)
    last_seen = models.DateTimeField(null=True)
    last_latitude = models.FloatField(null=True)
    last_longitude = models.FloatField(null=True)
    last_battery_voltage = models.FloatField(null=True)
    last_speed_kmh = models.FloatField(null=True)
    last_heading = models.IntegerField(null=True)
    last_temperature = models.FloatField(null=True)
    
    # Derived fields
    silence_seconds = models.IntegerField(default=0, help_text="Seconds since last telemetry")
    freshness = models.CharField(max_length=20, choices=[
        ('live', 'Live (<5min)'),
        ('recent', 'Recent (<1hr)'),
        ('stale', 'Stale (<24hr)'),
        ('silent', 'Silent (>24hr)'),
    ], default='silent')
    confidence = models.FloatField(default=0.0, help_text="0.0-1.0 based on GPS accuracy + freshness")
    is_moving = models.BooleanField(default=False)
    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'asset_state'
        verbose_name = "Asset State"
```

**D3: Implement Signal Handlers**
- [ ] `create_telemetry_payload`: Parse `RawPacket.raw_data` hex → create `Telemetry` record with decoded GPS, battery, temperature, etc.
- [ ] Update `AssetState` on every new `Telemetry` creation (freshness, silence, confidence calculation)
- [ ] `update_modem_status`: Set modem status based on last contact time
- [ ] `update_hardware_status`: Set hardware status based on telemetry health

**D4: Data Seeding Command**
- [ ] Create `management/commands/seed_operational_data.py`
- [ ] Seed: 2 CommandCenters, 3 Missions, 10 TacticalAssets, 10 AssetComms, 100 Telemetry records, Products, ParamSchemas
- [ ] All with realistic coordinates (e.g., Kruger National Park for wildlife tracking scenario)
- [ ] Verify `AssetState` auto-populates via signals

**D5: Indexes**
- [ ] Composite index on `Telemetry(payload_id, timestamp)`
- [ ] Index on `AssetState(freshness)`
- [ ] Index on `AssetState(asset_id)`
- [ ] Index on `RawPacket(modem_id, server_time)`

#### Acceptance Criteria
- [ ] PostgreSQL is the default database engine
- [ ] `AssetState` exists for every `TacticalAsset`
- [ ] Signals correctly populate `AssetState` on telemetry creation
- [ ] Seed command creates realistic demo data
- [ ] All existing management commands still function
- [ ] No SQLite references remain in settings

#### Tests
- [ ] Unit test: Signal creates `AssetState` when `Telemetry` is saved
- [ ] Unit test: Freshness calculation is correct for each threshold
- [ ] Unit test: Confidence score calculation
- [ ] Integration test: Seed command runs without errors

---

### TKT-001: Frontend ↔ Backend Integration

**Severity**: CRITICAL  
**Priority**: P0  
**Estimated Effort**: 5-7 days  
**Dependencies**: TKT-000  
**Blocks**: TKT-003

#### Purpose
Every pixel on the Hawkseye UI must be backed by backend truth. Currently, `dashboard.jsx` and `devices.jsx` render hardcoded arrays. The `AssetListView` API returns placeholder values for battery, signal, and grid reference. This ticket eliminates all simulation from the data path.

#### Deliverables

**D1: Fix Backend API Responses**

File: `backend/webapp/apps/operations/api_views.py`

- [ ] `AssetListView.get()` — Replace hardcoded values:
  - `battery` → query latest `Telemetry.bat_voltage` via `AssetState.last_battery_voltage`
  - `signal` → derive from `AssetComms.status` + `AssetState.freshness`
  - `lastUpdate` → `AssetState.last_seen` (not `activation_date`)
  - `gridRef` → compute MGRS from `AssetState.last_latitude/longitude` (use `mgrs` Python package)
  - Add: `latitude`, `longitude`, `freshness`, `confidence`, `silence_seconds`, `mission_name`, `command_center_name`
- [ ] `TelemetryHistoryView.get()` — Return full telemetry objects:
  ```json
  {
    "telemetry": [
      {
        "timestamp": "2026-02-16T08:00:00Z",
        "latitude": -25.7461,
        "longitude": 28.1881,
        "speed_kmh": 12.5,
        "bat_voltage": 3.7,
        "temperature": 28.4,
        "heading": 180,
        "altitude_m": 1200
      }
    ]
  }
  ```
- [ ] New endpoint: `GET /api/v1/assets/<id>/state/` — returns current `AssetState`
- [ ] New endpoint: `GET /api/v1/missions/` — list missions for mission selector
- [ ] New endpoint: `GET /api/v1/command-centers/` — list command centers

**D2: Update Frontend API Service**

File: `frontend/src/api.js`

- [ ] Add auth token header injection (currently exists but verify integration with `AuthContext`)
- [ ] Add `getMissions()`, `getCommandCenters()`, `getAssetState(id)` methods
- [ ] Add error handling with typed error responses
- [ ] Add request/response interceptors for 401 → refresh token flow

**D3: Migrate Dashboard to Live Data**

File: `frontend/src/pages/auth/dashboard.jsx`

- [ ] Delete `MOCK_ASSETS` array (lines 55-160)
- [ ] Delete `organizations` array (lines 5-52)
- [ ] Add `useEffect` → `assetService.getAssets()` on mount
- [ ] Add `useState` for `assets`, `loading`, `error`
- [ ] Implement loading state (skeleton UI, not spinner)
- [ ] Implement empty state ("No assets reporting. Check connectivity.")
- [ ] Implement error state (retry button, error details)
- [ ] Wire mission selector to `GET /api/v1/missions/`
- [ ] Filter assets by selected mission

**D4: Migrate Devices Page to Live Data**

File: `frontend/src/pages/core/devices.jsx`

- [ ] Delete hardcoded `const devices = [...]` (lines 75-159)
- [ ] Delete hardcoded `const organizations = [...]` (lines 38-73)
- [ ] Replace with `useEffect` → API calls
- [ ] Add loading/empty/error states
- [ ] Ensure search, sort, filter still work with dynamic data
- [ ] Serial number validation: wire to `GET /api/assets/lookup/`

**D5: CORS Verification**
- [ ] Verify CORS works for local dev (`localhost:5173` → `localhost:8000`)
- [ ] Verify CORS works for deployed (`hawkseye.tech` frontend → API)
- [ ] Document any proxy configuration needed in `vite.config.ts`

#### Acceptance Criteria
- [ ] Zero hardcoded data arrays in any frontend file
- [ ] Dashboard renders assets from `/api/v1/assets/`
- [ ] Devices page renders from `/api/v1/assets/` 
- [ ] All three states (loading, empty, error) are implemented and visually correct
- [ ] API responses contain no placeholder values
- [ ] Network tab shows real API calls, not static imports

#### Tests
- [ ] Backend: API returns correct structure with seeded data
- [ ] Backend: Empty database returns `[]` not error
- [ ] Frontend: Loading state renders during fetch
- [ ] Frontend: Error state renders on network failure
- [ ] Frontend: Data renders correctly after successful fetch

---

### TKT-002: Real-Time Telemetry Pipeline

**Severity**: HIGH  
**Priority**: P1  
**Estimated Effort**: 5-7 days  
**Dependencies**: TKT-000, TKT-005 (auth on WebSocket)  
**Blocks**: None (but enhances TKT-003, TKT-007)

#### Purpose
Overwatch demands live awareness. Operators must see assets move, batteries drain, and silence events occur in real time — without page refresh or polling. The WebSocket consumer skeleton exists but has no authentication, no scoping, and no frontend subscription.

#### Deliverables

**D1: Switch to Redis Channel Layer**
- [ ] Install `channels_redis`: add to `requirements.txt`
- [ ] Update `settings.py`:
  ```python
  CHANNEL_LAYERS = {
      "default": {
          "BACKEND": "channels_redis.core.RedisChannelLayer",
          "CONFIG": {
              "hosts": [os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/6')],
          },
      },
  }
  ```

**D2: Authenticated WebSocket Consumer**
- [ ] Implement JWT authentication in `TelemetryConsumer.connect()`:
  - Extract token from query string: `ws://host/ws/telemetry/?token=<jwt>`
  - Decode and validate JWT
  - Reject unauthenticated connections with `close(code=4001)`
  - Store `self.user` for downstream scoping
- [ ] Add mission-scoped groups:
  - User joins `mission_{id}` groups based on their mission assignments
  - Telemetry updates are broadcast to the relevant mission group
- [ ] Add heartbeat mechanism (ping/pong every 30s)
- [ ] Add connection lifecycle logging

**D3: Telemetry Emitter**

File: `management/commands/emit_telemetry.py` (update existing)

- [ ] Generate realistic telemetry for seeded assets
- [ ] Emit via Django Channels `channel_layer.group_send()`:
  ```python
  await channel_layer.group_send(
      f"mission_{mission_id}",
      {
          "type": "telemetry_update",
          "message": {
              "asset_id": asset.id,
              "latitude": lat,
              "longitude": lon,
              "battery": bat,
              "timestamp": now.isoformat(),
              "freshness": "live"
          }
      }
  )
  ```
- [ ] Simulate movement patterns (linear interpolation between waypoints)
- [ ] Simulate battery drain (decreasing voltage over time)
- [ ] Simulate silence events (random asset goes quiet)

**D4: Frontend WebSocket Client**

New file: `frontend/src/hooks/useTelemetry.js`

- [ ] Custom hook that:
  - Opens WebSocket with JWT in query string
  - Handles reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)
  - Dispatches received telemetry to state store
  - Handles connection lifecycle (connecting, connected, disconnected, error)
- [ ] State reconciliation strategy:
  - Initial load: REST API (`/api/v1/assets/`)
  - Subsequent updates: WebSocket merges into existing state
  - Stale detection: if no WS message for 60s, re-fetch via REST

**D5: Dashboard Integration**
- [ ] `dashboard.jsx`: Use `useTelemetry()` hook
- [ ] Update asset markers/rows in real-time without full re-render
- [ ] Show connection status indicator (green dot = live, amber = reconnecting, red = disconnected)
- [ ] Show "LIVE" badge when WebSocket is connected

#### Acceptance Criteria
- [ ] WebSocket rejects unauthenticated connections
- [ ] WebSocket scoped to user's mission assignments
- [ ] `emit_telemetry` command pushes data visible in dashboard within 1 second
- [ ] Frontend reconnects automatically after disconnect
- [ ] REST and WebSocket data are reconciled (no duplicates, no gaps)

#### Tests
- [ ] Unit test: Consumer rejects connection without valid JWT
- [ ] Unit test: Consumer accepts connection with valid JWT
- [ ] Unit test: Telemetry update reaches only the correct mission group
- [ ] Integration test: `emit_telemetry` → WebSocket → frontend state update
- [ ] Frontend test: Reconnection after connection drop

---

### TKT-003: Geospatial Intelligence Visualization

**Severity**: MEDIUM  
**Priority**: P1  
**Estimated Effort**: 5-7 days  
**Dependencies**: TKT-001  
**Blocks**: TKT-007

#### Purpose
The Common Operational Picture (COP) is the centerpiece of any overwatch system. Operators must reason spatially. The current `TacticalMap.jsx` component exists with a fallback grid but doesn't display live backend data.

#### Deliverables

**D1: Tactical Basemap**
- [ ] Configure Leaflet with CartoDB Dark Matter tiles (free, no API key):
  ```
  https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
  ```
- [ ] Set default view to mission area (use first asset's coordinates)
- [ ] Add MGRS grid overlay (optional toggle)
- [ ] Add scale bar and coordinate display on hover

**D2: Asset Markers**
- [ ] Custom marker icons by asset type (Field Agent, Marine GPS, UAV, etc.)
- [ ] Marker color by freshness state:
  - Live (green pulse) → `#10B981`
  - Recent (amber) → `#F59E0B`
  - Stale (gray) → `#6B7280`
  - Silent (red X) → `#EF4444`
- [ ] Marker popup with:
  - Callsign, battery %, signal, last update time
  - Mini sparkline of last 10 battery readings
  - Link to asset detail page
- [ ] Heading indicator (directional arrow on marker)

**D3: Track History**
- [ ] Fetch telemetry history: `GET /api/v1/assets/<id>/telemetry/`
- [ ] Render as polyline on map (color-coded by speed or time)
- [ ] Click asset → show last 24h track
- [ ] Toggle track visibility per asset

**D4: Heatmap Layer**
- [ ] Use `leaflet.heat` (already installed)
- [ ] Aggregate telemetry positions → heatmap of asset density
- [ ] Configurable time window (last 1h, 6h, 24h, 7d)
- [ ] Toggle heatmap layer on/off

**D5: Real-Time Map Updates**
- [ ] When WebSocket delivers telemetry update → move marker smoothly (CSS transition)
- [ ] Update marker color based on new freshness
- [ ] Flash animation on new position (subtle pulse)

#### Acceptance Criteria
- [ ] Map renders with dark tactical basemap
- [ ] All assets from API shown as markers at correct coordinates
- [ ] Markers reflect live freshness state
- [ ] Click marker → popup with real data
- [ ] Track history polyline renders on asset selection
- [ ] Heatmap layer toggles correctly
- [ ] WebSocket updates move markers in real-time

#### Tests
- [ ] Unit test: Marker color function returns correct color per freshness
- [ ] Integration test: Map renders with seeded data
- [ ] Visual test: Markers are visible on dark basemap (contrast check)

---

### TKT-004: Security Hardening & Auditability

**Severity**: CRITICAL  
**Priority**: P0  
**Estimated Effort**: 5-7 days  
**Dependencies**: TKT-000  
**Blocks**: TKT-008

#### Purpose
Every action in Hawkseye must be attributable. Every change must be explainable. This ticket creates the audit infrastructure and hardens the request pipeline.

#### Deliverables

**D1: AuditLog Model**
```python
# operations/models.py
class AuditLog(models.Model):
    """
    Immutable, append-only audit log.
    Records every significant action in the system.
    """
    id = models.BigAutoField(primary_key=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    actor = models.ForeignKey('auth.User', null=True, on_delete=models.SET_NULL)
    actor_ip = models.GenericIPAddressField(null=True)
    actor_session = models.CharField(max_length=64, blank=True)
    action = models.CharField(max_length=50, db_index=True, choices=[
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('LOGIN_FAILED', 'Login Failed'),
        ('VIEW_ASSET', 'View Asset'),
        ('VIEW_TELEMETRY', 'View Telemetry'),
        ('CREATE_ASSET', 'Create Asset'),
        ('UPDATE_ASSET', 'Update Asset'),
        ('DELETE_ASSET', 'Delete Asset'),
        ('WS_CONNECT', 'WebSocket Connect'),
        ('WS_DISCONNECT', 'WebSocket Disconnect'),
        ('ROLE_CHANGE', 'Role Change'),
        ('PERMISSION_DENIED', 'Permission Denied'),
        ('CONFIG_CHANGE', 'Configuration Change'),
    ])
    target_type = models.CharField(max_length=50, blank=True)
    target_id = models.CharField(max_length=100, blank=True)
    detail = models.JSONField(default=dict, blank=True)
    result = models.CharField(max_length=20, choices=[
        ('SUCCESS', 'Success'),
        ('FAILURE', 'Failure'),
        ('DENIED', 'Denied'),
    ], default='SUCCESS')

    class Meta:
        db_table = 'audit_log'
        ordering = ['-timestamp']
        # Prevent editing/deletion at Django level
        managed = True
    
    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("AuditLog records are immutable. Cannot update.")
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        raise ValueError("AuditLog records cannot be deleted.")
```

**D2: Audit Middleware**
- [ ] Create `core/audit_middleware.py`
- [ ] Log all API requests (path, method, user, IP, status code)
- [ ] Log login attempts (success/failure) with timestamp and IP
- [ ] Skip health check and static file requests
- [ ] Async-safe (don't block request processing)

**D3: Audit Helper Functions**
```python
# operations/audit.py
def log_action(actor, action, target_type='', target_id='', detail=None, result='SUCCESS', request=None):
    AuditLog.objects.create(
        actor=actor,
        actor_ip=get_client_ip(request) if request else None,
        actor_session=request.session.session_key if request else '',
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        detail=detail or {},
        result=result,
    )
```

**D4: Request Signing for Mutating Operations**
- [ ] Create `core/signing_middleware.py`
- [ ] For POST/PUT/PATCH/DELETE requests:
  - Client must include `X-Signature` header: `HMAC-SHA256(request_body, shared_secret)`
  - Server validates signature before processing
  - Reject unsigned mutating requests with 403
- [ ] Frontend: add signing function to API service for all mutating calls
- [ ] Provide mechanism for key distribution (environment variable for now, key rotation in TKT-008)

**D5: Audit Log Admin View**
- [ ] Register `AuditLog` in Django admin with read-only access
- [ ] Add filters: by action, actor, date range, result
- [ ] Add search: by target_id, actor username
- [ ] **No edit or delete permissions** — even for superusers

**D6: Audit API Endpoint**
- [ ] `GET /api/v1/audit/` — paginated, filterable audit log
- [ ] Restricted to Admin/Commander roles only (enforce after TKT-005)
- [ ] Supports: `?action=LOGIN&actor=<id>&from=<date>&to=<date>`

#### Acceptance Criteria
- [ ] Every login attempt (success/failure) creates an AuditLog entry
- [ ] Every API request to operations endpoints is logged
- [ ] AuditLog records cannot be modified or deleted (even via admin)
- [ ] Mutating requests without valid signature are rejected
- [ ] Audit log is queryable via admin and API

#### Tests
- [ ] Unit test: AuditLog.save() raises error on update attempt
- [ ] Unit test: AuditLog.delete() raises error
- [ ] Unit test: Middleware creates log entry for API request
- [ ] Unit test: Signature verification accepts valid, rejects invalid
- [ ] Integration test: Login → AuditLog entry created

---

### TKT-005: Identity, Authentication & Operational Roles

**Severity**: CRITICAL  
**Priority**: P0  
**Estimated Effort**: 5-7 days  
**Dependencies**: TKT-000  
**Blocks**: TKT-006, TKT-007

#### Purpose
Authentication answers _who you are_. Hawkseye must enforce unique identities, centralized authentication, session management, and define the operational role taxonomy that underpins all authorization decisions.

#### Deliverables

**D1: Operational Role Model**

The existing `accounts.Role` model uses Player1Sport roles (OWNER/ADMIN/COACH/PLAYER). Hawkseye needs its own operational role system:

```python
# operations/models.py
class OperationalRole(models.Model):
    """
    Hawkseye operational role assignment.
    A user can have different roles in different command centers.
    """
    ROLE_CHOICES = [
        ('OBSERVER', 'Observer'),       # Read-only situational awareness
        ('OPERATOR', 'Operator'),       # Live operations, field agent
        ('ANALYST', 'Analyst'),         # Historical analysis, reporting
        ('COMMANDER', 'Commander'),     # Cross-mission oversight
        ('ADMIN', 'Admin'),             # User & system management (NOT operations)
    ]
    
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='operational_roles')
    command_center = models.ForeignKey('CommandCenter', on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    missions = models.ManyToManyField('Mission', blank=True, help_text="Missions this user can access")
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey('auth.User', null=True, on_delete=models.SET_NULL, related_name='role_assignments_made')
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'operational_roles'
        unique_together = ('user', 'command_center', 'role')
```

**D2: Role API Endpoints**
- [ ] `GET /api/v1/me/roles/` — current user's operational roles
- [ ] `GET /api/v1/me/permissions/` — computed permission set
- [ ] `POST /api/v1/roles/assign/` — Admin-only: assign role to user
- [ ] `POST /api/v1/roles/revoke/` — Admin-only: revoke role

**D3: Update Auth Context (Frontend)**
- [ ] On login success, fetch `/api/v1/me/roles/`
- [ ] Store roles in `AuthContext`
- [ ] Expose `hasRole(role)`, `canAccessMission(missionId)` helpers
- [ ] Include role info in JWT claims (add custom JWT serializer):
  ```python
  # Custom token claims
  class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
      @classmethod
      def get_token(cls, user):
          token = super().get_token(user)
          roles = OperationalRole.objects.filter(user=user, is_active=True)
          token['roles'] = list(roles.values_list('role', flat=True))
          token['command_centers'] = list(roles.values_list('command_center_id', flat=True).distinct())
          return token
  ```

**D4: MFA Foundation**
- [ ] Install `django-otp` and `django-otp-totp`
- [ ] Add to `INSTALLED_APPS`
- [ ] Create migration
- [ ] Implement TOTP setup endpoint: `POST /api/v1/me/mfa/setup/`
- [ ] Implement TOTP verify endpoint: `POST /api/v1/me/mfa/verify/`
- [ ] Enforce MFA for Commander and Admin roles (optional for others)
- [ ] Frontend: MFA setup page, TOTP input on login for MFA-enabled users

**D5: Session Enhancement**
- [ ] Add `last_active` tracking to sessions
- [ ] Implement session timeout (30min inactivity for Operators, 60min for Analysts, 15min for Commanders/Admins)
- [ ] Add concurrent session limit (max 2 per user)
- [ ] Add session listing: `GET /api/v1/me/sessions/` (see all active sessions)
- [ ] Add session kill: `DELETE /api/v1/me/sessions/<id>/`

#### Acceptance Criteria
- [ ] Every user has at least one `OperationalRole`
- [ ] JWT tokens contain role claims
- [ ] Frontend `AuthContext` exposes role checking methods
- [ ] MFA can be enabled and enforced for privileged roles
- [ ] Session timeout enforced server-side
- [ ] Role assignments create AuditLog entries (via TKT-004)

#### Tests
- [ ] Unit test: User with multiple roles across command centers
- [ ] Unit test: JWT contains correct role claims
- [ ] Unit test: MFA setup generates valid TOTP secret
- [ ] Unit test: MFA verify accepts correct code, rejects incorrect
- [ ] Integration test: Login → JWT → role fetch → frontend state

---

### TKT-006: Authorization — RBAC + ABAC Policy Enforcement

**Severity**: CRITICAL  
**Priority**: P1  
**Estimated Effort**: 5-7 days  
**Dependencies**: TKT-005  
**Blocks**: TKT-007

#### Purpose
Authorization answers _what you can see and do_. This ticket implements the combined RBAC + ABAC model described in the scope — server-side enforcement, context-aware filtering, and data sensitivity tiers.

#### Deliverables

**D1: Permission Classes**
```python
# operations/permissions.py

class IsObserver(BasePermission):
    """Read-only awareness. No mutations."""
    def has_permission(self, request, view):
        return has_role(request.user, 'OBSERVER') and request.method in SAFE_METHODS

class IsOperator(BasePermission):
    """Can submit telemetry for assigned assets only."""
    def has_permission(self, request, view):
        return has_role(request.user, 'OPERATOR')
    def has_object_permission(self, request, view, obj):
        return obj_in_user_missions(request.user, obj)

class IsAnalyst(BasePermission):
    """Historical data access. No live feeds."""
    def has_permission(self, request, view):
        return has_role(request.user, 'ANALYST')

class IsCommander(BasePermission):
    """Cross-mission oversight."""
    def has_permission(self, request, view):
        return has_role(request.user, 'COMMANDER')

class IsAdmin(BasePermission):
    """User & system management. NO operational data."""
    def has_permission(self, request, view):
        return has_role(request.user, 'ADMIN')
```

**D2: Queryset Scoping Mixins**
```python
# operations/mixins.py
class MissionScopedMixin:
    """Automatically filter querysets to user's assigned missions."""
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if has_role(user, 'COMMANDER'):
            # Commanders see all within their command centers
            centers = user_command_centers(user)
            return qs.filter(owner__org__in=centers)
        # Everyone else sees only their mission assignments
        missions = user_missions(user)
        return qs.filter(owner__in=missions)
```

**D3: Data Sensitivity Tiers**
- [ ] Define sensitivity levels on `TacticalAsset`:
  ```python
  sensitivity = models.CharField(max_length=20, choices=[
      ('UNCLASSIFIED', 'Unclassified'),
      ('RESTRICTED', 'Restricted'),
      ('CONFIDENTIAL', 'Confidential'),
  ], default='UNCLASSIFIED')
  ```
- [ ] Implement serializer-level field filtering based on role + sensitivity:
  - Observers: last known position only (no live), obfuscated coordinates for CONFIDENTIAL
  - Operators: live data for assigned assets, no cross-mission
  - Analysts: full history, aggregated only for CONFIDENTIAL
  - Commanders: everything, precise coordinates

**D4: Apply Permissions to ALL Existing Views**
- [ ] `AssetViewSet` → `[IsAuthenticated, IsOperator | IsObserver | IsCommander]` + `MissionScopedMixin`
- [ ] `AssetListView` → `[IsAuthenticated]` + mission scoping in queryset
- [ ] `TelemetryHistoryView` → `[IsAuthenticated, IsOperator | IsAnalyst | IsCommander]` + mission scoping
- [ ] `AssetLookupAPIView` → Already has `IsAuthenticated`, add mission scoping
- [ ] All accounts endpoints → `IsAdmin` where applicable

**D5: WebSocket Authorization**
- [ ] `TelemetryConsumer`: verify user has active role for the requested mission group
- [ ] Reject subscription to unauthorized mission groups
- [ ] On role revocation → forcefully disconnect WebSocket

**D6: Policy Matrix Documentation**
Create `docs/POLICY_MATRIX.md`:

| Action | Observer | Operator | Analyst | Commander | Admin |
|--------|----------|----------|---------|-----------|-------|
| View live positions (assigned) | Last-known only | ✅ Live | ❌ | ✅ Live | ❌ |
| View live positions (other missions) | ❌ | ❌ | ❌ | ✅ | ❌ |
| View telemetry history | ❌ | Own assets only | ✅ All assigned | ✅ All | ❌ |
| Submit telemetry | ❌ | ✅ Own assets | ❌ | ❌ | ❌ |
| View heatmaps | ❌ | ❌ | ✅ | ✅ | ❌ |
| Manage users | ❌ | ❌ | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ❌ | ✅ Read | ✅ Full |
| Manage billing | ❌ | ❌ | ❌ | ❌ | ✅ |
| Configure assets | ❌ | ❌ | ❌ | ✅ | ❌ |
| WebSocket live feed | ❌ | ✅ Scoped | ❌ | ✅ All | ❌ |

#### Acceptance Criteria
- [ ] An Operator cannot see assets outside their mission assignment
- [ ] An Admin cannot access telemetry or map endpoints
- [ ] A Commander can see cross-mission data
- [ ] Unauthorized API requests return 403 (not 404 — don't leak data existence)
- [ ] WebSocket rejects subscription to unauthorized missions
- [ ] Policy matrix document exists and is accurate

#### Tests
- [ ] Unit test: Each permission class allows/denies correctly
- [ ] Unit test: MissionScopedMixin filters queryset correctly per role
- [ ] Integration test: Create 2 operators in different missions, verify isolation
- [ ] Integration test: Commander sees both, Operator sees only theirs
- [ ] Security test: Verify no data leaks via error messages or response codes

---

### TKT-007: Dashboard Architecture — Progressive Disclosure

**Severity**: HIGH  
**Priority**: P2  
**Estimated Effort**: 7-10 days  
**Dependencies**: TKT-005, TKT-006, TKT-003  
**Blocks**: None

#### Purpose
Users only see what they need. Dashboards exist or do not exist per role — they are not merely hidden. This ticket builds four distinct operational views.

#### Deliverables

**D1: Role-Based Router**

New file: `frontend/src/components/RoleRoute.jsx`

- [ ] Wrap route elements to enforce role requirements
- [ ] Redirect unauthorized users to appropriate view (not generic 403)
- [ ] Hide navigation items that the user's role cannot access

**D2: Observer View** (`/dashboard/observer`)
- [ ] Map with last-known positions (not live)
- [ ] Confidence indicators per asset
- [ ] Silence alerts (asset hasn't reported in X hours)
- [ ] Read-only — no action buttons

**D3: Operations View** (`/dashboard/operations`)
- [ ] Live map with real-time updates (WebSocket)
- [ ] Battery and comms status panel
- [ ] Asset command list with quick actions
- [ ] Recent telemetry history (sparklines)
- [ ] Mission selector

**D4: Analysis View** (`/dashboard/analysis`)
- [ ] Heatmap visualization (asset density over time)
- [ ] Trend charts (battery over time, speed patterns)
- [ ] Historical track playback
- [ ] Date range selector
- [ ] Export capability (CSV)

**D5: Command View** (`/dashboard/command`)
- [ ] Cross-mission summary cards
- [ ] Alerts overview (red/amber/green counts)
- [ ] Confidence roll-up per mission
- [ ] Quick access to audit log
- [ ] Force posture summary

**D6: Dashboard Layout System**
- [ ] Shared layout wrapper with role-appropriate nav
- [ ] Auto-redirect: on login, user goes to their role's default dashboard
- [ ] If user has multiple roles, show role switcher
- [ ] Responsive: each view should work on tablet (1024px+)

#### Acceptance Criteria
- [ ] Each role sees ONLY their designated dashboard
- [ ] No hidden elements — dashboards for other roles don't render
- [ ] Login redirects to correct default dashboard
- [ ] Each dashboard shows real data from API
- [ ] Responsive on tablet resolution

---

### TKT-008: Production Hardening & Compliance

**Severity**: HIGH  
**Priority**: P2  
**Estimated Effort**: 3-5 days  
**Dependencies**: TKT-004, TKT-005, TKT-006  
**Blocks**: None

#### Purpose
Make the system defensible under basic security review. Enforce transport security, remove debug artifacts, and verify the security posture.

#### Deliverables

**D1: Transport Security**
- [ ] Enforce HTTPS in production (`SECURE_SSL_REDIRECT = True`)
- [ ] HSTS header (`SECURE_HSTS_SECONDS = 31536000`)
- [ ] Secure cookie flags (already partially done — verify all paths)
- [ ] WebSocket over WSS only in production

**D2: Debug Cleanup**
- [ ] Remove `DEBUG = True` from production path
- [ ] Remove `debug_toolbar` from production `INSTALLED_APPS`
- [ ] Remove `ALLOWED_HOSTS = ["*"]` — use explicit hosts
- [ ] Audit and remove `print()` statements from views (found in `ResetPasswordView`)
- [ ] Remove hardcoded superuser credentials from `RUN_PROJECT.md`

**D3: Rate Limiting**
- [ ] Install `django-ratelimit`
- [ ] Apply to: login (5/min), registration (3/hr), password reset (3/hr), API (100/min)
- [ ] Return 429 with `Retry-After` header

**D4: Input Validation Hardening**
- [ ] Audit all API endpoints for input validation
- [ ] Ensure all serializer fields have explicit validators
- [ ] Add `MAX_PAGE_SIZE` to DRF pagination
- [ ] Validate WebSocket message sizes

**D5: Security Checklist**
Create `docs/SECURITY_CHECKLIST.md`:
- [ ] Document all security controls implemented
- [ ] Document known limitations
- [ ] Document incident response procedure
- [ ] Provide deployment security guide

**D6: Environment Configuration**
- [ ] Create `.env.production.example` with all required vars
- [ ] Document required PostgreSQL configuration
- [ ] Document required Redis configuration
- [ ] Document Daphne/ASGI deployment configuration

#### Acceptance Criteria
- [ ] No `DEBUG = True` in production
- [ ] No hardcoded secrets in source code
- [ ] Rate limiting active on auth endpoints
- [ ] HTTPS enforced in production
- [ ] Security checklist document exists and is accurate

---

## PART 3: EXECUTION PLAN

### Phase Timeline

| Phase | Tickets | Duration | Team |
|-------|---------|----------|------|
| **Phase 0: Foundation** | TKT-000 | Week 1 | Backend |
| **Phase 1: Integration** | TKT-001 + TKT-004 | Weeks 2-3 | Full stack |
| **Phase 2: Identity & Auth** | TKT-005 | Week 3-4 | Backend + Frontend |
| **Phase 3: Real-Time + Geo** | TKT-002 + TKT-003 | Weeks 4-5 | Full stack |
| **Phase 4: Authorization** | TKT-006 | Week 5-6 | Backend |
| **Phase 5: Dashboards** | TKT-007 | Weeks 6-8 | Frontend |
| **Phase 6: Hardening** | TKT-008 | Week 8-9 | Full stack |

**Total estimated timeline: 8-10 weeks** for a single developer.  
**With 2 developers (frontend + backend): 5-6 weeks.**

### Definition of Done (Project-Level)

Hawkseye is considered production-ready when:

- [ ] Zero hardcoded/simulated data exists in any UI path
- [ ] All API endpoints enforce role-based access control
- [ ] Unauthorized users cannot infer the existence of hidden data
- [ ] Live telemetry is delivered within 1 second via WebSocket
- [ ] Telemetry is scoped to the user's mission assignments
- [ ] Audit logs explain every system change
- [ ] Dashboards align with real operational roles
- [ ] The system is defensible under basic security review
- [ ] PostgreSQL is the production database
- [ ] Redis is the channel layer backend
- [ ] All documentation is current

---

*Created: 2026-02-16*  
*Classification: Engineering Plan — Production Transition*  
*Scope Version: 1.0*
