// Story Line — capture effects. Each piece TYPE gets its own distinct burst
// when it captures an enemy piece, matching the flavor of its buff: a
// spear jab for pawns, a blade slash for knights, a holy light burst for
// bishops, a shattering impact for rooks, a radiant sparkle burst for
// queens, and a double shockwave for kings. Pure CSS keyframe animations
// (see style.css) — no library. The caller mounts the returned markup at
// the captured square, then removes the element after
// CAPTURE_FX_DURATION_MS.

export const CAPTURE_FX_DURATION_MS = 650;

function jabs() {
  return [-24, 0, 24]
    .map((ang) => `<span class="fx-line fx-pawn-line" style="--ang:${ang}deg"></span>`)
    .join('');
}

function debris() {
  return [[22, -16], [-22, -16], [22, 16], [-22, 16]]
    .map(([dx, dy]) => `<span class="fx-debris" style="--dx:${dx}px;--dy:${dy}px"></span>`)
    .join('');
}

function sparks() {
  return [[0, -28], [24, -9], [-24, -9], [15, 22], [-15, 22]]
    .map(([dx, dy]) => `<span class="fx-spark" style="--dx:${dx}px;--dy:${dy}px"></span>`)
    .join('');
}

const EFFECTS = {
  p: () => `<span class="fx-dot fx-pawn-flash"></span>${jabs()}`,
  n: () => `<span class="fx-dot fx-flash-white"></span><span class="fx-slash"></span>`,
  b: () => `<span class="fx-glow fx-glow-gold"></span><span class="fx-rays fx-rays-gold"></span>`,
  r: () => `<span class="fx-ring fx-ring-heavy"></span>${debris()}`,
  q: () => `<span class="fx-glow fx-glow-royal"></span>${sparks()}`,
  k: () => `<span class="fx-dot fx-flash-crimson"></span><span class="fx-ring fx-ring-royal-1"></span><span class="fx-ring fx-ring-royal-2"></span>`,
};

// `type` is the CAPTURING piece's type — the effect reflects how that
// piece takes down its target, not what was captured.
export function captureEffectMarkup(type) {
  const build = EFFECTS[type] || EFFECTS.p;
  return build();
}
