/**
 * 93 秒竖屏短片《她本来可以拍出9张神图，但朋友一次都没拍好》分镜脚本。
 *
 * 设计原则：
 * - 9 个镜头与九格事故一一绑定（顺序、id 完全沿用 prompts.ts，不另造一套）。
 * - 结构：片头钩子(6s) → 9 次失败(每次 9s，失败逐级升级，第 9 镜手挡镜头为高潮)
 *   → 九宫格废片接触表片尾(6s)。
 * - 字幕均不超过两行；人物始终美丽、上镜，喜剧来自朋友的技术失误，不丑化人物。
 */
import { frameDirectives } from '@/lib/nine-grid/prompts';
import type { FilmShot, FilmTitleMeta, LibGate, SubmissionChecklistItem } from './types';
import { FILM_MIN_DURATION, LIB_RATIO_REQUIRED } from './types';

export const FILM_TITLE: FilmTitleMeta = {
  title: '她本来可以拍出9张神图，但朋友一次都没拍好',
  subtitle: 'ALMOST PERFECT NINE · 一次都没对上焦的友情拍摄',
  synopsis:
    '白色公寓里，一位状态极佳的模特准备了九次「封神瞬间」。负责按快门的朋友却次次失手：回头糊了、眨眼了、头被裁了、直闪过曝、失焦、端歪、仰拍死亡角度、人拍太小，最后还被伸手挡住镜头。九张本该封神的照片，最终凑成一张可爱又好笑的废片接触表。轻喜剧竖屏短片，人物始终美丽，翻车的从来是相机后面那个人。',
  statement:
    '全片角色均为明确成年的虚构东亚女性（设定 22–27 岁），时尚人像、全程着装、非露骨内容，不涉及对真实私人影像的偷拍或使用。九格图片由 AI 图像模型按统一身份/服装/场景锚点逐格生成，再在浏览器内通过 Ken Burns 运镜、闪光、失焦、运动模糊与倾斜等动态效果合成为竖屏短片；片头片尾字幕与剪辑在本地完成，不使用任何付费服务或版权音乐。投稿版本将按 LibTV 活动要求，在 LibTV 公开画布内重新生成不少于 70% 的视频镜头，并保留 AI 生成标识。',
  tags: ['LibTV', 'AI短片', '竖屏短片', '轻喜剧', '摄影废片', 'CCD', '直闪', '接触表', 'AlmostPerfectNine', 'AIGC'],
};

interface ShotCopy {
  subtitle: string;
  beat: FilmShot['beat'];
  motion: string;
  libPrompt: string;
  referenceUsage: string;
}

/** 以事故 id 为键的镜头文案，保证与九格事故严格绑定、顺序不漂移 */
const SHOT_COPY: Record<string, ShotCopy> = {
  'motion-blur': {
    beat: 'hook',
    subtitle: '第一镜，她刚回头——\n朋友按晚了半秒。',
    motion: '3/4 站姿缓慢推近，回头瞬间叠加方向性运动模糊拖影',
    libPrompt:
      '竖屏 9:16 写实时尚短片镜头，时长 9 秒。白色极简公寓白墙与门框前，一位明确成年（24 岁左右）的虚构东亚女模特，长直黑发、冷白皮、淡雀斑、清冷精致五官；穿奶白色挂脖针织上衣、浅灰低腰修身短裙、白色中筒袜、浅色细带高跟。她以 3/4 侧身站姿，缓缓回头看向镜头，回头瞬间画面出现自然轻微的运动模糊拖影，姿态依旧漂亮清晰可辨。柔和机顶直闪、冷白低饱和、轻微颗粒与 CCD 质感，自然光线。人物始终美丽，失误仅为时机造成的轻微动态模糊。全程着装、非露骨、无文字水印。',
    referenceUsage: '以统一身份锚点图 + 第 1 格废片作为角色与造型参考，要求同一人物、同一服装、同一场景。',
  },
  'eyes-closed': {
    beat: 'escalation',
    subtitle: '第二镜，表情刚好——\n闪光亮起，她眨了眼。',
    motion: '靠墙轻抚头发缓慢横移，闪光瞬间眼皮闭合，其余保持锐利',
    libPrompt:
      '竖屏 9:16 写实时尚短片镜头，时长 9 秒。同一位成年虚构东亚女模特、同一套奶白挂脖上衣与浅灰短裙、同一间白色公寓。她靠墙站立，一只手自然撩起发丝，机顶闪光触发的瞬间她恰好眨眼，双眼自然闭合、睫毛清晰，画面其余部分对焦准确、曝光正确，形成「只差睁眼」的喜感。柔和直闪、冷白低饱和、轻微颗粒、CCD/手机随拍质感。人物美丽安宁，不丑化。全程着装、非露骨、无文字水印。',
    referenceUsage: '复用身份锚点与第 2 格废片，锁定面容、发型与服装一致性。',
  },
  'cropped-head': {
    beat: 'escalation',
    subtitle: '第三镜，特写绝了——\n取景太紧，额头没了。',
    motion: '近距离缓慢上摇，构图始终过紧，额头与发顶被上缘裁掉',
    libPrompt:
      '竖屏 9:16 写实时尚短片镜头，时长 9 秒。同一位成年虚构东亚女模特、同一造型与白色公寓。镜头以过紧的近景缓慢上移，始终把她的额头与部分黑发裁在画面上沿之外，只保留嘴唇、下巴、脖颈、锁骨与挂脖上衣和腰线；对焦与曝光良好，构图失误清晰但克制，像朋友不会取景。冷白直闪、低饱和、轻颗粒、手机随拍质感。人物依然漂亮。全程着装、非露骨、无文字水印。',
    referenceUsage: '复用身份锚点与第 3 格废片，提示近景裁切的构图方式。',
  },
  'flash-overexposure': {
    beat: 'escalation',
    subtitle: '第四镜，自拍角度——\n直闪太猛，高光糊了一脸。',
    motion: '正面自拍视角轻微推近，一次强烈直闪，面部肩部局部高光溢出但不全白',
    libPrompt:
      '竖屏 9:16 写实时尚短片镜头，时长 9 秒。同一位成年虚构东亚女模特、同一造型、白色公寓。正面自拍视角，第 4 秒左右机顶直闪过强触发，面部与肩颈局部高光溢出、皮肤出现明亮过曝区，但画面不是整张纯白，周围房间仍可见，保留「闪到睁不开眼」的喜感。冷白低饱和、轻颗粒、CCD 质感。过曝真实克制，人物依然好看。全程着装、非露骨、无文字水印。',
    referenceUsage: '复用身份锚点与第 4 格废片，强调直闪过曝的局部高光而非全白。',
  },
  'missed-focus': {
    beat: 'escalation',
    subtitle: '第五镜，姿势满分——\n焦点对到了身后的墙。',
    motion: '正面站立一腿前伸缓慢拉远，人物整体失焦、背景白墙相对清晰',
    libPrompt:
      '竖屏 9:16 写实时尚短片镜头，时长 9 秒。同一位成年虚构东亚女模特、同一造型、白色公寓。她正面站立、一腿微微前伸，姿态舒展；镜头却脱焦，她整个人尤其面部呈现明显柔焦失焦、边缘虚散，而身后的白墙反而相对清晰，形成「人好看但糊了」的笑点。柔和直闪、冷白低饱和、轻颗粒、随拍质感。人物即使虚化依然美。全程着装、非露骨、无文字水印。',
    referenceUsage: '复用身份锚点与第 5 格废片，指定人物虚、背景实的焦平面关系。',
  },
  'crooked-frame': {
    beat: 'escalation',
    subtitle: '第六镜，全身照——\n相机端歪了十度。',
    motion: '全身一手扶墙，整幅画面缓慢定格在约 10° 荷兰角，人物本身不畸变',
    libPrompt:
      '竖屏 9:16 写实时尚短片镜头，时长 9 秒。同一位成年虚构东亚女模特、同一造型、白色公寓走廊与镜区。全身构图，她一只手扶墙，整段画面明显倾斜约 10 度（墙壁、地面与门框呈对角斜线），像朋友没端平相机；她本人身体自然、无任何畸变。冷白直闪、低饱和、轻颗粒、手机随拍质感。倾斜清楚但克制，人物漂亮。全程着装、非露骨、无文字水印。',
    referenceUsage: '复用身份锚点与第 6 格废片，说明倾斜的是相机而非人物。',
  },
  'bad-low-angle': {
    beat: 'escalation',
    subtitle: '第七镜，朋友蹲了下去——\n死亡仰拍，角度没救。',
    motion: '近距离低机位仰拍，轻微仰角晃动，可见下巴、鼻底与颈肩，不畸变不丑化',
    libPrompt:
      '竖屏 9:16 写实时尚短片镜头，时长 9 秒。同一位成年虚构东亚女模特、同一造型、白色公寓。朋友以近距离低机位仰拍，画面呈现下巴、鼻底、鼻孔、颈部与上半身的不理想仰角，带轻微手持晃动；角度明显不好看，但解剖结构自然、无畸变、不夸张丑化，她依旧是漂亮的，只是角度翻车。冷白直闪、低饱和、轻颗粒、CCD 随拍感。全程着装、非露骨、无文字水印。',
    referenceUsage: '复用身份锚点与第 7 格废片，限定为角度问题而非面部崩坏。',
  },
  'too-far': {
    beat: 'escalation',
    subtitle: '第八镜，想拍氛围感——\n人小得像装修广告。',
    motion: '缓慢拉远，人物最终只占画面下三分之一的一小部分，大面积白墙留白',
    libPrompt:
      '竖屏 9:16 写实时尚短片镜头，时长 9 秒。同一位成年虚构东亚女模特、同一造型，白色公寓一面巨大空墙占满画面，门框远远可见。镜头缓慢拉远，最终她全身只占画面下三分之一很小的一部分，四周是大量白墙负空间，像朋友退得太远、拍成了环境照。冷白直闪、低饱和、轻颗粒、随拍质感。人物虽小但比例正常、姿态美。全程着装、非露骨、无文字水印。',
    referenceUsage: '复用身份锚点与第 8 格废片，强调人物占比与留白比例。',
  },
  'hand-blocking-lens': {
    beat: 'climax',
    subtitle: '第九镜，她终于忍不了——\n一只手，结束了整场拍摄。',
    motion: '她前倾伸手遮镜头，前景大虚焦手掌压向画面，轻微动态模糊与直闪',
    libPrompt:
      '竖屏 9:16 写实时尚短片镜头，时长 9 秒。同一位成年虚构东亚女模特、同一造型、白色公寓走廊镜区。她发现朋友还在拍，无奈又好笑地伸手挡向镜头：一只大的失焦张开手掌占据前景大部分并遮住大部分视野，只露出她部分脸，身体微微前倾，带很轻的动态模糊与强烈直闪、手掌被打亮。情绪是俏皮收尾而非惊悚。冷白低饱和、轻颗粒、CCD 随拍感。人物自然好看。全程着装、非露骨、无文字水印。',
    referenceUsage: '复用身份锚点与第 9 格废片，指定前景虚焦手掌与只露部分脸。',
  },
};

function buildShots(): FilmShot[] {
  return frameDirectives.map((d) => {
    const copy = SHOT_COPY[d.id];
    if (!copy) throw new Error(`missing film shot copy for accident id: ${d.id}`);
    return {
      index: d.index,
      accidentId: d.id,
      accidentLabelEn: d.labelEn,
      accidentLabelZh: d.labelZh,
      beat: copy.beat,
      subtitle: copy.subtitle,
      libPrompt: copy.libPrompt,
      referenceUsage: copy.referenceUsage,
      motion: copy.motion,
    };
  });
}

export const FILM_SHOTS: readonly FilmShot[] = buildShots();

export const LIB_GATES: LibGate[] = [
  {
    id: 'duration',
    label: '时长 ≥ 90 秒的剧情短片',
    detail: `投稿视频正片时长须不少于 ${FILM_MIN_DURATION} 秒。默认 93 秒方案满足；改用更短镜头时长时页面会重新校验。`,
    autoCheckable: true,
  },
  {
    id: 'ratio',
    label: `≥ ${LIB_RATIO_REQUIRED}% 内容在 LibTV 生成`,
    detail:
      '本工具只产出本地合成 WebM，不被 LibTV 计为「在 LibTV 生成」。须把 9 个镜头中至少 7 个（77.8%）在 LibTV 画布内重新生成视频，再与片头片尾一起剪辑投稿。',
    autoCheckable: true,
  },
  {
    id: 'canvas',
    label: '使用 LibTV 公开画布',
    detail: '复刻时请在 LibTV 创建公开画布（非私享），以便活动方核验生成过程与提示词。',
    autoCheckable: false,
  },
  {
    id: 'submit-link',
    label: '社媒发布后回填链接',
    detail: '先在指定社媒平台公开发布成片，再把视频链接回填到 LibTV 活动投稿入口。本工具不会替你提交。',
    autoCheckable: false,
  },
];

export const SUBMISSION_CHECKLIST: SubmissionChecklistItem[] = [
  { id: 'adult', label: '角色为明确成年的虚构人物，无未成年/校园元素', required: true },
  { id: 'clothed', label: '全程着装、非露骨、非恋物呈现', required: true },
  { id: 'ai-label', label: '保留并显著标注 AI 生成标识 / 平台水印', required: true },
  { id: 'no-private', label: '未使用任何真实私人偷拍影像或真实人物肖像', required: true },
  { id: 'license', label: '已确认所用模型 / LoRA / 工作流的商用许可与活动投稿授权', required: true },
  { id: 'no-remove-wm', label: '未使用去水印功能，未伪造「平台内生成」比例', required: true },
  { id: 'duration', label: '成片时长 ≥ 90 秒，竖屏 9:16 1080×1920', required: true },
  { id: 'ratio70', label: '至少 7/9 个镜头在 LibTV 公开画布内重新生成', required: true },
  { id: 'public-canvas', label: 'LibTV 画布为公开状态', required: true },
  { id: 'posted', label: '已在指定社媒公开发布并准备回填链接', required: false },
  { id: 'no-music', label: '未使用版权音乐（本片为无音频 / 可另配免版税音乐）', required: false },
];
