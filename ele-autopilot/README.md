# ele-autopilot

QA 任务管理后台. React Router v7 (Framework mode) + React 19 + Ant Design + Tailwind, Bun. Phase B 运行时: Node/Bun 容器 + libSQL embedded (业务数据) + MinIO (截图/发布产物). 部署见 [deploy/](../deploy).

## 开发

```bash
bun install
bun dev            # http://localhost:3000 (react-router dev, UI 开发)
bun run smoke      # libSQL adapter 回归: batch 原子性 + FK 级联
```

发布前验证 (lint / typecheck / build / smoke) 见 [deploy.md §本地验证](../deploy.md#2-本地验证). 完整服务 (server.ts + libSQL + MinIO) 起法见 `.env.example` 与 [deploy/README.md](../deploy/README.md).

React DevTools 独立窗口: 必须先 `bunx react-devtools` 再 `bun dev`, 反序无效.

## 运维 (libSQL / MinIO)

libSQL 库在容器 volume (`/data/autopilot.db`); 对象存储走 MinIO. 数据面在 compose 内网, 从宿主操作:

```bash
# 查 libSQL (进容器)
docker compose exec autopilot bun -e "import{createClient}from'@libsql/client';const c=createClient({url:process.env.DATABASE_URL});console.log((await c.execute('SELECT COUNT(*) c FROM tasks')).rows)"
# 或直接 sqlite3 卷文件
sqlite3 /var/lib/docker/volumes/deploy_autopilot_data/_data/autopilot.db "SELECT COUNT(*) FROM tasks"

# 查/传对象 (mc = MinIO client)
mc ls local/ele-autopilot-screenshots/
mc cp ./file local/ele-autopilot-releases/local/<ver>/

# 备份: 卷快照 (autopilot.db) + mc mirror bucket. 详见 deploy/README.md.
```

> `settings.llm_api_key` 存 libSQL, DB 迁移/备份时必须带走.
