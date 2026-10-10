# SAHAL TEC Universal AI Chat Exporter v1.3 (Beta)

## কী আছে
- Contenteditable editor: browser/AI থেকে rich paste করার চেষ্টা করে
- Preview with MathJax; common delimiter-free LaTeX normalization
- HTML, Markdown, TXT import (DOCX import নেই)
- Export endpoint: DOCX, HTML, Markdown; PDF only when XeLaTeX exists
- Server-side HTML sanitization; unique temporary folders; Pandoc called without shell
- `/health` endpoint

## গুরুত্বপূর্ণ সীমাবদ্ধতা
- ChatGPT/Gemini/NotebookLM/DeepSeek/Claude/Qwen-সহ কোনো AI platform-এর official integration/API নেই। কনটেন্ট user copy/paste বা ফাইল import করে।
- Clipboard rich formatting browser, source page, and mobile OS অনুযায়ী ভিন্ন হতে পারে। সব image, chart, citation, interactive artifact বা hidden metadata অক্ষত থাকবে—এমন নিশ্চয়তা নেই।
- DOCX export HTML থেকে Turndown Markdown এবং Pandoc ব্যবহার করে। টেবিল/কোড/ছবি/LaTeX-এর fidelity কনটেন্ট অনুযায়ী পরীক্ষা করতে হবে।
- PDF-এর জন্য XeLaTeX প্রয়োজন; Dockerfile ইচ্ছাকৃতভাবে বড় TeX distribution ইনস্টল করে না, তাই PDF endpoint 501 দিতে পারে।
- PDF/DOCX export বাস্তব Render deployment-এ যাচাই না হওয়া পর্যন্ত production-ready ধরে নেবেন না।

## Deploy-এর আগে
1. GitHub repository-র `public/index.html` এবং root `index.html` অপরিবর্তিত রাখুন।
2. `public/ai-converter.html` আপডেট করুন।
3. `server.js`, `package.json`, `Dockerfile`, `safe-filename.js`, `lib/normalize-latex.js` এবং `README-BN.md` root-এ আপডেট করুন। `test/` ফোল্ডারও যোগ করুন।
4. `package-lock.json` package.json-এর সঙ্গে মিলিয়ে regenerate করতে হবে (`npm install`)—Render build যদি lockfile-based install ব্যবহার করে, এটি জরুরি।
5. Render deployment log এবং `/health` পরীক্ষা করুন; তারপর sample content দিয়ে HTML/MD/DOCX/PDF আলাদা করে পরীক্ষা করুন।

## Local run
Node.js 18+, Pandoc এবং dependencies প্রয়োজন:

```bash
npm install
npm test
npm start
```

তারপর `/ai-converter.html` খুলুন।
