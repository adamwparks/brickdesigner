import { initializeGrid, isPlacementSupported, markBrickOnGrid } from './gridOccupancy.js';

document.getElementById('lego-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const parts = document.getElementById('parts').value.trim();
  const theme = document.getElementById('theme').value;

  if (!parts) {
    alert("Please enter a parts list.");
    return;
  }

  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('output').classList.add('hidden');

  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partsList: parts, theme: theme })
    });

    if (!response.ok) throw new Error('Failed to generate build.');
    const data = await response.json();
    console.log('Full OpenAI response:', data.result);

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('build-result').innerHTML = data.result.replace(/\n/g, '<br/>');
    document.getElementById('output').classList.remove('hidden');

    function extractPartsSummary(fullText) {
      // 1. Find the Parts Used Summary section
      const partsSectionMatch = fullText.match(/Parts Used Summary:(.*)/is);
      if (!partsSectionMatch) {
        console.warn('No Parts Used Summary section found.');
        return [];
      }
    
      let partsSection = partsSectionMatch[1].trim();
    
      // 2. Basic markdown cleanup
      partsSection = partsSection
        .replace(/\*\*/g, '')       // Remove all bold markers **
        .replace(/\*/g, '')         // Remove single asterisks if any
        .replace(/^\- /gm, '')      // Remove leading dashes
        .replace(/^\s*-\s*/gm, '')  // Handle spaces before dash
        .trim();
    
      const lines = partsSection.split('\n');
      const parts = [];
    
      // 3. Parse cleaned lines
      for (let line of lines) {
        line = line.trim();
        if (line.length === 0) continue; // Skip blank lines
    
        const match = line.match(/^(\d+)x\s(\d+x\d+)\s.+?(?:\((.*?)\))?/i);
        if (match) {
          const quantity = parseInt(match[1], 10);
          const size = match[2];
          const color = match[3] ? match[3].toLowerCase() : 'gray'; // Default gray if missing
    
          for (let i = 0; i < quantity; i++) {
            parts.push({ size, color });
          }
        } else {
          console.warn('Could not parse line:', line);
        }
      }
    
      return parts;
    }    
    
    const partsArray = parsePlacementInstructions(data.result);
    console.log('Parsed parts array:', partsArray);
    
    if (partsArray.length > 0) {
      await renderGridFromPlacement(partsArray);
    } else {
      console.warn('No parts parsed.');
    }    

  } catch (error) {
    console.error(error);
    alert('There was an error generating the build.');
    document.getElementById('loading').classList.add('hidden');
  }
});

function parsePlacementInstructions(instructionsText) {
  const parts = [];

  const lines = instructionsText.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (line.length === 0) continue;

    const match = line.match(/place\s+(\d+x\d+)\s+(\w+)\s+\w+\s+at\s+\((\d+),\s*(\d+),\s*(\d+)\),\s*facing\s+(\w+)/i);

    if (match) {
      const size = match[1];
      const color = match[2].toLowerCase();
      const x = parseInt(match[3], 10);
      const y = parseInt(match[4], 10);
      const z = parseInt(match[5], 10);
      const orientation = match[6].toUpperCase(); // NORTH, EAST, SOUTH, WEST

      parts.push({ size, color, x, y, z, orientation });
    } else {
      console.warn('Could not parse instruction line:', line);
    }
  }

  return parts;
};

async function renderGridFromPlacement(parts) {
  const gridCanvas = document.getElementById('grid-canvas');
  gridCanvas.innerHTML = "";

  const selectedLayer = document.getElementById('layer-select').value;
  const gridSize = 10;
  const studSizePx = 30;

  const occupancyGrid = initializeGrid(); // New: Create fresh empty grid

  // Set up the visual grid
  gridCanvas.style.display = 'grid';
  gridCanvas.style.gridTemplateColumns = `repeat(${gridSize}, ${studSizePx}px)`;
  gridCanvas.style.gridTemplateRows = `repeat(${gridSize}, ${studSizePx}px)`;
  gridCanvas.style.gap = '2px';
  gridCanvas.className = 'bg-gray-100 p-2 rounded-lg';

  // Build a map for bricks on this layer
  const gridMap = {};

  for (let part of parts) {
    const { size, color, x, y, z, orientation } = part;
    const [studWidth, studLength] = size.split('x').map(Number);

    // Check if user selected a specific layer
    if (selectedLayer !== "all" && parseInt(selectedLayer) !== z) {
      continue;
    }

    // Check if the brick placement is supported
    if (isPlacementSupported(x, y, z, studWidth, studLength, orientation, occupancyGrid)) {
      const key = `${x},${y}`;

      if (!gridMap[key]) {
        gridMap[key] = [];
      }

      gridMap[key].push({ size, color, z, orientation });

      // After successfully placing it, mark the grid occupied
      markBrickOnGrid(x, y, z, studWidth, studLength, orientation, occupancyGrid);
    } else {
      console.warn(`Unsupported placement for brick at (${x},${y},${z}). Skipping.`);
    }
  }

  // Now visually render all bricks
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cell = document.createElement('div');
      cell.className = 'relative w-full h-full flex items-center justify-center';

      const key = `${col},${row}`;
      if (gridMap[key]) {
        // Pick the top-most brick for this stud
        gridMap[key].sort((a, b) => a.z - b.z);
        const topBrick = gridMap[key][gridMap[key].length - 1];

        const brick = document.createElement('div');
        brick.className = `${colorNameToTailwind(topBrick.color)} border border-gray-400 rounded-md w-4 h-4 transition-all duration-500 ease-out`;
        brick.title = `${topBrick.size} at z=${topBrick.z}, facing ${topBrick.orientation}`;
        
        // Start above the canvas
        brick.style.transform = 'translateY(-100px)';
        brick.style.opacity = '0';
        
        // Force reflow (important to trigger transition)
        void brick.offsetWidth;
        
        // Animate down to position
        setTimeout(() => {
          brick.style.transform = 'translateY(0)';
          brick.style.opacity = '1';
        }, Math.random() * 300); // Slight random delay for natural "staggered" drop effect

        brick.style.opacity = Math.min(1, 0.5 + topBrick.z * 0.1); // Optional: lighter for higher levels

        cell.appendChild(brick);
      }

      gridCanvas.appendChild(cell);
    }
  }
};

let currentParts = [];
console.log('current parts = ' + currentParts);

document.getElementById('layer-select').addEventListener('change', () => {
  if (currentParts.length > 0) {
    renderGridFromPlacement(currentParts);
  }
});

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




