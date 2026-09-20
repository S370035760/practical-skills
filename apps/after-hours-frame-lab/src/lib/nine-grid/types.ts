/**
 * 九宫格废片写真 —— 共享类型定义（前后端同构）
 */

export type Intensity = 'subtle' | 'standard' | 'obvious';

export const INTENSITIES: { value: Intensity; labelZh: string; labelEn: string }[] = [
  { value: 'subtle', labelZh: '轻微', labelEn: 'SUBTLE' },
  { value: 'standard', labelZh: '标准', labelEn: 'STANDARD' },
  { value: 'obvious', labelZh: '明显', labelEn: 'OBVIOUS' },
];

/** 生成通道：live = 真实模型生成；demo = 内置演示素材 */
export type ProviderMode = 'live' | 'demo';

/** 单格运行状态（仅存在于前端状态机中） */
export type FrameStatus = 'idle' | 'queued' | 'generating' | 'done' | 'error';

/** 结构化失败原因档位文案（清楚但克制） */
export type IntensityText = Record<Intensity, string>;

export interface FrameDirective {
  /** 0-8，对应九宫格固定位置，顺序不可互换 */
  index: number;
  /** 稳定 id，用于 key、日志、文件名 */
  id: string;
  labelEn: string;
  labelZh: string;
  /** 姿势与构图描述（与事故无关的部分），加入 identity/outfit/scene 之外的镜头语言 */
  pose: string;
  /** 三档强度下，唯一允许的主失败原因描述 */
  accident: IntensityText;
  /**
   * 方形素材导出为 9:16 时 cover 裁切的对焦点（0-1，左上为原点）。
   * 真实 provider 直接产出 9:16 时该值不生效。
   */
  focal: { x: number; y: number };
}

/** 高级设置：风格物理量（0-100） */
export interface StyleSettings {
  /** 风格强度（颗粒/薄雾/CCD 柔化的总开关） */
  styleStrength: number;
  /** 直闪强度 */
  flash: number;
  /** 颗粒 */
  grain: number;
  /** 柔焦 */
  softness: number;
  /** 留白倾向 */
  negativeSpace: number;
}

export const DEFAULT_STYLE: StyleSettings = {
  styleStrength: 60,
  flash: 60,
  grain: 45,
  softness: 30,
  negativeSpace: 25,
};

export interface GenerateOptions {
  mode: ProviderMode;
  /** 人物一致性开关：true 时先出 anchor 再以参考图逐格生成 */
  consistency: boolean;
  intensity: Intensity;
  style: StyleSettings;
  /** 用户自填 seed（仅记录/透传；当前 provider 不保证可复现，详见 README） */
  seed: string | null;
  /** 用户自填参考图 URL，提供后优先于自动 anchor */
  referenceUrl: string | null;
}

export const DEFAULT_OPTIONS: GenerateOptions = {
  mode: 'live',
  consistency: true,
  intensity: 'standard',
  style: { ...DEFAULT_STYLE },
  seed: null,
  referenceUrl: null,
};

/** 单格产物 */
export interface FrameImage {
  /** 可被 <img>/canvas 直接使用的地址（真实生成走 /api/media 代理，demo 走本地路径） */
  url: string;
  /** provider 返回的原始地址，仅展示/调试用，不直接进 canvas（避免跨域污染） */
  remoteUrl?: string;
  mode: ProviderMode;
  /** 生成时使用的 seed（若 provider 回传） */
  seed?: string | null;
}

export interface FrameState {
  directive: FrameDirective;
  status: FrameStatus;
  image: FrameImage | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

/** 后端统一错误码 */
export type GenErrorCode =
  | 'not_configured'
  | 'timeout'
  | 'rate_limited'
  | 'content_policy'
  | 'cancelled'
  | 'network'
  | 'bad_request'
  | 'upstream'
  | 'unknown';

export interface GenError {
  code: GenErrorCode;
  message: string;
  /** 是否建议用户直接重试 */
  retryable: boolean;
}

export interface AnchorResult {
  mode: ProviderMode;
  url: string;
  remoteUrl?: string;
}

export interface FrameResult {
  index: number;
  mode: ProviderMode;
  url: string;
  remoteUrl?: string;
  seed?: string | null;
}
