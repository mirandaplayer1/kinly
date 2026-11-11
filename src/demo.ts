// The demo page (DEMO_ONLY=1): her phone, the family's phone and the care team's phone side by
// side, with the family page next to them. Each chat is a transcript kept by the server; what
// people type here takes the same road as a Telegram message.
export const DEMO_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kinly · Three phones</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --paper:#fbf3e4; --paper-deep:#f3e6cc; --card:#fff8ea; --ink:#3b2f2a; --ink-soft:#6a574c; --line:#dfcfb1;
    --mustard:#e0a526; --apricot:#f2a65a; --rose:#f0a39a; --sky:#a8cde6; --leaf:#b9d08a;
    --display: "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif;
    --body: "Geist", "Helvetica Neue", Arial, sans-serif;
    --out: cubic-bezier(.16, 1, .3, 1);
  }
  * { box-sizing: border-box; }
  html { background: var(--paper); }
  body { margin:0; height:100dvh; overflow:hidden; color:var(--ink); font: 400 15px/1.42 var(--body); -webkit-font-smoothing: antialiased;
         display:grid; grid-template-rows: auto minmax(0, 1fr); caret-color: var(--mustard); }
  ::selection { background: var(--mustard); color: var(--ink); }
  :focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; border-radius: 6px; }

  .top { display:flex; align-items:baseline; gap: 16px; padding: 18px 28px 12px; }
  .wordmark { font: 700 26px/1 var(--display); letter-spacing: -0.03em; }
  .top p { margin:0; color: var(--ink-soft); }

  .stage { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)) 400px; gap: 20px; padding: 0 28px 76px; min-height:0; }
  .col { display:grid; grid-template-rows: auto minmax(0, 1fr); gap: 10px; min-height:0; min-width:0; }
  .who { display:flex; align-items:baseline; gap: 10px; white-space:nowrap; overflow:hidden; }
  .who b { font: 700 26px/1 var(--display); letter-spacing: -0.03em; }
  .who span { color: var(--ink-soft); font-size: 14px; overflow:hidden; text-overflow: ellipsis; }

  .phone { display:grid; grid-template-rows: auto minmax(0, 1fr) auto; min-height:0; border: 1.5px solid var(--ink); border-radius: 16px; overflow:hidden;
           background: var(--card); box-shadow: 0 14px 30px -18px rgb(59 47 42 / .55); }
  .bar { display:flex; align-items:center; gap: 10px; padding: 9px 14px; background: var(--tone); border-bottom: 1.5px solid var(--ink); }
  .bar img { width: 38px; height: 38px; border-radius: 10px; background: var(--paper); border: 1.5px solid var(--ink); object-fit: cover; }
  .bar b { display:block; font: 700 18px/1.1 var(--display); letter-spacing: -0.02em; }
  .bar small { display:block; font-size: 12.5px; line-height: 1.3; }

  .msgs { overflow-y:auto; padding: 14px 12px 10px; display:flex; flex-direction:column; gap: 8px; scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
  .b { max-width: 88%; padding: 9px 13px; border-radius: 14px; white-space: pre-wrap; overflow-wrap: anywhere; animation: pop .45s var(--out); }
  @keyframes pop { from { opacity:0; transform: translateY(8px) scale(.97); } }
  .b.kinly { align-self:flex-start; background: var(--paper-deep); border-bottom-left-radius: 4px; }
  .b.me { align-self:flex-end; background: var(--ink); color: var(--paper); border-bottom-right-radius: 4px; }
  .b.red { background: var(--rose); border: 1.5px solid var(--ink); }
  .b.yellow { background: #fbe3a4; border: 1.5px solid var(--ink); }
  .sticker { width: 108px; height: 108px; object-fit: contain; align-self:flex-start; animation: pop .45s var(--out); }
  .photo { align-self:flex-end; max-width: 64%; max-height: 190px; border-radius: 12px; border: 1.5px solid var(--ink); display:block; animation: pop .45s var(--out); }
  .typing { align-self:flex-start; display:flex; align-items:center; gap: 8px; padding: 8px 13px; border-radius: 14px; border-bottom-left-radius: 4px;
            background: var(--paper-deep); color: var(--ink-soft); font-size: 14px; }
  .typing[hidden], .open[hidden] { display:none; }
  .dots { display:flex; gap: 4px; }
  .dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--ink-soft); animation: dot 1s ease-in-out infinite; }
  .dots i:nth-child(2) { animation-delay: .15s; } .dots i:nth-child(3) { animation-delay: .3s; }
  @keyframes dot { 0%, 60%, 100% { transform: translateY(0); opacity:.45; } 30% { transform: translateY(-4px); opacity:1; } }

  .open { margin: auto; display:grid; justify-items:center; gap: 12px; text-align:center; padding: 12px; max-width: 32ch; text-wrap: balance; color: var(--ink-soft); }
  .open button { font: 600 16px/1 var(--body); color: var(--paper); background: var(--ink); border:0; border-radius: 12px; padding: 14px 22px; cursor:pointer;
                 transition: transform .25s var(--out); }
  .open button:hover { transform: translateY(-2px); }

  .compose { border-top: 1.5px solid var(--ink); background: var(--paper); padding: 8px 10px; display:grid; gap: 8px; }
  .row { display:flex; gap: 8px; align-items:center; }
  .row input[type=text] { flex:1; min-width:0; font: 400 15px/1.3 var(--body); color: var(--ink); background: var(--card); border: 1.5px solid var(--ink); border-radius: 10px; padding: 9px 11px; }
  .row input[type=text]::placeholder { color: #8a7566; }
  .row input[type=text]:disabled { opacity: .5; }
  .row button { flex:none; font: 600 14px/1 var(--body); color: var(--ink); background: var(--mustard); border: 1.5px solid var(--ink); border-radius: 10px; padding: 0 14px; height: 39px; cursor:pointer; }
  .row button.attach { width: 39px; padding: 0; background: var(--card); display:grid; place-items:center; }
  .row button.attach svg { width: 22px; height: 22px; }
  .row button:disabled { opacity: .5; cursor: default; }
  .picked { display:flex; align-items:center; gap: 10px; font-size: 13.5px; color: var(--ink-soft); }
  .picked[hidden] { display:none; }
  .picked img { width: 52px; height: 52px; object-fit: cover; border-radius: 10px; border: 1.5px solid var(--ink); }
  .picked button { margin-left:auto; font: 600 13px/1 var(--body); color: var(--ink-soft); background:none; border:0; padding: 6px; cursor:pointer; text-decoration: underline; text-underline-offset: 3px; }

  .page { border: 1.5px solid var(--ink); border-radius: 16px; overflow:hidden; background: var(--paper); box-shadow: 0 14px 30px -18px rgb(59 47 42 / .55); min-height:0; }
  .page iframe { display:block; width: 100%; height: 100%; border:0; zoom: .8; }

  @media (prefers-reduced-motion: reduce) { .b, .sticker, .photo, .dots i { animation: none; } }
</style>
</head>
<body>
<header class="top">
  <div class="wordmark">Kinly</div>
  <p>Three phones and the family page, live. Kinly's words come from the model as you watch.</p>
</header>

<main class="stage">
  <section class="col" data-who="elder" style="--tone: var(--mustard)">
    <div class="who"><b id="name-elder">Margaret</b><span id="role-elder">Kinly lives in her phone</span></div>
    <div class="phone">
      <div class="bar"><img src="/pet/hello.png" alt=""><div><b>Kinly</b><small id="sub-elder">her companion</small></div></div>
      <div class="msgs" id="msgs-elder">
        <div class="open" id="open-elder"><span id="openline-elder">She hasn't opened her link yet.</span><button type="button" data-start="elder">Open Kinly</button></div>
        <div class="typing" id="typing-elder" hidden>Kinly is typing&hellip;<span class="dots"><i></i><i></i><i></i></span></div>
      </div>
      <div class="compose">
        <div class="picked" id="picked-elder" hidden><img id="thumb-elder" alt="The photo about to be sent"><span>Photo attached</span><button type="button" id="unpick-elder">Remove</button></div>
        <div class="row">
          <button type="button" class="attach" id="attach-elder" aria-label="Attach a photo" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/></svg></button>
          <input type="file" id="file-elder" accept="image/*" hidden>
          <input type="text" id="text-elder" placeholder="Write to Kinly" autocomplete="off" disabled>
          <button type="button" id="send-elder" disabled>Send</button>
        </div>
      </div>
    </div>
  </section>

  <section class="col" data-who="family" style="--tone: var(--apricot)">
    <div class="who"><b id="name-family">Anna</b><span id="role-family">Family</span></div>
    <div class="phone">
      <div class="bar"><img src="/pet/cozy.png" alt=""><div><b>Kinly</b><small>family chat</small></div></div>
      <div class="msgs" id="msgs-family">
        <div class="open" id="open-family"><span>Family joins with their own link.</span><button type="button" data-start="family">Join as family</button></div>
        <div class="typing" id="typing-family" hidden>Kinly is typing&hellip;<span class="dots"><i></i><i></i><i></i></span></div>
      </div>
      <div class="compose"><div class="row">
        <input type="text" id="text-family" placeholder="Ask Kinly, or send your love" autocomplete="off" disabled>
        <button type="button" id="send-family" disabled>Send</button>
      </div></div>
    </div>
  </section>

  <section class="col" data-who="care" style="--tone: var(--sky)">
    <div class="who"><b>Care team</b><span>Nurse at the care center</span></div>
    <div class="phone">
      <div class="bar"><img src="/pet/cozy.png" alt=""><div><b>Kinly</b><small>care team chat</small></div></div>
      <div class="msgs" id="msgs-care">
        <div class="open" id="open-care"><span>The care team joins with their own link.</span><button type="button" data-start="care">Join as care team</button></div>
        <div class="typing" id="typing-care" hidden>Kinly is typing&hellip;<span class="dots"><i></i><i></i><i></i></span></div>
      </div>
      <div class="compose"><div class="row">
        <input type="text" id="text-care" placeholder="Reply to Kinly" autocomplete="off" disabled>
        <button type="button" id="send-care" disabled>Send</button>
      </div></div>
    </div>
  </section>

  <section class="col">
    <div class="who"><b>Family page</b><span id="role-page">What family sees</span></div>
    <div class="page"><iframe src="/family" title="The family page"></iframe></div>
  </section>
</main>

<script>
var $ = function (id) { return document.getElementById(id); };
var WHO = ["elder", "family", "care"];
var shown = { elder: 0, family: 0, care: 0 };
var picked = null; // data URL of the photo she is about to send

function line(m) {
  var out = [];
  if (m.sticker) {
    var s = document.createElement("img");
    s.className = "sticker"; s.alt = "Kinly sticker: " + m.sticker; s.src = "/pet/sticker_" + m.sticker + ".webp";
    out.push(s);
  }
  if (m.image) {
    var p = document.createElement("img");
    p.className = "photo"; p.alt = "Photo sent"; p.src = m.image;
    out.push(p);
  }
  if (m.text) {
    var b = document.createElement("div");
    b.className = "b " + (m.from === "me" ? "me" : "kinly");
    if (m.from === "kinly" && m.text.indexOf("\\uD83D\\uDD34") === 0) b.className += " red";
    if (m.from === "kinly" && m.text.indexOf("\\uD83D\\uDFE1") === 0) b.className += " yellow";
    b.textContent = m.text;
    out.push(b);
  }
  return out;
}
function toEnd(w) { var box = $("msgs-" + w); box.scrollTo({ top: box.scrollHeight, behavior: "smooth" }); }

function render(d) {
  WHO.forEach(function (w) {
    var box = $("msgs-" + w), typing = $("typing-" + w), list = d.chats[w] || [], moved = false;
    if (list.length < shown[w]) { box.querySelectorAll(".b, .sticker, .photo").forEach(function (e) { e.remove(); }); shown[w] = 0; }
    for (var i = shown[w]; i < list.length; i++) {
      line(list[i]).forEach(function (e) {
        if (e.tagName === "IMG") e.onload = function () { toEnd(w); };
        box.insertBefore(e, typing);
      });
      moved = true;
    }
    shown[w] = list.length;
    if (typing.hidden === d.pending[w]) { typing.hidden = !d.pending[w]; moved = true; }
    $("open-" + w).hidden = d.joined[w] || d.pending[w] || list.length > 0;
    ["text-", "send-", "attach-"].forEach(function (k) { var e = $(k + w); if (e) e.disabled = !d.joined[w]; });
    if (moved) toEnd(w);
  });
}
async function poll() {
  try { render(await (await fetch("/api/demo")).json()); } catch (e) {}
}
poll(); setInterval(poll, 700);

function say(body) {
  fetch("/api/demo/say", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(function () {});
  setTimeout(poll, 120);
}
document.querySelectorAll("[data-start]").forEach(function (b) {
  b.onclick = function () { $("open-" + b.dataset.start).hidden = true; say({ who: b.dataset.start, start: true }); };
});
function unpick() { picked = null; $("picked-elder").hidden = true; $("file-elder").value = ""; }
WHO.forEach(function (w) {
  function send() {
    var text = $("text-" + w).value.trim();
    var image = w === "elder" ? picked : null;
    if (!text && !image) return;
    say(image ? { who: w, text: text, image: image } : { who: w, text: text });
    $("text-" + w).value = "";
    if (w === "elder") unpick();
  }
  $("send-" + w).onclick = send;
  $("text-" + w).addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });
});

// A photo is made smaller before it travels, the same way the onboarding page does it.
function shrink(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      var k = Math.min(1, 1600 / Math.max(img.width, img.height));
      var c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
$("attach-elder").onclick = function () { $("file-elder").click(); };
$("unpick-elder").onclick = unpick;
$("file-elder").onchange = async function () {
  var file = this.files[0];
  if (!file) return;
  try { picked = await shrink(file); $("thumb-elder").src = picked; $("picked-elder").hidden = false; $("text-elder").focus(); }
  catch (e) { unpick(); }
};

fetch("/api/profile").then(function (r) { return r.json(); }).then(function (out) {
  var p = out.profile, name = p.elderName || "Her";
  $("name-elder").textContent = name;
  $("sub-elder").textContent = name + "'s companion";
  $("openline-elder").textContent = name + " hasn't opened the link yet.";
  if (p.self || !p.familyName) { $("name-family").textContent = "Family"; $("role-family").textContent = "Nobody has joined yet"; }
  else {
    $("name-family").textContent = p.familyName;
    $("role-family").textContent = "Family \\u00B7 " + name + " is " + p.familyName + "'s " + p.relation;
    $("role-page").textContent = "What " + p.familyName + " sees";
  }
});
</script>
</body>
</html>`;
