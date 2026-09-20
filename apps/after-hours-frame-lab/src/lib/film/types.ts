/**
 * 短片投稿模式（LibTV Edition）的纯类型定义。
 * 不依赖 DOM / React，可直接被 Node 纯函数测试引用。
 */

/** 单格在 LibTV 画布上的复刻状态（仅存于浏览器 localStorage） */
export type LibReplicationStatus = 'todo' | 'done';

/** 时间轴段落种类 */
export type SegmentKind = 'intro' | 'shot' | 'outro';

/** 时间轴中的一段 */
export interface TimelineSegment {
  kind: SegmentKind;
  /** 绑定的镜头 index（0-8），片头片尾为 null */
  shotIndex: number | null;
  /** 段落起点（秒） */
  start: number;
  /** 段落时长（秒） */
  duration: number;
  /** 段落终点（秒，不含） */
  end: number;
}

/** 一个镜头的分镜卡（绑定既有九格事故） */
export interface FilmShot {
  index: number;
  accidentId: string;
  accidentLabelEn: string;
  accidentLabelZh: string;
  /** 叙事节拍：钩子 / 升级 / 高潮 / 收束 */
  beat: 'hook' | 'escalation' | 'climax' | 'resolution';
  /** 屏幕字幕（不超过两行） */
  subtitle: string;
  /** 可粘贴到 LibTV 的视频生成提示（中文） */
  libPrompt: string;
  /** 参考图用途说明 */
  referenceUsage: string;
  /** 该镜头的动态设计（Ken Burns 与事故特效） */
  motion: string;
}

/** 时间轴计算结果 */
export interface FilmTimeline {
  introDuration: number;
  shotDuration: number;
  outroDuration: number;
  shotCount: number;
  totalDuration: number;
  segments: TimelineSegment[];
  /** 是否满足 LibTV 90 秒硬门槛 */
  meetsMinDuration: boolean;
}

export interface FilmTitleMeta {
  title: string;
  subtitle: string;
  synopsis: string;
  statement: string;
  tags: string[];
}

/** LibTV 活动门槛（仅展示规则，不在本工具内代提交） */
export interface LibGate {
  id: string;
  label: string;
  detail: string;
  /** 是否由本工具可自动判定 */
  autoCheckable: boolean;
}

/** 投稿自检清单条目 */
export interface SubmissionChecklistItem {
  id: string;
  label: string;
  required: boolean;
}

/** 投稿包元数据（写入 README / 说明文件） */
export interface SubmissionPackageMeta {
  title: string;
  synopsis: string;
  statement: string;
  tags: string[];
  totalDuration: number;
  shotDuration: number;
  resolution: string;
  format: string;
  audio: string;
  sourceMode: 'demo' | 'live';
  libGeneratedShots: number;
  totalShots: number;
  ratioPercent: number;
}

/** 导出规格 */
export interface ExportProfile {
  id: string;
  label: string;
  width: number;
  height: number;
  bitrateKbps: number;
}

export const FILM_MIN_DURATION = 90;
export const LIB_RATIO_REQUIRED = 70;

export const EXPORT_PROFILES: ExportProfile[] = [
  { id: 'full', label: '1080×1920（投稿画质）', width: 1080, height: 1920, bitrateKbps: 8000 },
  { id: 'half', label: '540×960（快速预览）', width: 540, height: 960, bitrateKbps: 4000 },
];
