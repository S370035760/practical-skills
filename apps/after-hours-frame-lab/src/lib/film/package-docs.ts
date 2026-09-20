/**
 * 投稿包文档构造（纯字符串，无 DOM 依赖），供 ZIP 写入与测试。
 */
import { FILM_TITLE, SUBMISSION_CHECKLIST } from './script';
import { libRatio } from './timeline';
import type { SubmissionPackageMeta } from './types';

export function buildSubmissionReadme(meta: SubmissionPackageMeta): string {
  const ratio = libRatio(meta.libGeneratedShots);
  const ratioLine = ratio.passed
    ? `已在 LibTV 生成 ${ratio.done}/${ratio.total} 个镜头（约 ${ratio.percent}%），达到 ≥70% 门槛。`
    : `当前仅 ${ratio.done}/${ratio.total} 个镜头（约 ${ratio.percent}%）标记为在 LibTV 生成，未达到 ≥70% 门槛；本 WebM 是本地合成样片，投稿前必须在 LibTV 公开画布重新生成至少 7 个镜头。`;

  return [
    `# ${meta.title}`,
    '',
    '## 作品简介',
    meta.synopsis,
    '',
    '## 创作说明',
    meta.statement,
    '',
    '## 技术信息',
    `- 分辨率 / 帧率：${meta.resolution} / 30fps`,
    `- 封装格式：${meta.format}（浏览器 MediaRecorder 导出；如活动要求 MP4，请在剪辑软件中无损转封装）`,
    `- 音频：${meta.audio}`,
    `- 总时长：${meta.totalDuration} 秒（9 个镜头各 ${meta.shotDuration} 秒 + 片头片尾）`,
    `- 素材来源：${meta.sourceMode === 'demo' ? 'DEMO 演示素材（仅供流程验证，不得直接用于正式投稿）' : 'AI 图像模型实时生成 + 本地动态合成'}`,
    '',
    '## 标签',
    meta.tags.map((t) => `#${t}`).join(' '),
    '',
    '## LibTV 70% 规则核对',
    ratioLine,
    '',
    '## 投稿自检清单',
    ...SUBMISSION_CHECKLIST.map((item) => `- [ ] ${item.label}${item.required ? '（硬性）' : '（建议）'}`),
    '',
    '## 合规声明',
    '所有人物均为明确成年的虚构角色；画面全程着装、非露骨；不使用真实私人影像；',
    '保留 AI 生成标识，不提供也不使用去水印能力；投稿前需自行确认模型 / LoRA / 工作流的商用许可。',
    '',
  ].join('\n');
}

export function buildCoverCaption(): string {
  return [FILM_TITLE.title, '', FILM_TITLE.subtitle, ''].join('\n');
}

/** 安全文件名：移除路径与空白风险字符 */
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'almost-perfect-nine';
}
