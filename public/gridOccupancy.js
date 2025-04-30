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

      if (orientation === 'NORTH') {
        nx = x + dx;
        ny = y - dy;
      } else if (orientation === 'EAST') {
        nx = x + dy;
        ny = y + dx;
      } else if (orientation === 'SOUTH') {
        nx = x - dx;
        ny = y + dy;
      } else if (orientation === 'WEST') {
        nx = x - dy;
        ny = y - dx;
      }

      if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) {
        continue;
      }

      if (occupancyGrid[nx][ny][z - 1]) {
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

      if (orientation === 'NORTH') {
        nx = x + dx;
        ny = y - dy;
      } else if (orientation === 'EAST') {
        nx = x + dy;
        ny = y + dx;
      } else if (orientation === 'SOUTH') {
        nx = x - dx;
        ny = y + dy;
      } else if (orientation === 'WEST') {
        nx = x - dy;
        ny = y - dx;
      }

      if (nx >= 0 && ny >= 0 && nx < gridSize && ny < gridSize) {
        occupancyGrid[nx][ny][z] = true;
      }
    }
  }
}

export function isPlacementClear(x, y, z, width, length, orientation, occupancyGrid) {
  for (let dx = 0; dx < width; dx++) {
    for (let dy = 0; dy < length; dy++) {
      let gx = x, gy = y;

      if (orientation === 'NORTH') {
        gx = x + dx;
        gy = y - dy;
      } else if (orientation === 'EAST') {
        gx = x + dy;
        gy = y + dx;
      } else if (orientation === 'SOUTH') {
        gx = x - dx;
        gy = y + dy;
      } else if (orientation === 'WEST') {
        gx = x - dy;
        gy = y - dx;
      }

      if (
        gx < 0 || gx >= occupancyGrid.length ||
        gy < 0 || gy >= occupancyGrid[0].length
      ) {
        return false;
      }

      if (occupancyGrid[gx][gy][z]) {
        return false; // Collision!
      }
    }
  }
  return true;
}
