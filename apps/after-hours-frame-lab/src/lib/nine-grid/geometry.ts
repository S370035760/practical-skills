/**
 * 九宫格画布几何（纯函数，便于单元测试）。
 * 导出画布固定 1080 x 1920（9:16），3 x 3。
 */

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;
export const GRID_COLS = 3;
export const GRID_ROWS = 3;

export interface CellRect {
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridGeometry {
  canvasWidth: number;
  canvasHeight: number;
  gap: number;
  marginX: number;
  marginY: number;
  cellWidth: number;
  cellHeight: number;
  cells: CellRect[];
}

/**
 * @param seamGap 格子之间窄白缝的画布像素，0 = 无缝接触表
 */
export function computeGridGeometry(seamGap = 0): GridGeometry {
  const gap = Math.max(0, Math.floor(seamGap));
  // 缝隙模式四周留与缝等宽的白边；除不尽的余数并入边距，确保严格铺满画布
  const margin = gap;
  const cellWidth = Math.floor(
    (CANVAS_WIDTH - margin * 2 - gap * (GRID_COLS - 1)) / GRID_COLS,
  );
  const cellHeight = Math.floor(
    (CANVAS_HEIGHT - margin * 2 - gap * (GRID_ROWS - 1)) / GRID_ROWS,
  );
  const usedW = cellWidth * GRID_COLS + gap * (GRID_COLS - 1);
  const usedH = cellHeight * GRID_ROWS + gap * (GRID_ROWS - 1);
  // 除不尽的余数两侧均分，保证网格居中且严格铺满
  const extraX = CANVAS_WIDTH - usedW - margin * 2;
  const extraY = CANVAS_HEIGHT - usedH - margin * 2;
  const marginX = margin + Math.floor(extraX / 2);
  const marginY = margin + Math.floor(extraY / 2);

  const cells: CellRect[] = [];
  for (let i = 0; i < GRID_COLS * GRID_ROWS; i += 1) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    cells.push({
      col,
      row,
      x: marginX + col * (cellWidth + gap),
      y: marginY + row * (cellHeight + gap),
      w: cellWidth,
      h: cellHeight,
    });
  }

  return {
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    gap,
    marginX,
    marginY,
    cellWidth,
    cellHeight,
    cells,
  };
}

export interface CoverSource {
  sW: number;
  sH: number;
  dW: number;
  dH: number;
  /** 对焦点 0-1 */
  focal: { x: number; y: number };
}

export interface CoverRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));

/**
 * 计算 cover 裁切时的源矩形：铺满目标比例，按 focal 决定保留区域。
 * 用于把方形素材裁成 9:16 竖幅。
 */
export function computeCoverRect({ sW, sH, dW, dH, focal }: CoverSource): CoverRect {
  const targetAspect = dW / dH;
  const sourceAspect = sW / sH;
  let sw: number;
  let sh: number;
  if (sourceAspect > targetAspect) {
    sh = sH;
    sw = sH * targetAspect;
  } else {
    sw = sW;
    sh = sW / targetAspect;
  }
  sw = Math.min(sw, sW);
  sh = Math.min(sh, sH);
  const fx = clamp(focal?.x ?? 0.5, 0, 1);
  const fy = clamp(focal?.y ?? 0.5, 0, 1);
  // 整数化：canvas/sharp 都需要整数像素，向下取整并贴齐右/下边缘，避免越界或亚像素缝
  sw = Math.floor(sw);
  sh = Math.floor(sh);
  const sx = Math.round(clamp((sW - sw) * fx, 0, sW - sw));
  const sy = Math.round(clamp((sH - sh) * fy, 0, sH - sh));
  return { sx, sy, sw, sh };
}
