# 网络 / VPC 链路 (autotesting ⇄ MeterSphere)

> 配套 [PLAN.md](./PLAN.md) §1.1 拆出. 解释 autotesting Worker 如何反向访问内网 MeterSphere, 以及与 harness 共用 cloudflared 的边界.

## 1. 背景

MeterSphere (`https://qa.elepay.link/`) 与 harness 一样是内网服务, 仅在 **ele-fly** (macOS 主机) 的 Tailscale 网络内可达:

- `qa.elepay.link` → `172.21.139.237` (Tailscale magicDNS `100.100.100.100`)
- HTTPS:443, 公共 CA 链, `verify_full` 通过
- 公网不可达, CF Worker 无 Tailscale 客户端, 唯一通路 = 经 ele-fly cloudflared

复用 harness 已有 Tunnel + cloudflared launchd, **不再起新 tunnel**, 只加一个 VPC service.

## 2. 拓扑

```
Browser (用户)
  ↓ HTTPS via gateway (CF Access SSO, @elestyle.jp)
ele-autotesting Worker (CF)
  └─ env.METERSPHERE (Workers VPC binding, remote) ──┐
                                                     ▼
                  VPC service                   Tunnel `ele-server`
                  metersphere-backend  ─────►   (67063b31-3703-4214-aed5-9febf3ba5576)
                  hostname=qa.elepay.link             ▼
                  https-port=443                cloudflared (ele-fly, launchd)
                  cert=verify_full                    │
                                                     ├─► 172.21.139.237:443 (MeterSphere)
                                                     └─► 127.0.0.1:3000 (docker agentic-loop, harness)
```

## 3. Cloudflare 资源

复用 harness account `2bb4268b402c5383dddf854f5feb463b`.

<!-- prettier-ignore -->
| 资源 | 名称 | ID | 说明 |
|---|---|---|---|
| Tunnel | `ele-server` | `67063b31-3703-4214-aed5-9febf3ba5576` | 已存在, cloudflared launchd 在 ele-fly 运行 |
| VPC service | `agentic-loop-backend` | `019e3fe7-f3c9-7842-9ecb-3218d81d430a` | 已有, 仅绑 harness Worker |
| VPC service | `metersphere-backend` | `019e45a0-58be-7323-b61d-72d7a2ed27e6` | **本次新建**, 给 autotesting Worker 用 |

创建命令 (一次性, 已执行):

```bash
npx wrangler vpc service create metersphere-backend \
  --type http --tunnel-id 67063b31-3703-4214-aed5-9febf3ba5576 \
  --hostname qa.elepay.link --https-port 443 \
  --cert-verification-mode verify_full
```

回滚: `npx wrangler vpc service delete 019e45a0-58be-7323-b61d-72d7a2ed27e6`.

## 4. autotesting Worker 接入

`ele-autotesting/packages/server/wrangler.jsonc` 增量:

```jsonc
"vpc_services": [
  { "binding": "METERSPHERE", "service_id": "019e45a0-58be-7323-b61d-72d7a2ed27e6", "remote": true }
]
```

改完跑 `bun run typegen` 同步 `worker-configuration.d.ts`.

Hono route 调用形态:

```ts
// VPC binding 仅把请求路由到对应的 cloudflared tunnel, **不会重写 URL hostname**.
// fetch URL 的 hostname 同时充当 TLS SNI + Host header, 必须等于真实 MS 域名;
// 写 'https://backend' 会被 ele-fly 上 nginx 拒绝 (TLSV1_ALERT_UNRECOGNIZED_NAME).
const upstream = await env.METERSPHERE.fetch(`https://qa.elepay.link${path}${qs}`, {
  method,
  headers: { ...forwardedHeaders, accept: 'application/json' },
  body,
})
```

## 5. MeterSphere Key 处理

- 用户在 autotesting Web 自行设置, 走与 `models` / `templates` 同套 D1 KV (`packages/server/src/routes/sync.ts`, owner 维度).
- **服务端不进 wrangler secret**, 不进环境变量.
- 调 MS 时按当前 `ownerId` 从 D1 取出, 透传到 MS Header (字段以实例为准, 通常 `MS-AUTHORIZATION` / `Authorization`).
- 加密 at rest 决策: D1 默认未加密; 若需要, 用 wrangler secret 作 KEK + envelope encrypt 写回. M1 再定.

## 6. 验收

autotesting 接入后跑:

```bash
cd ele-autotesting/packages/server
bun run typegen
bunx wrangler deploy --dry-run                              # 验 binding 解析

# deploy 后, 透过 gateway 公网入口
curl -fsS https://qa.<account>.workers.dev/autotest/api/ms/_smoke   # 200, body 含 MS health 或版本
```

烟雾路由 `/api/ms/_smoke` 内部仅 `env.METERSPHERE.fetch('https://backend/')`, 不带 MS Key, 期望 MS 返回登录页 200 (或 401, 任一非 502 即证明链路通).

## 7. 设计取舍

<!-- prettier-ignore -->
| 取舍 | 选择 | 理由 |
|---|---|---|
| Tunnel 数量 | 复用 `ele-server`, 不新建 | cloudflared launchd 已稳态, 一个 tunnel 多 VPC service 是官方推荐用法 |
| 目标定位 | `--hostname qa.elepay.link` 而非 `--ipv4 172.21.139.237` | cloudflared 在 ele-fly 走 Tailscale magicDNS 解析, 自动跟随 IP 变更; SNI / Host header 一致, TLS 验证更干净 |
| fetch URL hostname | 直接写真实 `https://qa.elepay.link/...`, **不要**写 placeholder | VPC binding 不改写 hostname; SNI / Host 来自 URL, 写 placeholder 会触发 TLSV1_ALERT_UNRECOGNIZED_NAME |
| TLS | `verify_full` | 公共 CA 链已签, 无需放宽 |
| harness 调用方 | 走公网 `https://harness.<account>.workers.dev` + CF Access service token, 不再创第三个 VPC service | autotesting Worker 经 harness Worker 入口能复用既有 CF Access + JWT 校验; 直连 `agentic-loop-backend` 会绕过权限层 |
| 与 harness 隔离 | 两个 VPC service binding 各自只绑到对应 Worker | autotesting Worker 拿不到 `agentic-loop-backend` binding, 不会误访 |
