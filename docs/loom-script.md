# Loom script (about 2 minutes)

**0:00 Open on the Call screen, comp scenario selected.**
Hey Seb. After our call I kept thinking about your question: how do you unlock more of the corpus, get questions that are actually nuanced, and not spend a fortune on tokens. This is Caddy Lab, a small prototype of one answer. The short version: do the expensive thinking before and after the call, so the live path is basically free.

**0:20 Point at the brief panel.**
Before the call, Sonnet reads the deal once. Candidate, job, client, recent emails. It writes a brief: risk signals, motivations, and for each pushback it expects, a ladder of three or four dig-deeper questions written for this candidate. That's the only expensive step, about two cents.

**0:40 Press play at 1.5x.**
Now the call. Every line goes through a local classifier, keywords first, then a small embedding model in the browser. No API call. When Priya says the range is low, the first rung shows up in a fraction of a millisecond. You can see the latency on the card.

**1:00 Let the "my mate at Stripe" line play.**
When comp comes up again after the recruiter has spoken, it climbs the ladder. That's your cache of second, third, fourth questions. Meanwhile Haiku is refining in the background with the last few lines and the most relevant playbook files. Here it noticed she named a peer anchor, and swapped in a sharper question. It only swaps if the card is fresh and nobody's touched it, otherwise it shows as a chip.

**1:20 Open the "Why this question" area, click a playbook file.**
Every card shows what it heard, what the brief predicted, and which playbook file it came from. That's how you stop it being generic. Used and ignored feed a learning loop, so questions recruiters keep using get pre-built next time.

**1:35 Switch to the Cost tab.**
This is the part I care most about. Naive, Sonnet on every line with full context, is around four dollars a call hour. This approach is under five cents. Tick prompt caching on the naive side to make it fair and it's still over twenty times cheaper, and most of what's left is the brief.

**1:50 Back to camera.**
It's mock data and there's no real speech-to-text, and the README is honest about what it doesn't prove. But I'd love to talk about how this maps to your real pipeline. Thanks.
