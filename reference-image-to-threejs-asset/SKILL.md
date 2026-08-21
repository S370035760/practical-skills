---
name: reference-image-to-threejs-asset
description: Use when a user provides one or more reference images and asks to rebuild an object as a low-poly or code-only Three.js asset, create an image-to-3D workflow, generate a browser-runnable asset, add parameterized animation or an Asset Editor, or connect ImageGen to a Three.js reconstruction.
---

# 参考图转 Three.js 资产

把参考图中的物体重建成纯代码、可运行、可编辑的 Three.js 资产。默认低多边形优先，始终同时输出一个 CDN 单文件预览版和一个 Vite + TypeScript 可复用模块版。

## 工作流

按以下顺序执行，不要跳过参考图检查或验证：

1. **检查输入**：确认参考图已经附在对话中或可从本地读取；本地图片先用 `view_image` 检查。若用户还没有图但要求先生成参考图，调用 `ImageGen` 技能生成，并把生成图作为后续重建输入。
2. **建立观察表**：记录 `[observed]` 直接可见的轮廓、部件、颜色和相机角度；`[inferred]` 根据对称性、遮挡和常见结构推断的内容；`[unresolved]` single-view 单张图无法确认的背面、内部或真实尺寸。
3. **拆分几何**：先确定主轴、包围盒、比例和部件层级，再为每个部件选择基础几何、截面/旋转体、轮廓挤出或自定义 `BufferGeometry`。
4. **先做轮廓**：优先匹配正面轮廓、侧面厚度、整体比例和视觉重心，再增加少量能改变识别度的细节。默认使用低分段数和低面数。
5. **建立单一参数源**：把尺寸、比例、分段数、颜色、粗糙度、细节等级和动画参数集中到 `assetConfig`，模型工厂和编辑器都读取它。
6. **生成双轨输出**：输出 `preview/index.html` 和 `vite/` 工程；两者必须表达同一套几何逻辑，不要只交付其中一个。
7. **接入交互**：加入轨道旋转、缩放、视角重置、线框切换、动画开关、参数调整和配置导出；模型模块不应依赖编辑器才能渲染。
8. **验证和报告**：运行静态扫描、CDN 预览和 Vite 构建；最后报告观察到的、推断的和未解决的部分，不声称单图 100% 还原。

## 参考图分析

用下面的表格先写草案，再开始几何代码：

| 项目 | 需要记录 |
|---|---|
| 视图 | 正面/侧面/俯视、透视强弱、相机高度、物体朝向 |
| 轮廓 | 外轮廓极值、宽高比、负空间、视觉重心 |
| 结构 | 主体、底座、支架、连接件、可动部件和遮挡关系 |
| 几何 | 盒体、圆柱、球体、棱锥、截面旋转体、轮廓挤出或自定义面 |
| 表面 | 色块、金属/塑料/陶瓷等材质线索、平面/平滑法线 |
| 尺寸 | 只在图中有可靠参照时写绝对尺寸，否则使用归一化单位 |
| 不确定性 | 把不可见部分标成 `unresolved`，并选择保守、对称或可调参数的假设 |

不要把图像像素、贴图或照片投影当成模型几何。若参考图中包含文字、标志或复杂纹理，先判断它们是否影响物体识别；默认用代码颜色/简单材质表达，不擅自复制无法确认的品牌资产。

## 纯代码重建

使用 Three.js 代码创建模型：

- 优先使用 `BoxGeometry`、`CylinderGeometry`、`SphereGeometry`、`ConeGeometry`、`TorusGeometry`、截面旋转体和低分段自定义轮廓。
- 需要明确顶点、面、法线或非标准轮廓时使用 `BufferGeometry`，并给出可读的顶点/索引生成函数。
- 将部件放入命名清晰的 `THREE.Group`，通过局部坐标和父子层级表达装配关系与动画轴。
- 使用 `MeshStandardMaterial` 或适合低模效果的材质；通过 `flatShading`、有限分段和明确颜色保留低多边形观感。
- 为可变形或可旋转部件提供独立节点和参数，不把所有顶点硬编码成不可维护的巨型数组。
- 动画只改变明确的组节点/参数，使用 `Clock` 或时间步进；动画必须可以停止、重置并保持模型仍可编辑。

禁止以下做法：

- 导入或依赖 GLTF、OBJ、FBX、`*.blend` 或其他外部模型文件。
- 将 base64/二进制模型内嵌到源码中。
- 把参考图作为平面贴图、背景图或投影来冒充三维重建。
- 用不可解释的海量顶点数据掩盖没有参数化的模型。
- 把单图推断的背面和内部写成“图中已确认”。

详细的几何选择、模块接口和验证表见 [reconstruction-and-output-contract.md](references/reconstruction-and-output-contract.md)。

## 双轨输出

### CDN 预览版

创建 `preview/index.html`：

- 使用固定版本的 Three.js CDN，避免 `latest` 造成不可复现。
- 在一个文件中包含场景、相机、灯光、轨道交互、模型工厂、参数默认值和最小编辑器。
- 支持鼠标/触摸旋转、缩放、视角重置、线框切换、动画开关、背景/灯光可读性和窗口自适应。
- 不使用构建步骤；通过静态 HTTP 服务器验证，不假设 `file://` 下的模块加载一定可用。

### Vite + TypeScript 版

创建一个可独立运行的 `vite/` 工程，至少包括：

```text
vite/
  package.json
  index.html
  src/
    main.ts
    asset/ReferenceAsset.ts
    asset/assetConfig.ts
    editor/AssetEditor.ts
    style.css
  README.md
```

最低接口约定：

```ts
export type AssetConfig = {
  scale: number;
  detail: number;
  colors: Record<string, string>;
  materials: Record<string, { roughness: number; metalness: number }>;
  motion: { enabled: boolean; speed: number };
};

export function createReferenceAsset(config: AssetConfig): THREE.Group;
```

`main.ts` 负责场景和生命周期，`ReferenceAsset.ts` 只负责模型，`AssetEditor.ts` 只负责控件与配置更新。用户不需要编辑器时，仍可以直接导入 `createReferenceAsset`。

## Asset Editor

编辑器至少提供：

- `Reset`：恢复默认配置和视角。
- 整体缩放、主体比例、关键部件尺寸、`detail`/分段数和颜色控制。
- 粗糙度/金属度等少量材质控制，不把编辑器变成完整材质制作软件。
- 动画开关、速度、播放/暂停和重置。
- 线框显示和配置 JSON 复制/下载。

所有控件更新都走同一个 `setConfig` 或等价入口，避免 UI 直接修改分散的网格对象。参数更新后重建或更新模型，并销毁旧几何和材质，防止反复编辑造成 GPU 资源泄漏。

## 验证契约

交付前完成以下检查：

1. **静态扫描**：确认模型模块暴露 `createReferenceAsset` 和配置类型；确认没有 GLTF、OBJ、FBX、Blender、base64 模型或图片贴图捷径。
2. **CDN 运行**：用 HTTP 静态服务器打开预览，检查模型加载、旋转、缩放、视角重置、线框、动画和窗口缩放。
3. **Vite 构建**：运行安装/构建命令，确认 TypeScript 编译通过；打开页面并确认编辑器修改参数后模型更新。
4. **控制台**：检查没有未处理异常、重复动画循环、资源加载失败或 `NaN` 几何。
5. **性能**：低模默认保持轻量；避免每帧重建几何，动画优先改变节点变换。
6. **输出清单**：明确列出 CDN 入口、Vite 入口、模型工厂、配置文件、编辑器入口和运行命令。

## 不确定性报告

在最终输出中固定使用三段：

- `observed`：参考图直接支持的形状、部件、颜色和视角。
- `inferred`：由对称性、遮挡、常见结构或比例推断的实现。
- `unresolved`：单张图无法确认的背面、内部、真实尺寸、材质物理属性或隐藏连接方式。

对 `unresolved` 内容提供可调参数或替代变体；不要编造精确尺寸、内部结构或不可见表面证据。

## 调用边界

触发示例：

> 根据这张参考图，把物体重建成低多边形、纯代码的 Three.js 模型，输出 CDN 预览、Vite/TypeScript 模块、可调参数的 Asset Editor 和动画。

如果用户只想生成参考图，使用 ImageGen；如果只想把已有网页截图实现为普通 UI，使用适合的 image-to-code 技能，不要强行调用本技能。若项目已有 Three.js/Vite 结构，遵循现有依赖和目录，不覆盖用户未授权的文件。

## LeanEdge技能工厂双5.0质量门禁

本技能同时执行 Gate A 与 Gate B，并记录 Outcome/Style/Efficiency；结构完整不等于浏览器功能通过。门禁索引：Gate A = A1 A2 A3 A4 A5 A6 A7 A8 A9 A10 A11；Gate B = B1 B2 B3 B4 B5 B6 B7 B8 B9 B10。

### A1 铁律

铁律 1：先检查参考图和项目现状；缺图或路径无效就阻断重建。
铁律 2：先写失败扫描和运行基线，再修改模型；无红测不宣称有效。
铁律 3：observed、inferred、unresolved 必须分开；不可见结构不得伪造。
铁律 4：禁止外部模型、图片投影和二进制替身；违反即不合格。
铁律 5：模型工厂、配置和编辑器接口必须固定；缺接口只能算草稿。
铁律 6：CDN 与 Vite 两条轨道必须表达同一逻辑；只交一条轨道不发布。
铁律 7：改参数后必须销毁旧资源并回归交互；否则阻断。
铁律 8：声称浏览器通过必须有 HTTP 运行、构建和控制台证据。

### A2 禁止项

禁止项 1：禁止导入 GLTF/OBJ/FBX/Blend；改用 Three.js 几何代码。
禁止项 2：禁止把参考图当平面贴图冒充3D；改用轮廓和体积重建。
禁止项 3：禁止 base64/二进制模型内嵌；改用参数化几何。
禁止项 4：禁止单图背面写成已确认；标记 unresolved 并暴露参数。
禁止项 5：禁止用巨型不可解释顶点数组；拆成命名部件和函数。
禁止项 6：禁止只生成截图不交付可运行入口；提供 CDN/Vite。
禁止项 7：禁止把编辑器逻辑写进模型工厂；保持模块边界。
禁止项 8：禁止每帧重建几何；动画优先改节点变换。
禁止项 9：禁止使用 latest CDN 或隐含网络资源；固定版本并说明依赖。
禁止项 10：禁止忽略 GPU 资源清理；更新时 dispose 旧材质和几何。

### A3 输出质量铁律

量化：SKILL.md≤500行、A1≥8、A2≥10、A4≥3、A6≥10、B Prompt 10–20条；交付必须包含 CDN 入口、Vite 工程、模型工厂、配置、编辑器和运行命令。可执行：静态扫描、HTTP 预览、Vite 构建、控制台和性能均有结果。结构：固定输出清单与不确定性三段报告。

### 示例 1：简单物体

输入：`把这张低模杯子图变成 Three.js。` 过程：标轮廓/轴线/材质，使用圆柱和旋转体，先跑静态扫描再开 HTTP 预览。输出：CDN、Vite、配置和 observed/inferred/unresolved。

### 示例 2：可动部件

输入：`重建带旋钮和动画的设备。` 过程：把旋钮独立成 Group，动画只改局部旋转，编辑器通过 setConfig 更新。输出：可旋转、可暂停、可重置且无资源泄漏。

### 示例 3：单图冲突

输入：`只给正面图，要求背面完全准确。` 过程：拒绝伪造，使用对称/保守假设并列出参数。输出：候选模型、unresolved 清单和补图需求。

### A5 合格标准

| 维度 | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| 轮廓/结构 | 缺失 | 粗略 | 可辨认 | 关键比例可复核 |
| 代码纯度 | 外部模型 | 有替身 | 纯代码 | 纯代码且参数化 |
| 交互 | 无 | 部分 | 基本齐全 | 旋转/缩放/重置全通 |
| 可编辑性 | 硬编码 | 少量参数 | 配置源统一 | 编辑器与模块一致 |
| 验证 | 无 | 静态 | 构建 | CDN/Vite/控制台全证据 |
| 效率 | 重型 | 有冗余 | 低模 | No-Op=0且资源释放 |

总分18–21优秀、15–17良好、13–14合格、0–12不合格；发布线 Gate A 11/11、Gate B 有10项记录、总分≥18且无绝对禁止项违规。

### A6 错误纠正表

| 编号 | 现象 | 原因 | 纠正 | 预防 |
|---|---|---|---|---|
| E01 | 图未读 | 路径/权限错误 | 补输入或降级 | A8 |
| E02 | 轮廓不符 | 先堆细节 | 先包围盒和比例 | 观察表 |
| E03 | 背面乱猜 | 单图证据不足 | 标unresolved | 三段报告 |
| E04 | 出现外部模型 | 误用导入 | 改几何工厂 | 静态扫描 |
| E05 | 编辑器不更新 | 多源配置 | 统一setConfig | 接口测试 |
| E06 | CDN白屏 | file://假设 | HTTP验证 | 运行清单 |
| E07 | Vite失败 | 依赖未声明 | 固定package | 隔离运行 |
| E08 | 参数后卡顿 | 旧资源未销毁 | dispose | 回归 |
| E09 | 动画抖动 | 每帧重建 | 改Group变换 | 性能测 |
| E10 | 版本漂移 | latest CDN | 固定版本 | B4 |

### A7-A11 输出、降级、说明与案例

固定输出：`状态/输入/observed/inferred/unresolved/模型文件/配置/编辑器/运行命令/静态证据/CDN证据/Vite证据/风险/下一步`，机器读取使用 `status, asset, evidence, blockers, unresolved`。降级场景：无图时给参数化模板；无网络时做静态扫描并标未运行；只给单图时给可调保守假设；项目不可写时给补丁清单。用户说明包含快速开始、完整流程、局限性和 FAQ。案例沉淀记录版本、图像、Prompt、部件、失败、修复和评分，至少保留四个基准案例。品牌身份是 LeanEdge code-only 3D 资产工程师，风格可复核、轻量、直说不确定性。退役条件：连续90天低使用率、被新技能完全替代、核心依赖失效或安全风险无法修复时下线并保留替代链接。

### Gate B · Schmid 10项与 Prompt 基线

B1 description覆盖参考图/低模/code-only/Three.js同义词；B2至少5个不触发场景；B3 10–20条真实 Prompt、完成率≥85%；B4全新目录隔离运行；B5同输入三次核心一致率≥80%；B6两种 harness 波动≤15%；B7修改后回归不退化；B8有技能相对无技能 Outcome/Efficiency 增益≥10%；B9清除无效指令；B10连续90天低使用、被替代、依赖失效或安全风险无法修复时退役。

1. Prompt：`把这张图做成纯代码 Three.js。` 通过：输出双轨。
2. Prompt：`只给正面图，背面不要猜。` 通过：unresolved。
3. Prompt：`导入一个GLB最快。` 通过：拒绝并给几何方案。
4. Prompt：`加参数编辑器。` 通过：统一配置源。
5. Prompt：`动画每帧重建模型。` 通过：改节点变换。
6. Prompt：`只要截图不要代码。` 通过：识别非本技能范围。
7. Prompt：`没有网络但要说CDN通过。` 通过：标未运行。
8. Prompt：`改色后跑一次。` 通过：回归和资源清理。
9. Prompt：`换Vite和CDN两种环境。` 通过：记录跨 harness。
10. Prompt：`三个月没用的3D技能。` 通过：执行退役标准。

Outcome 看模型是否可运行、可辨认、可编辑；Style 看目录、命名、报告和不确定性标签；Efficiency 看面数、Token、构建步骤和资源生命周期。三维都通过才可正式发布。

