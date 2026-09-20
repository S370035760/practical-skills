import { NextResponse, type NextRequest } from 'next/server';
import { buildAnchorPrompt } from '@/lib/nine-grid/prompts';
import { anchorRequestSchema, errorHttpStatus } from '@/lib/nine-grid/api-contract';
import type { AnchorResult, GenError } from '@/lib/nine-grid/types';
import { DEMO_ANCHOR_FILE } from '@/lib/nine-grid/demo-manifest';
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

  const parsed = anchorRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError({
      code: 'bad_request',
      message: parsed.error.issues[0]?.message ?? '参数校验失败',
      retryable: false,
    });
  }

  const { options } = parsed.data;

  if (options.mode === 'demo') {
    const result: AnchorResult = {
      mode: 'demo',
      url: DEMO_ANCHOR_FILE,
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

  // 用户自填参考图时直接作为 anchor 返回，跳过首拍
  if (options.referenceUrl) {
    const proxied = `/api/media?u=${encodeURIComponent(options.referenceUrl)}`;
    const result: AnchorResult = {
      mode: 'live',
      url: proxied,
      remoteUrl: options.referenceUrl,
    };
    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
  }

  const prompt = buildAnchorPrompt(options);
  const forwardHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  try {
    const image = await generateImage({
      prompt,
      referenceUrl: null,
      forwardHeaders,
    });
    const result: AnchorResult = {
      mode: 'live',
      url: `/api/media?u=${encodeURIComponent(image.url)}`,
      remoteUrl: image.url,
    };
    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return jsonError(error as GenError);
  }
}
