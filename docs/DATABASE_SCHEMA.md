# Player1Sport Platform - Database Schema Documentation

## Overview

The Player1Sport platform uses a **dual-database architecture** with MySQL to separate Django core functionality from application-specific data. This design provides better scalability, security, and data isolation.

## Database Architecture

### Database 1: `playerone_website` (Default Database)
**Purpose**: Django framework core functionality

### Database 2: `playerone_data` (Data Database)  
**Purpose**: Application-specific business data

### Database 3: `player1sport` (Legacy Database)
**Purpose**: Read-only access to legacy Player1 device data

## Schema Design Principles

1. **Normalization**: All tables are normalized to 3NF to minimize redundancy
2. **Referential Integrity**: Foreign keys enforce relationships between tables
3. **Soft Deletes**: Important entities use `deleted_at` timestamp instead of hard deletes
4. **Audit Trail**: All tables include `created_at` and `updated_at` timestamps
5. **Indexing**: Strategic indexes on foreign keys and frequently queried columns
6. **Constraints**: Check constraints ensure data validity

## Core Domain Entities

### 1. User Management

#### users_users
**Purpose**: Core user accounts for the platform

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| email | VARCHAR(254) | UNIQUE, NOT NULL | User email (login identifier) |
| first_name | VARCHAR(150) | | User's first name |
| last_name | VARCHAR(150) | | User's last name |
| display_name | VARCHAR(200) | | Preferred display name |
| password | VARCHAR(128) | NOT NULL | Hashed password (PBKDF2) |
| is_active | BOOLEAN | DEFAULT TRUE | Account active status |
| is_rootadmin | BOOLEAN | DEFAULT FALSE | Platform administrator flag |
| last_login | DATETIME | NULL | Last login timestamp |
| created_at | DATETIME | AUTO | Account creation timestamp |
| profile_image | VARCHAR(100) | | Profile image path |
| birth_date | DATE | NULL | Date of birth |
| phone_number | VARCHAR(20) | | Contact phone number |
| gender | VARCHAR(20) | | Gender (MALE/FEMALE/OTHER) |
| emergency_contact | VARCHAR(100) | | Emergency contact information |
| medical_info | TEXT | | Medical information |
| company_name | VARCHAR(200) | | Company/organization name |
| billing_address | VARCHAR(255) | | Billing address |
| billing_city | VARCHAR(100) | | Billing city |
| billing_country | VARCHAR(100) | DEFAULT 'South Africa' | Billing country |

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE KEY (email)

#### users_user_types
**Purpose**: Define user role types with permissions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| name | VARCHAR(50) | NOT NULL | Role name |
| description | TEXT | | Role description |
| permissions | JSON | | Role permissions configuration |
| is_active | BOOLEAN | DEFAULT TRUE | Role active status |
| created_at | DATETIME | AUTO | Creation timestamp |

#### users_auth_sessions
**Purpose**: Track active authentication sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Session identifier |
| user_id | INT | FK → users_users | User reference |
| access_token | TEXT | NOT NULL | JWT access token |
| refresh_token | VARCHAR(255) | UNIQUE, NOT NULL | JWT refresh token |
| created_at | DATETIME | AUTO | Session creation time |
| last_accessed | DATETIME | AUTO_UPDATE | Last access time |
| expires_at | DATETIME | NOT NULL | Session expiration time |
| is_active | BOOLEAN | DEFAULT TRUE | Session active status |
| user_agent | TEXT | | Client user agent |
| ip_address | VARCHAR(45) | | Client IP address |
| device_fingerprint | VARCHAR(255) | | Device fingerprint |
| deleted_at | DATETIME | NULL | Soft delete timestamp |

**Indexes**:
- PRIMARY KEY (id)
- INDEX (user_id, is_active)
- INDEX (refresh_token)
- INDEX (expires_at)

### 2. Organization & Team Structure

#### users_organizations
**Purpose**: Top-level organizational entities (schools, clubs, companies)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| name | VARCHAR(100) | NOT NULL | Organization name |
| description | TEXT | | Organization description |
| logo | VARCHAR(100) | NULL | Logo image path |
| org_rep_color | VARCHAR(7) | DEFAULT '#006CFF' | Brand color (hex) |
| created_at | DATETIME | AUTO | Creation timestamp |
| is_active | BOOLEAN | DEFAULT TRUE | Organization active status |
| created_by_id | INT | FK → users_users | Creator user reference |

**Indexes**:
- PRIMARY KEY (id)
- INDEX (created_by_id)
- INDEX (is_active)

#### users_sports
**Purpose**: Available sports in the platform

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| name | VARCHAR(50) | UNIQUE, NOT NULL | Sport name |
| slug | VARCHAR(50) | UNIQUE, NOT NULL | URL-friendly identifier |
| description | TEXT | | Sport description |
| rules | TEXT | | Sport-specific rules |
| is_active | BOOLEAN | DEFAULT TRUE | Sport active status |

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE KEY (name)
- UNIQUE KEY (slug)

#### users_sport_time_slots
**Purpose**: Default time slot configuration for each sport

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| sport_id | INT | FK → users_sports | Sport reference |
| duration | INT | NOT NULL | Duration in minutes |
| type | VARCHAR(10) | NOT NULL | BREAK or PLAY |
| order | SMALLINT | DEFAULT 0 | Slot order |
| created_at | DATETIME | AUTO | Creation timestamp |

**Indexes**:
- PRIMARY KEY (id)
- INDEX (sport_id, order)

#### users_teams
**Purpose**: Teams within organizations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| name | VARCHAR(100) | NOT NULL | Team name |
| organization_id | INT | FK → users_organizations | Organization reference |
| sport_id | INT | FK → users_sports | Sport reference |
| age_group | VARCHAR(20) | NULL | Age group (e.g., "U15A") |
| season_year | INT | NULL | Season year |
| is_active | BOOLEAN | DEFAULT TRUE | Team active status |
| created_at | DATETIME | AUTO | Creation timestamp |

**Indexes**:
- PRIMARY KEY (id)
- INDEX (organization_id)
- INDEX (sport_id)
- INDEX (is_active)

#### users_team_members
**Purpose**: Team roster (players, coaches, staff)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| user_id | INT | FK → users_users | User reference |
| team_id | INT | FK → users_teams | Team reference |
| role | VARCHAR(20) | NOT NULL | PLAYER/COACH/MANAGER/STAFF |
| jersey_number | INT | NULL | Jersey number (0-99) |
| is_active | BOOLEAN | DEFAULT TRUE | Membership active status |
| joined_date | DATE | AUTO | Join date |

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE KEY (team_id, jersey_number)
- INDEX (user_id)
- INDEX (team_id)

#### users_positions
**Purpose**: Sport-specific positions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| sport_id | INT | FK → users_sports | Sport reference |
| name | VARCHAR(50) | NOT NULL | Position name |
| abbreviation | VARCHAR(10) | NOT NULL | Position abbreviation |
| description | TEXT | | Position description |

### 3. Session Management

#### users_sessions
**Purpose**: Sport sessions (games, practices, training)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| owner_id | INT | FK → users_users | Session creator |
| organization_id | INT | FK → users_organizations | Organization reference |
| team_id | INT | FK → users_teams | Team reference |
| session_type | VARCHAR(20) | NOT NULL | GAME/PRACTICE/TRAINING/OTHER |
| title | VARCHAR(200) | NOT NULL | Session title |
| description | TEXT | | Session description |
| location | VARCHAR(200) | | Session location |
| opposition | VARCHAR(200) | | Opposing team (for games) |
| venue | VARCHAR(200) | | Venue name |
| temperature | INT | NULL | Temperature (°C) |
| weather_conditions | TEXT | | Weather description |
| start_of_halftime | DATETIME | NULL | Break start time |
| duration_of_halftime | SMALLINT | DEFAULT 15 | Break duration (minutes) |
| sport_activity | VARCHAR(50) | | Activity type |
| event_id | INT | NULL | Legacy event ID mapping |
| start_time | DATETIME | NULL | Session start time |
| end_time | DATETIME | NULL | Session end time |
| created_at | DATETIME | AUTO | Creation timestamp |
| processing_status | VARCHAR(20) | DEFAULT 'PENDING' | PENDING/QUEUED/PROCESSING/COMPLETED/FAILED |
| report_url | VARCHAR(500) | NULL | Generated report URL |
| last_processed_at | DATETIME | NULL | Last processing timestamp |
| processing_error | TEXT | NULL | Processing error message |

**Indexes**:
- PRIMARY KEY (id)
- INDEX (owner_id)
- INDEX (organization_id)
- INDEX (team_id)
- INDEX (session_type)
- INDEX (start_time)
- INDEX (processing_status)

#### users_session_participants
**Purpose**: Players/staff participating in a session

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| session_id | INT | FK → users_sessions | Session reference |
| team_member_id | INT | FK → users_team_members | Team member reference |
| user_id | INT | FK → users_users | User reference (fallback) |
| position | VARCHAR(50) | | Position played |
| device_name | VARCHAR(100) | | Assigned device |
| timeline_selections | JSON | | Participation time windows |
| created_at | DATETIME | AUTO | Creation timestamp |

**Indexes**:
- PRIMARY KEY (id)
- INDEX (session_id)
- INDEX (team_member_id)
- INDEX (user_id)

#### users_session_time_slots
**Purpose**: Time slot configuration for a specific session

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| session_id | INT | FK → users_sessions | Session reference |
| duration | INT | NOT NULL | Duration in minutes |
| type | VARCHAR(10) | NOT NULL | BREAK or PLAY |
| order | SMALLINT | DEFAULT 0 | Slot order |
| created_at | DATETIME | AUTO | Creation timestamp |

**Indexes**:
- PRIMARY KEY (id)
- INDEX (session_id, order)

### 4. Device Management

#### devices_devices
**Purpose**: GPS/accelerometer tracking devices

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| serial_number | VARCHAR(32) | UNIQUE, NOT NULL | Device serial number |
| name | VARCHAR(100) | | Device friendly name |
| is_active | BOOLEAN | DEFAULT TRUE | Device active status |
| created_at | DATETIME | AUTO | Registration timestamp |
| last_seen | DATETIME | NULL | Last data transmission |
| created_by_id | INT | FK → users_users | Registering user |
| organization_id | INT | FK → users_organizations | Owning organization |
| permission_config | JSON | | Role-based permissions |

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE KEY (serial_number)
- INDEX (organization_id)
- INDEX (is_active)

#### devices_manufacturer_devices
**Purpose**: Canonical list of manufacturer-provisioned devices

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| serial_number | VARCHAR(32) | UNIQUE, NOT NULL | Device serial number |
| status | VARCHAR(20) | DEFAULT 'active' | active/inactive/maintenance/retired |
| manufacturer | VARCHAR(100) | DEFAULT 'Player1Sport' | Manufacturer name |
| is_active | BOOLEAN | DEFAULT TRUE | Device active status |
| created_at | DATETIME | AUTO | Creation timestamp |
| updated_at | DATETIME | AUTO_UPDATE | Update timestamp |

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE KEY (serial_number)
- INDEX (is_active)
- INDEX (status)
- INDEX (manufacturer)

**Constraints**:
- CHECK (status IN ('active', 'inactive', 'maintenance', 'retired'))

#### devices_device_users
**Purpose**: Device sharing and access control

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| device_id | INT | FK → devices_devices | Device reference |
| user_id | INT | FK → users_users | User reference |
| access_level | VARCHAR(20) | NOT NULL | OWNER/MANAGER/USER/VIEWER |
| created_at | DATETIME | AUTO | Assignment timestamp |

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE KEY (device_id, user_id)
- INDEX (device_id)
- INDEX (user_id)

#### devices_raw_data
**Purpose**: Raw GPS and accelerometer data from devices

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| device_id | INT | FK → devices_devices | Device reference |
| timestamp | DATETIME | NOT NULL | Data timestamp |
| lat | DECIMAL(9,7) | NOT NULL | Latitude (-90 to 90) |
| lon | DECIMAL(10,7) | NOT NULL | Longitude (-180 to 180) |
| speed | FLOAT | NOT NULL | Speed (m/s) |
| direction | SMALLINT | NOT NULL | Direction (0-359°) |
| num_sats | SMALLINT | NOT NULL | Number of satellites (0-50) |
| hdop | SMALLINT | NOT NULL | Horizontal dilution of precision |
| accel_x | SMALLINT | NOT NULL | X-axis acceleration |
| accel_y | SMALLINT | NOT NULL | Y-axis acceleration |
| accel_z | SMALLINT | NOT NULL | Z-axis acceleration |

**Indexes**:
- PRIMARY KEY (id)
- INDEX (device_id, timestamp)

**Constraints**:
- CHECK (lat BETWEEN -90 AND 90)
- CHECK (lon BETWEEN -180 AND 180)
- CHECK (speed >= 0)
- CHECK (direction BETWEEN 0 AND 359)
- CHECK (num_sats BETWEEN 0 AND 50)
- CHECK (hdop BETWEEN 0 AND 100)

### 5. Survey & Wellness Tracking

#### surveys_surveytemplate
**Purpose**: Reusable survey templates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| name | VARCHAR(200) | NOT NULL | Template name |
| description | TEXT | | Template description |
| is_active | BOOLEAN | DEFAULT TRUE | Template active status |
| created_at | DATETIME | AUTO | Creation timestamp |
| updated_at | DATETIME | AUTO_UPDATE | Update timestamp |

#### surveys_surveytemplatequestion
**Purpose**: Questions within survey templates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| template_id | INT | FK → surveys_surveytemplate | Template reference |
| question_text | TEXT | NOT NULL | Question text |
| question_type | VARCHAR(20) | NOT NULL | TEXT/NUMBER/SCALE/CHOICE |
| options | JSON | | Answer options (for CHOICE) |
| order | SMALLINT | DEFAULT 0 | Question order |
| is_required | BOOLEAN | DEFAULT FALSE | Required flag |

#### surveys_survey
**Purpose**: Survey instances linked to sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| session_id | INT | FK → users_sessions | Session reference |
| template_id | INT | FK → surveys_surveytemplate | Template reference |
| title | VARCHAR(200) | NOT NULL | Survey title |
| created_at | DATETIME | AUTO | Creation timestamp |
| is_active | BOOLEAN | DEFAULT TRUE | Survey active status |

#### surveys_surveyresponse
**Purpose**: User responses to surveys

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| survey_id | INT | FK → surveys_survey | Survey reference |
| user_id | INT | FK → users_users | Respondent reference |
| question_id | INT | FK → surveys_surveytemplatequestion | Question reference |
| answer | TEXT | | Answer text/value |
| created_at | DATETIME | AUTO | Response timestamp |

## Relationship Summary

### One-to-Many Relationships
- Organization → Teams
- Organization → Devices
- Team → TeamMembers
- Team → Sessions
- Session → SessionParticipants
- Session → SessionTimeSlots
- Device → RawData
- User → AuthSessions
- User → Devices (created_by)

### Many-to-Many Relationships
- Organization ↔ Sports (users_organizations_sports)
- TeamMember ↔ Positions (users_team_members_positions)
- Device ↔ Users (devices_device_users)

### Inheritance Relationships
- SportTimeSlot → SessionTimeSlot (template pattern)

## Data Integrity Rules

### Cascade Delete Rules
- Organization deleted → Teams deleted
- Team deleted → TeamMembers deleted
- Session deleted → SessionParticipants deleted
- Device deleted → RawData deleted

### Soft Delete Entities
- AuthSession (deleted_at)
- User (is_active flag)
- Organization (is_active flag)
- Team (is_active flag)

## Performance Considerations

### Indexing Strategy
1. **Primary Keys**: All tables have auto-increment integer primary keys
2. **Foreign Keys**: All foreign key columns are indexed
3. **Composite Indexes**: Used for frequently joined columns (e.g., device_id + timestamp)
4. **Unique Constraints**: Enforced on natural keys (email, serial_number)

### Query Optimization
1. **Select Related**: Use for foreign key relationships
2. **Prefetch Related**: Use for many-to-many relationships
3. **Only/Defer**: Select only needed columns for large tables
4. **Batch Operations**: Use bulk_create for mass inserts

### Partitioning Recommendations
- `devices_raw_data`: Partition by timestamp (monthly/yearly)
- `users_auth_sessions`: Partition by created_at (monthly)

## Migration Strategy

### Initial Setup
```bash
# Create databases
mysql -u root -p -e "CREATE DATABASE playerone_website CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE DATABASE playerone_data CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations
python manage.py migrate --database=default
python manage.py migrate --database=data
```

### Adding New Tables
1. Create model in appropriate app
2. Run `python manage.py makemigrations`
3. Review migration file
4. Run `python manage.py migrate --database=data` (or default)

## Backup & Recovery

### Backup Strategy
```bash
# Daily backup
mysqldump -u root -p --databases playerone_website playerone_data > backup_$(date +%Y%m%d).sql

# Incremental backup (binary logs)
mysqlbinlog --start-datetime="2024-01-01 00:00:00" /var/log/mysql/mysql-bin.000001 > incremental.sql
```

### Recovery
```bash
# Full restore
mysql -u root -p < backup_20240101.sql

# Point-in-time recovery
mysql -u root -p < backup_20240101.sql
mysql -u root -p < incremental.sql
```

## Security Best Practices

1. **Principle of Least Privilege**: Database users have minimal required permissions
2. **Encrypted Connections**: Use SSL/TLS for database connections
3. **Password Hashing**: Never store plain-text passwords
4. **Input Validation**: Use Django ORM to prevent SQL injection
5. **Audit Logging**: Track all data modifications

## Monitoring & Maintenance

### Health Checks
- Monitor connection pool usage
- Track slow queries (> 1 second)
- Monitor table sizes and growth
- Check index usage statistics

### Maintenance Tasks
- Weekly: Optimize tables
- Monthly: Analyze and update statistics
- Quarterly: Review and update indexes
- Annually: Archive old data

## Future Schema Enhancements

1. **Audit Trail Table**: Track all data changes
2. **Notification Preferences**: User notification settings
3. **Payment & Billing**: Subscription and payment tracking
4. **File Attachments**: Generic file attachment system
5. **Comments & Notes**: Add notes to sessions/players
6. **Tags & Categories**: Flexible categorization system
