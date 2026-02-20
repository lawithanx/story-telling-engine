# Hawkseye - Product & Technical Portfolio

## 1. Company & Product Overview

**Command Intelligence for High-Value Assets & Wildlife Conservation**

Hawkseye (also referred to as EdgePlay in some contexts) represents a sophisticated, military-grade monitoring and analytics platform designed for tracking high-value assets, specifically focusing on wildlife conservation (anti-poaching, research) and tactical asset management.

The platform combines robust hardware integration (Iridium satellite collars) with a "Zero-Trust" secure software ecosystem to provide real-time situational awareness.

### Core Mission
To provide researchers, conservationists, and tactical operators with the most advanced, reliable, and efficient tracking technology available, enabling:
-   **Global Impact**: Protecting endangered species across 45+ countries.
-   **Data Precision**: High-accuracy GPS/Satellite telemetry for actionable intelligence.
-   **Operational Security**: Military-grade encryption and access control for sensitive location data.

---

## 2. Functional Goals & Capabilities

The Hawkseye platform is built to deliver the following core functional capabilities:

### A. Real-Time Telemetry & Tracking
*   **Live Map Visualization**: Real-time plotting of asset locations using interactive maps (Leaflet/Mapbox).
*   **Multi-Species Support**: Specialized tracking profiles for:
    *   **Mammals**: Lion, Leopard, Cheetah, Wild Dog (Collars).
    *   **Avian**: Albatross, Eagle, Vulture (ultra-lightweight solar bird trackers).
    *   **Reptiles**: Crocodiles, Alligators (submersible/depth-rated trackers).
*   **Environmental Sensing**: Collection of telemetry beyond location:
    *   Temperature & Pressure.
    *   Activity/Movement levels.
    *   Immersion/Time-under-water (for reptiles).
    *   Battery voltage & Solar charging status.

### B. Command & Control (C2)
*   **Asset Management**: detailed inventory of "Tactical Assets" (devices) and their current status (Active, Deployed, Maintenance).
*   **Mission Planning**: Grouping assets into "Missions" for billing and operational segmentation.
*   **Custody Transfer**: Secure protocols for transferring asset ownership/control between organizations.
*   **Remote Configuration**: Over-the-air (OTA) updates for device parameters (fix interval, sensor settings).

### C. Financial & Operational Intelligence
*   **Billing & Quotas**: Management of Iridium airtime bundles (SBD - Short Burst Data).
*   **Usage Analytics**: Monitoring data consumption and operational costs per mission.

---

## 3. Technical Abilities & Architecture

The project demonstrates a mature, scalable full-stack architecture designed for high throughput and reliability.

### Backend Infrastructure (Django Python)
*   **Core Framework**: Django 5.x with Django Rest Framework (DRF) for robust API delivery.
*   **Real-Time Comms**: `Django Channels` and `Daphne` (ASGI) implementing Websockets for live "Ops Room" telemetry feeds.
*   **Data Models** (Relational SQL):
    *   `TacticalAsset`: Hardware definition and state.
    *   `Telemetry`: High-precision time-series data (Lat/Lon, Altitude, Speed, Heading).
    *   `CommandCenter`: Multi-tenant organization structure.
    *   `RawPacket`: Low-level binary payload handling (Iridium SBD processing).
*   **Security**:
    *   JWT & Session Authentication.
    *   Role-Based Access Control (RBAC) via `OperatorCommand` permissions.

### Frontend Experience (React + Vite)
*   **Performance**: built on Vite for rapid development and optimized production builds.
*   **Design System**: Custom "Military-Grade" UI theme:
    *   **Styling**: Tailwind CSS with custom configuration (Dark Mode, Glassmorphism, Emerald/Blue tactical accents).
    *   **Typography**: Inter (UI) and Outfit (Headings) for high-legibility command displays.
*   **Visualization**:
    *   Interactive Maps (`react-leaflet`).
    *   Data Grids and Analytics Dashboards.

### Deployment & DevOps
*   **Containerization**: Docker-ready structure.
*   **Environment**: Linux-based production environment support.
*   **Monitoring**: Integrated logging and Redis caching for high-performance data retrieval.

---

## 4. Current Project State
*   **Status**: Active Development / Refinement.
*   **Recent Achievements**:
    *   Complete UI Overhaul to "Dark/Tactical" aesthetic.
    *   Restructuring of frontend/backend integration for simpler manual editing.
    *   Stabilization of dependency chains (React/Leaflet compatibility).

**Future Roadmap Items (Inferred):**
*   Enhanced AI Analytics (Heatmaps, Predictive Movement).
*   Mobile Application integration.
*   Offline-first capabilities for field operators.
