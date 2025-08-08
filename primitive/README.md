# Primitive 编排器一体化工程

一个可用于生产的全栈系统：用 Python API 编排运行 Go 图像“几何原语”算法（primitive），并提供一个现代、色彩丰富、层次清晰且有交互的 Tailwind + TypeScript 前端与后台管理。

- 上游核心算法项目： [fogleman/primitive](https://github.com/fogleman/primitive)
- 官方站点：`https://primitive.lol/`

> 说明：本仓库作为“编排器（Orchestrator）”，通过子进程调用上游 Go 可执行程序 `primitive`，并提供上传、参数配置、任务队列/状态跟踪、结果产出、管理后台与前端展示。

## 总览

- 后端：Python / FastAPI
  - 负责任务创建、文件上传、参数校验、调度/监控 Go `primitive` 子进程、推送进度（WebSocket）、持久化任务元数据、对外暴露 REST API。
- 引擎：Go / `primitive`
  - 实际执行图像重建算法，后端以子进程方式调用。
- 前端：Vite + React + TypeScript + Tailwind CSS
  - 提供任务创建（上传/参数）、进度可视化、结果浏览与下载、图库与后台管理。UI 颜色丰富、层级清晰、交互友好。
- 容器化：Docker / docker-compose
  - 多阶段构建：在构建阶段编译/安装 Go `primitive`，在运行阶段与 Python API 打包；前端可独立容器，也可构建产物交由后端静态托管。
- 数据库：SQLite（默认，简洁易用）。后续可切换到 Postgres。

参考与引文：上游项目文档与命令行用法、形状模式、参数等信息详见 [fogleman/primitive GitHub 仓库](https://github.com/fogleman/primitive)。

## 架构与目录结构

- `web/`：前端（Vite + React + TypeScript + Tailwind）。提供上传页、任务状态页、图库页、后台管理页等。
- `backend/`：后端（FastAPI）。提供 REST + WebSocket、任务后台执行与持久化、健康检查与可选静态资源托管。
- `docker-compose.yml`：编排前后端与数据卷；可选反向代理（生产）。
- 后端镜像在构建时安装 Go `primitive`，运行时直接调用可执行文件。

### 数据流程
1. 用户上传图片并设置参数（如 `-n` 形状数、`-m` 模式、尺寸、透明度等）。
2. 后端保存上传并创建任务，生成任务 ID，启动 `primitive` 子进程。
3. 后端通过解析子进程输出、或统计帧文件生成数量推断进度，写库并通过 WebSocket 推送。
4. 前端通过 WebSocket 订阅并展示实时进度（进度条/日志）。
5. 任务完成后生成 PNG / SVG / GIF 等结果并可下载；图库展示近期任务。
6. 后台页面提供任务列表、筛选、基本运维信息（后续可扩展撤销/限流/鉴权等）。

## 技术栈

- 后端：FastAPI、Uvicorn、Pydantic、SQLModel（SQLite）、Aiofiles、dotenv
- 引擎：Go（`primitive`），通过 `go install github.com/fogleman/primitive@latest` 获取
- 前端：React、TypeScript、Vite、Tailwind CSS
- 工具：Docker、docker-compose

## 仓库结构（目标）

```
primitive/
  backend/
    app/
      __init__.py
      main.py
      config.py
      models.py
      jobs.py
      notifier.py
      static/            # 可选：生产环境静态文件托管
    .env.example
    Dockerfile
    pyproject.toml
  web/
    src/
      components/
      pages/
      App.tsx
      main.tsx
      index.css
    index.html
    package.json
    tsconfig.json
    tailwind.config.ts
    postcss.config.js
    vite.config.ts
    Dockerfile
  docker-compose.yml
  .gitignore
```

## 前置条件

请选择其一：

- 使用 Docker（推荐）
  - Docker Engine ≥ 24
  - docker-compose v2

- 本机原生安装
  - Python 3.10+
  - Node.js 20+
  - Go 1.22+（用于安装/构建 `primitive`）

## 快速开始（Docker）

1. 复制环境文件：
   ```bash
   cp backend/.env.example backend/.env
   ```
2. 构建并运行（开发）：
   ```bash
   docker compose up --build
   ```
3. 访问：
   - 前端开发服务器：`http://localhost:5173/`
   - API 文档（Swagger）：`http://localhost:8000/docs`
   - 健康检查：`http://localhost:8000/healthz`

生产环境可选择：前端构建产物由后端静态托管，或通过 Nginx/Caddy 反向代理分别转发到前后端容器。

## 快速开始（本机，无 Docker）

Windows PowerShell 示例：

1) 后端：
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -U pip
pip install -e .
# 安装 Go primitive（确保 Go 环境已安装）
go install github.com/fogleman/primitive@latest
# 确保 GOPATH/bin 在 PATH，例如：
$env:PATH="$env:USERPROFILE\go\bin;$env:PATH"
# 运行 API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2) 前端：
```powershell
cd web
npm install
npm run dev
# 打开 http://localhost:5173
```

## 环境变量

`backend/.env.example` 内容示例：

```
APP_ENV=development
APP_HOST=0.0.0.0
APP_PORT=8000
# 上传与任务输出目录（Docker 中建议挂载卷）
DATA_DIR=/data
# 为 true 时，后端在根路径托管 web/dist 静态文件
SERVE_STATIC=false
# 跨域白名单（开发）
CORS_ORIGINS=http://localhost:5173
# 最大上传尺寸（MB）
MAX_UPLOAD_MB=25
```

## API（概览）

- `POST /api/jobs`（multipart/form-data）：上传图片与参数 `{ n, m, s, r, a, bg, rep, nth, v }`
- `GET /api/jobs/{id}`：查询任务状态与元数据
- `GET /api/jobs/{id}/outputs`：成果文件列表与下载链接
- `WS /ws/jobs/{id}`：实时推送（进度、日志）
- `GET /healthz`：健康检查
- 管理端：
  - `GET /api/admin/jobs`：任务列表
  - `POST /api/admin/jobs/{id}/cancel`：取消任务（后续完善）

## primitive 参数（参考）

引用自上游文档 [fogleman/primitive](https://github.com/fogleman/primitive)：

- `-i`：输入文件
- `-o`：输出文件（可用 `%d` / `%03d` 保存帧序列）
- `-n`：形状个数
- `-m`：模式：0=combo, 1=triangle, 2=rect, 3=ellipse, 4=circle, 5=rotatedrect, 6=beziers, 7=rotatedellipse, 8=polygon
- `-rep`：每次迭代额外加入 N 个形状并降低搜索（对 beziers 常有益）
- `-nth`：当输出路径包含 `%d` 时，保存每 N 帧
- `-r`：在处理前重采样较大的输入图像
- `-s`：输出图像尺寸
- `-a`：颜色 alpha（0 表示让算法为每个形状自选 alpha）
- `-bg`：初始背景色（hex）
- `-j`：并行 worker 数
- `-v` / `-vv`：日志详细程度

备注：启用 `%d` 序列输出时，我们可据此统计进度。

## 开发规范

- 后端：
  - 全量类型注解、模块内职责单一、合理错误处理。
  - 使用 SQLModel 管理模型与迁移（SQLite 默认）。
  - Black/Ruff 格式化与静态检查（可在 CI 加入）。
- 前端：
  - 严格 TypeScript、ESLint + Prettier。
  - Tailwind 实现响应式与无障碍友好组件，配色活泼但层次明确。
- 提交：Conventional Commits；建议在 CI 进行 lint/build。

## 本地开发

- 后端：
  - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
  - 修改 `backend/app/*.py` 自动热重载。
- 前端：
  - `npm run dev`（`web/` 目录内）。
  - Vite Dev Server 直连 API（CORS）或配置代理。

## 生产部署

推荐 Docker + 反向代理：

- 构建镜像：
  ```bash
  docker compose -f docker-compose.yml build
  ```
- 后台运行：
  ```bash
  docker compose up -d
  ```
- 可选：`SERVE_STATIC=true` 时，将前端构建产物复制到 `backend/app/static/`，由后端直接托管。

## 安全与限制

- 用 `MAX_UPLOAD_MB` 控制上传大小。
- CORS 与 HTTPS 通过反向代理配置。
- 限制允许的图片类型（PNG/JPG）并按需做安全扫描。

## 许可

- 本编排器以 MIT 许可发布。
- 核心引擎来自 [fogleman/primitive](https://github.com/fogleman/primitive)（MIT）。部署时请同时遵守上游许可。

## 路线图

- 支持 Postgres 与分布式队列（Redis/RQ 或 Celery）。
- 后台 OAuth 登录与权限。
- 更精细的 `-vv` 日志解析以提升进度与统计。
- 结果文件接入 S3 兼容对象存储。 