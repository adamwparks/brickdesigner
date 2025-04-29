import { initializeGrid, isPlacementSupported, markBrickOnGrid } from './gridOccupancy.js';

// === GLOBAL STATE ===
let buildSteps = "";
let rejectedBricks = [];

// === CORE FUNCTIONS ===

// Generate new build from GPT
async function generateBuild() {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // No parts list needed
    });

    const data = await response.json();

    buildSteps = data.result; // Save the original build text
    await parseAndRenderBuild(buildSteps); // Parse and render
  } catch (error) {
    console.error('Error generating build:', error);
  }
}

// Refine build based on rejected bricks
async function handleRefine() {
  if (!buildSteps || rejectedBricks.length === 0) {
    console.error('Cannot refine: missing buildSteps or rejected bricks.');
    return;
  }

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
  }
}

// Parse GPT text into structured parts
function parseBuildSteps(text) {
  const lines = text.split('\n');
  const parts = [];

  for (const line of lines) {
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
    }
  }

  return parts;
}

// Parse and Render the build
async function parseAndRenderBuild(text) {
  const parts = parseBuildSteps(text);
  await renderGridFromPlacement(parts);
}

// Render grid based on parsed parts
async function renderGridFromPlacement(parts) {
  const gridCanvas = document.getElementById('grid-canvas');
  gridCanvas.innerHTML = "";

  const gridSize = 10;
  const studSizePx = 30;
  rejectedBricks = []; // Reset rejectedBricks before each new render

  const occupancyGrid = initializeGrid();

  gridCanvas.style.display = 'grid';
  gridCanvas.style.gridTemplateColumns = `repeat(${gridSize}, ${studSizePx}px)`;
  gridCanvas.style.gridTemplateRows = `repeat(${gridSize}, ${studSizePx}px)`;
  gridCanvas.style.gap = '2px';
  gridCanvas.className = 'bg-gray-100 p-2 rounded-lg';

  const gridMap = {};

  for (const part of parts) {
    const { size, color, x, y, z, orientation } = part;
    const [studWidth, studLength] = size.split('x').map(Number);

    if (isPlacementSupported(x, y, z, studWidth, studLength, orientation, occupancyGrid)) {
      const key = `${x},${y}`;

      if (!gridMap[key]) {
        gridMap[key] = [];
      }

      gridMap[key].push({ size, color, z, orientation });

      markBrickOnGrid(x, y, z, studWidth, studLength, orientation, occupancyGrid);
    } else {
      console.warn(`Unsupported placement for brick at (${x},${y},${z}). Skipping.`);

      rejectedBricks.push({
        step: parts.indexOf(part) + 1,
        size: part.size,
        color: part.color,
        x: part.x,
        y: part.y,
        z: part.z,
        orientation: part.orientation,
        reason: 'unsupported (floating or insufficient studs)',
      });
    }
  }

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cell = document.createElement('div');
      cell.className = 'relative w-full h-full flex items-center justify-center bg-white border border-gray-200';
      gridCanvas.appendChild(cell);
    }
  }

  renderVerticalStudViewer(occupancyGrid); // Optional 3D vertical viewer

  const refineButton = document.getElementById('refine-button');
  if (refineButton) {
    if (rejectedBricks.length > 0) {
      refineButton.style.display = 'block';
    } else {
      refineButton.style.display = 'none';
    }
  }
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

// === HELPERS (assume you already have these somewhere) ===
// - initializeGrid()
// - markBrickOnGrid()
// - isPlacementSupported()
// - renderVerticalStudViewer()


function colorNameToTailwind(colorName) {
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

  return colorMap[colorName.toLowerCase()] || 'bg-gray-400'; // fallback to gray
}

// function parsePlacementInstructions(instructionsText) {
//   const parts = [];

//   const lines = instructionsText.split('\n');
//   for (let line of lines) {
//     line = line.trim();
//     if (line.length === 0) continue;

//     const match = line.match(/place\s+(\d+x\d+)\s+(\w+)\s+\w+\s+at\s+\((\d+),\s*(\d+),\s*(\d+)\),\s*facing\s+(\w+)/i);

//     if (match) {
//       const size = match[1];
//       const color = match[2].toLowerCase();
//       const x = parseInt(match[3], 10);
//       const y = parseInt(match[4], 10);
//       const z = parseInt(match[5], 10);
//       const orientation = match[6].toUpperCase(); // NORTH, EAST, SOUTH, WEST

//       parts.push({ size, color, x, y, z, orientation });
//     } else {
//       console.warn('Could not parse instruction line:', line);
//     }
//   }

//   return parts;
// };

// async function renderGridFromPlacement(parts) {
//   const debugMode = document.getElementById('debug-toggle').checked;
//   const gridCanvas = document.getElementById('grid-canvas');
//   gridCanvas.innerHTML = "";

//   const selectedLayer = document.getElementById('layer-select').value;
//   const gridSize = 10;
//   const studSizePx = 30;

//   const occupancyGrid = initializeGrid(); // New: Create fresh empty grid
//   const rejectedBricks = [];

//   // Set up the visual grid
//   gridCanvas.style.display = 'grid';
//   gridCanvas.style.gridTemplateColumns = `repeat(${gridSize}, ${studSizePx}px)`;
//   gridCanvas.style.gridTemplateRows = `repeat(${gridSize}, ${studSizePx}px)`;
//   gridCanvas.style.gap = '2px';
//   gridCanvas.className = 'bg-gray-100 p-2 rounded-lg';

//   // Build a map for bricks on this layer
//   const gridMap = {};

//   for (let part of parts) {
//     const { size, color, x, y, z, orientation } = part;
//     const [studWidth, studLength] = size.split('x').map(Number);

//     // Check if user selected a specific layer
//     if (selectedLayer !== "all" && parseInt(selectedLayer) !== z) {
//       continue;
//     }

//     // Check if the brick placement is supported
//     if (isPlacementSupported(x, y, z, studWidth, studLength, orientation, occupancyGrid)) {
//       const key = `${x},${y}`;
    
//       if (!gridMap[key]) {
//         gridMap[key] = [];
//       }
    
//       gridMap[key].push({ size, color, z, orientation });
    
//       markBrickOnGrid(x, y, z, studWidth, studLength, orientation, occupancyGrid);
//     } else {
//       console.warn(`Unsupported placement for brick at (${x},${y},${z}). Skipping.`);
      
//       rejectedBricks.push({
//         step: parts.indexOf(part) + 1, // assuming parts are in order
//         size: part.size,
//         color: part.color,
//         x: part.x,
//         y: part.y,
//         z: part.z,
//         orientation: part.orientation,
//         reason: 'unsupported (floating or insufficient studs)',
//       });
//     }    
//   }

//   // Now visually render all bricks
//   for (let row = 0; row < gridSize; row++) {
//     for (let col = 0; col < gridSize; col++) {
//       const cell = document.createElement('div');
//       cell.className = 'relative w-full h-full flex items-center justify-center bg-white border border-gray-200';
      
//       const key = `${col},${row}`;
      
//       // Draw the brick visually if a brick exists at this cell
//       if (gridMap[key]) {
//         gridMap[key].sort((a, b) => a.z - b.z);
//         const topBrick = gridMap[key][gridMap[key].length - 1];
      
//         const brick = document.createElement('div');
//         brick.className = `${colorNameToTailwind(topBrick.color)} border border-gray-400 rounded-md w-4 h-4 transition-all duration-500 ease-out`;
//         brick.title = `${topBrick.size} at z=${topBrick.z}, facing ${topBrick.orientation}`;
      
//         brick.style.transform = 'translateY(-100px)';
//         brick.style.opacity = '0';
      
//         void brick.offsetWidth;
      
//         setTimeout(() => {
//           brick.style.transform = 'translateY(0)';
//           brick.style.opacity = '1';
//         }, Math.random() * 300);
      
//         cell.appendChild(brick);
//       }
      
//       // 🧠 NEW: If Debug Mode ON, draw stud occupancy
//       if (debugMode) {
//         const selectedLayerInt = selectedLayer === "all" ? 0 : parseInt(selectedLayer);
      
//         const occupancy = occupancyGrid[col][row][selectedLayerInt];
      
//         const debugDot = document.createElement('div');
//         debugDot.className = occupancy ? 'bg-green-500 rounded-full w-2 h-2' : 'bg-red-300 rounded-full w-2 h-2';
//         debugDot.style.position = 'absolute';
//         debugDot.style.bottom = '4px';
//         debugDot.style.right = '4px';
//         debugDot.title = occupancy ? 'Stud occupied' : 'Empty stud';
      
//         cell.appendChild(debugDot);
//       }
      
//       gridCanvas.appendChild(cell);
//       renderVerticalStudViewer(occupancyGrid);
//     }
//   }
//   if (rejectedBricks.length > 0) {
//     console.log('Rejected bricks detected:', rejectedBricks);
  
//     // Optionally show a "Refine Build" button
//     const refineButton = document.getElementById('refine-button');
//     if (refineButton) {
//       refineButton.style.display = 'block';
//       refineButton.onclick = () => handleRefine(buildSteps, rejectedBricks);
//     }
//   } else {
//     const refineButton = document.getElementById('refine-button');
//     if (refineButton) {
//       refineButton.style.display = 'none';
//     }
//   }
// };

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

// let currentParts = [];
// console.log('current parts = ' + currentParts);

// document.getElementById('layer-select').addEventListener('change', () => {
//   if (currentParts.length > 0) {
//     renderGridFromPlacement(currentParts);
//   }
// });

let selectedFeedback = '';

document.querySelectorAll('.feedback-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    selectedFeedback = e.target.getAttribute('data-feedback');
    document.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('opacity-50'));
    e.target.classList.add('opacity-50'); // visually mark selection
  });
});

document.getElementById('submit-feedback').addEventListener('click', async () => {
  const comment = document.getElementById('feedback-comment').value.trim();

  if (!selectedFeedback && !comment) {
    alert('Please select a feedback type or leave a comment.');
    return;
  }

  const feedbackData = {
    feedbackType: selectedFeedback,
    comment,
    buildInstructions: currentBuildInstructions
  };

  try {
    const response = await fetch('/api/submitFeedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });

    if (!response.ok) {
      throw new Error('Failed to submit feedback');
    }

    alert('Thanks for your feedback!');
    selectedFeedback = '';
    document.getElementById('feedback-comment').value = '';
  } catch (err) {
    console.error(err);
    alert('Error submitting feedback.');
  }
});




