import { NextResponse, type NextRequest } from 'next/server';
import type { GenError } from '@/lib/nine-grid/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * 图片代理：
 * 1) 让 canvas 可以以同源 + CORS 头读取远程图，避免跨域污染导致无法导出；
 * 2) 对可代理的上游域名做白名单，SSRF 防护。
 */
const HOST_ALLOWLIST = [
  '.coze.site',
  '.coze.cn',
  '.coze.com',
  '.byteimg.com',
  '.volces.com',
  '.tos-cn-',
];

function jsonError(status: number, error: GenError): NextResponse {
  return NextResponse.json({ error: { code: error.code, message: error.message } }, { status });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const raw = request.nextUrl.searchParams.get('u');
  if (!raw) {
    return jsonError(400, { code: 'bad_request', message: '缺少 u 参数', retryable: false });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return jsonError(400, { code: 'bad_request', message: '非法 URL', retryable: false });
  }

  if (target.protocol !== 'https:') {
    return jsonError(400, { code: 'bad_request', message: '仅允许 https 上游', retryable: false });
  }

  const host = target.hostname.toLowerCase();
  // 仅允许精确子域（suffix 必须以 "." 开头）或前缀匹配存储桶主机，避免
  // coze.site.evil.com 这类伪造主机名绕过。
  const allowed =
    host === 'coze.site' || host === 'coze.cn' || host === 'coze.com' ||
    HOST_ALLOWLIST.some(
      (s) => (s.startsWith('.') && host.endsWith(s)) || (!s.startsWith('.') && host.startsWith(s)),
    );
  if (!allowed) {
    return jsonError(400, {
      code: 'bad_request',
      message: '上游主机名不在允许列表中',
      retryable: false,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  request.signal.addEventListener('abort', () => controller.abort());

  try {
    const upstream = await fetch(target, {
      method: 'GET',
      signal: controller.signal,
      headers: { accept: 'image/*,*/*;q=0.8' },
      redirect: 'follow',
    });
    clearTimeout(timer);

    if (!upstream.ok || !upstream.body) {
      return jsonError(502, {
        code: 'network',
        message: `上游返回 ${upstream.status}`,
        retryable: true,
      });
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (contentType && !/^image\//i.test(contentType)) {
      return jsonError(502, {
        code: 'upstream',
        message: '上游返回的不是图片资源',
        retryable: false,
      });
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=86400, immutable',
        'access-control-allow-origin': '*',
      },
    });
  } catch (error) {
    clearTimeout(timer);
    const aborted = error instanceof Error && /abort/i.test(error.message);
    return jsonError(aborted ? 504 : 502, {
      code: aborted ? 'timeout' : 'network',
      message: aborted ? '图片代理超时' : '图片代理失败',
      retryable: true,
    });
  }
}
