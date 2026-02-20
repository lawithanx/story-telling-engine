# Player1 Data Migration & Integration Plan

## Executive Summary

This document outlines a comprehensive plan to migrate Player1 device data from the legacy `player1sport` database (with `p1_dev_*` tables) into the Django application's data models, and generate PDF reports matching the existing HTML report functionality.

## Goals

1. **Database Analysis**: Understand the structure of the `player1sport` database and its tables
2. **Model Creation**: Create Django models for Player1 data in the `data_processing` app
3. **Database Router**: Configure routing for `data_processing` app to use the `legacy` database
4. **Admin Interface**: Create admin screens for viewing/managing Player1 data
5. **Data Migration**: Migrate data from `p1_dev_*` tables to Django models (Users, Teams, Sessions, Devices)

// LEAVE FOR NOW 6. **Report Generation**: Generate PDF reports matching the HTML reports from `session_data` library

---

## Phase 1: Database Analysis & Discovery

### 1.1 Analyze Legacy Database Structure

**Tasks:**
- Connect to `player1sport` database and inspect schema
- Document all tables: `p1_dev_raw`, `p1_dev_processed`, `p1_dev_meta`, `p1_dev_summaries`
- Map table columns to Django model fields
- Identify relationships between tables
- Document data types, constraints, and indexes

**Deliverables:**
- Database schema documentation
- ER diagram showing table relationships
- Column mapping document (legacy → Django models)

**Tools:**
- MySQL client / Django shell
- SQL queries to inspect structure
- `INFORMATION_SCHEMA` queries

### 1.2 Analyze CSV Data Structure

**Tasks:**
- Review `player1_sessions_metadata.csv` structure
- Review sample CSV data files in `pv_db/`
- Map CSV columns to database schema
- Identify data quality issues

**Deliverables:**
- CSV schema documentation
- Data quality report

---

## Phase 2: Model Creation & Database Router

### 2.1 Create Django Models

**Note:** The `legacy_data` app already has `LegacyRawData` and `LegacyMetaData` models. We need to add missing models.

**Location:** `backend/webapp/apps/data_processing/models.py` (NEW) or extend `legacy_data/models.py`

**Models to Create/Extend:**

1. **Player1ProcessedData** (maps to `p1_dev_processed`) - NEW
   - Fields: All raw fields plus calculated: `distance`, `is_sprint`, `sprint_num`, `zone`, `period_num`, `seconds_since_start`, `datetime`, `timestamp`
   - Indexes: `(device_id, timestamp)`, `(device_id, event_id)`
   - Use `managed = False` (table exists)

2. **Player1SessionSummary** (maps to `p1_dev_summaries`) - NEW
   - Fields: `device_id`, `event_id`, `distance`, `max_speed`, `distance_sprint`, `sprint_count`, `duration`, plus zone distances
   - Indexes: `(device_id, event_id)`
   - Use `managed = False` (table exists)

**Existing Models (in `legacy_data` app):**
- ✅ `LegacyRawData` - Already exists, maps to `p1_dev_raw`
- ✅ `LegacyMetaData` - Already exists, maps to `p1_dev_meta`

**Database:** Use `legacy` database (already configured in settings)

### 2.2 Create Database Router

**Location:** `backend/webapp/apps/data_processing/router.py`

**Router Configuration:**
- Route `data_processing` app models to `legacy` database
- Allow read/write operations
- Handle migrations appropriately (most models will have `managed = False`)

**Update:** `core/settings.py` to include router in `DATABASE_ROUTERS`

**Note:** `LegacyDatabaseRouter` already exists and routes `legacy_data` app. We'll create a similar router for `data_processing` app.

### 2.3 Create Admin Screens

**Location:** `backend/webapp/apps/data_processing/admin.py`

**Admin Classes:**
- `Player1RawDataAdmin` - Read-only, with filters (device_id, timestamp range)
- `Player1ProcessedDataAdmin` - Read-only, with filters and search
- `Player1SessionMetadataAdmin` - Full CRUD, filters by event_id, device_id, date
- `Player1SessionSummaryAdmin` - Read-only, with filters and aggregations

**Features:**
- List views with pagination
- Filters for common queries
- Export functionality (CSV)
- Links between related models

---

## Phase 3: Data Mapping & Migration Strategy

### 3.1 Map Legacy Data to Django Models

**Mapping Strategy:**

1. **Users (Coaches/Players)**
   - Source: `p1_dev_meta.athlete_name` → `users.User`
   - Create users from unique athlete names
   - Default role: `PLAYER`
   - Email generation: `{athlete_name.lower().replace(' ', '.')}@player1sport.com` (or use metadata if available)

2. **Devices**
   - Source: `p1_dev_meta.device_id` → `devices.Device`
   - Create devices from unique device_ids
   - Serial number: `DEV-{device_id}`
   - Name: `Device {device_id}`

3. **Organizations & Teams**
   - Source: Analyze `p1_dev_meta.description` for team names
   - Create organization: "Player1 Trial" (or extract from metadata)
   - Create teams based on event groupings
   - Map athletes to teams via `TeamMember`

4. **Sessions**
   - Source: `p1_dev_meta.event_id` → `users.Session`
   - One Session per unique `event_id`
   - Map fields:
     - `title`: `description` from metadata
     - `start_time`: `start_dt`
     - `end_time`: `end_dt`
     - `session_type`: Infer from description (GAME/PRACTICE)
     - `team`: Link to team created above

5. **SessionParticipants**
   - Source: `p1_dev_meta` rows → `users.SessionParticipant`
   - One participant per (event_id, device_id) combination
   - Link to `TeamMember` via user/device mapping

### 3.2 Migration Script

**Location:** `backend/webapp/apps/data_processing/management/commands/migrate_player1_data.py`

**Process:**
1. Read from `LegacyMetaData` (legacy database) - use existing model
2. Create/update Users from unique athlete names
3. Create/update Devices from unique device_ids
4. Create/update Organizations/Teams from event descriptions
5. Create/update Sessions from unique event_ids
6. Create/update SessionParticipants from (event_id, device_id) combinations
7. Link raw/processed data to sessions via foreign keys (if needed)

**Data Sources:**
- Use `LegacyMetaData.objects.using('legacy')` to read metadata
- Use `LegacyRawData` for raw data queries (raw SQL recommended due to no PK)

**Features:**
- Dry-run mode
- Progress logging
- Error handling and rollback
- Duplicate detection
- Batch processing for large datasets

---

## Phase 4: Report Generation (HTML → PDF)

### 4.1 Analyze Current HTML Report Structure

**Source:** `session_data/src/player1/player_session.py` and `team_session.py`

**Components:**
- Player Session Reports:
  - Metadata table
  - Summary statistics
  - Plots (speed, distance, zones, GPS map)
  - Sprint table
  - Survey data (if available)

- Team Session Reports:
  - Event metadata
  - Summary table (all players)
  - Summary plots (bar charts, pie charts)
  - Survey data (if available)

### 4.2 PDF Generation Strategy

**Approach:** Convert HTML to PDF using one of:
1. **WeasyPrint** (recommended) - HTML/CSS to PDF, supports CSS well
2. **ReportLab** - Direct PDF generation (more control, more code)
3. **Playwright/Puppeteer** - Headless browser rendering (best HTML fidelity)

**Recommendation:** Use **WeasyPrint** for:
- Good CSS support
- Handles matplotlib-generated images
- Python-native
- Can use existing HTML templates

### 4.3 Implementation Plan

**Location:** `backend/webapp/apps/data_processing/reports.py`

**Functions:**
1. `generate_player_session_pdf(session_id, device_id)` 
   - Generate HTML using `player_session.prepare_player_session_api()`
   - Convert HTML to PDF
   - Save to media directory
   - Return PDF path

2. `generate_team_session_pdf(session_id)`
   - Generate HTML using `team_session.prepare_team_session_api()`
   - Convert HTML to PDF
   - Save to media directory
   - Return PDF path

**Integration:**
- Add `pdf_report_url` field to `Session` model
- Update processing status when PDF is generated
- Serve PDFs via Django media/static files

**Template Modifications:**
- Ensure HTML templates are PDF-friendly (page breaks, margins)
- Optimize images for PDF (resolution, format)
- Add page numbers, headers/footers

---

## Phase 5: Integration & Testing

### 5.1 API Endpoints

**Location:** `backend/webapp/apps/data_processing/views.py`

**Endpoints:**
- `GET /api/data-processing/sessions/{session_id}/raw-data/` - Get raw data for session
- `GET /api/data-processing/sessions/{session_id}/processed-data/` - Get processed data
- `GET /api/data-processing/sessions/{session_id}/summary/` - Get summary stats
- `POST /api/data-processing/sessions/{session_id}/generate-pdf/` - Trigger PDF generation
- `GET /api/data-processing/sessions/{session_id}/pdf/` - Download PDF

### 5.2 Testing Strategy

**Unit Tests:**
- Model creation and queries
- Data migration logic
- PDF generation functions

**Integration Tests:**
- End-to-end migration workflow
- Report generation with real data
- Admin interface functionality

**Data Validation:**
- Compare migrated data counts with source
- Verify relationships are correct
- Validate report accuracy

---

## Implementation Order

### Step 1: Database Analysis (Week 1)
- [ ] Connect to `player1sport` database
- [ ] Document all table schemas
- [ ] Analyze sample data
- [ ] Create ER diagram

### Step 2: Models & Router (Week 1)
- [ ] Create Django models
- [ ] Create database router
- [ ] Update settings
- [ ] Run migrations
- [ ] Create admin screens
- [ ] Test admin interface

### Step 3: Data Migration (Week 2)
- [ ] Write migration script
- [ ] Test on small dataset
- [ ] Run full migration
- [ ] Validate migrated data
- [ ] Fix any issues

### Step 4: Report Generation (Week 2-3)
- [ ] Install WeasyPrint
- [ ] Create PDF generation functions
- [ ] Test HTML → PDF conversion
- [ ] Integrate with Session model
- [ ] Create API endpoints
- [ ] Test end-to-end

### Step 5: Integration & Polish (Week 3)
- [ ] Add API endpoints
- [ ] Frontend integration (if needed)
- [ ] Error handling
- [ ] Documentation
- [ ] Performance optimization

---

## Technical Considerations

### Database Connections
- Use `using='legacy'` for all legacy database queries
- Ensure connection pooling is configured
- Handle connection timeouts gracefully

### Performance
- Batch operations for large datasets
- Use `bulk_create` for mass inserts
- Index foreign keys and frequently queried fields
- Consider async processing for PDF generation

### Error Handling
- Log all migration steps
- Provide rollback capability
- Handle duplicate data gracefully
- Validate data before migration

### Security
- Admin screens should be restricted to authorized users
- PDF generation should check permissions
- Validate session ownership before generating reports

---

## Dependencies

**Python Packages:**
- `weasyprint` - HTML to PDF conversion
- `pandas` - Data processing (already in player1 library)
- `sqlalchemy` - Database access (already in player1 library)

**Django:**
- Existing models in `users` app
- Database router infrastructure
- Admin interface (django-unfold)

---

## Success Criteria

1. ✅ All legacy data accessible via Django models
2. ✅ Admin screens functional for viewing/managing data
3. ✅ Data successfully migrated to Django models
4. ✅ PDF reports generated matching HTML reports
5. ✅ Reports accessible via API endpoints
6. ✅ All relationships (Users, Teams, Sessions) correctly mapped

---

## Next Steps

1. **Start with Phase 1**: Database analysis
2. **Review findings** before proceeding to model creation
3. **Iterate** based on discovered data structure
4. **Test incrementally** at each phase

---

## Notes

- The `player1sport` database is already configured as `legacy` in settings
- The player1 library expects specific table names (`p1_dev_*`)
- Existing HTML reports work - we're replicating functionality in PDF
- Consider keeping legacy tables for reference during migration

