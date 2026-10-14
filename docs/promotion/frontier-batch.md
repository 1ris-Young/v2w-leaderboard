# Four-model joint release: working brief

Planned angle: **Who builds the best physical world?**

Models: Claude Opus 5.5, Gemini 4 Argon, Meta Muse, GPT-6.1 Sol. Only Opus 5.5 has a supplied result in the current four-model batch. The other three have no scores or case outcomes in this package.

Prepare these reusable materials while testing finishes:

1. One score card comparing the four models on the same compatible result set; name the exact versions and effort.
2. One original / model A / model B execution video that demonstrates an actual difference.
3. One shared failure or diagnostic example explaining why physical execution remains hard.
4. One roundup News entry linking to the full benchmark and each model's independent result page.

Opening draft, to complete after the results are verified:

> Who builds the best physical world?
>
> We put Opus 5.5, Gemini 4 Argon, Meta Muse and GPT-6.1 Sol through Video2World: watch an embodied video, write the scene and robot behavior, then execute the interaction.
>
> [VERIFIED_WINNER_AND_MEASURED_FINDING]
>
> Same benchmark. Actual executions. Full results: [PUBLIC_ROUNDUP_URL]

Do not publish the placeholder draft. A model can win a component or efficiency comparison without leading the overall score; write the story from verified evidence. No cost conclusion is supported until the actual costs are supplied.

Create the final roundup page by copying the generic update layout, then add its article to `dist/data/news.json` with `kind: roundup`, an existing `href`, an explicit date, and `status: published`. Before publication, ensure all four rows are present, pending entries are removed, the overall/component winner claims match the compatible result set, and the videos match the frozen runs. The homepage News widget and benchmark News section will automatically pick up the published entry.
