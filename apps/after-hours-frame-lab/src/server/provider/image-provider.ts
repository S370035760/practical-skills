/**
 * 生图 provider adapter（仅服务端）。
 *
 * 当前实现：coze-coding-dev-sdk（SeeDream）。
 * - 身份锁定通过「先生成 anchor，再用 anchor URL 作为参考图」完成。
 * - 不暴露任何密钥给客户端；凭据由平台运行时注入，或用 COZE_API_TOKEN /
 *   COZE_INTEGRATION_BASE_URL 在自托管时覆盖。
 * - 所有异常被归一化为 GenError，绝不伪装成功。
 */
import 'server-only';
import {
  APIError,
  Config,
  ConfigurationError,
  HeaderUtils,
  ImageGenerationClient,
  NetworkError,
  ValidationError,
} from 'coze-coding-dev-sdk';
import type { GenError } from '@/lib/nine-grid/types';

export interface ProviderImage {
  url: string;
}

export interface GenerateParams {
  prompt: string;
  /** 参考图 URL（anchor 或用户自填），用于身份锁定 */
  referenceUrl?: string | null;
  /** 透传的请求头（追踪 / 鉴权） */
  forwardHeaders: Record<string, string>;
  /** 单次上游超时 ms */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 90_000;

/** 竖版 9:16 原生尺寸（provider 自定义尺寸下限 1440 短边） */
export const PORTRAIT_SIZE = '1440x2560';

/**
 * 运行环境是否可能具备 provider 凭据。
 * 沙箱运行时由 SDK 自动注入 projectRuntimeAuth；自托管需要 COZE_API_TOKEN。
 */
export function isProviderLikelyConfigured(): boolean {
  if (process.env.COZE_API_TOKEN) return true;
  if (process.env.COZE_PROJECT_TYPE || process.env.COZE_EVAL) return true;
  // 平台沙箱的运行时鉴权存在与否，最终以真实调用为准；这里给出保守乐观值，
  // 由 capabilities 接口做轻量探测/由真实错误兜底。
  return Boolean(process.env.COZE_WORKSPACE_PATH || process.env.COZE_PROJECT_ENV);
}

function toGenError(error: unknown): GenError {
  if (error instanceof APIError) {
    const status = error.statusCode ?? 0;
    const raw = `${error.message ?? ''} ${JSON.stringify(error.response ?? {})}`.toLowerCase();
    if (status === 408 || /timeout|timed out|deadline/.test(raw)) {
      return { code: 'timeout', message: '生成超时，请重试该格', retryable: true };
    }
    if (status === 429 || /rate.?limit|too many requests|quota/.test(raw)) {
      return { code: 'rate_limited', message: '触发模型限流，请稍后重试该格', retryable: true };
    }
    if (
      status === 400 ||
      status === 422 ||
      /content.?policy|sensitive|risk|review|moderation|violat/.test(raw)
    ) {
      // 400 在 SeeDream 上也用于内容审核拒绝
      if (/content.?policy|sensitive|risk|review|moderation|violat/.test(raw)) {
        return {
          code: 'content_policy',
          message: '提示词未通过内容审核，已拒绝该格',
          retryable: false,
        };
      }
      return { code: 'bad_request', message: `请求被模型拒绝：${error.message}`, retryable: false };
    }
    if (status === 401 || status === 403) {
      return { code: 'not_configured', message: '生图凭据缺失或无效，请检查 Provider 配置', retryable: false };
    }
    if (status >= 500) {
      return { code: 'upstream', message: `模型服务暂时异常（${status}），可重试`, retryable: true };
    }
    return { code: 'upstream', message: error.message || '模型调用失败', retryable: true };
  }
  if (error instanceof NetworkError) {
    return { code: 'network', message: '网络异常或连接中断，请检查网络后重试', retryable: true };
  }
  if (error instanceof ConfigurationError || error instanceof ValidationError) {
    return { code: 'not_configured', message: error.message, retryable: false };
  }
  if (error instanceof Error) {
    if (/aborted|cancel|abort/i.test(error.message)) {
      return { code: 'cancelled', message: '已取消生成', retryable: false };
    }
    if (/timeout|timed out/i.test(error.message)) {
      return { code: 'timeout', message: '生成超时，请重试该格', retryable: true };
    }
    return { code: 'unknown', message: error.message, retryable: true };
  }
  return { code: 'unknown', message: '未知错误', retryable: true };
}

/**
 * 生成单张图。失败抛 GenError（throw），调用方负责把它转成对应 HTTP 状态。
 */
export async function generateImage(params: GenerateParams): Promise<ProviderImage> {
  const config = new Config({ timeout: params.timeoutMs ?? DEFAULT_TIMEOUT_MS });
  const client = new ImageGenerationClient(config, params.forwardHeaders, false);

  let response;
  try {
    response = await client.generate({
      prompt: params.prompt,
      size: PORTRAIT_SIZE,
      watermark: false,
      responseFormat: 'url',
      optimizePromptMode: 'standard',
      ...(params.referenceUrl ? { image: params.referenceUrl } : {}),
    });
  } catch (error) {
    throw toGenError(error);
  }

  const helper = client.getResponseHelper(response);
  if (!helper.success) {
    const message = helper.errorMessages.join('; ') || '模型未返回图片';
    const lower = message.toLowerCase();
    if (/content.?policy|sensitive|risk|review|moderation|violat/.test(lower)) {
      throw { code: 'content_policy', message: '提示词未通过内容审核，已拒绝该格', retryable: false } satisfies GenError;
    }
    if (/rate.?limit|too many|quota/.test(lower)) {
      throw { code: 'rate_limited', message: '触发模型限流，请稍后重试该格', retryable: true } satisfies GenError;
    }
    throw { code: 'upstream', message, retryable: true } satisfies GenError;
  }
  const url = helper.imageUrls[0];
  if (!url) {
    throw { code: 'upstream', message: '模型返回为空', retryable: true } satisfies GenError;
  }
  return { url };
}

export { HeaderUtils };
