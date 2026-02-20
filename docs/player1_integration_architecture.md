# Player1 Data Pipeline Integration Architecture

## Executive Summary

This document outlines the architectural design for integrating the `player1` sports data processing library into the Player1 web application. The goal is to enable a seamless user experience where clicking "Process Report" in the frontend triggers an asynchronous background task that ingests, cleans, processes, and visualizes GPS/accelerometer data, ultimately generating an interactive HTML report.

## High-Level Architecture

The system follows an Event-Driven Architecture pattern using Celery for background task management to ensure the web server remains responsive during heavy data processing.

```mermaid
graph LR
    A[Frontend (React)] -- POST /api/sessions/:id/process --> B[Django API]
    B -- Enqueue Task --> C[Celery Worker]
    C -- 1. Ingest Raw Data --> D[Player1 Lib (Data Prep)]
    C -- 2. Process Metrics --> E[Player1 Lib (Analysis)]
    C -- 3. Fetch Surveys --> I[Survey Models]
    C -- 4. Generate Plots --> F[Player1 Lib (Visualization)]
    D & E & F -- Read/Write --> G[Data Store (DB/Files)]
    C -- Update Status --> H[PostgreSQL (Session Model)]
    A -- Poll Status --> H
```

## Component Design

### 1. Backend (Django)

#### A. Database Models
We need to track the state of data processing on the `Session` model.

**`apps/users/models.py` (Session)**
- `processing_status`: Enum (`PENDING`, `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`)
- `report_url`: Path to the generated HTML report (e.g., `/media/reports/session_123.html`)
- `last_processed_at`: Timestamp

#### B. Asynchronous Tasks (`apps/data_processing/tasks.py`)
We will utilize the existing `Player1DataProcessor` wrapper class.

**Task: `process_session_data(session_id)`**
1.  **Retrieve Context**: Fetch `Session` object by ID.
2.  **Update Status**: Set `processing_status = PROCESSING`.
3.  **Prepare Metadata**: Extract start/end times, device IDs, and player mappings from the `Session` object.
4.  **Execution**:
    *   Initialize `Player1DataProcessor`.
    *   **Data Prep**: Call `processor.process_data()`: Cleans raw data, calculates speed/zones/sprints.
    *   **Survey Integration**: Fetch `SurveyResponse` data linked to this `Session` (via `apps.surveys.models.Survey`). Aggregate qualitative scores (e.g., RPE, Wellness).
    *   **Summary**: Call `processor.generate_summary()`: Aggregates team stats.
    *   **Reporting**: Call `processor.generate_plots()`: Creates charts and compiles the HTML report. *Note: The template in `team_summary.py` should be updated to inject the Survey/Wellness data.*
5.  **Completion**:
    *   Save the generated HTML path to `session.report_url`.
    *   Set `processing_status = COMPLETED`.
    *   Handle exceptions by setting `processing_status = FAILED` and logging errors.

#### C. API Endpoints (`apps/data_processing/views.py`)
- `POST /api/sessions/{id}/process/`: Triggers the Celery task. Returns 202 Accepted.
- `GET /api/sessions/{id}/status/`: Returns current processing status and report URL.

### 2. Frontend (React)

**`pages/core/sessions.jsx`**
- **"Process Report" Button Logic:**
    - If `status === PENDING/FAILED`: Button says "Process Report". Clicking sends `POST` request.
    - If `status === PROCESSING`: Button is disabled, shows spinner/loader. App polls `status` endpoint every 5s.
    - If `status === COMPLETED`: Button becomes "View Report", linking to `report_url`.

### 3. Data Flow & File Structure

The `player1` library relies on a specific file structure. The Celery task must ensure this environment is set up correctly.

- **Raw Data Source**: `media/uploads/raw/{session_id}/` (or S3 bucket)
- **Processing Workspace**: `session_data/data/` (Managed by `PLAYER1_DATA_DIR` env var)
- **Output**: `media/reports/{session_id}/`

## Detailed Workflow

1.  **User Action**: User configures a Session with Participants (Player + Device) and Time Windows.
2.  **Trigger**: User clicks "Process Report".
3.  **Task Dispatch**: API receives request, validates Session has required data (valid time window, assigned devices), and dispatches `process_session_data` task.
4.  **Processing (Celery)**:
    *   **Step 1: Metadata**: Script generates `player1data_session_metadata.csv` based on the Session's participants (mapping Device ID -> Player Name).
    *   **Step 2: Ingestion**: `raw_write.py` (via `ingest_raw_data`) reads device files matching the time window and writes to the raw database/files.
    *   **Step 3: Prep**: `data_prep.py` calculates physics metrics (velocity, load).
    *   **Step 4: Survey Data**: The task queries `Survey` objects where `session_id=current_session`. It compiles a summary DataFrame of subjective scores (Wellness/RPE).
    *   **Step 5: Summary**: `team_summary.py` generates the HTML report using `HTML_TEAM_SUMMARY_TEMPLATE`. The Survey DataFrame is passed as an additional argument to `create_html_team_summary` to be rendered as a "Player Feedback" table.
5.  **Result**: The final HTML file is saved. The user is notified (via polling or WebSocket) that the report is ready.

## Implementation Steps

1.  **Infrastructure**: Ensure Celery and Redis/RabbitMQ are configured in the deployment environment.
2.  **Model Migration**: Add `processing_status` and `report_url` fields to `users.Session`.
3.  **Task Implementation**: Create `backend/webapp/apps/data_processing/tasks.py` implementing the logic above.
4.  **API Development**: Create the trigger and status endpoints.
5.  **Frontend Integration**: Wire up the UI to the new endpoints.
6.  **Survey Bridge**: Modify `team_summary.py` to accept and render Survey data tables.
7.  **Testing**: Verify the full loop with sample data.

## Key Considerations

*   **Error Handling**: If a device file is missing or corrupt, the task should fail gracefully and report *which* device failed.
*   **Performance**: Processing large sessions can be CPU intensive. Ensure Celery workers have sufficient resources.
*   **Concurrency**: Avoid processing the same session multiple times simultaneously.
