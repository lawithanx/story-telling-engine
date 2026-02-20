# Player1 Data Migration - Quick Reference

## Current State

### Existing Infrastructure ✅
- **Database**: `player1sport` database configured as `legacy` in Django settings
- **Models**: `LegacyRawData` and `LegacyMetaData` in `legacy_data` app
- **Router**: `LegacyDatabaseRouter` already routes `legacy_data` app to `legacy` DB
- **Library**: `session_data/src/player1/` contains report generation code

### What's Missing ❌
- Models for `p1_dev_processed` and `p1_dev_summaries` tables
- Admin screens for viewing Player1 data
- Router for `data_processing` app
- Data migration script (legacy → Django models)
- PDF report generation (currently only HTML)

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Legacy Database (player1sport)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ p1_dev_raw   │  │ p1_dev_meta  │  │ p1_dev_      │      │
│  │              │  │              │  │ processed    │      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐                                            │
│  │ p1_dev_      │                                            │
│  │ summaries    │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Migration Script
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Django Models (data DB)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ User         │  │ Device       │  │ Session      │      │
│  │ (Players/    │  │              │  │              │      │
│  │  Coaches)    │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Team         │  │ Session     │                        │
│  │              │  │ Participant │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Report Generation
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Reports                                   │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ HTML Report  │  │ PDF Report   │                        │
│  │ (existing)   │  │ (NEW)        │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Database Analysis
- [ ] Connect to `player1sport` DB and inspect schema
- [ ] Document `p1_dev_raw` structure
- [ ] Document `p1_dev_processed` structure  
- [ ] Document `p1_dev_meta` structure (use existing `LegacyMetaData`)
- [ ] Document `p1_dev_summaries` structure
- [ ] Create ER diagram
- [ ] Analyze CSV metadata file

### Phase 2: Models & Router
- [ ] Create `Player1ProcessedData` model
- [ ] Create `Player1SessionSummary` model
- [ ] Create `DataProcessingRouter` class
- [ ] Add router to `DATABASE_ROUTERS` in settings
- [ ] Test model queries

### Phase 3: Admin Screens
- [ ] Admin for `LegacyRawData` (read-only)
- [ ] Admin for `LegacyMetaData` (CRUD)
- [ ] Admin for `Player1ProcessedData` (read-only)
- [ ] Admin for `Player1SessionSummary` (read-only)
- [ ] Add filters and search
- [ ] Test admin interface

### Phase 4: Data Migration
- [ ] Create migration command script
- [ ] Map athletes → Users
- [ ] Map device_ids → Devices
- [ ] Map event descriptions → Teams/Organizations
- [ ] Map event_ids → Sessions
- [ ] Map (event_id, device_id) → SessionParticipants
- [ ] Test on small dataset
- [ ] Run full migration
- [ ] Validate results

### Phase 5: PDF Reports
- [ ] Install WeasyPrint
- [ ] Create `generate_player_session_pdf()` function
- [ ] Create `generate_team_session_pdf()` function
- [ ] Add `pdf_report_url` to Session model
- [ ] Create API endpoints
- [ ] Test PDF generation
- [ ] Optimize PDF output

---

## Key Files to Create/Modify

### New Files
1. `backend/webapp/apps/data_processing/models.py` - New models
2. `backend/webapp/apps/data_processing/router.py` - Database router
3. `backend/webapp/apps/data_processing/admin.py` - Admin screens
4. `backend/webapp/apps/data_processing/reports.py` - PDF generation
5. `backend/webapp/apps/data_processing/management/commands/migrate_player1_data.py` - Migration script

### Files to Modify
1. `backend/webapp/core/settings.py` - Add router to `DATABASE_ROUTERS`
2. `backend/webapp/core/settings_local.py` - Ensure `legacy` DB configured
3. `backend/webapp/apps/users/models.py` - Add `pdf_report_url` to Session (if needed)

---

## Database Tables Reference

### Legacy Tables (player1sport DB)
- `p1_dev_raw` - Raw GPS/accelerometer data
- `p1_dev_processed` - Processed data with calculated metrics
- `p1_dev_meta` - Session metadata (event_id, device_id, athlete, dates)
- `p1_dev_summaries` - Aggregated session statistics

### Django Models (data DB)
- `users_user` - Users (players, coaches)
- `users_device` - Devices
- `users_organization` - Organizations
- `users_team` - Teams
- `users_session` - Sessions (matches/practices)
- `users_sessionparticipant` - Session participants

---

## Quick Commands

### Database Analysis
```python
# Django shell
python manage.py shell
from apps.legacy_data.models import LegacyMetaData
from django.db import connection

# Check table structure
with connection.cursor() as cursor:
    cursor.execute("DESCRIBE p1_dev_processed")
    print(cursor.fetchall())
```

### Test Models
```python
# Test legacy model access
from apps.legacy_data.models import LegacyMetaData
metadata = LegacyMetaData.objects.using('legacy').all()[:10]
for m in metadata:
    print(f"Event {m.event_id}, Device {m.device_id}, Athlete {m.athlete}")
```

### Run Migration
```bash
python manage.py migrate_player1_data --dry-run
python manage.py migrate_player1_data
```

---

## Next Immediate Steps

1. **Start with database analysis** - Connect and inspect tables
2. **Create missing models** - `Player1ProcessedData` and `Player1SessionSummary`
3. **Create router** - Route `data_processing` app to `legacy` DB
4. **Test access** - Verify we can read from legacy tables
5. **Then proceed** with migration and PDF generation

---

## Questions to Answer During Analysis

1. What columns exist in `p1_dev_processed`?
2. What columns exist in `p1_dev_summaries`?
3. How are athletes identified? (name only, or ID?)
4. How are teams/organizations identified in metadata?
5. What's the relationship between event_id and sessions?
6. Are there any data quality issues to handle?








