// ======================== DOM Elements ========================
const cssEditor = document.getElementById("cssEditor");
const dynamicStyle = document.getElementById("dynamicStyle");
const statusDiv = document.getElementById("status");
const previewBox = document.getElementById("previewBox");

const applyBtn = document.getElementById("applyBtn");
const exportSvgBtn = document.getElementById("exportSvgBtn");
const exportGifBtn = document.getElementById("exportGifBtn");
const exportMp4Btn = document.getElementById("exportMp4Btn");

// 🔥 CSS AWAL YANG PASTI BERGERAK (transform-origin tepat)
const DEFAULT_CSS = `
.shackle {
  transform-origin: 120px 118px;
  animation: unlock 2.4s infinite ease-in-out;
}

@keyframes unlock {
  0%   { transform: rotate(0deg) translateY(0px); }
  25%  { transform: rotate(-22deg) translate(-8px, -8px); }
  50%  { transform: rotate(-22deg) translate(-8px, -8px); }
  75%  { transform: rotate(4deg) translate(2px, -2px); }
  100% { transform: rotate(0deg) translateY(0px); }
}
`;

cssEditor.value = DEFAULT_CSS;
applyCSS(); // langsung terapkan

// ======================== Fungsi utama ========================
function applyCSS() {
  const cssCode = cssEditor.value;
  dynamicStyle.innerHTML = cssCode;
  statusDiv.innerHTML = "✅ CSS diterapkan — animasi berjalan di preview!";
}

// Utility download
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function setButtonsEnabled(enabled) {
  const btns = [applyBtn, exportSvgBtn, exportGifBtn, exportMp4Btn];
  btns.forEach(btn => { btn.disabled = !enabled; });
  if (enabled) statusDiv.style.opacity = "1";
  else statusDiv.style.opacity = "0.7";
}

// ======================== EXPORT SVG ========================
function exportSVG() {
  try {
    const svgEl = document.getElementById("svgCanvas");
    const clone = svgEl.cloneNode(true);
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clone);
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    download(blob, "animated_lock.svg");
    statusDiv.innerHTML = "📄 SVG berhasil diekspor!";
    setTimeout(() => { if(statusDiv.innerHTML.includes("SVG")) applyCSS(); }, 1500);
  } catch(e) {
    statusDiv.innerHTML = "❌ Gagal export SVG: " + e.message;
  }
}

// ======================== EXPORT GIF ========================
async function exportGIF() {
  if (typeof GIF === "undefined") {
    statusDiv.innerHTML = "❌ Library GIF error. Refresh halaman.";
    return;
  }
  setButtonsEnabled(false);
  statusDiv.innerHTML = "🎞️ Mempersiapkan GIF (2 detik, 30 frame)...";
  
  const totalFrames = 30;
  const frameDelay = 2000 / totalFrames; // ~66ms
  
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: 500,
    height: 500,
    workerScript: "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js"
  });

  for (let i = 0; i < totalFrames; i++) {
    try {
      const canvas = await html2canvas(previewBox, { scale: 1.4, backgroundColor: "#ffffff" });
      gif.addFrame(canvas, { delay: frameDelay });
      statusDiv.innerHTML = `🎞️ Merekam frame ${i+1}/${totalFrames}`;
      await wait(frameDelay);
    } catch(err) {
      statusDiv.innerHTML = `❌ Capture gagal: ${err.message}`;
      setButtonsEnabled(true);
      return;
    }
  }
  
  statusDiv.innerHTML = "🎬 Mengompres GIF ...";
  gif.on("finished", (blob) => {
    download(blob, "animation.gif");
    statusDiv.innerHTML = "✅ GIF selesai! File sudah diunduh.";
    setButtonsEnabled(true);
  });
  gif.on("error", (e) => {
    statusDiv.innerHTML = "❌ Error GIF: " + e;
    setButtonsEnabled(true);
  });
  gif.render();
}

// ======================== EXPORT MP4 (FFmpeg) ========================
async function exportMP4() {
  if (!window.FFmpeg) {
    statusDiv.innerHTML = "❌ FFmpeg tidak tersedia. Coba muat ulang.";
    return;
  }
  setButtonsEnabled(false);
  statusDiv.innerHTML = "⚙️ Memuat FFmpeg (sekitar 3-5 detik)...";
  
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({ 
    log: false,
    corePath: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js"
  });
  
  try {
    await ffmpeg.load();
    const totalFrames = 60;  // 30fps => 2 detik
    const frameInterval = 2000 / totalFrames; // ~33ms
    
    statusDiv.innerHTML = "📸 Mengambil 60 frame (2 detik)...";
    for (let i = 0; i < totalFrames; i++) {
      const canvas = await html2canvas(previewBox, { scale: 1.4, backgroundColor: "#ffffff" });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      const frameData = await fetchFile(blob);
      const frameName = `frame_${i.toString().padStart(3, '0')}.png`;
      ffmpeg.FS("writeFile", frameName, frameData);
      statusDiv.innerHTML = `📸 Frame ${i+1}/${totalFrames}`;
      await wait(frameInterval);
    }
    
    statusDiv.innerHTML = "🎬 Encoding MP4...";
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
    download(blob, "animated_lock.mp4");
    
    // Bersihkan file frame
    for (let i = 0; i < totalFrames; i++) {
      ffmpeg.FS("unlink", `frame_${i.toString().padStart(3, '0')}.png`);
    }
    statusDiv.innerHTML = "🎉 MP4 berhasil diekspor!";
  } catch(err) {
    console.error(err);
    statusDiv.innerHTML = "❌ Gagal buat MP4: " + err.message;
  } finally {
    setButtonsEnabled(true);
  }
}

// ======================== PASANG EVENT LISTENER ========================
applyBtn.addEventListener("click", applyCSS);
exportSvgBtn.addEventListener("click", exportSVG);
exportGifBtn.addEventListener("click", exportGIF);
exportMp4Btn.addEventListener("click", exportMP4);
