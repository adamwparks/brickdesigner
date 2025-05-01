// gridOccupancy.js

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
export function isPlacementSupported(x, y, z, width, length, orientation, occupancyGrid) {
  if (z === 0) return true; // Ground level always supported

  let supportedStuds = 0;

  for (let dx = 0; dx < width; dx++) {
    for (let dy = 0; dy < length; dy++) {
      let nx = x;
      let ny = y;

      if (orientation === 'HORIZONTAL') {
        nx = x + dx;
        ny = y;
      } else if (orientation === 'VERTICAL') {
        nx = x;
        ny = y + dx;
      }

      if (
        nx >= 0 && ny >= 0 &&
        nx < gridSize && ny < gridSize &&
        occupancyGrid[nx] &&
        occupancyGrid[nx][ny] &&
        occupancyGrid[nx][ny][z - 1]
      ) {
        supportedStuds++;
      }      
    }
  }
  
  // If NO studs are supported at all → placement invalid immediately
  if (supportedStuds === 0) {
    return false;
  }

  return supportedStuds >= 1;
}

// Mark brick studs as occupied in the grid
export function markBrickOnGrid(x, y, z, width, length, orientation, occupancyGrid) {
  for (let dx = 0; dx < width; dx++) {
    for (let dy = 0; dy < length; dy++) {
      let nx = x;
      let ny = y;

      if (orientation === 'HORIZONTAL') {
        nx = x + dx;
        ny = y;
      } else if (orientation === 'VERTICAL') {
        nx = x;
        ny = y + dx;
      }

      if (
        nx >= 0 && ny >= 0 &&
        nx < gridSize && ny < gridSize &&
        occupancyGrid[nx] &&
        occupancyGrid[nx][ny]
      ) {
        occupancyGrid[nx][ny][z] = true;
      }      
    }
  }
}

export function isPlacementClear(x, y, z, width, length, orientation, occupancyGrid) {
  // Swap width and length if vertical
  let w = width;
  let l = length;
  if (orientation === 'VERTICAL') {
    [w, l] = [l, w];
  }

  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < l; dy++) {
      const gx = x + dx;
      const gy = y + dy;

      // Bounds check
      if (
        gx < 0 || gy < 0 ||
        gx >= occupancyGrid.length ||
        gy >= occupancyGrid[0].length
      ) {
        return false;
      }

      // Cell existence and occupancy check
      if (!occupancyGrid[gx]?.[gy]?.[z] === undefined) continue;
      if (occupancyGrid[gx][gy][z]) {
        return false;
      }
    }
  }

  return true;
}
