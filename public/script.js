document.getElementById('lego-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const parts = document.getElementById('parts').value.trim();
  const theme = document.getElementById('theme').value;

  if (!parts) {
    alert("Please enter a parts list.");
    return;
  }

  // Show loading animation and hide previous results
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('output').classList.add('hidden');

  try {
    // Send parts list + theme to backend
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partsList: parts, theme: theme })
    });

    if (!response.ok) throw new Error('Failed to generate build.');

    const data = await response.json();

    // Show the result
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('build-result').innerHTML = data.result.replace(/\n/g, '<br/>');
    document.getElementById('output').classList.remove('hidden');

    // Simple grid visualization (placeholder)
    renderGrid();

  } catch (error) {
    console.error(error);
    alert('There was an error generating the build.');
    document.getElementById('loading').classList.add('hidden');
  }
});

/**
 * Simple 2D Grid Renderer — placeholder version
 * Later we'll base this on actual parts usage
 */
function renderGrid() {
  const gridCanvas = document.getElementById('grid-canvas');
  gridCanvas.innerHTML = ""; // Clear previous grid

  const colors = ['bg-red-500', 'bg-yellow-400', 'bg-blue-400', 'bg-black'];

  for (let i = 0; i < 20; i++) {
    const brick = document.createElement('div');
    brick.className = `w-7 h-7 rounded-md ${colors[i % colors.length]} border border-gray-300`;
    gridCanvas.appendChild(brick);
  }
}
