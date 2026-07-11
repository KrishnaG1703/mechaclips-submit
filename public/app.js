/* ---------- snow ---------- */
const canvas = document.getElementById('snow');
const ctx = canvas.getContext('2d');
let flakes = [];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function sizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const count = Math.min(140, Math.floor((canvas.width * canvas.height) / 14000));
  flakes = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: 0.6 + Math.random() * 1.9,        // radius doubles as depth
    vy: 0.25 + Math.random() * 0.6,
    drift: Math.random() * Math.PI * 2,
    driftSpeed: 0.002 + Math.random() * 0.004,
    alpha: 0.15 + Math.random() * 0.45,
  }));
}

function drawSnow() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const f of flakes) {
    f.drift += f.driftSpeed;
    f.x += Math.sin(f.drift) * 0.3 * f.r;
    f.y += f.vy * f.r * 0.55;
    if (f.y > canvas.height + 4) { f.y = -4; f.x = Math.random() * canvas.width; }
    if (f.x > canvas.width + 4) f.x = -4;
    if (f.x < -4) f.x = canvas.width + 4;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 226, 255, ${f.alpha})`;
    ctx.fill();
  }
  if (!reducedMotion) requestAnimationFrame(drawSnow);
}

window.addEventListener('resize', sizeCanvas);
sizeCanvas();
drawSnow();

/* ---------- sound (WebAudio, no assets) ---------- */
let audioCtx = null;
function ac() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq, start, dur, vol, type = 'sine') {
  const a = ac();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, a.currentTime + start);
  gain.gain.linearRampToValueAtTime(vol, a.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + dur + 0.05);
}

const softTick = () => tone(1320, 0, 0.09, 0.04);
const softThud = () => tone(660, 0, 0.12, 0.05, 'triangle');
// gentle icy chime: three staggered high sines
function chime() {
  tone(1046.5, 0, 0.9, 0.06);   // C6
  tone(1318.5, 0.12, 0.9, 0.05); // E6
  tone(1568, 0.24, 1.2, 0.045);  // G6
}

/* ---------- form state ---------- */
const chipsEl = document.getElementById('chips');
const otherInput = document.getElementById('other-game');
const drop = document.getElementById('drop');
const fileInput = document.getElementById('file');
const dropIdle = document.getElementById('drop-idle');
const dropFile = document.getElementById('drop-file');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const fileClear = document.getElementById('file-clear');
const handleInput = document.getElementById('handle');
const form = document.getElementById('form');
const submitBtn = document.getElementById('submit');
const submitText = submitBtn.querySelector('.submit-text');
const progress = document.getElementById('progress');
const note = document.getElementById('note');
const successCard = document.getElementById('success');
const againBtn = document.getElementById('again');

let selectedGame = '';
let clipFile = null;

const MAX_SIZE = 100 * 1024 * 1024;

chipsEl.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  chipsEl.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  softTick();
  if (chip.dataset.game === '__other') {
    selectedGame = '';
    otherInput.classList.remove('hidden');
    otherInput.focus();
  } else {
    selectedGame = chip.dataset.game;
    otherInput.classList.add('hidden');
  }
  note.textContent = '';
});

otherInput.addEventListener('input', () => { selectedGame = otherInput.value.trim(); });

/* ---------- file handling ---------- */
function prettySize(bytes) {
  return bytes > 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}

function setFile(file) {
  if (!file) return;
  const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
  if (!isMp4) { note.textContent = 'mp4 only — export your clip as .mp4'; return; }
  if (file.size > MAX_SIZE) { note.textContent = 'that clip is over 100 MB — trim it down a little'; return; }
  clipFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = prettySize(file.size);
  dropIdle.classList.add('hidden');
  dropFile.classList.remove('hidden');
  note.textContent = '';
  softThud();
}

function clearFile() {
  clipFile = null;
  fileInput.value = '';
  dropIdle.classList.remove('hidden');
  dropFile.classList.add('hidden');
}

drop.addEventListener('click', (e) => {
  if (e.target === fileClear) return;
  fileInput.click();
});
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener('change', () => setFile(fileInput.files[0]));

['dragenter', 'dragover'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); })
);
['dragleave', 'drop'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); })
);
drop.addEventListener('drop', (e) => setFile(e.dataTransfer.files[0]));

fileClear.addEventListener('click', (e) => { e.stopPropagation(); clearFile(); });

/* ---------- submit ---------- */
form.addEventListener('submit', (e) => {
  e.preventDefault();
  note.textContent = '';
  if (!selectedGame) { note.textContent = 'pick a game first'; return; }
  if (!clipFile) { note.textContent = 'attach your .mp4 clip'; return; }

  const params = new URLSearchParams({
    game: selectedGame,
    handle: handleInput.value.trim(),
    name: clipFile.name,
  });

  submitBtn.disabled = true;
  submitText.textContent = 'sending…';

  const xhr = new XMLHttpRequest();
  xhr.open('PUT', `/api/upload?${params}`);
  xhr.upload.onprogress = (ev) => {
    if (ev.lengthComputable) progress.style.width = `${(ev.loaded / ev.total) * 100}%`;
  };
  xhr.onload = () => {
    let res = {};
    try { res = JSON.parse(xhr.responseText); } catch {}
    if (xhr.status === 200 && res.ok) {
      chime();
      snowBurst();
      form.classList.add('hidden');
      successCard.classList.remove('hidden');
    } else {
      note.textContent = res.error || 'something went wrong — try again';
    }
    resetSubmitBtn();
  };
  xhr.onerror = () => {
    note.textContent = 'connection dropped — try again';
    resetSubmitBtn();
  };
  xhr.send(clipFile);
});

function resetSubmitBtn() {
  submitBtn.disabled = false;
  submitText.textContent = 'send it in';
  progress.style.width = '0%';
}

/* brief flurry when a clip lands */
function snowBurst() {
  const burst = Math.min(50, flakes.length);
  for (let i = 0; i < burst; i++) {
    flakes.push({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height * 0.3,
      r: 1 + Math.random() * 2.2,
      vy: 1 + Math.random() * 1.4,
      drift: Math.random() * Math.PI * 2,
      driftSpeed: 0.004 + Math.random() * 0.006,
      alpha: 0.3 + Math.random() * 0.5,
    });
  }
  setTimeout(() => { flakes.length = Math.max(0, flakes.length - burst); }, 6000);
}

againBtn.addEventListener('click', () => {
  clearFile();
  handleInput.value = '';
  otherInput.value = '';
  otherInput.classList.add('hidden');
  selectedGame = '';
  chipsEl.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
  successCard.classList.add('hidden');
  form.classList.remove('hidden');
});
