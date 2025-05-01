import { getOrientedSize } from './brickUtils.js';

const gridSize = 10;
const gridHeight = 10;

// Initialize a 3D occupancy grid
export function initializeGrid() {
  return Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () =>
      Array(gridHeight).fill(false)
    )
  );
}

// Check if placement is supported (at least one stud supported below)
export function isPlacementClear(x, y, z, size, orientation, occupancyGrid) {
  const [w, l] = getOrientedSize(size, orientation);
  const gridWidth = occupancyGrid.length;
  const gridHeight = occupancyGrid[0]?.length ?? 0;

  if (z > 9) return false;

  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < l; dy++) {
      let gx = x;
      let gy = y;

      if (orientation === 'HORIZONTAL') {
        gx = x + dx;
        gy = y + dy;
      } else if (orientation === 'VERTICAL') {
        gx = x + dy;
        gy = y + dx;
      }

      if (
        gx < 0 || gx >= gridWidth ||
        gy < 0 || gy >= gridHeight ||
        !occupancyGrid[gx]?.[gy] ||
        occupancyGrid[gx][gy][z]
      ) {
        return false;
      }
    }
  }

  return true;
}


export function isPlacementSupported(x, y, z, size, orientation, occupancyGrid) {
  const [w, l] = getOrientedSize(size, orientation);
  if (z === 0) return true;

  const gridWidth = occupancyGrid.length;
  const gridHeight = occupancyGrid[0]?.length ?? 0;

  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < l; dy++) {
      let gx = x;
      let gy = y;

      if (orientation === 'HORIZONTAL') {
        gx = x + dx;
        gy = y + dy;
      } else if (orientation === 'VERTICAL') {
        gx = x + dy;
        gy = y + dx;
      }

      if (
        gx >= 0 && gx < gridWidth &&
        gy >= 0 && gy < gridHeight &&
        occupancyGrid[gx]?.[gy]?.[z - 1]
      ) {
        return true;
      }
    }
  }

  return false;
}


export function markPlacement(x, y, z, size, orientation, occupancyGrid) {
  const [w, l] = getOrientedSize(size, orientation);

  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < l; dy++) {
      let gx = x;
      let gy = y;

      if (orientation === 'HORIZONTAL') {
        gx = x + dx;
        gy = y + dy;
      } else if (orientation === 'VERTICAL') {
        gx = x + dy;
        gy = y + dx;
      }

      if (!occupancyGrid[gx]) occupancyGrid[gx] = [];
      if (!occupancyGrid[gx][gy]) occupancyGrid[gx][gy] = [];

      occupancyGrid[gx][gy][z] = true;
    }
  }
}
