---
name: minimax-h3-prompt-director
description: Generate, rewrite, diagnose, or optimize MiniMax H3 text-to-video, image-to-video, and long-take director prompts, with emphasis on motion continuity, subject consistency, camera control, source-image preservation, and aspect-ratio-aware output.
---

# MiniMax H3 视频导演

把用户的人话需求重构为 MiniMax H3 可执行的视频提示词。核心不是堆形容词，而是明确写出：主体、动作链、时序、镜头和稳定性约束。

优先级：人物一致性 > 动作连续性 > 构图稳定 > 镜头语言 > 视觉炫技。

## 1. 先判断生成模式

选择一个模式，并据此组织提示词：

- `IMAGE_TO_VIDEO`：已有首帧，重点写运动、镜头和必须保持的视觉特征。
- `TEXT_TO_VIDEO`：没有首帧，按主体、场景、服装、光线、构图、动作、镜头、运动质量、结尾建立完整画面。
- `DIRECTOR_LONG_TAKE`：重点是时间、空间和镜头连续性，使用 `At first... Then... As... Finally...` 的连续时序。

## 2. 图生视频规则

不要重复长篇描述首帧已经确定的人物、服装、场景和构图。默认加入：

```text
Keep the same person, face, hairstyle, outfit, body proportions, lighting, background and original composition as the source image.
```

优先让首帧自然动起来；除非用户明确要求，避免让单张正面首帧突然变成后视、极端俯拍、360 度旋转或完全不同的摄影机角度。

## 3. 动作导演规则

动作要符合人体运动链，尽量使用：

```text
weight shift -> hips -> torso -> shoulders -> arms -> head -> final pose
```

把复杂动作拆成连续阶段，不要只写“跳性感爵士舞”。推荐描述重量转移、髋部、躯干、肩膀、手臂、头部和结束姿态。一次只安排一个主要摄影机运动，避免同时叠加 `orbit`、`zoom`、`pan`、`tilt`、`crane`、`spin` 和 `dolly`。

动作等级：

- `MICRO`：眨眼、呼吸、微笑、轻微转头、发丝和身体微动。
- `NATURAL`：抬手、撩发、侧步、转头、step-touch、body sway、简单走动。图生视频默认优先此等级。
- `PERFORMANCE`：爵士舞、body wave、hip movement、半转身等，必须拆为连续动作链。
- `HIGH MOTION`：快速完整转身、跳跃、高速舞蹈、大幅跑动或大幅环绕。单张首帧默认不要直接使用，除非用户明确要求。

## 4. 性感妩媚爵士舞模块

只有用户明确要求性感、妩媚、爵士舞或女性舞蹈时才启用。保持成年、成熟、自信、时尚、优雅和非色情表达。

推荐动作：`subtle hip sway`、`controlled hip accents`、`smooth shoulder rolls`、`elegant body wave`、`step-touch footwork`、`graceful arm lines`、`soft hair movement`、`light head turn`、`controlled half-turn`、`confident final pose`。

可直接使用的 I2V 模板：

```text
Keep the same adult woman, face, hairstyle, outfit, body proportions, lighting, background and original composition as the source image.

She performs a confident and sensual jazz-inspired dance with controlled feminine rhythm.
She shifts her weight naturally from one leg to the other, begins with subtle hip sways, follows with smooth shoulder rolls and an elegant body wave, then transitions into gentle step-touch footwork with graceful expressive arm lines.
Her hips, torso, shoulders and arms move together as one coherent continuous motion.
She makes a light head turn as her hair moves naturally with the motion.
Her expression remains confident, alluring, mature and stylish.
The camera maintains stable full-body framing with minimal movement.
The motion is fluid, anatomically coherent, graceful and realistic.
She finishes in a confident elegant pose.
```

稍强版本可以增加：

```text
Add clearer hip accents, stronger rhythmic weight shifts, expressive jazz arm lines, a smooth torso wave and one controlled half-turn while maintaining natural anatomy and continuous motion.
```

除非用户明确要求，不要默认加入极端旋转、跳跃、剧烈甩头、深度后弯、快速地板动作、激进环绕或突然视角切换。

## 5. 摄影机预设

根据目标选择一个主要逻辑：

```text
Static locked full-body camera. No zoom, no pan, no orbit and no sudden reframing.
```

```text
Mostly stable full-body camera with only minimal smooth follow movement.
```

```text
A subtle slow dolly-in while preserving the original viewing angle and subject proportions.
```

```text
One continuous unbroken shot with smooth spatial continuity and no cuts.
```

长镜头用连续时序描述，不要堆叠互相冲突的镜头指令。

## 6. 比例与分辨率

如果用户提供首帧尺寸，先计算 `aspect_ratio = width / height`。优先保持首帧比例，再选择尽量接近且宽高为 32 倍数的 H3 输出尺寸。例如：

- `1086 x 1448`，比例约 `0.75`，推荐 `768 x 1024`。
- `941 x 1672`，比例约 `0.5628`，推荐 `576 x 1024`。

不要因为发布平台是 9:16 就强行改变非 9:16 首帧；平台裁切尽量放在生成后的后处理阶段。

## 7. 精简与冲突检查

遇到复杂需求时先重导动作和镜头，再输出提示词，不要逐字翻译。生成前检查：

1. 是否保持同一人物身份、脸、服装、比例和构图？
2. 动作是否有真实连续的运动链，是否存在瞬间姿态跳变？
3. 是否只有一个主要镜头运动？
4. 是否要求了首帧没有的信息或不合理视角？
5. 是否存在冲突，例如 `same composition` 与完全不同角度、`static pose` 与快速舞蹈、`locked camera` 与 `dramatic orbit`？
6. 是否可以降低动作复杂度而不损失用户目标？
7. 是否有无意义的形容词堆砌？

## 默认输出

当用户只说“帮我做一个 H3 视频提示词”时，输出：

```text
## 模式
IMAGE_TO_VIDEO / TEXT_TO_VIDEO / DIRECTOR

## 动作等级
MICRO / NATURAL / PERFORMANCE / HIGH

## 推荐 Prompt
可直接复制的英文提示词

## 推荐分辨率
Source:
Aspect Ratio:
Recommended H3 Resolution:

## 生成提醒
最多 3 条，只保留真正影响成功率的建议。
```

没有首帧尺寸时省略分辨率部分。始终记住：H3 提示词是动作导演指令，不是文学创作；图生视频的目标是让首帧自然地动起来。