// Onboarding: the family switches Kinly on for her, picks the daily missions, and gets links to share.
// The same page edits everything later.
export const ONBOARD_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Set up Kinly</title>
<style>
  :root { --bg:#faf7f2; --card:#fff; --ink:#1f2421; --muted:#6b736e; --line:#e7e1d6; --accent:#e0a526; --accent-ink:#3b2f2a; --green:#2f7d5b; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font: 17px/1.5 -apple-system, "SF Pro Text", "Segoe UI", sans-serif; }
  main { max-width: 620px; margin: 0 auto; padding: 28px 16px 80px; }
  .hero { display:flex; gap:16px; align-items:center; margin-bottom: 22px; }
  .hero img { width: 96px; height: 96px; border-radius: 24px; border:1px solid var(--line); flex:none; }
  h1 { font-size: 30px; line-height:1.15; margin:0 0 4px; letter-spacing:-0.02em; text-wrap:balance; }
  .sub { color:var(--muted); margin:0; }
  section { background:var(--card); border:1px solid var(--line); border-radius: 16px; padding: 18px; margin-bottom: 14px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin: 0 0 12px; }
  label.field { display:block; margin-bottom: 12px; font-weight:600; }
  label.field span { display:block; font-size:14px; color:var(--muted); font-weight:500; margin-bottom:4px; }
  input[type=text], input[type=time], textarea { width:100%; font:inherit; padding: 11px 12px; border:1px solid var(--line); border-radius: 10px; background:#fff; color:var(--ink); }
  textarea { min-height: 64px; resize: vertical; }
  input:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
  .task { border-top:1px solid var(--line); padding: 14px 0; }
  .task:first-of-type { border-top:0; padding-top:0; }
  .task-head { display:flex; align-items:center; gap:12px; }
  .task-head .emoji { font-size: 26px; width: 34px; text-align:center; }
  .task-head .name { font-weight:700; flex:1; }
  .task-head .name small { display:block; font-weight:400; color:var(--muted); font-size:14px; }
  .switch { position:relative; width:52px; height:30px; flex:none; }
  .switch input { position:absolute; inset:0; opacity:0; margin:0; cursor:pointer; z-index:1; width:100%; height:100%; }
  .switch i { position:absolute; inset:0; border-radius:999px; background:#d8d2c6; transition:.15s; }
  .switch i::after { content:""; position:absolute; top:3px; left:3px; width:24px; height:24px; border-radius:50%; background:#fff; transition:.15s; box-shadow:0 1px 3px #0003; }
  .switch input:checked + i { background: var(--green); }
  .switch input:checked + i::after { left:25px; }
  .switch input:focus-visible + i { outline: 2px solid var(--accent); outline-offset: 2px; }
  .detail { margin: 12px 0 0 46px; display:grid; gap:10px; }
  .task.off .detail { display:none; }
  .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .row > label { font-size:14px; color:var(--muted); display:flex; flex-direction:column; gap:4px; flex:1; min-width: 96px; }
  .med { border:1px solid var(--line); border-radius:12px; padding:10px; display:grid; gap:8px; }
  .chips { display:flex; gap:6px; flex-wrap:wrap; }
  .chip { position:relative; }
  .chip input { position:absolute; opacity:0; inset:0; margin:0; cursor:pointer; width:100%; height:100%; }
  .chip span { display:block; padding:6px 12px; border-radius:999px; border:1px solid var(--line); font-size:14px; }
  .chip input:checked + span { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight:600; }
  .chip input:focus-visible + span { outline: 2px solid var(--ink); }
  button { font:inherit; font-weight:700; border:0; border-radius: 999px; padding: 14px 22px; cursor:pointer; }
  .primary { background: var(--accent); color: var(--accent-ink); width:100%; font-size:18px; }
  .ghost { background:transparent; color:var(--muted); border:1px dashed var(--line); padding:8px 14px; font-weight:600; font-size:14px; }
  .x { background:transparent; color:var(--muted); padding:4px 10px; font-size:14px; }
  #done { display:none; }
  .link { border-top:1px solid var(--line); padding: 12px 0; display:flex; gap:10px; align-items:center; }
  .link:first-of-type { border-top:0; }
  .link div { flex:1; min-width:0; }
  .link b { display:block; }
  .link code { display:block; font-size:13px; color:var(--muted); overflow-wrap:anywhere; }
  .copy { background:#f1ece2; color:var(--ink); padding:9px 14px; font-size:14px; }
  .saved { color: var(--green); font-weight:700; margin: 0 0 10px; }
</style>
</head>
<body>
<main>
  <div class="hero">
    <img src="/pet/hello.png" alt="Kinly, a small cream cat with a mustard scarf">
    <div><h1>Bring Kinly home</h1><p class="sub">A little companion who checks in on her day, and keeps you in the loop.</p></div>
  </div>

  <form id="form">
    <section>
      <h2>Who is Kinly for?</h2>
      <label class="field"><span>What should Kinly call her?</span><input type="text" id="elderName" required></label>
      <label class="field"><span>Your name</span><input type="text" id="familyName" required></label>
      <label class="field"><span>Anything Kinly should know (health, living situation, what she enjoys)</span><textarea id="about"></textarea></label>
    </section>

    <section>
      <h2>Daily missions</h2>

      <div class="task" data-task="activity">
        <div class="task-head"><span class="emoji">🚶</span><span class="name">Activity<small>Kinly invites her out and asks for a photo or video.</small></span>
          <label class="switch"><input type="checkbox" id="activity_on" aria-label="Activity"><i></i></label></div>
        <div class="detail"><div class="row">
          <label>What<input type="text" id="activity_what"></label>
          <label>Time<input type="time" id="activity_time"></label>
        </div></div>
      </div>

      <div class="task" data-task="meals">
        <div class="task-head"><span class="emoji">🍲</span><span class="name">Meals<small>Kinly is curious what she's eating.</small></span>
          <label class="switch"><input type="checkbox" id="meals_on" aria-label="Meals"><i></i></label></div>
        <div class="detail"><div class="row">
          <label>Breakfast<input type="time" id="meals_breakfast"></label>
          <label>Lunch<input type="time" id="meals_lunch"></label>
          <label>Dinner<input type="time" id="meals_dinner"></label>
        </div></div>
      </div>

      <div class="task" data-task="meds">
        <div class="task-head"><span class="emoji">💊</span><span class="name">Medication reminders<small>Kinly nudges at the right time and can look at the pills with her.</small></span>
          <label class="switch"><input type="checkbox" id="meds_on" aria-label="Medication reminders"><i></i></label></div>
        <div class="detail">
          <div id="meds"></div>
          <button type="button" class="ghost" id="addMed">+ Add a medicine</button>
          <div class="row">
            <label>Morning<input type="time" id="t_morning"></label>
            <label>Noon<input type="time" id="t_noon"></label>
            <label>Evening<input type="time" id="t_evening"></label>
            <label>Bedtime<input type="time" id="t_bedtime"></label>
          </div>
        </div>
      </div>

      <div class="task" data-task="remember">
        <div class="task-head"><span class="emoji">📌</span><span class="name">Remember this for me<small>She tells Kinly; Kinly reminds her when it's time.</small></span>
          <label class="switch"><input type="checkbox" id="remember_on" aria-label="Remember this for me"><i></i></label></div>
      </div>

      <div class="task" data-task="journal">
        <div class="task-head"><span class="emoji">📷</span><span class="name">Daily record<small>One photo or video a day. Kinly notices how days change over time.</small></span>
          <label class="switch"><input type="checkbox" id="journal_on" aria-label="Daily record"><i></i></label></div>
        <div class="detail"><div class="row"><label>Time<input type="time" id="journal_time"></label></div></div>
      </div>
    </section>

    <button class="primary" type="submit">Turn Kinly on</button>
  </form>

  <section id="done">
    <p class="saved">Kinly is on. You can change anything above, any time.</p>
    <h2>Share Kinly</h2>
    <div class="link"><div><b id="l_elder_title">For her</b><code id="l_elder"></code></div><button class="copy" data-copy="l_elder">Copy</button></div>
    <div class="link"><div><b>For family</b><code id="l_family"></code></div><button class="copy" data-copy="l_family">Copy</button></div>
    <div class="link"><div><b>For her caregiver or care center</b><code id="l_care"></code></div><button class="copy" data-copy="l_care">Copy</button></div>
    <div class="link"><div><b>Her day, live</b><code id="l_page"></code></div><button class="copy" data-copy="l_page">Copy</button></div>
  </section>
</main>
<script>
const $ = (id) => document.getElementById(id);
const SLOTS = ["morning", "noon", "evening", "bedtime"];

function medRow(med) {
  const el = document.createElement("div");
  el.className = "med";
  el.innerHTML = '<div class="row"><input type="text" class="med-name" placeholder="Name on the label, e.g. Norvasc 5mg" aria-label="Medicine name" style="flex:1"><button type="button" class="x" aria-label="Remove medicine">Remove</button></div>' +
    '<div class="chips">' + SLOTS.map(s => '<label class="chip"><input type="checkbox" value="' + s + '"><span>' + s[0].toUpperCase() + s.slice(1) + '</span></label>').join("") + '</div>';
  el.querySelector(".med-name").value = med.name;
  el.querySelectorAll(".chip input").forEach(c => { c.checked = med.slots.includes(c.value); });
  el.querySelector(".x").onclick = () => el.remove();
  $("meds").appendChild(el);
}
$("addMed").onclick = () => medRow({ name: "", slots: ["morning"] });

function syncTasks() {
  document.querySelectorAll(".task").forEach(t => t.classList.toggle("off", !t.querySelector(".switch input").checked));
}
document.querySelectorAll(".switch input").forEach(i => i.addEventListener("change", syncTasks));

function fill(p) {
  $("elderName").value = p.elderName; $("familyName").value = p.familyName; $("about").value = p.about;
  const t = p.tasks;
  $("activity_on").checked = t.activity.on; $("activity_what").value = t.activity.what; $("activity_time").value = t.activity.time;
  $("meals_on").checked = t.meals.on; $("meals_breakfast").value = t.meals.breakfast; $("meals_lunch").value = t.meals.lunch; $("meals_dinner").value = t.meals.dinner;
  $("meds_on").checked = t.meds.on; $("meds").innerHTML = ""; t.meds.list.forEach(medRow);
  SLOTS.forEach(s => { $("t_" + s).value = t.meds.times[s]; });
  $("remember_on").checked = t.remember.on;
  $("journal_on").checked = t.journal.on; $("journal_time").value = t.journal.time;
  syncTasks();
}

function read() {
  return {
    elderName: $("elderName").value.trim(), familyName: $("familyName").value.trim(), about: $("about").value.trim(),
    tasks: {
      activity: { on: $("activity_on").checked, time: $("activity_time").value, what: $("activity_what").value.trim() || "a walk" },
      meals: { on: $("meals_on").checked, breakfast: $("meals_breakfast").value, lunch: $("meals_lunch").value, dinner: $("meals_dinner").value },
      meds: {
        on: $("meds_on").checked,
        list: Array.from(document.querySelectorAll(".med")).map(el => ({
          name: el.querySelector(".med-name").value.trim(),
          slots: Array.from(el.querySelectorAll(".chip input:checked")).map(c => c.value),
        })).filter(m => m.name),
        times: Object.fromEntries(SLOTS.map(s => [s, $("t_" + s).value])),
      },
      remember: { on: $("remember_on").checked },
      journal: { on: $("journal_on").checked, time: $("journal_time").value },
    },
  };
}

function showLinks(out) {
  if (!out.onboarded) return;
  $("l_elder_title").textContent = "For " + out.profile.elderName;
  for (const k of ["elder", "family", "care", "page"]) $("l_" + k).textContent = out.links[k];
  $("done").style.display = "block";
  document.querySelector(".primary").textContent = "Save changes";
}

document.querySelectorAll(".copy").forEach(b => b.onclick = async () => {
  await navigator.clipboard.writeText($(b.dataset.copy).textContent);
  b.textContent = "Copied"; setTimeout(() => { b.textContent = "Copy"; }, 1200);
});

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const res = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(read()) });
  showLinks(await res.json());
  $("done").scrollIntoView({ behavior: "smooth" });
});

fetch("/api/profile").then(r => r.json()).then(out => { fill(out.profile); showLinks(out); });
</script>
</body>
</html>`;
