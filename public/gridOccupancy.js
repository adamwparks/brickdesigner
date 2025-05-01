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
export function isPlacementSupported(x, y, z, size, orientation, occupancyGrid) {
  const [w, l] = getOrientedSize(size, orientation);

  // Base layer is always supported
  if (z === 0) return true;

  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < l; dy++) {
      const gx = x + dx;
      const gy = y + dy;

      // Check for a brick directly underneath
      if (occupancyGrid[gx]?.[gy]?.[z - 1]) {
        return true;
      }
    }
  }

  // No studs below at any location
  return false;
}


export function isPlacementClear(x, y, z, size, orientation, occupancyGrid) {
  const [w, l] = getOrientedSize(size, orientation);
  const gridWidth = occupancyGrid.length;
  const gridHeight = occupancyGrid[0]?.length ?? 0;

  if (x + w > gridWidth || y + l > gridHeight) return false;

  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < l; dy++) {
      const gx = x + dx;
      const gy = y + dy;
      if (!occupancyGrid[gx]?.[gy]) return false;
      if (occupancyGrid[gx][gy][z]) return false;
    }
  }
  return true;
}

export function markPlacement(x, y, z, size, orientation, occupancyGrid) {
  const [w, l] = getOrientedSize(size, orientation);
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < l; dy++) {
      const gx = x + dx;
      const gy = y + dy;
      if (!occupancyGrid[gx]) occupancyGrid[gx] = [];
      if (!occupancyGrid[gx][gy]) occupancyGrid[gx][gy] = [];
      occupancyGrid[gx][gy][z] = true;
    }
  }
}
