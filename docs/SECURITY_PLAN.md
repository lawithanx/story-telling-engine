# Hawkseye — Security Plan

**Version**: 1.0  
**Date**: 2026-02-16  
**Classification**: Internal — Security Reference

---

## 1. Security Principles

| Principle | Application |
|-----------|-------------|
| **Zero Trust** | Every request is authenticated and authorized. No implicit trust from network position. |
| **Defence in Depth** | Multiple layers: device auth → transport → API auth → RBAC → audit |
| **Least Privilege** | Operators see only their command center's data. Read-only by default. |
| **Immutable Audit** | Every API access logged. Logs are append-only, never deleted. |
| **Separation of Concerns** | Ingestion pipeline ≠ visualization layer. Billing ≠ tactical. |

---

## 2. Device Identity & Ingestion Security

### 2.1 Device Authentication

Every device has a unique identity anchored to its Iridium modem.

| Control | Implementation | Status |
|---------|----------------|--------|
| **IMEI Whitelist** | `AssetComms` table stores registered IMEIs. Ingestion endpoint rejects packets from unknown IMEIs. | 🔴 Not enforced yet |
| **Device ↔ Asset Binding** | `AssetComms.host` → `TacticalAsset` (OneToOne). Modem must be bound to a registered asset. | ✅ Model exists |
| **CDR Dedup** | `RawPacket.cdr_reference` is `unique=True`. Duplicate packets rejected at DB level. | ✅ Enforced |

### 2.2 Replay Protection

| Control | Implementation | Status |
|---------|----------------|--------|
| **Timestamp Window** | Reject packets where `device_time` is >48 hours in the past or any time in the future. | 🔴 Not enforced |
| **CDR Sequence** | Each Iridium message has a monotonically increasing CDR. Reject if CDR ≤ last seen CDR for that modem. | 🔴 Not enforced |
| **Nonce / Session** | Iridium SBD doesn't support application-level nonces; rely on CDR uniqueness. | N/A |

### 2.3 Ingestion Endpoint Security

```
POST /api/v1/ingest/
Authorization: Bearer <device-api-key>

Validation pipeline:
  1. API key valid?                 → 401 if not
  2. IMEI in AssetComms?           → 403 if unknown device
  3. CDR reference unique?         → 409 if duplicate
  4. Timestamp within ±48h?        → 422 if stale/future
  5. Payload size ≤ 340 bytes?     → 413 if oversized
  6. Decode binary → Telemetry     → 422 if malformed
  7. Store RawPacket + Telemetry   → 201 Created
```

> [!IMPORTANT]
> The ingestion endpoint does **not exist yet**. This is the #1 backend ticket.

---

## 3. Operator Authentication & Authorization

### 3.1 Authentication Stack

| Layer | Technology | Config |
|-------|------------|--------|
| Token type | JWT (access + refresh) | Access: 30 min, Refresh: 24 hr |
| Password hash | Django PBKDF2 (260,000 iterations) | Default |
| Session tracking | `AuditLog` middleware | Logs IP, path, method, user |
| CSRF | Django middleware | Enabled for browser sessions |

### 3.2 Role-Based Access Control (RBAC)

5-tier hierarchy implemented via `OperationalRole` model:

| Role | Can View Telemetry | Can View All Assets | Can Modify Config | Can Manage Users | Can Access Billing |
|------|-------------------|--------------------|--------------------|-----------------|-------------------|
| `OBSERVER` | ✅ (read-only) | Own CC only | ❌ | ❌ | ❌ |
| `FIELD_OPERATOR` | ✅ (assigned assets) | Own CC only | ❌ | ❌ | ❌ |
| `ANALYST` | ✅ (all in CC) | Own CC only | ❌ | ❌ | ❌ |
| `MISSION_COMMANDER` | ✅ (all in CC) | Own CC only | ✅ | ✅ (within CC) | ✅ |
| `ADMIN` | ✅ (all) | ✅ All | ✅ | ✅ | ✅ |

> [!WARNING]
> RBAC model exists but **permission classes are not yet enforced** on API views. All endpoints are currently open to any authenticated user.

### 3.3 Read-Only Dashboards

| Principle | Implementation |
|-----------|----------------|
| Operators cannot mutate telemetry | API views use `GET`-only (no POST/PUT/DELETE on telemetry endpoints) |
| No browser-side write capability | Frontend only calls read endpoints |
| Write operations restricted | Device config changes require `MISSION_COMMANDER` or higher |

---

## 4. Visual Security Indicators

### 4.1 Freshness Visualization

Military dashboards must make **data age visually obvious**:

| Freshness State | Threshold | Map Marker | Table Badge | Color |
|----------------|-----------|------------|-------------|-------|
| `live` | < 5 minutes | Solid, pulsing | Green badge | `#10B981` |
| `recent` | < 1 hour | Solid, static | Blue badge | `#3B82F6` |
| `stale` | < 24 hours | Faded (50% opacity) | Yellow badge | `#F59E0B` |
| `silent` | > 24 hours | Dimmed + warning icon | Gray badge + ⚠️ | `#6B7280` |

### 4.2 Confidence Score

Every `AssetState` carries a `confidence` float (0.0–1.0):

| Confidence | Meaning | Visual |
|------------|---------|--------|
| 0.9–1.0 | High GPS accuracy, fresh data | Full-opacity marker |
| 0.5–0.89 | Moderate — older data or reduced accuracy | 70% opacity |
| 0.1–0.49 | Low — very old or poor GPS | 40% opacity, dashed outline |
| 0.0 | No data available | Empty marker / "?" icon |

### 4.3 Warning Panels

| Condition | Alert | Location |
|-----------|-------|----------|
| Asset silent > 24h | "NO CONTACT" warning panel | Dashboard header + map popup |
| Battery < 3.2V | "LOW BATTERY" warning | Asset detail + table icon |
| Multiple assets silent | "X ASSETS OFFLINE" banner | Dashboard summary bar |
| Confidence < 0.3 | "LOW CONFIDENCE" badge | Map marker tooltip |

---

## 5. Audit Trail

### 5.1 AuditLog Model

| Field | Type | Purpose |
|-------|------|---------|
| `timestamp` | datetime | When the action occurred |
| `user` | FK→User | Who performed it (null for system) |
| `action` | string | `API_REQUEST`, `LOGIN`, `PERMISSION_CHANGE`, etc. |
| `target_model` | string | Model name affected |
| `target_id` | string | Object ID affected |
| `detail` | JSON | Request path, method, IP, response code |

### 5.2 What Gets Logged

| Event | Logged? |
|-------|---------|
| Every API request to `/api/` | ✅ Via middleware |
| Login / logout | ✅ Auth signal |
| Permission / role changes | ✅ On OperationalRole save |
| Failed authentication | ✅ Via middleware |
| Telemetry ingestion | ✅ On Telemetry save |

### 5.3 Immutability

> [!CAUTION]
> AuditLog records **must never be edited or deleted**. The Django admin registration for AuditLog disables add, change, and delete permissions.

---

## 6. Transport Security

| Control | Dev | Production |
|---------|-----|------------|
| HTTPS / TLS | ❌ (HTTP localhost) | ✅ Required (Nginx + Let's Encrypt) |
| HSTS | ❌ | ✅ `Strict-Transport-Security: max-age=31536000` |
| CORS | Permissive | ✅ Allowlist only (frontend domain) |
| CSP | ❌ | ✅ Restrict script sources |
| Rate limiting | ❌ | ✅ `django-ratelimit` on auth + ingestion |

---

## 7. Data Protection

| Control | Implementation |
|---------|----------------|
| SQL injection | Django ORM — parameterized queries |
| XSS | React auto-escaping + CSP headers |
| CSRF | Django CSRF middleware (browser sessions) |
| Input validation | DRF serializer validation |
| Sensitive data | Passwords hashed (PBKDF2), JWT secrets in env vars |
| Backup | Daily DB backup, encrypted at rest |

---

## 8. Incident Response Playbooks

### Playbook A: Unknown IMEI Attempting Ingestion
1. **Detect**: Ingestion endpoint returns 403, logged in AuditLog
2. **Investigate**: Check IMEI against hardware inventory
3. **Respond**: If legitimate → register in AssetComms. If suspicious → block IP, notify admin.

### Playbook B: Asset Goes Silent
1. **Detect**: AssetState freshness transitions to `silent`
2. **Alert**: Dashboard warning panel activates
3. **Investigate**: Check last known position, battery voltage, modem status
4. **Respond**: Dispatch field team if asset is high-value

### Playbook C: Suspected Credential Compromise
1. **Detect**: AuditLog shows unusual access pattern (new IP, bulk data access)
2. **Respond**: Invalidate JWT tokens, force password reset
3. **Investigate**: Review all access from compromised account
4. **Remediate**: Rotate API keys, reassign roles

---

## 9. Compliance Alignment

| Standard | Relevance |
|----------|-----------|
| NIST CSF | Identify, Protect, Detect, Respond, Recover — all addressed |
| ISO 27001 | Information security management controls covered |
| GDPR | Audit trails, data minimization, purpose limitation |
| CMMC L3 | Access control, audit, incident response (if targeting DoD) |

---

*Last Updated: 2026-02-16*
