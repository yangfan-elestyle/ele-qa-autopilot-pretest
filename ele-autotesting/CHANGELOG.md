# Changelog

写作规范见 [deploy.md §CHANGELOG 写作](../deploy.md#changelog-写作).

## [1.28.4] - 2026-05-29

### Fixed

- 「送至 AutoPilot」弹窗的 prompt preset 切换按钮现在高亮当前生效项, 不再两个都白底、看不出当前用的是哪个模板。

## [1.28.3] - 2026-05-29

### Changed

- 「编排」MeterSphere 模块下拉改用图标分层 (📁 含子模块的分组 / 📄 末级模块) 并按层缩进, 取代原先难辨归属的破折号前缀.
- 「编排」「送至 AutoPilot」按钮改浅品牌底样式, 文案统一为 AutoPilot.

## [1.28.2] - 2026-05-29

### Changed

- 「测试编排」MeterSphere tab 打开即全自动级联拉项目 / 模块 / 用例, 移除三个手动按钮; 项目必选默认第一个, 空表态文案分五档.
- 「测试编排」MeterSphere 控件区改紧凑横排 (label 与控件 inline), select 收窄至 200–280px, 凭证 chip 移到行尾, 删除冗余文字.
- 「内容生成」面板顶部新增「来源指示条」: 标明本次基于左侧哪一栏 (优化结果 / 输入原文); 优化结果为空时橙色提醒.
- 「集成中心」四个 tab 简介文案精简, 不再重复云端存储与「留空保留原值」说明.

## [1.28.1] - 2026-05-28

### Changed

- FCB-CASE 开 fence 加入 `id=N` 序号 (` ```case id=1 `), 一眼可见用例总数与当前序号; parser 兼容无 id 历史 fence. 模板版本 → 1.4.1.

## [1.28.0] - 2026-05-28

### Changed

- 多用例「聚合 / 切片」统一升级为 **FCB-CASE 协议**: 每条用例独立 ` ```case ... ``` ` block, 聚合产物携带 `id` / `title` 元数据, 取代旧 `---` 与 `=== CASE N: ===` 分隔.
- 提示词与 parser 同步切换, 取消整体外包 ` ```text ` 的旧约定. 模板版本 → 1.4.0.

## [1.27.3] - 2026-05-28

### Changed

- 「联动」入口与文案统一改名「编排」(顶部按钮 / 弹层标题 / 「送入编排」图标).

## [1.27.2] - 2026-05-28

### Fixed

- 「编排」面板 AutoTest 用例表模块路径长串溢出列宽: 模块列加宽, cell 内长串自动换行, hover 看全文.

## [1.27.1] - 2026-05-28

### Added

- 「内容生成」结果工具栏新增「同步到云」与「发送到联动」两个图标按钮.
- 「历史」抽屉拆分「上下文历史」与「AutoTest 用例历史」子 tab, 后者支持「使用」一键还原.
- OutputDisplay 新增 `extra-actions` 插槽供父组件注入自定义按钮.

### Changed

- 「同步到云」一并保存生成时的完整上下文 (原始提示词 / 优化结果 / 模板与上下文 / 选中模块 / 模型 / 优化模式), 「使用」时一次性还原.
- 云端用例快照标题改用「用户原始提示词」前 80 字, 更易识别.

## [1.26.6] - 2026-05-28

### Changed

- 「编排」表格列宽重分配, 长文本三列 (前置条件 / 步骤 / 期望) 加宽, 短列收窄.

## [1.26.5] - 2026-05-28

### Changed

- 「编排」AutoTest 用例改读「内容生成」最近一次结果, 不再是写死示例.
- 表格新增「前置条件」列, 录入 MeterSphere 时 `prerequisite` 同步使用.

## [1.26.4] - 2026-05-28

### Changed

- 「开始生成」时选中模块说明改为拼接到 user prompt 末尾 (此前在 system prompt), 更贴近用户追加诉求场景.

## [1.26.3] - 2026-05-28

### Fixed

- 「开始生成」入口「模块」多选下拉重写: 白底卡片 + 复选框列表, 顶部刷新图标按钮, Teleport 到 body 避免被遮挡.

## [1.26.2] - 2026-05-28

### Changed

- 「添加数据源」选择弹窗支持按 Enter 确认选中.

## [1.26.1] - 2026-05-28

### Changed

- MeterSphere 用例详情「模块」由末级名改为完整路径 (如 `Dashboard / 端末设置`), 聚合给 Autopilot 的文本同步.

## [1.26.0] - 2026-05-28

### Added

- 集成中心新增「模块」Tab: 维护业务模块路径列表, 按账号存 D1 跨设备一致.
- 「开始生成」入口新增「模块」多选下拉: 选中路径追加到提示词末尾并写入「所属模块」字段.

## [1.25.3] - 2026-05-28

### Changed

- Toast 由右上角改为右下角, 避免遮挡顶部工具栏; 多条堆叠从底向上推.

## [1.25.2] - 2026-05-28

### Changed

- 「需求场景」placeholder 精简为「需求场景（必填，便于复用）」.
- 强化「场景」在历史抽屉与「选择上下文」列表中的视觉权重 (首行品牌色标签 + 大字号).

## [1.25.1] - 2026-05-28

### Fixed

- Confluence 链接解析报「markdown 转换服务异常」: 前端调 markitdown MCP 漏带 `/autotest` 前缀导致路由错误.

## [1.25.0] - 2026-05-28

### Changed

- 「Confluence 链接」/「Figma 链接」入口改为弹窗输入, 回车触发解析, 提供「更改」按钮.
- 移除 Figma Token 托管说明小字.

## [1.24.3] - 2026-05-28

### Changed

- 别名输入框文案改「需求场景（必填，便于后续查找复用）」, 列表展示标签由「别名」统一为「场景」.

## [1.24.2] - 2026-05-28

### Changed

- 头部按钮顺序调整为「联动 / 模板 / 历史 / 集成中心 / 数据」.

## [1.24.1] - 2026-05-26

### Removed

- 集成中心 Figma / MeterSphere 不再自动把 localStorage 旧凭证同步到云端, 升级用户需手动重填一次.

## [1.24.0] - 2026-05-26

### Changed

- Figma Token 与 MeterSphere AK/SK 迁到云端 D1 (按账号), 跨设备一致; 首次打开自动迁移本地旧凭证.
- 集成中心顶部加云端存储说明; ele-harness Tab → ELE-Harness.
- Prompt 输入区 Figma 行不再单独要 Token, 统一由集成中心提供.

## [1.23.0] - 2026-05-26

### Added

- 集成中心新增 ele-harness Tab: 自填 LLM provider / model / API Key / Base URL / Max Tokens / Temperature, 按账号存云端.
- Base URL 按 provider 给默认值, 自托管 runner 用户自填.

### Changed

- 触发 harness 测试前校验凭证, 未配置直接引导去集成中心填.

## [1.22.1] - 2026-05-26

### Security

- CF Access JWT 校验缺 header 时回退读 `CF_Authorization` cookie, 与 ele-autopilot 对齐 (纵深防御).

## [1.20.0] - 2026-05-25

### Added

- 新增「QA Orchestrator」模板预设 (推荐位): 把 MeterSphere 用例编排成 browser-use 可执行任务序列, 配合 ele-harness qa-orchestrator plugin.

### Changed

- 发往 harness 的请求协议: 模板作 system prompt, 用例聚合文本作 user prompt 独立传输 (旧版拼成单一 prompt).

## [1.19.6] - 2026-05-23

### Changed

- 移动端适配代码审计与清理: 删除未定义的 marker class 与被覆盖的 `sm:min-h-[440px]`, 行为无变化.

## [1.19.5] - 2026-05-23

### Fixed

- 手机端 Safari 底部地址栏可正常上滑收缩: 移除 html / body / MainLayout 小屏 `min-h-screen` 锁高.

## [1.19.4] - 2026-05-23

### Fixed

- 移除 `<meta theme-color>`: iOS Safari 顶部 url bar / 灵动岛区不再被强制染色.

## [1.19.3] - 2026-05-23

### Fixed

- iOS 灵动岛区不再显示紫色条带: viewport 改为 `viewport-fit=cover`.

## [1.19.2] - 2026-05-23

### Fixed

- 手机整页可原生上下滚动: 取消 100vh 锁高 + 内部独滚, 改为跟随 body 滚动, 浏览器工具栏可自动收起.
- Toast 位置改为统一距底 8px, 不再叠加 iOS 安全区.
- 「优化结果」与「生成结果」内容区小屏设 50vh 保底高度, 避免塌成 0.
- 桌面端 (≥1024px) 双栏并排布局不受影响.

## [1.19.1] - 2026-05-23

### Fixed

- 集成中心 / 模板 / 历史 / 数据联动 / 送至 Autopilot 等弹窗手机端不再超出可视区, 工具栏自动换行.
- 顶部导航 5 入口在手机改为可横向滑动, 不再被挤出或盖到标题.
- 集成中心顶部 tabs 可横向滑动.
- 提示词类型选择器小屏自动换行.
- 上下文历史抽屉小屏内容自动换行, 不再截断.
- Toast 在手机改从底部弹出.
- 模型 / 模板下拉菜单小屏铺到近全屏宽, 避免触发位置在右侧时被裁.
- iOS Safari 输入控件最小字号统一 16px, 不触发整页放大.
- 「上下文输入 / 优化结果」与「内容生成」两区小屏不再互挤, 主区改为可纵滚.

## [1.18.0] - 2026-05-21

### Changed

- 「Autopilot 模板」从本地改为按账号同步云端 D1; 已有本地自定义首访云端时自动 seed.

### Removed

- 默认 prompt preset 从 4 个精简到 1 个 (传话人); 自定义模板不受影响.

## [1.17.1] - 2026-05-21

### Fixed

- LLM 代理 (`/stream-proxy` / `/http-proxy`) 分页 / 带 query 参数死循环: 服务端只读 `targetUrl` 丢弃 `pageToken` 等参数, 现已透传.

## [1.17.0] - 2026-05-21

### Added

- LLM 模型卡片新增「复制」按钮, 一键派生新配置 (key 加 `-copy`, name 加「副本」).

## [1.16.0] - 2026-05-21

### Added

- 集成中心新增「Autopilot 模板」tab: 「送至 Autopilot」4 个 prompt preset 可增删改 / 排序 / 恢复默认 (仍存浏览器本地).

## [1.15.0] - 2026-05-21

### Changed

- 「送至 Autopilot」入口在 AutoTest 与 MeterSphere 两 tab 统一走同一弹框, 行为 / UI 完全一致.

### Added

- AutoTest 「送至 Autopilot」支持 prompt 模板编辑 (4 个 preset + 自由 textarea), 与 MeterSphere 共享缓存.
- AutoTest 「送至 Autopilot」新增 folder_path 历史下拉 (最近 8 项), 与 MeterSphere 共享.

## [1.14.0] - 2026-05-21

### Added

- 顶部新增「集成中心」入口, Tab 切换管理 LLM 模型 / Figma Token / MeterSphere AK/SK.

### Changed

- 顶部「模型」按钮更名「集成中心」, 移除选择器旁齿轮与下拉底部「配置模型」入口.

## [1.13.3] - 2026-05-21

### Fixed

- 数据联动面板 MeterSphere 接口实际成功仍报 `code=100200`: MS v3 用 100200 表成功, 白名单加入.

## [1.13.2] - 2026-05-21

### Changed

- 「送至 Autopilot」完成步骤的「打开工作台」链接带上 folder_id, 直接定位; task ids 列表改为可点链接, 跳到任务预览页.

## [1.13.1] - 2026-05-21

### Added

- MeterSphere 送至 Autopilot 时, task 标题自动注入 `[MS #编号]` 前缀, 正文末尾追加 MS 来源引用块.
- 完成步骤新增「录入对照」展开区, 列出每条 task 与对应 MS 编号.

## [1.13.0] - 2026-05-21

### Added

- MeterSphere 面板新增「送至 Autopilot」入口: 勾选 → 拉详情聚合 → harness 处理 → 切片 → 一次性录入工作台. 弹框五步.
- 「送至 Autopilot」prompt 模板内嵌可编辑 textarea + 4 preset, folder_path 历史本地缓存 (最近 8 项).

## [1.12.4] - 2026-05-21

### Fixed

- 数据联动面板: harness 计时器与 MeterSphere 搜索 debounce timer 在面板关闭后清理, 避免无效 fetch.

## [1.12.3] - 2026-05-21

### Fixed

- MeterSphere 接口 code 非 0/200 不再被识别为成功; 失败时 UI 真实展示错误而非误报「项目列表为空」.

## [1.12.1] - 2026-05-21

### Changed

- MeterSphere VPC service 指向新服务实例, 链路对使用方无感.

### Fixed

- 「送至 Autopilot」录入步骤线上触发 CF 1101 (self-subrequest cycle): 改为 service binding 直连 ele-autopilot Worker.

## [1.12.0] - 2026-05-21

### Added

- AutoTest 面板新增「送至 Autopilot」入口: 勾选用例 → harness 回写 → 审阅 → 切片录入 (source=`autotesting`). 弹框四步.

## [1.11.8] - 2026-05-21

### Removed

- 移除暗色主题与右上角主题切换按钮, 统一浅色; 偏好键 `app:settings:ui:theme-id` 弃用.

## [1.11.7] - 2026-05-21

### Added

- MeterSphere 「项目 / 模块」也写入浏览器本地缓存, 配合 1.11.6 链路实现刷新后一路自动拉到上次模块的用例; 上游已删项目时缓存自动失效清理.

## [1.11.6] - 2026-05-21

### Added

- MeterSphere 面板自动联动: 打开即拉项目 → 选项目并发拉模块 + 全部用例 → 选模块拉该模块用例. 手动按钮保留作刷新.

### Changed

- 用例单页数量 20 → 100, Worker `/api/ms/cases` 默认 50 → 100 (上限 500).
- 用例搜索改走上游 MS `keyword` 字段 (跨页生效), 350ms debounce.

## [1.11.5] - 2026-05-21

### Added

- 数据联动面板补全三项能力:
  - **检索**: AutoTest 用例 / MS 模块 / MS 用例三处各加搜索框.
  - **多选 + 全选**: 双侧表头全选 + 行 checkbox + 选中数计数.
  - **录入 MeterSphere**: AutoTest 选中 → 选项目 → 按模块路径在 MS 逐级查找或新建 → 创建用例, 实时展示成功 / 失败 / 进度.
- MeterSphere 用例行新增「详情」按钮 (前置条件 / 步骤 / 期望 / 描述 / 备注).

### Changed

- Worker `/api/ms` 新增 4 路由: 单条用例详情 / 项目默认模板 / 新建模块 / 新建用例.

### Fixed

- UI 包 4 处 TS 接口缺失 (`IModelManager` / `ITemplateManager` / `IHistoryManager` / `IPreferenceService` adapter), 不影响运行时但消除红线.

## [1.11.4] - 2026-05-21

### Fixed

- MeterSphere 拉项目 TLS 握手失败 (`TLSV1_ALERT_UNRECOGNIZED_NAME`): VPC service 改为 `--ipv4 172.21.139.237` + 关闭证书校验, 跳过 DNS 直连内网 IP.

### Added

- MeterSphere AK/SK 加 localStorage 缓存, 刷新不必重填. 抽象 `useBrowserCache` composable 供复用.

## [1.11.3] - 2026-05-21

### Fixed

- MeterSphere 拉项目失败 (TLS 握手 UNRECOGNIZED_NAME): Worker 内部转发 hostname 改为真实域名.
- 组织自动发现链路改用可在 AK/SK 模式工作的接口.

## [1.11.2] - 2026-05-21

### Changed

- MeterSphere 面板取消「组织」输入项, AK/SK 即可列出全部可见项目 (Worker 内自动定位组织).

## [1.11.1] - 2026-05-21

### Changed

- 数据联动左侧 tab「Excel 源数据」→「AutoTest 用例」.

## [1.11.0] - 2026-05-21

### Added

- 顶栏新增「联动」入口, 弹出数据联动面板 (左 AutoTest 用例, 右 MeterSphere 项目 / 模块树 / 用例).

## [1.10.5] - 2026-05-20

### Fixed

- PWA manifest 在 CF Access 保护下不再被拦截, 收藏 / 安装入口图标与名称恢复.

## [1.10.4] - 2026-05-20

### Removed

- 顶栏移除装饰性的「AutoTest」环境标签与「Studio 就绪」标记.

## [1.10.2] - 2026-05-20

### Removed

- 移除设备指纹工具 (`deviceId` 系列), 身份完全由 CF Access (`google:<email>`) 接管.

## [1.10.1] - 2026-05-20

### Changed

- 接入 CF Google Workspace SSO: 每位员工独立 owner, 模型 / 模板 / 历史按账号隔离.
- 历史 `device:shared-owner-v1` 弃用, 首次登录从空配置起步, 本地残留自动迁移到当前账号.

## [1.10.0] - 2026-05-20

- AutoTest 前端鉴权改由 gateway 统一处理.

## [1.9.8] - 2026-05-20

- 限制 markdown 解析请求体积上限.

## [1.9.7] - 2026-05-20

- Figma / Confluence 解析请求加超时保护.

## [1.9.6] - 2026-05-20

- Confluence / Figma / 图片识别 / markdown 解析接口接入身份校验.

## [1.9.5] - 2026-05-20

- Confluence 解析失败时仅显示简短错误, 不回显上游内部信息.

## [1.9.4] - 2026-05-20

- 收紧 LLM 代理: 拦截内网探测, 屏蔽上游 cookie / 凭据回写.

## [1.9.3] - 2026-05-20

- 修复长连接断开时的资源残留.
- 大附件代理改为流式转发, 避免 OOM.
- Toast 与全屏弹窗视觉对齐.

## [1.9.2] - 2026-05-20

- 模型 / 模板 / 数据三个管理弹窗视觉统一.
- 文本对比视图重写, 字体更紧凑.
- 数据导入区升级为完整拖拽态机.

## [1.9.1] - 2026-05-20

- 输出区工具栏 / 数据源标签 / 历史抽屉视觉统一.
- 历史抽屉「删除」按钮改为低权重危险动作.

## [1.9.0] - 2026-05-20

- AutoTest 工作台 UX 整体提级, 顶栏加「Studio 就绪」徽章.
- 输入 / 提示词 / 测试三块面板视觉统一, 主操作按钮带方向指示.
- 顶栏 actions 重排为「历史 / 模板 / 模型 | 数据 / 主题 / 首页」两组.

## [1.8.4] - 2026-05-20

- 顶栏品牌方块 / 状态徽章 / 分隔线视觉统一, 与 AutoPilot 一致.

## [1.8.3] - 2026-05-20

- 全工程动画时长 / 缓动统一.

## [1.8.2] - 2026-05-20

- 首屏改为完整布局骨架替代单 spinner.
- 优化模式切换器升级为段控件 (icon + 主副标签).
- 版本切换区改为 V 标签段控件.

## [1.8.0] - 2026-05-20

- AutoTest 前端整体重塑, 设计语言 / 字体 / 主色与 AutoPilot 对齐.
- 顶栏 ActionButton 从 emoji 改 SVG 图标.

## [1.6.9] - 2026-05-19

- 部署链路回滚到稳定基线.

## [1.6.5] - 2026-05-19

- 顶栏新增「返回首页」按钮.

## [1.6.3] - 2026-05-19

- 部署链路优化.

## [1.5.14] - 2026-05-19

- TestPanel 与 InputPanel 手机小屏展示修复.

## [1.5.13] - 2026-05-19

- InputPanel 控件小屏自动换行.

## [1.5.11] - 2026-05-19

- 浏览器收藏图标高分屏不再模糊.

## [1.5.10] - 2026-05-19

- 标题改为「QA AutoPilot · AutoTest」, 接入全套品牌图标.

## [1.5.4] - 2026-05-19

- Confluence / Figma / 图片识别 / markdown 解析在公网入口下不再 404.

## [1.5.3] - 2026-05-19

- 公网入口统一经 gateway, 业务地址不再直接暴露.
- 修复远端存储与 LLM 代理因路径前缀缺失的 404.

## [1.5.2] - 2026-05-19

- 发布流程改回 lockstep.

---

> 以下为 prompt-optimizer 合并入仓 (commit `ec396c2`) 前的源仓历史, 无独立版本号.

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
