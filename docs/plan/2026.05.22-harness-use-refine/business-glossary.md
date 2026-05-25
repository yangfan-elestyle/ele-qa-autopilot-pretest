# 主 Web 业务术语 (Sys / Dashboard / Business / ACQ)

> 范围: 覆盖 Sys、Dashboard、Business、ACQ 四套主 Web 工程链路下的业务实体、流程、子模块与专属概念。
> 涉及域名 (staging): `stg-sys.*` / `stg-dashboard.*` (含 dashboard-v1 / dashboard-pages 微前端 remote) / `stg-business.*` / `acq.*` + `acq-admin.*` + `acq-business.*` + `acq-pay.*`。
> 与本链路无关业务线 (kintai / elekb / ESP / EleToys 等) 不收录。

## 1. 工程定位速查

<!-- prettier-ignore -->
| 工程 | 域名 (stg) | 受众 | 仓库 | 形态 |
| --- | --- | --- | --- | --- |
| Sys | `stg-sys.stg.elepay.dev` | 公司内部运营 (招商/风控/客服/财务) | `elepay-admin-ant-v2/packages/elepay-sys` | Vue3 SPA |
| Dashboard | `stg-dashboard.stg.elepay.dev` | 商户老板 / 店员 | `elepay-admin-ant-v2/packages/elepay-admin` | Module Federation 宿主 |
| Dashboard V1 (remote) | `stg-dashboard-v1.stg.elepay.dev` | 不直接对用户暴露 | `elepay-admin-ant/packages/elepay-admin` | Vue2 Webpack MPA |
| Dashboard Pages (remote) | `stg-dashboard-pages.stg.elepay.dev` | 不直接对用户暴露 | `elepay-admin-ant-v2/packages/elepay-admin-pages` | Vue3 Vite MPA |
| Business | `stg-business.stg.elepay.dev` | 公司内部招商/审核 + 商户申请 | `elepay-admin-ant-v2/packages/elepay-business` | Vue3 SPA |
| ACQ (主入口) | `acq.stg.elepay.dev` | 收单业务商户自服务 | `ele-acq-web/packages/acq-business` | Vue3 SPA |
| ACQ Admin | `acq-admin.stg.elepay.dev` | 收单业务内部审核员 | `ele-acq-web/packages/acq-admin` | Vue3 SPA |
| ACQ Business (别名) | `acq-business.stg.elepay.dev` | 同 ACQ (同源备用) | 同上 | 同上 |
| ACQ Pay | `acq-pay.stg.elepay.dev` | 终端消费者 | `ele-acq-web/packages/acq-pay` | Vue3 单入口 MPA |

> Dashboard / Dashboard V1 / Dashboard Pages 三者属同一套微前端: dashboard 是 SPA 宿主, v1 / pages 仅作 Module Federation remote 提供 `.html` 入口, 不直接对外。

## 2. 核心业务实体 (跨 Sys / Business / Dashboard)

中日英三语对照 + 链路出现位置。

<!-- prettier-ignore -->
| 中文 | 日文 | English | 在本链路出现于 |
| --- | --- | --- | --- |
| 合作伙伴 / 渠道方 | パートナー | Partner | Sys `/partners` |
| 商户 (法人) | 加盟店 | Merchant | Sys `/merchants`、Business `/merchants`、ACQ `/merchants` |
| 商户用户 | — | MerchantUser | Sys `/merchant-users`、Dashboard `/business/merchant-user`、Business `/merchants/:id/merchant-user/*` |
| 账户 (登录) | アカウント | Account | 各工程 `/user/account` |
| 应用 | アプリ | App | Sys `/apps`、Business `/apps`、Dashboard `/business/apps`、`/apps/:appId/*` |
| 店铺 / 物件 | 店舗 / 物件 | Shop | Sys `/shops`、Dashboard `/apps/:appId/oneqr/shop/shops` |
| 收银终端 | 端末 | Terminal | Dashboard `/apps/:appId/oneqr/devices` |
| 结算法人 | — | Business (entity) | Sys `/business`、`/business/:key`、`/business/:key/solution-patterns/:id` |
| 结算门店 | — | MerchantStore | Business `/merchants/:id/merchant-shop/:merchantStoreId`、Dashboard `*/merchant-store-supplement` |
| 运营人员 | — | Member | Sys `/members`、Business `/members`、ACQ `/members` (各工程独立账户体系, 互不打通) |

归属链 (本链路口径):

```
Partner ─┬─> Merchant (签约法人) ──> App ──> Shop ──> Terminal
         └─> MerchantUser (商户员工/操作员) ── 多对多 ── Merchant
              (Account 是登录身份, MerchantUser 是商户侧角色)
```

易错 (本链路):

- Shop 挂 App, 不挂 Merchant: Sys `/shops`、Dashboard OneQR Shop 都以 App 为父维度。
- MerchantStore ≠ Shop: 前者在 Business `/merchants/:id/merchant-shop/:merchantStoreId` (结算侧), 后者在 Dashboard OneQR (SaaS 侧), 字段不同, 不要互译。
- Business (entity) ≠ Business (工程): 同名两义。Sys `/business/:key` 是跨 Merchant 的结算法人维度; `elepay-business` 工程是商户申请流程的 Web 入口。
- MerchantUser ≠ Member: 前者是商户内部员工, 后者是 Sys / Business / ACQ 各自工程内部的运营人员账户体系。

## 3. 多租户 / 贴牌 (Sys / Business / Dashboard 均受影响)

<!-- prettier-ignore -->
| 品牌 | 关系 | 域名走向 | 在本链路体现 |
| --- | --- | --- | --- |
| elepay | 自营 | `*.stg.elepay.dev` | 本文档默认口径 |
| Stera Smart One | 贴牌 (SMCC × GMO PG) | `*.sterasmartone.com` | 同套 Sys / Dashboard / Business 代码, 按 host 切品牌配置 (`sterasmartone.config.json`) |
| Paidy In-store | 渠道合作 | `*-merchant.paidyinstore.com` / `*-business.paidyinstore.com` | 同套 Dashboard / Business 代码 |

改 Sys / Dashboard / Business 通用功能时必须同时验 Stera。

## 4. 支付域 (Sys Payment + Dashboard GW)

Sys 是内部视角 (`/payment/*`), Dashboard GW (`/apps/:appId/gw/*`) 是商户视角。

<!-- prettier-ignore -->
| 中文 | English | 路径示例 | 说明 |
| --- | --- | --- | --- |
| 收款 / 交易 | Charge | Sys `/payment/charges`、Dashboard `/apps/:appId/gw/payment/charges` | 一次支付动作的核心对象 |
| 退款 | Refund | (内嵌 charge 详情) | charge 的子操作 |
| 争议 | Dispute | Sys `/payment/disputes`、Dashboard `/apps/:appId/gw/payment/disputes` | 拒付 / 退单纠纷 |
| 客户 | Customer | Dashboard `/apps/:appId/gw/customers` | 商户视角的支付方主体 (注意: 与 ACQ 的 Customer 不同源) |
| 支付方式 | PaymentMethod | Dashboard `/apps/:appId/gw/payment/payment-methods`、Sys `/apps/:id/paymentMethod` | Provider 实际暴露的支付方式列表 |
| 支付申请 | PaymentApply / AppPayApply | Sys `/app-pay-applies`、Business `/app-pay-applies`、Dashboard `/business/pay-apply-payment-methods` | 商户申请开通某支付方式的工单 (服务: `ele-pay-apply-svc`) |
| 订阅 | Subscription | Dashboard `/apps/:appId/gw/subscription/subscribers` | 商户订阅者管理 |
| API Key | API | Dashboard `/apps/:appId/gw/developer/api`、ACQ Admin `/settings/api` | 商户开发者凭据 |
| Webhook | Webhook | Dashboard `/apps/:appId/gw/developer/webhooks`、ACQ Admin `/settings/webhook` | Webhook 配置 (按事件类型订阅 charge / refund / dispute / subscription 等) |

## 5. 结算 / 计费 / 出账 (Sys + Business + Dashboard Business)

<!-- prettier-ignore -->
| 中文 | English | 主要入口 | 说明 |
| --- | --- | --- | --- |
| 结算 | Settlement | Sys `/settlements/*`、Dashboard `/business/payout/settlement`、`/business/settlement-management/list` | 按周期把交易款打给商户 |
| 结算批次 / 文件 | Payout / PayoutFile | Business `/payouts`、`/payout-files` | 结算的批次/文件级对象 |
| Connect 结算 | ConnectPayout | Business `/connect-payouts` | 联通账户/分账场景的结算 |
| 入账记录 | PayoutRecord / IncomeRecord | Sys `/merchants/income/records/*`、Dashboard `/business/payout/record` | 商户视角的到账记录 |
| 银行账户 | MerchantBankAccount | Sys `/settlements/merchant-bank-accounts-list`、Dashboard `/business/payout/setting` | 收款银行账户 |
| 支出 | Expend | Sys `/expends/*` | 出款类型: 退款 / 手续费 / 调账等 |
| 余额 | Balance | Sys `/balance` | 商户在 elepay 平台的资金余额 |
| 计费方案 | BillingPlan | Dashboard `/business/billing/plan` | 商户级 SaaS 计费配置 |
| 发票 (新) | BillingInvoice | Sys `/billings/invoices`、Dashboard `/business/billing/invoice` (Vue3) | 服务: `ele-billing-svc` |
| 发票 (旧) | Billing/Invoice (legacy) | Sys `/billing/invoices`、Dashboard `/business/billing/invoices-legacy` | 旧计费体系, 与新版并存中 |
| 返佣 / 渠道分润 | Kickback / KickbackTransfer | Business `/kickbacks`、`/kickback-transfers` | 渠道方 (Partner) 分润记录 |
| 后付费 | Atokara | Sys `/settings/atokara/*`、Dashboard `/business/payout/atokara` | GMO 後払い, 服务: `ele-atokara-job` |

> Sys 旧路径 `/billing/*` 与新路径 `/billings/*` 并存, 同一商户的发票可能分散在两个表里, 改动前先看商户绑定的是哪一套。

## 6. 商户审核 / 申请流程 (Business + Sys + ACQ)

<!-- prettier-ignore -->
| 中文 | English | 入口 | 说明 |
| --- | --- | --- | --- |
| 商户申请 | MerchantApply | Business `/merchant/merchant-applies/*` | 商户填报材料后的工单 |
| 申请邀请 | ApplyInvitation | Business `/merchant/apply-invitation/*`、ACQ `/merchant/apply-invitation/*` | 招商人员发给候选商户的注册邀请链接 |
| 反社审查 | AntiCompanyCheck | Business `/merchant-anti-company-check/*` | 反社会勢力チェック (日本风控强制环节) |
| 一次审 | MerchantOneAudit | Business `/merchant-one-audits/*` | 商户开通的初审 |
| 二次审 | MerchantTwoAudit | Business `/merchant-two-audits/*`、ACQ `/merchant-two-audits/*` | 复审 (一般由风控部门完成) |
| 商户注册 | MerchantRegister | Business `/user/merchant-register/*`、ACQ `/user/merchant-register/*` | 新商户自助注册入口 |
| 门店补充 | MerchantStoreSupplement | Business `/merchant-store-supplement`、Dashboard `/apps/:appId/gw/locations/merchant-store-supplement`、`/apps/:appId/oneqr/shop/merchant-store-supplement` | 商户开通后补充结算侧门店信息 |

## 7. Provider 体系

Provider = 支付通道实例; 一个 Provider 对应某种具体支付实现 (GMO / Stripe / SMBC GP / Paidy / UnionPay 等) 的一组配置。

<!-- prettier-ignore -->
| 术语 | 入口 | 说明 |
| --- | --- | --- |
| Provider | Sys `/settings/providers/:id` | 单个支付通道实例 (例: GMO 的某个子账号) |
| ProviderAgent | Sys `/settings/provider-agents/:id` | Provider 代理 (多通道经纪 / 中间方) |
| MasterProvider | Sys `/settings/master-providers/:id` | 跨实例的 Provider 母模板 |
| ConnectProvider | Sys `/settings/connect-provider-management/:id` | Connect / 分账场景下的 Provider |
| ProviderContract | Sys `/merchants/:id/provider-contract/:cid`、ACQ `/merchants/:merchantId/merchant-contract/:type` | 商户与某个 Provider 的合约 |

## 8. OneQR

elepay 面向门店的 SaaS 子产品集 (Dashboard `/apps/:appId/oneqr/*`), 全部挂在 App 下、按 appId 切分。核心实体 (Shop / Terminal) 沿用 §2。

子产品定位:

- **Product**: 商品 + 分类 + 选项组, SaaS 商品库。
- **Order**: OneQR 自有的订单实体 — 偏履约维度, 与 §4 Charge (资金维度) 是不同表, 不要互译。
- **Stock**: 门店级库存任务流。
- **Warehouse**: 仓库级库存与采购。
- **Paybox**: 钱箱 (Cash / Souvenir)。
- **Promotion / Marketing V2**: 营销活动 (新版位于 Dashboard Pages `oneqr-marketing_v2-*` 子树)。
- **OneQR Shop Staff** (`/oneqr-shop-staff/*`): 店员端独立子树, 与老板视角 `/apps/:appId/oneqr/*` 平行。
- **OneQR Marketplace** (`marketplace`): 端内 Plugin 市场, 与 Sys 公司级 `/marketplace` 不同源。

## 9. GW / EasyQR

Dashboard `/apps/:appId/gw/*` 下的两个相邻概念:

- **GW** = elepay Gateway, 支付网关、商户视角的支付控制台。覆盖 Charge / Refund / Dispute / Customer / PaymentMethod / Subscription / Webhook / API Key, 这些术语本身在 §4 已定义。
- **EasyQR** = GW 内的轻量收银台 + 发票方案 (服务: `elepay-easy-svc`)。子模块: 门店二维码 / Easy Checkout (轻集成 SDK) / Easy Invoice / EasyQR Subscription (beta) / Square 集成。
- **Location**: GW 视角下的"门店"叫 Location, 实际就是 §2 的 MerchantStore 别名。

## 10. ACQ 链路专属术语

ACQ 独立于 elepay 支付通道, 面向金融机构合作方 (SMCC / TIS / SMBC GP) 提供收单托管 + 商户开通基础设施。

<!-- prettier-ignore -->
| 中文 | English | 入口 | 说明 |
| --- | --- | --- | --- |
| 客户 | Customer | ACQ `/customers/:id`、ACQ Admin `/customers/:id` | ACQ 视角的支付方主体 (与 elepay GW Customer 同名不同源) |
| 客户 Source | Source | ACQ / ACQ Admin `/customers/:id/sources/:sourceId` | 客户保存的支付方式 (卡 / Source) |
| 已绑卡 | RegisteredPaymentMethod | ACQ / ACQ Admin `/registered-payment-methods` | 客户视角的保存支付方式列表 |
| 发票 | Invoice | ACQ `/invoices/:id`、ACQ Admin `/invoice/{entries,pending-invoices,invoices}` | ACQ 自有发票实体, 与 elepay BillingInvoice 同名不同源 |
| 重收 | InvoiceRetry | ACQ Admin `/invoice-retry/*` | 发票二次催收 (失败后重试链路) |
| 重收支付页 | InvoiceRetryUrl | ACQ Pay `/invoice-retry/:invoiceScheduleId` | 给终端消费者的支付补救链接 |
| 洗单 | WashRequest | ACQ Admin `/wash-request/*` | 异常订单清洗 / 重对账流程 (内部术语) |
| 通知 | Notice | ACQ Admin `/notice/end-user/*`、ACQ `/notification` | 对终端消费者的通知配置 |
| Team | Team | ACQ Admin `/team/:id` | ACQ 内部团队 / 权限分组 (与 elepay Member 不同源) |
| 支付二维码页 | CodeQR | ACQ Pay `/codes/:code` | 终端消费者扫码后的支付落地页 |

ACQ 专属基础设施 (路径中不出现, 但排障时常被提到):

- TIS SFTP (`sftp-service.ele-acq.stg.elepay.link`): TIS 下发休业日 (`FS131002`) 与银行分支号 (`FS141202`)
- PGP 加密: SFTP 文件端到端加密 (服务: `ele-acq-api`、`acq-send-svc`)
- SMBC GP Member Inquiry: `stg-openapi.smbc-gp.co.jp/member/inquiry` (商户会员资格查询 / 短信 OTP)
- ACQ TiDB: 独立 schema `acq`, 与 elepay 主集群隔离

## 11. 共享设施 (跨工程, 不重复 §1–§10)

<!-- prettier-ignore -->
| 中文 | English | 入口 | 说明 |
| --- | --- | --- | --- |
| Marketplace (公司级) | Marketplace | Sys `/marketplace/:key` | 公司级应用市场 (与 OneQR 端内 Marketplace 不同) |
| OneQR 广告 | OneQR Ad | Sys `/ad/{config,advertisers,content,unit}` | OneQR 大屏 / 店内广告位投放管理 |
| 营销活动 (旧) | Marketing Event | Sys `/marketing/event/:key` | 老版营销活动 (新版在 Dashboard Pages `oneqr-marketing_v2-*`) |
| 业务方案 | BusinessSolutionPattern | Sys `/business/:key/solution-patterns/:id` | 业务套餐 / 标准化方案配置 |
| 打印模板 | PrintTemplate | Dashboard `/apps/:appId/{print-template,print-template-editor,print-preview}` + Vue2 remote `extra-print-*.html` | 跨工程打印体系 (小票 / QR / Poster) |
| FTP | FTP | Sys `/ftp-overview`、Dashboard `/apps/:appId/setting/ftp-setting` | FTP 通道 / 账号管理 |

## 12. 本链路上的易错点 (精简清单)

1. 同名异义 **Customer**: ACQ `/customers` (收单视角) 与 Dashboard GW `/apps/:appId/gw/customers` 是两套数据源, 不要 join。
2. 同名异义 **Invoice**: ACQ Invoice、ACQ Invoice Retry、elepay BillingInvoice (新 + 旧)、EasyQR Invoice — 四套并存, 看域名+工程定位再判断。
3. 同名异义 **Source**: ACQ Source 是 ACQ 自有概念; 通用支付术语里的 Source (客户保存的支付方式) 在 GW 体系下表现为 RegisteredPaymentMethod。
4. 同名异义 **Member**: Sys / Business / ACQ 三套 Member 体系并存, 都是"内部运营人员", 互不打通。
5. **MerchantStore 多入口**: Business 商户档案 / Dashboard GW Location / Dashboard OneQR Shop 补充 — 同一结算侧门店实体, 但维护入口分散。
6. **MerchantUser ≠ Member**: 前者商户雇佣的员工 (商户侧), 后者 elepay / Stera / ACQ 公司侧运营员工。
7. **Dashboard V1 / Pages 不直接访问**: 域名只是给 Module Federation remote 用, 直接访问会看到 `.html` 而非完整 UI。用户感知是 `stg-dashboard.*`。
8. **`acq.*` 与 `acq-business.*` 同工程**: dispatcher 只显式配置 `acq.stg.elepay.dev`, `acq-business.stg.elepay.dev` 是 `acq-test-extension` 用的同源备用入口。
9. **Stera / Paidy 走 host 切站**: Sys 通常只在 elepay 域名露面; Business / Dashboard 在贴牌域名下跑同一份代码, 改前确认涉及哪些品牌。
10. **`/parking-ticket/*` 不属于 elepay-admin**: 看似在 Dashboard 域名下, 实为 dispatcher 把这条路径前缀转发到了 `oneqr-terminal` 工程。
11. **Business (entity) 与工程 `elepay-business` 同名两义**: 看出现位置 (Sys `/business/:key` vs. 工程域名 `stg-business.*`) 区分。
12. **新旧 Billing 路径并存**: Sys 旧 `/billing/*` 与新 `/billings/*`、Dashboard `/business/billing/invoice` 与 `/business/billing/invoices-legacy` 是同一时期的迁移中状态。

