import os
import uuid
import asyncio
import json
import traceback
from pathlib import Path
from typing import AsyncGenerator

import pandas as pd
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from agent import run_analysis, WORKING_DIR, CHARTS_DIR

load_dotenv()

# ─── App setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="StatBot Pro API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated chart images
CHARTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/charts", StaticFiles(directory=str(CHARTS_DIR)), name="charts")

# ─── In-memory session store ──────────────────────────────────────────────────
# { session_id: pd.DataFrame }
_sessions: dict[str, pd.DataFrame] = {}


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _load_file(upload: UploadFile) -> pd.DataFrame:
    filename = upload.filename or ""
    content = upload.file.read()
    if filename.endswith(".csv"):
        import io
        df = pd.read_csv(io.BytesIO(content))
    elif filename.endswith((".xls", ".xlsx")):
        import io
        df = pd.read_excel(io.BytesIO(content))
    else:
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported.")
    return df


def _df_preview(df: pd.DataFrame) -> dict:
    """Return a JSON-serialisable summary of the dataframe."""
    return {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "column_names": df.columns.tolist(),
        "dtypes": {col: str(dt) for col, dt in df.dtypes.items()},
        "head": json.loads(df.head(5).to_json(orient="records")),
        "describe": json.loads(
            df.describe(include="all").fillna("").to_json(orient="index")
        ),
    }


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "StatBot Pro"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a CSV/Excel file. Returns session_id + data preview."""
    print(f"📥 Received file: {file.filename}")
    try:
        df = _load_file(file)
        session_id = str(uuid.uuid4())
        _sessions[session_id] = df
        preview = _df_preview(df)
        print(f"✅ Preview generated for {file.filename}")
        return {
            "session_id": session_id,
            "filename": file.filename,
            "preview": preview,
        }
    except Exception as e:
        print(f"❌ Upload error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/session/{session_id}/preview")
async def get_preview(session_id: str):
    df = _sessions.get(session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return _df_preview(df)


@app.post("/analyze/stream")
async def analyze_stream(
    session_id: str = Form(...),
    question: str = Form(...),
):
    """
    Stream the agent's thought process as Server-Sent Events (SSE).
    Final event contains {"type":"result","answer":…,"chart_url":…}.
    """
    df = _sessions.get(session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Session not found. Please upload a file first.")
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    queue: asyncio.Queue = asyncio.Queue()

    async def event_generator() -> AsyncGenerator[str, None]:
        # Kick-off agent in background
        task = asyncio.create_task(_run(df, question, queue))

        while True:
            item = await queue.get()
            if item is None:  # sentinel
                break
            yield f"data: {item}\n\n"

        # Await the task to get the final result
        result = await task
        yield f"data: {json.dumps({'type': 'result', **result})}\n\n"
        yield "data: [DONE]\n\n"

    async def _run(df, question, queue):
        try:
            return await run_analysis(df, question, queue)
        except Exception as e:
            queue.put_nowait(json.dumps({"type": "error", "content": str(e)}))
            queue.put_nowait(None)
            return {"answer": f"An error occurred: {e}", "chart_url": None}

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/analyze")
async def analyze_sync(
    session_id: str = Form(...),
    question: str = Form(...),
):
    """Non-streaming analysis endpoint (simpler clients)."""
    df = _sessions.get(session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    queue: asyncio.Queue = asyncio.Queue()
    result = await run_analysis(df, question, queue)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
