# References

These are the sources the deck and the script cite. Every one comes from our verified source list, where a team member opened each source and checked the claim against it.

## Menstrual cycle research

1. Jang, D., Zhang, J., and Elfenbein, H. A. (2025). Menstrual cycle effects on cognitive performance: A meta-analysis. *PLOS ONE, 20(3), e0318576.* <https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0318576>
   What we used it for: 102 studies and 3,943 people. No robust change in cognitive performance (speed or accuracy) across cycle phases.
1. Ronca et al. (2024). *Neuropsychologia, 206, 108909.* Named in our verified source list without an opened link, so we cite it by name only.
   What we used it for: People reported feeling worst during menstruation while their measured performance did not get worse.
1. Colenso-Semple, L. M., D'Souza, A. C., Elliott-Sale, K. J., and Phillips, S. M. (2023). Current evidence shows no influence of women's menstrual cycle phase on acute strength performance or adaptations to resistance exercise training. *Frontiers in Sports and Active Living, 5, 1054542.* <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10076834/>
   What we used it for: Prescribing resistance training by cycle phase is not an evidence-based approach.
1. McNulty, K. L., Elliott-Sale, K. J., Dolan, E., Swinton, P. A., Ansdell, P., Goodall, S., Thomas, K., and Hicks, K. M. (2020). The Effects of Menstrual Cycle Phase on Exercise Performance in Eumenorrheic Women: A Systematic Review and Meta-Analysis. *Sports Medicine, 50(10), 1813-1827.* <https://link.springer.com/article/10.1007/s40279-020-01319-3>
   What we used it for: Exercise performance may be trivially lower in the early follicular phase. Evidence quality was low, so the authors recommend a personal approach.
1. Liguori, F., Saraiello, E., and Calella, P. (2023). Premenstrual Syndrome and Premenstrual Dysphoric Disorder's Impact on Quality of Life, and the Role of Physical Activity. *Medicina, 59(11), 2044.* <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10673441/>
   What we used it for: Up to 75% of premenopausal women report at least one premenstrual symptom. PMDD affects about 3 to 8% in surveys.
1. Bull, J. R., Rowland, S. P., Berglund Scherwitzl, E., Scherwitzl, R., Gemzell Danielsson, K., and Harper, J. (2019). Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles. *npj Digital Medicine, 2, 83.* <https://www.nature.com/articles/s41746-019-0152-7>
   What we used it for: Only 13% of cycles were exactly 28 days long.
1. American College of Obstetricians and Gynecologists, Committee on Adolescent Health Care (2015, reaffirmed 2021). Menstruation in Girls and Adolescents: Using the Menstrual Cycle as a Vital Sign (Committee Opinion No. 651). *ACOG clinical guidance.* <https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign>
   What we used it for: In the first years after a first period, 90% of cycles fall between 21 and 45 days. The adult range is 21 to 35 days.
1. Worsfold, L., Marriott, L., Johnson, S., and Harper, J. C. (2021). Period tracker applications: What menstrual cycle information are they giving women?. *Women's Health, 17, 17455065211049905.* <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8504278/>
   What we used it for: Only 8% of ovulation-day predictions were exactly right. 67% were 2 to 9 days early.
1. Johnson et al. (2018). *Current Medical Research and Opinion, 34(9), 1587-1594.* Named in our verified source list without an opened link, so we cite it by name only.
   What we used it for: Calendar-based ovulation predictions were right no more than 21% of the time.

## Privacy

1. Lomas, N. (2021). Flo gets FTC slap for sharing user data when it promised privacy. *TechCrunch, January 13, 2021 (FTC Matter No. 192 3133).* <https://techcrunch.com/2021/01/13/flo-gets-ftc-slap-for-sharing-user-data-when-it-promised-privacy/>
   What we used it for: Flo settled FTC charges that it shared users' health data with Facebook, Google, and others after promising to keep it private.

## How the AI works

1. Anthropic (n.d., accessed November 13, 2026). Tool use with Claude. *Claude documentation.* <https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview>
   What we used it for: Claude decides when to call a tool from the request and the tool description, and returns a structured call that the application runs.
1. Anthropic (n.d., accessed November 13, 2026). How tool use works. *Claude documentation.* <https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/how-tool-use-works>
   What we used it for: "The model can't run your code, so every tool call is a round trip: the model asks, you execute, you report back, the model continues."
1. Anthropic (n.d., accessed November 13, 2026). Claude Agent SDK. *GitHub, anthropics/claude-agent-sdk-python.* <https://github.com/anthropics/claude-agent-sdk-python>
   What we used it for: A library for building agents with the Claude Code agent loop, tool execution engine, and session persistence.

## Cadence itself

Claims about how Cadence works come from the app's own code and docs in this repository:

- `README.md` describes how to run the app, the agent loop, the six tools, and the safety rules enforced in code.
- `src/agent/systemPrompt.ts` is the agent's full system prompt. The **Settings** screen shows it word for word.
- `src/content/evidence.ts` holds every claim on the **Learn** screen, with its evidence label and source.
- `scripts/record-flows.ts` records the demo flows and checks the approval rules on every run.
