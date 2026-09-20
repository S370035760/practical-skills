'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { frameDirectives } from '@/lib/nine-grid/prompts';
import { DEFAULT_OPTIONS } from '@/lib/nine-grid/types';
import type {
  FrameImage,
  FrameState,
  FrameStatus,
  GenerateOptions,
  GenError,
  ProviderMode,
} from '@/lib/nine-grid/types';
import {
  fetchCapabilities,
  generateAnchor,
  generateFrame,
  GenerationError,
  type Capabilities,
} from '@/lib/nine-grid/client/api';
import { DEMO_FRAME_FILES } from '@/lib/nine-grid/demo-manifest';

const CONCURRENCY = 3;

function initialFrames(): FrameState[] {
  return frameDirectives.map((directive) => ({
    directive,
    status: 'idle' satisfies FrameStatus,
    image: null,
    errorCode: null,
    errorMessage: null,
  }));
}

function patchFrame(
  frames: FrameState[],
  index: number,
  patch: Partial<FrameState>,
): FrameState[] {
  return frames.map((frame, i) => (i === index ? { ...frame, ...patch } : frame));
}

export type AnchorStatus = 'none' | 'generating' | 'done' | 'error';

export interface UseNineGrid {
  capabilities: Capabilities | null;
  options: GenerateOptions;
  frames: FrameState[];
  anchorStatus: AnchorStatus;
  anchorUrl: string | null;
  running: boolean;
  online: boolean;
  progress: { done: number; error: number; total: number };
  setOptions: (patch: Partial<GenerateOptions>) => void;
  patchStyle: (patch: Partial<GenerateOptions['style']>) => void;
  switchMode: (mode: ProviderMode) => void;
  lockAnchor: () => Promise<void>;
  generateAll: () => void;
  regenerateOne: (index: number) => void;
  cancelAll: () => void;
  resetAll: () => void;
  /** 直接载入 9 张内置演示素材（不调用任何 API、不依赖密钥） */
  loadDemo: () => void;
}

export function useNineGridGenerator(): UseNineGrid {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [options, setOptionsState] = useState<GenerateOptions>(DEFAULT_OPTIONS);
  const [frames, setFrames] = useState<FrameState[]>(initialFrames);
  const [anchorStatus, setAnchorStatus] = useState<AnchorStatus>('none');
  const [anchorUrl, setAnchorUrl] = useState<string | null>(null);
  const [anchorRemoteUrl, setAnchorRemoteUrl] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [online, setOnline] = useState(true);

  const controllersRef = useRef<Map<number, AbortController>>(new Map());
  const anchorControllerRef = useRef<AbortController | null>(null);
  const batchTokenRef = useRef(0);
  const optionsRef = useRef(options);
  const anchorRef = useRef<{ url: string | null; remote: string | null }>({
    url: null,
    remote: null,
  });
  optionsRef.current = options;
  anchorRef.current = { url: anchorUrl, remote: anchorRemoteUrl };

  // 能力探测 + 在线状态
  useEffect(() => {
    const controller = new AbortController();
    fetchCapabilities(controller.signal)
      .then((caps) => {
        setCapabilities(caps);
        setOptionsState((prev) =>
          caps.live ? prev : { ...prev, mode: 'demo' },
        );
      })
      .catch(() => undefined);
    const goOnline = (): void => setOnline(true);
    const goOffline = (): void => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    setOnline(navigator.onLine);
    return () => {
      controller.abort();
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const setOptions = useCallback((patch: Partial<GenerateOptions>) => {
    setOptionsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const patchStyle = useCallback((patch: Partial<GenerateOptions['style']>) => {
    setOptionsState((prev) => ({ ...prev, style: { ...prev.style, ...patch } }));
  }, []);

  const switchMode = useCallback((mode: ProviderMode) => {
    setOptionsState((prev) => ({ ...prev, mode }));
    setFrames(initialFrames());
    setAnchorUrl(null);
    setAnchorRemoteUrl(null);
    setAnchorStatus('none');
  }, []);

  const resetAll = useCallback(() => {
    controllersRef.current.forEach((c) => c.abort());
    controllersRef.current.clear();
    anchorControllerRef.current?.abort();
    batchTokenRef.current += 1;
    setFrames(initialFrames());
    setRunning(false);
    setAnchorUrl(null);
    setAnchorRemoteUrl(null);
    setAnchorStatus('none');
  }, []);

  const cancelAll = useCallback(() => {
    batchTokenRef.current += 1;
    controllersRef.current.forEach((c) => c.abort());
    controllersRef.current.clear();
    anchorControllerRef.current?.abort();
    setRunning(false);
    setFrames((prev) =>
      prev.map((frame) =>
        frame.status === 'generating' || frame.status === 'queued'
          ? { ...frame, status: 'idle', errorCode: null, errorMessage: null }
          : frame,
      ),
    );
    setAnchorStatus((prev) => (prev === 'generating' ? 'none' : prev));
  }, []);

  /** 锁定 / 重新锁定身份基准 */
  const lockAnchor = useCallback(async (): Promise<void> => {
    const current = optionsRef.current;
    if (current.mode === 'demo' || !current.consistency || current.referenceUrl) {
      // demo 与自填 reference 不需要真正拍摄 anchor
      setAnchorStatus('none');
      setAnchorUrl(null);
      setAnchorRemoteUrl(null);
      return;
    }
    anchorControllerRef.current?.abort();
    const controller = new AbortController();
    anchorControllerRef.current = controller;
    setAnchorStatus('generating');
    try {
      const anchor = await generateAnchor(current, controller.signal);
      setAnchorUrl(anchor.url);
      setAnchorRemoteUrl(anchor.remoteUrl ?? null);
      setAnchorStatus('done');
    } catch (error) {
      if (error instanceof GenerationError && error.code === 'cancelled') {
        setAnchorStatus('none');
      } else {
        setAnchorStatus('error');
      }
    }
  }, []);

  /** 生成单格（内部）。返回是否成功。 */
  const runFrame = useCallback(
    async (index: number, token: number): Promise<boolean> => {
      const controller = new AbortController();
      controllersRef.current.set(index, controller);
      setFrames((prev) => patchFrame(prev, index, { status: 'generating' }));
      try {
        const result = await generateFrame(
          index,
          optionsRef.current,
          anchorRef.current.remote,
          controller.signal,
        );
        if (token !== batchTokenRef.current) return false;
        const image: FrameImage = {
          url: result.url,
          remoteUrl: result.remoteUrl,
          mode: result.mode,
          seed: result.seed ?? null,
        };
        setFrames((prev) =>
          patchFrame(prev, index, {
            status: 'done',
            image,
            errorCode: null,
            errorMessage: null,
          }),
        );
        return true;
      } catch (error) {
        if (token !== batchTokenRef.current) return false;
        const genError: GenError =
          error instanceof GenerationError
            ? { code: error.code, message: error.message, retryable: error.retryable }
            : { code: 'unknown', message: '未知错误', retryable: true };
        if (genError.code === 'cancelled') {
          setFrames((prev) =>
            patchFrame(prev, index, {
              status: 'idle',
              errorCode: null,
              errorMessage: null,
            }),
          );
        } else {
          setFrames((prev) =>
            patchFrame(prev, index, {
              status: 'error',
              errorCode: genError.code,
              errorMessage: genError.message,
            }),
          );
        }
        return false;
      } finally {
        controllersRef.current.delete(index);
      }
    },
    [],
  );

  /** 批量生成（并发 CONCURRENCY），失败格不影响其他格 */
  const runBatch = useCallback(
    async (targets: number[]): Promise<void> => {
      const token = batchTokenRef.current;
      setRunning(true);
      setFrames((prev) =>
        prev.map((frame, i) =>
          targets.includes(i)
            ? {
                ...frame,
                status: 'queued' satisfies FrameStatus,
                errorCode: null,
                errorMessage: null,
              }
            : frame,
        ),
      );

      // live + 一致性开关：先确保 anchor 就绪
      const current = optionsRef.current;
      if (
        current.mode === 'live' &&
        current.consistency &&
        !current.referenceUrl &&
        !anchorRef.current.remote
      ) {
        try {
          setAnchorStatus('generating');
          const anchor = await generateAnchor(current);
          if (token !== batchTokenRef.current) return;
          setAnchorUrl(anchor.url);
          setAnchorRemoteUrl(anchor.remoteUrl ?? null);
          setAnchorStatus('done');
        } catch (error) {
          if (token !== batchTokenRef.current) return;
          setAnchorStatus('error');
          const message =
            error instanceof GenerationError ? error.message : '身份基准拍摄失败';
          setFrames((prev) =>
            prev.map((frame, i) =>
              targets.includes(i)
                ? { ...frame, status: 'error', errorCode: 'upstream', errorMessage: message }
                : frame,
            ),
          );
          setRunning(false);
          return;
        }
      }

      let cursor = 0;
      const workers = Array.from({ length: Math.min(CONCURRENCY, targets.length) }, async () => {
        while (true) {
          if (token !== batchTokenRef.current) return;
          const next = targets[cursor];
          cursor += 1;
          if (next === undefined) return;
          await runFrame(next, token);
        }
      });
      await Promise.all(workers);
      if (token === batchTokenRef.current) setRunning(false);
    },
    [runFrame],
  );

  const generateAll = useCallback(() => {
    if (running) return;
    batchTokenRef.current += 1;
    void runBatch(frameDirectives.map((f) => f.index));
  }, [runBatch, running]);

  const regenerateOne = useCallback(
    (index: number) => {
      // 单格重生成：保留 anchor 与其他 8 格；若正在批量，先作废旧批次
      batchTokenRef.current += 1;
      controllersRef.current.forEach((c, i) => {
        if (i !== index) c.abort();
      });
      controllersRef.current.clear();
      setRunning(false);
      void runBatch([index]);
    },
    [runBatch],
  );

  const loadDemo = useCallback(() => {
    batchTokenRef.current += 1;
    controllersRef.current.forEach((c) => c.abort());
    controllersRef.current.clear();
    anchorControllerRef.current?.abort();
    setRunning(false);
    setOptionsState((prev) => ({ ...prev, mode: 'demo' }));
    setAnchorStatus('none');
    setAnchorUrl(null);
    setAnchorRemoteUrl(null);
    setFrames(
      frameDirectives.map((directive, index) => ({
        directive,
        status: 'done' satisfies FrameStatus,
        image: {
          url: DEMO_FRAME_FILES[index] ?? '',
          mode: 'demo' as const,
        },
        errorCode: null,
        errorMessage: null,
      })),
    );
  }, []);

  useEffect(() => {
    return () => {
      controllersRef.current.forEach((c) => c.abort());
      anchorControllerRef.current?.abort();
    };
  }, []);

  const progress = useMemo(() => {
    return {
      done: frames.filter((f) => f.status === 'done').length,
      error: frames.filter((f) => f.status === 'error').length,
      total: frames.length,
    };
  }, [frames]);

  return {
    capabilities,
    options,
    frames,
    anchorStatus,
    anchorUrl,
    running,
    online,
    progress,
    setOptions,
    patchStyle,
    switchMode,
    lockAnchor,
    generateAll,
    regenerateOne,
    cancelAll,
    resetAll,
    loadDemo,
  };
}
