/**
 * 夜幕抓拍实验室（AFTER HOURS FRAME LAB）生图路由。
 *
 * - 只接受已经在前端用规则引擎编译好的完整中文叙事 prompt；
 * - 复用 server-only 的 provider adapter，密钥绝不进入客户端；
 * - Demo 模式完全在前端完成（不调本路由）；Live 模式调用本路由真实生图。
 * - 任何上游失败都映射为带 error 结构的响应，绝不伪装成成功。
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { generateImage } from '@/server/provider/image-provider';
import { HeaderUtils } from 'coze-coding-dev-sdk';
import { errorHttpStatus } from '@/lib/nine-grid/api-contract';
import type { GenError } from '@/lib/nine-grid/types';

const requestSchema = z.object({
  prompt: z.string().trim().min(10).max(6000),
  referenceUrl: z
    .string()
    .trim()
    .max(2048)
    .url()
    .refine((u) => u.startsWith('https://'), '仅允许 https 参考图')
    .nullish(),
  seed: z.string().trim().max(64).nullish(),
  cardId: z.string().trim().max(64).nullish(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'bad_request', message: '请求体不是合法 JSON', retryable: false } },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: { code: 'bad_request', message: issue?.message ?? '参数不合法', retryable: false } },
      { status: 400 },
    );
  }

  const forwardHeaders = HeaderUtils.extractForwardHeaders(request.headers);

  try {
    const result = await generateImage({
      prompt: parsed.data.prompt,
      referenceUrl: parsed.data.referenceUrl ?? undefined,
      forwardHeaders,
      timeoutMs: 120_000,
    });
    return NextResponse.json({
      cardId: parsed.data.cardId ?? null,
      seed: parsed.data.seed ?? null,
      mode: 'live',
      imageUrl: `/api/media?u=${encodeURIComponent(result.url)}`,
      remoteUrl: result.url,
    });
  } catch (error) {
    const ge = error as GenError;
    return NextResponse.json(
      { error: { code: ge.code, message: ge.message, retryable: ge.retryable } },
      { status: errorHttpStatus(ge.code) },
    );
  }
}