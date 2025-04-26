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
    
    const partsArray = extractPartsSummary(data.result);
    console.log('Extracted parts array:', partsArray);

    if (partsArray.length > 0) {
      await renderGrid(partsArray);
    } else {
      console.warn('No parts found to render.');
    }

  } catch (error) {
    console.error(error);
    alert('There was an error generating the build.');
    document.getElementById('loading').classList.add('hidden');
  }
});

async function renderGrid(parts) {
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
      brown: 'bg-yellow-800'
      // Add more mappings if needed
    };
  
    return colorMap[colorName] || 'bg-gray-400'; // Default fallback
  }
  
  const gridCanvas = document.getElementById('grid-canvas');
  gridCanvas.innerHTML = "";

  if (parts.length === 0) {
    gridCanvas.innerHTML = "<p class='text-gray-500'>No valid parts found for visualization.</p>";
    return;
  }

  let currentRowWidth = 0;
  const maxRowStuds = 10;
  let currentLayer = document.createElement('div');
  currentLayer.className = 'flex flex-wrap gap-1 mb-6';
  gridCanvas.appendChild(currentLayer);

  for (let part of parts) {
    const brick = document.createElement('div');
    const colorClass = colorNameToTailwind(part.color);

    const [studWidth, studHeight] = part.size.split('x').map(Number);
    const brickPixelWidth = studWidth * 30;
    const brickPixelHeight = studHeight * 30;

    brick.className = `${colorClass} border border-gray-300 rounded-md relative overflow-hidden flex flex-wrap justify-center items-center`;
    brick.style.width = `${brickPixelWidth}px`;
    brick.style.height = `${brickPixelHeight}px`;
    brick.style.position = 'relative';
    brick.style.padding = '4px'; // Give space for studs

    if (currentRowWidth + studWidth > maxRowStuds) {
      currentLayer = document.createElement('div');
      currentLayer.className = 'flex flex-wrap gap-1 mb-6';
      gridCanvas.appendChild(currentLayer);
      currentRowWidth = 0;
    }

    // 👉 Create studs dynamically
    const totalStuds = studWidth * studHeight;

    for (let i = 0; i < totalStuds; i++) {
      const stud = document.createElement('div');
      stud.className = 'w-4 h-4 bg-white/70 rounded-full m-[2px] shadow-inner';
      brick.appendChild(stud);
    }

    currentLayer.appendChild(brick);
    currentRowWidth += studWidth;
  }
}




