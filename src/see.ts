// "Show Kinly": she opens the camera herself, shows something, and talks. Kinly answers out loud.
export const SEE_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Show Kinly</title>
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin:0; height:100%; background:#14110e; color:#fff;
               font: 20px/1.4 -apple-system, "SF Pro Text", "Segoe UI", sans-serif; overflow:hidden; }
  video { position:fixed; inset:0; width:100%; height:100%; object-fit:cover; }
  .top { position:fixed; top:0; left:0; right:0; padding: calc(14px + env(safe-area-inset-top)) 18px 30px;
         background: linear-gradient(#000a, #0000); display:flex; align-items:center; gap:10px; font-weight:600; }
  .dot { width:10px; height:10px; border-radius:50%; background:#f6c56b; }
  .dot.busy { animation: pulse 1s infinite; }
  @keyframes pulse { 50% { opacity:.3; } }
  .bottom { position:fixed; left:0; right:0; bottom:0; padding: 60px 18px calc(22px + env(safe-area-inset-bottom));
            background: linear-gradient(#0000, #000c 45%); }
  #said { color:#ffffffb3; font-size:17px; min-height:24px; margin-bottom:8px; }
  #caption { font-size:24px; font-weight:600; line-height:1.3; min-height:62px; margin-bottom:18px; text-wrap:balance; }
  .row { display:flex; gap:12px; }
  button { flex:1; border:0; border-radius:999px; padding:18px 10px; font:inherit; font-weight:700; color:#14110e;
           background:#f6c56b; touch-action:manipulation; user-select:none; -webkit-user-select:none; }
  button.ghost { flex:0 0 34%; background:#ffffff26; color:#fff; backdrop-filter: blur(8px); }
  button.on { background:#fff; transform: scale(.97); }
  button:disabled { opacity:.5; }
</style>
</head>
<body>
<video id="cam" autoplay playsinline muted></video>
<div class="top"><span id="dot" class="dot"></span><span>Kinly is with you</span></div>
<div class="bottom">
  <div id="said"></div>
  <div id="caption">Show me anything, and tell me what's on your mind.</div>
  <div class="row">
    <button id="talk">Hold to talk</button>
    <button id="look" class="ghost">Just look</button>
  </div>
</div>
<canvas id="shot" hidden></canvas>
<script>
const cam = document.getElementById("cam"), shot = document.getElementById("shot");
const caption = document.getElementById("caption"), said = document.getElementById("said");
const talk = document.getElementById("talk"), look = document.getElementById("look"), dot = document.getElementById("dot");

navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
  .then(s => { cam.srcObject = s; })
  .catch(() => { caption.textContent = "I need the camera to see. Please allow it and reload."; });

function frame() {
  const scale = Math.min(1, 1024 / Math.max(cam.videoWidth, cam.videoHeight));
  shot.width = cam.videoWidth * scale; shot.height = cam.videoHeight * scale;
  shot.getContext("2d").drawImage(cam, 0, 0, shot.width, shot.height);
  return shot.toDataURL("image/jpeg", 0.8);
}

function speak(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  speechSynthesis.speak(u);
}

let busy = false;
async function show(text) {
  if (busy || !cam.videoWidth) return;
  busy = true; dot.classList.add("busy"); talk.disabled = look.disabled = true;
  said.textContent = text ? "\\u201C" + text + "\\u201D" : "";
  caption.textContent = "Let me look\\u2026";
  try {
    const res = await fetch("/api/see", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: frame(), text: text || "" }) });
    const out = await res.json();
    caption.textContent = out.reply;
    speak(out.reply);
  } catch (e) {
    caption.textContent = "I lost you for a second. Try once more?";
  }
  busy = false; dot.classList.remove("busy"); talk.disabled = look.disabled = false;
}

look.addEventListener("click", () => { speak(""); show(""); });

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) {
  talk.textContent = "Ask Kinly";
  talk.addEventListener("click", () => show(""));
} else {
  let rec = null, heard = "";
  const start = (e) => {
    e.preventDefault(); if (busy || rec) return;
    speechSynthesis && speechSynthesis.cancel();
    heard = ""; rec = new SR(); rec.lang = "en-US"; rec.interimResults = true; rec.continuous = true;
    rec.onresult = (ev) => { heard = Array.from(ev.results).map(r => r[0].transcript).join(" "); said.textContent = heard; };
    rec.onend = () => { rec = null; talk.classList.remove("on"); talk.textContent = "Hold to talk"; show(heard.trim()); };
    rec.onerror = () => {};
    rec.start(); talk.classList.add("on"); talk.textContent = "Listening\\u2026";
  };
  const stop = (e) => { e.preventDefault(); if (rec) rec.stop(); };
  talk.addEventListener("pointerdown", start);
  talk.addEventListener("pointerup", stop);
  talk.addEventListener("pointerleave", stop);
  talk.addEventListener("contextmenu", (e) => e.preventDefault());
}
</script>
</body>
</html>`;
