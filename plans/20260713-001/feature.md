# 抛弃 Cloudflare → 内网 Docker 迁移执行文档

> 目标: CF 平台整体不可用, 以**内网单机 docker-compose** 替代. 员工机与后端服务同处 10.0.x.x 内网, 直连 MeterSphere / ele-harness, 无公网入口. 本文含决策、影响面、Phase A 前置动作、Phase B 切换动作; 不含最终切换脚本.

## 0. 锁定决策 (2026-07-13)

四条已锁, 后续动作全部基于此. 每条附"为什么", 便于一眼否决.

- **拓扑**: 内网单机 docker-compose. 由此**整块去掉**: cloudflared tunnel / VPC service binding / 公网 TLS / DNS 归属 / Google OIDC 域名回调.
- **DB → libSQL, 但主路径是 embedded `file:` 不是独立 server** (较原稿修正, 见下). 客户端 `@libsql/client`, 经 A3 adapter 吸收 API 差异, route 代码不改.
- **Auth → 手动输入公司邮箱 (`@elestyle.jp`) + cookie 荣誉制 + gateway 统一收口**. 放弃 Google OIDC / oauth2-proxy / 任何外部 IdP. 内网裸 http 即可, 无 DNS/证书需求. 所有鉴权收口到 gateway, 下游不再各自校验; bypass 表收敛到 4 项技术必要.
- **架构兼容**: 走 embedded 后**原稿的 Rosetta / `platform: linux/amd64` 整块作废** (那是 sqld image 无 multi-arch 才需要的). embedded 模式下 `@libsql/client` 用按平台预编译的 native addon, 只需 build 镜像时用 `docker buildx --platform=<目标架构>`, npm 自动装对二进制 —— build 时一次性解决, 无 runtime 模拟.

### 0.1 DB 方案: 为什么 embedded `file:` 而非独立 sqld 容器

原稿锁定"单 sqld 容器承接两库". **改为 embedded `file:` 作主路径**, 理由:

- **每个库都是单写入方**: `ele-autopilot` DB 只有 autopilot 容器读写; `ele-autotesting` DB 只有 autotesting 容器读写 (ingest 是 autotesting → autopilot 走 HTTP, 不是直连对方 DB); gateway 无 DB. **不存在跨进程并发写同一库的场景** —— 而这正是独立 DB server 存在的唯一理由.
- **收益 (符合 no-over-engineering)**: 消灭 sqld 容器 + 整块多架构/Rosetta 处理 + namespace 配置 + 一跳网络. `@libsql/client` 用 `createClient({ url: 'file:/data/autopilot.db' })`, 客户端代码与 http 模式完全一致, A3 adapter 不变.
- **Fallback (保留, 供未来否决用)**: 若日后需要**同一库多容器副本横向扩展**, 再切独立 sqld server (`ghcr.io/tursodatabase/libsql-server`). 届时须注意: ① 单实例多库要 `--enable-namespaces` + admin API 逐个建 namespace, 客户端经 **Host header** (`<db>.host`) 选库, path 路由 (`http://host:8080/<db>`) 仅本地测试模式 —— 原稿的 `LIBSQL_URL=http://sqld:8080/<db-name>` 写法在生产不成立; ② image 无 multi-arch stable tag, 才需要 `platform: linux/amd64` + Rosetta. embedded 主路径下这些全部不涉及.

### 0.2 DB API: `@libsql/client` 与 D1 **不是** 1:1 同构

原稿反复称 "API 1:1 同构 / 20+ 处零改" —— **不准确, 已修正**.

- `@libsql/client` 核心 API 是 `execute({sql, args})` / `batch([...])` / `transaction()`, **没有** D1 的 `.prepare(sql).bind(...).all()` 链式 API. (所谓 compat 模块属于另一个包 `@tursodatabase/serverless/compat`, 非 D1 shim.)
- **route 代码零改是真的, 但前提是 A3 adapter 吸收差异**, 不是客户端天然兼容. adapter 才是真实工作量.
- **好消息**: adapter 只需覆盖本仓**实际用到的** D1 表面 (已 grep 全仓, 不必 over-engineer):
  - 方法: `prepare()` / `bind()` / `all()` / `run()` / `batch()` / `exec()`
  - 返回字段: `.all()` 的 `.results`, `.run()`/`.all()` 的 `.meta.changes`
  - **未用到**: `.first()` / `.raw()` / `.dump()` / `.meta.last_row_id` —— adapter 无需实现.
- **唯一 correctness 风险 = `.batch()` 原子性**: `jobs.ts` (job + subtasks 一次性插入)、`sync.ts` (多 op 原子写) 依赖 batch 原子性. libSQL `batch()` 默认包隐式写事务, 语义相近但**边界 (失败回滚) 与 D1 不完全一致**. 迁移日必须**加一个 rollback 测试**坐实, 不做口头等价断言.

### 0.3 Auth: 语义精修 (较原稿修正两处)

- **cookie 生命周期 (原稿写反了)**: 原稿说"无 `Max-Age`/`Expires` → 永不过期". 事实相反 —— 按 RFC 6265, **无 `Max-Age`/`Expires` 是 session cookie, 关浏览器即失效**. 且 Chrome/Firefox 对持久 cookie 有 **~400 天上限**, "永不过期"根本不可达. **修正**: 登录时写 `Max-Age=34560000` (400 天), 或每次响应 re-set 做滑动续期. `/logout` 仍是主动切换身份的方式.
- **header 信任规则 (原稿"透传或覆盖"含糊, 改为确定规则)**:
  1. 请求带**有效 `@elestyle.jp` cookie** → gateway 用 **cookie 派生 email**, **覆盖任何入站 `X-Auth-User-Email` header** (浏览器无法用 header 冒充他人).
  2. 无 cookie 但入站 `X-Auth-User-Email` 后缀是 `@elestyle.jp` → 信任 (脚本/CLI 荣誉制). **这是被明确接受的风险**: 内网任何人可伪造该 header 冒充身份, 网络边界 + 荣誉制是唯一防线.
  3. 均无 → `Accept: text/html` 时 302 `/login`, 否则 401.
- **cookie 内容**: 明文 email, `Path=/; SameSite=Lax`, 不启用 signed/HMAC (内网 + 荣誉制足够).
- **bypass 表 4 项**: `/healthz` (LB) + `/login` + `POST /login` + `/logout` (登录页自身). 其余 (`/api/*` 含 ingest、`/install.sh` + `/releases/*`、`/assets/*`) 全部纳入统一鉴权 —— 浏览器天然带 cookie, 脚本带 header.

## 1. 现状 CF 依赖面 (五类角色, 不能当一件事迁)

- **Runtime**: gateway / ele-autopilot / ele-autotesting 三个 Workers V8, RR7 或 Hono + `@cloudflare/vite-plugin`; `nodejs_compat` / `_v2` 已开.
- **数据面**:
  - D1: `ele-autopilot` (`fd3368b3-...`), `ele-autotesting` (`66966c51-...`), 纯 SQLite 方言 migration.
  - R2: `ele-autopilot-screenshots` (job 截图), `ele-autopilot-releases` (`ele-autopilot-local` wheel/sdist + `latest.txt`).
  - Durable Object + Container: `ele-autotesting` 的 `MarkitdownContainer` (`containers/markitdown/Dockerfile` 已存在).
- **网络面**:
  - Service bindings: gateway → `AUTOPILOT` / `AUTOTEST`; autotesting → `AUTOPILOT`.
  - VPC services: autotesting → `METERSPHERE` (`019e46cf-...`), `AGENTIC_LOOP` (`019e3fe7-...`), 均经 cloudflared tunnel 打到内网 docker.
  - Assets binding: autotesting `env.ASSETS` (SPA 静态兜底).
- **入口 / 身份**: 唯一公网入口 `qa.<sub>.workers.dev`; CF Access + Zero Trust + Google Workspace SSO 限 `@elestyle.jp`; gateway 与 autopilot 各自二次校验 `cf-access-jwt-assertion` / `CF_Authorization`.
- **发布 / 分发**: 四 workflow lockstep, 均 `wrangler deploy`; `autopilot-local` workflow 走 `wrangler r2 object put` 推 wheel/sdist/`latest.txt`; gateway `/releases/*` 反代 R2.

## 2. 影响面对比

<!-- prettier-ignore -->
| 子项目 | CF 依赖强度 | 主要迁移动作 |
|---|---|---|
| gateway | 高 | 换 Node runtime; 加 `/login` (inline HTML) + cookie/header 中间件 + 统一鉴权 + 转发注入 `X-Auth-User-Email`; service binding → HTTP fetch |
| ele-autopilot | 高 | D1 → libSQL (embedded); R2 (screenshots + releases) → S3 兼容; 拆掉各路由 `requireAccessUser` |
| ele-autotesting | 最高 | D1 → libSQL (embedded); DO+Container → 平铺 sidecar; VPC → 内网直连; ASSETS → 静态 serve; `caches.default` 替换; Worker 内部转发从 cookie 抽 email 塞 header |
| ele-autopilot-local | 低 | 首次装录入 email 到 `~/.ele-autopilot/config`; 所有请求带 `X-Auth-User-Email` header; 改 wheel/`latest.txt` 下载 URL 与 callback base URL |

## 3. 外部现实核查 (代码看不到, 已确认)

- **MeterSphere 内网通路**: 内网可达域名 `bi.elepay.link`, `METERSPHERE_URL` 直接指该域名 (含 scheme). 注意: 这是**出站上游依赖**, 可为 https; 与"我方入口裸 http"不冲突.
- **agentic-loop backend**: 与本项目一起 Docker 化共部署, 通路随之解决 (compose network service name 或跨 compose external network, 与 ele-harness 迁移联合定). Phase A 不作外部依赖处理, 迁移日再定 URL.
- **员工机接入**: 常驻同一 10.0.x.x 内网, 无 VPN. wheel / API 分发全走内网 URL, 不需要 GitHub Release fallback.
- **内网域名 + TLS**: 随 Auth 方案去掉. 员工浏览器直接访问 `http://10.0.x.x:port`. 日后有合规需求再补 TLS.
- **LLM key 数据**: 存在 `ele-autopilot` D1 `settings.llm_api_key` (见 `app/routes/api.admin.settings.llm-key.tsx`), 不是 wrangler secret, DB 迁移时数据必须带走.

## 4. Phase A — 迁移前置动作 (CF 仍在跑, 可现在做)

行为不变, 抽象层加进去后 CF 实现直接返回原 binding, 迁移当日只加第二个实现. 每项独立可发, lockstep bump 走既有闭环. 按建议起手顺序:

- **A1 · service binding + VPC → HTTP fetcher 抽象** (最低风险验证套路)
  - 影响: `gateway/workers/app.ts:forwardTo` (→ AUTOPILOT/AUTOTEST), `ele-autotesting/packages/server/src/routes/autopilot.ts` (→ AUTOPILOT), MeterSphere 调用点, agentic-loop 调用点.
  - 动作: 抽 `upstream(name, req)` factory. CF 分支 `binding.fetch(req)`; `<NAME>_URL` 存在时 `fetch(base + path, req)`. `env.AUTOPILOT.fetch('http://autopilot/api/...')` 本就是 fake host, 迁移日把 host 换成真 URL.
  - 迁移后目标 URL: `AUTOPILOT_URL`/`AUTOTEST_URL` = compose service name; `METERSPHERE_URL` = `https://bi.elepay.link`; `AGENTIC_LOOP_URL` 联合迁移时定 (Phase A 抽象保持指向 VPC binding).

- **A2 · Object Storage 接口**
  - 影响: `ele-autopilot/lib/screenshots.ts`, `ele-autopilot/app/routes/releases.local.$.tsx`.
  - 动作: 定义 `ObjectStore { put/get/list/delete }` + `httpMetadata`/`httpEtag`, CF 实现包 `R2Bucket`. 未来实现走 aws-sdk-v3 → MinIO. `MAX_SCREENSHOT_BASE64_LENGTH=6MB` 本次不动.

- **A3 · DB 客户端 adapter** (核心工作量, 见 §0.2)
  - 影响: `ele-autopilot/lib/db/connection.ts:getDb` 已是薄封装 (当前直接 `return getBindings().DB`), 改返回 `Db` interface; `ele-autotesting/.../routes/*.ts` 20+ 处 `c.env.DB.prepare(...)` 统一走 `getDb(c)` helper.
  - 动作: 定义 `Db` interface, **仅覆盖实际用到的表面** (`prepare/bind/all/run/batch/exec` + `.results` + `.meta.changes`, 不实现 first/raw/dump/last_row_id). CF 实现 `return env.DB`. 迁移日加 libSQL 实现: `createClient({ url: env.LIBSQL_URL })` (embedded 时 `file:/data/<db>.db`), adapter 内把 D1 fluent 翻成 `execute/batch`.
  - **必做验证**: `.batch()` 原子性 (jobs.ts / sync.ts) 写一个失败回滚测试, 坐实 libSQL batch 事务语义与 D1 一致.

- **A4 · Auth provider 抽象 + 深度防御拆除**
  - 影响: `gateway/workers/app.ts:verifyAccessJwt`, `ele-autopilot/lib/access-auth.ts:requireAccessUser`, `api.admin.settings.llm-key.tsx` 内嵌校验, 及所有下游调 `requireAccessUser` 的路由.
  - Phase A: 抽 `AuthProvider.verify(req) => {email} | null`. CF 实现保留 `jose` JWT 校验; Docker 实现读 `X-Auth-User-Email` header. 下游少数敏感路由 (如 `settings/llm-key`) 先保留 `verify` 兜底, 其它路由深度防御 Phase A 不动.
  - Phase B (迁移日追加): gateway 统一鉴权 + 除 4 项 bypass 外全部注入 header → 下游彻底拆 `requireAccessUser`, 只留 `AuthProvider.verify` 读一次 header. autotesting 内部转发点 (含 `/api/autopilot/ingest` → autopilot `/api/v1/ingest/tasks`) 从 UI cookie 抽 email 塞 header.

- **A5 · markitdown env seam 前置**
  - 现状: `containers/markitdown/Dockerfile` 已 Docker 化; `markitdownProxy.ts:16` 已有 `MARKITDOWN_DEV_URL`.
  - 动作: `matchesMarkitdownPath` 优先读 `MARKITDOWN_URL`, 未设才走 `getContainer(env.MARKITDOWN, 'singleton')`. 迁移日 compose 跑同 image + 设 `MARKITDOWN_URL`, DO/Container 分支自然沉为 dead code.

- **A6 · releases 读写分离**
  - 读侧: `releases.local.$.tsx` 走 A2 `ObjectStore`.
  - 写侧: workflow 保持 `wrangler r2 object put`, 迁移日改 push 到内网 MinIO.
  - `install.sh` / `latest.txt` 消费方 (`ele-autopilot-local` 安装脚本) 配置化 base URL, 消灭硬编码, 迁移日改内网 URL.

## 5. Phase B — 迁移当日切换 (无法在 CF 上先跑)

按拓扑从外到内:

- **入口栈 + 部署硬约束 (安全前提, 必须落实)**:
  - caddy/nginx 反代绑内网 IP + 端口, 裸 http. 无 oauth2-proxy —— 身份签发/校验全在 gateway app 内部 (`/login` inline HTML + `POST /login` + `/logout` + cookie/header 中间件).
  - **compose 只 publish gateway 端口**. autopilot / autotesting / (sqld 若用) / minio / markitdown **一律不对宿主/内网暴露端口**, 仅经 compose 内部网络互通. 否则任何人直连下游、自带 `X-Auth-User-Email` header 即冒充, "gateway 唯一鉴权"当场破 —— 这是统一收口模型成立的硬前提.
  - 校验优先级 = §0.3 header 信任规则. bypass 表 4 项.
- **三 Worker → Node/Bun 容器**:
  - RR7 (gateway/autopilot): 去 `@cloudflare/vite-plugin`, 换 node 部署 (`@react-router/node` + 自建 server, 或 `react-router-serve`); 出 `build/server + build/client`. autotesting 的 Hono 天生跨 runtime.
  - **workerd 专有 API gotcha (移植前必查)**: `caches.default` (`ele-autotesting/packages/server/src/services/svgRenderer.ts:25`) node 无对应, 须换内存缓存或去缓存; `ExecutionContext` (三处 fetch 签名) 仅类型, node 下给 stub 或省略; markitdown DO 走 A5. 已确认**无 `waitUntil`**.
  - 基础镜像 `oven/bun:1` 或 `node:22`. 跨架构 dev/prod 用 `docker buildx --platform=<目标>` 构建 (让 `@libsql/client` native addon 装对二进制).
- **静态资源**: autotesting `env.ASSETS.fetch` 兜底 → nginx serve 或 Hono `serveStatic('../web/dist')`.
- **服务间通信**: compose 内部 DNS (`gateway`/`autopilot`/`autotesting`/`minio`/`markitdown`, 及联合部署后的 `agentic-loop`) 直连, `*_URL` 指 service name; MeterSphere 走 `https://bi.elepay.link`.
- **数据卷 (embedded 主路径)**:
  - autopilot 容器挂 volume `/data`, `LIBSQL_URL=file:/data/autopilot.db`; autotesting 同理 `file:/data/autotesting.db`. 各库随各自容器, 无独立 DB 容器.
  - migrations: 纯 SQLite 方言, 迁移日 `sqlite3 <db>.db < *.sql` 一次性导入 (或复用 `wrangler d1 migrations` 生成文件).
  - **LLM key 数据** (`settings.llm_api_key`) 随 DB 一起导, 不是环境变量.
  - MinIO 承接 R2 (screenshots / releases 各一 bucket); 或裸目录 + nginx serve 保守方案.
- **secrets**: wrangler `vars`/`secrets` → `.env` + docker secrets. **一起去掉**: Google OIDC client id/secret、oauth2-proxy cookie secret、CF Access `TEAM_DOMAIN`/`POLICY_AUD`.
- **发布流水线**:
  - 四 workflow `wrangler deploy` → `docker build && docker push` (GHCR 或自建 registry) → 宿主 `docker compose pull && up -d`.
  - lockstep 版本 (`vX.Y.Z`) → image tag 1:1.
  - `autopilot-local` 的 R2 put → 内网 MinIO, `latest.txt` 语义不变.
- **observability**: CF Workers logs → 容器 stdout + Loki / Docker log driver. 现有 `console.error` 全部保留.

## 6. 好消息 (可直接减压, 已剔除不实项)

- `ele-autopilot-local` 几乎不动: Python + 本机浏览器, 仅换 wheel 源与 callback base URL.
- markitdown 已 Docker + 已有 env seam, DO/Container 是最容易剥离的一块.
- Service binding + VPC → 平铺 HTTP 是**简化**.
- Worker 128MB / CPU 限制消失, screenshot 6MB 上限等运行时约束届时可放宽 (本次不改).
- 两份 CF Access JWT 校验合成一份, 深度防御整块拆除, 身份校验唯一发生在 gateway.
- **内网部署减压**: cloudflared tunnel 整块消失; 公网 DDoS/bot 面消失; CF Access + Zero Trust 面板运维消失; 无 wrangler `services`/`vpc_services`/`assets.run_worker_first` 等 CF 独占配置.
- **Auth 荣誉制减压**: 无 OIDC → 无 TLS/DNS/证书活儿; 入口栈只剩 caddy/nginx + gateway app 两层; secrets 面板极简; 登录页极简 (一个 email input).
- **DB 减压 (措辞已修正为诚实版)**:
  - route 代码零改 —— **靠 A3 adapter 吸收 API 差异**, 非客户端天然兼容 (见 §0.2).
  - embedded `file:` 主路径消灭 sqld 容器 + 整块多架构/Rosetta + namespace 配置 (见 §0.1).
  - `.sql` migration 纯 SQLite 方言, `wrangler d1 migrations` 生成文件可直接 `sqlite3 <` 导入.
