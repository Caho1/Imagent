from __future__ import annotations

import asyncio
import json
import os
import shutil
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Tuple

from sqlmodel import Session

from .config import settings
from .models import Job, JobStatus, engine, save_job
from .notifier import notifier


def _primitive_executable() -> str:
    # Expect primitive to be available on PATH
    return shutil.which("primitive") or "primitive"


async def _run_primitive(job: Job, params: Dict[str, str]) -> Tuple[int, str]:
    # Derive output patterns
    output_png = str(Path(job.output_dir) / "output.png")
    # Optionally emit frames to estimate progress if nth is provided
    nth_value = params.get("nth")
    frame_pattern = str(Path(job.output_dir) / "frame-%05d.png") if nth_value else None

    cmd = [_primitive_executable(), "-i", job.input_path, "-o", output_png]

    # Map accepted params to CLI flags
    flag_map = {
        "n": "-n",
        "m": "-m",
        "rep": "-rep",
        "nth": "-nth",
        "r": "-r",
        "s": "-s",
        "a": "-a",
        "bg": "-bg",
        "j": "-j",
        "v": "-v",  # note: presence-based; here we pass value if provided
    }

    for k, v in params.items():
        if v in (None, "", False):
            continue
        if k == "nth" and frame_pattern:
            # Keep output_png and add an extra -o for frames, then pass -nth
            cmd.extend(["-o", frame_pattern, flag_map[k], str(v)])
        elif k in flag_map:
            cmd.extend([flag_map[k], str(v)])

    # Spawn process
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=job.output_dir,
    )

    # Track progress by reading lines; primitive doesn't output explicit % by default
    # We approximate: if frames enabled, progress ~ (#frames / n) * 100
    frames = 0
    total = int(params.get("n") or 100)

    async for raw in process.stdout:  # type: ignore[arg-type]
        line = raw.decode(errors="ignore").rstrip()
        if frame_pattern and os.path.exists(job.output_dir):
            try:
                frames = len([p for p in os.listdir(job.output_dir) if p.startswith("frame-")])
            except Exception:
                frames = frames
        # Fallback: simple time-based / line-based heuristic could be added here
        progress = min(99, int(frames / max(total, 1) * 100)) if frame_pattern else job.progress

        with Session(engine) as session:
            job.progress = progress
            job.message = line
            job.updated_at = datetime.utcnow()
            save_job(session, job)
        await notifier.broadcast(job.id, {"type": "log", "message": line, "progress": job.progress})

    return_code = await process.wait()
    return return_code, output_png


def create_job(input_file_path: Path, params: Dict[str, str]) -> Job:
    job_id = uuid.uuid4().hex
    output_dir = settings.jobs_dir / job_id
    output_dir.mkdir(parents=True, exist_ok=True)

    job = Job(
        id=job_id,
        input_path=str(input_file_path),
        output_dir=str(output_dir),
        params_json=json.dumps(params, ensure_ascii=False),
        status=JobStatus.pending,
    )
    with Session(engine) as session:
        save_job(session, job)
    return job


async def run_job(job_id: str) -> None:
    from .models import get_job_by_id  # local import to avoid circular

    job = get_job_by_id(job_id)
    if not job:
        return

    params = job.params()

    with Session(engine) as session:
        job.status = JobStatus.running
        save_job(session, job)

    try:
        code, output_png = await _run_primitive(job, params)
        with Session(engine) as session:
            if code == 0:
                job.status = JobStatus.succeeded
                job.progress = 100
                job.message = f"done: {output_png}"
            else:
                job.status = JobStatus.failed
                job.message = f"primitive exited with code {code}"
            save_job(session, job)
        await notifier.broadcast(job.id, {"type": "done", "status": job.status, "progress": job.progress})
    except Exception as e:
        with Session(engine) as session:
            job.status = JobStatus.failed
            job.message = f"error: {e}"
            save_job(session, job)
        await notifier.broadcast(job.id, {"type": "error", "message": str(e)}) 