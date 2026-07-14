# AGENTS

LLM 约束. 工程定位见下, 拓扑 / 子项目见 [README.md](./README.md), 发布流程见 [workflow.md](./workflow.md).

## 工程定位

端到端 **QA 测试用例自动化** 仓库. 四步链路:

1. **上下文化**: Figma / 纯文本 / Confluence 等公司资产 → Agent 可用 context.
2. **用例生成**: [`ele-autotesting/`](./ele-autotesting) AI 生成测试用例, 与 **MeterSphere** 测试平台双向打通.
3. **智能调度**: 外部 [`ele-harness`](../ele-harness) (同级独立仓库, Agent 并发调度平台) 并行跑用例, 产出预期结果.
4. **录入 + 执行**: 结果回灌 [`ele-autopilot/`](./ele-autopilot) 任务中心, 再下发 [`ele-autopilot-local/`](./ele-autopilot-local) 驱动本机浏览器完成实际操作.

## 优先级

用户本轮指令 > 子目录 `AGENTS.md` > 本根 > README / 历史文档. 代码 / 配置 / workflow 是事实源.

## 工作模式

- 改子项目前 `cd <子目录>` 并读最近 `AGENTS.md`.
- "改 X / 加 Y / 修 Z" 默认含完整闭环 (流程 / 版本规则 / commit & tag 命名 / CHANGELOG 写作 / workflow 触发面全见 [workflow.md](./workflow.md)): 改代码 -> 本地验证 -> `scripts/set-version.sh X.Y.Z` bump 版本 (根 VERSION 真值同步四 manifest + uv.lock) + 根 `CHANGELOG.md` 加段 -> `release: vX.Y.Z` commit -> annotated tag -> push branch + tag -> 等三个 workflow success.
- workflow 失败读 log 定位; 不卡在 "要不要 deploy".
- 豁免闭环: 用户明示 "只改不发 / 先看看 / 本地试"; 或仅改文档 / prompt / 注释 / 本地脚本 / jjask.
- 仅外部凭据 / 密钥 / 用户独有偏好缺失且无法从仓库 / git / jjask 推断时提问, 一次问完.

## 跨项目硬约束

- 不建顶层 `package.json` / `pyproject.toml`; 不引入 Turborepo / Nx / Bazel.
- 不统一技术栈; Bun / uv / pnpm 各自独立.
- 顶层只放仓库治理 / `.github/` / `deploy/` (内网编排) / `gateway/` / 三业务目录 / 未来 `contracts/`; 不放业务代码.
- `ele-autopilot` <-> `ele-autopilot-local` HTTP API 双向耦合; 改一端必须同步另一端类型 / schema.
- gateway 收口身份后注入 `X-Auth-User-Email` header, 三 web 工程共用此契约 (`lib/constants.ts`); 改 header 名必须四处同步.
- 根 `.gitignore` 兜底; 子目录 `.gitignore` 是本项目事实源.
- GitHub workflow 只放根 `.github/workflows/`.

## 部署形态 (内网单机 docker-compose)

- 内网单机 docker-compose (见 [deploy/](./deploy)), **无公网入口**. 唯一对外 = nginx 反代 gateway (裸 http, 绑内网 IP); 下游一律不暴露端口.
- gateway / autopilot / autotesting = Node/Bun 容器; 持久化 libSQL embedded (`file:`); 截图落 autopilot 持久卷 (`/data/screenshots`, 无对象存储服务); markitdown HTTP sidecar; 身份 gateway 自签 cookie + `X-Auth-User-Email` header 荣誉制.
- **不引入 Cloudflare Workers 栈**: wrangler / `wrangler.jsonc` / `worker-configuration.d.ts` / `@cloudflare/*` / D1 / R2 / Durable Object / VPC binding (本项目 Node/Bun + Docker 内网部署, 不适用).

## 文件约定

- 文档高密度: 能一行不写两行, 能列表不写段落. 子项目 `README` = 概览 / 本地运行, `AGENTS` = 本项目独有红线 (通用 / 跨项目约束写本根, 不下沉).
- 每个 md 对**自身职责自包含**; 仅跨域主题 (部署归 `deploy/`, 发布归 `workflow.md`) 才用指针, 且**单一指针**: 同一内容不双向指来指去 / 不一句塞多指针 / 不写无读者的指针 (如 CHANGELOG 勿指向自己的写作规范); 引他文档指其单一真源, 勿深锚进 AGENTS / 配置文件.
