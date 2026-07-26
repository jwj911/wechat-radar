# 更新日志 (Changelog)

本项目的所有重要变更都会记录在本文件中。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

本轮工作聚焦项目基座：建立隔离依赖环境、盘点现状、产出路线图与协作文档。尚未打 tag 发布。

### 新增 (Added)

- 建立 pnpm 隔离依赖环境并完成验证：`install` / `lint` / `tsc` / `build` 全部通过（Node v25.2.1 + pnpm 10.33.2）。
- 产出 `docs/roadmap.md`：项目现状盘点 + 分阶段迭代路线图。
- 产出手绘风格架构图 `docs/assets/architecture.svg`。
- 新增本地 `AGENTS.md` 协作 / Agent 指南（已被 `.gitignore` 忽略，不入库）。
- 新增本 `CHANGELOG.md`。
- 引入 Vitest 单元测试基线（路线图 N2）：接入 `vitest`（devDependency）+ `vitest.config.ts`，新增 `pnpm test` / `pnpm test:watch` 脚本；首批 5 个测试文件、62 个用例覆盖 `range` / `group-classifier` / `message-links`（纯逻辑）与 `mentions` / `dashboard-intelligence`（内存 SQLite `:memory:` + `vi.mock` 隔离），可稳定复跑。
- 新增 GitHub Actions 最小 CI（路线图 N3）：`.github/workflows/ci.yml` 在 `push`(main) 与 `pull_request` 上运行 install → lint → tsc → test → build（Node 22 + pnpm 缓存）。

### 变更 (Changed)

- 更新 `README.md`：增补「依赖环境（隔离环境）」说明与 `docs/roadmap.md` 路线图入口。
- `pnpm-workspace.yaml` 新增 `onlyBuiltDependencies: [better-sqlite3]`，放行原生模块构建脚本，使 CI 的 `pnpm install --frozen-lockfile` 能完成 `better-sqlite3` 编译（否则测试无法加载 native binding）。
- 锁定运行环境（路线图 N4）：`package.json` 新增 `engines`（`node>=22`、`pnpm>=10`）与 `packageManager: pnpm@10.33.2`，`@types/node` 升至 `^22`（同步 `pnpm-lock.yaml`）；新增 `.nvmrc=22`；README 前置条件统一为 Node 22+（对齐 `lib/wx-image.ts` 依赖的 `fs.promises.glob`）。
- 去重（路线图 N5）：`app/api/ai-classify/route.ts` 复用 `lib/group-classifier.ts`，避免建议分类与系统自动归类规则漂移；新增 `scripts/demo-dataset.json`，让应用内 demo 播种与 `pnpm demo:seed` 共用分组、发送者和消息文本。

### 移除 (Removed)

- 删除无任何引用的 `components/NewGroupModal.tsx`。
- 移除源码零引用的 `next-themes` 依赖并同步 `pnpm-lock.yaml`。

### 修复 (Fixed)

- 新增 `app/api/topics/build/route.ts`（SSE 话题构建端点），修复话题雷达页面构建话题时 POST `/api/topics/build` 返回 404 的问题（路线图 N1）。

### 备注 (Notes)

- `better-sqlite3` 在 pnpm 10 下需运行 `pnpm approve-builds` 才会真正编译（pnpm 10 默认 gate 构建脚本，单独 `pnpm rebuild better-sqlite3` 可能为 no-op）。
- `wx-cli` 真实读取链路仅 macOS 可用；Windows / Linux 请用 demo 模式（`WECHAT_RADAR_DEMO=1`）体验 UI。
- 已识别的剩余待办（如部分配置项未生效、API 错误处理与可观测性等）详见 `docs/roadmap.md`；端点缺失、分类/demo 数据重复、未用依赖与 Node 版本不一致已在 N1-N5 中处理。

[Unreleased]: https://github.com/jwj911/wechat-radar/commits/main
