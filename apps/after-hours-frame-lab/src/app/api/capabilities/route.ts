import { NextResponse } from 'next/server';
import { isProviderLikelyConfigured } from '@/server/provider/image-provider';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 轻量能力探测：告诉前端当前部署是否具备真实生图凭据。
 * 沙箱运行时通常自动注入；真实调用若失败会由 /api/frame 返回明确错误，
 * 前端必须据此把格子标红，而不是伪装成功。
 */
export async function GET() {
  return NextResponse.json({
    live: isProviderLikelyConfigured(),
    demo: true,
    provider: 'coze-seedream',
    supportsReferenceImage: true,
    supportsSeed: false,
    nativeAspect: '9:16',
  });
}
