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
