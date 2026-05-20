# Changelog

写作规范见 [deploy.md §CHANGELOG 写作](../deploy.md#changelog-写作).

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
