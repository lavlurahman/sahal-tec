'use strict';

// Conservative helper for common delimiter-free LaTeX copied from AI answers.
// It intentionally avoids wrapping every backslash command blindly.
function normalizeBareLatex(input) {
  return String(input || '').split('\n').map((line) => {
    if (!line.trim()) return line;
    if (/\$\$|\\\[|\\\]|\\\(|\\\)/.test(line) || /(^|[^\\])\$[^$]+\$/.test(line)) return line;
    const hasCommand = /\\(?:sqrt|frac|dfrac|tfrac|hat|widehat|vec|overrightarrow|overleftarrow|times|cdot|alpha|beta|theta|pi)\b/.test(line);
    if (!hasCommand) return line;

    // Lines containing only math / Latin text can safely be wrapped as inline math.
    if (!/[\u0980-\u09FF]/.test(line)) return `\\(${line.trim()}\\)`;

    // In Bengali prose, wrap common formula fragments only.
    const fragment = /(?:\|[A-Za-z]+\|\s*=\s*)?(?:\\(?:sqrt|frac|dfrac|tfrac|hat|widehat|vec|overrightarrow|overleftarrow)\{[^{}\n]*\}|[A-Za-z|][A-Za-z0-9|]*\\(?:sqrt|frac|hat|vec|overrightarrow)\{[^{}\n]*\})(?:\s*(?:=|\+|-|\\times|\\cdot)\s*(?:\\(?:sqrt|frac|dfrac|hat|vec|overrightarrow)\{[^{}\n]*\}|[A-Za-z0-9|()]+))*/g;
    return line.replace(fragment, (match) => `\\(${match.trim()}\\)`);
  }).join('\n');
}

module.exports = { normalizeBareLatex };
