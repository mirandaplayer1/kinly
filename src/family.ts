// The family's view: today's missions, what changed, and the timeline.
export const FAMILY_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kinly · Her day</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --bg:#fbf3e4; --card:#fffaf0; --ink:#3b2f2a; --muted:#6a574c; --line:#dfcfb1;
          --green:#2f7d5b; --yellow:#b7791f; --red:#c0392b; --accent:#e0a526; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font: 17px/1.45 "Geist", "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  ::selection { background: var(--accent); }
  main { max-width: 620px; margin: 0 auto; padding: 24px 16px 60px; }
  header { display:flex; align-items:center; gap:14px; margin-bottom: 14px; }
  header img { width:64px; height:64px; border-radius:18px; border:1px solid var(--line); }
  h1 { font: 700 38px/1 "Bricolage Grotesque", sans-serif; margin:0; letter-spacing:-0.04em; }
  header a { margin-left:auto; color:var(--muted); font-size:14px; }
  h2 { font: 700 22px/1.1 "Bricolage Grotesque", sans-serif; letter-spacing:-0.03em; margin: 30px 0 12px; }
  #status { font: 600 22px/1.2 "Bricolage Grotesque", sans-serif; letter-spacing:-0.02em; padding: 18px 20px; border-radius: 14px; background: var(--card); border:1.5px solid var(--ink); }
  #status.green { color: var(--green); } #status.yellow { color: var(--yellow); } #status.red { color: var(--red); }
  .missions { display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:10px; }
  .mission { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:12px 14px; }
  .mission.done { border-color: var(--green); }
  .mission .t { font-size:13px; color:var(--muted); font-variant-numeric: tabular-nums; }
  .mission .n { font-weight:600; }
  .mission .s { font-size:13px; color:var(--muted); }
  .mission.done .s { color: var(--green); font-weight:600; }
  .card { background:var(--card); border:1px solid var(--line); border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; }
  .change { border-left: 5px solid var(--accent); }
  .event { display:flex; gap:14px; border-left: 5px solid var(--green); }
  .event.yellow { border-left-color: var(--yellow); } .event.red { border-left-color: var(--red); }
  .event img { width: 76px; height: 76px; object-fit: cover; border-radius: 10px; flex: none; }
  .meta { color: var(--muted); font-size: 14px; margin-bottom: 2px; }
  .empty { color: var(--muted); padding: 8px 0; }
</style>
</head>
<body>
<main>
  <header><img id="pet" src="/pet/cozy.png" alt="Kinly"><h1 id="title">Her day</h1><a href="/start">Settings</a></header>
  <div id="status" class="green">Waiting for the first check-in…</div>
  <h2>Today's missions</h2>
  <div id="missions" class="missions"></div>
  <div id="changesWrap" hidden><h2>Changes Kinly noticed</h2><div id="changes"></div></div>
  <h2>Timeline</h2>
  <div id="list"><p class="empty">Nothing yet today.</p></div>
</main>
<script>
const LABEL = { pills: "Pills", glucose: "Blood sugar", blood_pressure: "Blood pressure", meal: "Meal", activity: "Activity", journal: "Daily record", memory: "Asked Kinly to remember", clock: "Brain-health check-in", chat: "Chat with Kinly", family: "From family", care: "From care team" };
const HEAD = { green: "All good today", yellow: "Worth a call today", red: "Check on her now" };
const ORDER = { green: 0, yellow: 1, red: 2 };
function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
const time = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
async function refresh() {
  const d = await (await fetch("/api/today")).json();
  document.getElementById("title").textContent = d.elderName + "'s day";
  document.getElementById("pet").src = "/pet/" + d.mood + ".png";
  document.getElementById("missions").innerHTML = d.missions.map(m =>
    '<div class="mission ' + (m.done ? "done" : "") + '"><div class="t">' + m.time + '</div><div class="n">' + esc(m.title) + '</div><div class="s">' +
    (m.done ? "Done" + (m.streak > 1 ? " · " + m.streak + " days in a row" : "") : m.asked ? "Kinly asked" : "Later today") + '</div></div>').join("") || '<p class="empty">No missions switched on.</p>';
  document.getElementById("changesWrap").hidden = d.changes.length === 0;
  document.getElementById("changes").innerHTML = d.changes.map(c => '<div class="card change"><div class="meta">' + time(c.time) + '</div>' + esc(c.text) + '</div>').join("");
  if (!d.events.length) return;
  const worst = d.events.reduce((w, e) => ORDER[e.level] > ORDER[w] ? e.level : w, "green");
  const status = document.getElementById("status");
  status.className = worst; status.textContent = HEAD[worst];
  document.getElementById("list").innerHTML = d.events.slice().reverse().map(e =>
    '<div class="card event ' + e.level + '">' + (e.photo ? '<img src="' + e.photo + '" alt="">' : '') +
    '<div><div class="meta">' + time(e.time) + ' · ' + (LABEL[e.kind] || e.kind) + '</div>' + esc(e.summary) + '</div></div>').join("");
}
refresh(); setInterval(refresh, 2000);
</script>
</body>
</html>`;
