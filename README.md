<div align="center">

<img src="https://img.shields.io/badge/StatBot_Pro-v1.0.0-6366f1?style=for-the-badge&logo=google&logoColor=white" />
<img src="https://img.shields.io/badge/Powered_by-Gemini_1.5_Pro-4285F4?style=for-the-badge&logo=google&logoColor=white" />
<img src="https://img.shields.io/badge/Built_with-LangChain-1C3C3C?style=for-the-badge&logo=chainlink&logoColor=white" />
<img src="https://img.shields.io/badge/Framework-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/Frontend-React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/Sandbox-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />

<br/><br/>

# 📊 StatBot Pro

### *Autonomous CSV & Excel Data Analyst — Powered by AI*

> Upload any messy spreadsheet. Ask complex questions in plain English.  
> StatBot Pro writes the Python code, executes it in a secure sandbox, and returns answers with beautiful charts — no coding required.

<br/>

**[✨ Features](#-features) · [🏗️ Architecture](#️-architecture) · [⚡ Quick Start](#-quick-start) · [🐳 Docker](#-docker-deployment) · [🔒 Security](#-security-model) · [📡 API Reference](#-api-reference)**

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **Autonomous AI Agent** | LangChain Pandas Agent powered by **Gemini 1.5 Pro** writes and executes its own Python/Pandas code |
| � **Self-Correcting** | Detects runtime errors and automatically rewrites the code until the task succeeds |
| � **Sandboxed Execution** | Strict Python REPL with import whitelist and blocked dangerous ops — safe by design |
| 📈 **Graph Generation** | Matplotlib & Seaborn charts auto-saved as `.png` and returned as accessible URLs |
| 🧠 **Streaming Thought Process** | Real-time Server-Sent Events (SSE) stream every reasoning step directly in the UI |
| 📂 **Multi-Format Upload** | Supports `.csv`, `.xls`, and `.xlsx` files of any size |
| 🐳 **Docker Ready** | Full production-grade Docker + Compose setup with memory/CPU limits |
| ⚡ **Modern UI** | Dark-themed, glassmorphic React interface with animations and live chat |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
│                     React 18 + Vite (: 3000)                    │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────────┐ │
│  │  File Dropzone│  │   Chat Panel  │  │  Thought Process SSE │ │
│  │  CSV / Excel  │  │  Q&A History  │  │  Step-by-Step Stream │ │
│  └───────┬───────┘  └───────┬───────┘  └──────────────────────┘ │
└──────────┼──────────────────┼──────────────────────────────────┘
           │ POST /upload     │ POST /analyze/stream (SSE)
           ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (: 8000)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Session Manager                         │ │
│  │             { session_id → pd.DataFrame }                  │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │                                      │
│  ┌────────────────────────▼───────────────────────────────────┐ │
│  │              LangChain Pandas Agent                         │ │
│  │   ┌──────────────────┐     ┌─────────────────────────────┐ │ │
│  │   │  Gemini 1.5 Pro  │◄───►│   Streaming Thought Handler  │ │ │
│  │   │  (Tool Calling)  │     │   SSE → Client in real-time  │ │ │
│  │   └────────┬─────────┘     └─────────────────────────────┘ │ │
│  │            │                                                 │ │
│  │   ┌────────▼─────────────────────────────────────────────┐ │ │
│  │   │             Sandboxed Python REPL                     │ │ │
│  │   │  • Import whitelist (pandas, numpy, matplotlib…)     │ │ │
│  │   │  • Blocked: os.system, subprocess, open(), eval()    │ │ │
│  │   │  • plt.show() → auto-saves PNG to /charts/           │ │ │
│  │   └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Static: GET /charts/{filename}.png                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## � Project Structure

```
StatBot Pro/
│
├── 📂 backend/
│   ├── agent.py            # Core AI engine: Gemini agent, sandboxed REPL, SSE callbacks
│   ├── main.py             # FastAPI server: upload, streaming, session management
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Non-root container with matplotlib system deps
│   └── .env.example        # Environment variable template
│
├── 📂 frontend/
│   ├── src/
│   │   ├── App.jsx         # Full React app (chat, dropzone, SSE thought stream, charts)
│   │   └── index.css       # Premium dark design system (glassmorphism, animations)
│   ├── index.html          # HTML entry point with SEO meta tags
│   ├── package.json        # Dependencies: React 18, Framer Motion, react-dropzone
│   └── vite.config.js      # Vite + proxy config
│
├── 📂 sample_data/
│   └── sales_data.csv      # Ready-to-use test dataset (sales by region, product, month)
│
├── docker-compose.yml      # Orchestrates backend + frontend with security hardening
├── .env                    # 🔑 Your API key goes here (not committed to git)
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.10 or higher |
| Node.js | 18 or higher |
| Google Gemini API Key | [Get one free →](https://aistudio.google.com/app/apikey) |

---

### Step 1 — Clone & Configure

```bash
# Navigate into the project
cd "StatBot Pro"

# Add your Gemini API key to .env
# Open .env and replace the placeholder:
GOOGLE_API_KEY=AIza...your-key-here...
```

---

### Step 2 — Start the Backend

```powershell
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
copy .env.example .env
# Edit .env → set GOOGLE_API_KEY

# Start the API server
python main.py
# ✅ Backend running at http://localhost:8000
```

---

### Step 3 — Start the Frontend

```powershell
# Open a new terminal
cd frontend

# Install Node dependencies (already done if you ran npm install)
npm install

# Start the dev server
npm run dev
# ✅ Frontend running at http://localhost:3000
```

---

### Step 4 — Try It Out

1. Open **http://localhost:3000** in your browser
2. Drag & drop `sample_data/sales_data.csv` onto the upload zone
3. Ask a question such as:
   - *"What is the mean sales per region?"*
   - *"Plot sales over time showing a 3-month rolling average"*
   - *"Which product has the highest profit margin?"*
4. Watch the **🧠 Agent Thought Process** stream in real-time as the AI reasons, writes code, and executes it

---

## 🐳 Docker Deployment

For production use, Docker provides full sandboxing with resource limits.

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## 🔒 Security Model

StatBot Pro implements a **multi-layer security architecture** to prevent malicious code execution.

### Layer 1 — Python Import Whitelist

Only the following libraries are permitted in the sandbox:

```python
ALLOWED_IMPORTS = {
    "pandas", "numpy", "matplotlib", "matplotlib.pyplot",
    "seaborn", "math", "statistics", "datetime",
    "re", "json", "csv", "io"
}
```

### Layer 2 — Blocked Pattern Detection

Any generated code containing the following patterns is **immediately rejected**:

```python
BLOCKED_PATTERNS = [
    "os.system",    "subprocess",    "shutil.rmtree",
    "open(",        "__import__",    "exec(",
    "eval(",        "importlib",     "socket",
    "requests",     "urllib",        "http",
    "glob.glob",    "os.remove",     "os.unlink",
    "os.rmdir",     "pathlib.Path",  "sys.exit",
]
```

### Layer 3 — Chart Interception

`plt.show()` is monkey-patched at runtime to **save the chart as a PNG** and never render interactively, preventing any attempt to open display connections.

### Layer 4 — Docker Hardening

```yaml
security_opt:
  - no-new-privileges:true   # prevents privilege escalation
mem_limit: 1g                # hard memory cap
cpu_quota: 100000            # CPU time limit
```

---

## 📡 API Reference

All endpoints are available at `http://localhost:8000`. Interactive docs at `/docs`.

### `POST /upload`
Upload a CSV or Excel file to start a session.

```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@sample_data/sales_data.csv"
```

**Response:**
```json
{
  "session_id": "a1b2c3d4-...",
  "filename": "sales_data.csv",
  "preview": {
    "rows": 24,
    "columns": 7,
    "column_names": ["Month", "Region", "Product", "Sales", ...],
    "head": [...]
  }
}
```

---

### `POST /analyze/stream` *(SSE)*
Stream the agent's reasoning steps and final answer.

```bash
curl -X POST http://localhost:8000/analyze/stream \
  -F "session_id=a1b2c3d4-..." \
  -F "question=Plot sales by region as a bar chart"
```

**Stream events:**
```
data: {"type": "chain_start", "content": "🔗 Agent chain started…"}
data: {"type": "tool_start",  "tool": "python_repl", "content": "🛠️ ..."}
data: {"type": "tool_end",    "content": "📊 Tool output: …"}
data: {"type": "agent_finish","content": "✅ Agent finished."}
data: {"type": "result",      "answer": "Here is the chart…", "chart_url": "/charts/abc.png"}
data: [DONE]
```

---

### `POST /analyze`
Non-streaming synchronous analysis (for simpler clients).

---

### `GET /session/{session_id}/preview`
Re-fetch the data preview for an existing session.

---

### `GET /charts/{filename}`
Serve a generated chart image (PNG).

---

## 🗓️ Implementation Roadmap

| Week | Milestone | Status |
|:---:|---|:---:|
| 1 | Pandas Agent + LangChain + CSV Q&A | ✅ Done |
| 2 | Matplotlib graph generation + chart URL serving | ✅ Done |
| 3 | Sandboxed REPL + blocked pattern detection + Docker | ✅ Done |
| 4 | Streaming Thought Process UI + full frontend polish | ✅ Done |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **LLM** | Google Gemini 1.5 Pro |
| **Agent Framework** | LangChain + LangChain Experimental |
| **Backend** | FastAPI + Uvicorn |
| **Data Analysis** | Pandas + NumPy |
| **Visualization** | Matplotlib + Seaborn |
| **Frontend** | React 18 + Vite |
| **Streaming** | Server-Sent Events (SSE) |
| **Sandboxing** | Docker + custom Python REPL |
| **File Support** | CSV, XLS, XLSX (via openpyxl) |

---

## 📄 License

This project is proprietary and confidential.  
© 2026 **Infotact Solutions — AI Research & Development Wing**. All rights reserved.

---

<div align="center">

Built with ❤️ by **Infotact Solutions**

*Confidential Document — Not for Distribution*

</div>
