import { problem } from './problem.mjs';
import { options } from './options.mjs';
import { solution } from './solution.mjs';
import { demo } from './demo.mjs';
import { ethics } from './ethics.mjs';
import { reflection } from './reflection.mjs';

export const SECTIONS = [problem, options, solution, demo, ethics, reflection].map((section, i) => ({ ...section, n: i + 1 }));
