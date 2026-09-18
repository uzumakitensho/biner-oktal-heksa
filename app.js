/* ============================================================
   KONFIGURASI UNTUK GURU
   Tempel URL Web App Google Apps Script di sini supaya skor
   murid otomatis terkirim & terkumpul di satu Google Sheet.
   Kosongkan ("") kalau belum mau memakai fitur ini — aplikasi
   tetap berjalan normal, hanya saja skor tidak terkirim ke guru.
   Cara membuatnya ada di panduan terpisah yang menyertai file ini.
============================================================ */
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwOUQoJMQg74xmT0XjwAMNpuhp7OqWH0H0PjyA3J1DXiLKnvOtnc8nf4mJow0lIh36e-A/exec";

/* ============================================================
   STATE
============================================================ */
const LEVELS = ["bit","okt","hex","boss"];
const LEVEL_META = {
  bit:  {title:"Bilangan Biner", color:"bit",  xpMax:100},
  okt:  {title:"Bilangan Oktal", color:"okt",  xpMax:100},
  hex:  {title:"Bilangan Heksadesimal", color:"hex", xpMax:100},
  boss: {title:"Tantangan Campuran", color:"boss", xpMax:100}
};
const TOTAL_XP = 400;

let state = loadState();

function defaultState(){
  return {
    xp:0,
    completed:{bit:false, okt:false, hex:false, boss:false},
    unlocked:{bit:true, okt:false, hex:false, boss:false}
  };
}
function loadState(){
  try{
    const raw = localStorage.getItem("petadigital_progress");
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed.xp !== "number") return defaultState();
    return parsed;
  }catch(e){ return defaultState(); }
}
function saveState(){
  try{ localStorage.setItem("petadigital_progress", JSON.stringify(state)); }catch(e){}
}
function resetProgress(){
  if(!confirm("Ulang semua progres dari nol?")) return;
  state = defaultState();
  saveState();
  renderMap();
  showToast("🔄 Progres direset. Semangat mulai lagi!");
}

/* ============================================================
   IDENTITAS MURID (nama & kelas) — dipakai untuk rekap guru
============================================================ */
function getIdentity(){
  try{
    const raw = localStorage.getItem("petadigital_identitas");
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function saveIdentity(){
  const nama = document.getElementById("idNama").value.trim();
  const kelas = document.getElementById("idKelas").value.trim();
  const err = document.getElementById("idError");
  if(!nama || !kelas){
    err.textContent = "Nama dan kelas wajib diisi ya.";
    return;
  }
  try{ localStorage.setItem("petadigital_identitas", JSON.stringify({nama,kelas})); }catch(e){}
  document.getElementById("idOverlay").classList.remove("show");
}
(function initIdentityGate(){
  const id = getIdentity();
  if(id){
    // sudah pernah isi identitas di perangkat ini
  } else {
    document.getElementById("idOverlay").classList.add("show");
  }
})();

/* ============================================================
   KIRIM SKOR KE GURU (Google Apps Script Web App)
   Dipanggil tiap kali murid menyelesaikan sebuah kuis/level.
   Memakai mode "no-cors" karena Apps Script tidak mengirim
   header CORS — respons tidak bisa dibaca, tapi datanya tetap
   sampai dan tersimpan di Google Sheet.
============================================================ */
function sendScoreToTeacher(level, correct, total, xpGain){
  if(!GOOGLE_SCRIPT_URL) return;
  const id = getIdentity() || {nama:"(tanpa nama)", kelas:"-"};
  const payload = {
    nama: id.nama,
    kelas: id.kelas,
    level: level,
    benar: correct,
    total: total,
    xpDidapat: xpGain,
    totalXP: state.xp,
    waktu: new Date().toISOString()
  };
  fetch(GOOGLE_SCRIPT_URL, {
    method:"POST",
    mode:"no-cors",
    headers:{"Content-Type":"text/plain"},
    body: JSON.stringify(payload)
  }).catch(()=>{ /* diam saja kalau gagal, jangan ganggu murid */ });
}

/* ============================================================
   HERO decorative bit rain (static text, purely visual)
============================================================ */
(function fillHeroBits(){
  const el = document.getElementById("heroBits");
  let out = "";
  for(let r=0;r<10;r++){
    let row = "";
    for(let c=0;c<28;c++){ row += Math.random() > 0.5 ? "1" : "0"; }
    out += row + "\n";
  }
  el.textContent = out;
})();

function scrollToMap(){
  document.getElementById("mapSection").scrollIntoView({behavior:"smooth", block:"start"});
}

/* ============================================================
   TOAST
============================================================ */
let toastTimer=null;
function showToast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"), 2600);
}

/* ============================================================
   MAP RENDER
============================================================ */
function renderMap(){
  LEVELS.forEach(lv=>{
    const node = document.querySelector('.node[data-level="'+lv+'"]');
    node.classList.remove("locked","unlocked","done");
    if(state.completed[lv]){
      node.classList.add("done");
      if(!node.querySelector(".badge-star")){
        const s = document.createElement("span");
        s.className="badge-star"; s.textContent="⭐";
        node.appendChild(s);
      }
    } else if(state.unlocked[lv]){
      node.classList.add("unlocked");
    } else {
      node.classList.add("locked");
    }
  });

  document.getElementById("sbFill").style.width = Math.min(100, (state.xp/TOTAL_XP)*100) + "%";
  document.getElementById("sbXp").textContent = state.xp + " / " + TOTAL_XP + " XP";

  let title = "Petualang Baru";
  if(state.xp >= TOTAL_XP) title = "Juara Sistem Bilangan 🏆";
  else if(state.xp >= 300) title = "Ahli Konversi";
  else if(state.xp >= 150) title = "Penjelajah Digital";
  else if(state.xp >= 50) title = "Pemula Cerdas";
  document.getElementById("sbName").textContent = title;
}
renderMap();

function copyRecap(){
  const id = getIdentity() || {nama:"(belum isi nama)", kelas:"-"};
  const namaLevel = {bit:"Biner", okt:"Oktal", hex:"Heksadesimal", boss:"Tantangan Campuran"};
  let text = "Rekap Peta Digital\n";
  text += "Nama: " + id.nama + "\n";
  text += "Kelas: " + id.kelas + "\n";
  text += "Total XP: " + state.xp + " / " + TOTAL_XP + "\n";
  LEVELS.forEach(lv=>{
    text += "- " + namaLevel[lv] + ": " + (state.completed[lv] ? "Lulus ✅" : "Belum lulus") + "\n";
  });
  navigator.clipboard.writeText(text).then(()=>{
    showToast("📋 Rekap disalin. Tempel & kirim ke guru.");
  }).catch(()=>{
    showToast("Gagal menyalin. Coba salin manual: " + text);
  });
}

function awardXP(amount){
  state.xp = Math.min(TOTAL_XP, state.xp + amount);
  saveState();
  renderMap();
}
function markComplete(level, nextLevel){
  if(!state.completed[level]){
    state.completed[level] = true;
    if(nextLevel) state.unlocked[nextLevel] = true;
    saveState();
    renderMap();
  }
}

/* ============================================================
   OVERLAY HELPERS
============================================================ */
const overlay = document.getElementById("overlay");
const panelEl = document.getElementById("panel");
function closePanel(){
  overlay.classList.remove("show");
  panelEl.innerHTML = "";
  if(bossTimerInterval) clearInterval(bossTimerInterval);
}
overlay.addEventListener("click", (e)=>{ if(e.target === overlay) closePanel(); });
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closePanel(); });

function panelHeadHTML(eyebrow, title, colorClass){
  return `<div class="panel-head">
      <div><span class="eyebrow" style="color:var(--${colorClass})">${eyebrow}</span><h2>${title}</h2></div>
      <button class="close-x" onclick="closePanel()" aria-label="Tutup">✕</button>
    </div>`;
}

function openLevel(level){
  if(!state.unlocked[level] && !state.completed[level]){
    showToast("🔒 Selesaikan level sebelumnya dulu, ya!");
    return;
  }
  overlay.classList.add("show");
  if(level==="bit") renderBitLevel();
  if(level==="okt") renderOktLevel();
  if(level==="hex") renderHexLevel();
  if(level==="boss") renderBossLevel();
}

/* ============================================================
   LEVEL 1 — BINER
============================================================ */
function renderBitLevel(){
  panelEl.innerHTML = `
    ${panelHeadHTML("LEVEL 1 · BASIS 2","Bilangan Biner", "bit")}
    <div class="panel-body">
      <h4>Apa itu bilangan biner?</h4>
      <p>Biner cuma pakai dua angka: <code>0</code> dan <code>1</code>. Tiap digitnya disebut <b>bit</b>. Komputer pakai biner karena rangkaian listriknya cuma kenal dua kondisi: mati (0) atau menyala (1).</p>
      <p>Setiap posisi bit punya "nilai tempat" berupa pangkat 2, dihitung dari kanan mulai 2⁰:</p>
      <div class="place-values">
        <span>2⁷=128</span><span>2⁶=64</span><span>2⁵=32</span><span>2⁴=16</span>
        <span>2³=8</span><span>2²=4</span><span>2¹=2</span><span>2⁰=1</span>
      </div>
      <p>Contoh: <code>1011</code> = (1×8)+(0×4)+(1×2)+(1×1) = <b>11</b> dalam desimal.</p>

      <h4>🔌 Papan Saklar Bit &mdash; coba-coba dulu</h4>
      <p>Klik saklar untuk menyala/mematikannya dan lihat nilai desimalnya berubah langsung.</p>
      <div class="bitboard" id="bitboard"></div>
      <div class="decimal-readout">
        <span class="num" id="bitDecimal">0</span>
        <span class="lbl">nilai desimal</span>
      </div>

      <h4>🎯 Tantangan: cocokkan angkanya</h4>
      <div class="target-chip" id="bitTarget">Buat angka desimal: <b id="bitTargetNum">--</b></div>
      <div class="row-btn">
        <button class="btn btn-primary" onclick="checkBitChallenge()">Cek Jawaban</button>
        <button class="btn btn-ghost" onclick="newBitChallenge()">Angka Baru</button>
      </div>
      <div class="feedback" id="bitChallengeFeedback"></div>

      <h4>🧠 Kuis Biner (5 soal)</h4>
      <p>Lulus kuis untuk membuka Level 2 &middot; Oktal.</p>
      <div class="row-btn"><button class="btn btn-primary" onclick="startQuiz('bit')">Mulai Kuis</button></div>
    </div>
  `;
  initBitboard();
  newBitChallenge();
}

let bitState = [0,0,0,0,0,0,0,0]; // index0 = 128 ... index7 = 1
const bitPlaces = [128,64,32,16,8,4,2,1];
function initBitboard(){
  const board = document.getElementById("bitboard");
  board.innerHTML = "";
  bitState = [0,0,0,0,0,0,0,0];
  bitPlaces.forEach((p,i)=>{
    const col = document.createElement("div");
    col.className="bit-col";
    col.innerHTML = `<span class="bit-place">${p}</span><div class="switch" data-i="${i}">0</div>`;
    board.appendChild(col);
  });
  board.querySelectorAll(".switch").forEach(sw=>{
    sw.addEventListener("click", ()=>{
      const i = +sw.dataset.i;
      bitState[i] = bitState[i] ? 0 : 1;
      sw.textContent = bitState[i];
      sw.classList.toggle("on", bitState[i]===1);
      updateBitDecimal();
    });
  });
  updateBitDecimal();
}
function currentBitDecimal(){
  return bitState.reduce((sum,b,i)=> sum + b*bitPlaces[i], 0);
}
function updateBitDecimal(){
  document.getElementById("bitDecimal").textContent = currentBitDecimal();
}
let bitTargetValue = 0;
function newBitChallenge(){
  bitTargetValue = 1 + Math.floor(Math.random()*254);
  document.getElementById("bitTargetNum").textContent = bitTargetValue;
  document.getElementById("bitChallengeFeedback").textContent = "";
  document.getElementById("bitChallengeFeedback").className="feedback";
  initBitboard();
}
function checkBitChallenge(){
  const fb = document.getElementById("bitChallengeFeedback");
  if(currentBitDecimal() === bitTargetValue){
    fb.textContent = "✅ Tepat! " + bitTargetValue + " = " + bitState.join("") + " dalam biner.";
    fb.className = "feedback ok";
    awardXP(5);
  } else {
    fb.textContent = "❌ Belum pas. Nilai saklar sekarang: " + currentBitDecimal() + ". Coba lagi!";
    fb.className = "feedback bad";
  }
}

/* ============================================================
   LEVEL 2 — OKTAL
============================================================ */
function renderOktLevel(){
  panelEl.innerHTML = `
    ${panelHeadHTML("LEVEL 2 · BASIS 8","Bilangan Oktal", "okt")}
    <div class="panel-body">
      <h4>Apa itu bilangan oktal?</h4>
      <p>Oktal memakai delapan angka: <code>0</code> sampai <code>7</code>. Sistem ini sering dipakai untuk menuliskan hak akses file di Linux/Unix, misalnya <code>chmod 755</code>.</p>
      <p>Nilai tempatnya pangkat 8, dari kanan mulai 8⁰:</p>
      <div class="place-values">
        <span>8³=512</span><span>8²=64</span><span>8¹=8</span><span>8⁰=1</span>
      </div>
      <p>Contoh: <code>27</code>&#8328; = (2×8)+(7×1) = <b>23</b> dalam desimal.</p>

      <h4>🔁 Konverter Oktal &harr; Desimal</h4>
      <p>Desimal ke Oktal:</p>
      <div class="converter">
        <input type="number" id="oktInputDec" placeholder="contoh: 50" min="0" max="4095">
        <span>&rarr;</span>
        <input type="text" id="oktAnswerFromDec" placeholder="jawaban oktal">
        <button class="btn btn-primary" onclick="checkOktFromDec()">Cek</button>
      </div>
      <div class="feedback" id="oktFeedback1"></div>

      <p style="margin-top:18px;">Oktal ke Desimal:</p>
      <div class="converter">
        <input type="text" id="oktInputOct" placeholder="contoh: 62">
        <span>&rarr;</span>
        <input type="number" id="oktAnswerFromOct" placeholder="jawaban desimal">
        <button class="btn btn-primary" onclick="checkOktFromOct()">Cek</button>
      </div>
      <div class="feedback" id="oktFeedback2"></div>
      <div class="row-btn"><button class="btn btn-ghost" onclick="newOktProblems()">Soal Baru</button></div>

      <h4>🧠 Kuis Oktal (5 soal)</h4>
      <p>Lulus kuis untuk membuka Level 3 &middot; Heksadesimal.</p>
      <div class="row-btn"><button class="btn btn-primary" onclick="startQuiz('okt')">Mulai Kuis</button></div>
    </div>
  `;
  newOktProblems();
}
let oktDecTarget=0, oktOctTarget="";
function newOktProblems(){
  oktDecTarget = 1+Math.floor(Math.random()*300);
  oktOctTarget = (1+Math.floor(Math.random()*300)).toString(8);
  document.getElementById("oktInputDec").value = oktDecTarget;
  document.getElementById("oktInputOct").value = oktOctTarget;
  document.getElementById("oktAnswerFromDec").value="";
  document.getElementById("oktAnswerFromOct").value="";
  document.getElementById("oktFeedback1").textContent="";
  document.getElementById("oktFeedback1").className="feedback";
  document.getElementById("oktFeedback2").textContent="";
  document.getElementById("oktFeedback2").className="feedback";
}
function checkOktFromDec(){
  const ans = document.getElementById("oktAnswerFromDec").value.trim();
  const fb = document.getElementById("oktFeedback1");
  const correct = oktDecTarget.toString(8);
  if(ans === correct){
    fb.textContent = "✅ Benar! "+oktDecTarget+" = "+correct+" (oktal).";
    fb.className="feedback ok"; awardXP(5);
  } else {
    fb.textContent = "❌ Belum tepat. Coba hitung lagi ("+oktDecTarget+" ÷ 8 berulang).";
    fb.className="feedback bad";
  }
}
function checkOktFromOct(){
  const ans = document.getElementById("oktAnswerFromOct").value.trim();
  const fb = document.getElementById("oktFeedback2");
  const correct = parseInt(oktOctTarget,8);
  if(+ans === correct){
    fb.textContent = "✅ Benar! "+oktOctTarget+" (oktal) = "+correct+" (desimal).";
    fb.className="feedback ok"; awardXP(5);
  } else {
    fb.textContent = "❌ Belum tepat. Ingat: kalikan tiap digit dengan pangkat 8.";
    fb.className="feedback bad";
  }
}

/* ============================================================
   LEVEL 3 — HEKSADESIMAL
============================================================ */
function renderHexLevel(){
  panelEl.innerHTML = `
    ${panelHeadHTML("LEVEL 3 · BASIS 16","Bilangan Heksadesimal", "hex")}
    <div class="panel-body">
      <h4>Apa itu bilangan heksadesimal?</h4>
      <p>Heksadesimal (heks) memakai 16 simbol: <code>0-9</code> lalu <code>A, B, C, D, E, F</code> untuk mewakili 10 sampai 15. Sering dipakai untuk kode warna website dan alamat memori.</p>
      <div class="place-values">
        <span>A=10</span><span>B=11</span><span>C=12</span><span>D=13</span><span>E=14</span><span>F=15</span>
      </div>
      <p>Contoh: <code>2F</code>&#8339;&#8326; = (2×16)+(15×1) = <b>47</b> dalam desimal.</p>

      <h4>🎨 Racik Warna Heks</h4>
      <p>Kode warna web ditulis pakai heksadesimal, contoh <code>#5EEAD4</code>. Coba ubah nilai R (merah) di bawah dari desimal ke heks:</p>
      <div class="swatch-preview" id="hexSwatch"></div>
      <div class="converter">
        <span style="font-family:var(--font-mono);color:var(--text-dim);">Nilai merah (desimal):</span>
        <input type="number" id="hexRedDec" min="0" max="255" value="180" oninput="updateSwatch()">
      </div>
      <div class="target-chip" id="hexRedAnswer">Berapa nilai heksnya? &mdash; isi di bawah</div>
      <div class="converter">
        <input type="text" id="hexRedInput" placeholder="contoh: B4" maxlength="2">
        <button class="btn btn-primary" onclick="checkHexColor()">Cek</button>
      </div>
      <div class="feedback" id="hexFeedback1"></div>
      <div class="row-btn"><button class="btn btn-ghost" onclick="newHexColor()">Warna Baru</button></div>

      <h4>🔁 Konverter Heks &harr; Desimal</h4>
      <div class="converter">
        <input type="number" id="hexInputDec" placeholder="contoh: 200">
        <span>&rarr;</span>
        <input type="text" id="hexAnswerFromDec" placeholder="jawaban heks">
        <button class="btn btn-primary" onclick="checkHexFromDec()">Cek</button>
      </div>
      <div class="feedback" id="hexFeedback2"></div>
      <div class="row-btn"><button class="btn btn-ghost" onclick="newHexProblem()">Soal Baru</button></div>

      <h4>🧠 Kuis Heksadesimal (5 soal)</h4>
      <p>Lulus kuis untuk membuka Level Akhir.</p>
      <div class="row-btn"><button class="btn btn-primary" onclick="startQuiz('hex')">Mulai Kuis</button></div>
    </div>
  `;
  newHexColor();
  newHexProblem();
}
let hexRedTarget=180;
function updateSwatch(){
  const v = Math.max(0,Math.min(255, +document.getElementById("hexRedDec").value || 0));
  const hex = v.toString(16).padStart(2,"0").toUpperCase();
  document.getElementById("hexSwatch").style.background = "rgb("+v+",60,150)";
  hexRedTarget = v;
}
function newHexColor(){
  const v = Math.floor(Math.random()*256);
  document.getElementById("hexRedDec").value = v;
  document.getElementById("hexRedInput").value = "";
  document.getElementById("hexFeedback1").textContent="";
  document.getElementById("hexFeedback1").className="feedback";
  updateSwatch();
}
function checkHexColor(){
  const ans = document.getElementById("hexRedInput").value.trim().toUpperCase();
  const correct = hexRedTarget.toString(16).padStart(2,"0").toUpperCase();
  const fb = document.getElementById("hexFeedback1");
  if(ans === correct){
    fb.textContent = "✅ Benar! "+hexRedTarget+" = "+correct+" dalam heks.";
    fb.className="feedback ok"; awardXP(5);
  } else {
    fb.textContent = "❌ Belum tepat. Coba bagi "+hexRedTarget+" dengan 16.";
    fb.className="feedback bad";
  }
}
let hexDecTarget=0;
function newHexProblem(){
  hexDecTarget = 16+Math.floor(Math.random()*4000);
  document.getElementById("hexInputDec").value = hexDecTarget;
  document.getElementById("hexAnswerFromDec").value="";
  document.getElementById("hexFeedback2").textContent="";
  document.getElementById("hexFeedback2").className="feedback";
}
function checkHexFromDec(){
  const ans = document.getElementById("hexAnswerFromDec").value.trim().toUpperCase();
  const correct = hexDecTarget.toString(16).toUpperCase();
  const fb = document.getElementById("hexFeedback2");
  if(ans === correct){
    fb.textContent = "✅ Benar! "+hexDecTarget+" = "+correct+" (heks).";
    fb.className="feedback ok"; awardXP(5);
  } else {
    fb.textContent = "❌ Belum tepat. Ingat digit A-F untuk nilai 10-15.";
    fb.className="feedback bad";
  }
}

/* ============================================================
   QUIZ ENGINE (shared)
============================================================ */
const QUESTION_BANKS = {
  bit: [
    {q:"Bilangan biner 101 sama dengan berapa dalam desimal?", opts:["3","5","6","7"], a:1},
    {q:"Berapa digit angka yang dipakai dalam sistem biner?", opts:["2","4","8","10"], a:0},
    {q:"Bilangan desimal 6 dalam biner adalah...", opts:["100","101","110","111"], a:2},
    {q:"Satu digit dalam bilangan biner disebut...", opts:["byte","bit","nibble","digit"], a:1},
    {q:"Bilangan biner 1111 sama dengan desimal...", opts:["8","12","15","16"], a:2},
    {q:"Nilai tempat digit paling kanan pada biner adalah...", opts:["2⁰=1","2¹=2","2²=4","2³=8"], a:0}
  ],
  okt: [
    {q:"Sistem oktal menggunakan angka dari...", opts:["0-6","0-7","0-8","1-8"], a:1},
    {q:"Bilangan oktal 12 sama dengan desimal...", opts:["8","9","10","12"], a:1},
    {q:"Bilangan desimal 16 dalam oktal adalah...", opts:["16","17","20","21"], a:2},
    {q:"Sistem oktal biasa dipakai untuk menulis...", opts:["kode warna","hak akses file Unix/Linux","alamat IP","not musik"], a:1},
    {q:"Nilai 8² dalam sistem oktal sama dengan...", opts:["16","32","64","128"], a:2},
    {q:"Bilangan oktal 25 sama dengan desimal...", opts:["20","21","25","29"], a:1}
  ],
  hex: [
    {q:"Sistem heksadesimal menggunakan berapa simbol?", opts:["8","10","12","16"], a:3},
    {q:"Huruf F pada heksadesimal mewakili angka desimal...", opts:["14","15","16","5"], a:1},
    {q:"Bilangan heks 1A sama dengan desimal...", opts:["16","26","27","110"], a:1},
    {q:"Heksadesimal umum dipakai untuk menuliskan...", opts:["kode warna website","nomor telepon","tanggal lahir","suhu udara"], a:0},
    {q:"Bilangan desimal 255 dalam heks adalah...", opts:["EE","FE","FF","F0"], a:2},
    {q:"Huruf A pada heksadesimal mewakili angka desimal...", opts:["1","9","10","11"], a:2}
  ]
};
function buildBossQuestions(){
  const arr = [];
  QUESTION_BANKS.bit.forEach(q=>arr.push(q));
  QUESTION_BANKS.okt.forEach(q=>arr.push(q));
  QUESTION_BANKS.hex.forEach(q=>arr.push(q));
  return shuffle(arr).slice(0,8);
}
function shuffle(a){
  const arr = a.slice();
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

let quizState = {level:null, questions:[], idx:0, correct:0, locked:false};

function startQuiz(level){
  quizState = {
    level,
    questions: shuffle(QUESTION_BANKS[level]).slice(0,5),
    idx:0, correct:0, locked:false
  };
  renderQuizQuestion();
}
function renderQuizQuestion(){
  const meta = LEVEL_META[quizState.level] || {title:"Kuis", color: quizState.level};
  const q = quizState.questions[quizState.idx];
  panelEl.innerHTML = `
    ${panelHeadHTML("KUIS", meta.title, meta.color)}
    <div class="panel-body">
      <div class="quiz-progress">Soal ${quizState.idx+1} dari ${quizState.questions.length} &middot; Benar: ${quizState.correct}</div>
      <p class="quiz-q">${q.q}</p>
      <div class="quiz-opts" id="quizOpts">
        ${q.opts.map((o,i)=>`<button class="opt" data-i="${i}" onclick="answerQuiz(${i})">${o}</button>`).join("")}
      </div>
    </div>
  `;
}
function answerQuiz(i){
  if(quizState.locked) return;
  quizState.locked = true;
  const q = quizState.questions[quizState.idx];
  const opts = document.querySelectorAll("#quizOpts .opt");
  opts.forEach(o=>o.disabled=true);
  opts[q.a].classList.add("correct");
  if(i === q.a){
    quizState.correct++;
  } else {
    opts[i].classList.add("wrong");
  }
  setTimeout(()=>{
    quizState.idx++;
    quizState.locked=false;
    if(quizState.idx < quizState.questions.length){
      renderQuizQuestion();
    } else {
      finishQuiz();
    }
  }, 900);
}
function finishQuiz(){
  const total = quizState.questions.length;
  const correct = quizState.correct;
  const pct = Math.round((correct/total)*100);
  const passed = correct >= Math.ceil(total*0.6);
  const level = quizState.level;
  const nextMap = {bit:"okt", okt:"hex", hex:"boss", boss:null};
  const meta = LEVEL_META[level];

  let xpGain = correct*10 + (passed?20:0);
  awardXP(xpGain);
  if(passed) markComplete(level, nextMap[level]);
  sendScoreToTeacher(meta.title, correct, total, xpGain);

  panelEl.innerHTML = `
    ${panelHeadHTML("HASIL", meta.title, meta.color)}
    <div class="panel-body">
      <div class="quiz-result">
        <div class="big" style="color:var(--${meta.color})">${correct}/${total}</div>
        <p>${pct}% benar &middot; +${xpGain} XP</p>
        ${passed
          ? `<p style="color:var(--ok);font-weight:700;">🎉 Lulus! ${nextMap[level] ? "Level berikutnya sudah terbuka." : "Kamu Juara Sistem Bilangan!"}</p>`
          : `<p style="color:var(--bad);font-weight:700;">Belum lulus (minimal 60%). Pelajari lagi materinya, lalu coba kuis sekali lagi!</p>`
        }
      </div>
      <div class="row-btn">
        <button class="btn btn-ghost" onclick="startQuiz('${level}')">Ulangi Kuis</button>
        <button class="btn btn-primary" onclick="closePanel()">Tutup</button>
      </div>
    </div>
  `;
  if(passed) showToast("🏅 Lencana baru didapat: " + meta.title + "!");
}

/* ============================================================
   LEVEL 4 — BOSS (timed mixed challenge)
============================================================ */
let bossTimerInterval = null;
let bossState = {questions:[], idx:0, correct:0, secondsLeft:60, locked:false};

function renderBossLevel(){
  panelEl.innerHTML = `
    ${panelHeadHTML("LEVEL AKHIR","Tantangan Campuran", "boss")}
    <div class="panel-body">
      <h4>Sebelum mulai...</h4>
      <p>Kamu akan diberi <b>8 soal campuran</b> dari biner, oktal, dan heksadesimal dalam waktu <b>60 detik</b>. Jawab secepat dan setepat mungkin!</p>
      <div class="row-btn"><button class="btn btn-primary" onclick="startBoss()">Mulai Tantangan</button></div>
    </div>
  `;
}
function startBoss(){
  bossState = {
    questions: buildBossQuestions(),
    idx:0, correct:0, secondsLeft:60, locked:false
  };
  renderBossQuestion();
  clearInterval(bossTimerInterval);
  bossTimerInterval = setInterval(()=>{
    bossState.secondsLeft--;
    const chip = document.getElementById("bossTimer");
    if(chip) chip.textContent = "⏱ " + bossState.secondsLeft + " detik";
    if(bossState.secondsLeft <= 0){
      clearInterval(bossTimerInterval);
      finishBoss(true);
    }
  }, 1000);
}
function renderBossQuestion(){
  const q = bossState.questions[bossState.idx];
  panelEl.innerHTML = `
    ${panelHeadHTML("LEVEL AKHIR","Tantangan Campuran", "boss")}
    <div class="panel-body">
      <div class="timer-chip" id="bossTimer">⏱ ${bossState.secondsLeft} detik</div>
      <div class="quiz-progress">Soal ${bossState.idx+1} dari ${bossState.questions.length} &middot; Benar: ${bossState.correct}</div>
      <p class="quiz-q">${q.q}</p>
      <div class="quiz-opts" id="quizOpts">
        ${q.opts.map((o,i)=>`<button class="opt" data-i="${i}" onclick="answerBoss(${i})">${o}</button>`).join("")}
      </div>
    </div>
  `;
}
function answerBoss(i){
  if(bossState.locked) return;
  bossState.locked = true;
  const q = bossState.questions[bossState.idx];
  const opts = document.querySelectorAll("#quizOpts .opt");
  opts.forEach(o=>o.disabled=true);
  opts[q.a].classList.add("correct");
  if(i === q.a){ bossState.correct++; } else { opts[i].classList.add("wrong"); }
  setTimeout(()=>{
    bossState.idx++;
    bossState.locked=false;
    if(bossState.idx < bossState.questions.length && bossState.secondsLeft > 0){
      renderBossQuestion();
    } else {
      clearInterval(bossTimerInterval);
      finishBoss(false);
    }
  }, 700);
}
function finishBoss(timedOut){
  const total = bossState.questions.length;
  const correct = bossState.correct;
  const passed = correct >= Math.ceil(total*0.6);
  const xpGain = correct*8 + (passed?40:0);
  awardXP(xpGain);
  if(passed) markComplete("boss", null);
  sendScoreToTeacher("Tantangan Campuran", correct, total, xpGain);

  panelEl.innerHTML = `
    ${panelHeadHTML("HASIL AKHIR","Tantangan Campuran", "boss")}
    <div class="panel-body">
      <div class="quiz-result">
        <div class="big" style="color:var(--boss)">${correct}/${total}</div>
        <p>${timedOut ? "Waktu habis! " : ""}+${xpGain} XP</p>
        ${passed
          ? `<p style="color:var(--ok);font-weight:700;">🏆 Selamat! Kamu resmi jadi Juara Sistem Bilangan!</p>`
          : `<p style="color:var(--bad);font-weight:700;">Belum lulus (minimal 60%). Kuatkan lagi tiap level, lalu coba sekali lagi!</p>`
        }
      </div>
      <div class="row-btn">
        <button class="btn btn-ghost" onclick="renderBossLevel()">Coba Lagi</button>
        <button class="btn btn-primary" onclick="closePanel()">Tutup</button>
      </div>
    </div>
  `;
  if(passed) showToast("🏆 Kamu menyelesaikan semua level!");
}