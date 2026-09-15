// Story Line — hand-drawn medieval figures for each piece, standing in for
// the standard chess roles. Plain inline SVG (no image files, no library):
// each figure is a flat silhouette that fills with `currentColor`, so the
// existing piece-w/piece-b CSS colors just work. viewBox has margin around
// the figure so props (spears, crowns, pauldrons) aren't clipped.
//
// Each role is a deliberately different SILHOUETTE, not just a different
// hat, so they stay readable at small size: the rook is short and very
// wide, the bishop is tall and narrow with a sharp mitre, the knight has
// spiked shoulder pauldrons and a horned helm, the queen has a dramatic
// flared hem, the king is the tallest with a cross-topped crown, and the
// pawn is small and plain.

const VIEWBOX = '-10 -10 60 80';

function svg(inner) {
  return `<svg viewBox="${VIEWBOX}" class="piece-svg" aria-hidden="true">${inner}</svg>`;
}

// Foot soldier: small, plain, round cap, short shouldered spear.
const PAWN = svg(`
  <circle cx="20" cy="16" r="5.5" fill="currentColor"/>
  <rect x="15" y="10" width="10" height="3.5" rx="1.75" fill="currentColor"/>
  <polygon points="15,21 25,21 28,50 12,50" fill="currentColor"/>
  <line x1="27" y1="47" x2="34" y2="12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
`);

// Armored soldier: horned helm, big spiked shoulder pauldrons, sword held
// out wide — the widest, spikiest silhouette on the board.
const KNIGHT = svg(`
  <polygon points="12,12 9,-2 17,9" fill="currentColor"/>
  <polygon points="28,12 31,-2 23,9" fill="currentColor"/>
  <circle cx="20" cy="14" r="6.5" fill="currentColor"/>
  <circle cx="8" cy="24" r="6" fill="currentColor"/>
  <circle cx="32" cy="24" r="6" fill="currentColor"/>
  <polygon points="13,20 27,20 30,54 10,54" fill="currentColor"/>
  <line x1="31" y1="42" x2="42" y2="8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  <line x1="24" y1="34" x2="35" y2="28" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
`);

// Clergy figure: tall, narrow, sharply pointed mitre, long crook staff —
// the tallest, thinnest silhouette on the board.
const BISHOP = svg(`
  <polygon points="20,-9 28,16 12,16" fill="currentColor"/>
  <circle cx="20" cy="17" r="5.5" fill="currentColor"/>
  <polygon points="17,22 23,22 26,60 14,60" fill="currentColor"/>
  <path d="M31,59 V16 a4,4 0 1 1 4,4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
`);

// Castle guard: short and very wide, crenellated (castle-tooth) helm, big
// shield — the shortest, blockiest silhouette on the board.
const ROOK = svg(`
  <rect x="6" y="4" width="5" height="7" fill="currentColor"/>
  <rect x="13" y="4" width="5" height="7" fill="currentColor"/>
  <rect x="20" y="4" width="5" height="7" fill="currentColor"/>
  <rect x="27" y="4" width="5" height="7" fill="currentColor"/>
  <circle cx="20" cy="16" r="7" fill="currentColor"/>
  <polygon points="6,22 34,22 37,50 3,50" fill="currentColor"/>
  <rect x="-3" y="28" width="9" height="16" rx="2.5" fill="currentColor"/>
`);

// Queen: pronged crown, dramatically flared hem — wider at the base than
// any other piece, marking her out as royalty in motion.
const QUEEN = svg(`
  <circle cx="20" cy="15" r="6" fill="currentColor"/>
  <polygon points="12,10 15,1 18,10 20,2 22,10 25,1 28,10 28,12.5 12,12.5" fill="currentColor"/>
  <polygon points="16,21 24,21 36,62 4,62" fill="currentColor"/>
  <circle cx="34" cy="34" r="3.2" fill="currentColor"/>
  <line x1="30" y1="46" x2="34" y2="37" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
`);

// King: the tallest figure, topped with a cross-crown, holding a full
// cross-tipped scepter — grandest and most vertical silhouette.
const KING = svg(`
  <circle cx="20" cy="12" r="6.5" fill="currentColor"/>
  <polygon points="12,8 15,-1 18,8 20,-2 22,8 25,-1 28,8 28,10.5 12,10.5" fill="currentColor"/>
  <line x1="20" y1="-11" x2="20" y2="-4" stroke="currentColor" stroke-width="2.4"/>
  <line x1="17" y1="-8" x2="23" y2="-8" stroke="currentColor" stroke-width="2.4"/>
  <polygon points="14,18 26,18 33,62 7,62" fill="currentColor"/>
  <line x1="35" y1="60" x2="35" y2="18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  <line x1="31.5" y1="20" x2="38.5" y2="20" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
`);

const FIGURES = { p: PAWN, n: KNIGHT, b: BISHOP, r: ROOK, q: QUEEN, k: KING };

export function pieceMarkup(type) {
  return FIGURES[type] || PAWN;
}
