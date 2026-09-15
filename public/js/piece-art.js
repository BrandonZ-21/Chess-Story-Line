// Story Line — hand-drawn medieval figures for each piece, standing in for
// the standard chess roles. Plain inline SVG (no image files, no library):
// each figure is a flat silhouette that fills with `currentColor`, so the
// existing piece-w/piece-b CSS colors just work. viewBox has margin around
// the 0..40 x 0..64 "figure box" so props (spears, crowns) aren't clipped.

const VIEWBOX = '-8 -6 56 76';

function svg(inner) {
  return `<svg viewBox="${VIEWBOX}" class="piece-svg" aria-hidden="true">${inner}</svg>`;
}

// Foot soldier: round cap, simple robe, shouldered spear.
const PAWN = svg(`
  <circle cx="20" cy="14" r="6.5" fill="currentColor"/>
  <rect x="14.5" y="7" width="11" height="4" rx="2" fill="currentColor"/>
  <polygon points="14,20 26,20 30,56 10,56" fill="currentColor"/>
  <line x1="29" y1="53" x2="37" y2="6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
`);

// Armored swordsman: crested helmet, raised sword.
const KNIGHT = svg(`
  <circle cx="20" cy="14" r="6.5" fill="currentColor"/>
  <polygon points="20,2 26,9 14,9" fill="currentColor"/>
  <polygon points="13,20 27,20 31,56 9,56" fill="currentColor"/>
  <line x1="30" y1="40" x2="39" y2="5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  <line x1="25" y1="35" x2="33" y2="31" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
`);

// Clergy figure: pointed mitre, crook staff.
const BISHOP = svg(`
  <polygon points="20,1 26,13 14,13" fill="currentColor"/>
  <circle cx="20" cy="15" r="6" fill="currentColor"/>
  <polygon points="14.5,21 25.5,21 29,57 11,57" fill="currentColor"/>
  <path d="M32,56 V18 a3,3 0 1 1 3,3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
`);

// Castle guard: crenellated helm, blocky build, small shield.
const ROOK = svg(`
  <rect x="14" y="5" width="4" height="6" fill="currentColor"/>
  <rect x="18" y="5" width="4" height="6" fill="currentColor"/>
  <rect x="22" y="5" width="4" height="6" fill="currentColor"/>
  <circle cx="20" cy="15" r="6.5" fill="currentColor"/>
  <polygon points="11,20 29,20 32,57 8,57" fill="currentColor"/>
  <rect x="3" y="30" width="8" height="14" rx="2.5" fill="currentColor"/>
`);

// Queen: pronged crown, flowing robe, orb.
const QUEEN = svg(`
  <circle cx="20" cy="14" r="6.5" fill="currentColor"/>
  <polygon points="13,10 15.5,2 18,10 20,3 22,10 24.5,2 27,10 27,12 13,12" fill="currentColor"/>
  <polygon points="15,20 25,20 32,58 8,58" fill="currentColor"/>
  <circle cx="33" cy="35" r="3" fill="currentColor"/>
  <line x1="30" y1="45" x2="33" y2="37" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
`);

// King: tallest crown topped with a cross, grandest robe, cross-scepter.
const KING = svg(`
  <circle cx="20" cy="13" r="6.5" fill="currentColor"/>
  <polygon points="13,9 15.5,1 18,9 20,2 22,9 24.5,1 27,9 27,11 13,11" fill="currentColor"/>
  <line x1="20" y1="-5" x2="20" y2="0" stroke="currentColor" stroke-width="2"/>
  <line x1="17.5" y1="-3" x2="22.5" y2="-3" stroke="currentColor" stroke-width="2"/>
  <polygon points="14,19 26,19 33,59 7,59" fill="currentColor"/>
  <line x1="33" y1="58" x2="33" y2="19" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="30" y1="21" x2="36" y2="21" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
`);

const FIGURES = { p: PAWN, n: KNIGHT, b: BISHOP, r: ROOK, q: QUEEN, k: KING };

export function pieceMarkup(type) {
  return FIGURES[type] || PAWN;
}
