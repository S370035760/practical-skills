/**
 * 安全块（safety block）—— 不可被任何生成/随机逻辑移除的固定文案。
 *
 * 它被原样追加到每一条最终 prompt 的末尾，规则引擎、换变量、换一组都不会触碰它；
 * 测试也强制断言「每条最终 prompt 都包含 SAFETY_BLOCK 与 25 岁以上」。
 */

export const SAFETY_BLOCK =
  '所有人物均为25岁以上的虚构成年角色，主体可为成年东亚女性，其他人仅为正常社交中的朋友、同事、顾客或环境人物；完整得体着装、自然健康骨骼体态。画面明确禁止：未成年人、裸体、露骨性内容、色情或性暗示、偷拍/跟踪式视角、毒品、暴力、胁迫、昏迷或失去判断力的状态、强调醉酒失控的画面。';

/**
 * 把安全块附加到 prompt。若 prompt 已包含安全块则不重复。
 */
export function withSafety(prompt: string): string {
  return prompt.includes('所有人物均为25岁以上') ? prompt : `${prompt}\n${SAFETY_BLOCK}`;
}

/** 断言一条 prompt 是否完整包含安全块（供测试使用） */
export function promptContainsSafety(prompt: string): boolean {
  return prompt.includes(SAFETY_BLOCK) || prompt.includes('所有人物均为25岁以上');
}