/**
 * API 契约：前后端共用的请求校验（zod）与类型。
 */
import { z } from 'zod';
import { frameDirectives } from './prompts';
import type { GenerateOptions } from './types';

export const frameIndexSchema = z
  .number()
  .int()
  .min(0)
  .max(frameDirectives.length - 1);

const intensitySchema = z.enum(['subtle', 'standard', 'obvious']);

export const styleSchema = z.object({
  styleStrength: z.number().min(0).max(100),
  flash: z.number().min(0).max(100),
  grain: z.number().min(0).max(100),
  softness: z.number().min(0).max(100),
  negativeSpace: z.number().min(0).max(100),
});

const httpsUrlNullable = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((u) => u.startsWith('https://'), '仅允许 https 参考图')
  .nullable();

/**
 * 生成请求里与「模式」无关的选项。mode 由具体路由决定
 * （/api/anchor 与 /api/frame 都接受 mode=demo，以便前端离线走通全流程）。
 */
export const generateOptionsSchema = z.object({
  mode: z.enum(['live', 'demo']),
  consistency: z.boolean(),
  intensity: intensitySchema,
  style: styleSchema,
  seed: z.string().trim().max(64).nullable(),
  referenceUrl: httpsUrlNullable,
});

export type ValidatedGenerateOptions = GenerateOptions;

export const anchorRequestSchema = z.object({
  options: generateOptionsSchema,
});

export const frameRequestSchema = z.object({
  index: frameIndexSchema,
  options: generateOptionsSchema,
  /** 已锁定的 anchor 远程地址（来自 /api/anchor 的 remoteUrl） */
  anchorUrl: httpsUrlNullable,
});

/** 错误码 → HTTP 状态 */
export function errorHttpStatus(code: string): number {
  switch (code) {
    case 'bad_request':
      return 400;
    case 'content_policy':
      return 422;
    case 'rate_limited':
      return 429;
    case 'not_configured':
      return 503;
    case 'timeout':
      return 504;
    case 'cancelled':
      return 499;
    case 'network':
      return 502;
    default:
      return 500;
  }
}
