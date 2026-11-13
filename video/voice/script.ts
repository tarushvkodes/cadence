/**
 * The film's narration, one entry per line of the settled script (.audit/script-council/final.md),
 * in order. `say` is spoken exactly as written; `caption` is what the captions show, with numbers and
 * dates in their written forms. `phrasing`, when present, is the same words with punctuation that
 * paces the voice model (the build refuses one whose words differ). `n` is the line's number in the script. Everything about the voice
 * (the takes, their timings, the captions, NARRATION.md) derives from this file.
 */
export type ScriptLine = { readonly id: string; readonly n: number; readonly say: string; readonly caption?: string; readonly phrasing?: string };

export const SCRIPT: readonly ScriptLine[] = [
  { id: 'title.1', n: 1, say: 'This is Cadence.' },
  { id: 'title.2', n: 2, say: 'We built it to help you plan your week around how you actually feel.' },
  { id: 'title.3', n: 3, say: "It's for women around seventeen to twenty-five, and it runs in the browser.", caption: "It's for women around 17 to 25, and it runs in the browser." },

  { id: 'idea.1', n: 4, say: 'When we started, we assumed the cycle changes how well people think.' },
  { id: 'idea.2', n: 5, say: "Then we read the research, and it doesn't back that up." },
  { id: 'idea.3', n: 6, say: 'A review of a hundred and two studies found no robust change in cognitive performance across the cycle.', caption: 'A review of 102 studies found no robust change in cognitive performance across the cycle.' },
  { id: 'idea.4', n: 7, say: 'What can change is how you feel, and that differs from person to person.' },
  { id: 'idea.5', n: 8, say: 'So Cadence plans around what you log, and treats your phase as a hint.' },

  { id: 'setup.1', n: 9, say: 'Step one is setup.', caption: 'Step 1 is setup.' },
  { id: 'setup.2', n: 10, say: 'You tell it when your last period started, how long your cycle usually is, and how regular it is.' },
  { id: 'setup.3', n: 11, say: 'Then it makes four promises.' },
  { id: 'setup.4', n: 12, say: "Your data stays on your computer, the AI only suggests, and it's not medical advice." },
  { id: 'setup.5', n: 13, say: "And the dates are estimates, so don't use them for birth control." },
  { id: 'setup.6', n: 14, say: 'Then we tap Start with a sample week, which is a busy student week with a midterm on Thursday.' },

  { id: 'today.1', n: 15, say: 'Step two is reading your day, on the Today screen.', caption: 'Step 2 is reading your day, on the Today screen.' },
  { id: 'today.2', n: 16, say: 'The dial says day twenty-five of about twenty-eight.', caption: 'The dial says day 25 of about 28.' },
  { id: 'today.3', n: 17, say: 'Your next period is probably November eighteenth to the twenty-second.', caption: 'Your next period is probably Nov 18 to 22.' },
  { id: 'today.4', n: 18, say: 'It gives you a range instead of a date, because only thirteen percent of cycles are exactly twenty-eight days.', caption: 'It gives you a range instead of a date, because only 13% of cycles are exactly 28 days.' },
  { id: 'today.5', n: 19, say: 'It also says how sure it is, and you can tap that to see why.' },
  { id: 'today.6', n: 20, say: 'Below that is the ten-second check-in, for energy, mood, and symptoms.', caption: 'Below that is the 10-second check-in, for energy, mood, and symptoms.' },
  { id: 'today.7', n: 21, say: "That's what our app plans around." },

  { id: 'guide.1', n: 22, say: 'Step three is asking the Guide.', caption: 'Step 3 is asking the Guide.' },
  { id: 'guide.2', n: 23, say: 'We tap Plan my week around my cycle.', caption: 'We tap "Plan my week around my cycle."' },
  { id: 'guide.3', n: 24, say: 'The Guide is an agent that runs on Claude, which is a large language model.' },
  { id: 'guide.4', n: 25, say: 'A plain chatbot only sees what you type into it.' },
  { id: 'guide.5', n: 26, say: 'An agent also has tools.' },
  { id: 'guide.6', n: 27, say: 'A tool is basically a small piece of code we wrote that the model can use.' },
  { id: 'guide.7', n: 28, say: 'For instance, one of them reads your calendar.' },
  { id: 'guide.8', n: 29, say: 'So the agent decides what it needs, calls a tool, reads the result, and repeats until it can propose changes.' },
  { id: 'guide.9', n: 30, say: 'Here it uses four tools. It checks your cycle, it reads your calendar, your habits, and your check-ins.' },
  { id: 'guide.10', n: 31, say: 'All of that goes to Claude only when you ask it something.' },
  { id: 'guide.11', n: 32, say: "Then it drafts changes, and a tool catches two that don't fit your calendar, so the model fixes them." },
  { id: 'guide.12', n: 33, say: 'And it ends with five suggestions, each one explained with your own check-ins.' },
  { id: 'guide.13', n: 34, say: "For instance, it lightens Wednesday's hard workout, because that's probably around day twenty-seven, when you've logged low energy and headaches.", caption: "For instance, it lightens Wednesday's hard workout, because that's probably around day 27, when you've logged low energy and headaches." },

  { id: 'decide.1', n: 35, say: 'Step four is where you decide.', caption: 'Step 4 is where you decide.' },
  { id: 'decide.2', n: 36, say: 'Each suggestion shows what changes and why.' },
  { id: 'decide.3', n: 37, say: 'We approve two, decline one, and then undo one of the approvals.' },
  { id: 'decide.4', n: 38, say: 'On the Plan, anything still waiting shows up as a dashed block.' },
  { id: 'decide.5', n: 39, say: "Classes, exams, and shifts are locked, so the Guide can't move them." },
  { id: 'decide.6', n: 40, say: "And the AI can't change your calendar on its own, so nothing changes until you approve it." },

  { id: 'rough.1', n: 41, say: 'Step five is a rough morning.', caption: 'Step 5 is a rough morning.' },
  { id: 'rough.2', n: 42, say: "It's Thursday, day one of your period, and your midterm is tonight.", caption: "It's Thursday, day 1 of your period, and your midterm is tonight." },
  { id: 'rough.3', n: 43, say: 'You log it in ten seconds, low energy, flat mood, cramps.', caption: 'You log it in 10 seconds: low energy, flat mood, cramps.' },
  { id: 'rough.4', n: 44, say: 'Then you ask the Guide what to change.' },
  { id: 'rough.5', n: 45, say: 'It only touches today, with three small changes, and the midterm stays put.' },

  { id: 'safety.1', n: 46, say: 'Step six is knowing its limits.', caption: 'Step 6 is knowing its limits.' },
  { id: 'safety.2', n: 47, say: 'You tell it your cramps are bad enough to miss class.', phrasing: 'You tell it, your cramps are bad enough to miss class.' },
  { id: 'safety.3', n: 48, say: "It doesn't diagnose, because it's not a doctor." },
  { id: 'safety.4', n: 49, say: 'It tells you to get this checked by a doctor, and it explains when to go to urgent care.' },
  { id: 'safety.5', n: 50, say: 'Then it offers to turn your check-ins into notes for the appointment, and it does.' },

  { id: 'inside.1', n: 51, say: 'Step seven is seeing inside.', caption: 'Step 7 is seeing inside.' },
  { id: 'inside.2', n: 52, say: 'Our Learn page labels every claim as well supported, mixed, or weak, with its source.' },
  { id: 'inside.3', n: 53, say: 'And Settings shows the instructions the AI follows, word for word.' },

  { id: 'end.1', n: 54, say: "So there's three things to remember." },
  { id: 'end.2', n: 55, say: 'Cadence plans around how you feel, instead of your phase.' },
  { id: 'end.3', n: 56, say: 'The AI suggests, and you decide.' },
  { id: 'end.4', n: 57, say: 'And it knows when to send you to a real clinician.' },
  { id: 'end.5', n: 58, say: 'Our code is on GitHub, at the link on screen.' },
  { id: 'end.6', n: 59, say: "Next, we'll get into the ethics behind it." },
];

/**
 * How a word is spelled for the voice model when its own spelling is misread. The words heard back
 * are still checked against `say`, so a respelling only passes if the right word comes out.
 */
export const RESPELL: Readonly<Record<string, string>> = { Claude: 'Clawd' };

export const ttsText = (l: ScriptLine) => Object.entries(RESPELL).reduce((t, [w, r]) => t.replace(new RegExp(`\\b${w}\\b`, 'g'), r), l.phrasing ?? l.say);
