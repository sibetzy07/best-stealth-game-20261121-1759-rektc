// Keyboard (WASD / arrows, Shift to sneak) and mouse (click to toss a pebble).
// Tracks held keys and turns them into a movement vector each frame.

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    mx: 0,
    my: 0,
    sneak: false,
    click: null, // {x, y} in canvas pixels, consumed by the game loop
    anyKey: null, // last keydown event, consumed by the game loop
  };

  function keyName(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys.add(keyName(e));
    input.anyKey = e;
    refresh();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(keyName(e));
    refresh();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    refresh();
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.click = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  });

  function refresh() {
    let mx = 0;
    let my = 0;
    if (keys.has('a') || keys.has('ArrowLeft')) mx -= 1;
    if (keys.has('d') || keys.has('ArrowRight')) mx += 1;
    if (keys.has('w') || keys.has('ArrowUp')) my -= 1;
    if (keys.has('s') || keys.has('ArrowDown')) my += 1;
    input.mx = mx;
    input.my = my;
    input.sneak = keys.has('Shift');
  }

  return input;
}
