# Primitive 编排器一体化工程

一个可用于生产的全栈系统：用 Python API 编排运行 Go 图像“几何原语”算法（primitive），并提供现代 React + Tailwind 前端。

- 上游核心算法项目： [fogleman/primitive](https://github.com/fogleman/primitive)
- 官方站点：`https://primitive.lol/`

> 说明：本仓库作为“编排器（Orchestrator）”，通过子进程调用上游 Go 可执行程序 `primitive`，并提供上传、参数配置、任务队列/状态跟踪、结果产出、管理后台与前端展示。

## 快速开始（本机，无 Docker）

- 前置：Python 3.10+、Node.js 20+、Go 1.22+（已 `go install github.com/fogleman/primitive@latest`）

1) 后端
```bash
cd primitive/backend
python -m venv .venv
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2) 前端
```bash
cd primitive/web
npm install
npm run dev
```

3) 生产部署建议
- 构建前端后静态托管：
```bash
cd primitive/web
npm ci && npm run build
mkdir -p ../backend/app/static && cp -r dist/* ../backend/app/static/
```
- 设置环境变量（`.env` 或系统环境）：
```
APP_ENV=production
APP_HOST=0.0.0.0
APP_PORT=8000
DATA_DIR=/var/lib/imagent
SERVE_STATIC=true
CORS_ORIGINS=*
MAX_UPLOAD_MB=25
```
- 使用 systemd 管理 `uvicorn`（示例略）。

## 环境变量
同 `primitive/backend/app/config.py`，见上方示例。

## API（概览）
- POST /api/jobs
- GET /api/jobs/{id}
- GET /api/jobs/{id}/outputs
- WS /ws/jobs/{id}
- GET /healthz

## primitive 参数（参考）
详见 [fogleman/primitive](https://github.com/fogleman/primitive)。

## 开发规范
- 后端：全量类型注解、SQLModel、Ruff/Black
- 前端：TypeScript、ESLint + Prettier、Tailwind 