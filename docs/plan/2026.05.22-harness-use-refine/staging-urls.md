# elepay Staging 主要 Web URL (Sys / Dashboard / Business / ACQ)

> 路径来源: `ele-argocd-app/apps/ele-dispatcher/stg-base.libsonnet` (域名映射) + 各前端工程 router/pages 源码 (路径明细)。
> 仅收录用户浏览器地址栏可直接访问的 URL。dashboard-v1 / dashboard-pages 仅作为 Module Federation remote 被 dashboard 加载, 地址栏不出现, 故不列入; ACQ 工程 `acq-business.stg.elepay.dev` 别名 dispatcher 未配置, 同样不列入。

## 1. Sys — `https://stg-sys.stg.elepay.dev`

工程: `elepay-admin-ant-v2/packages/elepay-sys` (Vue3 SPA, 历史模式)。

<!-- prettier-ignore -->
| 分组 | 路径 |
| --- | --- |
| 通用 | `/health`、`/user`、`/user/login` |
| Home | `/` (重定向到 `/merchants`)、`/dashboard` |
| 组织 | `/orgs`、`/orgs/:id` |
| 商户 | `/merchants`、`/merchants/new`、`/merchants/:id`、`/merchants/:id/provider-contract/:cid`、`/merchants/income/records`、`/merchants/income/records/:id`、`/merchants/income/records/:id/transaction` |
| 商户用户 | `/merchant-users`、`/merchant-users/:id/merchants/:merchantId` |
| App | `/apps`、`/apps/:id`、`/apps/:id/paymentMethod` |
| 支付申请 | `/app-pay-applies`、`/app-pay-applies/:id` |
| Shop | `/shops` |
| 营销 | `/marketing` (重定向到 `/marketing/events`)、`/marketing/event`、`/marketing/event/:key` |
| Payment | `/payment` (重定向到 `/payment/charges`)、`/payment/charges`、`/payment/charges/:id`、`/payment/disputes`、`/payment/disputes/:id` |
| 余额 | `/balance` |
| 支出 | `/expends`、`/expends/:id/confirm`、`/expends/:id/transaction` |
| Settlements | `/settlements` (重定向到 `/settlements/list`)、`/settlements/list`、`/settlements/list/:id/transaction`、`/settlements/list-alert`、`/settlements/list-alert/:id`、`/settlements/result-list`、`/settlements/result-list/:id`、`/settlements/merchant-bank-accounts-list`、`/settlements/merchant-bank-accounts-list/:id` |
| Billing (旧) | `/billing` (重定向到 `/billing/invoices`)、`/billing/invoices`、`/billing/invoices/:id` |
| Billings (新) | `/billings/templates`、`/billings/templates/:id`、`/billings/invoices`、`/billings/invoices/:id` |
| Business | `/business`、`/business/:key`、`/business/:key/solution-patterns/:id` |
| Partner | `/partners`、`/partners/:id` |
| Marketplace | `/marketplace`、`/marketplace/:key` |
| OneQR 广告 | `/ad/config`、`/ad/advertisers`、`/ad/advertisers/:id`、`/ad/content`、`/ad/content/:id`、`/ad/unit`、`/ad/unit/:id` |
| Member | `/members` (重定向到 `/members/list`)、`/members/list`、`/members/list/:id`、`/members/role`、`/members/role/:id`、`/members/permission-key` |
| 统计 | `/statistics` |
| SDK 上报 | `/sdk-report`、`/sdk-report/:id` |
| FTP | `/ftp-overview` |
| Settings | `/settings` (重定向到 `/settings/setting-management`)、`/settings/provider-agents`、`/settings/provider-agents/:id`、`/settings/providers`、`/settings/providers/:id`、`/settings/master-providers`、`/settings/master-providers/:id`、`/settings/system-management`、`/settings/setting-management`、`/settings/setting-management/:id`、`/settings/layout-schema`、`/settings/layout-schema/:id`、`/settings/labels`、`/settings/labels/:id`、`/settings/connect-provider-management`、`/settings/connect-provider-management/:id`、`/settings/native-version`、`/settings/native-version/:key`、`/settings/image-sources`、`/settings/atokara`、`/settings/atokara/:key`、`/settings/merchant-vault` |
| 错误 | `/error` (重定向到 `/error/code`)、`/error/code`、`/error/code/:errorCode`、`/error/conversions`、`/error/conversions/:providerKey/:providerErrorCode`、`/error/conversions/:errorCode`、`/error/log` |
| 活动日志 | `/activities` |

## 2. Dashboard — `https://stg-dashboard.stg.elepay.dev`

工程: `elepay-admin-ant-v2/packages/elepay-admin` (Module Federation 宿主, 路由集中在 `src/routes.json`)。
特殊: `/parking-ticket/*` 由 dispatcher 直接转发至 `oneqr-terminal` 工程, 不属于 elepay-admin 自身路由。
SPA path 中的 `:appId` 用具体 app id 替换; 业务路径示例 `/business/apps`、`/apps/{appId}/oneqr/dashboard`。

### 2.1 用户 `/user`

<!-- prettier-ignore -->
| 路径 | 说明 |
| --- | --- |
| `/user` | 登录 (子路由无 path, 默认与父级一致) |
| `/user/forgot-password` | 忘记密码 |
| `/user/setting-password` | 设置密码 |
| `/user/invitation` | 用户邀请激活 |
| `/user/account` | 账户设置 (默认与父级一致) |
| `/user/merchant` | 商户切换 |

### 2.2 Business `/business` (商户全局视图, 无 appId)

<!-- prettier-ignore -->
| 路径 | 说明 |
| --- | --- |
| `/business/apps` | App 列表 |
| `/business/merchant` | 商户信息 |
| `/business/payout/settlement` | 结算 |
| `/business/payout/record` | 入账记录 (隐藏菜单) |
| `/business/payout/setting` | 银行账户 |
| `/business/payout/atokara` | 后付费 (atokara) |
| `/business/settlement-management/list` | 结算管理列表 |
| `/business/settlement-management/rate-setting` | 费率设置 |
| `/business/billing/plan` | 计费方案 |
| `/business/billing/invoice` | 发票 (Vue3) |
| `/business/billing/setting` | 计费设置 |
| `/business/billing/invoices-legacy` | 旧发票 (隐藏菜单) |
| `/business/orders` | 订单 |
| `/business/merchant-user` | 商户用户 |
| `/business/pay-apply-payment-methods` | 支付方式申请 |
| `/business/business-security-setting` | 安全设置 |
| `/business/app-info` | App 信息 |
| `/business/download` | 下载中心 |

### 2.3 GW `/apps/:appId/gw` (Gateway 支付网关服务)

<!-- prettier-ignore -->
| 路径 | 说明 |
| --- | --- |
| `/apps/:appId/gw/dashboard` | 仪表盘 |
| `/apps/:appId/gw/payment/charges` | 收款列表 |
| `/apps/:appId/gw/payment/disputes` | 争议列表 |
| `/apps/:appId/gw/payment/payment-methods` | 支付方式 |
| `/apps/:appId/gw/customers` | 客户列表 |
| `/apps/:appId/gw/locations/list` | 门店列表 |
| `/apps/:appId/gw/locations/merchant-store-supplement` | 门店补充 |
| `/apps/:appId/gw/subscription/subscribers` | 订阅者 |
| `/apps/:appId/gw/developer/api` | API Key |
| `/apps/:appId/gw/developer/webhooks` | Webhook |
| `/apps/:appId/gw/developer/app-setting` | App 设置 |
| `/apps/:appId/gw/statistics-charge` | 收款统计 (beta) |
| `/apps/:appId/gw/test-mode-detail-404` | Test 模式 404 占位 |
| `/apps/:appId/gw/easyqr/location-qr` | 门店二维码 (new) |
| `/apps/:appId/gw/easyqr/checkout` | Easy Checkout |
| `/apps/:appId/gw/easyqr/invoices` | Easy Invoice |
| `/apps/:appId/gw/easyqr/subscription` | EasyQR 订阅 (beta) |
| `/apps/:appId/gw/easyqr/square` | Square 集成 |
| `/apps/:appId/gw/easyqr/tool` | EasyQR 工具 (隐藏菜单) |
| `/apps/:appId/gw/easyqr/setting` | EasyQR 设置 |

### 2.4 Setting `/apps/:appId/setting`

<!-- prettier-ignore -->
| 路径 | 说明 |
| --- | --- |
| `/apps/:appId/setting/app-info` | App 信息 |
| `/apps/:appId/setting/ftp-setting` | FTP 设置 |
| `/apps/:appId/setting/activities` | 操作日志 |

### 2.5 OneQR `/apps/:appId/oneqr`

<!-- prettier-ignore -->
| 路径 | 说明 |
| --- | --- |
| `/apps/:appId/oneqr/dashboard` | 仪表盘 |
| `/apps/:appId/oneqr/shop/shops` | 门店列表 |
| `/apps/:appId/oneqr/shop/deleted-shops` | 已删除门店 |
| `/apps/:appId/oneqr/shop/merchant-store-supplement` | 门店补充 |
| `/apps/:appId/oneqr/devices` | 设备列表 |
| `/apps/:appId/oneqr/product/products` | 商品列表 |
| `/apps/:appId/oneqr/product/product-sets` | 套餐 (deprecated) |
| `/apps/:appId/oneqr/product/categories` | 商品分类 |
| `/apps/:appId/oneqr/product/option-groups` | 商品选项组 |
| `/apps/:appId/oneqr/product/groups` | 商品组 (beta) |
| `/apps/:appId/oneqr/product/kds-groups` | KDS 分组 (beta) |
| `/apps/:appId/oneqr/orders` | 订单列表 |
| `/apps/:appId/oneqr/stock/shops` | 库存门店 |
| `/apps/:appId/oneqr/stock/tasks` | 库存任务 |
| `/apps/:appId/oneqr/stock/renewals` | 续约 |
| `/apps/:appId/oneqr/stock/task-operators` | 任务操作员 |
| `/apps/:appId/oneqr/stock/delivery-template` | 配送模板 |
| `/apps/:appId/oneqr/stock/setting` | 库存设置 |
| `/apps/:appId/oneqr/stock/task-blacklist` | 任务黑名单 |
| `/apps/:appId/oneqr/warehouse/dashboard` | 仓库仪表盘 |
| `/apps/:appId/oneqr/warehouse/product-list` | 仓库商品 |
| `/apps/:appId/oneqr/warehouse/operation` | 仓库操作 |
| `/apps/:appId/oneqr/warehouse/operation-history-list` | 操作历史 |
| `/apps/:appId/oneqr/warehouse/operation-purchase-list` | 采购记录 |
| `/apps/:appId/oneqr/paybox/cash` | Cash 钱箱 |
| `/apps/:appId/oneqr/paybox/souvenir` | Souvenir 钱箱 |
| `/apps/:appId/oneqr/shop-staff-users` | 店员账号 |
| `/apps/:appId/oneqr/users` | 终端用户 |
| `/apps/:appId/oneqr/promotions` | 推广 |
| `/apps/:appId/oneqr/contact` | 联系记录 |
| `/apps/:appId/oneqr/maintenance` | 维护记录 |
| `/apps/:appId/oneqr/statistics` | 统计 (beta) |
| `/apps/:appId/oneqr/report` | 报表 (beta) |
| `/apps/:appId/oneqr/setting/basic` | 基本设置 |
| `/apps/:appId/oneqr/setting/design` | 设计 |
| `/apps/:appId/oneqr/setting/label-management` | 标签管理 |
| `/apps/:appId/oneqr/setting/device-models` | 设备型号 |
| `/apps/:appId/oneqr/setting/payment-methods` | 支付方式 |
| `/apps/:appId/oneqr/setting/print-customization` | 打印定制 |
| `/apps/:appId/oneqr/setting/print-template` | 打印模板 (beta) |
| `/apps/:appId/oneqr/setting/carousels` | 轮播 |
| `/apps/:appId/oneqr/marketplace` | 应用市场 |
| `/apps/:appId/oneqr/setting-page/terms` | 服务条款 |
| `/apps/:appId/oneqr/setting-page/privacy` | 隐私政策 |
| `/apps/:appId/oneqr/setting-page/help` | 帮助 |
| `/apps/:appId/oneqr/setting-language/supported-language` | 支持语言 |
| `/apps/:appId/oneqr/tools/batch-import` | 批量导入 (beta) |
| `/apps/:appId/oneqr/tools/data-import` | 数据导入 (beta) |
| `/apps/:appId/oneqr/data-export-template-setting` | 数据导出模板 (隐藏菜单) |

### 2.6 OneQR Shop Staff `/oneqr-shop-staff`

<!-- prettier-ignore -->
| 路径 | 说明 |
| --- | --- |
| `/oneqr-shop-staff/dashboard` | 店员仪表盘 |
| `/oneqr-shop-staff/shop` | 门店 |
| `/oneqr-shop-staff/devices` | 设备 |
| `/oneqr-shop-staff/product/shop-product` | 门店商品 |
| `/oneqr-shop-staff/product/products` | 商品 |
| `/oneqr-shop-staff/product/product-sets` | 套餐 (deprecated) |
| `/oneqr-shop-staff/product/categories` | 分类 |
| `/oneqr-shop-staff/product/option-groups` | 选项组 |
| `/oneqr-shop-staff/stock/shop` | 库存门店 |
| `/oneqr-shop-staff/orders` | 订单 |
| `/oneqr-shop-staff/statistics` | 统计 |
| `/oneqr-shop-staff/tools` | 工具 |
| `/oneqr-shop-staff/download` | 下载 |
| `/oneqr-shop-staff/plugin-setting` | 插件设置 |

### 2.7 Extra `/extra` + `/apps/:appId` 全局打印

<!-- prettier-ignore -->
| 路径 | 说明 |
| --- | --- |
| `/extra/onetime-link-file-upload` | 一次性上传 (skipAuth) |
| `/extra/onetime-link-file-download` | 一次性下载 (skipAuth) |
| `/apps/:appId/print-template` | 打印模板 (Vue3) |
| `/apps/:appId/print-preview` | 打印预览 |
| `/apps/:appId/print-template-editor` | 打印模板编辑器 |

## 3. Business — `https://stg-business.stg.elepay.dev`

工程: `elepay-admin-ant-v2/packages/elepay-business` (Vue3 SPA, 历史模式)。

<!-- prettier-ignore -->
| 分组 | 路径 |
| --- | --- |
| 通用 | `/health` |
| User | `/user` (重定向到 `/user/login`)、`/user/login`、`/user/member-invitation/:code`、`/user/merchant-register`、`/user/merchant-register/:code`、`/user/merchant-register/:code/result`、`/user/forgot-password`、`/user/reset-password/:code`、`/user/account` |
| Home | `/` (重定向到 `/merchants`) |
| 商户申请 | `/merchant` (重定向到 `/merchant/merchant-applies`)、`/merchant/apply-invitation`、`/merchant/apply-invitation/:id`、`/merchant/apply-invitation/detail/:id`、`/merchant/merchant-applies`、`/merchant/merchant-applies/:id`、`/merchant/approval-process-setting` |
| 反社审查 | `/merchant-anti-company-check`、`/merchant-anti-company-check/:id` |
| 一次审 | `/merchant-one-audits`、`/merchant-one-audits/:id` |
| 二次审 | `/merchant-two-audits`、`/merchant-two-audits/:id` |
| 商户 | `/merchants`、`/merchants/:id`、`/merchants/:id/merchant-user/create`、`/merchants/:id/merchant-user/:merchantUserId`、`/merchants/:id/merchant-shop/:merchantStoreId` |
| 门店补充 | `/merchant-store-supplement` |
| App | `/apps` (隐藏菜单)、`/apps/:id` |
| 支付申请 | `/app-pay-applies`、`/app-pay-applies/:id` |
| 结算 | `/payouts`、`/payouts/:id`、`/payout-files`、`/connect-payouts`、`/connect-payouts/:id` |
| 返佣 | `/kickbacks`、`/kickbacks/:id`、`/kickback-transfers`、`/kickback-transfers/:id` |
| Member | `/members`、`/members/:id` |

## 4. ACQ

工程: `ele-acq-web` (Vue3 SPA monorepo, 含 `acq-business` / `acq-admin` / `acq-pay` 三个 package)。

### 4.1 主入口 (Merchant) — `https://acq.stg.elepay.dev`

工程: `ele-acq-web/packages/acq-business`。dispatcher 仅在 staging 显式配置了 `acq.stg.elepay.dev` 指向该工程。

<!-- prettier-ignore -->
| 分组 | 路径 |
| --- | --- |
| 通用 | `/health`、`/test/system-date` |
| User | `/user` (重定向到 `/user/login`)、`/user/login`、`/user/member-invitation/:code`、`/user/merchant-register`、`/user/merchant-register/:code`、`/user/merchant-register/:code/result`、`/user/forgot-password`、`/user/reset-password/:code`、`/user/account` |
| Home | `/` (重定向到 `/merchant/apply-invitation`) |
| 申请邀请 | `/merchant/apply-invitation`、`/merchant/apply-invitation/:id`、`/merchant/apply-invitation/detail/:id` |
| 二次审 | `/merchant-two-audits`、`/merchant-two-audits/:id` |
| 商户 | `/merchants`、`/merchants/:merchantId`、`/merchants/:merchantId/merchant-user/create`、`/merchants/:merchantId/merchant-user/:merchantUserId`、`/merchants/:merchantId/merchant-contract/:type`、`/merchants/:merchantId/merchant-contract/:type/edit` |
| Member | `/members`、`/members/:id` |
| 通知 | `/notification` |
| 发票 | `/invoices`、`/invoices/:id` |
| 客户 | `/customers`、`/customers/:id`、`/customers/:id/sources/:sourceId` |
| 已绑卡 | `/registered-payment-methods`、`/registered-payment-methods/:sourceId` |
| 下载 | `/download` |

### 4.2 Admin — `https://acq-admin.stg.elepay.dev`

工程: `ele-acq-web/packages/acq-admin`。

<!-- prettier-ignore -->
| 分组 | 路径 |
| --- | --- |
| 通用 | `/health` |
| User | `/user` (重定向到 `/user/login`)、`/user/login`、`/user/forgot-password`、`/user/reset-password/:code`、`/user/user-invitation/:code`、`/user/account`、`/user/termination-apply` |
| Home | `/` (重定向到 `/customers`) |
| 客户 | `/customers`、`/customers/:id`、`/customers/:id/sources/:sourceId` |
| 已绑卡 | `/registered-payment-methods`、`/registered-payment-methods/:sourceId` |
| 发票 | `/invoice` (重定向到 `/invoice/entries`)、`/invoice/entries`、`/invoice/entries/:id`、`/invoice/pending-invoices`、`/invoice/invoices`、`/invoice/invoices/:id` |
| 重收 | `/invoice-retry` (重定向到 `/invoice-retry/invoice-retry-snapshots`)、`/invoice-retry/invoice-retry-snapshots`、`/invoice-retry/invoice-retry-urls` |
| 洗单 | `/wash-request` (重定向到 `/wash-request/request`)、`/wash-request/request`、`/wash-request/result`、`/wash-request/result/:id` |
| 投递 | `/delivery` |
| 通知 | `/notice` (重定向到 `/notice/end-user`)、`/notice/end-user`、`/notice/end-user/:id/edit` |
| Team | `/team`、`/team/:id` |
| 设置 | `/settings/design`、`/settings/ip`、`/settings/api`、`/settings/webhook`、`/settings/webhook/:id` |
| 报表 | `/reports`、`/reports/:type` |
| 合约 | `/shop/contract-inquiry` |
| 申请 | `/apply` |
| 下载 | `/download` (隐藏菜单) |

### 4.3 Pay — `https://acq-pay.stg.elepay.dev`

工程: `ele-acq-web/packages/acq-pay` (Vue3 + `vite-plugin-mpa-plus`, 单入口 `index.html`)。
仅 4 个 path (来自 `src/router/routes.js`):

<!-- prettier-ignore -->
| 路径 | 说明 |
| --- | --- |
| `/codes/:code` | 支付二维码页 |
| `/invoice-retry/:invoiceScheduleId` | 重收发票页 |
| `/not-found` | 404 占位 |
| `/health` | 健康检查 |
