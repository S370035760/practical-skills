/**
 * 演示素材清单：真实生成并随仓库分发的 9 张 JPEG，仅用于在没有模型凭据时
 * 验证 UI、状态机与拼合导出流程。任何使用这些素材的结果都会被明确标记为 DEMO。
 */

export const DEMO_FRAME_FILES: readonly string[] = [
  '/demo/demo-1.jpg',
  '/demo/demo-2.jpg',
  '/demo/demo-3.jpg',
  '/demo/demo-4.jpg',
  '/demo/demo-5.jpg',
  '/demo/demo-6.jpg',
  '/demo/demo-7.jpg',
  '/demo/demo-8.jpg',
  '/demo/demo-9.jpg',
];

/** anchor 演示位：用第一张充当身份基准 */
export const DEMO_ANCHOR_FILE = '/demo/demo-1.jpg';

export function demoFrameUrl(index: number): string {
  if (index < 0 || index >= DEMO_FRAME_FILES.length) {
    throw new Error(`demo frame index out of range: ${index}`);
  }
  return DEMO_FRAME_FILES[index];
}
