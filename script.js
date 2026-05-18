// ======================== DOM Elements ==========================
const cssEditor = document.getElementById("cssEditor");
const dynamicStyle = document.getElementById("dynamicStyle");
const statusDiv = document.getElementById("status");
const previewDiv = document.getElementById("preview");

const applyBtn = document.getElementById("applyBtn");
const exportSvgBtn = document.getElementById("exportSvgBtn");
const exportGifBtn = document.getElementById("exportGifBtn");
const exportMp4Btn = document.getElementById("exportMp4Btn");

// CSS awal (gembok goyang)
const DEFAULT_CSS = `.shackle{
    transform-origin: 120px 120px;
    animation: unlock 2s infinite ease-in-out;
}
@keyframes unlock{
    0%{ transform: rotate(0deg); }
    50%{ transform: rotate(-20deg) translate(-10px, -10px); }
    100%{ transform: rotate(0deg); }
}`;

cssEditor.value = DEFAULT_CSS;
applyCSS(); // langsung terapkan

// ======================== FUNGSI UTAMA ==========================
function applyCSS() {
  const cssCode = cssEditor.value;
  dynamicStyle.innerHTML = cssCode;
  statusDiv.innerHTML = "✅ CSS diterapkan | Animasi berjalan";
}

// Fungsi utility: download blob
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Delay promise
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: disable/enable buttons selama proses
function setButtonsEnabled(enabled) {
  const btns = [applyBtn, exportSvgBtn, exportGifBtn, exportMp4Btn];
  btns.forEach(btn => { btn.disabled = !enabled; });
  if (enabled) statusDiv.style.opacity = "1";
  else statusDiv.style.opacity = "0.7";
}

// ======================== EKSPOR SVG ==========================
function exportSVG() {
  try {
    const svgElement = document.getElementById("svgCanvas");
    // clone agar tidak mempengaruhi tampilan asli
    const cloneSvg = svgElement.cloneNode(true);
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(cloneSvg);
    // tambahkan XML declaration opsional
    svgString = '<?xml version="1.0" encoding="utf-8"?>\n' + svgString;
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    download(blob, "animation.svg");
    statusDiv.innerHTML = "📄 SVG berhasil diekspor!";
    setTimeout(() => { if(statusDiv.innerHTML.includes("SVG")) applyCSS(); }, 1500);
  } catch(e) {
    statusDiv.innerHTML = "❌ Gagal ekspor SVG: " + e.message;
  }
}

// ======================== EKSPOR GIF (menggunakan gif.js) =================
async function exportGIF() {
  if (typeof GIF === "undefined") {
    statusDiv.innerHTML = "❌ Library GIF gagal dimuat. Coba refresh halaman.";
    return;
  }
  setButtonsEnabled(false);
  statusDiv.innerHTML = "🎞️ Mempersiapkan GIF... (30 frame, durasi 2 detik)";

  const totalFrames = 30;
  const frameDelay = 2000 / totalFrames; // ~66 ms per frame (total 2 detik)
  
  // inisialisasi GIF encoder
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: 500,
    height: 500,
    workerScript: "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js" // fallback stabil
  });

  for (let i = 0; i < totalFrames; i++) {
    try {
      const canvas = await html2canvas(previewDiv, { 
        scale: 1.5,
        backgroundColor: null,
        logging: false,
        useCORS: false
      });
      gif.addFrame(canvas, { delay: frameDelay });
      statusDiv.innerHTML = `🎞️ Merekam frame ${i+1}/${totalFrames}...`;
      await wait(frameDelay);
    } catch (err) {
      statusDiv.innerHTML = `❌ Gagal capture frame: ${err.message}`;
      setButtonsEnabled(true);
      return;
    }
  }

  statusDiv.innerHTML = "🎬 Mengompres GIF ...";
  gif.on("finished", (blob) => {
    download(blob, "animation.gif");
    statusDiv.innerHTML = "✅ GIF selesai | Unduh otomatis";
    setButtonsEnabled(true);
  });
  
  gif.on("error", (e) => {
    statusDiv.innerHTML = "❌ Error GIF: " + e;
    setButtonsEnabled(true);
  });
  
  gif.render();
}

// ======================== EKSPOR MP4 (FFmpeg) =======================
async function exportMP4() {
  if (!window.FFmpeg) {
    statusDiv.innerHTML = "❌ FFmpeg tidak tersedia. Muat ulang halaman.";
    return;
  }
  setButtonsEnabled(false);
  statusDiv.innerHTML = "⚙️ Memuat FFmpeg (WebAssembly)...";
  
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({ log: false, corePath: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js" });
  
  try {
    await ffmpeg.load();
    statusDiv.innerHTML = "📸 Mengambil frame (60 frame, 2 detik, 30fps)...";
    
    const totalFrames = 60;
    const frameInterval = 2000 / totalFrames; // ≈33.3ms
    
    for (let i = 0; i < totalFrames; i++) {
      const canvas = await html2canvas(previewDiv, { scale: 1.5, backgroundColor: null });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      const frameData = await fetchFile(blob);
      ffmpeg.FS("writeFile", `frame_${i.toString().padStart(3, '0')}.png`, frameData);
      statusDiv.innerHTML = `📸 Frame ${i+1}/${totalFrames}`;
      await wait(frameInterval);
    }
    
    statusDiv.innerHTML = "🎬 Encoding MP4 (H.264) ...";
    await ffmpeg.run(
      "-framerate", "30",
      "-i", "frame_%03d.png",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-y",
      "output.mp4"
    );
    
    const data = ffmpeg.FS("readFile", "output.mp4");
    const blob = new Blob([data.buffer], { type: "video/mp4" });
    download(blob, "animation.mp4");
    
    // Bersihkan file frame dari virtual FS
    for (let i = 0; i < totalFrames; i++) {
      ffmpeg.FS("unlink", `frame_${i.toString().padStart(3, '0')}.png`);
    }
    statusDiv.innerHTML = "🎉 MP4 berhasil diekspor!";
  } catch (err) {
    console.error(err);
    statusDiv.innerHTML = `❌ Gagal membuat MP4: ${err.message}`;
  } finally {
    setButtonsEnabled(true);
  }
}

// ======================== PASANG EVENT LISTENER ======================
applyBtn.addEventListener("click", applyCSS);
exportSvgBtn.addEventListener("click", exportSVG);
exportGifBtn.addEventListener("click", exportGIF);
exportMp4Btn.addEventListener("click", exportMP4);

// Set status awal
statusDiv.innerHTML = "🎨 Siap. Edit CSS lalu klik Apply. Gunakan tombol ekspor!";
