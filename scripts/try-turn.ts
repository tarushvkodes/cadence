import { DEFAULT_MODEL, type AgentSnapshot, type ModelId } from '../src/domain/agent.ts';
import { demoSeed, isDemoFlow } from '../src/domain/sample.ts';
import { runTurn } from '../bridge/agent.ts';

const flow = process.argv[2] ?? 'plan-week';
if (!isDemoFlow(flow)) throw new Error(`Unknown flow ${flow}`);
const seed = demoSeed(flow);
const snapshot: AgentSnapshot = {
  today: seed.today,
  profile: seed.data.profile,
  events: seed.data.events,
  habits: seed.data.habits,
  checkIns: Object.values(seed.data.checkIns),
};
const message = process.argv[3] ?? seed.prompts[0]!;
const model = (process.argv[4] ?? DEFAULT_MODEL) as ModelId;
const t0 = Date.now();
let text = '';
for await (const event of runTurn({ model, message, history: [], snapshot }, new AbortController().signal)) {
  const t = ((Date.now() - t0) / 1000).toFixed(1);
  if (event.type === 'text_delta') text += event.text;
  else if (event.type === 'proposal_created') {
    console.log(`${t}s proposal: ${event.proposal.title} | ${event.proposal.rationale}`);
    for (const item of event.proposal.items) console.log(`   - ${JSON.stringify(item.change).slice(0, 160)}\n     reason: ${item.reason}`);
  } else console.log(`${t}s ${JSON.stringify(event)}`);
}
console.log('\n--- text ---\n' + text);
