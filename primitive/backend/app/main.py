from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Dict, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from .config import settings
from .models import Job, JobStatus, engine, save_job
from .jobs import create_job, run_job
from .notifier import notifier

app = FastAPI(title="Primitive Orchestrator API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional static serving (for production)
if settings.serve_static:
    static_dir = Path(__file__).parent / "static"
    static_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")


@app.get("/healthz")
async def healthz() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/jobs")
async def create_job_endpoint(
    file: UploadFile = File(...),
    n: Optional[int] = Form(default=100),
    m: Optional[int] = Form(default=1),
    s: Optional[int] = Form(default=1024),
    r: Optional[int] = Form(default=256),
    a: Optional[int] = Form(default=128),
    bg: Optional[str] = Form(default="avg"),
    rep: Optional[int] = Form(default=0),
    nth: Optional[int] = Form(default=None),
    j: Optional[int] = Form(default=0),
    v: Optional[int] = Form(default=0),
):
    # Validate size by reading into file system directly
    suffix = Path(file.filename or "upload").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg"}:
        raise HTTPException(status_code=400, detail="仅支持 PNG / JPG / JPEG")

    dest = settings.uploads_dir / file.filename
    # Avoid overwrite
    i = 1
    while dest.exists():
        dest = settings.uploads_dir / f"{dest.stem}-{i}{dest.suffix}"
        i += 1

    content = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"文件过大，最大 {settings.max_upload_mb} MB")
    dest.write_bytes(content)

    params = {
        "n": n,
        "m": m,
        "s": s,
        "r": r,
        "a": a,
        "bg": bg,
        "rep": rep,
        "nth": nth,
        "j": j,
        "v": v,
    }

    job = create_job(dest, {k: v for k, v in params.items() if v is not None})

    # Kick off background task
    asyncio.create_task(run_job(job.id))

    return {"id": job.id, "status": job.status, "progress": job.progress}


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    from .models import get_job_by_id

    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="未找到任务")
    return {
        "id": job.id,
        "status": job.status,
        "message": job.message,
        "progress": job.progress,
        "created_at": job.created_at,
        "params": job.params(),
    }


@app.get("/api/jobs/{job_id}/outputs")
async def list_outputs(job_id: str):
    from .models import get_job_by_id

    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="未找到任务")
    out_dir = Path(job.output_dir)
    if not out_dir.exists():
        return {"files": []}
    files = sorted([p.name for p in out_dir.iterdir() if p.is_file()])
    return {"files": files}


@app.get("/api/jobs/{job_id}/outputs/{filename}")
async def download_output(job_id: str, filename: str):
    from .models import get_job_by_id

    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="未找到任务")
    file_path = Path(job.output_dir) / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(str(file_path), filename=filename)


@app.get("/api/admin/jobs")
async def admin_list_jobs(limit: int = 100, offset: int = 0):
    with Session(engine) as session:
        stmt = select(Job).offset(offset).limit(limit).order_by(Job.created_at.desc())
        items = [
            {
                "id": j.id,
                "status": j.status,
                "progress": j.progress,
                "created_at": j.created_at,
                "message": j.message,
            }
            for j in session.exec(stmt).all()
        ]
        return {"items": items, "count": len(items)}


@app.post("/api/admin/jobs/{job_id}/cancel")
async def admin_cancel_job(job_id: str):
    # 简化：尚未实现对子进程的强制终止，后续可维护 PID 并发送终止信号
    raise HTTPException(status_code=501, detail="取消功能待实现")


@app.websocket("/ws/jobs/{job_id}")
async def ws_job(job_id: str, websocket: WebSocket):
    await websocket.accept()
    await notifier.subscribe(job_id, websocket)
    try:
        while True:
            # We don't need to receive; keep alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        await notifier.unsubscribe(job_id, websocket)
    except Exception:
        await notifier.unsubscribe(job_id, websocket) 