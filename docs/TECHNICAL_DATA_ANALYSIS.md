# Hawkseye Technical Analysis: Components, Data Flow & Capabilities

## 1. Concrete Technical Components That Exist

### Backend (Django / Python)
1. **Database Models** (`backend/webapp/apps/operations/models.py`):
   - `TacticalAsset` (HardwareInfo): The physical device/collar/tracker
   - `AssetComms` (ModemData): The Iridium modem attached to the asset
   - `Telemetry` (VoyagerPayload): **Processed GPS + Sensor data**
   - `RawPacket` (SbdPayload): Raw satellite packets from Iridium network
   - `CommandCenter` (Organisations): Multi-tenant organization structure
   - `Mission` (BillingGroups): Project groupings for billing
   - `Products`: Device hardware specifications
   - `Parameters`: Device configuration (40 configurable params)

2. **REST API Endpoints** (`backend/webapp/apps/operations/urls.py`):
   - `/api/assets/` - List all devices (ViewSet with CRUD)
   - `/api/assets/lookup/?search=<term>` - Search devices by IMEI/Serial/Description
   - `/api/v1/assets/` - Get asset list (AssetListView)
   - `/api/v1/assets/<id>/telemetry/` - Get telemetry history for sparklines

3. **WebSocket** (`backend/webapp/apps/operations/consumers.py`):
   - `TelemetryConsumer`: Real-time telemetry push via WebSocket (`/ws/telemetry/`)
   - Uses Django Channels for live data streaming to connected clients

4. **Management Commands** (`backend/webapp/apps/operations/management/commands/`):
   - `emit_telemetry.py`: Simulate live telemetry emission
   - `test_payloads.py`, `test_hardware.py`, etc.: Database population/testing scripts

### Frontend (React / Vite)
1. **Core Pages**:
   - `devices.jsx`: Field asset management (table view, filters, search)
   - `home.jsx`: Marketing landing page
   - `about.tsx`, `products.tsx`, `contact.tsx`: Marketing pages

2. **Components**:
   - `Header.jsx`, `Footer.jsx`: Global navigation
   - `SidePanel`: Dashboard navigation sidebar
   - Map components (Leaflet integration for geospatial visualization)

---

## 2. Actual Data Flow: Ingestion → Storage → Visualization

### **Ingestion Path** (Satellite → Backend)
```
1. Iridium Satellite Network (SBD - Short Burst Data)
   ↓
2. Iridium Email Gateway / HTTP POST (CDR - Call Detail Record)
   ↓
3. Django Webhook/API Endpoint (NOT EXPLICITLY SHOWN, but implied by SbdPayload model)
   ↓
4. RawPacket (SbdPayload) Created
   - Stores: raw_data (hex string), cdr_reference, modem_id, lat/lon (from network), server_time
   ↓
5. Signal Handler (backend/webapp/apps/operations/signals.py)
   - Decodes raw_data payload (proprietary binary format)
   - Extracts GPS coordinates, sensor readings, battery, temperature
   ↓
6. Telemetry (VoyagerPayload) Created
   - Stores decoded data: latitude, longitude, altitude, speed, heading, bat_voltage, temperature, pressure, activity_count, etc.
```

### **Storage** (PostgreSQL/MySQL)
- Separate database "voyager" (as per README.md)
- Tables: `sbd_payload`, `voyager_payload`, `modem_data`, `hardware_info`
- Foreign keys link: `RawPacket` → `AssetComms` → `TacticalAsset`

### **Retrieval & API** (Backend → Frontend)
```
1. Frontend requests: GET /api/v1/assets/<id>/telemetry/
   ↓
2. Django View (TelemetryHistoryView)
   - Queries: Telemetry.objects.filter(payload__modem_id=asset_id)
   - Returns JSON: {"signalHistory": [voltage1, voltage2, ...]}
   ↓
3. Frontend receives JSON array for sparkline charts
```

### **Real-Time Updates** (WebSocket)
```
1. Backend emits telemetry via WebSocket (TelemetryConsumer)
   ↓
2. Frontend listens on ws://backend/ws/telemetry/
   ↓
3. Live updates to map markers, battery levels, etc. (NOT FULLY IMPLEMENTED in current frontend code)
```

---

## 3. Types of Data Processed

### **Location & Movement**
- **Latitude/Longitude**: High-precision GPS (±2.5m accuracy)
- **Altitude**: Meters above sea level
- **Speed**: km/h
- **Heading**: Compass bearing (0-360°)
- **Accuracy**: HDOP (Horizontal Dilution of Precision), CEP radius

### **Environmental & Sensor Data**
- **Temperature**: Device temp + Sensor temp (-40°C to +85°C range)
- **Pressure**: Atmospheric pressure (millibar) - for altitude/weather
- **Time-Under-Water**: Minutes submerged (for reptile trackers)
- **Activity Count**: Movement/acceleration events

### **Power & Telemetry**
- **Battery Voltage**: V (e.g., 3.7V Li-ion)
- **State of Charge**: % (calculated from voltage)
- **Solar Charging**: Implied by product specs (not explicit in telemetry model)

### **Communication Metadata**
- **IMEI**: Iridium modem identifier (15 digits)
- **CDR Reference**: Unique satellite transmission ID
- **MOMSN/MTMSN**: Iridium message sequence numbers
- **Server Time vs Session Time**: Timestamp discrepancies for network latency analysis

### **Configuration**
- **40 Parameters**: Configurable device settings (fix interval, sensor thresholds, power modes)
- **Frequency**: Radio frequency (for VHF beacon)

---

## 4. What the System Currently Enables Users to Do

### **Operational Capabilities**
✅ **Asset Inventory Management**: View all devices, their status (Active, Inactive, Suspended), and hardware details  
✅ **Real-Time Telemetry**: Track location, battery, signal strength via API  
✅ **Historical Tracking**: Query past telemetry for trend analysis  
✅ **Multi-Tenant Organization**: Separate data by "Command Centers" (organizations)  
✅ **Mission Grouping**: Assign devices to projects/missions for billing segmentation  
✅ **Search & Filter**: Find devices by IMEI, serial number, or description  
✅ **Device Commissioning**: Add new devices to the system (frontend UI exists)  
✅ **Parameter Management**: Configure device settings remotely (backend models exist)  

### **Data Visualization (Potential)**
✅ **Sparklines**: Battery voltage history (API endpoint exists)  
⚠️ **Map Visualization**: Leaflet integration exists but **NOT CONNECTED** to live backend data in current code  
⚠️ **Heatmaps**: Code references exist but not implemented on frontend  

---

## 5. What the System Does NOT Do (Gaps & Potential)

### **Current Limitations**
❌ **No Live Map Integration**: Frontend map components are **NOT** fetching data from `/api/v1/assets/<id>/telemetry/`  
❌ **No WebSocket Connection**: `TelemetryConsumer` exists but frontend doesn't subscribe to it  
❌ **Dummy Data**: `devices.jsx` uses hardcoded arrays (`const devices = [...]`) instead of API calls  
❌ **No Geofencing/Alerts**: No proximity alerts or boundary violations  
❌ **No Predictive Analytics**: No AI/ML for movement prediction or anomaly detection  
❌ **No Mobile App**: Web-only interface  
❌ **No Offline Mode**: Requires constant internet connection  

### **Unrealized Potential**
🔮 **Heatmap Visualization**: Generate density maps of animal movement patterns  
🔮 **Migration Tracking**: Visualize multi-month migration routes  
🔮 **Behavioral Analysis**: Correlate activity counts with environmental data  
🔮 **Anti-Poaching Alerts**: Real-time notifications when animals enter danger zones  
🔮 **Battery Life Prediction**: ML models to forecast when devices need replacement  
🔮 **Solar Efficiency Analytics**: Optimize charging based on solar panel performance data  

---

## 6. Animal Data: Lion, Crocodile, Bird

### **Data Metrics by Species**

Yes, the system **IS DESIGNED** to handle lion, crocodile, and bird data. Here's the breakdown:

#### **Lions/Mammals (Collars)**
- **Location**: GPS fix every 5 minutes to 24 hours (configurable)
- **Movement**: Speed, heading, activity count
- **Environment**: Temperature (ambient)
- **Power**: Battery voltage, solar charge status
- **Weight**: 250g - 1.2kg collar (minimal impact on animal)

#### **Crocodiles/Reptiles (Aquatic Trackers)**
- **Location**: GPS fix when surfaced
- **Depth**: Pressure sensor (up to 100m depth rating)
- **Immersion**: Time-under-water (minutes submerged)
- **Environment**: Water temperature, pressure
- **Power**: Long battery life (4+ years)

#### **Birds (Ultra-Lightweight Trackers)**
- **Location**: High-precision GPS (55g total weight)
- **Altitude**: Critical for migration studies (altitude_m field)
- **Speed**: Flight speed (km/h)
- **Solar Charging**: Solar panel efficiency data
- **Migration**: Long-term tracking (3+ year battery)

---

## 7. How to Convert Data to JSON & Visual Graphs

### **Current State: SIMULATION ONLY**
The project **CURRENTLY USES DUMMY DATA** in the frontend. The backend has real models/APIs, but they are **NOT CONNECTED** to the frontend map/chart components.

### **For Real-World Use: Data Transformation**

#### **Step 1: Query Telemetry API**
```javascript
// Fetch last 100 GPS points for a lion (asset_id = 5)
const response = await fetch('http://localhost:8000/api/v1/assets/5/telemetry/');
const data = await response.json();

// Expected format (needs backend modification):
// {
//   "telemetry": [
//     {
//       "timestamp": "2026-02-16T08:00:00Z",
//       "latitude": -25.7461,
//       "longitude": 28.1881,
//       "speed_kmh": 12.5,
//       "bat_voltage": 3.7,
//       "temperature": 28.4
//     },
//     ...
//   ]
// }
```

#### **Step 2: Transform to Chart Format**
```javascript
// For Leaflet Map (Polyline)
const trackingPath = data.telemetry.map(point => [
  point.latitude,
  point.longitude
]);

// For Chart.js (Battery Over Time)
const batteryChartData = {
  labels: data.telemetry.map(p => new Date(p.timestamp).toLocaleDateString()),
  datasets: [{
    label: 'Battery Voltage (V)',
    data: data.telemetry.map(p => p.bat_voltage),
    borderColor: 'rgb(75, 192, 192)',
  }]
};

// For Heatmap (Deck.gl HexagonLayer)
const heatmapData = data.telemetry.map(point => ({
  coordinates: [point.longitude, point.latitude],
  weight: point.activity_count // Higher activity = hotter color
}));
```

#### **Step 3: Render Visualization**
```jsx
// Leaflet Map
<MapContainer center={[-25.7461, 28.1881]} zoom={10}>
  <Polyline positions={trackingPath} color="blue" />
  {data.telemetry.map((point, idx) => (
    <Marker key={idx} position={[point.latitude, point.longitude]}>
      <Popup>
        Speed: {point.speed_kmh} km/h<br/>
        Temp: {point.temperature}°C
      </Popup>
    </Marker>
  ))}
</MapContainer>

// Chart.js
<Line data={batteryChartData} />

// Heatmap (react-map-gl + deck.gl)
<DeckGL
  layers={[
    new HexagonLayer({
      id: 'heatmap',
      data: heatmapData,
      getPosition: d => d.coordinates,
      getElevationWeight: d => d.weight,
    })
  ]}
/>
```

---

## 8. Summary: Real vs Simulated

| Component | Status | Notes |
|-----------|--------|-------|
| **Backend Models** | ✅ **REAL** | Full telemetry schema exists |
| **Backend APIs** | ✅ **REAL** | `/api/v1/assets/`, `/api/v1/assets/<id>/telemetry/` |
| **WebSocket** | ✅ **REAL** | `TelemetryConsumer` ready for live streaming |
| **Database** | ⚠️ **EMPTY** | No production data, only test scripts |
| **Frontend Map** | ❌ **SIMULATION** | Uses hardcoded coordinates, NOT API data |
| **Frontend Charts** | ❌ **NOT BUILT** | Sparkline API exists but no charts rendered |
| **Animal Data** | ⚠️ **DESIGN ONLY** | System supports lion/croc/bird, but no real sensors deployed |

---

## Conclusion

This is a **PORTFOLIO PROJECT** demonstrating:
1. ✅ Full-stack architecture (Django + React)
2. ✅ Real-time WebSocket capabilities
3. ✅ Complex data modeling (multi-tenant, telemetry time-series)
4. ✅ Satellite IoT integration design (Iridium SBD protocol)
5. ⚠️ **Incomplete Integration**: Frontend and backend are not fully connected

**To make this production-ready**, you need to:
- Replace dummy data in `devices.jsx` with `fetch()` calls to `/api/v1/assets/`
- Connect map visualization to `/api/v1/assets/<id>/telemetry/`
- Implement WebSocket subscription for live updates
- Deploy actual Iridium hardware or simulate packet ingestion with test scripts
