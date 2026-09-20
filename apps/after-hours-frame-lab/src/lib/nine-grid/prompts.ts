/**
 * 结构化提示词架构。
 * 任何组件都不允许自行拼写人物/场景描述，统一从这里取 anchor 与 frameDirectives。
 */
import type { FrameDirective, GenerateOptions, Intensity } from './types';

/** 人物锚点：成年、虚构、同一人 */
export const identityAnchor = {
  en: [
    'a clearly adult fictional East Asian woman, 24 years old',
    'long straight black hair, cool-toned pale skin with faint freckles across the nose',
    'refined cold-pretty facial features, small face, quiet feline presence',
    'realistic natural anatomy and proportions',
    'graceful shoulders and neck, visible collarbones, naturally slim waist',
    'defined but realistic waist-to-hip curve, long legs',
    'no anime body, no exaggerated breasts or hips, no impossible waist, no cosmetic-plastic texture',
  ].join(', '),
} as const;

/** 服装锚点：九格完全一致 */
export const outfitAnchor = {
  en: [
    'wearing the identical outfit in every frame:',
    'creamy-white fitted halter knit top with shoulders and collarbones visible',
    'light-gray low-rise fitted mini skirt',
    'white mid-calf socks',
    'pale thin-strap heeled shoes',
    'fully clothed, fashion portrait, non-explicit, non-fetish framing',
  ].join(', '),
} as const;

/** 场景体系锚点 */
export const sceneAnchor = {
  en: [
    'clean white apartment interior: plain white wall, doorway, hallway corner and a mirror area',
    'lived-in but uncluttered, minimal neutral background',
  ].join(', '),
} as const;

/** 视觉质感锚点（直闪 / CCD / 颗粒 / 低饱和冷白） */
export const styleAnchor = {
  en: [
    'soft direct on-camera flash photograph',
    'cool-white low-saturation palette',
    'mild film grain, light haze, slight CCD / early-iPhone snapshot softness',
    'candid private-outtake atmosphere, realistic phone snapshot',
    'vertical 9:16 portrait',
  ].join(', '),
} as const;

/** 统一负面提示词 */
export const negativePrompt: string = [
  'minor',
  'teenager',
  'child',
  'school uniform',
  'nudity',
  'lingerie',
  'explicit',
  'fetish',
  'exaggerated anatomy',
  'impossible waist',
  'oversized breasts',
  'extreme hips',
  'extra fingers',
  'malformed hands',
  'duplicate person',
  'different identity',
  'different outfit',
  'inconsistent hair',
  'collage',
  'text',
  'watermark',
  'UI',
  'logo',
  'meme face',
  'grotesque distortion',
  'heavy beauty filter',
  'plastic skin',
  'illustration',
  'anime',
  'CGI',
  '3d render',
  'painting',
].join(', ');

/**
 * 九格固定镜头表。位置 index 0-8 与 3x3 网格行列严格对应，不可互换。
 */
export const frameDirectives: FrameDirective[] = [
  {
    index: 0,
    id: 'motion-blur',
    labelEn: 'Slight motion blur',
    labelZh: '轻微拖影',
    pose:
      'three-quarter standing pose, turning her head back toward the camera mid-movement, background sharp',
    accident: {
      subtle:
        'very slight motion blur: a barely noticeable directional softness on her silhouette from turning, pose still crisp',
      standard:
        'clear but restrained motion blur: a subtle directional motion trail on her figure as she turns, the graceful pose stays readable',
      obvious:
        'strong but still tasteful motion blur: visible directional streaking across her whole silhouette, yet her beauty and the pose remain clear',
    },
    focal: { x: 0.5, y: 0.4 },
  },
  {
    index: 1,
    id: 'eyes-closed',
    labelEn: 'Eyes closed',
    labelZh: '闭眼瞬间',
    pose:
      'leaning against the white wall, one hand naturally touching her hair, sharp focus and correct exposure',
    accident: {
      subtle:
        'eyes closed in a soft blink at the flash instant, long lashes visible, everything else nearly perfect',
      standard:
        'eyes fully closed mid-blink at the flash instant, long lashes visible, everything else nearly perfect',
      obvious:
        'eyes squeezed fully shut mid-blink, face slightly tensed, but still pretty and peaceful, rest of the frame perfect',
    },
    focal: { x: 0.5, y: 0.35 },
  },
  {
    index: 2,
    id: 'cropped-head',
    labelEn: 'Cropped head',
    labelZh: '切掉额头',
    pose:
      'tight close-up that keeps her lips, chin, neck, bare shoulders, halter top and waistline clearly in frame',
    accident: {
      subtle:
        'slightly too-tight framing: the very top edge of her hair is cut off by the upper frame border',
      standard:
        'too-tight framing: her forehead and the upper part of her hair are cropped out by the upper frame border',
      obvious:
        'very tight framing: forehead, hairline and most of her hair are cropped out, eyes sit right at the top edge, lower face and body intact',
    },
    focal: { x: 0.5, y: 0.62 },
  },
  {
    index: 3,
    id: 'flash-overexposure',
    labelEn: 'Flash overexposure',
    labelZh: '直闪过曝',
    pose: 'front selfie angle, facing the camera directly, surrounding white room still visible',
    accident: {
      subtle:
        'mild flash overexposure: small clipped highlight bloom on the forehead and cheekbone, skin detail mostly retained',
      standard:
        'clear flash overexposure: blown clipped highlight areas across parts of her face and shoulder, but the image is not pure white',
      obvious:
        'heavy flash overexposure: large blown-out highlight bloom across the center of the face and upper chest, edges of the figure and room still visible, never fully white',
    },
    focal: { x: 0.5, y: 0.35 },
  },
  {
    index: 4,
    id: 'missed-focus',
    labelEn: 'Missed focus',
    labelZh: '整体失焦',
    pose:
      'standing facing the camera with one leg slightly placed forward, the white wall behind her is comparatively sharp',
    accident: {
      subtle:
        'slight missed focus: her face is a little soft and lacks crisp detail, still clearly recognizable',
      standard:
        'clear missed focus: her whole figure and especially her face are softly out of focus with defocused edges, background sharper',
      obvious:
        'strong missed focus: her entire figure is noticeably blurred and dreamlike, only the background wall is in focus',
    },
    focal: { x: 0.5, y: 0.4 },
  },
  {
    index: 5,
    id: 'crooked-frame',
    labelEn: 'Crooked frame',
    labelZh: '画面倾斜',
    pose:
      'full body shot, one hand resting on the wall, her own body natural with no distortion',
    accident: {
      subtle:
        'the whole photograph is tilted at a slight dutch angle of about 5 degrees, walls and doorway slant gently',
      standard:
        'the whole photograph is visibly tilted at a dutch angle of about 10 degrees, walls floor and doorway slant diagonally',
      obvious:
        'the whole photograph is tilted at a strong dutch angle of about 15 degrees, everything slants hard but she herself is undistorted',
    },
    focal: { x: 0.5, y: 0.5 },
  },
  {
    index: 6,
    id: 'bad-low-angle',
    labelEn: 'Bad low angle',
    labelZh: '死亡仰角',
    pose:
      'close shot from a low camera position looking upward, showing chin, underside of the nose, neck and upper body',
    accident: {
      subtle:
        'slightly too-low camera angle, a hint of chin and nostril, still flattering and natural',
      standard:
        'unflattering low angle: chin, underside of the nose and neck are prominent, but anatomy is natural, undistorted and not caricatured, she remains pretty',
      obvious:
        'very low angle: strong underside-of-chin and nostril perspective and neck shadows, yet anatomically realistic, not grotesque, still a real person',
    },
    focal: { x: 0.5, y: 0.6 },
  },
  {
    index: 7,
    id: 'too-far',
    labelEn: 'Too far / negative space',
    labelZh: '人太小留白',
    pose:
      'distant full-body shot, she stands near the lower third of the frame, a large plain white wall dominates the image',
    accident: {
      subtle:
        'a little too much distance: she occupies roughly a third of the frame with generous white-wall negative space',
      standard:
        'too far away: she occupies only a small portion of the frame, surrounded by a very large expanse of empty white wall',
      obvious:
        'far too distant: she is tiny near the bottom edge, almost the entire photograph is empty white wall and doorway',
    },
    focal: { x: 0.5, y: 0.78 },
  },
  {
    index: 8,
    id: 'hand-blocking-lens',
    labelEn: 'Hand blocking lens',
    labelZh: '手挡镜头',
    pose:
      'she notices she is still being photographed, leans slightly forward and reaches one hand toward the camera',
    accident: {
      subtle:
        'a slightly out-of-focus hand enters the foreground and covers a corner of the lens, most of her face still visible, faint motion blur',
      standard:
        'a large out-of-focus open palm fills much of the foreground and blocks part of the lens, only part of her face peeks out, slight motion blur and harsh direct flash on the hand',
      obvious:
        'a very close heavily blurred palm covers most of the lens in the foreground, just a slice of her face and shoulder visible behind it, stronger motion blur and flash glare, natural not scary',
    },
    focal: { x: 0.5, y: 0.45 },
  },
];

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** 风格物理量 → 英文提示词片段 */
function styleModifiers(style: GenerateOptions['style']): string[] {
  const strength = clamp01(style.styleStrength / 100);
  const grain = clamp01(style.grain / 100) * strength;
  const softness = clamp01(style.softness / 100) * strength;
  const flash = clamp01(style.flash / 100);
  const haze = clamp01((style.grain + style.softness) / 200) * strength;
  const out: string[] = [];
  out.push(
    grain > 0.66
      ? 'heavy fine film grain'
      : grain > 0.33
        ? 'mild film grain'
        : 'very light almost clean grain',
  );
  out.push(
    softness > 0.66
      ? 'distinct CCD soft-focus snapshot look'
      : softness > 0.33
        ? 'slight CCD / iPhone softness'
        : 'mostly sharp modern phone look',
  );
  out.push(
    flash > 0.75
      ? 'harsh direct on-camera flash'
      : flash > 0.4
        ? 'soft direct on-camera flash'
        : 'gentle weak flash, mostly ambient light',
  );
  if (haze > 0.55) out.push('noticeable light haze in the air');
  if (style.negativeSpace >= 66) out.push('generous negative space around the subject');
  return out;
}

/** anchor 半身基准照：无事故、正面、用于锁定身份 */
export function buildAnchorPrompt(options: GenerateOptions): string {
  return [
    `Photorealistic reference portrait, vertical 9:16, of ${identityAnchor.en}.`,
    outfitAnchor.en + '.',
    `Scene: ${sceneAnchor.en}.`,
    'She stands relaxed facing the camera, neutral natural expression, eyes open, both hands away from the face, full head and shoulders visible with proper headroom.',
    styleAnchor.en + '.',
    styleModifiers(options.style).join(', ') + '.',
    `Avoid: ${negativePrompt}.`,
  ].join(' ');
}

/** 单格提示词：anchor 之后只承载一种失败原因 */
export function buildFramePrompt(
  index: number,
  options: GenerateOptions,
): string {
  const directive = frameDirectives.find((f) => f.index === index);
  if (!directive) throw new Error(`unknown frame index: ${index}`);

  const accident = directive.accident[options.intensity as Intensity];
  const parts: string[] = [
    `Photorealistic candid snapshot, vertical 9:16, of the same woman as the reference picture: ${identityAnchor.en}.`,
    outfitAnchor.en + '.',
    `Scene: ${sceneAnchor.en}.`,
    `Camera / pose: ${directive.pose}.`,
    styleAnchor.en + '.',
    styleModifiers(options.style).join(', ') + '.',
    `THE ONE AND ONLY PHOTOGRAPHY MISTAKE in this frame: ${accident}.`,
    'Everything else in the frame must stay realistic and beautiful; do NOT add any other mistake, no second defect.',
    `Avoid: ${negativePrompt}.`,
  ];
  if (options.seed) parts.push(`[session seed reference: ${options.seed}]`);
  return parts.join(' ');
}
