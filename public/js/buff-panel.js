// Story Line — the buffs side panel. Explains the house rule (capture ->
// permanent buff) and lists which pieces on the board are currently
// buffed, so a player can see at a glance what each of their pieces can
// now do. Matches the table in ProductSpec.md § Buff System.

const UNICODE = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

const BUFF_TEXT = {
  p: 'may advance 2 squares on any turn, not just its first move.',
  n: 'may also step exactly 1 square orthogonally (up/down/left/right), on top of its usual L-move.',
  b: 'may also step exactly 1 square orthogonally, on top of its usual diagonal slide.',
  r: 'may also step exactly 1 square diagonally, on top of its usual straight slide.',
  q: 'may jump over exactly one occupied square along its path, once per move.',
  k: 'may move 2 squares in any direction, once per game (separate from castling).',
};

function squareName(r, c) {
  return `${'abcdefgh'[c]}${r + 1}`;
}

export function createBuffPanel(root, { getState }) {
  root.classList.add('buff-panel');

  const heading = document.createElement('h2');
  heading.textContent = 'Buffs';
  root.appendChild(heading);

  const intro = document.createElement('p');
  intro.className = 'buff-intro';
  intro.textContent = 'Capture a piece and yours gets stronger — permanently. Each piece type has its own buff:';
  root.appendChild(intro);

  const legend = document.createElement('ul');
  legend.className = 'buff-legend';
  for (const type of ['p', 'n', 'b', 'r', 'q', 'k']) {
    const li = document.createElement('li');
    const glyph = document.createElement('span');
    glyph.className = 'buff-legend-glyph';
    glyph.textContent = UNICODE.w[type];
    li.appendChild(glyph);
    const text = document.createElement('span');
    text.innerHTML = `<strong>${PIECE_NAMES[type]}</strong> — ${BUFF_TEXT[type]}`;
    li.appendChild(text);
    legend.appendChild(li);
  }
  root.appendChild(legend);

  const activeHeading = document.createElement('h3');
  activeHeading.textContent = 'Buffed on the board';
  root.appendChild(activeHeading);

  const activeList = document.createElement('ul');
  activeList.className = 'buff-active';
  root.appendChild(activeList);

  const emptyNote = document.createElement('p');
  emptyNote.className = 'buff-empty';
  emptyNote.textContent = 'No captures yet — nothing buffed.';
  root.appendChild(emptyNote);

  function render() {
    const state = getState();
    activeList.innerHTML = '';
    const buffed = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = state.board[r][c];
        if (p && p.buffed) buffed.push({ ...p, square: squareName(r, c) });
      }
    }

    emptyNote.classList.toggle('hidden', buffed.length > 0);
    activeList.classList.toggle('hidden', buffed.length === 0);

    for (const p of buffed) {
      const li = document.createElement('li');
      li.className = `buff-active-item buff-${p.color}`;
      const glyph = document.createElement('span');
      glyph.className = 'buff-legend-glyph';
      glyph.textContent = UNICODE[p.color][p.type];
      li.appendChild(glyph);
      const label = document.createElement('span');
      const colorName = p.color === 'w' ? 'White' : 'Black';
      label.textContent = `${colorName} ${PIECE_NAMES[p.type]} — ${p.square}`;
      li.appendChild(label);
      activeList.appendChild(li);
    }
  }

  render();
  return { render };
}
