# Kinly

**The daily "did you take your pills?" call, made by an AI that can actually see the pills.**

Every day, millions of adult children phone a parent who lives alone and ask one question. The parent says yes. Nobody knows if it's true.

Kinly is a care companion that lives in WhatsApp. Mom sends a photo of the pills in her hand, her glucose meter, her breakfast. Kinly looks, answers her like a person would, and keeps the family in the loop. When something is off, it brings in a human within seconds.

## Why this is a real problem

- 43% of Americans 65+ take five or more prescription drugs ([CDC](https://www.cdc.gov/nchs/hus/topics/rx-drug-use.htm)).
- 53 million family members already do this care work unpaid (YC, *AI for the Aging Population*).
- What families told us, in their own words: they call every day to check, it is exhausting, and it is unreliable. See [`idea/PAIN_elder-medication.md`](idea/PAIN_elder-medication.md).

A pill reminder knows the time. It doesn't know she skipped breakfast, that her sugar was low an hour ago, or that the pill in her hand is the wrong one. Harm happens in the combination, and only something that sees the whole day can catch it.

## What it does today

1. **Sees the pills.** Compares her photo with the schedule and with reference images of each pill (shape, color, imprint).
2. **Reads the meters.** Blood sugar and blood pressure, straight from a photo. No Bluetooth, no new device.
3. **Remembers the day.** Meals, readings and doses are judged together, as one picture.
4. **Brings in humans.** Green: Kinly handles it. Yellow: the family gets a heads-up. Red: someone is told to check on her now.
5. **Family page.** One live timeline of Mom's day, with her photos, at `/family`.

Kinly compares, reminds and escalates. It never diagnoses and never changes a dose.

## Where this goes

The photo is the first sensor. Next is a phone call for elders who don't text, then first-person video from smart glasses: "is this the right one?" answered while the pill is still in her hand.

Every check-in also builds something no clinic has: a daily, first-person record of how one person is aging. That record is what lets one care manager look after hundreds of people, and what lets Kinly notice the slow changes a yearly appointment misses.

Medicare already pays clinics each month to monitor and check in on seniors. Clinics don't have the staff. Kinly does the work.

## Run it

```bash
pnpm install
cp .env.example .env      # fill in your Anthropic and Twilio values
pnpm dev                  # http://localhost:3000/family
ngrok http 3000           # paste <ngrok-url>/whatsapp into the Twilio WhatsApp sandbox
```

## How it's built

| Piece | Choice |
|---|---|
| Channel | WhatsApp via Twilio |
| Brain | Claude, one call per message with structured output: reply, family log line, level |
| Pill references | Taiwan FDA open pill-appearance data, 6,374 pills with photos ([`med/`](med/)) |
| Server | Node, TypeScript, Express ([`src/`](src/)) |

Built in a day for a YC hackathon.
