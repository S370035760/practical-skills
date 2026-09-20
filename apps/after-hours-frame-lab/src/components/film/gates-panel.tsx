'use client';

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { LIB_GATES, SUBMISSION_CHECKLIST } from '@/lib/film/script';

interface GatesPanelProps {
  meetsMinDuration: boolean;
  totalDuration: number;
  libRatioPercent: number;
  libPassed: boolean;
  demoMode: boolean;
  checklist: Record<string, boolean>;
  onToggleCheck: (id: string) => void;
}

export function GatesPanel({
  meetsMinDuration,
  totalDuration,
  libRatioPercent,
  libPassed,
  demoMode,
  checklist,
  onToggleCheck,
}: GatesPanelProps) {
  const autoState = (id: string): boolean | null => {
    if (id === 'duration') return meetsMinDuration;
    if (id === 'ratio') return libPassed;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* LibTV 硬门槛 */}
      <div className="border border-border bg-tray">
        <div className="border-b border-border px-3 py-2 font-mono text-[10px] tracking-[0.25em] text-[#8a8478]">
          LIBTV 活动硬门槛
        </div>
        <ul className="divide-y divide-border">
          {LIB_GATES.map((gate) => {
            const state = autoState(gate.id);
            return (
              <li key={gate.id} className="flex items-start gap-2.5 px-3 py-2.5">
                {state === null ? (
                  <Info className="mt-0.5 size-4 shrink-0 text-[#6f6a60]" />
                ) : state ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-paper" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-safelight" />
                )}
                <div>
                  <p className="text-xs font-medium text-paper">{gate.label}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#8a8478]">{gate.detail}</p>
                  {gate.id === 'duration' && (
                    <p className="mt-1 font-mono text-[10px] text-[#6f6a60]">当前方案：{totalDuration}s</p>
                  )}
                  {gate.id === 'ratio' && (
                    <p className="mt-1 font-mono text-[10px] text-[#6f6a60]">
                      本地合成不计入；当前标记 {libRatioPercent}%
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {demoMode && (
          <p className="border-t border-safelight/30 bg-safelight/10 px-3 py-2 text-[11px] leading-relaxed text-safelight">
            当前为 DEMO 素材，仅用于验证预览与导出流程，不能作为 LibTV 正式投稿内容。
          </p>
        )}
      </div>

      {/* 合规与投稿自检 */}
      <div className="border border-border bg-tray">
        <div className="border-b border-border px-3 py-2 font-mono text-[10px] tracking-[0.25em] text-[#8a8478]">
          合规提示 · 投稿自检
        </div>
        <ul className="divide-y divide-border">
          {SUBMISSION_CHECKLIST.map((item) => {
            const checked = !!checklist[item.id];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onToggleCheck(item.id)}
                  className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-white/[0.02]"
                >
                  <span
                    className={[
                      'mt-0.5 flex size-4 shrink-0 items-center justify-center border text-[9px]',
                      checked ? 'border-paper bg-paper text-ink' : 'border-[#4a463c] text-transparent',
                    ].join(' ')}
                  >
                    ✓
                  </span>
                  <span className="text-[11px] leading-relaxed text-[#c9c2b4]">
                    {item.label}
                    {item.required && <span className="ml-1 font-mono text-[9px] text-safelight">硬性</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-border px-3 py-2 text-[10px] leading-relaxed text-[#5d584f]">
          本工具不会上传 LibTV、不代提交活动表单、不提供去水印；请自行确认模型 / LoRA / 工作流商用许可。
        </p>
      </div>
    </div>
  );
}
