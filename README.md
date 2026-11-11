# Kinly

**The family member who's always home.**

Kinly is a small cat who lives in an older adult's messenger app. It reaches out first, looks at what she shows it (her pills, her breakfast, her walk), remembers what she asks it to, and makes sure the right person in her care circle knows what matters.

**[Watch the 2-minute demo](https://youtu.be/u-40Y5qICx4)**

**[Watch the 2-minute demo better vocie](https://youtu.be/QDlOEjgqIyI)**


Built for a YC hackathon, in answer to the Request for Startups *AI for the Aging Population*.

## The problem

- 43% of Americans 65+ take five or more prescription drugs ([CDC](https://www.cdc.gov/nchs/hus/topics/rx-drug-use.htm)).
- 53 million family members already do this care work unpaid (YC, *AI for the Aging Population*).
- What families say, in their own words ([`idea/PAIN_elder-medication.md`](idea/PAIN_elder-medication.md)): they call every day to ask "did you take your pills?", it is exhausting, and they have no way to know. Several doctors, a daughter in another city, a care manager with forty clients, and nobody holds the whole picture.

Reminders get ignored and cameras get resented. Kinly is neither.

## Company, not surveillance

1. **She decides what to show.** Kinly never watches on its own and never asks for proof.
2. **Nothing behind her back.** Whenever Kinly passes something on, it tells her.
3. **Messages go both ways.** Her family's love and news reach her through Kinly, and hers reach them.

## What works today

| | |
|---|---|
| **Set-up in a minute** (`/start`) | For someone you love, or for yourself. Name, relationship, then a photo of the pharmacy bag, bottle label or prescription: Kinly reads the medicines and when they are taken, and points out a label that disagrees with itself. Add blood sugar or blood pressure checks and things to remember. Everything can be edited later. |
| **Daily missions** | Pills, readings, meals, an activity, one moment for the daily record. Kinly brings each one up at its time, one at a time; she answers with a photo or a short video. She can rearrange her own day by telling Kinly ("I walk at four"). |
| **It sees** | Photos and videos (Gemini watches the video and hears it). Pills are compared with the schedule and with reference photos from an open pill-appearance dataset. |
| **A care circle** | Family and the care team each talk to the same Kinly. Family can ask how she is and get an answer from the day's log; Kinly carries messages both ways. A worrying moment goes to family; an urgent one goes to family and the care team. |
| **Remember this for me** | "Remind me to call Dr. Lee tomorrow at ten." Kinly does. |
| **Her day, live** (`/family`) | Missions, what changed, and a timeline with her photos. |
| **Show Kinly** (`/see`) | She opens the camera herself, holds something up and asks out loud; Kinly answers out loud. |
| **A face** | Eight stickers of Kinly, chosen by Kinly to fit the moment. |

Kinly compares, reminds and connects people. It is meant never to diagnose or change a dose.

## Honest limits

- **Messenger:** it runs on Telegram today. WhatsApp was the plan; the provider's identity review did not clear in time.
- **Naming a loose pill from its looks is unreliable.** Kinly reads labels well; for bare pills it uses shape, size and imprint and says so when it cannot be sure. It will not guess a medicine name.
- **Noticing change over days** (how she walks, how much she eats) is built, but has only been run within a single day.
- **Medical caution needs tightening.** In one test of a low blood sugar reading, Kinly suggested juice before the care team had replied.
- **Not built yet:** phone calls, the smart-glasses version (the clip in the video is a labelled concept), and a way for her to choose what is shared.
- One household per running instance; state is kept in local JSON files. No sign-in.

## Where this goes

The phone camera is a stand-in. The same companion moves into smart glasses, where voice and a first-person view make company feel natural, and it helps the aide and the spouse as well as her.

Each day with Kinly also builds, with her consent, something no clinic has: a first-person record of how one person is aging. That is how one care manager can look after hundreds of people, and how slow changes get noticed long before a yearly appointment would catch them.

Medicare already pays clinics each month to monitor and check in on seniors. Clinics don't have the staff. Kinly does the work.

## Run it

```bash
pnpm install
cp .env.example .env     # TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, GEMINI_MODEL (ANTHROPIC_API_KEY is an optional fallback)
pnpm dev                 # http://localhost:3000/start
```

1. Create a bot with Telegram's @BotFather and put its token in `.env`.
2. Open `/start`, set Kinly up, and send her the first link.
3. `/nudge/hello` or `/nudge/next` makes Kinly reach out now instead of waiting for the clock.

**Try it without Telegram.** Three chats side by side in the browser, with the real model behind them:

```bash
KINLY_DIR=.kinly-demo DEMO_ONLY=1 DEMO_CLOCK=08:05 PORT=3100 pnpm exec tsx src/server.ts
# then open http://localhost:3100/start and http://localhost:3100/demo
node scripts/walkthrough.mjs   # plays the whole scenario and records it
```

## How it's built

| Piece | Where |
|---|---|
| Who Kinly is, and every prompt | [`src/agent.ts`](src/agent.ts) |
| Model access: Gemini, with Claude as fallback; structured output on every turn | [`src/brain.ts`](src/brain.ts) |
| Routing between her, family and care team; the clock | [`src/server.ts`](src/server.ts) |
| Daily missions and streaks | [`src/missions.ts`](src/missions.ts) |
| Profile and memory | [`src/profile.ts`](src/profile.ts) |
| Telegram, including video | [`src/telegram.ts`](src/telegram.ts) |
| Pages: set-up, her day, camera, demo | [`src/onboard.ts`](src/onboard.ts), [`src/family.ts`](src/family.ts), [`src/see.ts`](src/see.ts), [`src/demo.ts`](src/demo.ts) |
| Pill references: Taiwan FDA open pill-appearance data, 6,374 entries with photos | [`med/`](med/), [`src/pills.ts`](src/pills.ts) |
| Kinly's art, drawn in code | [`pet/draw.mjs`](pet/draw.mjs) |

Node, TypeScript, Express. The photos in `demo/props/` are generated props and the label in `demo/sample-label.png` is made up; neither is real patient data.
