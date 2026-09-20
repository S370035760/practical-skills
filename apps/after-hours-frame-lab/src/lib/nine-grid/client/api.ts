/**
 * 前端 API 客户端：负责取消、超时与错误归一化。
 * 任何接口失败都抛出结构化 GenError，调用方必须如实展示，禁止当成功处理。
 */
import type {
  AnchorResult,
  FrameResult,
  GenerateOptions,
  GenError,
} from '../types';

export interface Capabilities {
  live: boolean;
  demo: boolean;
  provider: string;
  supportsReferenceImage: boolean;
  supportsSeed: boolean;
  nativeAspect: string;
}

export class GenerationError extends Error implements GenError {
  code: GenError['code'];
  retryable: boolean;
  constructor(error: GenError) {
    super(error.message);
    this.name = 'GenerationError';
    this.code = error.code;
    this.retryable = error.retryable;
  }
}

async function readError(response: Response): Promise<GenError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const maybe = (body as { error?: GenError } | null)?.error;
  if (maybe && typeof maybe.code === 'string') {
    return {
      code: maybe.code as GenError['code'],
      message: maybe.message,
      retryable: maybe.retryable ?? response.status < 500,
    };
  }
  if (response.status === 429) {
    return { code: 'rate_limited', message: '触发限流，请稍后再试', retryable: true };
  }
  if (response.status >= 500) {
    return { code: 'upstream', message: `服务异常（${response.status}）`, retryable: true };
  }
  return { code: 'unknown', message: `请求失败（${response.status}）`, retryable: true };
}

async function postJson<T>(
  path: string,
  payload: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new GenerationError({ code: 'cancelled', message: '已取消', retryable: false });
    }
    throw new GenerationError({
      code: 'network',
      message: '网络连接失败，请检查网络后重试',
      retryable: true,
    });
  }
  if (!response.ok) {
    throw new GenerationError(await readError(response));
  }
  return (await response.json()) as T;
}

export function fetchCapabilities(signal?: AbortSignal): Promise<Capabilities> {
  return fetch('/api/capabilities', { signal }).then((r) => {
    if (!r.ok) throw new Error('capabilities_failed');
    return r.json() as Promise<Capabilities>;
  });
}

export function generateAnchor(
  options: GenerateOptions,
  signal?: AbortSignal,
): Promise<AnchorResult> {
  return postJson<AnchorResult>('/api/anchor', { options }, signal);
}

export function generateFrame(
  index: number,
  options: GenerateOptions,
  anchorUrl: string | null,
  signal?: AbortSignal,
): Promise<FrameResult> {
  return postJson<FrameResult>(
    '/api/frame',
    { index, options, anchorUrl },
    signal,
  );
}
