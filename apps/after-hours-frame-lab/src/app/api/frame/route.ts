import { NextResponse, type NextRequest } from 'next/server';
import { buildFramePrompt } from '@/lib/nine-grid/prompts';
import { errorHttpStatus, frameRequestSchema } from '@/lib/nine-grid/api-contract';
import type { FrameResult, GenError } from '@/lib/nine-grid/types';
import { demoFrameUrl } from '@/lib/nine-grid/demo-manifest';
import {
  generateImage,
  HeaderUtils,
  isProviderLikelyConfigured,
} from '@/server/provider/image-provider';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

function jsonError(error: GenError): NextResponse {
  return NextResponse.json(
    { error: { code: error.code, message: error.message, retryable: error.retryable } },
    { status: errorHttpStatus(error.code), headers: { 'cache-control': 'no-store' } },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError({ code: 'bad_request', message: '请求体不是合法 JSON', retryable: false });
  }

  const parsed = frameRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError({
      code: 'bad_request',
      message: parsed.error.issues[0]?.message ?? '参数校验失败',
      retryable: false,
    });
  }

  const { index, options, anchorUrl } = parsed.data;

  if (options.mode === 'demo') {
    // 演示模式：固定素材，模拟延迟，明确标记 demo
    await new Promise((r) => setTimeout(r, 250 + index * 60));
    const result: FrameResult = {
      index,
      mode: 'demo',
      url: demoFrameUrl(index),
    };
    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
  }

  if (!isProviderLikelyConfigured()) {
    return jsonError({
      code: 'not_configured',
      message: '未配置生图 Provider 凭据，可改用「使用演示素材」',
      retryable: false,
    });
  }

  const prompt = buildFramePrompt(index, options);
  const forwardHeaders = HeaderUtils.extractForwardHeaders(request.headers);

  // 身份锁定：优先用户自填 reference，其次自动 anchor
  const referenceUrl = options.referenceUrl ?? anchorUrl ?? null;

  // 客户端断开时尽快放弃上游等待
  let disconnect = false;
  request.signal.addEventListener('abort', () => {
    disconnect = true;
  });

  try {
    if (disconnect) {
      const cancelled: GenError = { code: 'cancelled', message: '客户端已取消', retryable: false };
      return jsonError(cancelled);
    }
    const image = await generateImage({
      prompt,
      referenceUrl: options.consistency ? referenceUrl : null,
      forwardHeaders,
    });
    if (disconnect) {
      const cancelled: GenError = { code: 'cancelled', message: '客户端已取消', retryable: false };
      return jsonError(cancelled);
    }
    const result: FrameResult = {
      index,
      mode: 'live',
      url: `/api/media?u=${encodeURIComponent(image.url)}`,
      remoteUrl: image.url,
    };
    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return jsonError(error as GenError);
  }
}
