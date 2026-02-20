
# Hawkseye Data Architecture & ERD Plan

## Project Overview
Hawkseye is a military-grade tactical monitoring platform. The data model is designed to support real-time telemetry ingestion, asset management, and mission-critical analytics.

## Core Entities (Proposed Naming)

### 1. Tactical Asset (Field Asset)
*   **Current Model**: `HardwareInfo` / `ModemData`
*   **Description**: Represents a physical unit in the field (e.g., soldier, vehicle, drone, sensor).
*   **Key Attributes**:
    *   `Asset ID` (UUID/Serial): Unique identifier (e.g., "Spectre-1").
    *   `Type`: Infantry, Vehicle, Drone, Stationary Sensor.
    *   `Status`: Active, Inactive, MIA, Maintenance.
    *   `Callsign`: Tactical designation.

### 2. Telemetry Packet (Metrics)
*   **Current Model**: `VoyagerPayload` / `SbdPayload`
*   **Description**: A single data point received from an asset.
*   **Key Attributes**:
    *   `Timestamp`: Precise time of data capture.
    *   `Coordinates`: Lat/Lon/Alt (GPS).
    *   `Vital Signs`: Heart rate, Body temp (for soldiers).
    *   `Diagnostics`: Battery, Fuel, Ammo count (if applicable).
    *   `Environment`: Temp, Pressure, Radiation levels.

### 3. Mission (Organization/Group)
*   **Current Model**: `Organisations` / `BillingGroups`
*   **Description**: A grouping of assets for a specific operation or theatre.
*   **Key Attributes**:
    *   `Mission Code`: Operation name.
    *   `Theater`: Location/Region.
    *   `Commander`: Point of contact.

## ERD Diagram (Mermaid)

```mermaid
erDiagram
    ORGANISATION ||--|{ BILLING_GROUP : "manages"
    BILLING_GROUP ||--|{ HARDWARE_INFO : "deploys"
    HARDWARE_INFO ||--|| MODEM_DATA : "equipped_with"
    MODEM_DATA ||--|{ SBD_PAYLOAD : "transmits"
    SBD_PAYLOAD ||--|| VOYAGER_PAYLOAD : "decoded_as"

    ORGANISATION {
        string name "Command Center"
        string country_code
    }

    BILLING_GROUP {
        string name "Mission/Squad"
    }

    HARDWARE_INFO {
        string serial_num "Asset ID"
        string customer_ref "Callsign"
        string taxon "Unit Type"
        string animal "Operative Name"
    }

    MODEM_DATA {
        string imei "Comms ID"
        string status "Comms Status"
    }

    SBD_PAYLOAD {
        datetime server_time "Ingest Time"
        int raw_length
    }

    VOYAGER_PAYLOAD {
        float latitude
        float longitude
        float altitude_m
        float speed_kmh
        float heading
        float bat_voltage
        float temperature
        int heart_rate "Biometrics (Proposed)"
    }
```

## Recommendations for Tone & Language
*   **"Metrix" -> Telemetry**: Use "Telemetry" for raw data streams.
*   **"Device" -> Asset**: Refer to devices as "Assets" or "Units".
*   **"Group" -> Squad/Platoon**: Hierarchy should reflect military structure.
*   **"User" -> Commander/Operator**: System users are operators.

## Login Credentials
*   **Username**: See `.env` file
*   **Password**: See `.env` file
