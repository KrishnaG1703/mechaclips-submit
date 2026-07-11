const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 4321;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'submissions.json');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_SIZE = 200 * 1024 * 1024; // 200 MB per clip

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, _file, cb) => {
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.mp4`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'video/mp4' || file.originalname.toLowerCase().endsWith('.mp4');
    cb(ok ? null : new Error('Only .mp4 files are accepted'), ok);
  },
});

function readDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeDb(rows) {
  fs.writeFileSync(DB_FILE, JSON.stringify(rows, null, 2));
}

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

app.post('/api/submit', (req, res) => {
  upload.single('clip')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Clip is over 200 MB' : err.message;
      return res.status(400).json({ ok: false, error: msg });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No clip attached' });
    }
    const game = (req.body.game || '').toString().trim().slice(0, 60);
    const handle = (req.body.handle || '').toString().trim().slice(0, 60);
    if (!game) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ ok: false, error: 'Pick a game first' });
    }
    const rows = readDb();
    const entry = {
      id: crypto.randomUUID(),
      game,
      handle: handle || 'anonymous',
      file: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      submittedAt: new Date().toISOString(),
    };
    rows.unshift(entry);
    writeDb(rows);
    res.json({ ok: true, id: entry.id });
  });
});

app.get('/api/submissions', (_req, res) => {
  res.json(readDb());
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`MechaClips submit running on http://localhost:${PORT}`);
});
