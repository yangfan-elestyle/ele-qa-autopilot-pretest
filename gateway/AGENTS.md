# gateway

- 转发下游前删入站 `X-Auth-User-Email` 再注入解析出的 email; 改鉴权链勿破坏此顺序, 否则可被伪造透传.
- bypass (`server.ts#isBypass`) 免鉴权供机器消费 (回调 / ingest / install), 勿在此加会阻断它们的校验.
- 不建 `public/`; favicon / PWA icon 由 `ele-autopilot/public/` 单一供给经 gateway 透传.
