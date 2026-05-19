# ele-autopilot/docs

离线参考资料目录, 供 Agent 在需要时检索 Bun / Ant Design 等权威摘录。根与项目代码仍是事实源.

## 使用顺序

- React Router v7 相关问题优先联网查官方 `https://reactrouter.com/`; 本目录当前无 RR7 镜像.
- Ant Design 优先读 `ant-design-llms.txt`; 需要完整细节再读 `ant-design-llms-full.txt`.
- Bun 优先读 `bun-llms.txt`; 需要完整细节再读 `bun-llms-full.txt`.
- 先 `rg` 定位关键词, 再只打开强相关小段; 不把 full 文档整段搬进上下文.
- 文档与代码冲突时, 以仓库代码与配置为准 (`react-router.config.ts`, `vite.config.ts`, `tsconfig.json`, `bun.lock`, `package.json`, `app/`).

## 维护

- 新增资料按 `*-llms.txt` + `*-llms-full.txt` 成对存放, 并在本文件补索引.
- 升级 Bun / Ant Design 大版本时同步更新资料, 避免版本差异误导实现.
