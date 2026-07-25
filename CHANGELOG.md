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

### 变更 (Changed)

- 更新 `README.md`：增补「依赖环境（隔离环境）」说明与 `docs/roadmap.md` 路线图入口。

### 修复 (Fixed)

- 新增 `app/api/topics/build/route.ts`（SSE 话题构建端点），修复话题雷达页面构建话题时 POST `/api/topics/build` 返回 404 的问题（路线图 N1）。

### 备注 (Notes)

- `better-sqlite3` 在 pnpm 10 下需运行 `pnpm approve-builds` 才会真正编译（pnpm 10 默认 gate 构建脚本，单独 `pnpm rebuild better-sqlite3` 可能为 no-op）。
- `wx-cli` 真实读取链路仅 macOS 可用；Windows / Linux 请用 demo 模式（`WECHAT_RADAR_DEMO=1`）体验 UI。
- 已识别的待办（如分类 / demo 播种逻辑重复、`next-themes` 已装未用、部分配置项未生效、Node 版本文档不一致等）详见 `docs/roadmap.md`；其中 `/api/topics/build` 端点缺失已于本轮修复（见「修复」）。

[Unreleased]: https://github.com/jwj911/wechat-radar/commits/main
