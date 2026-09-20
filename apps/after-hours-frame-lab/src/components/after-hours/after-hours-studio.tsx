'use client';

import { useMemo, useState } from 'react';
import { Copy, Download, Heart, ImageIcon, Lock, LockOpen, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { useAfterHours } from '@/hooks/use-after-hours';
import { LAYER_KEYS, type LayerKey, type StoryCard } from '@/lib/after-hours/types';

const LAYER_LABEL: Record<LayerKey, string> = {
  task: '社交任务',
  phase: '时段叙事',
  space: '空间气质',
  moment: '人物瞬间',
  trace: '成像痕迹',
};

export function AfterHoursStudio() {
  const a = useAfterHours();

  return (
    <div className="afhl rounded-2xl p-4 sm:p-6 lg:p-8">
      <Header a={a} />
      {!a.entered ? <MoodGate a={a} /> : <Studio a={a} />}
      <SafetyNote />
    </div>
  );
}

function Header(props: { a: ReturnType<typeof useAfterHours> }) {
  const { a } = props;
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="font-mono text-[10px] tracking-[0.4em] text-[var(--af-gold)]">
          AFTER HOURS FRAME LAB
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          夜幕抓拍实验室
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--af-mist)]">
          成年都市社交纪实影像方案生成器：把一次晚间小聚切成五层情境规则，一键生成结构化拍摄故事卡与原创成像指令。
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[rgba(216,169,78,0.4)] px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-[var(--af-gold-soft)]">
          {a.live ? 'LIVE · 已配置生图' : 'DEMO · 未配置生图'}
        </span>
      </div>
      <div className="afhl-panel flex flex-wrap items-center gap-3 px-4 py-3 text-xs">
        <label className="flex items-center gap-2 text-[var(--af-mist)]">
          <input
            type="checkbox"
            checked={a.randomSeed}
            onChange={(e) => a.setRandomSeed(e.target.checked)}
            className="accent-[var(--af-gold)]"
          />
          随机种子
        </label>
        {!a.randomSeed && (
          <label className="flex items-center gap-2 text-[var(--af-mist)]">
            seed
            <input
              type="number"
              value={a.fixedSeed}
              onChange={(e) => a.setFixedSeed(Number(e.target.value) || 0)}
              className="w-28 rounded-md border border-[rgba(140,163,189,0.3)] bg-[rgba(10,21,38,0.6)] px-2 py-1 font-mono text-[var(--af-ice)]"
            />
          </label>
        )}
        <span className="font-mono text-[var(--af-mist)]">当前 seed: {a.seedInUse}</span>
      </div>
    </div>
  );
}

function MoodGate(props: { a: ReturnType<typeof useAfterHours> }) {
  const { a } = props;
  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-4 text-lg font-medium text-[var(--af-ice)]">
        先选「今晚想记录的感觉」，再进入生成台
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {a.moods.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => a.enter(m.key)}
            className="afhl-panel group flex flex-col items-start gap-2 p-5 text-left transition-colors hover:border-[rgba(216,169,78,0.5)]"
          >
            <Sparkles className="size-5 text-[var(--af-gold)] transition-transform group-hover:scale-110" />
            <span className="text-base font-medium text-[var(--af-ice)]">{m.labelZh}</span>
            <span className="font-mono text-[10px] tracking-widest text-[var(--af-mist)]">
              {m.labelEn}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Studio(props: { a: ReturnType<typeof useAfterHours> }) {
  const { a } = props;
  const [showHistory, setShowHistory] = useState(true);

  return (
    <div className="flex flex-col gap-6">
      {/* 工具栏 */}
      <Toolbar a={a} />

      {/* 五层锁定条 */}
      <LayerStrip a={a} />

      {/* 警告 */}
      {a.warnings.length > 0 && (
        <div className="rounded-md border border-[rgba(216,169,78,0.4)] bg-[rgba(216,169,78,0.08)] px-3 py-2 text-xs text-[var(--af-gold-soft)]">
          {a.warnings.map((w, i) => (
            <div key={i}>· {w}</div>
          ))}
        </div>
      )}

      {/* 故事卡 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {a.cards.length === 0 ? (
          <div className="afhl-panel p-8 text-center text-sm text-[var(--af-mist)]">
            点击「生成一组」开始，每次都会避开最近 20 组组合。
          </div>
        ) : (
          a.cards.map((card) => <StoryCardView key={card.id} a={a} card={card} />)
        )}
      </div>

      {/* 历史与收藏 */}
      <section>
        <button
          type="button"
          className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--af-ice)]"
          onClick={() => setShowHistory((s) => !s)}
        >
          <RefreshCw className="size-4 text-[var(--af-gold)]" />
          最近 {a.history.length}/20 组历史 · 收藏 {a.favorites.length}
          <span className="text-[var(--af-mist)]">{showHistory ? '收起' : '展开'}</span>
        </button>
        {showHistory && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {a.history.map((h) => (
              <div
                key={h.id}
                className="afhl-panel px-3 py-2 font-mono text-[10px] leading-relaxed text-[var(--af-mist)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[var(--af-ice)]">
                    {h.layers.task.labelZh} · {h.layers.phase.labelZh}
                  </span>
                  <button
                    type="button"
                    onClick={() => a.toggleFavorite(h.id)}
                    className="text-[var(--af-gold)]"
                    aria-label={h.favorite ? '取消收藏' : '收藏'}
                  >
                    <Heart className={`size-3.5 ${h.favorite ? 'fill-[var(--af-gold)]' : ''}`} />
                  </button>
                </div>
                {h.layers.moment.labelZh} / {h.layers.trace.labelZh} / 人数 {h.cross.persons}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Toolbar(props: { a: ReturnType<typeof useAfterHours> }) {
  const { a } = props;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="afhl-panel inline-flex overflow-hidden rounded-full">
          {([1, 4, 9] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => a.setBatchSize(n)}
              className={[
                'px-4 py-1.5 text-xs font-medium transition-colors',
                a.batchSize === n ? 'bg-[var(--af-gold)] text-[var(--af-navy)]' : 'text-[var(--af-mist)]',
              ].join(' ')}
            >
              {n === 1 ? '单张' : n === 4 ? '四张' : '九张'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={a.generate}
          className="afhl-btn primary inline-flex items-center gap-2 px-5 py-2 text-sm"
        >
          <Wand2 className="size-4" />
          生成一组
        </button>
      </div>

      {/* 跨维度控制 */}
      <div className="afhl-panel flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono tracking-wide text-[var(--af-mist)]">人数</span>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => a.setCross({ persons: n })}
              className={`afhl-chip px-2 py-0.5 text-[11px] ${a.crossPrefs.persons === n ? 'sel' : ''}`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => a.setCross({ persons: undefined })}
            className={`afhl-chip px-2 py-0.5 text-[11px] ${a.crossPrefs.persons === undefined ? 'sel' : ''}`}
          >
            自动
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono tracking-wide text-[var(--af-mist)]">关系</span>
          {['多年老友', '平日同事', '很熟的朋友', '刚认识的新朋友', '独自一人'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => a.setCross({ relation: r })}
              className={`afhl-chip px-2 py-0.5 text-[11px] ${a.crossPrefs.relation === r ? 'sel' : ''}`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono tracking-wide text-[var(--af-mist)]">整洁度</span>
          {['收拾齐整', '自然松弛', '略带凌乱'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => a.setCross({ tidiness: t })}
              className={`afhl-chip px-2 py-0.5 text-[11px] ${a.crossPrefs.tidiness === t ? 'sel' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LayerStrip(props: { a: ReturnType<typeof useAfterHours> }) {
  const { a } = props;
  return (
    <div className="afhl-panel flex flex-col gap-2 px-4 py-3">
      <div className="text-[10px] font-mono tracking-[0.3em] text-[var(--af-mist)]">
        五层情境 · 点击单换，锁形按钮锁定该层
      </div>
      <div className="flex flex-wrap gap-2">
        {LAYER_KEYS.map((layer: LayerKey) => {
          const val = a.cards.length > 0 ? a.cards[0].layers[layer] : null;
          const locked = layer in a.locks;
          return (
            <div
              key={layer}
              className={`afhl-chip inline-flex items-center gap-2 px-3 py-1 text-xs ${locked ? 'locked' : ''}`}
            >
              <span className="text-[var(--af-mist)]">{LAYER_LABEL[layer]}:</span>
              <span className="text-[var(--af-ice)]">{val ? val.labelZh : '—'}</span>
              <button
                type="button"
                onClick={() => a.swapVariable(layer)}
                className="text-[var(--af-gold)]"
                title="换单变量"
                aria-label={`换一个${LAYER_LABEL[layer]}`}
              >
                <RefreshCw className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => a.toggleLock(layer)}
                className="text-[var(--af-gold)]"
                title={locked ? '解锁' : '锁定'}
                aria-label={`${locked ? '解锁' : '锁定'}${LAYER_LABEL[layer]}`}
              >
                {locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StoryCardView(props: { a: ReturnType<typeof useAfterHours>; card: StoryCard }) {
  const { a, card } = props;
  const r = a.renders[card.id];
  const num = card.index + 1;
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const copyPrompt = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(card.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* 剪贴板不可用时忽略 */
    }
  };

  const downloadJson = (): void => {
    const blob = new Blob([JSON.stringify(card, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${card.id}-story-card.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const layers = useMemo(() => card.layers, [card]);

  return (
    <article className="afhl-panel flex flex-col p-4 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.3em] text-[var(--af-gold)]">
          CARD {num}/{card.batchSize}
        </span>
        <button
          type="button"
          onClick={() => a.toggleFavorite(card.id)}
          className="text-[var(--af-gold)]"
          aria-label={card.favorite ? '取消收藏' : '收藏'}
        >
          <Heart className={`size-4 ${card.favorite ? 'fill-[var(--af-gold)]' : ''}`} />
        </button>
      </div>

      {/* 五层标签 */}
      <div className="mb-3 grid grid-cols-1 gap-1">
        {LAYER_KEYS.map((layer: LayerKey) => (
          <div key={layer} className="flex justify-between border-b border-[rgba(140,163,189,0.1)] pb-1">
            <span className="text-[var(--af-mist)]">{LAYER_LABEL[layer]}</span>
            <span className="text-right text-[var(--af-ice)]">
              {layers[layer].labelZh}
              <span className="ml-1.5 font-mono text-[9px] text-[var(--af-mist)]">
                {layers[layer].labelEn}
              </span>
            </span>
          </div>
        ))}
        <div className="flex justify-between pt-1">
          <span className="text-[var(--af-mist)]">数量 / 关系 / 整洁</span>
          <span className="text-right text-[var(--af-ice)]">
            {card.cross.persons} 人 · {card.cross.relation} · {card.cross.tidiness}
          </span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="text-[var(--af-mist)]">着装</span>
          <span className="text-right text-[var(--af-ice)]">{card.clothing}</span>
        </div>
      </div>

      {/* 相容性说明 */}
      <div className="mb-3 text-xs leading-relaxed text-[var(--af-mist)]">
        {card.compatibility.map((n, i) => (
          <div key={i}>· {n}</div>
        ))}
      </div>

      {/* 影像结果 */}
      <div className="mb-3 min-h-[9rem]">
        {r?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.imageUrl}
            alt={`story frame ${num}`}
            className="aspect-[9/16] w-full rounded-md object-cover border border-[rgba(140,163,189,0.2)]"
          />
        ) : r?.generating ? (
          <div className="relative flex aspect-[9/16] w-full items-center justify-center rounded-md border border-dashed border-[rgba(216,169,78,0.4)] bg-[rgba(216,169,78,0.05)] text-xs text-[var(--af-gold-soft)]">
            <span className="paper-breathe">正在成像…</span>
            <button
              type="button"
              onClick={() => a.cancelImageFor(card.id)}
              className="absolute right-2 top-2 rounded-full border border-[rgba(216,169,78,0.4)] bg-[var(--af-navy)] px-2 py-0.5 font-mono text-[9px] text-[var(--af-gold-soft)]"
            >
              取消
            </button>
          </div>
        ) : r?.error ? (
          <div className="flex flex-col gap-2 rounded-md border border-[rgba(216,169,78,0.4)] bg-[rgba(216,169,78,0.07)] p-2 text-xs text-[var(--af-gold-soft)]">
            <div>{r.error}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void a.generateImageFor(card.id)}
                className="afhl-btn inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px]"
              >
                <RefreshCw className="size-3" />
                重试
              </button>
              <span className="font-mono text-[9px] text-[var(--af-mist)]">
                {r.mode === 'demo' ? 'demo' : 'live'} · 未成功不混淆为完成
              </span>
            </div>
          </div>
        ) : (
          <div className="flex aspect-[9/16] w-full items-center justify-center rounded-md border border-dashed border-[rgba(140,163,189,0.25)] text-xs text-[var(--af-mist)]">
            点击「生成影像」渲染该卡
          </div>
        )}
      </div>

      {/* 操作栏 */}
      <div className="mt-auto flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void a.generateImageFor(card.id)}
          disabled={r?.generating}
          className="afhl-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-50"
        >
          <ImageIcon className="size-3.5" />
          生成影像
        </button>
        <button
          type="button"
          onClick={() => void copyPrompt()}
          className="afhl-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
        >
          <Copy className="size-3.5" />
          {copied ? '已复制' : '复制 Prompt'}
        </button>
        <button
          type="button"
          onClick={() => void downloadJson()}
          className="afhl-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
        >
          <Download className="size-3.5" />
          JSON
        </button>
        <button
          type="button"
          onClick={() => setShowPrompt((s) => !s)}
          className="afhl-btn px-3 py-1.5 text-xs"
        >
          {showPrompt ? '收起' : '查看完整 Prompt'}
        </button>
      </div>

      {showPrompt && (
        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-[rgba(10,21,38,0.7)] p-3 font-mono text-[10px] leading-relaxed text-[var(--af-ice)]">
          {card.prompt}
        </pre>
      )}
    </article>
  );
}

function SafetyNote() {
  return (
    <div className="mt-8 border-t border-[rgba(140,163,189,0.18)] pt-4 font-mono text-[10px] leading-relaxed tracking-wide text-[var(--af-mist)]">
      本产品只生成「25 岁以上虚构成年人」的原创都市社交纪实方案；不涉及真实私人偷拍、不提供任何可复制私密场景的叙事模板，画面规范为完整得体着装与自然体态。所有生成指令恒含不可被移除的安全块；未配置生图 Key 时为全功能 Demo，绝不伪造「已真实生成」。
    </div>
  );
}