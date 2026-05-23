# Changelog

写作规范见 [deploy.md §CHANGELOG 写作](../deploy.md#changelog-写作).

## [1.19.5] - 2026-05-23

### Fixed

- 手机端 Safari 底部地址栏现在可以正常上滑自动收缩: 移除 html / body / MainLayout 小屏的 `min-h-screen` 锁高, 让页面按内容自然撑开. 之前页面强制 = 视口高度, Safari 无法识别"可滚区", 地址栏永远占着可视区底部.

## [1.19.4] - 2026-05-23

### Fixed

- 移除 `<meta theme-color="#4f46e5">`: iOS Safari 浏览器顶部 url bar / 灵动岛区域不再被强制染成紫色而与浅色 header 形成断层. Safari 17+ 会自动从页面顶部采样颜色, 让浏览器 UI 与页面无缝衔接.

## [1.19.3] - 2026-05-23

### Fixed

- iOS 灵动岛 / 状态栏区域不再显示紫色条带与页面内容割裂: viewport 改为 `viewport-fit=cover`, web 内容直接铺到状态栏背后, 颜色与 header 一致.

## [1.19.2] - 2026-05-23

### Fixed

- 手机上整页可原生上下滚动看完所有内容: 不再用 100vh 锁定窗口高度并让主区域内部独立滚动. 这种"内部滚 + 外层锁高"在 iOS Safari 上会让浏览器工具栏占去视口后, 顶部 header 与底部内容被切, 看起来像顶 / 底永远空着一块"安全区域"—— 现在小屏整页跟随 body 原生滚动, 浏览器工具栏自动收起, 整屏都能用.
- Toast 提示位置不再叠加 iOS 安全区底距, 改为统一距底 8px.
- 内容生成模式下「生成结果」可看见 AI 输出, 编辑框也能正常点击输入: 给「优化结果」与「生成结果」内容区在小屏设了 50vh 保底高度, 避免 OutputDisplay 内部通过 h-full 引用父高度时塌成 0.
- 桌面端 (≥1024px) 双栏并排布局与桌面交互行为完全不受影响.

## [1.19.1] - 2026-05-23

### Fixed

- 集成中心 / 模板管理 / 历史 / 数据联动 / 送至 Autopilot 等弹窗在手机与窄屏浏览器不再超出可视区: 弹窗会贴边自适应; 内部工具栏 (搜索 + 操作按钮 + 计数) 自动换行而不是横排挤压; MeterSphere 用例表保留横向滚动避免列被压扁.
- 顶部导航 5 个入口按钮 (历史 / 模板 / 集成中心 / 数据 / 联动) 在手机不再被挤出右侧或盖到标题, 改为可横向滑动一行展示, 任何入口都能点到.
- 集成中心顶部分类 tabs 在小屏改为可横向滑动, 不再被压到看不见.
- 提示词类型选择器 (文本 / Confluence / Figma / 图片 / 本地文件) 在小屏自动换行展开, 输入框单独一行, 不再挤压变形.
- 上下文历史抽屉在小屏不再贴边占满, 单条记录内的"版本 / 模型 / 操作按钮"自动换行展示, 信息不被截断.
- 提示消息 (Toast) 在手机改为从底部弹出, 不再盖住顶部导航按钮.
- 模型 / 模板下拉菜单在小屏铺到接近全屏宽, 避免触发位置在右侧时菜单被裁出视区.
- iOS Safari 上点击输入框 / 文本域 / 下拉选择不再触发整页自动放大: 小屏统一最小字号 16px (官方推荐做法).
- 小屏下「上下文输入 / 优化结果」与「内容生成」两个区域不再互相挤压: 主区域改为可纵向滚动, 每块独立保留可用高度, 优化结果能完整展示, 生成结果可编辑区也能正常输入.

## [1.18.0] - 2026-05-21

### Changed

- 集成中心「Autopilot 模板」从仅浏览器本地改为按账号同步到云端 (D1): 同一账号在不同浏览器 / 设备打开会自动加载同一份模板, 编辑后即时回传. 已有本地自定义首次访问云端时会自动 seed 上去, 不会丢失.

### Removed

- 默认 prompt preset 从 4 个 (传话人 / 梳理 / 翻译为英文 / 补充期望) 精简到仅 1 个 (传话人); 用户已存的自定义模板不受影响, 仅影响"恢复默认"与首次未配置时的初始内容.

## [1.17.1] - 2026-05-21

### Fixed

- 修复 LLM 代理 (`/stream-proxy` / `/http-proxy`) 在分页 / 带额外 query 参数的场景下死循环: 之前服务端只读 `targetUrl`, 把 SDK 追加的 `pageToken` 等参数全部丢弃, 上游永远返回第一页. 例如 Gemini「获取模型列表」会持续打转直至超时, 现已正确透传给上游.

## [1.17.0] - 2026-05-21

### Added

- 集成中心 LLM 模型卡片新增「复制」按钮: 一键基于现有模型生成一份新配置 (key 自动加 `-copy` 后缀避免冲突, name 加「副本」后缀, baseURL / apiKey / 默认模型 / 高级参数全部沿用), 适合在同一 provider 下快速派生多套模型 / 多 key 配置.

## [1.16.0] - 2026-05-21

### Added

- 集成中心新增「Autopilot 模板」tab: 「送至 Autopilot」弹窗的 4 个 prompt preset (传话人 / 梳理 / 翻译为英文 / 补充期望结果) 现在可由用户增删改 / 排序 / 一键恢复默认, 仍仅保存在浏览器本地. 此前为硬编码不可调整.

## [1.15.0] - 2026-05-21

### Changed

- 「送至 Autopilot」入口在 AutoTest 用例与 MeterSphere 两个 tab 下统一走同一弹框组件, 行为 / UI / 状态机完全一致, 修复此前 AutoTest 入口缺少 prompt 编辑能力的退化.

### Added

- AutoTest 用例的「送至 Autopilot」现支持 prompt 模板编辑 (传话人 / 梳理合并 / 翻译英文 / 补充期望 4 个 preset + 自由 textarea), 与 MeterSphere 一致并共享浏览器本地缓存, 一处编辑两处生效.
- AutoTest 用例的「送至 Autopilot」新增目标 folder_path 历史下拉 (最近 8 项), 与 MeterSphere 共享, 重开面板自动恢复.

## [1.14.0] - 2026-05-21

### Added

- 顶部新增「集成中心」入口, 在同一弹窗下用 Tab 切换管理 LLM 模型、Figma Token 与 MeterSphere AK/SK, 凭证统一入口可一次配齐, 不必再在多个面板里反复填写.

### Changed

- 原顶部「模型」按钮更名为「集成中心」, 单一入口统一打开. 优化模型 / 测试模型选择器旁的齿轮按钮以及模型下拉菜单底部的「配置模型」入口已移除, 全部收敛到 Header.

## [1.13.3] - 2026-05-21

### Fixed

- 数据联动面板拉项目 / 模块 / 用例等 MeterSphere 接口实际成功仍报 `business code 100200 (code=100200)`: MS v3 统一返回 `code=100200` 表示成功 (`MsHttpResultCode.SUCCESS`), 之前的业务码白名单只覆盖 `0/200` 误判为失败. 现已加入 100200, MS v3 / v2 (`0`) 与自家 ingest 响应均能正确识别.

## [1.13.2] - 2026-05-21

### Changed

- 「送至 Autopilot」录入完成步骤的"打开 Autopilot 工作台"链接现在带上刚 upsert 的 folder_id, 点击后 Autopilot 工作台直接锁定到该 folder, 不必再回根目录手动找路径. MeterSphere 与 AutoTest 两个面板同步生效.
- 录入对照 / task ids 列表中的 task id 改为可点击链接, 点开直接跳到 Autopilot 任务预览页 (job 历史 / 执行截图), 录入闭环可以在两步内完成核对.

## [1.13.1] - 2026-05-21

### Added

- 从 MeterSphere 用例送至 Autopilot 时, 自动在 task 标题前注入 `[MS #编号]` 前缀, 并在任务正文末尾追加 MS 来源引用块 (项目 / 模块 / 编号 / ID / 标签). Autopilot 工作台一眼即可识别任务来自哪条 MS 用例, 排查与回查不再需要肉眼对照.
- 录入完成步骤新增「录入对照」展开区, 按行列出每条 Autopilot task 与其对应的 MS 用例编号, 便于核对落地结果.

## [1.13.0] - 2026-05-21

### Added

- MeterSphere 用例面板新增「送至 Autopilot」入口: 勾选 MS 用例后, 并发拉详情聚合 -> 经 harness 处理 -> 按 "=== CASE N: " 切片, 一次性录入 Autopilot 工作台. 弹框分 "拉详情 / 预览 / harness 处理 / 审阅录入 / 完成" 五步, 真正打通 "MS 已有用例 → Autopilot 自动执行" 的反向链路.
- 「送至 Autopilot」prompt 模板内嵌可编辑 textarea + 4 个 preset (传话人 / 梳理合并 / 翻译英文 / 补充期望), 用户可即时改写 harness 行为; 编辑值与 folder_path / folder 历史 (最近 8 项) 走浏览器本地缓存, 重开面板自动恢复, 输入框聚焦下拉选择历史路径.

## [1.12.4] - 2026-05-21

### Fixed

- 数据联动面板: harness 进度计时器与 MeterSphere 关键词搜索 debounce timer 在面板关闭后兜底清理, 避免无效 fetch 与潜在的未处理 Promise 异常.

## [1.12.3] - 2026-05-21

### Fixed

- 数据联动面板调用 MeterSphere 接口时, 上游业务 code 非 0/200 不再被识别为成功; 录入 MS / 拉项目 / 拉模块等失败时 UI 真实展示错误而非静默吞错或误报 "项目列表为空".

## [1.12.1] - 2026-05-21

### Changed

- MeterSphere VPC service 绑定指向新的服务实例, 后端继续经 gateway → autotesting Worker 的链路访问 MS, 用户层无感知.

### Fixed

- 「送至 Autopilot」录入步骤在线上触发 Cloudflare 1101 (Worker threw exception): autotesting Worker 走公网 fetch 同域 gateway 形成 self-subrequest cycle. 改为 service binding 直连 ele-autopilot Worker, 不再经公网 hop.

## [1.12.0] - 2026-05-21

### Added

- AutoTest 用例面板新增「送至 Autopilot」入口: 勾选多条用例后, 走 harness 做一次原文回写, 审阅 / 编辑后按 "=== CASE N: <title> ===" 切片, 一次性把 n 条用例录入到 Autopilot 工作台 (source=`autotesting`). 弹框分 "聚合预览 → harness 处理中 → 审阅录入 → 完成" 四步, 录入成功展示 folder_id 与 task ids.

## [1.11.8] - 2026-05-21

### Removed

- 移除暗色主题与右上角主题切换按钮, 工作台统一为浅色样式; 偏好键 `app:settings:ui:theme-id` 不再使用, 旧导出的备份文件中该键会在导入时被跳过.

## [1.11.7] - 2026-05-21

### Added

- MeterSphere 面板已选的「项目 / 模块」也写入浏览器本地缓存. 配合 1.11.6 的"AK/SK 已缓存 → 自动拉项目 → 选项目自动拉模块 / 用例 → 选模块自动拉对应模块用例"链路, 现在刷新或重新打开面板, 如果上次选过的项目 / 模块在上游仍存在, 会一路自动拉到该模块的用例, 无需任何点击. 上游已删 / 切换 AK 组织后, 缓存项失效时自动清掉, 不会卡在错误状态.

## [1.11.6] - 2026-05-21

### Added

- MeterSphere 面板自动联动, 减少手动按钮操作: 打开面板若浏览器已缓存 AK/SK 立即拉项目; 选项目后并发拉模块 + 当前项目全部用例; 用户选模块后立即拉该模块用例. 原 "拉项目 / 拉模块 / 拉用例" 按钮保留作为手动刷新入口.

### Changed

- MeterSphere 用例单页数量 20 → 100, 同时 Worker `/api/ms/cases` 默认 pageSize 50 → 100 (上限提到 500), 一次能看到更多用例, 减少翻页.
- 用例搜索框改走上游 MS `/functional/case/page` 的 `keyword` 字段 (按名称 / num / id / tag 模糊匹配, 跨页生效), 替代原本仅过滤当前页的客户端 filter. 输入 350ms debounce 后自动重拉.

## [1.11.5] - 2026-05-21

### Added

- 数据联动面板补全 3 项能力, 为后续多系统执行联动打底:
  - **检索**: AutoTest 用例列表 / MeterSphere 模块下拉 / MeterSphere 用例列表 各自加搜索框, 本地过滤名称 / 模块 / 标签 / 步骤 / 期望等字段.
  - **多选 + 全选**: AutoTest 用例与 MeterSphere 用例双侧均支持表头全选 + 行 checkbox; 选中数实时计数.
  - **录入 MeterSphere**: AutoTest 用例选中后点 "录入 MeterSphere" -> 选目标项目 -> 按用例自带 module 路径在 MS 中逐级查找或新建模块 (复用已有, 缺失则建), 再 POST 创建用例; 实时展示成功 / 失败 / 当前项进度及详细日志.
- MeterSphere 用例行新增 "详情" 按钮, 展开显示前置条件 / 步骤 (含期望) / 描述 / 备注 — 之前列表仅能看到名称等元数据, 后续做执行任务需要完整字段.

### Changed

- Worker `/api/ms` 新增 4 路由: 单条用例详情 (`GET /case/:id`), 项目默认模板 (`GET /default-template/:projectId`), 新建模块 (`POST /module/add`), 新建用例 (`POST /case/add`, worker 内封装 `multipart/form-data` 转发上游).

### Fixed

- 修复 UI 包预存的 4 处 TS 接口缺失错误 (`IModelManager` / `ITemplateManager` / `IHistoryManager` adapter 未实现 core 升级后新加的 `exportData` / `importData` / `getDataType` / `validateData`; `IPreferenceService` ui 端临时类型与 core 不兼容). 不影响运行时, 但本地 typecheck 与 IDE 红线消除.

## [1.11.4] - 2026-05-21

### Fixed

- MeterSphere 面板拉项目仍报 `TLS handshake failed [TLSV1_ALERT_UNRECOGNIZED_NAME]`: root cause 不在 Worker 代码, 而在 VPC service 上游目标配置 — 原本 `--hostname qa.elepay.link`, Cloudflare 边缘自身做 DNS 解析时走公网 (公网 `qa.elepay.link` CNAME 到 AWS sandbox IP), 边缘把流量发到那台 AWS 机器, 它的 nginx server_name 不含 `qa.elepay.link` 抛 TLS UNRECOGNIZED. 改为 `--ipv4 172.21.139.237` (Tailscale subnet route 上的 MeterSphere 内网 IP) + `--cert-verification-mode disabled`, Cloudflare 边缘跳过 DNS 直 dial IP, 经 tunnel 到达内网 nginx, SNI 由 Worker fetch URL hostname 决定, 匹配 server_name 成功.

### Added

- MeterSphere AK / SK 在浏览器本地缓存 (localStorage), 刷新 / 重新打开面板不必重复输入. 通用 composable `useBrowserCache` (`packages/ui/src/composables/useBrowserCache.ts`) 可被后续其他需要本地持久化的字段复用.

## [1.11.3] - 2026-05-21

### Fixed

- MeterSphere 面板拉项目失败 (上游返回 `TLS handshake failed [TLSV1_ALERT_UNRECOGNIZED_NAME]`): 修正 Worker 内部转发的目标 URL hostname, 改用真实 MeterSphere 域名而非占位主机名, TLS 握手 / Host 头与上游一致.
- 组织自动发现链路替换为可在 AK/SK 模式下工作的接口, 修复发现失败导致项目列表整体不可用的问题.

## [1.11.2] - 2026-05-21

### Changed

- MeterSphere 面板取消「组织」输入项: 私有部署 + 单组织场景下, 仅需 Access Key / Secret Key 即可一键列出全部可见项目 (Worker 内部通过 MS 登录态接口自动定位用户组织, 链路对使用方透明).

## [1.11.1] - 2026-05-21

### Changed

- 数据联动面板左侧 tab 文案从「Excel 源数据」改为「AutoTest 用例」, 更准确表达 autotesting 自有用例数据 (Excel 仅为导出格式之一, 非内容定位).

## [1.11.0] - 2026-05-21

### Added

- 顶栏新增「联动」入口, 弹出数据联动面板 (左侧 Excel 源数据演示用例, 右侧通过 MeterSphere Access Key / Secret Key 直接拉取并浏览组织内的项目 / 模块树 / 功能用例).

## [1.10.5] - 2026-05-20

### Fixed

- PWA manifest 在 Cloudflare Access 保护下加载不再被拦截, 浏览器收藏 / 安装入口的图标与名称恢复正常.

## [1.10.4] - 2026-05-20

### Removed

- 顶栏移除装饰性的「AutoTest」环境标签与「Studio 就绪」标记 (无实际就绪检测, 仅误导).

## [1.10.2] - 2026-05-20

### Removed

- 公开包导出的设备指纹工具 (`deviceId` 系列函数) 完整移除: SSO 接入后已无消费方, 身份完全由 Cloudflare Access (`google:<email>`) 接管.

## [1.10.1] - 2026-05-20

### Changed

- 接入 Cloudflare Google Workspace SSO 身份: 每位登录员工独立 owner, 模型 / 模板 / 历史等配置按账号隔离, 不再全用户共享.
- 历史端到端验证数据 (`device:shared-owner-v1`) 弃用; 首次登录后从空配置起步, 本地浏览器残留数据会自动迁移到当前账号.

## [1.10.0] - 2026-05-20

- AutoTest 前端访问鉴权改由 gateway 统一处理.

## [1.9.8] - 2026-05-20

- 限制 markdown 解析请求体积上限, 防止异常上传影响服务稳定性.

## [1.9.7] - 2026-05-20

- Figma / Confluence 解析请求加超时保护, 避免上游卡死拖垮整体响应.

## [1.9.6] - 2026-05-20

- Confluence / Figma / 图片识别 / markdown 解析等接口接入身份校验, 不再公开调用.

## [1.9.5] - 2026-05-20

- Confluence 解析失败时, 浏览器只显示简短错误, 不再回显上游内部信息.

## [1.9.4] - 2026-05-20

- 收紧 LLM 代理: 拦截内网探测, 屏蔽上游 cookie / 凭据回写.

## [1.9.3] - 2026-05-20

- 修复长连接断开时的资源残留, 长时间使用更稳定.
- 大附件代理改为流式转发, 不再因为单次请求过大触发服务端 OOM.
- Toast 提示与全屏弹窗视觉对齐.

## [1.9.2] - 2026-05-20

- 模型 / 模板 / 数据三个管理弹窗视觉统一.
- 文本对比视图重写, 字体更紧凑, 增删标记更清晰.
- 数据导入区从虚线框升级为完整拖拽态机.

## [1.9.1] - 2026-05-20

- 输出区工具栏 / 数据源标签 / 历史抽屉视觉统一, 不再使用硬编码颜色.
- 历史抽屉的"删除"按钮改为低权重危险动作, 减少误触.

## [1.9.0] - 2026-05-20

- AutoTest 工作台 UX 整体提级, 顶栏增加 "Studio 就绪" 状态徽章.
- 输入 / 提示词 / 测试三块面板视觉统一, 主操作按钮带方向指示.
- 顶栏 actions 重排为"历史 / 模板 / 模型 | 数据 / 主题 / 首页"两组.

## [1.8.4] - 2026-05-20

- 顶栏品牌方块、状态徽章、分隔线视觉统一, 与 AutoPilot 一致.

## [1.8.3] - 2026-05-20

- 全工程动画时长 / 缓动统一.

## [1.8.2] - 2026-05-20

- 首屏改为完整布局骨架, 替代单 spinner.
- 优化模式切换器升级为段控件, 含 icon + 主副标签.
- 版本切换区改为 V 标签段控件, 替代裸文字 button.

## [1.8.0] - 2026-05-20

- AutoTest 前端整体重塑: 设计语言、字体、主色全部与 AutoPilot 对齐.
- 顶栏 ActionButton 全部从 emoji 改 SVG 图标.

## [1.6.9] - 2026-05-19

- 部署链路回滚到稳定基线.

## [1.6.5] - 2026-05-19

- 顶栏新增"返回首页"按钮.

## [1.6.3] - 2026-05-19

- 部署链路优化, 不影响使用.

## [1.5.14] - 2026-05-19

- TestPanel 与 InputPanel 在手机小屏下的展示问题.

## [1.5.13] - 2026-05-19

- InputPanel 控件在小屏下自动换行, 不再挤压.

## [1.5.11] - 2026-05-19

- 浏览器收藏图标在高分屏不再模糊.

## [1.5.10] - 2026-05-19

- 标题改为 "QA AutoPilot · AutoTest", 接入全套品牌图标.

## [1.5.4] - 2026-05-19

- Confluence / Figma / 图片识别 / markdown 解析在公网入口下不再 404.

## [1.5.3] - 2026-05-19

- 公网入口统一改经 gateway, 业务地址不再直接对外暴露.
- 修复远端存储与 LLM 代理接口因路径前缀缺失导致的 404.

## [1.5.2] - 2026-05-19

- 发布流程改回 lockstep.

---

> 以下为 prompt-optimizer 合并入仓 (commit `ec396c2`) 前的源仓历史, 无独立版本号.

## 2025-11-10

- Confluence office API 升级.

## 2025-10-14

- Confluence 文本支持图片解析.

## 2025-10-10

- 新增 "PRD 生成 (beta)" 模板.
- 新增 "Prompt-创世纪" 模板.
- 新增 "Prompt-演化纪" 模板.
- "传话机器人" 提示词增强, 小模型也能更好地完成任务.
- 部分文案更新.

## 2025-10-07

- 支持 Excel 导出.

## 2025-09-30

- 图片识别接口优化, 默认使用 Gemini 2.5-flash (支持 OpenAI 与 Gemini 两种模型).
- 支持文件 markdown 识别 (pdf / docx / pptx / csv / doc / epub / html / htm / txt / text / plaintext / xlsx 等).

## 2025-09-26

- 迭代优化的模板只能选高级模板, 不能选简单模板.
- 切 tab 时保留"内容生成"中的数据, 不再清空.

## 2025-09-25

- "测试用例生成"提示词模板优化.
- 新增"鹰眼分析"提示词模板.
- 文案修改: 用例生成 / 测试用例生成 → 内容生成.

## 2025-09-18

- 新增 Figma 快速录入, 解决图片录入操作繁琐.
- 图片识别新增 Gemini 支持, 默认 Gemini 2.5-flash, 识别更准更快.
- 测试用例生成提示词优化, 覆盖更全面 / 边界条件更细致, 用例更清晰有序.
- 新增"传话人"提示词, 用于不修改 raw 内容直接录入上下文.
- 文案修改: 用例验证 → 用例生成.
