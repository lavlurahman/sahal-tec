const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // বড় ফাইলের জন্য লিমিট বাড়ানো হলো
app.use(express.static('public'));

// কনভার্সন এবং ডাউনলোড API
app.post('/convert', (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).send('কোনো টেক্সট পাওয়া যায়নি');

    const timestamp = Date.now();
    // টেম্পোরারি ফাইলগুলোর নাম
    const mdFile = path.join(__dirname, `temp_${timestamp}.md`);
    const docxFile = path.join(__dirname, `output_${timestamp}.docx`);

    // 1. টেক্সটটি একটি .md ফাইলে সেভ করা
    fs.writeFileSync(mdFile, text);

    // 2. Pandoc দিয়ে .md থেকে .docx এ কনভার্ট করা (A4 সাইজ এবং মার্জিন সহ)
    const pandocCommand = `pandoc "${mdFile}" -o "${docxFile}" -V papersize=a4paper -V geometry:margin=1in`;

    exec(pandocCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Pandoc Error: ${error}`);
            return res.status(500).send('ফাইল কনভার্ট করতে সমস্যা হয়েছে।');
        }
        
        // 3. কনভার্ট সফল হলে ফাইলটি ক্লায়েন্টকে ডাউনলোড করতে পাঠানো
        res.download(docxFile, 'SAHAL_TEC_Document.docx', (err) => {
            // 4. ডাউনলোড শেষ হলে সার্ভার থেকে টেম্পোরারি ফাইলগুলো মুছে ফেলা (Storage যেন ফুল না হয়)
            try {
                if (fs.existsSync(mdFile)) fs.unlinkSync(mdFile);
                if (fs.existsSync(docxFile)) fs.unlinkSync(docxFile);
            } catch (e) {
                console.error('ফাইল মুছতে সমস্যা:', e);
            }
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`সার্ভার চলছে: http://localhost:${PORT}`);
});