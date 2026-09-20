/**
 * 夜幕抓拍实验室 —— 原创五层模型数据池与横向维度、氛围基调。
 *
 * 全部内容为原创撰写：每层是一个独立选项池，字段名、说明、枚举值均为本产品自建，
 * 不沿用任何第三方清单的字段名与结构。选项对象既承载展示文案，也承载规则引擎
 * 用于做约束判定的元数据（正式度、桌面状态、人际面、可搭配瞬间等）。
 */
import type { LayerKey } from './types';

/** 任务层的可寻址字段（规则引擎读取） */
export interface TaskMeta {
  /** 正式程度 0..1，越高越正式（商务散场最高） */
  formal: number;
  /** 桌面状态偏好：正式克制 / 自然松弛 / 出现桌游道具 */
  table: 'neat' | 'lively' | 'game';
  /** 更贴合的社交关系倾向 */
  relationBias: string;
  /** 默认人数下限 */
  personsMin: number;
  /** 默认人数上限 */
  personsMax: number;
}

/** 空间层的可寻址字段 */
export interface SpaceMeta {
  /** 光源冷暖 0=冷(青蓝) ..1=暖(钨丝) */
  warm: number;
  /** 空间私密程度 0=开放 ..1=私密 */
  intimate: number;
  /** 推荐镜位族：近景/中景/中长焦 */
  shotHint: 'close' | 'mid' | 'tele';
}

/** 瞬间层的可寻址字段 */
export interface MomentMeta {
  /** 是否需要他人互动（false 为自处类动作，如看窗外/整袖口） */
  social: boolean;
  /** 动还是静 */
  kinetic: boolean;
  /** 站姿倾向 */
  standing: boolean;
}

/** 成像痕迹层的可寻址字段 */
export interface TraceMeta {
  /** 主镜族（用于九张内主镜位不重复的去重判定） */
  camFamily: string;
  /** 焦距倾向：wide / standard / tele */
  focal: 'wide' | 'standard' | 'tele';
  /** 是否包含直闪 */
  flash: boolean;
}

export interface TaskOption extends TaskMeta {
  layer: LayerKey;
  key: string;
  labelZh: string;
  labelEn: string;
}

export interface SpaceOption extends SpaceMeta {
  layer: LayerKey;
  key: string;
  labelZh: string;
  labelEn: string;
}

export interface MomentOption extends MomentMeta {
  layer: LayerKey;
  key: string;
  labelZh: string;
  labelEn: string;
  pose: string;
}

export interface TraceOption extends TraceMeta {
  layer: LayerKey;
  key: string;
  labelZh: string;
  labelEn: string;
}

export const MOOD_NOTE: Record<string, string> = {
  easy_gather: '松弛热络地流动人群，笑声和碰杯交错',
  cool_aware: '清冷疏离，人物安静保持距离，光比更强',
  soft_warm: '柔软暖意，友好近距，动作轻而缓',
  quiet_pause: '喧嚣里突然静下来的一秒，呼吸可见',
  end_calm: '收尾的松弛，动作放慢，桌面略凌乱但绝不失控',
};

/** 氛围基调（首屏「今晚想记录的感觉」）——原创枚举 */
export interface MoodOption {
  key: string;
  labelZh: string;
  labelEn: string;
  /** 该感觉下更偏好的时段 */
  phaseBias: string[];
  /** 该感觉下更偏好的空间 */
  spaceBias: string[];
}

export const MOODS: MoodOption[] = [
  { key: 'easy_gather', labelZh: '松弛热络', labelEn: 'Easy Flow', phaseBias: ['warming', 'peak'], spaceBias: ['wood_warm', 'quiet_bar', 'mirror_hall'] },
  { key: 'cool_aware', labelZh: '清冷疏离', labelEn: 'Cool Distance', phaseBias: ['arrival', 'quiet'], spaceBias: ['highrise_cool', 'mirror_hall'] },
  { key: 'soft_warm', labelZh: '柔软暖意', labelEn: 'Soft Warmth', phaseBias: ['warming', 'quiet'], spaceBias: ['wood_warm', 'quiet_bar'] },
  { key: 'quiet_pause', labelZh: '静下来的瞬间', labelEn: 'Quiet Pause', phaseBias: ['quiet', 'peak'], spaceBias: ['quiet_bar', 'highrise_cool', 'neon_booth'] },
  { key: 'end_calm', labelZh: '收尾的松弛', labelEn: 'End-of-Night Calm', phaseBias: ['leaving', 'quiet'], spaceBias: ['quiet_bar', 'mirror_hall', 'highrise_cool'] },
];

export const TASK_POOL: TaskOption[] = [
  { layer: 'task', key: 'after_work', labelZh: '下班小聚', labelEn: 'After-Work Gathering', formal: 0.25, table: 'lively', relationBias: '平日同事', personsMin: 2, personsMax: 5 },
  { layer: 'task', key: 'birthday_after', labelZh: '生日后半场', labelEn: 'Birthday After-Party', formal: 0.4, table: 'lively', relationBias: '多年老友', personsMin: 3, personsMax: 6 },
  { layer: 'task', key: 'reunion', labelZh: '朋友重逢', labelEn: 'Friends Reunion', formal: 0.4, table: 'lively', relationBias: '多年老友', personsMin: 2, personsMax: 4 },
  { layer: 'task', key: 'board_game', labelZh: '桌游夜', labelEn: 'Game Night', formal: 0.15, table: 'game', relationBias: '很熟的朋友', personsMin: 3, personsMax: 6 },
  { layer: 'task', key: 'business_coda', labelZh: '商务散场', labelEn: 'Business Aftermath', formal: 0.85, table: 'neat', relationBias: '平日同事', personsMin: 2, personsMax: 5 },
  { layer: 'task', key: 'solo_wait', labelZh: '独处等候', labelEn: 'Solo Wait', formal: 0.35, table: 'lively', relationBias: '独自一人', personsMin: 1, personsMax: 1 },
];

export const PHASE_POOL: { key: string; labelZh: string; labelEn: string }[] = [
  { key: 'arrival', labelZh: '刚到场', labelEn: 'Just Arrived' },
  { key: 'warming', labelZh: '逐渐热闹', labelEn: 'Warming Up' },
  { key: 'peak', labelZh: '气氛高点', labelEn: 'At the Peak' },
  { key: 'quiet', labelZh: '短暂安静', labelEn: 'A Quiet Beat' },
  { key: 'leaving', labelZh: '准备离开', labelEn: 'About to Leave' },
];

export const SPACE_POOL: SpaceOption[] = [
  { layer: 'space', key: 'highrise_cool', labelZh: '城市高层冷光', labelEn: 'High-Rise Cool Light', warm: 0.15, intimate: 0.3, shotHint: 'mid' },
  { layer: 'space', key: 'wood_warm', labelZh: '木饰面暖光', labelEn: 'Warm Wood Paneling', warm: 0.85, intimate: 0.55, shotHint: 'mid' },
  { layer: 'space', key: 'mirror_hall', labelZh: '镜面过道', labelEn: 'Mirror Hallway', warm: 0.35, intimate: 0.4, shotHint: 'close' },
  { layer: 'space', key: 'neon_booth', labelZh: '霓虹小包厢', labelEn: 'Neon Booth', warm: 0.5, intimate: 0.85, shotHint: 'close' },
  { layer: 'space', key: 'quiet_bar', labelZh: '安静吧台', labelEn: 'Quiet Bar', warm: 0.6, intimate: 0.6, shotHint: 'tele' },
];

export const MOMENT_POOL: MomentOption[] = [
  { layer: 'moment', key: 'answering', labelZh: '接话', labelEn: 'Caught Mid-Reply', social: true, kinetic: true, standing: false, pose: '侧过身正要接话，话说到一半，嘴唇微张' },
  { layer: 'moment', key: 'passing_item', labelZh: '递物', labelEn: 'Passing Something Over', social: true, kinetic: true, standing: false, pose: '正把一只杯子或手机递向对面，手停在半空' },
  { layer: 'moment', key: 'finding_seat', labelZh: '找座位', labelEn: 'Finding a Seat', social: false, kinetic: true, standing: true, pose: '刚走进来，正环顾寻找空位，身体重心还在移动' },
  { layer: 'moment', key: 'gazing_window', labelZh: '看向窗外', labelEn: 'Gazing Out the Window', social: false, kinetic: false, standing: false, pose: '安静地望向窗外，肩膀放松，目光落在远处' },
  { layer: 'moment', key: 'half_laugh', labelZh: '笑到一半', labelEn: 'Half-Finished Laugh', social: true, kinetic: false, standing: false, pose: '正被一句话逗笑，笑意刚起还没收住' },
  { layer: 'moment', key: 'adjusting_cuff', labelZh: '整理袖口', labelEn: 'Adjusting a Cuff', social: false, kinetic: true, standing: true, pose: '低头顺了下袖口或衣摆，动作正在进行' },
  // 情境衍生：桌游夜/递骰子、商务散场/握手寒暄（供 rules 动态补充）
  { layer: 'moment', key: 'rolling_dice', labelZh: '摇骰子', labelEn: 'Rolling the Dice', social: true, kinetic: true, standing: false, pose: '手腕轻晃正要摇出手里的骰子，视线落在桌面上' },
  { layer: 'moment', key: 'handshake_coda', labelZh: '握手寒暄', labelEn: 'Parting Handshake', social: true, kinetic: true, standing: true, pose: '起身与人握手告别，姿态端正而克制' },
  { layer: 'moment', key: 'checking_phone', labelZh: '看手机', labelEn: 'Checking the Phone', social: false, kinetic: true, standing: false, pose: '低头看了一眼手机，拇指正要滑屏' },
  { layer: 'moment', key: 'reaching_glass', labelZh: '伸手拿杯', labelEn: 'Reaching for a Glass', social: false, kinetic: true, standing: false, pose: '正伸手去够桌上那杯饮料，指尖将触未触' },
  { layer: 'moment', key: 'tying_hair', labelZh: '拢头发', labelEn: 'Tucking Hair Back', social: false, kinetic: true, standing: false, pose: '手绕到耳后拢了拢头发，动作正在进行' },
  { layer: 'moment', key: 'whisper_lean', labelZh: '附耳说笑', labelEn: 'Leaning to Whisper', social: true, kinetic: true, standing: false, pose: '微微侧身，正附耳跟身旁的人说一句悄悄话' },
];

export const TRACE_POOL: TraceOption[] = [
  { layer: 'trace', key: 'phone_1x', labelZh: '手机 1x', labelEn: 'Phone 1x', camFamily: 'phone_main', focal: 'standard', flash: false },
  { layer: 'trace', key: 'phone_wide', labelZh: '手机 0.5x', labelEn: 'Phone Ultra-Wide', camFamily: 'phone_wide', focal: 'wide', flash: false },
  { layer: 'trace', key: 'compact_digital', labelZh: '消费级数码', labelEn: 'Consumer Compact', camFamily: 'compact', focal: 'standard', flash: false },
  { layer: 'trace', key: 'weak_direct_flash', labelZh: '弱直闪', labelEn: 'Weak Direct Flash', camFamily: 'flash', focal: 'standard', flash: true },
  { layer: 'trace', key: 'mixed_wb', labelZh: '混合白平衡', labelEn: 'Mixed White Balance', camFamily: 'compact', focal: 'standard', flash: false },
  { layer: 'trace', key: 'high_iso', labelZh: '高 ISO', labelEn: 'High ISO', camFamily: 'compact', focal: 'standard', flash: false },
  { layer: 'trace', key: 'partial_occlusion', labelZh: '轻微遮挡', labelEn: 'Slight Occlusion', camFamily: 'phone_main', focal: 'standard', flash: false },
  { layer: 'trace', key: 'offcenter', labelZh: '非中心构图', labelEn: 'Off-Center Frame', camFamily: 'phone_main', focal: 'standard', flash: false },
  { layer: 'trace', key: 'soft_flare', labelZh: '逆光光晕', labelEn: 'Backlit Flare', camFamily: 'flare', focal: 'standard', flash: false },
  { layer: 'trace', key: 'digital_zoom', labelZh: '数码变焦', labelEn: 'Digital Zoom', camFamily: 'zoom', focal: 'tele', flash: false },
];

/** 横向维度：社交关系（原创枚举） */
export const RELATIONS = ['多年老友', '平日同事', '很熟的朋友', '刚认识的新朋友', '独自一人'];

/** 横向维度：现场整洁度（原创枚举） */
export const TIDINESS = ['收拾齐整', '自然松弛', '略带凌乱'];

/** 服装按任务 × 正式度推导（原创非猎奇主题池） */
export interface ClothingSlot {
  silhouette: string;
  material: string;
  fit: string;
}

export function resolveClothing(formal: number, spaceKey: string): ClothingSlot {
  if (formal >= 0.75) {
    return { silhouette: '利落合身', material: '挺括面料与少量丝质', fit: '正式场合得体剪裁' };
  }
  if (formal >= 0.4) {
    return { silhouette: '收腰但不紧绷', material: '针织与垂感面料', fit: '半正式的通勤与社交两相宜' };
  }
  const neon = spaceKey === 'neon_booth';
  if (neon) {
    return { silhouette: '流畅垂坠', material: '带细闪或光泽的轻面料', fit: '宽松而有轮廓的夜晚造型' };
  }
  return { silhouette: '柔软松弛', material: '棉麻与针织', fit: '舒适的日常社交气息' };
}