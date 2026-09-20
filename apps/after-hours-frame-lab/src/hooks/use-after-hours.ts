'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EngineSpec, HistoryRecord, LayerKey, LockMap, StoryCard } from '@/lib/after-hours/types';
import { generateBatch, swapLayerVariable } from '@/lib/after-hours/engine';
import { sanitizeHistory, cardToHistory, validateFavorite } from '@/lib/after-hours/schema';
import { makeFingerprint } from '@/lib/after-hours/fingerprint';
import { MOODS } from '@/lib/after-hours/options-data';

const HISTORY_KEY = 'AFHL_HISTORY';
const FAV_KEY = 'AFHL_FAVORITES';
const RECENT_HISTORY = 20;

export type BatchSize = 1 | 4 | 9;

export interface CardRender {
  card: StoryCard;
  generating: boolean;
  imageUrl: string | null;
  mode: 'live' | 'demo' | null;
  error: string | null;
}

function readArray(key: string): HistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    return sanitizeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeArray(key: string, list: HistoryRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list.slice(0, RECENT_HISTORY)));
  } catch {
    /* storage 满或不可用时静默降级 */
  }
}

export function useAfterHours() {
  const [entered, setEntered] = useState(false);
  const [mood, setMoodState] = useState<string>('easy_gather');
  const [batchSize, setBatchSizeState] = useState<BatchSize>(9);
  // seed=随机, lockedSeed=固定复现
  const [randomSeed, setRandomSeed] = useState(true);
  const [fixedSeed, setFixedSeed] = useState(20240101);
  const [locks, setLocks] = useState<LockMap>({});
  const [crossPrefs, setCrossPrefs] = useState<Partial<{ persons: number; relation: string; tidiness: string }>>({});
  const [cards, setCards] = useState<StoryCard[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [renders, setRenders] = useState<Record<string, CardRender>>({});
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [favorites, setFavorites] = useState<HistoryRecord[]>([]);
  const [live, setLive] = useState(false);
  const [seedInUse, setSeedInUse] = useState(0);
  const inflightRef = useRef<Set<string>>(new Set());
  const abortRef = useRef<Record<string, AbortController>>({});

  // 初始化：读历史/收藏 + 能力探测
  useEffect(() => {
    setHistory(readArray(HISTORY_KEY));
    setFavorites(readArray(FAV_KEY));
    fetch('/api/capabilities')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLive(Boolean(d?.live)))
      .catch(() => setLive(false));
  }, []);

  const persist = useCallback((cardsList: StoryCard[]) => {
    setHistory((prev) => {
      const clean = sanitizeHistory([...cardsList.map(cardToHistory), ...prev]);
      writeArray(HISTORY_KEY, clean);
      return clean;
    });
  }, []);

  const buildSpec = useCallback(
    (seedVal: number, locksOverride?: LockMap): EngineSpec => ({
      seed: seedVal,
      batchSize,
      locks: locksOverride ?? locks,
      mood,
      cross: crossPrefs,
      avoidFingerprints: history.map((h) => h.fingerprint),
    }),
    [batchSize, locks, mood, crossPrefs, history],
  );

  const renderFromCards = (list: StoryCard[]): void => {
    setCards(list);
    setRenders((prev) => {
      const next: Record<string, CardRender> = {};
      for (const card of list) {
        next[card.id] = prev[card.id] ?? {
          card,
          generating: false,
          imageUrl: null,
          mode: null,
          error: null,
        };
      }
      return next;
    });
  };

  /** 进入生成台（先选今晚想记录的感觉） */
  const enter = useCallback((moodKey: string) => {
    setMoodState(moodKey);
    setLocks({});
    setCrossPrefs({});
    setEntered(true);
  }, []);

  /** 生成 / 全部换一组（随机新 seed） */
  const generate = useCallback(() => {
    const seedVal = randomSeed
      ? Math.floor(Math.random() * 0x7fffffff)
      : (fixedSeed || Date.now()) >>> 0;
    setSeedInUse(seedVal);
    const spec = buildSpec(seedVal);
    const { cards: list, warnings: w } = generateBatch(spec);
    renderFromCards(list);
    setWarnings(w);
    if (list.length > 0) persist(list);
  }, [buildSpec, randomSeed, fixedSeed, persist]);

  /** 换单变量：仅重选某一层，其余层不动 */
  const swapVariable = useCallback(
    (layer: LayerKey) => {
      if (cards.length === 0) return;
      const seedVal = seedInUse !== 0 ? seedInUse : (fixedSeed || Date.now()) >>> 0;
      const spec = buildSpec(seedVal);
      const { cards: list, warnings: w } = swapLayerVariable(spec, cards, layer);
      renderFromCards(list);
      setWarnings((prev) => [...w, ...prev].slice(0, 4));
    },
    [cards, buildSpec, seedInUse, randomSeed],
  );

  /** 锁定/解锁某一层：锁定到当前首卡的取值（批量在该层保持一致） */
  const toggleLock = useCallback(
    (layer: LayerKey) => {
      setLocks((prev) => {
        const next = { ...prev };
        const baseValue = cards.length > 0 ? cards[0].layers[layer].key : undefined;
        if (layer in next) delete next[layer];
        else if (baseValue) next[layer] = baseValue;
        return next;
      });
    },
    [cards],
  );

  const setCross = useCallback(
    (partial: Partial<{ persons: number; relation: string; tidiness: string }>) => {
      setCrossPrefs((prev) => ({ ...prev, ...partial }));
    },
    [],
  );

  /** 单卡生成影像（Live：调后端；Demo：无）。返回错误结构供 UI 展示。 */
  const generateImageFor = useCallback(
    async (cardId: string) => {
      if (inflightRef.current.has(cardId)) return;
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      if (!live) {
        setRenders((prev) => ({
          ...prev,
          [cardId]: { ...prev[cardId], error: '未配置生图 Key：当前为 Demo。请在环境变量配置 COZE_API_TOKEN 后再生成影像。' },
        }));
        return;
      }
      inflightRef.current.add(cardId);
      const controller = new AbortController();
      abortRef.current[cardId] = controller;
      setRenders((prev) => ({
        ...prev,
        [cardId]: { ...prev[cardId], generating: true, error: null },
      }));
      try {
        const res = await fetch('/api/after-hours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: card.prompt, cardId: card.id, seed: String(card.seed) }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = data?.error?.message ?? ('生图失败（HTTP ' + res.status + '）');
          setRenders((prev) => ({
            ...prev,
            [cardId]: { ...prev[cardId], generating: false, error: msg },
          }));
          return;
        }
        setRenders((prev) => ({
          ...prev,
          [cardId]: {
            ...prev[cardId],
            generating: false,
            imageUrl: data.imageUrl ?? data.remoteUrl ?? null,
            mode: 'live',
            error: null,
          },
        }));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setRenders((prev) => ({
            ...prev,
            [cardId]: { ...prev[cardId], generating: false, error: '已取消本次生成' },
          }));
        } else {
          setRenders((prev) => ({
            ...prev,
            [cardId]: {
              ...prev[cardId],
              generating: false,
              error: err instanceof Error ? err.message : '网络异常，请重试',
            },
          }));
        }
      } finally {
        delete abortRef.current[cardId];
        inflightRef.current.delete(cardId);
      }
    },
    [cards, live],
  );

  /** 取消某张卡的进行中生成 */
  const cancelImageFor = useCallback((cardId: string) => {
    const ctrl = abortRef.current[cardId];
    if (ctrl) ctrl.abort();
  }, []);

  const toggleFavorite = useCallback(
    (cardId: string) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      setFavorites((prev) => {
        const exists = prev.some((f) => f.id === cardId);
        let next: HistoryRecord[];
        if (exists) next = prev.filter((f) => f.id !== cardId);
        else next = [cardToHistory(card), ...prev];
        writeArray(FAV_KEY, next);
        return next;
      });
      setCards((prevCards) =>
        prevCards.map((c) => (c.id === cardId ? { ...c, favorite: !c.favorite } : c)),
      );
    },
    [cards],
  );

  const emptyFingerprints = useMemo(() => history.map((h) => h.fingerprint), [history]);

  return {
    entered,
    enter,
    mood,
    setMood: setMoodState,
    batchSize,
    setBatchSize: setBatchSizeState,
    randomSeed,
    setRandomSeed,
    fixedSeed,
    setFixedSeed,
    seedInUse,
    locks,
    toggleLock,
    crossPrefs,
    setCross,
    cards,
    warnings,
    renders,
    generate,
    swapVariable,
    generateImageFor,
    cancelImageFor,
    history,
    favorites,
    toggleFavorite,
    live,
    emptyFingerprints,
    moods: MOODS,
  };
}