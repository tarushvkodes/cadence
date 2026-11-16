# Cadence: speaking script

Purdue CS 110 AI Solutions Showcase. The talk runs about 18 minutes, including the 4:25 demo film.

The speaker notes in `deck/Cadence-Capstone.pptx` hold the same words as this script. Slide numbers match the deck. Times assume about 140 words a minute, an easy speaking pace.

This file is generated. To change the words in both places at once, edit `deck/slides/` and run `npm run build` in `deck/`.

## Who says what

This split is a suggestion. Swap parts if it suits the team better.

| Part | Slides | Speaker | Target | Script at 140 wpm |
| --- | --- | --- | --- | --- |
| 1. The problem | 1 to 8 | Ingrid | 2:30 | 2:41 |
| 2. The options | 9 to 12 | Paetyn | 2:30 | 1:56 |
| 3. Our solution | 13 to 17 | Vincent | 2:00 | 2:13 |
| 4. The demo | 18 to 26 | Tarushv | 6:00 | 5:55 |
| 5. Ethics | 27 to 33 | Zykira | 2:30 | 2:41 |
| 6. Reflection | 34 to 41 | All five, one slide each | 2:30 | 2:34 |
| Total | 1 to 41 | | 18:00 | 18:00 |

## 1. The problem

Ingrid. Target 2:30. This script runs about 2:41.

### Slide 1. Cadence

**Ingrid:** Hi everyone. We're Ingrid, Paetyn, Tarushv, Vincent, and Zykira, and this is Cadence. It's a week planner with an AI agent inside. It helps you plan your week around how you actually feel across your menstrual cycle. The agent suggests changes to your calendar, but it never makes them by itself. You decide.

### Slide 2. Six parts, about 18 minutes

**Ingrid:** Here's the plan. Six parts, one speaker each, and the demo includes a short film.

### Slide 3. The problem

**Ingrid:** Let's start with the problem we set out to solve.

### Slide 4. The idea we started with

**Ingrid:** This was our project proposal, word for word. Sync your daily habits to the phases of your cycle. It's a popular idea online. Our proposal assumed your phase changes how well you think and perform. So before we built anything, we checked the research.

### Slide 5. What the research says

**Ingrid:** A 2025 meta-analysis of 102 studies, with almost 4,000 people, found no measurable change in thinking, memory, or focus across the cycle. For exercise, any effect is tiny, and planning training by phase isn't backed by evidence.

But how people feel is real. Up to about 75 percent report at least one symptom before their period. And many feel worst during their period, even when their measured performance holds steady.

### Slide 6. So we changed the premise

**Ingrid:** So we changed the premise. Your phase doesn't change what you're capable of. How you feel can change, and that's different for everyone. So Cadence plans around what you log, like energy, mood, and symptoms. Your phase is only a hint about when those feelings might show up.

### Slide 7. Cycles vary more than apps assume

**Ingrid:** There's a second problem. Cycles are less regular than apps assume. Only 13 percent are exactly 28 days. In the first few years after a first period, anything from 21 to 45 days is common, and that matters for our age group. And calendar-only apps get the exact ovulation day right just 8 to 21 percent of the time. So every prediction needs a range.

### Slide 8. Who it's for, and what they need

**Ingrid:** So who is it for? Women aged 17 to 25, mostly students with busy weeks. They've used chatbots, but most don't know how AI systems work. They need six things. A plan built on how they actually feel. Help with their actual schedule. Privacy. Honesty about the science. A way to see what the AI did. And low cost and effort. Paetyn will use those six needs to compare our options.

## 2. The options

Paetyn. Target 2:30. This script runs about 1:56.

### Slide 9. The options

**Paetyn:** Thanks, Ingrid. So, what could actually solve this?

### Slide 10. Four kinds of tools we looked at

**Paetyn:** We looked at four kinds of tools. First, period-tracker apps. They know your cycle, but the tips are generic, and they can't do anything with your schedule. Second, a general chatbot, like ChatGPT or the Claude app. It's flexible, but you have to explain your cycle and paste your schedule each time, and it can't change anything. Third, AI calendar assistants, like Morgen, Motion, and Reclaim. They're great at scheduling, but they know nothing about your cycle or how you feel. Morgen was actually our first idea. And fourth, building our own agent with Claude.

### Slide 11. How the options compare

**Paetyn:** Here's how they compare on the six needs Ingrid listed. This is our own assessment. Trackers know you, but they can't act on your week. Chatbots can talk about anything, but they don't know you, and they can't act either. Calendar assistants can act, but they don't know you. Only a custom agent could do both. It isn't perfect. It takes some setup, and when you ask it something, the data it reads goes to Claude. Zykira will come back to that in the ethics section.

### Slide 12. How we decided

**Paetyn:** Here's how we actually decided. We asked three questions, in order. First, can it act on your weekly schedule? That ruled out trackers and chatbots. Second, does it know your cycle and how you feel? That ruled out calendar assistants, including Morgen. Third, can it stay private, honest, and under your control? Nothing we found did all of that. So we built our own agent, and we made those rules part of the design. Vincent will show you what we built.

## 3. Our solution

Vincent. Target 2:00. This script runs about 2:13.

### Slide 13. Our solution

**Vincent:** Thanks, Paetyn. Here's what we built, and why it fits.

### Slide 14. Meet Cadence

**Vincent:** This is Cadence. The Today screen shows where you probably are in your cycle, as a range, not a single date. Next to it is a ten-second check-in for energy, mood, and symptoms. And there's the Guide, a Claude agent that reads your data and suggests changes to your week. It fits our audience because it plans around how you feel, it works on your real schedule, and you approve every change.

### Slide 15. An agent uses tools, in a loop

**Vincent:** Here's the idea we had to learn ourselves. A chatbot just answers. An agent can use tools. Claude can't run code on its own, so when it needs your calendar, it asks for a tool by name. Our code runs the tool and hands back the result. Claude reads it and decides what's next, maybe another tool. That repeats until it has enough. Then it drafts suggestions, and you decide. Cadence gives it six tools. Four only read, and two only draft suggestions.

### Slide 16. Nothing changes until you approve

**Vincent:** This is the rule we cared about most. Nothing changes until you approve it. Each suggestion shows a before and after, and a reason from your own logs. You approve or decline it, and you can undo it later. This isn't just in the prompt. It's in the code. The agent can't write to your data, fixed events like exams can't move, and our recording script checks these rules every run.

### Slide 17. What we built it with

**Vincent:** Here's what we built it with. The model is Claude Opus 5.5. The Claude Agent SDK runs the agent loop. It's the loop from Claude Code, packaged as a library. We wrote six custom tools. The app is React and Vite, and we made the demo film in code with Remotion. To be upfront, we also used Claude Code to help us write and test the app. Tarushv will show you how it works.

## 4. The demo

Tarushv. Target 6:00. This script runs about 5:55.

> Steps 1 to 6 repeat what the film shows, so they are a reference people can follow later. If the recording runs long, leave each of those slides up for a few seconds without narrating it.

### Slide 18. The demo

**Tarushv:** Thanks, Vincent. Now let's see it work, step by step.

### Slide 19. Watch it work

**Tarushv:** Here's the whole flow on a sample week, with a midterm on Thursday and a lab report due Friday. Watch the tool steps, and watch the approve buttons. Nothing changes until you tap one.

> **Film plays here, 4:25.** Film narration: see `video/NARRATION.md`.

That's the whole flow. Here are the same steps as slides, so you can try it yourself.

### Slide 20. Set up

**Tarushv:** Step one. Enter your cycle basics, read the four promises, and pick the sample week.

### Slide 21. Check in

**Tarushv:** Step two. Each day, do the ten-second check-in on Today.

### Slide 22. Ask the Guide

**Tarushv:** Step three. Open the Guide, ask it to plan your week, and watch the tools it calls.

### Slide 23. Approve or decline

**Tarushv:** Step four. Approve what you like and decline the rest. Anything still waiting shows as a dashed block on your Plan.

### Slide 24. A rough morning

**Tarushv:** Step five. On a rough day, log how you feel and ask what to change. It only touches today.

### Slide 25. When to see someone

**Tarushv:** Step six. Describe a red-flag symptom, and it tells you plainly to see a clinician. It can help you prepare for the appointment.

### Slide 26. Run it yourself

**Tarushv:** Step seven. To run it yourself, you need Node and a Claude Code login. Clone the repo, run npm install, then npm run dev. To just watch our recorded demo, add the demo setting on screen to the address. Next, Zykira covers the ethics.

## 5. Ethics

Zykira. Target 2:30. This script runs about 2:41.

### Slide 27. Ethics

**Zykira:** Thanks, Tarushv. An app like this can do real harm if it's built carelessly. Here's what we worried about, and what we did.

### Slide 28. Bias: the stereotype was in our own proposal

**Zykira:** The biggest risk was bias, and it started with us. Our proposal assumed your phase changes how well you think. That idea feeds a stereotype about women, and the research doesn't back it. So we wrote the opposite into the agent's instructions. It must never say or imply that a phase lowers ability, focus, or judgment. A lighter day has to be about how you feel.

### Slide 29. Privacy: this is health data

**Zykira:** Next, privacy, because cycle data is health data. In 2021, the period tracker Flo settled with the FTC over sharing users' health data with companies like Facebook and Google, after promising privacy. So Cadence has no account and no server, and your data stays in your browser. One honest exception. When you ask the Guide something, the data it reads goes to Claude so it can answer.

### Slide 30. Medical safety: a planner, not a doctor

**Zykira:** Third, medical safety. Cadence is a planner, not a doctor. It won't diagnose or give medication advice. But some symptoms deserve a clinician, like pain that makes you miss class, very heavy periods, or severe mood changes. When someone describes one, the agent says so first, plainly and kindly. It points urgent signs to urgent care, and self-harm to the 988 crisis line.

### Slide 31. Estimates, not facts

**Zykira:** Fourth, predictions are estimates. Cadence never shows a single date. It shows a range and how confident it is, and the range widens when your history is short or irregular. And these dates are never for birth control or for planning a pregnancy.

### Slide 32. Who it can leave out

**Zykira:** Fifth, who it can leave out. Our estimates assume a natural cycle, and not everyone has one. People with irregular cycles, hormonal birth control, or conditions like PCOS may get hints that don't fit. And not everyone who has a period identifies as a woman, so our wording can shut people out. Finally, AI can be wrong. It can sound sure and still be mistaken.

### Slide 33. You stay in control, and you can see inside

**Zykira:** Last, control and transparency. You approve every change and can undo it. And you can see inside. Settings shows the agent's full instructions, word for word. The chat shows each tool it calls. And the Learn screen labels every claim as well supported, mixed, or weak, with its source.

## 6. Reflection

All five of us. Target 2:30. This script runs about 2:34.

> Draft. These are first drafts in our voice, built from what really happened on this project. Each speaker should put their part in their own words before we record.

### Slide 34. Reflection

**Vincent:** To wrap up, each of us will share one thing we learned.

### Slide 35. What we learned about AI by teaching it

> Draft. Put this in your own words.

**Vincent:** To explain Cadence, we first had to explain what an agent is. And we found out we didn't fully get it ourselves. We thought the AI did everything. It doesn't. The model reads text and asks for tools. Our code runs the tools, checks every draft, and applies only what you approve. Most of the work was the code around the model.

### Slide 36. How our understanding changed

> Draft. Put this in your own words.

**Paetyn:** Our understanding of the topic flipped. We started out believing in cycle syncing. It was in our proposal. Then the research pointed the other way, and we had to rebuild our premise halfway through. That was uncomfortable. But it made the project better. Now the app is honest about what's known, and it doesn't repeat a stereotype.

### Slide 37. Harder to explain than we expected

> Draft. Put this in your own words.

**Tarushv:** Two things were harder to explain than we expected. First, why the same question gets a different answer each time. The model writes a new answer every time instead of looking one up. That's why we recorded real sessions to replay in the demo. Second, deciding what the AI should not do took longer than deciding what it should do. Most of the design turned out to be limits.

### Slide 38. How we'd extend it

> Draft. Put this in your own words.

**Zykira:** With more time, we'd connect real calendars, like Google Calendar and Outlook. We'd try a private model that runs on your own device, so your data never leaves it. We'd have clinicians review the health content. We'd add data from wearables, like sleep, for people who opt in. And most of all, we'd run a study with real users to see if it actually helps.

### Slide 39. Three takeaways

**Ingrid:** If you remember three things, make it these. One, your phase doesn't change what you're capable of, so plan around how you feel. Two, an agent is a model that uses tools in a loop. That's what lets it work on your real week. Three, good AI suggests, and you decide. That matters most with something as personal as your health.

### Slide 40. Thank you

**Ingrid:** Thanks for watching. The code is on GitHub at the link on screen. We're happy to take any questions.

### Slide 41. Sources

**Ingrid:** No narration needed. Leave this slide up during questions. The full list is in docs/REFERENCES.md.
