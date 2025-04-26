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

    // Extract Parts Used Summary
    const partsUsedMatch = data.result.match(/Parts Used Summary:(.*?)$/is);
    if (partsUsedMatch) {
      const partsSummary = partsUsedMatch[1].trim();
      await renderGrid(partsSummary);
    } else {
      console.warn('No parts used summary found.');
    }

  } catch (error) {
    console.error(error);
    alert('There was an error generating the build.');
    document.getElementById('loading').classList.add('hidden');
  }
});

async function renderGrid(partsSummaryText) {
  console.log('Parts Summary Text passed into renderGrid:', partsSummaryText);
  const gridCanvas = document.getElementById('grid-canvas');
  gridCanvas.innerHTML = "";

  const parts = [];

  const lines = partsSummaryText.split('\n');
  for (let line of lines) {
    line = line.trim();
    // Remove leading "- " if it exists
    if (line.startsWith('-')) {
      line = line.slice(1).trim();
    }
  
    const match = line.match(/^(\d+)x\s(\d+x\d+)\s.*?(?:\((.*?)\))?$/i);
    if (match) {
      const quantity = parseInt(match[1]);
      const size = match[2];
      const color = match[3] ? match[3].toLowerCase() : "gray";
  
      for (let i = 0; i < quantity; i++) {
        parts.push({ size, color });
      }
    }
  }
  

  if (parts.length === 0) {
    gridCanvas.innerHTML = "<p class='text-gray-500'>No valid parts found for visualization.</p>";
    return;
  }

  // Set up grid to have flexible columns
  gridCanvas.style.display = 'grid';
  gridCanvas.style.gridTemplateColumns = 'repeat(auto-fill, minmax(30px, 1fr))';
  gridCanvas.style.gap = '2px';

  let currentRowWidth = 0;
  const maxRowStuds = 10; // How wide a layer can be before wrapping
  let currentLayer = document.createElement('div');
  currentLayer.className = 'flex flex-wrap gap-1 mb-6'; // New layer (row)

  gridCanvas.appendChild(currentLayer);
  
  for (let part of parts) {
    const brick = document.createElement('div');
    const colorClass = colorNameToTailwind(part.color);

    const [studWidth, studHeight] = part.size.split('x').map(Number);
    const brickPixelWidth = studWidth * 30; // Each stud = 30px
    const brickPixelHeight = 30; // One row high for now

    brick.className = `${colorClass} border border-gray-300 rounded-md`;
    brick.style.width = `${brickPixelWidth}px`;
    brick.style.height = `${brickPixelHeight}px`;

    if (currentRowWidth + studWidth > maxRowStuds) {
      // Need a new layer
      currentLayer = document.createElement('div');
      currentLayer.className = 'flex flex-wrap gap-1 mb-6';
      gridCanvas.appendChild(currentLayer);
      currentRowWidth = 0;
    }

    currentLayer.appendChild(brick);
    currentRowWidth += studWidth;
  }
}


