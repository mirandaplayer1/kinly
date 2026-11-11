# Kinly

**The family member who's always home.**

Kinly is an AI companion for an older adult living alone, and the one member of her care circle who is always around. She talks to it in WhatsApp, or opens the camera and shows it things. Her daughter and her care team message the same Kinly. Kinly keeps one picture of her day and makes sure the right person knows what matters.

## The problem

- 43% of Americans 65+ take five or more prescription drugs ([CDC](https://www.cdc.gov/nchs/hus/topics/rx-drug-use.htm)).
- 53 million family members already do this care work unpaid (YC, *AI for the Aging Population*).
- In the words of the families we read ([`idea/PAIN_elder-medication.md`](idea/PAIN_elder-medication.md)): they call every day to check, it is exhausting, and it is unreliable. Several doctors, a daughter in another city, a care manager with forty clients, and nobody holds the whole picture.

Today's answers are reminders that nag and cameras that watch. One is ignored, the other is resented.

## Company, not surveillance

Three rules shape the product:

1. **She opens the camera.** Like video-calling a grandchild: "Kinly, is this the right one?" Kinly never watches on its own.
2. **Nothing behind her back.** Whenever Kinly passes something on, it tells her.
3. **Messages go both ways.** Her family's love and news reach her through Kinly, and hers reach them.

## What it does today

| Who | With Kinly |
|---|---|
| **Mom** | Kinly says good morning first. She sends a photo or opens **Show Kinly** (`/see`), holds up a bottle and asks out loud; Kinly answers out loud. Pills, meters, meals, a drawing, or just a chat. |
| **Daughter** | Texts Kinly "how's Mom today?" and gets a real answer from the day's log. Sends love or a question; Kinly carries it to Mom and brings the answer back. |
| **Care team** | Hears only what needs a professional: a red reading, a dose question. Can send a change; Kinly explains it to her. |
| **Everyone** | A red moment: Kinly phones her, talks with her, and tells family and care team how she sounded. One live page of her day at `/family`. |

Kinly compares, reminds and connects people. It never diagnoses and never changes a dose.

## Where this goes

The phone camera is a stand-in. The same companion moves into smart glasses and sees what she sees, and it helps the aide and the spouse as well as her.

Every day with Kinly also builds something no clinic has: a first-person record of how one person is aging, shared with her consent. That is how one care manager looks after hundreds of people, and how slow changes get noticed years before a yearly appointment would catch them.

Medicare already pays clinics each month to monitor and check in on seniors. Clinics don't have the staff. Kinly does the work.

## Run it

```bash
pnpm install
cp .env.example .env      # fill in your Anthropic and Twilio values
pnpm dev                  # http://localhost:3000
ngrok http 3000           # paste <ngrok-url>/whatsapp into the Twilio WhatsApp sandbox; set PUBLIC_URL
```

- `/see`: Show Kinly (open on her phone)
- `/family`: her day, live
- `/hello`: Kinly sends her the first message
- One phone can play every part: start a message with `family:` or `care:`.

## How it's built

| Piece | Choice |
|---|---|
| Channels | WhatsApp and voice calls via Twilio; a camera page in the phone browser |
| Brain | Claude, structured output per turn: reply, log line, level, who to tell ([`src/agent.ts`](src/agent.ts)) |
| Pill references | Taiwan FDA open pill-appearance data, 6,374 pills with photos ([`med/`](med/)) |
| Server | Node, TypeScript, Express ([`src/server.ts`](src/server.ts)) |

Built for a YC hackathon.
