# Changelog

QA AutoPilot 全仓统一变更日志. 四子项目 lockstep 同版本发布 (见 [workflow.md](./workflow.md)), 单条目按受影响子项目 (`gateway` / `autopilot` / `autopilot-local` / `autotesting`) 标注 scope; 多子项目同一改动只记一次.

## [2.1.3] - 2026-07-14

### Fixed

- **autopilot-local**: Intel Mac 装机 install.sh 自动 pin `cryptography<45`, 绕开 macOS x86_64 无 cryptography 49 预编译 wheel 导致的 sdist + Rust 编译失败.

## [2.1.2] - 2026-07-14

### Fixed

- **gateway**: 首页「安装本地 agent」步骤的复制按钮在内网 HTTP 部署下点击无效 (非 secure context 下 `navigator.clipboard` 不可用直接 return); 现降级到 `textarea` + `execCommand('copy')`.

## [2.1.1] - 2026-07-14

### Changed

- **autopilot-local**: 首次种子复制系统 Chrome profile 时不再包含浏览器扩展; Chrome 启动加 `--disable-extensions`, 存量已种子 profile 也不再加载扩展 (自动化不需要).

## [2.1.0] - 2026-07-14

### Changed

- **autopilot-local**: browser-use 升级到 0.13.4 (fix: 导航就绪检测 / markdown 抽取丢链接 / LLM 输出截断误判解析错误; keep BrowserError 可恢复), 同步升级 fastapi 0.139, uvicorn 0.51.

## [2.0.0] - 2026-07-14

整栈部署形态从 Cloudflare Workers 迁移到内网单机 docker-compose (Node/Bun 容器); Web 界面对最终用户行为基本不变, 部署与运维方式完全改变.

### Changed

- gateway / autopilot / autotesting 三服务由 Cloudflare Worker 改为 Bun/Node 容器, docker-compose 编排, 无公网入口; 唯一对外入口为 nginx 反代 gateway (裸 http, 绑内网 IP), 下游不暴露端口.
- **autopilot** / **autotesting**: 持久化从 Cloudflare D1 改为 libSQL embedded (`file:`), 数据落宿主持久卷, server 首启自建表.
- **autopilot**: 任务截图存储从对象存储 (R2) 改为本地持久卷 (`/data/screenshots`) 文件存储.
- **autotesting**: MeterSphere 上游域名 `bi.elepay.link` → `qa.elepay.link`.
- 版本管理统一: 根 `VERSION` 为唯一真值, `scripts/set-version.sh X.Y.Z` 一条命令同步四 manifest + uv.lock; 四子项目 CHANGELOG 合并为根单一文件.

### Removed

- 整栈不再依赖 Cloudflare 栈 (Workers / D1 / R2 / service binding); wrangler 配置与相关文档一并移除.
- **autopilot-local**: 移除独立 releases 分发链, wheel 随 autopilot 镜像构建打入, `install.sh` 经网关直连下载.

## [1.28.10] - 2026-07-13

### Added

- **gateway**: Docker 迁移前置抽象层: 下游寻址新增 `AUTOPILOT_URL` / `AUTOTEST_URL` 配置, 留空 (默认) 时行为不变, 仍走 service binding.
- **autopilot**: Docker 迁移前置抽象层 (DB / 对象存储 / 鉴权 seam), 对外行为与 API 不变.
- **autotesting**: Docker 迁移前置抽象层 (下游寻址 / DB / 鉴权 / markitdown seam): 新增 `AUTOPILOT_URL` / `METERSPHERE_URL` / `AGENTIC_LOOP_URL` / `MARKITDOWN_URL` 可选配置, 未设 (默认) 时行为不变.

## [1.28.9] - 2026-06-01

### Fixed

- **autotesting**: 「送至 AutoPilot」弹窗切换 prompt 模板时, 点击与内置模板内容相同的「我的副本」, 高亮不再错误停留在第一个模板, 现正确落在所点的副本上。

## [1.28.8] - 2026-05-29

### Removed

- **autopilot**: 移除任务列表顶部的统计指标条 (任务总数 / 成功率 / 进行中 / 失败累计): 信息冗余, 无实际参考价值.

## [1.28.7] - 2026-05-29

### Fixed

- **autopilot**: 任务列表「任务内容」列不再无限向右延伸: 内容超长时自动换行并截断为 3 行, 消除横向滚动条.

## [1.28.6] - 2026-05-29

### Changed

- **autotesting**: 「送至 AutoPilot」调用 ele-harness 的长任务传输优化: 仅保活心跳 + 末尾取最终结果, 减少无用数据经链路回传, 产物不变。

## [1.28.5] - 2026-05-29

### Fixed

- **autotesting**: 调用 ele-harness 执行耗时较长的任务时, 不再在约 5 分钟后中断报 "Network connection lost"; 现可稳定跑完并返回结果。

## [1.28.4] - 2026-05-29

### Fixed

- **autotesting**: 「送至 AutoPilot」弹窗的 prompt preset 切换按钮现在高亮当前生效项, 不再两个都白底、看不出当前用的是哪个模板。

## [1.28.3] - 2026-05-29

### Changed

- **autotesting**: 「编排」MeterSphere 模块下拉改用图标分层 (📁 含子模块的分组 / 📄 末级模块) 并按层缩进, 取代原先难辨归属的破折号前缀.
- **autotesting**: 「编排」「送至 AutoPilot」按钮改浅品牌底样式, 文案统一为 AutoPilot.

## [1.28.2] - 2026-05-29

### Changed

- **autotesting**: 「测试编排」MeterSphere tab 打开即全自动级联拉项目 / 模块 / 用例, 移除三个手动按钮; 项目必选默认第一个, 空表态文案分五档.
- **autotesting**: 「测试编排」MeterSphere 控件区改紧凑横排 (label 与控件 inline), select 收窄至 200–280px, 凭证 chip 移到行尾, 删除冗余文字.
- **autotesting**: 「内容生成」面板顶部新增「来源指示条」: 标明本次基于左侧哪一栏 (优化结果 / 输入原文); 优化结果为空时橙色提醒.
- **autotesting**: 「集成中心」四个 tab 简介文案精简, 不再重复云端存储与「留空保留原值」说明.

## [1.28.1] - 2026-05-28

### Changed

- **autotesting**: FCB-CASE 开 fence 加入 `id=N` 序号 (` ```case id=1 `), 一眼可见用例总数与当前序号; parser 兼容无 id 历史 fence. 模板版本 → 1.4.1.

## [1.28.0] - 2026-05-28

### Changed

- **autotesting**: 多用例「聚合 / 切片」统一升级为 **FCB-CASE 协议**: 每条用例独立 ` ```case ... ``` ` block, 聚合产物携带 `id` / `title` 元数据, 取代旧 `---` 与 `=== CASE N: ===` 分隔.
- **autotesting**: 提示词与 parser 同步切换, 取消整体外包 ` ```text ` 的旧约定. 模板版本 → 1.4.0.

## [1.27.3] - 2026-05-28

### Changed

- **autotesting**: 「联动」入口与文案统一改名「编排」(顶部按钮 / 弹层标题 / 「送入编排」图标).

## [1.27.2] - 2026-05-28

### Fixed

- **autotesting**: 「编排」面板 AutoTest 用例表模块路径长串溢出列宽: 模块列加宽, cell 内长串自动换行, hover 看全文.

## [1.27.1] - 2026-05-28

### Added

- **autotesting**: 「内容生成」结果工具栏新增「同步到云」与「发送到联动」两个图标按钮.
- **autotesting**: 「历史」抽屉拆分「上下文历史」与「AutoTest 用例历史」子 tab, 后者支持「使用」一键还原.
- **autotesting**: OutputDisplay 新增 `extra-actions` 插槽供父组件注入自定义按钮.

### Changed

- **autotesting**: 「同步到云」一并保存生成时的完整上下文 (原始提示词 / 优化结果 / 模板与上下文 / 选中模块 / 模型 / 优化模式), 「使用」时一次性还原.
- **autotesting**: 云端用例快照标题改用「用户原始提示词」前 80 字, 更易识别.

## [1.26.6] - 2026-05-28

### Changed

- **autotesting**: 「编排」表格列宽重分配, 长文本三列 (前置条件 / 步骤 / 期望) 加宽, 短列收窄.

## [1.26.5] - 2026-05-28

### Changed

- **autotesting**: 「编排」AutoTest 用例改读「内容生成」最近一次结果, 不再是写死示例.
- **autotesting**: 表格新增「前置条件」列, 录入 MeterSphere 时 `prerequisite` 同步使用.

## [1.26.4] - 2026-05-28

### Changed

- **autotesting**: 「开始生成」时选中模块说明改为拼接到 user prompt 末尾 (此前在 system prompt), 更贴近用户追加诉求场景.

## [1.26.3] - 2026-05-28

### Fixed

- **autotesting**: 「开始生成」入口「模块」多选下拉重写: 白底卡片 + 复选框列表, 顶部刷新图标按钮, Teleport 到 body 避免被遮挡.

## [1.26.2] - 2026-05-28

### Changed

- **autotesting**: 「添加数据源」选择弹窗支持按 Enter 确认选中.

## [1.26.1] - 2026-05-28

### Changed

- **autotesting**: MeterSphere 用例详情「模块」由末级名改为完整路径 (如 `Dashboard / 端末设置`), 聚合给 Autopilot 的文本同步.

## [1.26.0] - 2026-05-28

### Added

- **autotesting**: 集成中心新增「模块」Tab: 维护业务模块路径列表, 按账号存 D1 跨设备一致.
- **autotesting**: 「开始生成」入口新增「模块」多选下拉: 选中路径追加到提示词末尾并写入「所属模块」字段.

## [1.25.3] - 2026-05-28

### Changed

- **autotesting**: Toast 由右上角改为右下角, 避免遮挡顶部工具栏; 多条堆叠从底向上推.

## [1.25.2] - 2026-05-28

### Changed

- **autotesting**: 「需求场景」placeholder 精简为「需求场景（必填，便于复用）」.
- **autotesting**: 强化「场景」在历史抽屉与「选择上下文」列表中的视觉权重 (首行品牌色标签 + 大字号).

## [1.25.1] - 2026-05-28

### Fixed

- **autotesting**: Confluence 链接解析报「markdown 转换服务异常」: 前端调 markitdown MCP 漏带 `/autotest` 前缀导致路由错误.

## [1.25.0] - 2026-05-28

### Changed

- **autotesting**: 「Confluence 链接」/「Figma 链接」入口改为弹窗输入, 回车触发解析, 提供「更改」按钮.
- **autotesting**: 移除 Figma Token 托管说明小字.

## [1.24.3] - 2026-05-28

### Changed

- **autotesting**: 别名输入框文案改「需求场景（必填，便于后续查找复用）」, 列表展示标签由「别名」统一为「场景」.

## [1.24.2] - 2026-05-28

### Changed

- **autotesting**: 头部按钮顺序调整为「联动 / 模板 / 历史 / 集成中心 / 数据」.

## [1.24.1] - 2026-05-26

### Removed

- **autotesting**: 集成中心 Figma / MeterSphere 不再自动把 localStorage 旧凭证同步到云端, 升级用户需手动重填一次.

## [1.24.0] - 2026-05-26

### Changed

- **autotesting**: Figma Token 与 MeterSphere AK/SK 迁到云端 D1 (按账号), 跨设备一致; 首次打开自动迁移本地旧凭证.
- **autotesting**: 集成中心顶部加云端存储说明; ele-harness Tab → ELE-Harness.
- **autotesting**: Prompt 输入区 Figma 行不再单独要 Token, 统一由集成中心提供.

## [1.23.0] - 2026-05-26

### Added

- **autotesting**: 集成中心新增 ele-harness Tab: 自填 LLM provider / model / API Key / Base URL / Max Tokens / Temperature, 按账号存云端.
- **autotesting**: Base URL 按 provider 给默认值, 自托管 runner 用户自填.

### Changed

- **autotesting**: 触发 harness 测试前校验凭证, 未配置直接引导去集成中心填.

## [1.22.1] - 2026-05-26

### Security

- **gateway**: CF Access JWT 校验缺 `cf-access-jwt-assertion` header 时回退读 `CF_Authorization` cookie, 与 ele-autopilot 对齐 (纵深防御).
- **autotesting**: CF Access JWT 校验缺 header 时回退读 `CF_Authorization` cookie, 与 ele-autopilot 对齐 (纵深防御).

## [1.22.0] - 2026-05-26

### Changed

- **autopilot**: 派单前强校验集成中心已配置 LLM API Key, 未配置直接阻断, 不再让请求落到本地 agent. 集成中心与首页移除「环境变量 fallback」相关文案.

### Removed

- **autopilot-local**: 移除 `ELE_LLM_API_KEY` 环境变量兜底: LLM API Key 仅接受 autopilot 集成中心通过 `/autopilot/run` payload 下发, 缺失时任务直接失败. 旧版需先在集成中心录入 key 再升级.

## [1.21.1] - 2026-05-26

### Security

- **autopilot**: 修复 `/api/admin/settings/llm-key` 因 gateway `/api/*` Bypass 而对公网无鉴权: 路由内自验 CF Access JWT (`cf-access-jwt-assertion` header → `CF_Authorization` cookie), 仅 `@elestyle.jp` 已登录可读写, 匿名 401; `maskKey` 边界 `<8` 收紧到 `≤8`.

## [1.21.0] - 2026-05-26

### Added

- **autopilot**: 集成中心新增「LLM API Key」tab: 云端统一管理 Gemini API Key, 派单时自动注入本地 agent, 不再需每台机器配 `ELE_LLM_API_KEY`. UI 仅显示首尾 4 字符预览.

### Changed

- **autopilot-local**: `ELE_LLM_API_KEY` 改为可选: 优先用集成中心下发的 key, env 仅作离线 / 旧客户端 fallback. 两者均无时任务失败并提示原因.

## [1.20.0] - 2026-05-25

### Added

- **autotesting**: 新增「QA Orchestrator」模板预设 (推荐位): 把 MeterSphere 用例编排成 browser-use 可执行任务序列, 配合 ele-harness qa-orchestrator plugin.

### Changed

- **autotesting**: 发往 harness 的请求协议: 模板作 system prompt, 用例聚合文本作 user prompt 独立传输 (旧版拼成单一 prompt).

## [1.19.6] - 2026-05-23

### Changed

- **autotesting**: 移动端适配代码审计与清理: 删除未定义的 marker class 与被覆盖的 `sm:min-h-[440px]`, 行为无变化.

## [1.19.5] - 2026-05-23

### Fixed

- **autopilot**: 手机端 Safari 底部地址栏可正常上滑收缩: 移除主容器小屏 `min-h-screen` 锁高.
- **autotesting**: 手机端 Safari 底部地址栏可正常上滑收缩: 移除 html / body / MainLayout 小屏 `min-h-screen` 锁高.

## [1.19.4] - 2026-05-23

### Fixed

- 移除 `<meta theme-color>`: iOS Safari 顶部 url bar / 灵动岛区不再被强制染色.

## [1.19.3] - 2026-05-23

### Fixed

- **autopilot**: iOS 灵动岛 / 状态栏区不再显示紫色条带: viewport 改为 `viewport-fit=cover`.
- **autopilot**: 执行历史页手机不再「Card 套 Card」嵌套滚动: 内部锁高 + overflow-auto 改 ≥768px 才生效.
- **autotesting**: iOS 灵动岛区不再显示紫色条带: viewport 改为 `viewport-fit=cover`.

## [1.19.2] - 2026-05-23

### Fixed

- **autopilot**: 任务工作台 / 执行历史手机整页可原生上下滚动: 取消 100vh 锁高 + 内部独滚, 跟随 body 滚动.
- **autopilot**: 桌面端 (≥768px) sider + content 布局不受影响.
- **autotesting**: 手机整页可原生上下滚动: 取消 100vh 锁高 + 内部独滚, 改为跟随 body 滚动, 浏览器工具栏可自动收起.
- **autotesting**: Toast 位置改为统一距底 8px, 不再叠加 iOS 安全区.
- **autotesting**: 「优化结果」与「生成结果」内容区小屏设 50vh 保底高度, 避免塌成 0.
- **autotesting**: 桌面端 (≥1024px) 双栏并排布局不受影响.

## [1.19.1] - 2026-05-23

### Fixed

- **autopilot**: 任务工作台 / 执行历史在手机与窄屏不再溢出: 任务表可横滚, 顶部搜索不挤按钮, 新建任务弹窗输入折半, JSON 导入 / 集成中心 Modal 小屏自动收窄.
- **autopilot**: 已选任务抽屉宽度 `100vw` → `100%`, 避开 iOS Safari 滚动条宽度横溢出.
- **autopilot**: iOS Safari AntD 输入控件小屏统一最小字号 16px, 不触发整页放大.
- **autotesting**: 集成中心 / 模板 / 历史 / 数据联动 / 送至 Autopilot 等弹窗手机端不再超出可视区, 工具栏自动换行.
- **autotesting**: 顶部导航 5 入口在手机改为可横向滑动, 不再被挤出或盖到标题.
- **autotesting**: 集成中心顶部 tabs 可横向滑动.
- **autotesting**: 提示词类型选择器小屏自动换行.
- **autotesting**: 上下文历史抽屉小屏内容自动换行, 不再截断.
- **autotesting**: Toast 在手机改从底部弹出.
- **autotesting**: 模型 / 模板下拉菜单小屏铺到近全屏宽, 避免触发位置在右侧时被裁.
- **autotesting**: iOS Safari 输入控件最小字号统一 16px, 不触发整页放大.
- **autotesting**: 「上下文输入 / 优化结果」与「内容生成」两区小屏不再互挤, 主区改为可纵滚.

## [1.19.0] - 2026-05-22

### Added

- **autopilot**: 顶部新增「集成中心」入口, Autopilot 全部用户配置的唯一面板. 两个 tab:
  - **本地 Agent**: 配 Agent 地址 + 实时连接状态 (心跳 2s, 含运行时长 / 服务名).
  - **执行参数**: raw JSON 拆为结构化表单 (Gemini 模型 / 最大步骤 / 无头 / 视觉 / 思考 / 快速 / 超时 / 系统提示词 12 项), 改动高亮「已自定义」, 一键恢复默认; 顶部预设方案 (快速调试 / 稳健生产 / 省成本) 一键切换, 可走「高级」导入 / 导出 JSON.
- **autopilot**: 顶部连接状态徽章可点击直接打开集成中心.

### Changed

- **autopilot**: 原顶部「本地 Agent 配置」Popover 与 raw JSON 编辑器移除, 全部收敛到集成中心 Modal.

## [1.18.0] - 2026-05-21

### Changed

- **autotesting**: 「Autopilot 模板」从本地改为按账号同步云端 D1; 已有本地自定义首访云端时自动 seed.

### Removed

- **autotesting**: 默认 prompt preset 从 4 个精简到 1 个 (传话人); 自定义模板不受影响.

## [1.17.1] - 2026-05-21

### Fixed

- **autotesting**: LLM 代理 (`/stream-proxy` / `/http-proxy`) 分页 / 带 query 参数死循环: 服务端只读 `targetUrl` 丢弃 `pageToken` 等参数, 现已透传.

## [1.17.0] - 2026-05-21

### Added

- **autotesting**: LLM 模型卡片新增「复制」按钮, 一键派生新配置 (key 加 `-copy`, name 加「副本」).

## [1.16.0] - 2026-05-21

### Added

- **autotesting**: 集成中心新增「Autopilot 模板」tab: 「送至 Autopilot」4 个 prompt preset 可增删改 / 排序 / 恢复默认 (仍存浏览器本地).

## [1.15.0] - 2026-05-21

### Added

- **autotesting**: AutoTest 「送至 Autopilot」支持 prompt 模板编辑 (4 个 preset + 自由 textarea), 与 MeterSphere 共享缓存.
- **autotesting**: AutoTest 「送至 Autopilot」新增 folder_path 历史下拉 (最近 8 项), 与 MeterSphere 共享.

### Changed

- **autotesting**: 「送至 Autopilot」入口在 AutoTest 与 MeterSphere 两 tab 统一走同一弹框, 行为 / UI 完全一致.

## [1.14.0] - 2026-05-21

### Added

- **autotesting**: 顶部新增「集成中心」入口, Tab 切换管理 LLM 模型 / Figma Token / MeterSphere AK/SK.

### Changed

- **autotesting**: 顶部「模型」按钮更名「集成中心」, 移除选择器旁齿轮与下拉底部「配置模型」入口.

## [1.13.3] - 2026-05-21

### Fixed

- **autotesting**: 数据联动面板 MeterSphere 接口实际成功仍报 `code=100200`: MS v3 用 100200 表成功, 白名单加入.

## [1.13.2] - 2026-05-21

### Added

- **autopilot**: 任务工作台支持 `?folderId=<id>` deep link: 外部 ingest 后的「打开 Autopilot 工作台」链接直接锁定到刚 upsert 的 folder.
- **autopilot**: 手动切 folder 时地址栏同步更新, 可作书签 / 分享.

### Changed

- **autotesting**: 「送至 Autopilot」完成步骤的「打开工作台」链接带上 folder_id, 直接定位; task ids 列表改为可点链接, 跳到任务预览页.

## [1.13.1] - 2026-05-21

### Added

- **autotesting**: MeterSphere 送至 Autopilot 时, task 标题自动注入 `[MS #编号]` 前缀, 正文末尾追加 MS 来源引用块.
- **autotesting**: 完成步骤新增「录入对照」展开区, 列出每条 task 与对应 MS 编号.

## [1.13.0] - 2026-05-21

### Added

- **autotesting**: MeterSphere 面板新增「送至 Autopilot」入口: 勾选 → 拉详情聚合 → harness 处理 → 切片 → 一次性录入工作台. 弹框五步.
- **autotesting**: 「送至 Autopilot」prompt 模板内嵌可编辑 textarea + 4 preset, folder_path 历史本地缓存 (最近 8 项).

## [1.12.4] - 2026-05-21

### Fixed

- **autotesting**: 数据联动面板: harness 计时器与 MeterSphere 搜索 debounce timer 在面板关闭后清理, 避免无效 fetch.

## [1.12.3] - 2026-05-21

### Fixed

- **autotesting**: MeterSphere 接口 code 非 0/200 不再被识别为成功; 失败时 UI 真实展示错误而非误报「项目列表为空」.

## [1.12.2] - 2026-05-21

### Fixed

- **autopilot**: 任务工作台长任务文本不再横向溢出, 超长就地折行至 3 行 + 省略号, 完整文案在编辑弹窗或预览页查看.

## [1.12.1] - 2026-05-21

### Changed

- **autotesting**: MeterSphere VPC service 指向新服务实例, 链路对使用方无感.

### Fixed

- **autotesting**: 「送至 Autopilot」录入步骤线上触发 CF 1101 (self-subrequest cycle): 改为 service binding 直连 ele-autopilot Worker.

## [1.12.0] - 2026-05-21

### Added

- **autotesting**: AutoTest 面板新增「送至 Autopilot」入口: 勾选用例 → harness 回写 → 审阅 → 切片录入 (source=`autotesting`). 弹框四步.

## [1.11.8] - 2026-05-21

### Removed

- **autotesting**: 移除暗色主题与右上角主题切换按钮, 统一浅色; 偏好键 `app:settings:ui:theme-id` 弃用.

## [1.11.7] - 2026-05-21

### Added

- **autotesting**: MeterSphere 「项目 / 模块」也写入浏览器本地缓存, 配合 1.11.6 链路实现刷新后一路自动拉到上次模块的用例; 上游已删项目时缓存自动失效清理.

## [1.11.6] - 2026-05-21

### Added

- **autotesting**: MeterSphere 面板自动联动: 打开即拉项目 → 选项目并发拉模块 + 全部用例 → 选模块拉该模块用例. 手动按钮保留作刷新.

### Changed

- **autotesting**: 用例单页数量 20 → 100, Worker `/api/ms/cases` 默认 50 → 100 (上限 500).
- **autotesting**: 用例搜索改走上游 MS `keyword` 字段 (跨页生效), 350ms debounce.

## [1.11.5] - 2026-05-21

### Added

- **autotesting**: 数据联动面板补全三项能力:
  - **检索**: AutoTest 用例 / MS 模块 / MS 用例三处各加搜索框.
  - **多选 + 全选**: 双侧表头全选 + 行 checkbox + 选中数计数.
  - **录入 MeterSphere**: AutoTest 选中 → 选项目 → 按模块路径在 MS 逐级查找或新建 → 创建用例, 实时展示成功 / 失败 / 进度.
- **autotesting**: MeterSphere 用例行新增「详情」按钮 (前置条件 / 步骤 / 期望 / 描述 / 备注).

### Changed

- **autotesting**: Worker `/api/ms` 新增 4 路由: 单条用例详情 / 项目默认模板 / 新建模块 / 新建用例.

### Fixed

- **autotesting**: UI 包 4 处 TS 接口缺失 (`IModelManager` / `ITemplateManager` / `IHistoryManager` / `IPreferenceService` adapter), 不影响运行时但消除红线.

## [1.11.4] - 2026-05-21

### Added

- **autotesting**: MeterSphere AK/SK 加 localStorage 缓存, 刷新不必重填. 抽象 `useBrowserCache` composable 供复用.

### Fixed

- **autotesting**: MeterSphere 拉项目 TLS 握手失败 (`TLSV1_ALERT_UNRECOGNIZED_NAME`): VPC service 改为 `--ipv4 172.21.139.237` + 关闭证书校验, 跳过 DNS 直连内网 IP.

## [1.11.3] - 2026-05-21

### Fixed

- **autotesting**: MeterSphere 拉项目失败 (TLS 握手 UNRECOGNIZED_NAME): Worker 内部转发 hostname 改为真实域名.
- **autotesting**: 组织自动发现链路改用可在 AK/SK 模式工作的接口.

## [1.11.2] - 2026-05-21

### Changed

- **autotesting**: MeterSphere 面板取消「组织」输入项, AK/SK 即可列出全部可见项目 (Worker 内自动定位组织).

## [1.11.1] - 2026-05-21

### Changed

- **autotesting**: 数据联动左侧 tab「Excel 源数据」→「AutoTest 用例」.

## [1.11.0] - 2026-05-21

### Added

- **autotesting**: 顶栏新增「联动」入口, 弹出数据联动面板 (左 AutoTest 用例, 右 MeterSphere 项目 / 模块树 / 用例).

## [1.10.5] - 2026-05-20

### Changed

- **gateway**: 首页主视觉副标题改为中文「测试编排 · AI 用例生成」.
- **autopilot**: 侧栏任务 / 文件夹名改单行不换行, 长名 hover 浮出或横滚; 节点操作按钮锁定右内壁, 不被滚动截断.

### Fixed

- PWA manifest 在 CF Access 保护下不再被拦截, 收藏 / 安装入口图标与名称恢复.

## [1.10.4] - 2026-05-20

### Removed

- **gateway**: 首页顶栏移除装饰性「服务运行中」标记.
- **autopilot**: 顶栏移除装饰性「AutoPilot」环境标签, 保留真实「本地 Agent」状态徽章.
- **autotesting**: 顶栏移除装饰性的「AutoTest」环境标签与「Studio 就绪」标记.

## [1.10.2] - 2026-05-20

### Removed

- **autotesting**: 移除设备指纹工具 (`deviceId` 系列), 身份完全由 CF Access (`google:<email>`) 接管.

## [1.10.1] - 2026-05-20

### Changed

- **autotesting**: 接入 CF Google Workspace SSO: 每位员工独立 owner, 模型 / 模板 / 历史按账号隔离.
- **autotesting**: 历史 `device:shared-owner-v1` 弃用, 首次登录从空配置起步, 本地残留自动迁移到当前账号.

## [1.10.0] - 2026-05-20

- **autotesting**: AutoTest 前端鉴权改由 gateway 统一处理.

### Added

- **gateway**: 公网入口接入 Google Workspace SSO, 仅 `@elestyle.jp` 员工可访问业务页面.
- **gateway**: 顶栏显示当前登录身份, 一键登出.

### Changed

- **autopilot**: 后台访问需经 Google Workspace SSO; 本地 agent 回调与安装链路不变.

## [1.9.9] - 2026-05-20

### Fixed

- **gateway**: 单张截图损坏不再让整次任务卡在「运行中」.
- **gateway**: 本地 agent 失联或卡住时给出明确超时提示.
- **autopilot**: 单张截图损坏不再让整次任务卡死.
- **autopilot**: 本地 agent 失联时改为给出明确超时提示, 不再无限转圈.
- **autopilot**: 任务异常断连后已完成任务的最终状态不再被重发回调覆盖.
- **autopilot-local**: 回调地址尾斜杠不再触发部分网关下的双斜杠路径问题.

## [1.9.8] - 2026-05-20

- **autotesting**: 限制 markdown 解析请求体积上限.

### Fixed

- **gateway**: 任务异常重发结果时不再覆盖已完成的最终状态.

## [1.9.7] - 2026-05-20

- **autotesting**: Figma / Confluence 解析请求加超时保护.

### Fixed

- 任务耗时统计修正, 派发等待不再计入执行时长.
- **gateway**: 网关异常给出明确错误提示, 不再只显示无文案的服务端错误.
- **autopilot-local**: 回调失败自动重试 (最多 3 次, 指数退避), 网络抖动 / 网关 5xx 不再丢任务结果.

## [1.9.6] - 2026-05-20

- **autotesting**: Confluence / Figma / 图片识别 / markdown 解析接口接入身份校验.

### Fixed

- **gateway**: 任务列表表头点击排序恢复.
- **autopilot**: 任务 / 文件夹 / 执行历史列表表头点击排序恢复.

## [1.9.5] - 2026-05-20

- **autotesting**: Confluence 解析失败时仅显示简短错误, 不回显上游内部信息.

### Fixed

- 任务部分成功 + 部分未跑的中间态不再被误标「失败」.
- **autopilot**: 创建任务中途异常不再留半成品记录.

## [1.9.4] - 2026-05-20

- **autotesting**: 收紧 LLM 代理: 拦截内网探测, 屏蔽上游 cookie / 凭据回写.

### Changed

- **autopilot-local**: 上报截图解码后过大会被服务端置空, 不影响主结果.

### Fixed

- **autopilot**: 删除任务后其他任务残留引用自动清理, 不再显示幽灵 id.

### Security

- **gateway**: 收紧上游代理, 屏蔽内网探测与上游凭据回写.
- **gateway**: 限制单张截图体积上限.
- **autopilot**: 单张截图体积上限, 防止异常上传撑爆存储.

## [1.9.3] - 2026-05-20

- **autotesting**: 修复长连接断开时的资源残留.
- **autotesting**: 大附件代理改为流式转发, 避免 OOM.
- **autotesting**: Toast 与全屏弹窗视觉对齐.

### Changed

- 任务拖拽落点视觉反馈强化.

### Fixed

- **gateway**: 删除任务 / 文件夹后关联截图自动清理.
- **autopilot**: 删除任务 / 文件夹 / 执行历史时关联截图自动清理.
- **autopilot**: 误删被引用资源时给出明确冲突提示.

## [1.9.2] - 2026-05-20

- **autotesting**: 模型 / 模板 / 数据三个管理弹窗视觉统一.
- **autotesting**: 文本对比视图重写, 字体更紧凑.
- **autotesting**: 数据导入区升级为完整拖拽态机.

### Changed

- **gateway**: AutoTest 模型 / 模板 / 数据管理弹窗视觉统一.
- **autopilot**: AutoTest 工作台模型 / 模板 / 数据管理弹窗视觉统一 (本端无业务改动).

## [1.9.1] - 2026-05-20

- **autotesting**: 输出区工具栏 / 数据源标签 / 历史抽屉视觉统一.
- **autotesting**: 历史抽屉「删除」按钮改为低权重危险动作.

### Changed

- **gateway**: 任务行操作精简为派单 / 预览 / 更多三按钮, 删除走二次确认.
- **autopilot**: 任务行操作精简为派单 / 预览 / 更多三按钮.
- **autopilot**: 删除操作走二次确认.

## [1.9.0] - 2026-05-20

- **autotesting**: AutoTest 工作台 UX 整体提级, 顶栏加「Studio 就绪」徽章.
- **autotesting**: 输入 / 提示词 / 测试三块面板视觉统一, 主操作按钮带方向指示.
- **autotesting**: 顶栏 actions 重排为「历史 / 模板 / 模型 | 数据 / 主题 / 首页」两组.

### Changed

- 任务工作台整体提级: 面包屑 + 状态筛选 + KPI 概览 + 紧凑表格.
- **autopilot**: 任务详情可展开 / 收起, 长文本不撑破布局.
- **autopilot**: 批量创建语法说明从 placeholder 提到可展开帮助卡.

## [1.8.6] - 2026-05-20

### Changed

- **gateway**: 已选任务抽屉与执行历史视觉细节统一.
- **autopilot**: 已选任务抽屉与执行历史索引视觉统一.

## [1.8.5] - 2026-05-20

### Changed

- **gateway**: 首屏骨架与执行历史卡片状态视觉统一.
- **autopilot**: 首屏骨架与执行历史卡片状态色统一.

## [1.8.4] - 2026-05-20

- **autotesting**: 顶栏品牌方块 / 状态徽章 / 分隔线视觉统一, 与 AutoPilot 一致.

### Changed

- **gateway**: 执行历史顶部统计 chip 视觉对齐.
- **autopilot**: 执行历史顶部统计视觉对齐.

## [1.8.3] - 2026-05-20

- **autotesting**: 全工程动画时长 / 缓动统一.

### Changed

- 顶部状态徽章 / 分隔条 / 品牌方块视觉统一.

## [1.8.2] - 2026-05-20

- **autotesting**: 首屏改为完整布局骨架替代单 spinner.
- **autotesting**: 优化模式切换器升级为段控件 (icon + 主副标签).
- **autotesting**: 版本切换区改为 V 标签段控件.

### Changed

- **gateway**: AutoTest 工作台段控件与状态徽章升级.

## [1.8.1] - 2026-05-20

### Added

- **autopilot**: 任务列表新增跨任务 KPI 概览条 (任务数 / 成功率 / 进行中 / 失败).
- **autopilot**: 执行概要新增进度条与五项指标.
- **autopilot**: 执行历史卡片显示相对时间, 加状态色.

### Changed

- **gateway**: 任务后台新增 KPI 概览条, 执行概要带进度条, 执行历史显示相对时间.
- **autopilot**: 首屏单 spinner → 完整布局骨架.
- **autopilot**: 空状态文案与按钮规整.

## [1.8.0] - 2026-05-20

- **autotesting**: AutoTest 前端整体重塑, 设计语言 / 字体 / 主色与 AutoPilot 对齐.
- **autotesting**: 顶栏 ActionButton 从 emoji 改 SVG 图标.

### Changed

- **gateway**: AutoTest 前端整体重塑, 与 AutoPilot 视觉对齐.
- **autopilot**: AutoTest 工作台整体重塑与本端视觉对齐.

## [1.7.0] - 2026-05-20

### Changed

- **gateway**: 任务后台 UI 重塑: 顶部品牌栏 / 卡片化任务列表 / 优化的执行历史.
- **autopilot**: 任务后台 UI 重塑: 顶部品牌栏 + 卡片化任务列表 + 优化的执行历史.
- **autopilot**: 本地 Agent 配置入口从侧栏底部移到顶栏徽章.
- **autopilot**: 状态徽章统一, 弹窗与抽屉视觉精修.

## [1.6.9] - 2026-05-19

- **autotesting**: 部署链路回滚到稳定基线.

### Removed

- **gateway**: 撤销近期部署优化, 恢复稳定基线.

## [1.6.8] - 2026-05-19

### Changed

- **gateway**: 后台部署链路修复.

## [1.6.7] - 2026-05-19

### Changed

- **gateway**: 后台部署链路优化.

## [1.6.6] - 2026-05-19

### Changed

- **gateway**: 后台部署链路优化.

## [1.6.5] - 2026-05-19

- **autotesting**: 顶栏新增「返回首页」按钮.

### Added

- **autopilot**: 任务列表顶部新增「返回首页」按钮.

### Changed

- **gateway**: 友情链接入口提升为与 AutoPilot / AutoTest 并列的第三张卡片.
- **gateway**: 子工程顶栏新增「返回首页」按钮.

## [1.6.4] - 2026-05-19

### Added

- **gateway**: landing 底部新增友情链接.

## [1.6.3] - 2026-05-19

- **autotesting**: 部署链路优化.

### Changed

- **gateway**: 后台部署链路优化, 发版更快.

## [1.5.18] - 2026-05-19

### Changed

- 本地 agent 一键升级行为稳定化.

### Fixed

- **autopilot-local**: `ele-autopilot upgrade` 一键升级稳定化, 不需额外配置或环境变量.

## [1.5.17] - 2026-05-19

### Added

- **autopilot-local**: 新增 `ele-autopilot --help` / `--version` / `upgrade` (别名 `update`) 子命令, 无参默认仍直接启动服务.

### Changed

- **gateway**: 安装区块文案改为面向非开发用户, 不再暴露监听地址.

## [1.5.16] - 2026-05-19

### Fixed

- **gateway**: 安装区块在小屏的展示问题.

## [1.5.15] - 2026-05-19

### Changed

- 本地 agent 安装步骤从三步精简为两步.

## [1.5.14] - 2026-05-19

- **autotesting**: TestPanel 与 InputPanel 手机小屏展示修复.

### Fixed

- **gateway**: 任务后台多处小屏适配收尾.
- **autopilot**: 任务表 / 已选任务抽屉 / 执行步骤在小屏的展示问题.

## [1.5.13] - 2026-05-19

- **autotesting**: InputPanel 控件小屏自动换行.

### Fixed

- 多处弹窗与抽屉在小屏的展示问题.
- **autopilot**: 步骤截图窄屏不再撑破容器.

## [1.5.12] - 2026-05-19

### Fixed

- **gateway**: 任务后台小屏侧栏改为可隐藏抽屉.
- **autopilot**: 后台与执行历史页手机阅读体验; 侧栏改为可隐藏抽屉.

## [1.5.11] - 2026-05-19

### Fixed

- 浏览器收藏图标高分屏不再模糊.

## [1.5.10] - 2026-05-19

- **autotesting**: 标题改为「QA AutoPilot · AutoTest」, 接入全套品牌图标.

### Added

- **autopilot**: 接入全套浏览器与 PWA 图标.

### Changed

- **gateway**: landing 文案精简.
- **gateway**: 接入全套 PWA / 多平台图标.
- **autopilot**: 后台用户向文案清洗, 不再暴露内部技术术语.

## [1.5.9] - 2026-05-19

### Fixed

- **gateway**: 适配系统「减弱动态效果」开关.

## [1.5.8] - 2026-05-19

### Fixed

- **gateway**: 首屏安装命令不再显示占位符闪烁.
- **gateway**: `/index.html` 不再 404.

## [1.5.7] - 2026-05-19

### Changed

- **gateway**: landing 页视觉重做: 品牌区 / hero / 双卡片入口 / 安装区块产品化, 接入暗色模式与 web 字体.

## [1.5.6] - 2026-05-19

### Fixed

- **gateway**: 本地 agent 版本号显示恢复.
- **autopilot-local**: 一键安装拿不到正确版本号.

## [1.5.5] - 2026-05-19

### Added

- **gateway**: landing 内嵌「本地 agent 安装」区块: 命令清单 + 一键复制 + 版本号.

### Changed

- **autopilot-local**: 安装入口迁到 landing 内嵌区块.

### Fixed

- **autopilot**: 修正帮助页错误的启动命令与监听地址提示.

### Removed

- **autopilot**: 后台右上角「帮助」按钮与独立帮助页 (入口迁到 landing 内嵌安装区块).

## [1.5.4] - 2026-05-19

- **autotesting**: Confluence / Figma / 图片识别 / markdown 解析在公网入口下不再 404.

### Fixed

- **gateway**: AutoTest 多个解析接口在公网入口下不再 404.

## [1.5.3] - 2026-05-19

- **autotesting**: 公网入口统一经 gateway, 业务地址不再直接暴露.
- **autotesting**: 修复远端存储与 LLM 代理因路径前缀缺失的 404.

### Added

- **gateway**: 首发. 唯一公网入口, landing 双卡片 (AutoPilot / AutoTest) + 路径分发.

### Changed

- **autopilot**: 后台访问入口统一经 gateway, 本工程不单独暴露公网入口.
- **autopilot-local**: 安装入口与回调链路统一经 gateway, 用户无需关注子工程地址.

## [1.5.2] - 2026-05-19

### Changed

- 发布流程改回 lockstep.

## [1.5.0] - 2026-05-19

### Added

- **autopilot**: 本地 agent 安装入口经后台动态生成, 不再硬编码.
- **autopilot**: 新增本地 agent 安装与帮助页.

### Changed

- **autopilot**: 发布渠道从 GitHub Release 迁到 Cloudflare R2.
- **autopilot-local**: 发布渠道从 GitHub Release 迁到 Cloudflare R2, 安装命令不变.

## [0.3.2] - 2026-05-19

### Fixed

- **autopilot**: README 描述更新到最新部署形态.

## [0.3.1] - 2026-05-19

### Fixed

- **autopilot**: 文档与实际行为对齐, 移除过时承诺.

## [0.3.0] - 2026-05-18

### Changed

- **autopilot**: 平台迁移到 Cloudflare Workers + D1 + R2.

## [0.2.5] - 2026-05-18

### Changed

- **autopilot**: 截图存储优化, 后台 DB 体积显著缩小.

## [0.2.4] - 2026-05-18

### Removed

- **autopilot**: 冗余的原始历史字段.

## [0.2.3] - 2026-05-18

### Fixed

- **autopilot**: 内部配置与现状对齐.

## [0.2.2] - 2026-05-18

### Removed

- **autopilot**: 清理过时文档.

## [0.2.0] - 2026-05-18

### Changed

- **autopilot**: 服务端框架平台升级, 用户行为无影响.

## [0.1.4] - 2026-05-18

### Removed

- **autopilot-local**: 上报负载移除冗余字段.

## [0.1.3] - 2026-05-18

### Added

- **autopilot-local**: 首版 GitHub Release + `install.sh` 一键安装.

## [0.1.0] - 2026-05-18

### Added

- **autopilot**: 首发: 任务管理后台 (文件夹 + 任务列表 + 子任务链 + 批量创建).
- **autopilot**: 任务执行模型 (Job + Job Task), 支持回调上报与执行历史查看.

---

## 附录: prompt-optimizer 源仓历史

> 以下为 prompt-optimizer 合并入仓 (commit `ec396c2`) 前的 autotesting 源仓历史, 无独立版本号.

## 2025-11-10

- Confluence office API 升级.

## 2025-10-14

- Confluence 文本支持图片解析.

## 2025-10-10

- 新增「PRD 生成 (beta)」「Prompt-创世纪」「Prompt-演化纪」模板.
- 「传话机器人」提示词增强, 小模型也能更好完成任务.
- 部分文案更新.

## 2025-10-07

- 支持 Excel 导出.

## 2025-09-30

- 图片识别接口优化, 默认 Gemini 2.5-flash (支持 OpenAI / Gemini).
- 支持文件 markdown 识别 (pdf / docx / pptx / csv / doc / epub / html / htm / txt / xlsx 等).

## 2025-09-26

- 迭代优化的模板只能选高级模板, 不能选简单模板.
- 切 tab 时保留「内容生成」数据.

## 2025-09-25

- 「测试用例生成」提示词模板优化.
- 新增「鹰眼分析」提示词模板.
- 文案: 用例生成 / 测试用例生成 → 内容生成.

## 2025-09-18

- 新增 Figma 快速录入.
- 图片识别新增 Gemini 支持, 默认 Gemini 2.5-flash.
- 测试用例生成提示词优化, 覆盖更全 / 边界更细.
- 新增「传话人」提示词, 直接录入上下文不修改 raw.
- 文案: 用例验证 → 用例生成.
