#!/usr/bin/env python3
import os
import uvicorn


def strtobool(value: str) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def main() -> None:
    host = os.getenv("APP_HOST", "0.0.0.0")
    port = int(os.getenv("APP_PORT", "8000"))
    # Enable reload in development or when RELOAD=true
    reload_enabled = os.getenv("APP_ENV", "").lower() == "development" or strtobool(os.getenv("RELOAD", "false"))
    workers = int(os.getenv("WORKERS", "2"))
    if reload_enabled:
        # uvicorn 不支持 reload+workers>1
        workers = 1

    log_level = os.getenv("LOG_LEVEL", "info")

    # Import string avoids importing the app until uvicorn starts
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload_enabled,
        workers=workers,
        log_level=log_level,
    )


if __name__ == "__main__":
    main() 