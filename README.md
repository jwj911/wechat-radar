# WeChat Radar

> 群太多，真正有价值的消息却总是被淹没。
> WeChat Radar turns noisy WeChat groups into a local-first intelligence dashboard.

[![CI](https://github.com/jwj911/wechat-radar/actions/workflows/ci.yml/badge.svg)](https://github.com/jwj911/wechat-radar/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/joeseesun/wechat-radar?style=social)](https://github.com/joeseesun/wechat-radar/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/joeseesun/wechat-radar?style=social)](https://github.com/joeseesun/wechat-radar/network/members)
[![Issues](https://img.shields.io/github/issues/joeseesun/wechat-radar)](https://github.com/joeseesun/wechat-radar/issues)
[![Last commit](https://img.shields.io/github/last-commit/joeseesun/wechat-radar)](https://github.com/joeseesun/wechat-radar/commits/main)
[![License: Non-commercial research](https://img.shields.io/badge/License-Non--commercial%20research-orange.svg)](LICENSE)

![WeChat Radar product preview](docs/assets/product-preview.svg)

**[中文](#中文) | [English](#english)**

> 重要：本项目仅供学习研究和个人非商业实验使用，禁止用于商业盈利。请先阅读 [免责声明](DISCLAIMER.md) 和 [许可证](LICENSE)。

---

<a name="中文"></a>

## 中文

WeChat Radar 是一个本地优先的微信群聊情报看板。它把群消息、话题、链接、@我的消息和高信号人物聚合成一个可按日期查看的工作台。

你得到的不是“聊天记录列表”，而是每天可以直接处理的情报：

- 今日优先看：消息、文章、工具、异动分区展示
- 话题雷达：用 Codex CLI 按天聚合跨群话题
- 链接情报：文章/工具资源去重，生成可读标题
- 群日报：每天活跃群可生成摘要报告，方便复制给 AI 继续处理
- 本地存储：聊天数据落到你自己的 SQLite，不上传到第三方服务
- 明暗主题：默认奶白色浅色主题，也支持深色模式

## 快速开始

```bash
git clone https://github.com/joeseesun/wechat-radar.git
cd wechat-radar
pnpm install
pnpm rebuild better-sqlite3
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。首次进入会跳到 `/setup`，按页面提示填写你的微信名、确认隐私说明，也可以先启用 demo 数据体验。

## 依赖环境（隔离环境）

Node.js 项目中，项目级的 `node_modules/` 目录**就是隔离依赖环境**，等价于 Python 的 venv——**无需也不应该**再创建 Python venv。

- 执行 `pnpm install` 后，依赖会被安装进项目级 `node_modules/`，由 `pnpm-lock.yaml` 锁定版本，不污染全局环境。
- 由于 pnpm 10 默认会 **gate（拦截）原生模块的构建脚本**，`better-sqlite3` 需要额外运行 `pnpm approve-builds` 批准构建（或在 `pnpm-workspace.yaml` 的 `onlyBuiltDependencies` 中允许）。构建脚本未被批准时，单独运行 `pnpm rebuild better-sqlite3` 可能是 no-op（不会真正编译）。
- **跨平台注意**：`wx-cli` 与真实微信读取仅 macOS 可用；Windows / Linux 建议用 demo 模式体验 UI，设置环境变量 `WECHAT_RADAR_DEMO=1` 即可。在 PowerShell 上：

  ```powershell
  $env:WECHAT_RADAR_DEMO=1; pnpm dev
  ```

## 开发与测试

常用脚本：`pnpm dev`（开发）、`pnpm build`（生产构建）、`pnpm lint`（ESLint）、`npx tsc --noEmit`（类型检查）。

单元测试基于 [Vitest](https://vitest.dev/)：

```bash
pnpm test        # 单次运行全部用例
pnpm test:watch  # 监听模式
```

首批用例覆盖 `lib/` 的核心纯逻辑（`range`、`group-classifier`、`message-links`）以及依赖 SQLite 的 `mentions`、`dashboard-intelligence`（后者用内存数据库 `:memory:` 隔离，无需真实微信数据，可跨平台稳定复跑）。

**持续集成（CI）**：`.github/workflows/ci.yml` 会在推送到 `main` 与提交 Pull Request 时自动运行 install → lint → tsc → test → build（ubuntu-latest，Node 22 + pnpm 缓存）。任一环节失败流水线即标红，可在仓库的 Actions 页查看结果。

## 前置条件

- [ ] macOS，且已登录微信 4.x
- [ ] 建议使用注册半年以上的小号或测试号，不建议直接使用主力微信号
- [ ] 已测试微信版本：`4.1.9.58`；不建议在更高版本上贸然测试
- [ ] Node.js 22+（本仓库以 `.nvmrc` 与 `package.json` 的 `engines` 锁定，`lib/wx-image.ts` 依赖 Node 22+ 的 `fs.promises.glob`）：`node --version`；用 nvm 可直接 `nvm use`
- [ ] pnpm 10+（`package.json` 的 `packageManager` 锁定为 `pnpm@10.33.2`）：`corepack enable && pnpm --version`
- [ ] wx-cli：`wx --version`
- [ ] wx daemon 正在运行：`wx daemon status`
- [ ] 如果要让话题聚合更好，安装并登录 Codex CLI：`codex --version`

wx-cli 可参考原项目安装与初始化：[jackwener/wx-cli](https://github.com/jackwener/wx-cli)。

## 配置

默认数据目录是 `~/.wechat-radar/`，不会写进项目目录。

你可以用环境变量覆盖：

```bash
cp .env.example .env.local
```

常用配置：

```bash
WECHAT_RADAR_DATA_DIR=~/.wechat-radar
WECHAT_RADAR_MY_NAMES=张三,San Zhang,zhangsan
WECHAT_RADAR_DEMO=0
WECHAT_RADAR_CODEX_MODEL=
```

也可以直接在 `/setup` 页面配置。配置会写入 `~/.wechat-radar/config.json`。

## 使用方式

1. 进入首页，选择日期或时间范围。
2. 点击“重扫”同步当前范围消息。
3. 点击“全量同步”拉取更长历史。
4. 打开“话题雷达”查看跨群主题。
5. 打开“链接情报”查看文章和工具资源。
6. 在活跃群列表点击“日报”查看单群日报。

你可以这样和 AI 配合：

- “把今天所有 Codex 相关话题整理成一篇博客大纲。”
- “复制这个群日报，帮我提炼值得回复的机会。”
- “把链接情报里的工具做成一张试用优先级表。”

## 数据与隐私

WeChat Radar 默认只在本机读写数据：

- `~/.wechat-radar/radar.db`：SQLite 主数据库
- `~/.wechat-radar/config.json`：本地配置
- `~/.wechat-radar/backups/`：可选备份

安全设计：

- wx-cli 调用使用 `child_process.execFile` 参数数组，不拼 shell
- SQLite 使用 prepared statements
- 页面只以 React 文本节点渲染聊天内容
- 不把微信密钥、会话、数据库、模型缓存提交进仓库

重要风险提示：

- 建议使用注册半年以上的小号或测试号，不建议使用主力微信号。
- 当前只建议读取历史聊天记录，用于本地检索、聚合和摘要。
- 不建议读取朋友圈，也不要自动点赞、评论、发消息、加好友、改资料或做任何写入/社交操作。
- 已测试通过的微信版本是 `4.1.9.58`；不建议在更高版本上贸然测试，版本变化可能带来不可预期的账号风险。
- 请确认你的使用方式符合微信客户端规则、当地法律、群成员隐私预期和你所在组织的合规要求。
- 不要把包含真实聊天内容的数据库或截图上传到公开仓库。

## 免责声明与禁止事项

本项目仅供学习研究、个人评估和非商业实验使用。禁止用于商业盈利，包括但不限于 SaaS、托管服务、付费报表、咨询交付、商业监控、线索挖掘、数据售卖、企业内部生产系统或任何直接/间接商业收益场景。

本项目与腾讯、微信、wx-cli 均无官方关联，未获得腾讯或微信授权、认可、赞助或背书。微信、WeChat、腾讯、Tencent 等名称和商标归其权利人所有。

用户需要自行承担安装、配置、运行、修改、部署、数据处理和传播行为的全部责任。因使用或误用本项目导致的账号限制、数据丢失、隐私泄露、商业损失、法律纠纷、平台处罚、服务中断、误判摘要或其它后果，项目作者和贡献者不承担责任。

完整条款见 [DISCLAIMER.md](DISCLAIMER.md) 和 [LICENSE](LICENSE)。

## 项目结构

```text
app/                 Next.js App Router 页面与 API
components/          看板、侧边栏、图表、消息渲染组件
lib/                 wx-cli 封装、SQLite、话题/链接聚合逻辑
scripts/             本地维护脚本
docs/assets/         README 图片与公开素材
```

> 项目现状盘点与迭代路线图见 [docs/roadmap.md](docs/roadmap.md)。

## 常见问题

| 问题 | 解决方法 |
| --- | --- |
| `wx daemon 未运行` | 先运行 `wx daemon start`，再刷新页面。 |
| `better-sqlite3` native 模块报错 | 运行 `pnpm rebuild better-sqlite3`。 |
| 首页没有数据 | 先完成 `/setup`，确认 `wx sessions --json` 有输出，然后点击“重扫”。 |
| 话题雷达为空 | 打开对应日期会自动构建；也可以点击“构建话题”。需要本机可运行 `codex`。 |
| 不想读取真实微信 | 在 `/setup` 勾选 demo 模式，或设置 `WECHAT_RADAR_DEMO=1`。 |

## 致谢

- [jackwener/wx-cli](https://github.com/jackwener/wx-cli)：本项目依赖它读取本机微信数据。
- [Next.js](https://nextjs.org/)、[ECharts](https://echarts.apache.org/)、[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)。

---

<a name="english"></a>

## English

WeChat Radar is a local-first intelligence dashboard for WeChat groups. It turns noisy group chats into daily briefings, cross-group topics, link intelligence, mentions, and per-group reports.

### Features

- Daily dashboard for messages, links, tools, anomalies, and people
- Codex CLI powered topic clustering by date
- Link intelligence with generated titles and deduplication
- Per-group daily reports with copy-friendly output
- Local SQLite storage by default
- Light and dark themes

### Install

```bash
git clone https://github.com/joeseesun/wechat-radar.git
cd wechat-radar
pnpm install
pnpm rebuild better-sqlite3
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The first run redirects to `/setup`, where you can configure your WeChat display names and privacy confirmation, or enable demo mode.

### Requirements

- [ ] macOS with WeChat 4.x logged in
- [ ] Prefer a secondary/test WeChat account that has existed for at least six months
- [ ] Tested WeChat version: `4.1.9.58`; newer versions are not recommended for unverified testing
- [ ] Node.js 22+ (locked via `.nvmrc` and `package.json` `engines`; `lib/wx-image.ts` relies on `fs.promises.glob` which needs Node 22+) — run `nvm use`
- [ ] pnpm 10+ (`packageManager` pinned to `pnpm@10.33.2`)
- [ ] wx-cli initialized and running
- [ ] Optional: Codex CLI for better topic/link summaries

### Privacy

By default, runtime data is stored locally under `~/.wechat-radar/`. The app does not upload your chat database. You are responsible for using it in a way that respects WeChat rules, local laws, group privacy expectations, and organizational compliance.

Safety guidance:

- Prefer a secondary or test WeChat account that has existed for at least six months.
- Use this project for read-only historical chat access.
- Do not use it for Moments, likes, comments, sending messages, adding friends, profile changes, or any other write/social action.
- The tested WeChat version is `4.1.9.58`; newer versions may carry unknown account risk and are not recommended for unverified testing.

### Troubleshooting

| Problem | Fix |
| --- | --- |
| wx daemon is not running | Run `wx daemon start`. |
| better-sqlite3 fails to load | Run `pnpm rebuild better-sqlite3`. |
| No dashboard data | Finish `/setup`, confirm `wx sessions --json` works, then click rescan. |
| Topic radar is empty | Open the date or click build topics; make sure `codex` is available. |

## License

Non-commercial research use only. See [LICENSE](LICENSE) and [DISCLAIMER.md](DISCLAIMER.md).
