// The family's view: one live page with today's timeline.
export const FAMILY_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kinly · Mom's day</title>
<style>
  :root { --bg:#faf7f2; --card:#fff; --ink:#1f2421; --muted:#6b736e; --line:#e7e1d6;
          --green:#2f7d5b; --yellow:#b7791f; --red:#c0392b; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
         font: 17px/1.45 -apple-system, "SF Pro Text", "Segoe UI", sans-serif; }
  main { max-width: 620px; margin: 0 auto; padding: 28px 16px 60px; }
  header { display:flex; align-items:baseline; justify-content:space-between; margin-bottom: 6px; }
  h1 { font-size: 28px; margin:0; letter-spacing:-0.02em; }
  .brand { color:var(--muted); font-weight:600; }
  #status { font-size: 20px; font-weight:600; margin: 14px 0 22px; padding: 16px 18px;
            border-radius: 14px; background: var(--card); border:1px solid var(--line); }
  #status.green { color: var(--green); } #status.yellow { color: var(--yellow); } #status.red { color: var(--red); }
  .event { display:flex; gap:14px; background:var(--card); border:1px solid var(--line);
           border-left: 5px solid var(--green); border-radius: 14px; padding: 14px 16px; margin-bottom: 12px; }
  .event.yellow { border-left-color: var(--yellow); } .event.red { border-left-color: var(--red); }
  .event img { width: 76px; height: 76px; object-fit: cover; border-radius: 10px; flex: none; }
  .meta { color: var(--muted); font-size: 14px; margin-bottom: 2px; text-transform: capitalize; }
  .empty { color: var(--muted); text-align:center; padding: 40px 0; }
</style>
</head>
<body>
<main>
  <header><h1>Mom's day</h1><span class="brand">Kinly</span></header>
  <div id="status" class="green">Waiting for Mom's first check-in…</div>
  <div id="list"><p class="empty">Nothing yet today.</p></div>
</main>
<script>
const LABEL = { pills: "Pills", glucose: "Blood sugar", blood_pressure: "Blood pressure", meal: "Meal", clock: "Brain-health check-in", chat: "Chat with Kinly", call: "Kinly called her", family: "From family", care: "From care team" };
const HEAD = { green: "All good today", yellow: "Worth a call today", red: "Check on Mom now" };
const ORDER = { green: 0, yellow: 1, red: 2 };
function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
async function refresh() {
  const events = await (await fetch("/api/events")).json();
  if (!events.length) return;
  const worst = events.reduce((w, e) => ORDER[e.level] > ORDER[w] ? e.level : w, "green");
  const status = document.getElementById("status");
  status.className = worst; status.textContent = HEAD[worst];
  document.getElementById("list").innerHTML = events.slice().reverse().map(e => {
    const t = new Date(e.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return '<div class="event ' + e.level + '">' + (e.photo ? '<img src="' + e.photo + '" alt="">' : '') +
      '<div><div class="meta">' + t + ' · ' + LABEL[e.kind] + '</div>' + esc(e.summary) + '</div></div>';
  }).join("");
}
refresh(); setInterval(refresh, 2000);
</script>
</body>
</html>`;
