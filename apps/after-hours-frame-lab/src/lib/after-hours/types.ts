/**
 * 夜幕抓拍实验室 / AFTER HOURS FRAME LAB —— 共享类型。
 *
 * 定位：成年都市社交纪实影像方案生成器。核心是「情境规则」而非形容词堆砌。
 */

/** 五层模型的外层键（原创分层：社交任务 / 时段叙事 / 空间气质 / 人物瞬间 / 成像痕迹） */
export type LayerKey = 'task' | 'phase' | 'space' | 'moment' | 'trace';

export const LAYER_KEYS: readonly LayerKey[] = ['task', 'phase', 'space', 'moment', 'trace'];

/** 五层模型每一层的选中项 */
export interface LayerSelection {
  key: string;
  labelZh: string;
  labelEn: string;
}

/** 横向维度：成年人数量 / 社交关系 / 现场整洁度 */
export interface CrossFields {
  /** 成年人数量 1–6 */
  persons: number;
  /** 社交关系（原创枚举值） */
  relation: string;
  /** 现场整洁度（原创枚举值） */
  tidiness: string;
}

/** 一张故事卡（含完整原创 prompt） */
export interface StoryCard {
  /** 基于主维度组合生成的短指纹 */
  id: string;
  seed: number;
  index: number;
  batchSize: number;
  /** 五层模型 */
  layers: Record<LayerKey, LayerSelection>;
  /** 横向维度 */
  cross: CrossFields;
  /** 依情境推导出的得体着装说明 */
  clothing: string;
  /** 该组合为何相容的规则说明（多条） */
  compatibility: string[];
  /** 完整原创 prompt（含不可被移除的安全块） */
  prompt: string;
  /** 与 prompt 相同的一份安全块原文，供 UI 单独展示 */
  safetyBlock: string;
  createdAt: number;
  /** 是否被用户收藏 */
  favorite: boolean;
}

/** 历史记录（localStorage，保留最近 20 组） */
export interface HistoryRecord {
  id: string;
  seed: number;
  index: number;
  batchSize: number;
  fingerprint: string;
  layers: Record<LayerKey, LayerSelection>;
  cross: CrossFields;
  clothing: string;
  compatibility: string[];
  prompt: string;
  safetyBlock: string;
  createdAt: number;
  favorite: boolean;
}

/** 锁定表：某层是否被用户锁定、锁定到哪个 key（不锁则 null） */
export type LockMap = Partial<Record<LayerKey, string | null>>;

/** 生成引擎的一次配置 */
export interface EngineSpec {
  seed: number;
  batchSize: 1 | 4 | 9;
  locks: LockMap;
  /** 氛围基调 key（首屏「今晚想记录的感觉」） */
  mood: string;
  /** 横向维度的用户偏好（允许为空，由规则补齐） */
  cross?: Partial<CrossFields>;
  /** 需要避开的最近指纹（来自 localStorage 最近 20 组） */
  avoidFingerprints?: string[];
}

/** 批量生成结果 */
export interface EngineResult {
  cards: StoryCard[];
  warnings: string[];
}