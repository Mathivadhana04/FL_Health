# AI-Based Federated Learning System for Healthcare Informatics

This repository implements a fully functional, end-to-end Federated Learning (FL) system designed for healthcare informatics. It enables collaborative, decentralized AI model training across simulated hospitals without exposing raw patient data. The system features **Opacus Differential Privacy (DP)** for data leakage protection, and **Adaptive Self-Healing Federated Aggregation (ASFA)** to detect, quarantine, and heal from malicious adversarial poisoning.

---

## 1. Target Architecture & Connection Flow

The system operates across three interconnected layers:

```
┌──────────────────────┐  (HTTP POST metrics)  ┌─────────────────────────┐  (WS STOMP Broadcast)  ┌──────────────────────┐
│  Python FL Engine    │ ────────────────────> │  Spring Boot Backend    │ ─────────────────────> │   React Dashboard    │
│  PyTorch/Opacus/ASFA │                       │  REST, WebSockets, JPA  │                        │   Live Charts, Logs, │
│  Local Client loop   │ <──────────────────── │  ProcessBuilder Spawner │ <───────────────────── │   Hospital Lab, Chat │
└──────────────────────┘   (Spawns subprocess) └─────────────────────────┘   (REST trigger runs)  └──────────────────────┘
```

1. **Python FL Engine**: Simulates client hospitals locally, trains PyTorch CNN models on medical data subsets, runs Opacus DP-SGD, filters anomalies using the ASFA shield (reputation, quarantine, checkpoints, and rollbacks), and posts round-by-round statistics to the backend via HTTP.
2. **Spring Boot Backend**: Serves as the central persistence and coordination layer. It runs MySQL database migrations for training metrics and logs, exposes REST endpoints, spawns the Python engine asynchronously via `ProcessBuilder`, and streams logs and metrics live to the frontend using WebSockets.
3. **React.js Dashboard**: Implements a glassmorphic MUI dark mode interface for clinical doctors to trigger client local dataset sizes (e.g. 10 or 15 samples), run global training, observe live Recharts performance curves, audit security events, and query diagnosis predictions from a clinical chatbot.

---

## 2. Key Architectural Decisions

- **HTTP Metrics Push + WebSocket STOMP Broadcast**: 
  - *Why not polling?* Polling introduces latency and database overhead. Pushing metrics via HTTP POST from Python to Spring Boot and broadcasting them immediately to `/topic/fl-metrics/{id}` ensures the dashboard charts update in real-time as rounds complete.
  - *Why not direct WebSocket from Python?* Direct Python WebSocket connections require long-running socket listeners. HTTP push is stateless, robust, and isolates training crashes from the communication layer.
- **Database Persistence (MySQL)**: All configurations, metrics, and logs are persisted. This allows doctors to replay past run metrics, check historical comparative performance overlay curves, and audit hospital security logs even after runs are completed.
- **ASFA Self-Healing Visibility**: Suspicious updates are z-score audited. Quarantines and checkpoint rollbacks are caught by the `reporting` module and surfaced instantly in the UI with distinct red/orange event alerts.
- **Chatbot Clinical Inferences**: Rather than using generic LLMs, the chatbot parses medical parameters and queries the actual PyTorch global model weights, explaining classifications with z-score and privacy epsilon metrics.

---

## 3. Environment Variables & Configurations

### Python FL Engine (`fl-health-project`)
Create a `.env` in the Python root or configure system variables:
- `FL_BACKEND_URL`: URL of the Spring Boot endpoints (Default: `http://localhost:8080/api/v1/fl`).

### Spring Boot Backend (`backend`)
Configure in `backend/src/main/resources/application.yml`:
- `spring.datasource.url`: JDBC connection string for MySQL database (Default: `jdbc:mysql://localhost:3306/ai_content_studio`).
- `spring.datasource.username`: MySQL database username (Default: `root`).
- `spring.datasource.password`: MySQL database password.
- `application.cors.allowed-origins`: CORS permitted origins (Default: `http://localhost:5173`).

### React.js Frontend (`frontend`)
Configure in `frontend/.env.development` or `.env`:
- `VITE_API_URL`: Base REST URL of Spring Boot (Default: `http://localhost:8080/api/v1`).

---

## 4. How to Run Locally

### Prerequisites
- Python 3.8+ (with PyTorch, NumPy, Scikit-Learn, Requests)
- Java OpenJDK 17+
- Maven 3.8+
- Node.js 18+ and npm
- MySQL Server 8.0+

### Step 1: Database Setup
Create the MySQL database:
```sql
CREATE DATABASE ai_content_studio;
```

### Step 2: Run Spring Boot Backend
Configure database password in `application.yml` and start the server:
```bash
cd backend
mvn spring-boot:run
```
The server will start on port `8080` and auto-generate database schema.

### Step 3: Run React.js Frontend
Install dependencies and launch the Vite development server:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. Register a new account and login.

### Step 4: Verify Python Offline Setup
Verify python packages compile and tests are green:
```bash
cd fl-health-project
python -m pytest tests/
```
All 16 unit tests will run and pass.

---

## 5. Using the Federated Learning Lab

1. **Local Training**: Navigate to the **Live FL Workspace** tab. Use the slider on the hospital cards to allocate training samples (e.g., set Hospital 1 to 10 samples, Hospital 2 to 15 samples). Click **Train Local Client** to compute local updates.
2. **Global Training**: Set your target DP epsilon and select the ASFA aggregation strategy in the configurations. Click **Train Global AI**. The backend will spawn Python, aggregate the updates, and stream round charts and console output.
3. **Diagnostic Chatbot**: Go to the **Diagnostic Chatbot Assistant** tab. Select a patient sample (like Patient #4 biopsy) and click **Analyze Patient Case** to query the aggregated global model and view details.
