// Move-count test for the standard-chess baseline (buffs OFF). This is the
// check the class requires before building anything else: 20 legal moves at
// depth 1, 400 at depth 2, 8,902 at depth 3, from the start position.
//
// Run with: node test/rules.perft.test.js  (or `npm test`)

import { createInitialState, perft } from '../public/rules.js';

const state = createInitialState(false); // buffs disabled: pure standard chess
const expected = { 1: 20, 2: 400, 3: 8902 };

let allPassed = true;
for (const depth of [1, 2, 3]) {
  const actual = perft(state, depth);
  const passed = actual === expected[depth];
  console.log(`perft(${depth}) = ${actual}  (expected ${expected[depth]})  ${passed ? 'OK' : 'FAIL'}`);
  if (!passed) allPassed = false;
}

if (!allPassed) {
  console.error('\nBaseline move-count test FAILED — fix rules.js before building anything else.');
  process.exit(1);
}
console.log('\nBaseline move-count test passed.');
