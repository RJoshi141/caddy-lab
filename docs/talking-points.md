# Talking points for the next call with Seb

1. **Move the intelligence off the live path.** Your current caddy runs categorize, retrieve, blend and generate with a powerful model on every turn. I'd split that into a pre-call brief (big model, once per deal), a zero-call fast path (local classifier plus pre-built ladders), and an optional cheap refinement. On my numbers that's 20x to 95x cheaper per call hour, and the latency budget goes to speech-to-text instead of generation.

2. **The corpus gets used more, not less.** The brief is where the deep reading happens: the whole playbook plus this deal's history, with time to think. That's how you get questions that use names, numbers and quotes instead of whatever's easiest. Live, the corpus sits in a cached prefix that costs a cent per million tokens to reread.

3. **Caching the dig-deeper questions is a product feature, not just a cost trick.** Ladders per pushback category, per deal, climbing a rung when the topic comes back. And the used/ignored log lets the questions recruiters actually use get promoted into future briefs, so it gets better without anyone retraining anything.

4. **Questions I'd want answered about the real stack:**
   - What does the 0.4 second budget look like broken down? How much is Microsoft STT, endpointing, retrieval, the model, and render?
   - Where does the corpus live today, and how is it chunked and indexed? Is the knowledge graph queried live or precomputed?
   - Which models run the caddy now, and what's a call hour actually costing?
   - How do you measure "magic" today? Recruiter usage of suggestions, deal outcomes, or just feedback?
   - How much of a deal's context is available before the call starts?

5. **What I'd build first if I joined.** An eval set of real call moments labeled with the question a great recruiter would ask, so we can compare pipelines on quality and cost side by side. Then a trained classifier for the fast path on your own call data, replacing my hand-written keywords.
