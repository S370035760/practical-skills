'use client';

import { useState } from 'react';
import {
  Camera,
  ChevronDown,
  FlaskConical,
  ImageDown,
  PackageOpen,
  RefreshCcw,
  Sparkles,
  Square,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { INTENSITIES, type Intensity, type ProviderMode } from '@/lib/nine-grid/types';
import type { Capabilities } from '@/lib/nine-grid/client/api';
import type { AnchorStatus } from '@/hooks/use-nine-grid-generator';
import type { GenerateOptions } from '@/lib/nine-grid/types';

interface ControlPanelProps {
  capabilities: Capabilities | null;
  options: GenerateOptions;
  running: boolean;
  online: boolean;
  anchorStatus: AnchorStatus;
  progress: { done: number; error: number; total: number };
  onOptions: (patch: Partial<GenerateOptions>) => void;
  onStyle: (patch: Partial<GenerateOptions['style']>) => void;
  onMode: (mode: ProviderMode) => void;
  onGenerate: () => void;
  onCancel: () => void;
  onReset: () => void;
  onDownloadSheet: () => void;
  onDownloadZip: () => void;
  exporting: boolean;
  readyCount: number;
  gap: number;
  onGapChange: (gap: number) => void;
}

interface SliderRowProps {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function SliderRow({ label, hint, value, onChange, disabled }: SliderRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs text-[#c9c2b4]">{label}</Label>
        <span className="font-mono text-[10px] text-[#8a8478]">{value}</span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        onValueChange={([v]) => onChange(v ?? 0)}
      />
      <p className="text-[10px] leading-snug text-[#6f6a60]">{hint}</p>
    </div>
  );
}

export function ControlPanel(props: ControlPanelProps) {
  const {
    capabilities,
    options,
    running,
    online,
    anchorStatus,
    progress,
    onOptions,
    onStyle,
    onMode,
    onGenerate,
    onCancel,
    onReset,
    onDownloadSheet,
    onDownloadZip,
    exporting,
    readyCount,
    gap,
    onGapChange,
  } = props;
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const liveAvailable = capabilities?.live ?? true;
  const isDemo = options.mode === 'demo';

  return (
    <div className="space-y-5">
      {/* 模式 / 状态 */}
      <div className="flex items-center justify-between gap-3 border border-border rounded-md bg-tray p-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-block size-1.5 rounded-full',
                isDemo ? 'bg-safelight' : liveAvailable ? 'bg-paper' : 'bg-safelight',
              )}
            />
            <span className="font-mono text-[11px] tracking-[0.18em] text-[#c9c2b4]">
              {isDemo ? 'DEMO CONTACT SHEET' : liveAvailable ? 'LIVE PROVIDER' : 'NO CREDENTIALS'}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-[#8a8478]">
            {isDemo
              ? '使用内置演示素材验证流程，所有格子均带 DEMO 标记。'
              : `Provider：${capabilities?.provider ?? '检测中…'}，原生竖幅 ${capabilities?.nativeAspect ?? '9:16'}`}
          </p>
        </div>
        {isDemo ? (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-safelight/60 text-safelight hover:bg-safelight/10 hover:text-safelight"
            disabled={!liveAvailable || running}
            onClick={() => onMode('live')}
          >
            <Sparkles className="size-3.5" />
            真实生成
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={running}
            onClick={() => onMode('demo')}
          >
            <FlaskConical className="size-3.5" />
            演示素材
          </Button>
        )}
      </div>

      {!online && (
        <div className="flex items-center gap-2 rounded-md border border-safelight/60 bg-safelight/10 px-3 py-2 text-xs text-safelight">
          <WifiOff className="size-3.5 shrink-0" />
          网络已断开，真实生成将失败；演示素材仍可浏览与导出。
        </div>
      )}

      {/* 人物一致性 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm text-foreground">人物一致性锁定</Label>
          <p className="mt-0.5 text-[11px] leading-snug text-[#8a8478]">
            先拍摄 identity anchor，九格以参考图逐格锁定同一人、同一套服装与场景。
          </p>
        </div>
        <Switch
          checked={options.consistency}
          disabled={isDemo || running}
          onCheckedChange={(v) => onOptions({ consistency: v })}
        />
      </div>

      {options.consistency && !isDemo && anchorStatus === 'done' && (
        <div className="rounded-md border border-border bg-tray px-3 py-2 font-mono text-[10px] tracking-widest text-[#9a948a]">
          IDENTITY ANCHOR LOCKED
        </div>
      )}

      {/* 失败强度 */}
      <div className="space-y-2">
        <Label className="text-sm text-foreground">失败强度（清楚但克制）</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {INTENSITIES.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={running}
              onClick={() => onOptions({ intensity: item.value as Intensity })}
              className={cn(
                'rounded-md border px-2 py-2 text-center transition-colors disabled:opacity-50',
                options.intensity === item.value
                  ? 'border-paper bg-paper text-room'
                  : 'border-border bg-tray text-[#c9c2b4] hover:border-[#4a463c]',
              )}
            >
              <span className="block text-sm font-medium">{item.labelZh}</span>
              <span className="mt-0.5 block font-mono text-[8px] tracking-[0.2em] opacity-70">
                {item.labelEn}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 风格强度（主滑杆） */}
      <SliderRow
        label="风格强度"
        hint="颗粒 / 薄雾 / CCD 柔化的总开关；越高越像随手拍废片。"
        value={options.style.styleStrength}
        onChange={(v) => onStyle({ styleStrength: v })}
        disabled={running}
      />

      {/* 主操作 */}
      <div className="space-y-2">
        {!running ? (
          <Button
            size="lg"
            className="h-11 w-full text-sm tracking-wide"
            onClick={onGenerate}
          >
            <Camera className="size-4" />
            {progress.done > 0 ? '全部重新生成' : '生成九宫格'}
          </Button>
        ) : (
          <Button
            size="lg"
            variant="destructive"
            className="h-11 w-full bg-safelight text-sm tracking-wide hover:bg-safelight/90"
            onClick={onCancel}
          >
            <Square className="size-4" />
            取消生成
          </Button>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono text-[11px] tracking-widest text-[#9a948a]">
            {running ? (
              <span className="text-safelight">
                EXPOSING {progress.done + progress.error}/{progress.total}
              </span>
            ) : (
              <span>
                READY {progress.done}/{progress.total}
                {progress.error > 0 ? ` · FAILED ${progress.error}` : ''}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-[#9a948a] hover:text-foreground"
            disabled={running || progress.done + progress.error === 0}
            onClick={onReset}
          >
            <Trash2 className="size-3" />
            清空
          </Button>
        </div>
      </div>

      {/* 高级设置 */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-tray px-3 py-2 text-xs text-[#c9c2b4] hover:border-[#4a463c]">
          <span className="font-mono tracking-[0.15em]">ADVANCED SETTINGS</span>
          <ChevronDown
            className={cn('size-4 transition-transform', advancedOpen && 'rotate-180')}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 border-x border-b border-border rounded-b-md bg-tray/60 p-3">
          <SliderRow
            label="闪光强度"
            hint="直闪硬度：弱闪光更依赖环境光。"
            value={options.style.flash}
            onChange={(v) => onStyle({ flash: v })}
            disabled={running}
          />
          <SliderRow
            label="颗粒"
            hint="胶片 / CCD 颗粒密度。"
            value={options.style.grain}
            onChange={(v) => onStyle({ grain: v })}
            disabled={running}
          />
          <SliderRow
            label="柔焦"
            hint="早期 iPhone / CCD 的镜头软度。"
            value={options.style.softness}
            onChange={(v) => onStyle({ softness: v })}
            disabled={running}
          />
          <SliderRow
            label="留白倾向"
            hint="画面负空间偏好，影响「人太小」一类构图。"
            value={options.style.negativeSpace}
            onChange={(v) => onStyle({ negativeSpace: v })}
            disabled={running}
          />
          <SliderRow
            label="失败强度"
            hint="与上方三档同步，便于细调。"
            value={
              options.intensity === 'subtle'
                ? 25
                : options.intensity === 'standard'
                  ? 60
                  : 90
            }
            onChange={(v) =>
              onOptions({
                intensity: (v < 42 ? 'subtle' : v < 78 ? 'standard' : 'obvious') as Intensity,
              })
            }
            disabled={running}
          />
          <div className="space-y-1.5 border-t border-border pt-3">
            <Label className="text-xs text-[#c9c2b4]">Seed / Reference（可选）</Label>
            <Input
              value={options.seed ?? ''}
              disabled={running}
              placeholder="seed（当前 provider 仅记录，不保证复现）"
              onChange={(e) => onOptions({ seed: e.target.value || null })}
              className="h-8 bg-room/60 font-mono text-xs"
            />
            <Input
              value={options.referenceUrl ?? ''}
              disabled={running || isDemo}
              placeholder="https://… 自填身份参考图 URL（优先于自动 anchor）"
              onChange={(e) => onOptions({ referenceUrl: e.target.value || null })}
              className="h-8 bg-room/60 font-mono text-[11px]"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 白缝 */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label className="text-xs text-[#c9c2b4]">接触表白缝</Label>
          <span className="font-mono text-[10px] text-[#8a8478]">{gap}px</span>
        </div>
        <Slider value={[gap]} min={0} max={12} step={2} onValueChange={([v]) => onGapChange(v ?? 0)} />
        <p className="text-[10px] text-[#6f6a60]">0 = 无缝接触表；缝隙仅在网页预览与导出中可见，不会写入照片。</p>
      </div>

      {/* 导出 */}
      <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          className="h-10"
          disabled={exporting || readyCount === 0}
          onClick={onDownloadSheet}
        >
          <ImageDown className="size-4" />
          下载九宫格 PNG
        </Button>
        <Button
          variant="outline"
          className="h-10"
          disabled={exporting || readyCount === 0}
          onClick={onDownloadZip}
        >
          <PackageOpen className="size-4" />
          下载 9 张单图
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-[11px] text-[#9a948a] hover:text-foreground"
        disabled={running}
        onClick={onReset}
      >
        <RefreshCcw className="size-3" />
        清空九宫格（参数与模式保留）
      </Button>
    </div>
  );
}
