# Hawkseye: Quick Reference Guide

## Project Overview

**Hawkseye** is a real-time overwatch and situational awareness platform for distributed assets and field teams operating in contested environments.

---

## Running the Project

### Start Backend
```bash
cd backend/webapp
../../venv_hawkseye/bin/python manage.py runserver 0.0.0.0:8000
```

### Start Frontend
```bash
cd frontend
npm run dev
```

### Access Points
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/

### Default Credentials
- **Superuser**: `jaguar@dev.com`
- **Password**: `jesus87654321`

---

## Project Structure

```
HAWKSEYE/
├── backend/
│   ├── venv_hawkseye/          # Python virtual environment
│   └── webapp/
│       ├── apps/
│       │   ├── operations/     # Core operations app (CommandCenter, Operator, TacticalAsset, Telemetry)
│       │   ├── accounts/       # User management and authentication
│       │   ├── pages/          # CMS and static pages
│       │   └── mailer/         # Email notifications
│       ├── core/               # Django settings and configuration
│       └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   ├── pages/              # Page components and routing
│   │   ├── voyager-admin/      # Admin interface for asset lookup
│   │   └── main.jsx            # Entry point
│   ├── vite.config.ts          # Vite configuration
│   └── package.json
├── docs/
│   ├── STRATEGIC_POSITIONING.md    # Market positioning and value proposition
│   ├── RBAC_IMPLEMENTATION.md      # Role-based access control plan
│   ├── THREAT_SCENARIOS.md         # Threat mapping and security features
│   ├── REFACTORING_SUMMARY.md      # Summary of strategic changes
│   └── SYSTEM_ARCHITECTURE.md      # Technical architecture
├── README.md
└── RUN_PROJECT.md
```

---

## Core Models (Operations App)

### **CommandCenter**
Organization-level entity managing missions and operators.

### **Operator**
Field agents who submit telemetry and receive directives.

### **Mission**
Operational context grouping assets, operators, and objectives.

### **TacticalAsset**
Physical devices in the field (drones, sensors, trackers).

### **AssetComms**
Communication modules (IMEI, serial numbers, firmware).

### **Telemetry**
Real-time data from assets (GPS, battery, environmental sensors).

---

## Role Definitions

### **Overwatch** (Command/Analyst)
- **Access**: Read all telemetry, view all assets, annotate events
- **UI**: Tactical map, telemetry timeline, threat alerts
- **Restrictions**: Cannot modify assets, access billing, or manage users

### **Operator** (Field Agent)
- **Access**: Submit telemetry for assigned assets, view own status
- **UI**: Simplified asset view, directive inbox, emergency alerts
- **Restrictions**: Cannot view other operators' data or command dashboard

### **Admin** (Organization Owner)
- **Access**: Manage users, billing, audit logs, integrations
- **UI**: Admin console (separate from operational dashboard)
- **Restrictions**: NO access to live telemetry or tactical maps

---

## API Endpoints

### **Authentication**
- `POST /api/token/` - Obtain JWT token
- `POST /api/token/refresh/` - Refresh JWT token
- `POST /api/session/` - Create/validate session
- `POST /api/logout/` - Logout

### **Operations**
- `GET /api/assets/` - List tactical assets
- `GET /api/assets/lookup/` - Search assets by IMEI/serial
- `GET /api/v1/assets/` - Asset list (v1 API)
- `GET /api/v1/assets/{id}/telemetry/` - Telemetry history

### **WebSocket**
- `ws://localhost:8000/ws/telemetry/` - Real-time telemetry feed

---

## Key Technologies

### Backend
- **Django 4.x** - Web framework
- **Django Channels** - WebSocket support
- **PostgreSQL** - Production database (SQLite for dev)
- **Redis** - Session management and caching
- **Django REST Framework** - API framework

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Leaflet** - Tactical mapping
- **Material-UI** - Component library
- **Axios** - HTTP client

---

## Security Features

### **Implemented**
- ✅ JWT authentication
- ✅ CSRF protection
- ✅ Session management with instant revocation
- ✅ WebSocket encryption
- ✅ Audit logging

### **In Progress**
- 🔧 Role-based access control (RBAC)
- 🔧 Multi-factor authentication (MFA)
- 🔧 Feed compartmentalization
- 🔧 Behavioral analytics

---

## Common Tasks

### Create Superuser
```bash
cd backend/webapp
../../venv_hawkseye/bin/python manage.py createsuperuser
```

### Run Migrations
```bash
cd backend/webapp
../../venv_hawkseye/bin/python manage.py makemigrations
../../venv_hawkseye/bin/python manage.py migrate
```

### Build Frontend for Production
```bash
cd frontend
npm run build
```

### Run Tests
```bash
# Backend
cd backend/webapp
../../venv_hawkseye/bin/python manage.py test

# Frontend
cd frontend
npm test
```

---

## Troubleshooting

### Frontend Won't Load
1. Check if `npm run dev` is running
2. Verify no port conflicts on 5173
3. Check browser console for errors
4. Clear browser cache and reload

### Backend API Errors
1. Check if `manage.py runserver` is running
2. Verify database migrations are up to date
3. Check Django logs in terminal
4. Verify `.env` file exists with required variables

### WebSocket Connection Fails
1. Verify Redis is running: `redis-cli ping`
2. Check WebSocket URL in frontend code
3. Verify CORS settings in Django
4. Check browser console for connection errors

### Database Issues
1. Delete `db.sqlite3` and re-run migrations
2. Check PostgreSQL connection if using production DB
3. Verify database credentials in `.env`

---

## Environment Variables

### Backend (`.env` in `backend/webapp/`)
```ini
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=*
DB_NAME=db.sqlite3
REDIS_URL=redis://127.0.0.1:6379/6
RECAPTCHA_PUBLIC_KEY=your-key
RECAPTCHA_PRIVATE_KEY=your-key
```

### Frontend (`conf.jsx`)
```javascript
export const DEBUG = true;
export const BASE_URL = 'http://localhost:8000';
export const BASE_DOMAIN = 'localhost';
```

---

## Documentation Index

1. **README.md** - Project overview and quick start
2. **RUN_PROJECT.md** - Detailed setup instructions
3. **STRATEGIC_POSITIONING.md** - Market positioning and value proposition
4. **RBAC_IMPLEMENTATION.md** - Role-based access control implementation plan
5. **THREAT_SCENARIOS.md** - Threat mapping and security features
6. **REFACTORING_SUMMARY.md** - Summary of strategic refactoring
7. **SYSTEM_ARCHITECTURE.md** - Technical architecture details

---

## Next Steps (Implementation Roadmap)

### Week 1: Backend RBAC
- Add `role` field to Profile model
- Create permission classes
- Protect API endpoints

### Week 2: Frontend Role Routing
- Create role-based route guards
- Build role-specific layouts
- Implement role-based navigation

### Week 3: Billing Abstraction
- Create separate admin console
- Move billing views
- Remove billing from operational UI

### Week 4: Feed Compartmentalization
- Implement team-based isolation
- Add instant revocation
- Create granular access controls

### Week 5: Security Audit
- Penetration testing
- Code review
- Performance testing

---

## Support and Contact

For technical issues, refer to:
- GitHub Issues (if applicable)
- Internal documentation in `/docs`
- Development team contact

---

*Last Updated: 2026-02-15*  
*Version: 1.0.0*  
*Status: Development*
