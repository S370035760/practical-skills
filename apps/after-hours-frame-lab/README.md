# 夜幕抓拍实验室 · AFTER HOURS FRAME LAB（含九宫格废片 · Almost Perfect Nine / 九宫格 · LibTV 短片投稿）

三种模式，顶部 Tab 切换：

0. **夜幕抓拍实验室 · AFTER HOURS FRAME LAB**：一套原创的**五层情境模型**（空间 → 时刻 → 人物 · 服装 · 场景 → 关系 · 整洁度 → 技术痕迹），把「深夜都市里的某个人在做什么」编译成一条完整稳定的摄影提示词，随机掷出 1 / 4 / 9 张同主题核对表。支持 seed、锁定一个/多个维度、换单变量不换主轴、最近 20 组去重、历史/收藏、故事卡（把已生成照片与五层设定串成一句小型叙事）、一键复制 Prompt、JSON 下载、Demo/Live 切换与失败重试。
1. **九宫格图片**：生成一张 **9:16 / 1080×1920 的 3×3 人像接触表**——同一位明确成年的虚构东亚女性、同一套衣服、同一间白色公寓，九张独立成像，每格只承载一种「差一点封神却失败」的摄影事故（拖影、闭眼、裁头、过曝、失焦、歪斜、仰拍、人太小、手挡镜头）。
2. **短片投稿模式 · LibTV**：把 9 张图在浏览器端做成 **93 秒竖屏剧情短片**（片头 6s + 9 镜 × 9s + 片尾 6s），逐镜绑定九种失败原因，Ken Burns 运镜 + 事故动态特效，可导出 **WebM / 封面 / 投稿包 ZIP**，并附逐镜头 LibTV 画布复刻清单与投稿自检。

九宫格模式要点：

- 人物始终美丽、可辨认、是同一人；失败只来自**拍摄时机 / 技术失误**，不是丑化。
- 九格位置与事故类型固定、不重复、不可互换。
- 编号与事故标签只存在于网页 UI，**绝不烧录进导出图**。
- 支持单格重生成（保留其余 8 格）、全部重生成、取消、整组 PNG 导出、9 张单图 ZIP 导出。
- 无登录、无付费、无数据库。

## 夜幕抓拍实验室 · AFTER HOURS FRAME LAB

主题是**「成年都市社交纪实影像方案生成器」**：不加戏剧转折，只捕捉城市入夜后某个空间里、某群人片刻的自在，核心是**情境规则**而非形容词堆砌。它输出结构化**拍摄故事卡 + 原创图像生成指令**。

### 五层情境模型（原创，禁止照搬第三方平铺变量池）

所有文案字段均为本项目原创撰写，未复制任何第三方素材；交付前按「连续保留不超过 12 个相同中文字符」约束自查。提示词由五层结构化锚点可解释地拼装（见 `src/lib/after-hours/`）：

1. **社交任务 TASK**：下班小聚 / 生日后半场 / 朋友重逢 / 桌游夜 / 商务散场 / 独处等候。
2. **时段叙事 PHASE**：刚到场 / 逐渐热闹 / 气氛高点 / 短暂安静 / 准备离开。
3. **空间气质 SPACE**：城市高层冷光 / 木饰面暖光 / 镜面过道 / 霓虹小包厢 / 安静吧台。
4. **人物瞬间 MOMENT**：接话 / 递物 / 找座位 / 望向窗外 / 笑到一半 / 整理袖口 等动作进行时。
5. **成像痕迹 TRACE**：手机 1x/0.5x、消费级数码、弱直闪、混合白平衡、高 ISO、轻微遮挡、非中心构图。

**横向维度**（同一组各卡共享）：成年人数量 1–6、社交关系、现场整洁度；**着装**按正式度/轮廓/材质/场合适配生成，禁止猎奇主题池。

### 情境规则引擎（纯函数，见 `rules.ts`）

- 商务散场 → 偏正式、着装克制、桌面整齐；桌游夜 → 才出现牌或骰子道具；独处等候 → 恒为 1 人；安静空间 → 中长焦与低人数优先；刚到场 → 站姿/进门/找座位；准备离开 → 更松弛、桌面可略凌乱但绝不表现失控或醉酒。
- 每组生成一张卡都会附带 `explainCompatibility` 的相容性说明（为什么这组变量成立）。
- 连续生成**避开最近 20 组指纹**；同一批 9 张**不得重复主要动作、主机位或时段**。

### 合规与安全边界（不可被随机逻辑移除）

- 所有人物**恒为 25 岁以上虚构成年人**；默认主体可为成年东亚女性，其他人只作正常社交中的朋友/同事/顾客/环境人物。
- 完整正常着装、自然骨骼体态；禁止未成年人、裸体、露骨性内容、色情暗示、偷拍叙事、毒品、暴力、胁迫、昏睡或失去判断力；可有饮料与举杯，但不强调醉酒。
- 上述内容写成 `safety block`（见 `safety.ts`），每条最终 prompt 末尾恒被注入，并有测试强制校验每条 prompt 都包含它。

### 失败不可伪装成功

任何 API 失败都返回结构化错误并在 UI 红字提示，绝不返回伪造成功体；无 COZE_API_TOKEN 时从安全门进**全功能 Demo**（纯本地，故事卡/换变量/历史收藏完整可用），结果带 demo 标记，绝不冒充「已真实生成」。Live 模式由前端把编译好的 prompt POST 到 `/api/after-hours`，复用 server-only provider adapter，**密钥绝不进入客户端**。

### 操作

- 先进「今晚想记录的感觉」情绪门，再进入生成台；生成张数：**单张 / 四张 / 九张**。
- **锁定维度**：五层中任一层的当前选值可锁定，其余层继续随机。
- **换单变量**：只重掷某一层，其余四层与主轴不动。
- **故事卡**：展示人物关系、刚发生什么、空间、时段、镜头痕迹与完整原创 prompt；可**生成影像 / 复制 Prompt / 下载 JSON**。
- 最近 20 组**历史**与**收藏**写入 localStorage；**seed 可复现**（同 seed+同锁定得到同一组故事卡与 prompt 文本）。

### 测试

`pnpm test:pure` 会追加运行 `tsx tests/after-hours.test.ts`（固定 seed、最近 20 组去重、九宫格主维度唯一、条件规则、人数 1–6、独处人数、每条 prompt 含 25+ 与安全块、JSON schema、无 Key Demo、换单变量）；浏览器端有 `tests/headless-afterhours.mjs` 覆盖桌面/手机宽度与连续 5 次生成差异。

## LibTV 短片投稿模式

- **时间轴**：片头钩子 6s（标题字幕）→ 9 个镜头各 9s（失败升级：拖影→闭眼→裁头→过曝→失焦→倾斜→仰角→人太小→手挡镜头）→ 片尾 6s（九宫格接触表收尾 + AI 标识）。默认总时长 **93s ≥ 90s 硬门槛**；可选每镜 8/9/10s，8s 方案会明确红色提示不足 90s。
- **逐帧渲染**（`src/lib/film/renderer.ts`，纯 Canvas 2D）：每镜轻微 Ken Burns 平移/缩放；并按事故类型叠加对应动态效果——闪光灯白闪（过曝/手挡镜）、方向拖影（motion blur / 手挡镜）、周期性眨眼黑弧、失焦整体模糊、8–12° 荷兰角、仰角轻微挤压、留白负空间、前景虚焦手掌遮幅；字幕最多两行。
- **WebM 导出**：`canvas.captureStream(30fps)` + `MediaRecorder`（优先 VP9，回退 VP8），**实时录制保证时长 = 时间轴**；无音频轨（不依赖版权音乐/付费服务）。每帧右下角保留「AI 生成 / DEMO」标识，**不提供任何去水印功能**。
- **MP4 说明**：浏览器 MediaRecorder 在 Chrome/Edge 通常只产出 WebM；如需 MP4，用 `ffmpeg -i in.webm -c copy out.mp4` 无损转封装（或剪辑软件导出）。页面在不支持录制的浏览器隐藏录制按钮并提供**关键帧 ZIP 降级**（片头 + 9 镜中点 + 片尾 PNG，可在剪映/PR 按每镜 9s 合成）。
- **投稿包 ZIP**：`短片 WebM + 1080×1920 封面 PNG + 投稿说明 README.txt（标题/简介/创作说明/标签/自检清单/70% 核对/合规声明）+ LibTV画布复刻清单.md（逐镜可粘贴提示词、时长、参考图用途、待生成/已生成状态）`。

### 70% LibTV 规则（不做虚假声明）

页面和投稿 README 都会明确：**本地用 Vibe Coding 生成的 WebM 样片不计入「70% 以上在 LibTV 生成」**。「LibTV 画布复刻清单」给出 9 段可直接粘贴的视频生成提示，每段可在「待在 LibTV 生成 / 已在 LibTV 生成」间勾选并 localStorage 持久化；只有勾选 ≥7/9（78%）时进度条才达标。LibTV 硬门槛卡片同时列出：≥90s 剧情短片、≥70% 镜头在 LibTV 生成、公开画布、社媒发布后提交链接。**本工具不会替你上传 LibTV 或提交活动表单。**

## 技术栈

Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 · shadcn/ui · 生图 provider `coze-coding-dev-sdk`（SeeDream）。

## 工作原理

不是「一条超长提示词出整张九宫格」，而是受控流水线：

1. **Identity anchor**：先按结构化锚点生成一张无事故的正面基准照。
2. **逐格锁定**：以 anchor 作为参考图（图生图）分别生成 9 张竖幅照片，配合结构化文本锚点，约束同一人 / 同一服装 / 同一场景。
3. **一格一事故**：每格提示词只注入 `frameDirectives[i]` 的单一事故描述（三档强度），并显式要求“不得出现第二种缺陷”。
4. **前端拼合**：Canvas 按固定顺序拼成 1080×1920（每格 360×640），可无缝或带窄白缝。
5. **单格重生成**：沿用同一 anchor / 参考图，仅改变该格动作与事故强度。
6. **Demo 模式**：无凭据时使用 `public/demo/` 内置素材完整验证 UI 与拼合/导出流程，结果明确标记 `DEMO`，且不会伪装成真实生成。

## 本地运行

```bash
pnpm install
pnpm dev          # http://localhost:5000
```

端口由沙箱通过 `DEPLOY_RUN_PORT` 注入；本地裸跑默认 Next.js 5000（见 scripts/dev.sh）。

## 配置生图 Provider

密钥**只在服务端使用，不进入浏览器包**，禁止写进前端代码。

- 平台沙箱：SDK 运行时自动注入凭据，开箱即用（`GET /api/capabilities` 返回 `live: true`）。
- 自托管：复制 `.env.example` 为 `.env.local` 并填写：

```bash
# Coze 个人访问令牌（PAT）或 OAuth Token
COZE_API_TOKEN=pat_xxxxxxxx
# OpenAPI 网关地址，默认 https://api.coze.cn
COZE_INTEGRATION_BASE_URL=https://api.coze.cn
```

能力边界（当前 provider）：

| 能力 | 支持情况 |
| --- | --- |
| 文生图 / 图生图（参考图锁人） | 支持（anchor 作为 `image` 参考输入） |
| 原生竖幅 | 支持，使用 1440×2560（9:16） |
| 去水印 | 支持（`watermark:false`） |
| 数值 seed 复现 | **不支持**，高级设置中的 seed 仅作为会话标记透传到提示词，不保证逐像素复现 |

也可在「高级设置」里粘贴任意 https 图片地址作为**自定身份参考图**，优先于自动 anchor。

## 演示模式（无凭据）

九宫格模式点击「使用演示素材」（或无凭据时自动进入）；短片模式点击「载入演示素材」。
内置 9 张固定素材，全部带 DEMO 标记，九宫格拼合、白缝、整图/单图导出，以及短片预览、时间轴、
WebM/封面/投稿包导出均可**在没有 API key 的情况下完整走通**。
Demo 素材仅用于验证流程，不代表真实一致性生成结果；用 Demo 导出的短片不可直接投稿，投稿 README 会显式标注。

## 如何在 LibTV 完成 70% 以上并公开画布（投稿路径）

1. 用本工具先在短片模式导出样片与「投稿包 ZIP」，通读其中的 `LibTV画布复刻清单.md`。
2. 在 LibTV 新建**公开画布**，按清单逐镜头粘贴 9 段提示词；每段指定时长（默认 9s），并把九宫格模式生成/导出的对应单图作为该镜头参考图（参考图用途已在清单逐条写明：人物/服装/场景锚定）。
3. 至少让 **7/9 个镜头的最终视频片段在 LibTV 内生成**（≥70%，建议 9/9 更稳）；在本工具清单勾选「已在 LibTV 生成」自检，进度条显示 ≥78% 才达标。片头/片尾字幕卡可用 LibTV 文本能力或本地片段，不计入镜头占比时仍以 9 镜头为分母保守计算。
4. 在 LibTV 公开画布合成整片（≥90s），按平台要求发布；再到活动入口提交**公开社媒视频链接 / 画布链接**。
5. 合规：角色设定为明确成年、服装非露骨；保留平台 AI 标识/水印；自行确认所用模型 / LoRA / 工作流的**商用许可**；不使用真实私人影像，不做去水印。

## 构建与启动（生产）

```bash
pnpm build
pnpm start
```

## 测试

```bash
pnpm test:pure       # 纯逻辑：after-hours 五层模型/指纹/去重/一致性 + 九宫格几何/提示词 + 短片时间轴/提示词/投稿文案/门槛（tsx，无浏览器）
pnpm exec tsx tests/compose-check.ts   # 用真实 demo 素材 + sharp 合成 1080x1920，校验尺寸与白缝像素
pnpm lint            # ESLint
pnpm ts-check        # tsc --noEmit

# 无头 Chromium 端到端（需要本机有 Chrome/Chromium + pnpm 存储中的 ws）：
node tests/headless-film.mjs <ws包路径> <chrome可执行文件> http://localhost:5000
node tests/headless-export.mjs <ws包路径> <chrome可执行文件> http://localhost:5000 /tmp/apn-dl
```

纯逻辑测试覆盖（`tests/after-hours.test.ts`）：

- 每个维度的词表非空，且**全部合规**（人物词条只含 25+ 成年虚构角色，无未成年/制服/裸体表述）。
- 五层随机组合：范围合法性、指纹可复现、`resolvePool` / `availableFor` / `explain` 结构一致。
- 确定性指纹：同 seed + 同选值 → 同一指纹；任一选值变化 → 指纹变化。
- 最近 20 组去重：重复指纹被替换，历史长度 ≤ 20。

纯逻辑测试覆盖（九宫格 + 短片）：

- 画布严格 1080×1920；无缝 360×640、白缝几何严格铺满不越界。
- 方形素材 cover 到 9:16 的焦点裁切。
- 九格编号连续、事故 id 不重复、每格三档强度文案齐备。
- 单格提示词包含身份/服装/事故/负面且引用正确格子；anchor 提示词无事故。
- 越界格子抛错。
- 短片默认 93s 时间轴（6+9×9+6）、段落首尾相接、9 镜严格绑定 9 事故、字幕 ≤2 行、LibTV 提示词含合规要素、8s 方案不达标、libRatio 7/9=78%、投稿 README 的 70%/DEMO/标签/合规文案、缺素材检测。

无头端到端（已在沙箱 Chromium 实测通过）：

- `headless-film.mjs`：Tab 切换、演示素材 9/9 载入、预览非黑帧、第 5 镜字幕像素、播放时间码推进、8s 门槛警告、复刻清单勾选 7/9·78% 与 localStorage 持久化。
- `headless-export.mjs`：真实点击导出 1080×1920 WebM，下载后 ffprobe 校验 VP9/分辨率，ffmpeg 无损 remux 读容器时长 ≥90s（MediaRecorder 直出 WebM 的 `duration` 元数据可能为 N/A，属正常现象，remux 后可读）。

> 说明：本项目未引入 Jest/Playwright 等重量框架。交互（取消、重试、导出）由类型系统、
> 纯逻辑测试、sharp 合成回归与基于 CDP 的无头脚本共同保障。

## 错误处理（不会把失败伪装成成功）

服务端把上游异常归一化为结构化错误码，前端逐格独立展示、单格失败不清空其他成功格：

`not_configured` · `timeout` · `rate_limited` · `content_policy` · `cancelled` · `network` · `bad_request` · `upstream` · `unknown`

- 超时：上游 90s，媒体代理 45s，可重试。
- 限流：指数退避由用户手动重试该格 / 整组。
- 内容审核：该格标记不可重试的拒绝，其余格继续。
- 取消：`AbortController` 中断进行中的请求，已完成格保留。
- 断网：监听 online/offline；Demo 素材仍可浏览导出。

## 目录结构

```
src/
  app/
    page.tsx                    # 页面（控制面板 + 九格 + 导出）
    api/
      capabilities/route.ts     # provider 能力探测
      anchor/route.ts           # 生成/返回 identity anchor
      frame/route.ts            # 生成单格（demo 直接返回内置素材）
      media/route.ts            # 远程图片同源代理（SSRF 白名单 + CORS）
  components/nine-grid/         # FrameCard / ControlPanel
  components/film/              # FilmStudio / FilmTimelineStrip / FilmExportPanel / LibChecklist / GatesPanel
  hooks/use-nine-grid-generator.ts  # 状态机：批量并发、单格重生成、取消、载入演示素材
  hooks/use-film-player.ts      # 短片预览播放器（rAF 时间轴、seek）
  lib/nine-grid/
    types.ts                    # 类型与默认值
    prompts.ts                  # identity/outfit/scene/style anchors + 9 frameDirectives + negative
    geometry.ts                 # 1080x1920 / 360x640 几何与焦点 cover
    api-contract.ts             # zod 入参契约 + 错误码→HTTP 状态
    demo-manifest.ts            # demo 素材清单
    client/api.ts               # 浏览器 API 客户端（超时/取消/错误归一化）
    client/compose.ts           # Canvas 拼合 + PNG / ZIP 导出
  lib/film/
    types.ts                    # 短片类型 / 导出 profile（1080p、540p）/ 门槛常量
    script.ts                   # 片名、9 镜头脚本（绑定事故 id/字幕/LibTV 提示词/参考图用途）、门槛、投稿自检
    timeline.ts                 # 时间轴构造、segmentAt、时间码、libRatio
    renderer.ts                 # 纯 Canvas2D：Ken Burns + 事故特效 + 片头片尾 + 字幕 + AI 标识 + 封面
    exporter.ts                 # MediaRecorder WebM、封面 PNG、关键帧 ZIP 降级、投稿包 ZIP、能力探测
    package-docs.ts             # 投稿 README 文案构造（纯字符串）
  server/provider/image-provider.ts  # provider adapter（server-only）
public/demo/demo-1..9.jpg       # 演示素材（九宫格与短片共用，短片 demo 无需 API key）
tests/                          # pure.test.ts / compose-check.ts / film.test.ts / headless-film.mjs / headless-export.mjs
```

## GitHub 同步建议

建议同步为 `S370035760/practical-skills` 仓库下的独立子目录：

```
apps/almost-perfect-nine/
```

仓库根可加 pnpm workspace；或直接把本目录全部内容拷入该子目录（`.coze`、`scripts/` 一并保留以便平台部署）。
注意：`.env.local` 已在 `.gitignore` 中，**不要提交任何令牌**；`.env.example` 只保留占位符。

## 合规说明

所有人物均为明确成年（22–27 岁）的虚构角色；画面为穿着完整的时尚人像，非露骨、非恋物化表达。
负面提示词固定排除未成年人、校服、裸露、夸张解剖结构与换身份/换服装等。

短片模式额外约束：

- 剧情为轻喜剧「朋友拍废片」，**不涉及真实私人偷拍**；故事与人物均虚构。
- 短片内保留「AI 生成」标识；Demo 素材额外标注 DEMO；产品**不提供去水印/移除标识功能**。
- 投稿前需自行确认 LibTV 平台条款、活动规则与所用模型 / LoRA / 工作流的商用授权。
- 本工具只生成样片与投稿材料，**不自动上传 LibTV、不代提交活动表单、不伪装 70% 已满足**。
