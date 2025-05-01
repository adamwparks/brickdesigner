import { initializeGrid, isPlacementSupported, markPlacement, isPlacementClear } from './gridOccupancy.js';
import { getOrientedSize } from './brickUtils.js';

// === GLOBAL STATE ===
let buildSteps = "";
let rejectedBricks = [];
let selectedLayer = 0; // Show all by default
let currentParts = [];  // Store current parts globally for dropdown use
document.getElementById('layer-select').value = selectedLayer;

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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Server error: ${text}`);
    }
    
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

    console.log('[Line]', line); // See what line we're evaluating

    if (line.toLowerCase().startsWith('step')) {
      console.log('[Step line]', line);
    }

    if (!inPartsSection) {
      const match = line.match(
        /step\s*\d+:\s*place\s+(\d+x\d+)\s+(\w+)\s+brick\s+at\s+\((\d+),\s*(\d+),\s*(\d+)\),\s*(horizontal|vertical)/i
      );

      if (match) {
        console.log('[MATCHED]', match);
      } else {
        console.warn('⚠️ Did not match step line:', line);
      }

      if (match) {
        const [, size, color, x, y, z, orientation] = match;
      
        parts.push({
          size,
          color: color.toLowerCase(),
          x: parseInt(x, 10),
          y: parseInt(y, 10),
          z: parseInt(z, 10),
          orientation: orientation.toLowerCase()
        });
      
        buildStepsList.push(line.trim());
      } else if (line.trim() && !line.startsWith('Step')) {
        // Capture first non-step non-empty line as description
        if (!description) {
          description = line.trim();
        }
      }
    } else {
      const cleanedLine = line.trim().replace(/^-/, '').trim();
      const partsLineMatch = cleanedLine.match(/^(\d+x\d+)\s+(\w+)\s+\w+\s+[x×]\s+(\d+)/i);
      if (partsLineMatch) {
        partsList.push(cleanedLine);
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
  gridCanvas.innerHTML = '';

  const gridSize = 10;
  const studSizePx = 30;
  const gap = 2;
  rejectedBricks = [];
  const occupancyGrid = initializeGrid();
  const topBricks = [];

  const topStudsMap = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => null)
  );

  for (const part of parts) {
    const { size, color, x, y, z, orientation } = part;
    const orientationNorm = orientation.toUpperCase();
    if (z > selectedLayer) continue;

    const [studWidth, studLength] = getOrientedSize(size, orientationNorm);

    const clear = isPlacementClear(x, y, z, size, orientationNorm, occupancyGrid);
    const supported = isPlacementSupported(x, y, z, size, orientationNorm, occupancyGrid);

    if (clear && supported) {
      markPlacement(x, y, z, size, orientationNorm, occupancyGrid);
      topBricks.push({ x, y, z, size, color, orientationNorm, studWidth, studLength });

      // draw outline
      const pixelWidth = studWidth * studSizePx + (studWidth - 1) * gap;
      const pixelHeight = studLength * studSizePx + (studLength - 1) * gap;

      const outline = document.createElement('div');
      outline.style.position = 'absolute';
      outline.style.left = `${x * (studSizePx + gap)}px`;
      outline.style.top = `${y * (studSizePx + gap)}px`;
      outline.style.width = `${pixelWidth}px`;
      outline.style.height = `${pixelHeight}px`;
      outline.style.border = '2px dashed rgba(0, 0, 0, 0.3)';
      outline.style.borderRadius = '6px';
      outline.style.pointerEvents = 'none';
      outline.style.boxSizing = 'border-box';

      outline.style.gridRow = `${y + 1} / span ${studLength}`;
      outline.style.gridColumn = `${x + 1} / span ${studWidth}`;

      gridCanvas.appendChild(outline);

      for (let dx = 0; dx < studWidth; dx++) {
        for (let dy = 0; dy < studLength; dy++) {
          let gx = x;
          let gy = y;
      
          if (orientationNorm === 'HORIZONTAL') {
            gx = x + dx;
            gy = y + dy;
          } else if (orientationNorm === 'VERTICAL') {
            gx = x + dy;
            gy = y + dx;
          }
      
          if (
            gx >= 0 && gx < gridSize &&
            gy >= 0 && gy < gridSize &&
            (!topStudsMap[gx][gy] || topStudsMap[gx][gy].z <= z)
          ) {
            topStudsMap[gx][gy] = { color, z, studWidth, studLength, orientation: orientationNorm };
          }
        }
      }      
    } else {
      rejectedBricks.push({
        step: parts.indexOf(part) + 1,
        ...part,
        reason: !clear ? 'blocked or out-of-bounds' : 'not supported underneath'
      });
      console.warn('Rejected brick at step', parts.indexOf(part) + 1, part);
    }
  }

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cell = document.createElement('div');
      cell.className = 'relative flex items-center justify-center bg-white border border-gray-200';
      cell.style.width = `${studSizePx}px`;
      cell.style.height = `${studSizePx}px`;
      
      // ✅ Explicit grid placement
      cell.style.gridRow = row + 1;
      cell.style.gridColumn = col + 1;
  
      const stud = topStudsMap[col][row];
      if (stud) {
        const dot = document.createElement('div');
        dot.className = `${colorNameToTailwind(stud.color)} w-4 h-4 rounded-full border border-gray-500 transition-all duration-300`;
        dot.title = `${stud.studWidth}x${stud.studLength} brick facing ${stud.orientation}, z=${stud.z}`;
        cell.appendChild(dot);
      }
  
      gridCanvas.appendChild(cell);
    }
  }

  const refineButton = document.getElementById('refine-button');
  refineButton.style.display = rejectedBricks.length > 0 ? 'block' : 'none';
}

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

  selectedLayer = maxZ;
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

// === EVENT BINDINGS ===

document.getElementById('generate-button').addEventListener('click', async (e) => {
  e.preventDefault();
  await generateBuild();
});

document.getElementById('refine-button').addEventListener('click', async (e) => {
  e.preventDefault();
  await handleRefine();
});

document.getElementById('layer-select').addEventListener('change', (event) => {
  selectedLayer = parseInt(event.target.value);
  renderGridFromPlacement(currentParts);
});
