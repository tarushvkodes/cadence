/**
 * The narration as recorded, one entry per line of the film. `heard` is the transcript's words in
 * order, used to find the line in the recording; `caption` is what the captions show when it differs
 * (a word the transcriber misheard, or a capital letter for a screen name). `skip` drops a stumble.
 */
export type VoiceLine = {
  readonly id: string;
  readonly heard: string;
  readonly caption?: string;
  readonly skip?: { readonly after: string; readonly drop: string };
};

export const VOICE_LINES: readonly VoiceLine[] = [
  { id: 'title.1', heard: 'This is Cadence.' },
  { id: 'title.2', heard: 'We built it to help you plan your week around how you actually feel.' },
  { id: 'idea.1', heard: "Here's the idea." },
  { id: 'idea.2', heard: "Your phase doesn't change what you're capable of, but how you feel can change, and that's different for everyone." },
  { id: 'idea.3', heard: 'So, Cadence plans around what you log, instead of a guess from the calendar.' },
  { id: 'setup.1', heard: 'Step one is setup.' },
  { id: 'setup.2', heard: 'You tell it when your last period started, how long your cycle usually is, and how regular it is.' },
  { id: 'setup.3', heard: 'Then, it makes four promises.' },
  {
    id: 'setup.4',
    heard: "Your data stays on your computer, the AI is only suggesting it's not medical advice, and the dates are estimates.",
    caption: "Your data stays on your computer, the AI is only suggesting, it's not medical advice, and the dates are estimates.",
  },
  { id: 'setup.5', heard: "So, don't use it for birth control." },
  { id: 'setup.6', heard: "We'll start with the sample week here." },
  { id: 'setup.7', heard: "It's a busy student week with the midterm on Thursday." },
  { id: 'today.1', heard: 'Step two is today.', caption: 'Step two is Today.' },
  { id: 'today.2', heard: 'The dial shows you where you probably are, day 25 of 28.' },
  { id: 'today.3', heard: 'It gives a range instead of a date.' },
  { id: 'today.4', heard: 'Your next period is probably November 18th to the 22nd, and it says how sure it is.' },
  { id: 'today.5', heard: 'On the right is the 10-second check-in.' },
  { id: 'today.6', heard: 'Energy, mood, and anything else you notice.' },
  { id: 'today.7', heard: "That's what our app plans around." },
  { id: 'guide.1', heard: 'Step three is the AI.' },
  { id: 'guide.2', heard: 'We open the guide and ask it, "Plan my week around my cycle."', caption: 'We open the Guide and ask it, "Plan my week around my cycle."' },
  { id: 'guide.3', heard: 'The guide is an agent.', caption: 'The Guide is an agent.' },
  { id: 'guide.4', heard: 'That means the model, instead of just answering in one shot, it decides what it needs, calls tools, reads the results, and it repeats.' },
  { id: 'guide.5', heard: 'And then, finally, it proposes.' },
  { id: 'guide.6', heard: 'Here, it checks your cycle, it reads your calendar, habits, and check-ins, and it drafts changes.' },
  { id: 'guide.7', heard: "A tool checks every draft against your calendar, and when one doesn't fit, the model fixes it." },
  { id: 'guide.8', heard: 'And it ends with five suggestions, each explained with your own check-ins.' },
  { id: 'decide.1', heard: 'Step four, you decide.' },
  { id: 'decide.2', heard: 'Each suggestion shows what changes and why.' },
  { id: 'decide.3', heard: "We approve the ones we like and declines the ones we don't.", caption: "We approve the ones we like and decline the ones we don't." },
  { id: 'decide.4', heard: 'Change your mind?' },
  { id: 'decide.5', heard: 'Undo puts it right back.' },
  { id: 'decide.6', heard: 'On the plan, anything still waiting shows up as a dashed ghost block, and nothing changes until you approve it.', caption: 'On the Plan, anything still waiting shows up as a dashed ghost block, and nothing changes until you approve it.' },
  { id: 'rough.1', heard: 'Step five, a rough morning, Thursday, period, day one, midterm, tonight.', caption: 'Step five, a rough morning. Thursday, period day one, midterm tonight.' },
  { id: 'rough.2', heard: 'We log it in ten seconds.' },
  { id: 'rough.3', heard: 'Low energy, flat mood, cramps.' },
  { id: 'rough.4', heard: 'We ask the guide what to change, and it only touches today, and the midterm stays put.', caption: 'We ask the Guide what to change, and it only touches today, and the midterm stays put.' },
  { id: 'safety.1', heard: 'Step six is knowing its limits.' },
  { id: 'safety.2', heard: 'We say our cramps are bad enough to miss class.' },
  { id: 'safety.3', heard: "It doesn't diagnose, it says clearly this is worth seeing a clinician and when to go to urgent care." },
  { id: 'safety.4', heard: 'And then it offers to turn our check-ins into notes for the appointment.' },
  { id: 'inside.1', heard: 'Step seven, you can see inside.' },
  { id: 'inside.2', heard: 'Our learn page labels every claim by how strong the evidence is with its source.', caption: 'Our Learn page labels every claim by how strong the evidence is, with its source.' },
  { id: 'inside.3', heard: 'And settings shows the exact instructions the AI follows word for word.', caption: 'And Settings shows the exact instructions the AI follows, word for word.' },
  { id: 'end.1', heard: "So in closing, there's three things to remember." },
  { id: 'end.2', heard: 'Cadence points around how you feel, not your face.', caption: 'Cadence plans around how you feel, not your phase.' },
  { id: 'end.3', heard: 'The AI suggests and you decide, and it knows when to send you to a real clinician.' },
  { id: 'end.4', heard: 'Our code is fully open source.' },
  {
    id: 'end.5',
    heard: "And in the rest of our presentation, there's more detail about the different platform, the different resources we're using for our platform.",
    caption: "And in the rest of our presentation, there's more detail about the different resources we're using for our platform.",
    skip: { after: "And in the rest of our presentation, there's more detail about the different", drop: 'platform, the different' },
  },
  { id: 'end.6', heard: 'And you can always check the provenance of our claims.' },
  { id: 'end.7', heard: 'So thank you for listening.' },
  { id: 'end.8', heard: "And that's our solution." },
  { id: 'end.9', heard: 'Cadence.' },
];
