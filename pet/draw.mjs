// Draws Kinly in four moods as SVG. Run: node pet/draw.mjs && for m in happy cozy missing_you worried; do rsvg-convert -w 640 pet/$m.svg -o pet/$m.png; done
import { writeFileSync } from "node:fs";

const INK = "#3b2f2a", FUR = "#fbf3e4", SHADE = "#f1e3cb", PATCH = "#f2a65a", PINK = "#f4a9a0", SCARF = "#e0a526", BG = "#faf7f2";

const faces = {
  happy: `
    <path d="M196 262 q22 -26 44 0" /><path d="M280 262 q22 -26 44 0" />
    <path d="M238 300 q22 26 44 0" fill="${PINK}" />`,
  cozy: `
    <ellipse cx="218" cy="258" rx="13" ry="16" fill="${INK}" stroke="none"/><ellipse cx="302" cy="258" rx="13" ry="16" fill="${INK}" stroke="none"/>
    <circle cx="223" cy="252" r="4.5" fill="#fff" stroke="none"/><circle cx="307" cy="252" r="4.5" fill="#fff" stroke="none"/>
    <path d="M244 300 q8 10 16 0 q8 10 16 0" />`,
  missing_you: `
    <ellipse cx="218" cy="260" rx="13" ry="15" fill="${INK}" stroke="none"/><ellipse cx="302" cy="260" rx="13" ry="15" fill="${INK}" stroke="none"/>
    <circle cx="224" cy="252" r="5" fill="#fff" stroke="none"/><circle cx="308" cy="252" r="5" fill="#fff" stroke="none"/>
    <path d="M198 234 q18 -8 34 2" /><path d="M322 234 q-18 -8 -34 2" />
    <path d="M248 304 q12 -8 24 0" />`,
  worried: `
    <ellipse cx="218" cy="260" rx="15" ry="18" fill="${INK}" stroke="none"/><ellipse cx="302" cy="260" rx="15" ry="18" fill="${INK}" stroke="none"/>
    <circle cx="223" cy="253" r="5.5" fill="#fff" stroke="none"/><circle cx="307" cy="253" r="5.5" fill="#fff" stroke="none"/>
    <path d="M196 228 q20 -14 38 -2" /><path d="M324 228 q-20 -14 -38 -2" />
    <ellipse cx="260" cy="306" rx="9" ry="7" fill="${INK}" stroke="none"/>`,
};

const extras = {
  happy: `
    <g fill="${SCARF}" stroke="none">
      <path d="M96 150 l6 16 16 6 -16 6 -6 16 -6 -16 -16 -6 16 -6z"/>
      <path d="M424 120 l5 13 13 5 -13 5 -5 13 -5 -13 -13 -5 13 -5z"/>
      <path d="M438 250 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z"/>
    </g>`,
  cozy: `
    <g>
      <path d="M392 392 h64 v34 q0 22 -22 22 h-20 q-22 0 -22 -22z" fill="#fff"/>
      <path d="M456 402 q24 0 24 16 q0 16 -24 14" fill="none"/>
      <path d="M410 372 q-8 -12 0 -22 M430 372 q-8 -12 0 -22" fill="none" stroke-width="5" opacity=".5"/>
    </g>`,
  missing_you: `
    <path d="M410 150 c-14 -22 -46 -6 -34 20 c8 16 34 30 34 30 s26 -14 34 -30 c12 -26 -20 -42 -34 -20z" fill="${PINK}" stroke="none"/>`,
  worried: `
    <path d="M412 196 q14 22 0 34 q-14 -12 0 -34z" fill="#9cc9e8" stroke="none"/>`,
};

const tails = {
  happy: `<path d="M352 420 q70 -10 60 -90" fill="none" stroke-width="26" stroke="${FUR}"/><path d="M352 420 q70 -10 60 -90" fill="none"/>`,
  cozy: `<path d="M340 440 q70 20 80 -30" fill="none"/>`,
  missing_you: `<path d="M340 444 q60 20 86 -6" fill="none"/>`,
  worried: `<path d="M340 440 q70 10 70 -40" fill="none"/>`,
};

for (const mood of Object.keys(faces)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 520">
  <rect width="520" height="520" fill="${BG}"/>
  <ellipse cx="260" cy="468" rx="130" ry="16" fill="#eadfce"/>
  <g stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="${FUR}">
    ${tails[mood]}
    <path d="M176 470 q-24 -120 84 -120 q108 0 84 120z"/>
    <path d="M150 190 l8 -92 76 54z"/>
    <path d="M370 190 l-8 -92 -76 54z" fill="${PATCH}"/>
    <path d="M168 164 l4 -42 36 26z" fill="${PINK}" stroke="none"/>
    <path d="M352 164 l-4 -42 -36 26z" fill="${PINK}" stroke="none" opacity=".8"/>
    <ellipse cx="260" cy="258" rx="132" ry="112"/>
    <path d="M300 152 q64 6 86 70 q-52 -6 -86 -70z" fill="${PATCH}" stroke="none"/>
    <ellipse cx="260" cy="258" rx="132" ry="112" fill="none"/>
    <path d="M254 284 l6 7 6 -7z" fill="${PINK}"/>
    <g fill="none">${faces[mood]}</g>
    <g stroke-width="4" opacity=".55" fill="none">
      <path d="M150 276 h-40 M152 294 l-38 10"/><path d="M370 276 h40 M368 294 l38 10"/>
    </g>
    <ellipse cx="180" cy="296" rx="18" ry="11" fill="${PINK}" stroke="none" opacity=".55"/>
    <ellipse cx="340" cy="296" rx="18" ry="11" fill="${PINK}" stroke="none" opacity=".55"/>
    <path d="M172 352 q88 44 176 0 q10 22 -8 34 q-80 34 -160 0 q-18 -12 -8 -34z" fill="${SCARF}"/>
    <path d="M300 384 q22 30 8 62 l-34 -8 q10 -24 -4 -46z" fill="${SCARF}"/>
    <ellipse cx="214" cy="462" rx="28" ry="16"/><ellipse cx="306" cy="462" rx="28" ry="16"/>
    ${extras[mood]}
  </g>
</svg>`;
  writeFileSync(new URL(`./${mood}.svg`, import.meta.url), svg);
}
console.log("drew", Object.keys(faces).join(", "));
