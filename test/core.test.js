const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanFilename } = require('../safe-filename');
const { normalizeBareLatex } = require('../lib/normalize-latex');

test('filename removes path separators and control characters', () => {
  assert.equal(cleanFilename('../../bad/name'), 'badname');
  assert.equal(cleanFilename('lesson: 1?'), 'lesson_1');
});
test('filename has safe fallback and max length', () => {
  assert.equal(cleanFilename(''), 'SAHAL_TEC_Document');
  assert.equal(cleanFilename('x'.repeat(200)).length, 80);
});
test('delimiter-free LaTeX is detected in standalone formula lines', () => {
  assert.equal(normalizeBareLatex('\\sqrt{25}'), '\\(\\sqrt{25}\\)');
  assert.equal(normalizeBareLatex('\\overrightarrow{PQ}=(0,-2,4)'), '\\(\\overrightarrow{PQ}=(0,-2,4)\\)');
});
test('existing delimiters and ordinary prose are preserved', () => {
  assert.equal(normalizeBareLatex('$$F=ma$$'), '$$F=ma$$');
  assert.equal(normalizeBareLatex('বাংলা সাধারণ লেখা'), 'বাংলা সাধারণ লেখা');
});
