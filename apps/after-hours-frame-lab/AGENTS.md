# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   └── utils.ts        # 通用工具函数 (cn)
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**

---

# 九宫格废片写真生成器（Almost Perfect Nine）项目导航

## 模块地图（改 bug / 加功能先看这里）

| 关注点 | 文件 |
| --- | --- |
| 九格镜头表 / 人物·服装·场景·风格锚点 / 负面提示词 / 提示词拼装 | `src/lib/nine-grid/prompts.ts` |
| 类型、默认值、错误码联合 | `src/lib/nine-grid/types.ts` |
| 1080×1920、360×640、白缝、焦点 cover 几何（前后端同源） | `src/lib/nine-grid/geometry.ts` |
| API 入参 zod 契约、错误码→HTTP 状态 | `src/lib/nine-grid/api-contract.ts` |
| 浏览器 API 客户端（AbortController/超时/错误归一化） | `src/lib/nine-grid/client/api.ts` |
| Canvas 拼合、PNG 导出、单图 ZIP | `src/lib/nine-grid/client/compose.ts` |
| 生成状态机（并发=3、anchor、单格重生成、取消、断网） | `src/hooks/use-nine-grid-generator.ts` |
| provider adapter（仅服务端，密钥不出服务端） | `src/server/provider/image-provider.ts` |
| API：能力探测 / anchor / 单格 / 远程图代理（SSRF 白名单） | `src/app/api/{capabilities,anchor,frame,media}/route.ts` |
| 演示素材（固定 9 张，UI 带 DEMO 角标） | `public/demo/demo-1..9.jpg`、`src/lib/nine-grid/demo-manifest.ts` |
| 短片脚本/时间轴/93s 时长/70% 比例 | `src/lib/film/{script,timeline,types,package-docs}.ts` |
| 短片逐帧渲染（Ken Burns/事故特效/片头片尾/字幕/AI 标识/封面） | `src/lib/film/renderer.ts` |
| WebM 录制/封面/关键帧降级/投稿包 ZIP/能力探测 | `src/lib/film/exporter.ts` |
| 短片预览播放器（rAF/seek） | `src/hooks/use-film-player.ts` |
| 短片 UI（工作室/时间轴/导出面板/LibTV 复刻清单/门槛合规） | `src/components/film/*.tsx` |
| 短片纯逻辑测试 / 无头 UI 与导出 E2E | `tests/film.test.ts`、`tests/headless-film.mjs`、`tests/headless-export.mjs` |
| 夜幕实验室：类型/默认值 | `src/lib/after-hours/types.ts` |
| 夜幕实验室：五层词表 / 空间·时刻·人物·服装·场景·关系·整洁度 | `src/lib/after-hours/options-data.ts` |
| 夜幕实验室：合规词表与基准抽查 / 版本签名 / 引擎 / schema | `src/lib/after-hours/{safety,rules,compiler,engine,schema}.ts` |
| 夜幕实验室：可复现 RNG / 确定性指纹 / localStorage 状态层 | `src/lib/after-hours/rng.ts`、`fingerprint.ts`、`hooks/use-after-hours.ts` |
| 夜幕实验室：后端生成路由 / 能力探测 | `src/app/api/after-hours/route.ts`（`/api/capabilities` 复用） |
| 夜幕实验室：UI（五层面板/核对表/故事卡/历史收藏） | `src/components/after-hours/*.tsx` |
| 夜幕实验室：纯逻辑测试 | `tests/after-hours.test.ts` |

## 核心约束（不要破坏）

1. **九格顺序固定**：`frameDirectives` 数组 index 0-8 即左上→右下，事故 id 不重复，不允许前端重排。
2. **一格一事故**：新增镜头只改 `prompts.ts`，提示词中已显式禁止第二种缺陷。
3. **人物为明确成年虚构角色**：负面提示词固定包含 minor/teenager/child/school uniform/nudity 等，删减需谨慎。
4. **导出零 UI**：编号/标签/DEMO 角标只能出现在网页 DOM，`compose.ts` 只绘制图像素。
5. **真实生成与 demo 严格区分**：demo 返回 `/demo/*` 且 `mode:'demo'`；任何 API 失败必须返回 `{error}`，禁止返回伪造成功体。
6. **密钥不进客户端**：只允许在 `src/server/**` 使用 SDK；前端只调本项目 `/api/*`。
7. 几何数值修改后必须同时跑 `pnpm test:pure` 与 `pnpm exec tsx tests/compose-check.ts`。
8. 短片 9 镜必须与九格事故一一对应，默认 6+9×9+6=93s；本地 WebM 永远不得表述为「已满足 LibTV 70%」，70% 只能由用户在 LibTV 实际复刻并手动勾选体现；导出帧必须保留 AI 标识，禁止去水印功能。
9. 短片时长/脚本/提示词改动后跑 `pnpm test:pure`；改 `renderer.ts`/`exporter.ts` 后按需跑无头脚本 `tests/headless-film.mjs`、`tests/headless-export.mjs`（需本机 Chromium）。

## 常用命令

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` · `pnpm ts-check`
- `pnpm test:pure`（纯逻辑回归）
- `pnpm exec tsx tests/compose-check.ts`（sharp 合成回归，需 demo 素材）
