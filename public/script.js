import { initializeGrid, isPlacementSupported, markBrickOnGrid, isPlacementClear } from './gridOccupancy.js';

// === GLOBAL STATE ===
let buildSteps = "";
let rejectedBricks = [];
let selectedLayer = 99; // Show all by default
let currentParts = [];  // Store current parts globally for dropdown use

// === CORE FUNCTIONS ===

// Generate new build from GPT
async function generateBuild() {
  showSpinner();
  try {
    const partsText = document.getElementById('parts-input')?.value.trim();
    const payload = partsText ? { partsList: partsText } : {};

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });


    const data = await response.json();

    buildSteps = data.result; // Save the original build text
    console.log('Generated Build Steps:', buildSteps);
    await parseAndRenderBuild(buildSteps); // Parse and render
  } catch (error) {
    console.error('Error generating build:', error);
  } finally {
    hideSpinner();
  }
}

// Refine build based on rejected bricks
async function handleRefine() {
  if (!buildSteps || rejectedBricks.length === 0) {
    console.error('Cannot refine: missing buildSteps or rejected bricks.');
    return;
  }

  showSpinner();

  try {
    const response = await fetch('/api/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildSteps, rejectedBricks }),
    });

    const data = await response.json();

    if (data.result) {
      buildSteps = data.result; // Update with refined plan
      await parseAndRenderBuild(buildSteps); // Re-render
    } else {
      console.error('No result from refine.');
    }
  } catch (error) {
    console.error('Error refining build:', error);
  } finally {
    hideSpinner();
  }
}

// Parse GPT text into structured parts
function parseBuildSteps(text) {
  const lines = text.split('\n');
  const parts = [];
  const partsList = [];
  const buildStepsList = [];
  let description = "";

  let inPartsSection = false;

  for (const line of lines) {
    if (line.toLowerCase().includes('parts used summary')) {
      inPartsSection = true;
      continue;
    }

    if (!inPartsSection) {
      const match = line.match(/Step \d+: Place (\d+x\d+) (\w+) brick at \((\d+),(\d+),(\d+)\), facing (\w+)/i);
      if (match) {
        const [, size, color, x, y, z, orientation] = match;
        parts.push({
          size,
          color,
          x: parseInt(x, 10),
          y: parseInt(y, 10),
          z: parseInt(z, 10),
          orientation: orientation.toUpperCase()
        });
        console.log(line);
        buildStepsList.push(line.trim());
      } else if (line.trim() && !line.startsWith('Step')) {
        // Capture first non-step non-empty line as description
        if (!description) {
          description = line.trim();
        }
      }
    } else {
      if (line.trim().startsWith('-')) {
        partsList.push(line.trim().slice(1).trim());
      }
    }
  }

  return { parts, partsList, description, buildStepsList };
};

// Parse and Render the build
async function parseAndRenderBuild(text) {
  const { parts, partsList, description, buildStepsList } = parseBuildSteps(text);
  populateLayerDropdown(parts);
  await renderGridFromPlacement(parts);
  renderBuildSummary(partsList, description, buildStepsList);
}

// Render grid based on parsed parts
async function renderGridFromPlacement(parts) {
  console.log('Rendering', parts.length, 'parts...');
  currentParts = parts;

  const gridCanvas = document.getElementById('grid-canvas');
  gridCanvas.innerHTML = "";

  const gridSize = 10;
  const studSizePx = 30;
  rejectedBricks = [];
  const occupancyGrid = initializeGrid();
  const topBricks = [];

  gridCanvas.style.display = 'grid';
  gridCanvas.style.gridTemplateColumns = `repeat(${gridSize}, ${studSizePx}px)`;
  gridCanvas.style.gridTemplateRows = `repeat(${gridSize}, ${studSizePx}px)`;
  gridCanvas.style.gap = '2px';

  const topStudsMap = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => null)
  );

  for (const part of parts) {
    const { size, color, x, y, z, orientation } = part;
    if (z > selectedLayer) continue;

    const [studWidth, studLength] = size.split('x').map(Number);

    if (isPlacementSupported(x, y, z, studWidth, studLength, orientation, occupancyGrid) &&
       isPlacementClear(x, y, z, studWidth, studLength, orientation, occupancyGrid)) {
      markBrickOnGrid(x, y, z, studWidth, studLength, orientation, occupancyGrid);
      topBricks.push({ x, y, z, size, color, orientation });

      for (let dx = 0; dx < studWidth; dx++) {
        for (let dy = 0; dy < studLength; dy++) {
          let gx = x, gy = y;
          if (orientation === 'NORTH') {
            gx = x + dx; gy = y - dy;
          } else if (orientation === 'EAST') {
            gx = x + dy; gy = y + dx;
          } else if (orientation === 'SOUTH') {
            gx = x - dx; gy = y + dy;
          } else if (orientation === 'WEST') {
            gx = x - dy; gy = y - dx;
          }

          if (
            gx >= 0 && gx < gridSize &&
            gy >= 0 && gy < gridSize &&
            (!topStudsMap[gx][gy] || topStudsMap[gx][gy].z <= z)
          ) {
            topStudsMap[gx][gy] = { color, z, size, orientation };
          }
        }
      }
    } else {
      rejectedBricks.push({
        step: parts.indexOf(part) + 1,
        ...part,
        reason: 'unsupported (floating or insufficient studs)',
      });
    }
  }

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cell = document.createElement('div');
      cell.className = 'relative w-full h-full flex items-center justify-center bg-white border border-gray-200';

      const stud = topStudsMap[col][row];
      if (stud) {
        const dot = document.createElement('div');
        dot.className = `${colorNameToTailwind(stud.color)} w-4 h-4 rounded-full border border-gray-500 transition-all duration-300`;
        dot.title = `${stud.size} brick facing ${stud.orientation}, z=${stud.z}`;
        cell.appendChild(dot);
      }

      gridCanvas.appendChild(cell);
    }
  }

  for (const brick of topBricks) {
    if (brick.z !== selectedLayer) continue;

    const [studWidth, studLength] = brick.size.split('x').map(Number);
    let pixelWidth = studWidth * studSizePx;
    let pixelHeight = studLength * studSizePx;
    let gx = brick.x;
    let gy = brick.y;

    if (brick.orientation === 'NORTH' || brick.orientation === 'SOUTH') {
      pixelWidth = studWidth * studSizePx;
      pixelHeight = studLength * studSizePx;
    } else {
      [pixelWidth, pixelHeight] = [pixelHeight, pixelWidth];
    }

    const outline = document.createElement('div');
    outline.style.position = 'absolute';
    outline.style.left = `${gx * studSizePx + 8}px`;
    outline.style.top = `${gy * studSizePx + 8}px`;
    outline.style.width = `${pixelWidth}px`;
    outline.style.height = `${pixelHeight}px`;
    outline.style.border = '2px dashed rgba(0, 0, 0, 0.3)';
    outline.style.borderRadius = '6px';
    outline.style.pointerEvents = 'none';
    outline.style.boxSizing = 'border-box';

    gridCanvas.appendChild(outline);
  }

  renderVerticalStudViewer(occupancyGrid);

  const refineButton = document.getElementById('refine-button');
  refineButton.style.display = rejectedBricks.length > 0 ? 'block' : 'none';
};

function renderBuildSummary(partsList, description, buildStepsList) {
  const partsListContainer = document.getElementById('parts-list');
  const descriptionContainer = document.getElementById('build-description');
  const buildStepsContainer = document.getElementById('build-steps');

  if (descriptionContainer) {
    descriptionContainer.textContent = description || "No description available.";
  }

  if (buildStepsContainer) {
    buildStepsContainer.innerHTML = "";
    for (const item of buildStepsList) {
      const li = document.createElement('li');
      li.textContent = item;
      buildStepsContainer.appendChild(li);
    }
  }

  if (partsListContainer) {
    partsListContainer.innerHTML = "";
    for (const item of partsList) {
      const li = document.createElement('li');
      li.textContent = item;
      partsListContainer.appendChild(li);
    }
  }
};

function populateLayerDropdown(parts) {
  const layerSelect = document.getElementById('layer-select');
  if (!layerSelect) return;

  // Find the highest Z value
  const maxZ = parts.reduce((max, part) => Math.max(max, part.z), 0);
  layerSelect.innerHTML = '';

  for (let z = 0; z <= maxZ; z++) {
    const option = document.createElement('option');
    option.value = z;
    option.textContent = `Layer ${z}`;
    layerSelect.appendChild(option);
  }

  selectedLayer = maxZ; // default to top
  layerSelect.value = maxZ;
};

function showSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.style.display = 'flex';
  }
}

function hideSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.style.display = 'none';
  }
}

function colorNameToTailwind(colorName) {
  console.log('Looking up color:', colorName);
  const colorMap = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-400',
    blue: 'bg-blue-400',
    green: 'bg-green-400',
    black: 'bg-black',
    white: 'bg-white',
    gray: 'bg-gray-400',
    purple: 'bg-purple-400',
    orange: 'bg-orange-400',
    brown: 'bg-yellow-800',
    pink: 'bg-pink-400',
    tan: 'bg-yellow-200',
    lightgray: 'bg-gray-300',
    darkgray: 'bg-gray-700',
    // Add more if needed!
  };

  const result = colorMap[colorName.toLowerCase()];
  if (!result) {
    console.warn('Unknown color:', colorName);
    return 'bg-gray-300'; // fallback
  }

  return result;
}

function renderVerticalStudViewer(occupancyGrid) {
  const verticalCanvas = document.getElementById('vertical-canvas');
  verticalCanvas.innerHTML = "";

  const gridSize = 10;
  const studSizePx = 20; // Each stud 20px × 20px
  const layerSpacing = 30; // How far up each layer is spaced

  // Container div to center grid
  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.width = `${gridSize * studSizePx}px`;
  container.style.height = `${(gridSize * studSizePx) + (10 * layerSpacing)}px`;

  verticalCanvas.appendChild(container);

  for (let z = 0; z < 10; z++) { // For each layer
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {

        const occupied = occupancyGrid[x][y][z];

        const stud = document.createElement('div');
        stud.className = 'absolute rounded-full';
        stud.style.width = `${studSizePx}px`;
        stud.style.height = `${studSizePx}px`;
        stud.style.left = `${x * studSizePx}px`;
        stud.style.top = `${y * studSizePx - (z * layerSpacing)}px`; // Stagger up for higher z
        stud.style.backgroundColor = occupied ? `rgba(34,197,94,${0.4 + z * 0.05})` : `rgba(203,213,225,0.2)`;
        stud.style.border = occupied ? '1px solid #4ade80' : '1px dashed #cbd5e1';
        stud.title = `(${x},${y},${z}) - ${occupied ? "Occupied" : "Empty"}`;

        container.appendChild(stud);
      }
    }
  }
};

// === EVENT BINDINGS ===

document.getElementById('generate-button').addEventListener('click', async (e) => {
  e.preventDefault();
  await generateBuild();
});

document.getElementById('refine-button').addEventListener('click', async (e) => {
  e.preventDefault();
  await handleRefine();
});

document.getElementById('layer-select').addEventListener('change', (e) => {
  selectedLayer = parseInt(e.target.value, 10);
  if (currentParts.length > 0) {
    renderGridFromPlacement(currentParts);
  }
});