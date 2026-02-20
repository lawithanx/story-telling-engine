# Running Hawkseye

This document provides instructions on how to set up and run the Hawkseye project locally.

## Prerequisites

1.  **Python 3.10+**
2.  **Node.js 18+** & **npm**
3.  **Redis** (Optional but recommended for telemetry processing)

## Project Structure

*   `/backend`: Django application
*   `/frontend`: React application (Vite-powered)

---

## 1. Backend Setup

### Create and Activate Virtual Environment
```bash
cd backend
python3 -m venv venv_hawkseye
source venv_hawkseye/bin/activate
```

### Install Dependencies
```bash
pip install -r webapp/core/requirements.txt
```

### Environment Variables
Ensure a `.env` file exists in `backend/webapp/` with following minimum settings:
```ini
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=*
DB_NAME=db.sqlite3
REDIS_URL=redis://127.0.0.1:6379/6
```

### Run Migrations
```bash
cd webapp
python manage.py makemigrations
python manage.py migrate
```

### Create Superuser (if needed)
```bash
python manage.py createsuperuser
```
*Note: A default superuser `jaguar@dev.com` with password `jesus87654321` was created during initial setup.*

### Start Backend Server
```bash
python manage.py runserver 0.0.0.0:8000
```

---

## 2. Frontend Setup

### Install Dependencies
```bash
cd frontend
npm install
```

### Start Frontend Development Server
```bash
npm run dev
```

The frontend will be accessible at `http://localhost:5173`.

---

## 3. Accessing the Application

*   **Main Application:** [http://localhost:5173/](http://localhost:5173/)
*   **Django Admin:** [http://localhost:8000/admin/](http://localhost:8000/admin/)

The backend (on port 8000) will automatically redirect the root URL to the frontend (on port 5173).

## 4. Troubleshooting

*   **Database Errors:** If you encounter migration issues, ensure `db.sqlite3` is deleted and migrations are re-run from a clean state.
*   **API Connection:** If the frontend cannot communicate with the backend, ensure the `proxy` settings in `frontend/vite.config.ts` point to the correct backend address (default: `http://127.0.0.1:8000`).
*   **Redis:** If background tasks (telemetry) are not processing, ensure Redis is running: `redis-server`.
