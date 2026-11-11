// Onboarding, as a short conversation with Kinly: who she is, what the two of them will do,
// her reminders (read from a photo of the pharmacy bag), then the links to share.
// Opening it again later edits the same answers.
export const ONBOARD_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Bring Kinly home</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Young+Serif&display=swap" rel="stylesheet">
<style>
  :root {
    --paper:#fbf3e4; --paper-deep:#f3e6cc; --ink:#3b2f2a; --ink-soft:#6a574c; --line:#dfcfb1;
    --mustard:#e0a526; --apricot:#f2a65a; --rose:#f0a39a; --sky:#a8cde6; --leaf:#b9d08a;
    --stage: var(--mustard);
    --display: "Young Serif", Georgia, serif;
    --body: "Atkinson Hyperlegible", "Helvetica Neue", Arial, sans-serif;
    --out: cubic-bezier(.16, 1, .3, 1);
  }
  * { box-sizing: border-box; }
  html { background: var(--paper); }
  body { margin:0; color:var(--ink); font: 400 18px/1.5 var(--body); min-height:100dvh; caret-color: var(--mustard); accent-color: var(--ink); }
  ::selection { background: var(--mustard); color: var(--ink); }
  :focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; border-radius: 6px; }

  .wrap { display:grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); min-height:100dvh; }

  /* The stage: Kinly, talking. Its color changes with the step. */
  .stage { position:sticky; top:0; height:100dvh; background: var(--stage); transition: background-color .7s var(--out);
           display:grid; grid-template-rows: auto 1fr auto; padding: clamp(20px, 4vw, 44px); overflow:hidden; }
  .wordmark { font: 400 22px/1 var(--display); letter-spacing: -0.01em; }
  .scene { display:grid; align-content:center; justify-items:center; gap: 6px; }
  .bubble { position:relative; background: var(--paper); border-radius: 28px; padding: 22px 26px; max-width: 26ch;
            font: 400 clamp(24px, 2.5vw, 34px)/1.18 var(--display); letter-spacing:-0.015em; text-wrap: balance;
            box-shadow: 0 14px 30px -18px rgb(59 47 42 / .55); }
  .bubble::after { content:""; position:absolute; left: 50%; bottom:-13px; width:28px; height:28px; background: var(--paper);
                   transform: translateX(-50%) rotate(45deg); border-radius: 0 0 8px 0; }
  .bubble.swap { animation: say .55s var(--out); }
  @keyframes say { from { opacity:0; filter: blur(6px); transform: translateY(10px) scale(.97); } }
  .cat { width: min(46vh, 86%); max-width: 400px; aspect-ratio:1; object-fit:contain; margin-top: 4px; transform-origin: 50% 92%; }
  .cat.hop { animation: hop .7s var(--out); }
  @keyframes hop { 0% { transform: translateY(0) scale(1.06,.92); } 35% { transform: translateY(-9%) scale(.96,1.05); } 70% { transform: translateY(0) scale(1.03,.97); } }
  .ground { width: 46%; height: 16px; border-radius:50%; background: rgb(59 47 42 / .16); margin-top: -26px; }
  .trail { display:flex; gap: 14px; align-items:center; }
  .paw { width: 30px; height: 30px; padding:0; border:0; background:none; color: rgb(59 47 42 / .28); cursor:pointer; transition: color .3s, transform .3s var(--out); }
  .paw:nth-child(even) { transform: translateY(-7px) rotate(12deg); }
  .paw:nth-child(odd) { transform: rotate(-10deg); }
  .paw.on { color: var(--ink); }
  .paw:disabled { cursor: default; }
  .paw svg { width:100%; height:100%; display:block; }

  /* The answers. */
  .panel { padding: clamp(28px, 6vw, 88px) clamp(20px, 6vw, 96px); display:grid; grid-template-columns: minmax(0, 1fr); align-content:center; min-width:0; }
  .step { max-width: 34rem; min-width: 0; }
  .step h1:focus { outline: 0; }
  .step[hidden] { display:none; }
  h1 { font: 400 clamp(34px, 4vw, 52px)/1.05 var(--display); letter-spacing:-0.025em; margin: 0 0 12px; text-wrap: balance; }
  .lede { color: var(--ink-soft); margin: 0 0 34px; max-width: 46ch; }

  .q { display:block; margin-bottom: 26px; }
  .q > span { display:block; font-weight:700; margin-bottom: 6px; }
  .q > small { display:block; color: var(--ink-soft); font-size: 15px; margin-top: 6px; }
  .q input, .q textarea { width:100%; font: 400 22px/1.3 var(--body); color: var(--ink); background: transparent; border:0;
                          border-bottom: 2px solid var(--ink); border-radius:0; padding: 8px 2px 10px; }
  .q textarea { min-height: 3.2em; resize: vertical; font-size: 18px; }
  .q input::placeholder, .q textarea::placeholder, .med input::placeholder, .note input::placeholder { color: #8a7566; }
  .q input:focus-visible, .q textarea:focus-visible { outline:0; border-bottom-color: var(--mustard); box-shadow: 0 2px 0 var(--mustard); }

  .btn { font: 700 18px/1 var(--body); color: var(--paper); background: var(--ink); border:0; border-radius: 999px; padding: 18px 28px; cursor:pointer;
         box-shadow: 0 10px 20px -12px rgb(59 47 42 / .7); transition: transform .25s var(--out), box-shadow .25s var(--out); }
  .btn:hover { transform: translateY(-2px); box-shadow: 0 16px 26px -14px rgb(59 47 42 / .75); }
  .btn:active { transform: translateY(0); }
  .btn[disabled] { opacity:.5; cursor: progress; transform:none; }
  .quiet { font: 700 16px/1 var(--body); color: var(--ink); background:none; border:0; padding: 14px 6px; cursor:pointer; text-decoration: underline; text-underline-offset: 5px; text-decoration-thickness: 2px; }
  .actions { display:flex; flex-wrap:wrap; gap: 8px 18px; align-items:center; margin-top: 36px; }

  /* Step 2: the day, as one line through it. */
  .day { list-style:none; margin: 0; padding: 0 0 0 0; }
  .day li { display:grid; grid-template-columns: 44px 1fr; gap: 16px; padding: 14px 0; align-items:start; }
  .day li + li { border-top: 1.5px dashed var(--line); }
  .ico { width: 44px; height: 44px; color: var(--ink); }
  .day b { font: 400 22px/1.2 var(--display); display:block; }
  .day p { margin: 2px 0 0; color: var(--ink-soft); }
  .aside { margin: 10px 0 30px 60px; font-size: 16px; color: var(--ink-soft); }
  h2 { font: 400 26px/1.15 var(--display); letter-spacing:-0.015em; margin: 0 0 4px; }
  .yours { background: var(--paper-deep); border-radius: 22px; padding: 22px 24px 10px; }
  .yours .day li + li { border-top-color: #d3bf99; }

  /* Step 3: the photo, then the list. */
  .shots { display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
  .shoot { display:grid; justify-items:center; align-content:start; gap: 8px; text-align:center; padding: 26px 18px; border-radius: 22px; background: var(--paper-deep);
           border: 2px dashed var(--ink); cursor:pointer; transition: background-color .25s, transform .25s var(--out); color: var(--ink); font: inherit; }
  .shoot:hover { background: #eddcb9; transform: translateY(-2px); }
  .shoot b { font: 400 22px/1.2 var(--display); }
  .shoot span { color: var(--ink-soft); font-size: 15px; line-height:1.35; }
  .shoot .ico { width: 48px; height: 48px; }
  .shoot[disabled] { cursor: progress; opacity:.55; transform:none; }
  .shoot.busy { cursor: progress; border-style: solid; }
  .shoot.busy .ico { animation: peer 1.1s ease-in-out infinite alternate; }
  @keyframes peer { to { transform: translateY(-5px) rotate(-6deg); } }
  .result { display:grid; grid-template-columns: 96px minmax(0, 1fr); gap: 16px; align-items:start; margin-top: 16px; padding: 16px; border-radius: 18px; background: #fff8ea; border: 2px solid var(--ink); }
  .result[hidden] { display:none; }
  .result.busy { border-style: dashed; }
  .thumb { position:relative; width: 96px; height: 96px; border-radius: 12px; overflow:hidden; background: var(--paper-deep); }
  #preview { width: 100%; height: 100%; object-fit: cover; display:block; }
  .result.busy .thumb::after { content:""; position:absolute; left:0; right:0; top:0; height: 34%;
    background: linear-gradient(to bottom, transparent, rgb(224 165 38 / .75)); border-bottom: 3px solid var(--mustard); animation: scan 1.5s ease-in-out infinite alternate; }
  @keyframes scan { from { transform: translateY(-100%); } to { transform: translateY(300%); } }
  .reading { height: 8px; border-radius: 999px; background: var(--paper-deep); overflow:hidden; margin: 10px 0 2px; }
  .reading[hidden] { display:none; }
  .reading i { display:block; height:100%; width: 38%; border-radius: 999px; background: var(--ink); animation: slide 1.3s ease-in-out infinite alternate; }
  @keyframes slide { from { transform: translateX(-20%); } to { transform: translateX(185%); } }
  .shoot.busy { border-style: solid; background: #eddcb9; opacity: 1 !important; }
  .shoot.busy b::after { content: "\\2026"; }
  .result b { font: 400 22px/1.2 var(--display); display:block; }
  .result p { margin: 4px 0 0; color: var(--ink-soft); font-size: 16px; }
  .result ul { list-style:none; margin: 10px 0 0; padding:0; display:grid; gap: 6px; }
  .result li { display:flex; flex-wrap:wrap; gap: 4px 10px; align-items:baseline; font-weight:700; }
  .result li small { font-weight:400; color: var(--ink-soft); font-size: 15px; }
  .tag { font-size: 13px; font-weight:700; padding: 2px 9px; border-radius: 999px; background: var(--leaf); }
  .tag.same { background: var(--paper-deep); }
  .listhead { margin-top: 30px; }
  .hint { margin: 2px 0 14px; color: var(--ink-soft); font-size: 16px; }
  .mname { font: 700 19px/1.3 var(--body); }
  .listhead[hidden] { display:none; }
  .med.fresh { animation: fresh 1.6s var(--out); }
  @keyframes fresh { from { background: #fbe3a4; box-shadow: 0 0 0 10px #fbe3a4; } to { background: transparent; box-shadow: 0 0 0 10px transparent; } }
  .meds { margin-top: 26px; display:grid; gap: 14px; }
  .med { display:grid; gap: 10px; padding-bottom: 16px; border-bottom: 1.5px dashed var(--line); }
  .med .top, .note .top { display:flex; gap: 10px; align-items:center; }
  .med input[type=text], .note input[type=text] { flex:1; min-width:0; font: 700 19px/1.3 var(--body); color: var(--ink); background: transparent; border:0; border-bottom: 2px solid var(--line); padding: 6px 2px; }
  .med input[type=text]:focus-visible, .note input:focus-visible { outline:0; border-bottom-color: var(--ink); }
  .chips { display:flex; flex-wrap:wrap; gap: 8px; }
  .chip { position:relative; }
  .chip input { position:absolute; inset:0; opacity:0; margin:0; cursor:pointer; width:100%; height:100%; }
  .chip span { display:block; padding: 8px 15px; border-radius: 999px; border: 2px solid var(--ink); font-size: 15px; font-weight:700; transition: background-color .2s, color .2s; }
  .chip input:checked + span { background: var(--ink); color: var(--paper); }
  .chip input:focus-visible + span { outline: 3px solid var(--mustard); outline-offset: 2px; }
  .rm { font: 700 14px/1 var(--body); color: var(--ink-soft); background:none; border:0; padding: 8px; cursor:pointer; text-decoration: underline; text-underline-offset: 4px; }
  .times { display:grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 14px; margin-top: 22px; }
  .times label { font-size: 15px; font-weight:700; display:grid; gap: 4px; }
  .times label[hidden] { display:none; }
  input[type=time], input[type=datetime-local] { font: 400 18px/1.2 var(--body); color: var(--ink); background: var(--paper); border: 2px solid var(--ink); border-radius: 12px; padding: 9px 10px; font-variant-numeric: tabular-nums; }
  .note { display:grid; gap: 10px; padding-bottom: 16px; border-bottom: 1.5px dashed var(--line); }
  .empty { color: var(--ink-soft); margin: 0 0 6px; }

  /* Step 5: the links. */
  .send { display:grid; gap: 4px; padding: 20px 0; border-top: 2px solid var(--ink); }
  .send:last-of-type { border-bottom: 2px solid var(--ink); }
  .send .who { font: 400 24px/1.2 var(--display); }
  .send .why { color: var(--ink-soft); font-size: 16px; }
  .send .go { display:flex; gap: 12px; align-items:center; margin-top: 8px; flex-wrap:wrap; }
  .send a { color: var(--ink); font-size: 15px; overflow-wrap:anywhere; text-underline-offset: 4px; flex: 1 1 14rem; min-width: 0; }
  .copy { font: 700 15px/1 var(--body); background: var(--mustard); color: var(--ink); border:0; border-radius:999px; padding: 12px 18px; cursor:pointer; transition: transform .25s var(--out); }
  .copy:hover { transform: translateY(-2px); }
  .send.first .copy { background: var(--ink); color: var(--paper); }
  .err { color: #9c2f1f; font-weight:700; margin: 14px 0 0; min-height: 1.5em; }

  @media (max-width: 860px) {
    .wrap { grid-template-columns: minmax(0, 1fr); }
    .stage { position:relative; height:auto; min-height: 0; grid-template-rows: auto auto auto; gap: 10px; padding: 16px 18px 14px; }
    .scene { grid-template-columns: 112px minmax(0, 1fr); align-items:center; justify-items:start; gap: 12px; }
    .cat { width: 112px; order:-1; margin:0; }
    .ground { display:none; }
    .bubble { font-size: 21px; padding: 14px 18px; border-radius: 20px; max-width:none; }
    .bubble::after { left:-9px; bottom: 50%; width:20px; height:20px; transform: translateY(50%) rotate(45deg); border-radius: 0 0 0 6px; }
    .paw { width: 22px; height: 22px; }
    .trail { gap: 10px; }
    .panel { padding: 30px 20px 60px; align-content:start; }
    .aside { margin-left: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .bubble.swap, .cat.hop, .shoot.busy .ico, .med.fresh, .result.busy .thumb::after, .reading i { animation: none; }
    .reading i { width: 100%; opacity: .5; }
    .stage, .btn, .copy, .paw { transition: none; }
  }
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="i-paw" viewBox="0 0 32 32"><g fill="currentColor"><ellipse cx="16" cy="21" rx="7.5" ry="6"/><ellipse cx="6.5" cy="13.5" rx="3" ry="4"/><ellipse cx="12.5" cy="7.5" rx="3" ry="4"/><ellipse cx="19.5" cy="7.5" rx="3" ry="4"/><ellipse cx="25.5" cy="13.5" rx="3" ry="4"/></g></symbol>
    <symbol id="i-walk" viewBox="0 0 44 44"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 30c0-3 2-5 5-5h6l9 5c3 1.5 8 1.5 8 5v1H8z"/><path d="M19 25v-7c0-2 1-3 3-3h2l2 12"/><path d="M8 33h28M23 27l2-2M27 29l2-2"/></g></symbol>
    <symbol id="i-bowl" viewBox="0 0 44 44"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22h32a16 14 0 0 1-32 0z"/><path d="M15 38h14"/><path d="M16 15c-2-3 2-4 0-7M22 15c-2-3 2-4 0-7M28 15c-2-3 2-4 0-7"/></g></symbol>
    <symbol id="i-photo" viewBox="0 0 44 44"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="5" width="28" height="34" rx="3"/><rect x="12" y="9" width="20" height="18" rx="1.5"/><path d="M12 23l6-6 5 5 3-3 6 6"/><path d="M16 33h12"/></g></symbol>
    <symbol id="i-pill" viewBox="0 0 44 44"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="15" width="34" height="14" rx="7" transform="rotate(-35 22 22)"/><path d="M18 14l8 16"/><path d="M33 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></g></symbol>
    <symbol id="i-knot" viewBox="0 0 44 44"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 38V20"/><path d="M22 20c-9-1-12-12-4-13 5-1 6 6 4 13zM22 20c9-1 12-12 4-13-5-1-6 6-4 13z"/><path d="M22 20l-8 9M22 20l8 9"/></g></symbol>
    <symbol id="i-drop" viewBox="0 0 44 44"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 6c7 9 11 14 11 20a11 11 0 0 1-22 0c0-6 4-11 11-20z"/><path d="M16 27h4l2-5 3 9 2-4h3"/></g></symbol>
    <symbol id="i-cam" viewBox="0 0 56 56"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 18h9l4-6h14l4 6h9v26H8z"/><circle cx="28" cy="30" r="8"/><path d="M41 24h2"/></g></symbol>
  </defs>
</svg>

<div class="wrap">
  <aside class="stage" id="stage">
    <div class="wordmark">Kinly</div>
    <div class="scene">
      <div class="bubble" id="bubble" aria-live="polite"></div>
      <img class="cat" id="cat" src="/pet/sticker_hello.webp" alt="Kinly, a small cream cat with an apricot ear and a mustard scarf">
      <div class="ground"></div>
    </div>
    <nav class="trail" id="trail" aria-label="Steps"></nav>
  </aside>

  <main class="panel">
    <section class="step" data-step="0">
      <h1>Bring Kinly home</h1>
      <p class="lede">Kinly is a small cat who keeps her company, checks in on her day, and lets you know how she's doing.</p>
      <label class="q"><span>Who is Kinly going home to?</span><input id="elderName" type="text" placeholder="Mom" autocomplete="off"><small>The name you'd call across the kitchen. Kinly will use it too.</small></label>
      <label class="q"><span>And you are</span><input id="familyName" type="text" placeholder="Anna" autocomplete="given-name"></label>
      <label class="q"><span>Anything Kinly should know about her?</span><textarea id="about" placeholder="Lives alone. Loves her garden. Type 2 diabetes."></textarea><small>Optional. Health, habits, what makes her laugh.</small></label>
      <p class="err" id="err0" role="alert"></p>
      <div class="actions"><button class="btn" data-next>Meet Kinly</button></div>
    </section>

    <section class="step" data-step="1" hidden>
      <h1>A day with Kinly</h1>
      <p class="lede">Three small things, every day. <span data-her>She</span> answers with a photo or a short video, and Kinly remembers.</p>
      <ul class="day">
        <li><svg class="ico"><use href="#i-walk"/></svg><div><b>Activity</b><p>Kinly invites her out. She sends back a few steps of her walk.</p></div></li>
        <li><svg class="ico"><use href="#i-bowl"/></svg><div><b>Meals</b><p>Kinly is nosy about what's on her plate.</p></div></li>
        <li><svg class="ico"><use href="#i-photo"/></svg><div><b>Daily record</b><p>One moment a day, kept. Over weeks, Kinly notices how her days change.</p></div></li>
      </ul>
      <p class="aside">Nothing to set up here. She tells Kinly when she likes to walk and eat, and Kinly fits around her.</p>
      <div class="yours">
        <h2>Reminders, which you can set for her</h2>
        <ul class="day">
          <li><svg class="ico"><use href="#i-pill"/></svg><div><b>Medication</b><p>Kinly nudges at the right time, and looks at the pills with her if she's unsure.</p></div></li>
          <li><svg class="ico"><use href="#i-drop"/></svg><div><b>Blood sugar and blood pressure</b><p>Kinly asks for a photo of the meter and reads the number for her.</p></div></li>
          <li><svg class="ico"><use href="#i-knot"/></svg><div><b>Remember this for me</b><p>Appointments, birthdays, the plumber on Tuesday.</p></div></li>
        </ul>
      </div>
      <div class="actions"><button class="btn" data-next>Set her reminders</button><button class="quiet" data-skip>Skip, she'll tell Kinly herself</button></div>
    </section>

    <section class="step" data-step="2" hidden>
      <h1>Her medicines and readings</h1>
      <p class="lede">Show Kinly the label, the pills, or both. It reads what it can, and you fix anything it got wrong.</p>
      <div class="shots" id="shots">
        <button type="button" class="shoot" data-read="meds">
          <svg class="ico"><use href="#i-photo"/></svg>
          <b>The label or prescription</b>
          <span>Pharmacy bag, bottle label, or the slip from the clinic</span>
        </button>
        <button type="button" class="shoot" data-read="pills">
          <svg class="ico"><use href="#i-pill"/></svg>
          <b>The pills themselves</b>
          <span>Laid out on a table, markings facing up</span>
        </button>
      </div>
      <input type="file" id="file" accept="image/*" hidden>
      <div class="result" id="result" role="status" aria-live="polite" hidden>
        <div class="thumb"><img id="preview" alt="The photo you chose" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="></div>
        <div>
          <b id="resultTitle"></b>
          <div class="reading" id="readingBar" hidden><i></i></div>
          <p id="resultNote"></p>
          <ul id="resultList"></ul>
        </div>
      </div>
      <h2 class="listhead" id="listHead" hidden>Her medicines so far</h2>
      <div class="meds" id="meds"></div>
      <button class="quiet" id="addMed" type="button">Add one by hand</button>
      <h2 class="listhead">Does she measure anything?</h2>
      <p class="hint">Pick when Kinly should ask. Leave them empty and Kinly won't.</p>
      <div class="meds" id="measures">
        <div class="med" data-measure="glucose"><b class="mname">Blood sugar</b><div class="chips"></div></div>
        <div class="med" data-measure="pressure"><b class="mname">Blood pressure</b><div class="chips"></div></div>
      </div>
      <div class="times" id="times">
        <label data-slot="morning">Morning is<input type="time" id="t_morning"></label>
        <label data-slot="noon">Noon is<input type="time" id="t_noon"></label>
        <label data-slot="evening">Evening is<input type="time" id="t_evening"></label>
        <label data-slot="bedtime">Bedtime is<input type="time" id="t_bedtime"></label>
      </div>
      <div class="actions"><button class="btn" data-next>These look right</button></div>
    </section>

    <section class="step" data-step="3" hidden>
      <h1>Remember this for her</h1>
      <p class="lede">Anything coming up that she shouldn't have to hold in her head. She can add more herself, just by telling Kinly.</p>
      <p class="empty" id="noNotes">Nothing yet. That's fine too.</p>
      <div class="meds" id="notes"></div>
      <button class="quiet" id="addNote" type="button">Add a reminder</button>
      <p class="err" id="err3" role="alert"></p>
      <div class="actions"><button class="btn" id="save">Send Kinly home</button></div>
    </section>

    <section class="step" data-step="4" hidden>
      <h1>Kinly is ready</h1>
      <p class="lede">Send her the first link. When she opens it, Kinly says hello.</p>
      <div class="send first"><span class="who" id="whoElder">For her</span><span class="why">Opens her chat with Kinly.</span><div class="go"><a id="l_elder" target="_blank" rel="noopener"></a><button class="copy" data-copy="l_elder">Copy link</button></div></div>
      <div class="send"><span class="who">For family</span><span class="why">Ask Kinly how she's doing, or send her your love through it.</span><div class="go"><a id="l_family" target="_blank" rel="noopener"></a><button class="copy" data-copy="l_family">Copy link</button></div></div>
      <div class="send"><span class="who">For her caregiver or care center</span><span class="why">They hear from Kinly only when something needs a professional.</span><div class="go"><a id="l_care" target="_blank" rel="noopener"></a><button class="copy" data-copy="l_care">Copy link</button></div></div>
      <div class="actions"><a class="btn" id="l_page" style="text-decoration:none">See her day</a><button class="quiet" data-goto="0">Change something</button></div>
    </section>
  </main>
</div>

<script>
var $ = function (id) { return document.getElementById(id); };
var SLOTS = ["morning", "noon", "evening", "bedtime"];
var STAGE = [
  { color: "var(--mustard)", cat: "hello", say: function () { return "Hello! I'm Kinly. Who am I going home to?"; } },
  { color: "var(--apricot)", cat: "cozy", say: function () { var n = $("elderName").value.trim(); return n ? "Here's what " + n + " and I will get up to." : "Here's what the two of us will get up to."; } },
  { color: "var(--rose)", cat: "happy", say: function () { return "Show me her medicines. I'm a careful reader."; } },
  { color: "var(--sky)", cat: "love", say: function () { return "What should I remember for her?"; } },
  { color: "var(--leaf)", cat: "yay", say: function () { return "I'm ready! Send me to " + her() + "."; } }
];
var step = 0, reached = 0;
function her() { return $("elderName").value.trim() || "her"; }

function say(text, cat) {
  var b = $("bubble"), c = $("cat");
  b.textContent = text;
  b.classList.remove("swap"); void b.offsetWidth; b.classList.add("swap");
  if (cat) { c.src = "/pet/sticker_" + cat + ".webp"; c.classList.remove("hop"); void c.offsetWidth; c.classList.add("hop"); }
}

function drawTrail() {
  $("trail").innerHTML = "";
  ["Who", "Her day", "Medicines", "Reminders", "Share"].forEach(function (name, i) {
    var b = document.createElement("button");
    b.className = "paw" + (i <= step ? " on" : "");
    b.disabled = i > reached;
    b.setAttribute("aria-label", name + (i === step ? " (current step)" : ""));
    b.innerHTML = '<svg aria-hidden="true"><use href="#i-paw"/></svg>';
    b.onclick = function () { go(i); };
    $("trail").appendChild(b);
  });
}

function go(n, quiet) {
  step = n; reached = Math.max(reached, n);
  document.querySelectorAll(".step").forEach(function (s) { s.hidden = Number(s.dataset.step) !== n; });
  $("stage").style.setProperty("--stage", STAGE[n].color);
  say(STAGE[n].say(), STAGE[n].cat);
  document.querySelectorAll("[data-her]").forEach(function (e) { e.textContent = $("elderName").value.trim() || "She"; });
  drawTrail();
  if (quiet) return;
  window.scrollTo({ top: 0, behavior: "smooth" });
  var first = document.querySelector('.step[data-step="' + n + '"] h1');
  if (first) { first.setAttribute("tabindex", "-1"); first.focus({ preventScroll: true }); }
}

/* Medicines */
function syncTimes() {
  var used = {};
  document.querySelectorAll("#meds .chip input:checked, #measures .chip input:checked").forEach(function (c) { used[c.value] = true; });
  var any = false;
  document.querySelectorAll("#times label").forEach(function (l) { l.hidden = !used[l.dataset.slot]; if (used[l.dataset.slot]) any = true; });
  $("times").style.display = any ? "" : "none";
}
function medRow(med) {
  var el = document.createElement("div");
  el.className = "med";
  el.innerHTML = '<div class="top"><input type="text" placeholder="Name and strength, as on the label" aria-label="Medicine name"><button type="button" class="rm">Remove</button></div><div class="chips">' +
    SLOTS.map(function (s) { return '<label class="chip"><input type="checkbox" value="' + s + '"><span>' + s.charAt(0).toUpperCase() + s.slice(1) + '</span></label>'; }).join("") + '</div>';
  el.querySelector("input[type=text]").value = med.name;
  el.querySelectorAll(".chip input").forEach(function (c) { c.checked = med.slots.indexOf(c.value) >= 0; c.onchange = syncTimes; });
  el.querySelector(".rm").onclick = function () { el.remove(); $("listHead").hidden = $("meds").children.length === 0; syncTimes(); };
  $("meds").appendChild(el);
  $("listHead").hidden = false;
  syncTimes();
  return el;
}
document.querySelectorAll("[data-measure] .chips").forEach(function (box) {
  box.innerHTML = SLOTS.map(function (s) { return '<label class="chip"><input type="checkbox" value="' + s + '"><span>' + s.charAt(0).toUpperCase() + s.slice(1) + '</span></label>'; }).join("");
  box.querySelectorAll("input").forEach(function (c) { c.onchange = syncTimes; });
});
function measureSlots(what) {
  return Array.from(document.querySelectorAll('[data-measure="' + what + '"] .chip input:checked')).map(function (c) { return c.value; });
}
$("addMed").onclick = function () { medRow({ name: "", slots: ["morning"] }).querySelector("input").focus(); };

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
var reading = "meds";
document.querySelectorAll("[data-read]").forEach(function (b) {
  b.onclick = function () { reading = b.dataset.read; $("file").value = ""; $("file").click(); };
});
// Add what Kinly read to the list. Returns true when it was new, false when it was already there.
function addRead(med) {
  var want = med.name.trim().toLowerCase();
  var rows = Array.from(document.querySelectorAll("#meds .med"));
  var had = rows.filter(function (r) { return r.querySelector("input[type=text]").value.trim().toLowerCase() === want; })[0];
  var row = had || medRow(med);
  row.classList.remove("fresh"); void row.offsetWidth; row.classList.add("fresh");
  return !had;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function showResult(state, title, note, items) {
  var r = $("result");
  r.hidden = false;
  r.classList.toggle("busy", state === "busy");
  $("readingBar").hidden = state !== "busy";
  $("resultTitle").textContent = title;
  $("resultNote").textContent = note || "";
  var ul = $("resultList"); ul.innerHTML = "";
  (items || []).forEach(function (it) {
    var li = document.createElement("li");
    var name = document.createElement("span"); name.textContent = it.name; li.appendChild(name);
    var when = document.createElement("small"); when.textContent = it.slots.map(cap).join(", "); li.appendChild(when);
    var tag = document.createElement("span"); tag.className = "tag" + (it.added ? "" : " same"); tag.textContent = it.added ? "Added" : "Already in her list"; li.appendChild(tag);
    ul.appendChild(li);
  });
  if (r.dataset.state !== state) r.scrollIntoView({ behavior: "smooth", block: "nearest" });
  r.dataset.state = state;
}
$("file").onchange = async function () {
  var file = this.files[0];
  if (!file) return;
  var buttons = document.querySelectorAll("[data-read]");
  buttons.forEach(function (b) { b.disabled = true; b.classList.toggle("busy", b.dataset.read === reading); });
  say(reading === "meds" ? "Let me read this. Small print, hmm." : "Let me look closely at these.", "cozy");
  var label = {}; buttons.forEach(function (b) { label[b.dataset.read] = b.querySelector("b").textContent; if (b.dataset.read === reading) b.querySelector("b").textContent = "Kinly is reading"; });
  var STAGES = reading === "meds"
    ? ["Opening the photo", "Reading the names and strengths", "Working out when each one is taken", "Checking the label against itself", "Nearly there"]
    : ["Opening the photo", "Looking at each pill", "Reading the markings", "Looking them up", "Nearly there"];
  var began = Date.now();
  $("preview").src = URL.createObjectURL(file);
  function tickStatus() {
    var s = Math.floor((Date.now() - began) / 1000);
    showResult("busy", "Analyzing your photo", STAGES[Math.min(STAGES.length - 1, Math.floor(s / 3))]);
  }
  tickStatus();
  var timer = setInterval(tickStatus, 1000);
  try {
    var data = await shrink(file);
    var res = await fetch(reading === "meds" ? "/api/read-meds" : "/api/read-pills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: data }) });
    var out = await res.json();
    clearInterval(timer);
    var meds = out.meds || [];
    var items = meds.map(function (m) { return { name: m.name, slots: m.slots, added: addRead(m) }; });
    var title = meds.length === 0 ? "Kinly found no medicine in this photo" : "Kinly read " + meds.length + (meds.length === 1 ? " medicine" : " medicines") + " from this photo";
    showResult("done", title, out.note, items);
    say(out.note || "Here's what I found. Fix anything I got wrong.", meds.length ? "yay" : "worried");
  } catch (e) {
    clearInterval(timer);
    showResult("done", "Kinly couldn't open that photo", "Try another photo, or add the medicine by hand below.");
    say("I couldn't open that photo. Try another, or type them in.", "worried");
  }
  clearInterval(timer);
  buttons.forEach(function (b) { b.disabled = false; b.classList.remove("busy"); b.querySelector("b").textContent = label[b.dataset.read]; });
};

/* Reminders */
function noteRow(n) {
  var el = document.createElement("div");
  el.className = "note";
  el.innerHTML = '<div class="top"><input type="text" placeholder="Eye appointment with Dr. Lee" aria-label="What to remember"><button type="button" class="rm">Remove</button></div><input type="datetime-local" aria-label="When to remind her">';
  el.querySelector("input[type=text]").value = n.note;
  el.querySelector("input[type=datetime-local]").value = n.at;
  el.querySelector(".rm").onclick = function () { el.remove(); $("noNotes").hidden = $("notes").children.length > 0; };
  $("notes").appendChild(el);
  $("noNotes").hidden = true;
  return el;
}
$("addNote").onclick = function () { noteRow({ note: "", at: "" }).querySelector("input").focus(); };

/* Moving through */
function collect() {
  var times = {};
  SLOTS.forEach(function (s) { times[s] = $("t_" + s).value; });
  return {
    elderName: $("elderName").value.trim(), familyName: $("familyName").value.trim(), about: $("about").value.trim(),
    meds: {
      list: Array.from(document.querySelectorAll("#meds .med")).map(function (el) {
        return { name: el.querySelector("input[type=text]").value.trim(), slots: Array.from(el.querySelectorAll(".chip input:checked")).map(function (c) { return c.value; }) };
      }).filter(function (m) { return m.name; }),
      times: times
    },
    measure: { glucose: measureSlots("glucose"), pressure: measureSlots("pressure") },
    reminders: Array.from(document.querySelectorAll(".note")).map(function (el) {
      return { note: el.querySelector("input[type=text]").value.trim(), at: el.querySelector("input[type=datetime-local]").value };
    }).filter(function (r) { return r.note; })
  };
}
function showLinks(out) {
  $("whoElder").textContent = "For " + out.profile.elderName;
  ["elder", "family", "care"].forEach(function (k) { $("l_" + k).href = out.links[k]; $("l_" + k).textContent = out.links[k].replace("https://", ""); });
  $("l_page").href = "/family";
}
async function save() {
  var body = collect();
  var late = body.reminders.filter(function (r) { return !r.at; });
  if (late.length) { $("err3").textContent = "Pick a day and time for \\u201C" + late[0].note + "\\u201D, or remove it."; return false; }
  $("err3").textContent = "";
  $("save").disabled = true;
  try {
    var res = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    var out = await res.json();
    if (!res.ok) throw new Error(out.error || "Could not save");
    showLinks(out);
    return true;
  } catch (e) {
    $("err3").textContent = e.message + ". Your answers are still here; try again.";
    return false;
  } finally { $("save").disabled = false; }
}

document.querySelectorAll("[data-next]").forEach(function (b) {
  b.onclick = function () {
    if (step === 0 && (!$("elderName").value.trim() || !$("familyName").value.trim())) {
      $("err0").textContent = "Kinly needs both names to say hello properly.";
      ($("elderName").value.trim() ? $("familyName") : $("elderName")).focus();
      return;
    }
    $("err0").textContent = "";
    go(step + 1);
  };
});
document.querySelector("[data-skip]").onclick = async function () { if (await save()) go(4); };
$("save").onclick = async function () { if (await save()) go(4); };
document.querySelectorAll("[data-goto]").forEach(function (b) { b.onclick = function () { go(Number(b.dataset.goto)); }; });
document.querySelectorAll(".copy").forEach(function (b) {
  b.onclick = async function () {
    await navigator.clipboard.writeText($(b.dataset.copy).href);
    var was = b.textContent; b.textContent = "Copied"; setTimeout(function () { b.textContent = was; }, 1400);
  };
});
$("elderName").addEventListener("input", function () { if (step === 0 && this.value.trim()) $("bubble").textContent = "Oh, " + this.value.trim() + "! I like her already."; });

fetch("/api/profile").then(function (r) { return r.json(); }).then(function (out) {
  var p = out.profile;
  if (out.onboarded) { $("elderName").value = p.elderName; $("familyName").value = p.familyName; $("about").value = p.about; reached = 4; }
  if (out.onboarded) p.tasks.meds.list.forEach(medRow);
  SLOTS.forEach(function (s) { $("t_" + s).value = p.tasks.meds.times[s]; });
  (out.reminders || []).forEach(noteRow);
  ["glucose", "pressure"].forEach(function (what) {
    document.querySelectorAll('[data-measure="' + what + '"] .chip input').forEach(function (c) { c.checked = out.onboarded && (p.tasks.measure[what] || []).indexOf(c.value) >= 0; });
  });
  syncTimes();
  if (out.onboarded) showLinks(out);
  var open = Number(location.hash.slice(1)) || 0;
  if (open > 0 && open < 5) reached = Math.max(reached, open);
  go(Math.min(open, reached), true);
});
</script>
</body>
</html>`;
