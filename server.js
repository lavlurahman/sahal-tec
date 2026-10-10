'use strict';
const express = require('express');
const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sanitizeHtml = require('sanitize-html');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');
const { cleanFilename } = require('./safe-filename');
const { normalizeBareLatex } = require('./lib/normalize-latex');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MAX_CHARS = Number(process.env.MAX_TEXT_CHARS) || 500000;
const MAX_BODY = process.env.MAX_BODY || '5mb';
const PANDOC = process.env.PANDOC_BIN || 'pandoc';
app.disable('x-powered-by');
app.use(express.json({ limit: MAX_BODY, strict: true }));
app.use(express.static(path.join(__dirname, 'public'), { etag: true, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'sahal-tec-universal-exporter', version: '1.3.0' }));

const allowedTags = sanitizeHtml.defaults.allowedTags.concat([
  'img', 'h1', 'h2', 'h3', 'h4', 'figure', 'figcaption', 'del', 'ins', 'sub', 'sup', 'details', 'summary'
]);
const cleanOptions = {
  allowedTags: [...new Set(allowedTags)],
  allowedAttributes: {
    '*': ['class', 'style', 'title', 'dir', 'lang'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    ol: ['start'], li: ['value'], th: ['colspan', 'rowspan', 'align'], td: ['colspan', 'rowspan', 'align']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'data'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true) }
};
function sanitizeUserHtml(html) {
  return sanitizeHtml(String(html || ''), cleanOptions);
}
function htmlToMarkdown(html) {
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*' });
  turndown.use(gfm);
  turndown.addRule('mathjax', {
    filter: (node) => node.nodeName === 'SPAN' && (node.classList?.contains('math') || node.getAttribute?.('data-latex')),
    replacement: (_content, node) => {
      const latex = node.getAttribute('data-latex') || node.getAttribute('aria-label');
      return latex ? `\\(${latex}\\)` : _content;
    }
  });
  return turndown.turndown(html);
}
function runPandoc(args) {
  return new Promise((resolve, reject) => execFile(PANDOC, args, { timeout: 45000, maxBuffer: 8 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
    if (error) { error.pandocStderr = String(stderr || '').slice(0, 2500); reject(error); }
    else resolve({ stdout, stderr });
  }));
}
function htmlDocument(title, html) {
  const safeTitle = String(title).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>body{font-family:Arial,'Noto Sans Bengali',sans-serif;line-height:1.75;max-width:900px;margin:32px auto;padding:0 18px}img{max-width:100%;height:auto}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #bbb;padding:6px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f5f5;padding:12px}blockquote{border-left:4px solid #bbb;margin-left:0;padding-left:14px}</style><script>window.MathJax={tex:{inlineMath:[['$','$'],['\\(','\\)']],displayMath:[['$$','$$'],['\\[','\\]']]}};</script><script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script></head><body>${html}</body></html>`;
}

app.post('/convert', async (req, res) => {
  const body = req.body || {};
  const format = String(body.format || 'docx').toLowerCase();
  const title = cleanFilename(body.title || 'SAHAL_TEC_Document');
  const allowed = new Set(['docx', 'html', 'md', 'pdf']);
  if (!allowed.has(format)) return res.status(400).json({ error: 'সমর্থিত ফরম্যাট: DOCX, HTML, Markdown, PDF।' });

  let safeHtml = '';
  let markdown = '';
  if (typeof body.html === 'string' && body.html.trim()) {
    if (body.html.length > MAX_CHARS * 4) return res.status(413).json({ error: 'HTML কনটেন্ট অনেক বড়। ছোট কনটেন্ট দিয়ে চেষ্টা করুন।' });
    safeHtml = sanitizeUserHtml(body.html);
    markdown = htmlToMarkdown(safeHtml);
  }
  const rawText = typeof body.text === 'string' ? body.text : '';
  if (!markdown.trim()) markdown = rawText;
  if (!markdown.trim() && !safeHtml.trim()) return res.status(400).json({ error: 'কনভার্ট করার মতো লেখা পাওয়া যায়নি।' });
  if (markdown.length > MAX_CHARS || rawText.length > MAX_CHARS) return res.status(413).json({ error: `কনটেন্ট অনেক বড়। সর্বোচ্চ ${MAX_CHARS.toLocaleString()} অক্ষর গ্রহণ করা হয়।` });
  markdown = normalizeBareLatex(markdown);

  if (format === 'html') {
    const html = safeHtml.trim() ? htmlDocument(title, safeHtml) : htmlDocument(title, `<pre>${markdown.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</pre>`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${title}.html"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  }
  if (format === 'md') {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${title}.md"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(markdown);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sahal-tec-'));
  const inputPath = path.join(tempDir, 'input.md');
  const outputPath = path.join(tempDir, `output.${format}`);
  try {
    await fs.writeFile(inputPath, markdown, { encoding: 'utf8', flag: 'wx' });
    const args = [
      '--from=markdown+tex_math_dollars+tex_math_single_backslash+pipe_tables+fenced_code_blocks+strikeout+task_lists+raw_html',
      '--standalone', `--metadata=title:${title}`, '--variable=papersize:a4', '--variable=geometry:margin=1in',
      '--output', outputPath, inputPath
    ];
    if (format === 'pdf') {
      try { await runPandoc(['--version']); await new Promise((resolve, reject) => execFile('xelatex', ['--version'], { timeout: 5000 }, err => err ? reject(err) : resolve())); }
      catch { return res.status(501).json({ error: 'PDF রপ্তানির জন্য সার্ভারে XeLaTeX ইনস্টল নেই। আপাতত DOCX/HTML/Markdown ব্যবহার করুন।' }); }
      args.unshift('--pdf-engine=xelatex');
      args.push('--variable=mainfont:Noto Sans Bengali');
    }
    await runPandoc(args);
    const stat = await fs.stat(outputPath);
    if (!stat.size) throw new Error('Empty output');
    const mime = format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${title}.${format}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(outputPath, (error) => { if (error && !res.headersSent) res.status(500).json({ error: 'ফাইল ডাউনলোডে সমস্যা হয়েছে।' }); fs.rm(tempDir, { recursive: true, force: true }).catch(() => {}); });
  } catch (error) {
    console.error('Conversion failed:', error.message, error.pandocStderr || '');
    if (!res.headersSent) res.status(error.code === 'ENOENT' ? 503 : 500).json({ error: error.code === 'ENOENT' ? 'সার্ভারে Pandoc পাওয়া যায়নি। Deployment configuration পরীক্ষা করুন।' : 'ফাইল তৈরি করা যায়নি। ইনপুট ও সূত্রের গঠন পরীক্ষা করে আবার চেষ্টা করুন।' });
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'অনুরোধটি অনেক বড়। ছোট কনটেন্ট দিয়ে চেষ্টা করুন।' });
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: 'অনুরোধের JSON সঠিক নয়।' });
  console.error('Request error:', err?.message || err);
  return res.status(500).json({ error: 'সার্ভারে অপ্রত্যাশিত সমস্যা হয়েছে।' });
});

if (require.main === module) app.listen(PORT, '0.0.0.0', () => console.log(`SAHAL TEC Universal Exporter listening on ${PORT}`));
module.exports = { app, normalizeBareLatex, sanitizeUserHtml };
