# Interview Prep — Atlan AI-Native Builder Internship
### June 2026 · 6 months · Remote

---

## Table of Contents
1. [About Atlan](#1-about-atlan-quick-context)
2. [Project Demo Script — Launchy](#2-project-demo-script--launchy)
3. [Round 1 — Technical Questions & Answers](#3-round-1--technical-questions--answers)
4. [Round 2 — Culture & Behavioral Questions](#4-round-2--culture--behavioral-questions)
5. [Questions to Ask the Interviewers](#5-questions-to-ask-the-interviewers)
6. [Atlan AI Deep-Dive — What to Know](#6-atlan-ai-deep-dive--what-to-know)
7. [Cheat Sheet — Key Terms & Phrases](#7-cheat-sheet--key-terms--phrases)

---

## 1. About Atlan (Quick Context)

### What They Build
Atlan is **"the context layer for enterprise AI."** They sit between a company's raw data infrastructure (Snowflake, dbt, Databricks, Airflow, Tableau…) and its AI agents, giving those agents the business knowledge they need to produce trusted, auditable answers instead of hallucinated ones.

Their core product is an **active metadata platform** that unifies, enriches, and serves enterprise context via a graph of ~80+ connectors. Think of it as a "Wikipedia for your data estate" — but live, versioned, and machine-queryable via their MCP server, SQL interface, and open APIs.

### The AI Value Chasm They're Solving
Only **20% of organizations** report significant value from GenAI tools (Gartner 2026). The root cause: models are commoditized — everyone accesses the same intelligence. The differentiator is **context**. An agent that knows your company's definition of "revenue," which table actually holds net ACV, and who owns that dataset will beat one that doesn't — every time.

Atlan calls this the **AI value chasm**: the gap between what an agent *can* do with the right context and what it *actually* does when it's working blind. Crossing that chasm requires a persistent, versioned context layer — not prompts written by hand per use case.

### Their "Context Pipeline" (4 Stages)
```
UNIFY → BOOTSTRAP (AI) → COLLABORATE (humans) → ACTIVATE
```
1. **Unify** — 80+ connectors ingest warehouse SQL, BI definitions, pipeline code into the Enterprise Data Graph
2. **Bootstrap** — AI agents auto-generate descriptions, link business terms, surface top questions (in April 2026, Context Agents generated 690K+ descriptions across 50+ customers; 87% rated on-par or better than human writing)
3. **Collaborate** — Human domain experts resolve conflicts, certify what's production-ready. AI surfaces conflicts; humans make calls.
4. **Activate** — Certified context serves every downstream agent via MCP Server, SQL, APIs. Evals and traces feed back in, compounding quality over time.

### 7 Core Components of Their Context Layer
Gartner's 3 structural:
- **Semantics** — business glossaries, ontologies, knowledge graphs
- **Operational state** — current and historical business conditions, usage patterns, query history
- **Provenance** — full lineage of data, decisions, agent actions, and outcomes

Atlan's 4 operational:
- **Context cataloging** — versioning and organizing enterprise context
- **Context curation** — humans certify; AI surfaces conflicts (e.g., finance and sales disagree on "revenue" at the SQL level)
- **Context engineering** — flywheel of simulation → real usage → iteration until ~70% accuracy threshold is cleared
- **Context retrieval** — runtime delivery via MCP, SDK, SQL — same context serving any agent framework

### Key Customers
Mastercard, Workday (VP of Enterprise Data & Analytics quoted on their homepage), Nasdaq, General Motors, Dropbox, Postman, Fox, Autodesk. Common pattern: they started with a data catalog / governance need and expanded to powering AI agents.

### Terminology to Use Naturally
Use these phrases as if you already think in them — they'll signal cultural alignment:

| Phrase | Use it like this |
|--------|-----------------|
| Context layer | "The missing layer between my data and my agents" |
| Context pipeline | "Unify → enrich → certify → activate" |
| AI value chasm | "Why 80% of GenAI pilots stall before production" |
| Active metadata | "Metadata that does work, not just documents things" |
| Trusted context | "Context that a human has reviewed and certified" |
| Lineage | "Knowing which tables and transformations produced this number" |
| Semantic metadata | "Business meaning layered on top of technical schema" |
| MCP server | "How Atlan's certified context flows to any agent at runtime" |
| Context engineering | "The practice of curating, simulating, and improving context quality" |
| Human-on-the-loop | "AI drafts; humans certify critical decisions" |

---

## 2. Project Demo Script — Launchy

### 2-Minute Elevator Pitch

> "Launchy is an AI-native content engine I built for creators. You give it a niche — say, 'AI SaaS' — and it runs a six-agent pipeline that hunts trends on Reddit and Google, maps audience psychology, drafts platform-native copy, adds creative direction, and scores every piece against a rubric using both the LLM and semantic similarity to a Chroma vector memory of what's historically performed. The output is a ranked batch of campaign assets — tweet threads, LinkedIn posts, Instagram captions — that a creator can ship.
>
> On top of the pipeline I built a **Digital Twin** — a conversational AI that embodies the creator's voice profile, connects to their performance memory, and can kick off new campaigns via tool calls. It uses SSE streaming and an OpenAI tool loop with up to 8 agent steps.
>
> The architecture is fully decoupled: a Python core with no framework imports, a CrewAI adapter, a DAG-based workflow engine for more advanced compositions, and a React/Vite front end with a visual canvas for non-technical creators."

### Architecture Walk-Through (What to Show, In Order)

**Screen 1 — LandingPage.tsx / hero** (~30 sec)
"Here's the product. The hero drives two flows: start a campaign, or talk to your Digital Twin. This framing — creator as the center, AI as the engine — is intentional."

**Screen 2 — `core/config.py`** (~30 sec)
"The public contracts: `RunConfig` takes a niche, subreddit list, platforms, number of angles and variations. `ContentPiece` is the atomic output. `CrewFinalOutput` is the structured schema the LLM writes into — no free-form text, enforced by Pydantic with `extra='forbid'`."

**Screen 3 — `agents/config/agents.yaml` + `tasks.yaml`** (~45 sec)
"Six agents in a sequential pipeline. The tasks YAML is authoritative — task order = execution order. Each agent gets a focused mandate: Trend Hunter only ingests signals; Performance Analyst only scores and writes memory. The voice profile is injected at template-fill time, so every downstream agent writes in the creator's style."

**Screen 4 — `agents/crew_adapter.py`** (~45 sec)
"The `CrewAIPipelineRunner` builds agents from YAML, assembles tool sets, kicks off the crew, and extracts a Pydantic-validated `CrewFinalOutput`. I separated `core/` from `agents/` deliberately — the controller uses a `PipelineRunner` protocol, so you can swap CrewAI for something else without touching the API or CLI."

**Screen 5 — `tools/memory_query.py`** (~30 sec)
"Chroma with `text-embedding-3-small`. Before scoring any piece, the Performance Analyst queries for the top-K most semantically similar past pieces — topic + hook as the query string. The distance score and historical predicted score are both in the prompt, so the LLM can calibrate: 'similar hook scored 72 last time, this one is better structured, I'll give it 78.'"

**Screen 6 — `agents/twin_agent.py`** (~45 sec)
"The Digital Twin is a different architecture entirely — it's an OpenAI tool-loop agent (not CrewAI) with up to 8 planning steps, SSE streaming, and persistent session JSON/JSONL. It has distinct tools: `query_memory` for Launchy performance data, `query_creator_knowledge` for MongoDB-backed training samples, `research_web` for live search, `start_workflow_run` for kicking off the full pipeline."

**Screen 7 — `workflow/engine.py`** (~30 sec)
"The workflow engine is a proper async DAG runner — Kahn topological sort, cycle detection, parallel execution within each level via `asyncio.gather`, per-node JSON artifacts, and SSE run events for the front end. Non-technical creators get the visual canvas; engineers can wire nodes directly in JSON."

### Key Technical Talking Points That Map to Atlan's Interests

| Launchy feature | Atlan parallel |
|-----------------|----------------|
| Chroma vector memory + `text-embedding-3-small` | Context retrieval — semantic search over enterprise knowledge |
| Voice profile JSON injected into all agent prompts | Context engineering — curated, versioned context shapes every agent output |
| `PipelineRunner` protocol for DI | Portability — swap the backend without touching the interface layer |
| `CrewFinalOutput` Pydantic schema with `extra='forbid'` | Trusted context — structured output prevents hallucinated fields |
| Scorer rubric with weighted dimensions | Eval loop — measuring output quality to feed back into the pipeline |
| Session JSONL history for the twin | Provenance — every agent turn is auditable and replayable |
| DAG workflow engine with artifacts | Operational state + lineage — you know exactly what ran, when, in what order |
| Human-reviewed voice profiles | Collaborate stage — curated context that a human certified before it ships |

### Anticipated Questions About the Project + Strong Answers

**"Why CrewAI over LangChain / LangGraph?"**
> "CrewAI's YAML-driven agent/task model was the right fit for a sequential pipeline with well-defined roles. The YAML is the authoritative spec — adding a new agent is adding a block to the YAML, not modifying Python. LangGraph would have been better if I needed more complex conditional branching, but the sequential pipeline maps cleanly to CrewAI's `Process.sequential`. I kept the framework behind a `PipelineRunner` protocol exactly so I could swap if needed."

**"How do you know the scores are meaningful?"**
> "Two layers. First, the rubric is explicit in the prompt: five dimensions with fixed weights — scroll-stop 30%, emotional resonance 25%, platform fit 20%, clarity 15%, originality 10%. Second, the memory query gives the LLM relative calibration — 'a similar hook in this niche scored X before.' The delta between predicted and actual engagement (once actual data is fed back via the CSV updater) closes the eval loop. It's not ground truth, but it's way better than 'the LLM just felt this was an 80.'"

**"What breaks in production?"**
> "Three things break reliably. One: non-deterministic structured output — the LLM occasionally writes a `pieces` array with fields missing or wrong types. I handle this with `extra='forbid'` on `CrewFinalOutput` and a fallback that logs the raw output before raising. Two: rate limits on Reddit / Serper in parallel runs — I have disk caching for Reddit under `~/.avcm-cache/reddit/` with exponential backoff. Three: context window overflow when there are many variations — the sequential pipeline means each task gets everything from previous tasks, which can bloat the context. I manage this by keeping `variations` ≤ 10 and the rubric block compact."

**"Why did you build a Digital Twin instead of just running the pipeline every time?"**
> "The pipeline is batch and async — it takes minutes. The Digital Twin is synchronous and conversational — it's for the moments between campaigns: 'what should I post today?', 'why did my last reel underperform?', 'draft me three hook options in my voice.' It's a fundamentally different interaction model. The Twin can also *start* a pipeline run via `start_workflow_run` when the creator wants the full treatment — so they're complementary, not competing."

### What to Highlight vs. Downplay

**Highlight:**
- The clean architectural separation (`core/` has zero framework imports, testable in isolation)
- Structured output enforcement (Pydantic + `extra='forbid'`) and what it catches
- The memory feedback loop as a primitive eval system
- SSE streaming + tool loop in the Digital Twin as a real async engineering problem
- DAG workflow engine (Kahn sort, cycle detection, `asyncio.gather` for parallelism)

**Downplay / be honest about gaps:**
- Instagram is stubbed (Apify wiring is incomplete) — say "I designed the interface; implementation is pending the actor schema"
- Actual engagement data feedback is manual (CSV upload) — acknowledge this as the weak link in the eval loop
- The LLM scorer is a predicted score, not validated against real CTR data yet — it's a starting signal, not ground truth

---

## 3. Round 1 — Technical Questions & Answers

### AI Architecture & Multi-Agent Systems

---

**Q: Walk me through how you'd design a multi-agent system. What decisions matter most?**

> "The three decisions that matter most are task decomposition, context passing, and failure surfaces.
>
> In Launchy I decomposed into six agents with single responsibilities: Trend Hunter only ingests, Audience Psychologist only maps psychology, and so on. This minimized context contamination — each agent gets exactly the signals relevant to its role, not the full accumulated output.
>
> For context passing, CrewAI's sequential process means each task receives the outputs of prior tasks. I keep that context tight by having each task produce structured output (bullet lists, JSON-like blocks) rather than prose — prose from one agent gets re-interpreted by the next in unpredictable ways.
>
> Failure surfaces: I always extract structured output via Pydantic before treating a run as successful. If the LLM drifts from the schema, I get a validation error with the raw output attached — I can see exactly what went wrong. Non-determinism is the hardest part; determinism is a product of schema enforcement, not just prompting."
>
> **Atlan angle:** "This maps directly to what you see in enterprise AI — agents that don't have a shared context layer end up inventing definitions. The Audience Psychologist agent in my system is essentially doing what Atlan's context curation does: translating raw signals into structured meaning that downstream agents can trust."

---

**Q: How does your workflow engine handle node failures in a DAG?**

> "The engine uses Kahn topological sort to determine execution order, groups nodes into levels that can run in parallel via `asyncio.gather`, and handles exceptions at the level granularity. If any node in a level raises, we emit a `node_failed` RunEvent, persist the failure in `events.jsonl` and `workflow_run.json`, and re-raise — aborting the run. Each node's output is written to `outputs/<run_id>/nodes/<node_id>.json` before the run proceeds, so partial artifacts are always inspectable. Recovery currently requires re-running from scratch; I'd implement checkpoint-based retry as a next step — resume from the last successful node."

---

**Q: What's the difference between using an agent framework like CrewAI vs. building your own tool loop?**

> "CrewAI gives you YAML-driven agent/task definitions, process orchestration (sequential or hierarchical), and inter-task context threading for free. The tradeoff is flexibility — it's hard to inject conditional branching or mid-run state inspection. My Digital Twin is a raw OpenAI tool loop because it's conversational and needs per-turn flexibility: the number of tool calls isn't fixed, I need SSE streaming, and the loop terminates on a final text response rather than a fixed task completion. CrewAI is great when the pipeline is fixed and the task sequence is known; a raw tool loop is better for open-ended agent behavior."

---

### RAG / Vector Search / Embeddings

---

**Q: How does your RAG/memory system work? What design choices did you make?**

> "The memory system uses ChromaDB with OpenAI's `text-embedding-3-small` as the embedding function. Each content piece is stored with its topic, hook, platform, angle, predicted score, and engagement delta as metadata. At scoring time, the Performance Analyst queries the collection with `{niche} | {hook}` as the query string — topic plus opening hook. The top-K results (default 5, tunable via `top_k_memory` in `RunConfig`) come back with cosine distance scores and historical performance data.
>
> Key design choice: I store the predicted score *and* the delta (predicted vs. actual engagement index) as metadata. This lets the LLM reason comparatively — 'similar hook scored 72 predicted but had +15% real engagement, suggesting I'm underestimating this style.' The engagement index itself is `likes + 5*shares + 2*comments` — shares weighted highest because they signal genuine resonance, not just passive consumption."

---

**Q: What are the limitations of your current vector memory approach?**

> "Three main limitations. One: cold start — there's no useful retrieval until you've run a few campaigns. The first few runs are essentially unguided. Two: embedding drift — `text-embedding-3-small` is versioned, but if OpenAI updates the model, similarity scores become inconsistent across the collection; I'd need to re-embed on model updates. Three: the memory stores predicted scores, not validated outcomes — until actual engagement data is fed back, I'm calibrating against my own past predictions, not ground truth. The CSV updater closes this loop manually, but it requires the creator to export analytics and upload them — I'd make that automatic via platform APIs in a real product."

---

**Q: How would you design a semantic search system for enterprise data assets?**

> "I'd model it in three layers. The asset layer: each data asset (table, column, dashboard, metric) gets a composite document — schema, business description, top queries run against it, BI usage, glossary terms linked to it. The embedding layer: embed those composite documents with a strong model like `text-embedding-3-large`; re-embed on any metadata update. The retrieval layer: hybrid search — BM25 for exact column/table name matches, vector search for semantic proximity, re-rank by access frequency and recency. Critically, I'd version embeddings and cache the composite documents so I can diff what changed.
>
> **This is essentially what Atlan's Enterprise Data Graph does** — they call it active metadata because it's not static documentation, it's living context that updates as lineage, quality, and usage patterns change."

---

### LLM Evaluation & Reliability

---

**Q: How do you evaluate whether your AI outputs are actually good?**

> "I have two layers in Launchy, and I'll be honest about the gap. Layer one is offline: a weighted rubric (scroll-stop 30%, emotional resonance 25%, platform fit 20%, clarity 15%, originality 10%) that the Performance Analyst applies consistently. This catches structural quality issues — a hook that doesn't hook, a CTA that doesn't call to anything. Layer two is online: actual engagement data fed back via CSV, stored as a `delta` in Chroma metadata.
>
> The honest gap: layer two requires manual effort, so most campaigns only have layer one. The eval loop is closed in design but open in practice. In a production system I'd automate engagement ingestion via platform APIs and run weekly recalibration — 'all pieces that scored above 75 and had below-median real engagement — what did the rubric miss?'"

---

**Q: What makes AI systems unreliable in production? What do you watch out for?**

> "Non-determinism, schema drift, context bloat, and silent failures are the four I've hit personally.
>
> Non-determinism: same prompt, different output — especially with temperature > 0. Mitigation: structured output + Pydantic validation. If the schema breaks, I know immediately; I don't silently pass through garbage.
>
> Schema drift: the LLM occasionally invents extra fields or changes types. `extra='forbid'` on `CrewFinalOutput` catches this — any field not in the schema raises a validation error.
>
> Context bloat: in sequential pipelines, each task inherits everything from prior tasks. With many variations, this can push well past 16K tokens. I mitigate with structured intermediate outputs (bullet lists, not prose paragraphs) and a hard cap on `variations`.
>
> Silent failures: the LLM can silently hallucinate sources, scores, or memories. For memory queries I log every distance score — if the nearest neighbor is distance 0.95, that's not a similar entry, that's a miss, and I want the agent to know that. The tool returns 'No similar entries' rather than surfacing weak matches as if they're real."

---

### Practical AI Engineering

---

**Q: How do you approach prompt engineering? What's your process?**

> "I treat prompts as code: version-controlled in YAML, with explicit expected output formats and role separation.
>
> The most impactful practice: keep role, goal, and backstory tight in agent definitions — they constrain the agent's interpretation space. Then use task descriptions as the actual instructions, not the backstory. Backstory sets personality; task description drives behavior.
>
> For structured output, I always include the exact schema in the task's `expected_output` field and use Pydantic to enforce it. I learned this the hard way — asking an LLM to 'output JSON' produces 7 different formats. Asking it to output a `CrewFinalOutput` object and then validating with `model_validate` is deterministic.
>
> I also separate concerns across agents rather than cramming everything into one mega-prompt. The Trend Hunter prompt has zero reference to scoring; the Performance Analyst prompt has zero reference to trend research. Clean separation means I can debug and improve each agent independently."

---

**Q: How do you think about context window management?**

> "Context window is a shared resource — every token you spend on history is a token not spent on the current task. Three tactics I use: First, structured intermediate outputs — bullet lists with fixed fields instead of verbose prose, so downstream agents get information-dense context without narrative padding. Second, tool result summarization — in the Digital Twin, tool results over 2,400 characters get truncated with an ellipsis before being added to the message history. Third, session history limits — `read_messages` has a `max_turns=80` cap, beyond which old turns are dropped.
>
> The design principle: every message in context should earn its token cost. If it's not shaping the next output, it shouldn't be there."

---

### Data Pipelines & Integrations

---

**Q: How does Launchy ingest social signals? Walk me through the data flow.**

> "Three sources, different access patterns. Reddit: I hit the JSON endpoint (`/r/{subreddit}/top.json`) with backoff and disk cache under `~/.avcm-cache/reddit/`. Each subreddit is cached keyed by `(subreddit, timeframe, limit)` — cache TTL prevents hammering the API between runs. Serper: the CrewAI `SerperDevTool` wraps Google's search JSON API; I pass niche-derived query hints (`'{niche} news'`, `'{niche} reddit discussion'`, etc.) rather than preset vertical queries. Web scraping: `ScrapeWebsiteTool` on URLs the Trend Hunter deems promising — optional, only when a title/snippet ties to the niche.
>
> All three are registered in a `tool_registry` dict and assembled per-agent from YAML `tool_sets` config. Adding a new source is: implement the tool, register the key, add the key to the relevant `tool_sets` block."

---

**Q: How would you design a data ingestion pipeline for 80+ enterprise connectors?**

> "I'd think in three abstractions: a connector interface, a metadata schema, and an event model.
>
> Connector interface: each connector implements `fetch(since: datetime) -> list[AssetEvent]` — pull-based for batch sources (dbt, Snowflake), event-driven for streaming sources (Kafka, Airflow). Both shapes produce `AssetEvent` records.
>
> Metadata schema: a unified graph model where every asset (table, column, dashboard, metric) has a canonical ID, a type, properties, and edges (lineage, ownership, classification). Connectors translate their native schema into this model.
>
> Event model: each ingestion produces diff events (`asset.created`, `asset.updated`, `lineage.added`). Consumers downstream — the embedding pipeline, the description generator, the quality checker — react to events rather than polling. This is how Atlan describes their active metadata approach — metadata that triggers downstream actions when it changes, not metadata that sits static until someone looks at it."

---

### System Design for AI

---

**Q: Design a system that lets AI agents answer questions about enterprise data reliably.**

> "Three layers working together.
>
> **Layer 1 — Context store.** A graph database where nodes are data assets (tables, columns, metrics, dashboards, glossary terms) and edges are relationships (lineage, ownership, classification, usage). Each node has both technical metadata (schema, types, location) and semantic metadata (business description, certified glossary terms, access policy, quality score). This is your single source of truth.
>
> **Layer 2 — Context retrieval.** Hybrid search — BM25 + vector similarity over enriched asset documents, plus graph traversal for lineage lookups. An agent asking 'which tables hold net revenue?' gets: semantic similarity to revenue-adjacent assets, plus the lineage graph that shows which transformations produce the output table, plus the certified definition of 'net revenue' from the business glossary. Delivered via MCP so any agent framework can consume it.
>
> **Layer 3 — Eval + feedback loop.** Every agent response gets traced: which context documents were retrieved, which were actually used in the reasoning, what the answer was. That trace is the signal for context improvement — if the same query keeps pulling unhelpful documents, the curation system surfaces that for a human to fix. Context quality compounds over time rather than staying flat.
>
> This is the architecture Atlan has built — and it's directly analogous to Launchy's memory system, just at enterprise scale with 80+ source integrations instead of three."

---

### Debugging AI Systems

---

**Q: How do you debug a non-deterministic AI system? What's your methodology?**

> "I have a four-step process: isolate, instrument, reproduce, constrain.
>
> **Isolate**: run the failing agent in isolation with fixed inputs. CrewAI's `verbose=False` in production becomes `verbose=True` in debug mode so I can see the full chain-of-thought. For the workflow engine, I read `outputs/<run_id>/nodes/<node_id>.json` — every node's exact input context and raw output is persisted.
>
> **Instrument**: log the raw LLM output *before* Pydantic validation. The most common failure mode is the LLM producing valid-looking JSON that violates the schema in subtle ways — an int where a str is expected, a missing required field. Logging `result.raw` before `model_validate` shows exactly what the model produced.
>
> **Reproduce**: fix the temperature to 0.0 and replay the exact input. If the failure disappears, it's probabilistic — you need more schema enforcement or better few-shot examples. If it persists at temperature 0, it's a prompt issue — the model is consistently misunderstanding the instruction.
>
> **Constrain**: tighten the schema, add a few-shot example of the exact output format, or split the task if the model is being asked to do too much in one shot."

---

## 4. Round 2 — Culture & Behavioral Questions

---

**Q: "Tell me about a time you moved forward without a clear spec."**

**Framework:** Situation → What was ambiguous → How you decided to move → What you built → What you learned

> "Building the Digital Twin had no spec — I knew I wanted a conversational layer on top of the pipeline, but 'Digital Twin' was a vague concept. I had two competing designs: a simple Q&A over past run outputs, or a full stateful agent with tools.
>
> I picked the harder one and timebox'd it: two days to build a working SSE tool loop with just memory query and web research, then evaluate. What forced my decision wasn't certainty — it was reversibility. The tool loop was additive; I could always strip it back to simple Q&A if the complexity wasn't worth it.
>
> What I built was `twin_agent.py`: an OpenAI tool loop with streaming, persistent session history in JSONL, and a voice-profile injection system. The key insight I didn't have at the start: the voice profile had to be in the system prompt, not retrieved as a tool call — it needed to shape every response, not just answers to explicit style questions.
>
> Lesson: when the spec is missing, the question to ask is 'what decision can I make reversibly in the shortest time?' Ship something you can inspect, then decide."

---

**Q: "What's something you built that turned out to be wrong? How did you respond?"**

> "My first scoring system had no rubric — I just asked the LLM to score content on a scale of 1-100 with brief reasoning. The scores were all 70-85. Everything clumped in the middle because the model had no anchor for what a 30 or a 90 actually meant.
>
> I realized the problem when I tried to use scores to rank content for a creator: the ranking was essentially random because the variance was too low to be meaningful.
>
> I rebuilt it with explicit weighted dimensions: scroll-stop, emotional resonance, platform fit, clarity, originality — each with a percentage weight that the LLM applies visibly. Now I get variance and, more importantly, I get *reasoning* per dimension that I can actually critique. The scores still aren't ground truth, but they're actionable.
>
> The meta-lesson: a metric that doesn't produce variance isn't measuring anything."

---

**Q: "How do you collaborate with teammates on unclear problems?"**

> "My default move is to make the ambiguity visible in a shared artifact. On Launchy, the YAML files (`agents.yaml`, `tasks.yaml`) serve this function — they're the canonical spec for what each agent does. When I want to change an agent's behavior, I don't have a discussion about prompts; I edit the YAML and the PR diff is the conversation.
>
> For genuinely unclear problems, I draft a 'decision memo' — one page, two options, explicit tradeoffs, a recommended call. Not to be right, but to give people something to react to. A bad draft gets better faster than an open-ended discussion.
>
> What I'd do at Atlan specifically: ask early about what 'done' looks like for a given feature — not the UI spec, but the user behavior we want to see change. That grounds the ambiguity."

---

**Q: "What do you do differently today with AI vs. a year ago?"**

> "Three things.
>
> One: I stopped asking LLMs to reason and started asking them to fill schemas. 'Write me content ideas' produces noise. 'Fill this `ContentPiece` object with a trend, angle, platform, body, and predicted_score' produces something I can validate.
>
> Two: I think about the eval loop before I build the generation. A year ago I'd build the pipeline first and add evaluation as an afterthought. Now I start with 'how will I know if this is working?' — which forced me to build the Chroma memory and the rubric-based scorer before I built the copywriter.
>
> Three: I separate context management from generation. The Digital Twin's voice profile injection, the memory query before scoring, the prompt context blocks — these are all context engineering, separate from the generation step. A year ago I'd write a giant prompt that tried to do both at once. Now they're separate concerns."

---

**Q: "What kinds of problems energize you?"**

> "Problems where the constraint is *structure*, not *intelligence*. The AI models are smart — the question is almost always 'what do we give them and how do we shape their output?' Building Launchy's scoring rubric, designing the structured output schema, architecting the voice profile injection system — these were all structuring problems.
>
> I'm also energized by problems with a clear feedback signal. The eval loop on Launchy was motivating exactly because I could close it — build → run → compare predicted vs. actual engagement → adjust rubric weights. The hardest version of this problem — building a feedback loop for enterprise AI context quality — is what Atlan's context engineering is about, and that's exactly the kind of problem I want to work on."

---

**Q: "What don't you know yet that you want to learn at Atlan?"**

> "Two honest gaps and one thing I want to build.
>
> Gap one: graph modeling at scale. My mental model of context is flat — documents in a vector store with metadata. Atlan's Enterprise Data Graph is traversable — you can follow lineage edges from a dashboard to the SQL that built it to the table it reads from to the upstream pipeline that populates that table. I want to understand how you model, query, and update a graph of that complexity without sacrificing retrieval latency.
>
> Gap two: multi-tenant context isolation. In Launchy, one creator's voice profile doesn't bleed into another's because the profiles are separate files. In an enterprise context layer shared across thousands of agents and teams, isolation and access control at the context level is a real problem. I've read about Atlan's access policies but haven't built anything with that constraint.
>
> What I want to build: an eval pipeline for context quality — analogous to how I'd eval a language model, but the thing being evaluated is the quality of the context layer itself. Simulation-based: generate likely agent questions, run them against the context layer, score whether the retrieved context was sufficient to answer correctly. This is what Atlan calls 'context engineering' and it's the part of the system I find most technically interesting."

---

## 5. Questions to Ask the Interviewers

These signal that you've done real research and think at the right level of abstraction. Pick 3-4 per round.

**On AI Architecture & Context Layer:**
1. "The context pipeline you've described — unify, bootstrap, collaborate, activate — how do you handle the case where a connector's lineage is incomplete? Do agents degrade gracefully, or does incomplete lineage block the whole context path?"
2. "Your Context Agents generated 690K+ descriptions in April 2026 — 87% rated on par with human writing. How are you measuring that 87%? Is it human eval, automated rubric, or something else — and does the eval process itself feed back into improving the generation prompts?"
3. "When you talk about the ~70% accuracy threshold for enterprise trust — how do you measure accuracy in a context layer? Is it 'did the agent answer the question correctly' or something more fine-grained like 'was the retrieved context sufficient' vs. 'did the model use it correctly'?"
4. "You have an MCP server for context retrieval. How do you version context so that an agent running a deterministic workflow today gets the same context three months from now, even as the underlying data graph evolves?"

**On Team & Working Style:**
5. "For an intern on the AI-Native Builder track — what does 'builder' mean concretely? Am I building features in the product, internal tooling for context engineering, or something else?"
6. "What's the feedback loop like for an intern contribution at Atlan? If I build something that ships to a customer, how quickly does that happen — and how do I know if it's actually helping?"
7. "What's a recent hard technical decision the AI team disagreed on, and how did you resolve it?"

**On Product & Direction:**
8. "You're described as 'AI-native, built for change' — built for MCP and A2A today. What's your bet on what comes after MCP? How do you design for portability when the next protocol isn't defined yet?"
9. "Atlan works alongside existing catalogs — Purview, Snowflake Horizon, Unity Catalog. Is the long-term vision to replace them, federate over them, or stay additive? How does that shape what you build?"
10. "The 'human-on-the-loop' framing — collaborate stage before context ships — what percentage of context actually goes through human review at large customers? Is that a bottleneck, and how are you automating through it?"

**On Growth & Internship:**
11. "What's the steepest learning curve you've seen interns hit at Atlan? What do the ones who get the most out of it do differently?"

---

## 6. Atlan AI Deep-Dive — What to Know

### Current AI Features

**Context Agents (Bootstrap stage)**
- AI reads the Enterprise Data Graph — SQL query history, BI semantics, pipeline code
- Generates asset descriptions, links business terms, surfaces top business questions
- April 2026: 690K+ descriptions generated across 50+ enterprise customers; 87% rated equal to or better than human-written
- Human experts review and certify before context ships — "human-on-the-loop, not out of the loop"

**AI Agents for specific tasks include:**
- *Description Generator* — auto-writes business descriptions for data assets
- *Term Linkage* — links assets to business glossary terms
- *Metrics Generator* — surfaces top business questions and metric definitions
- *Semantic Views* — generates semantic layer views over warehouse data
- *Ontology Generator* — bootstraps a business ontology from lineage and SQL patterns

**Context Studio / MCP Server**
- Certified context flows to downstream AI agents via the Atlan MCP server
- Same context can power Cortex (Snowflake), Agent Space (Databricks), Sierra, LangGraph, and any MCP-compatible framework
- Evals and traces feed back into the pipeline after each agent interaction

**The Metadata Lakehouse**
- Core architecture: Iceberg-native, knowledge graph + vector storage + analytics
- Purpose-built for AI — not a relational metadata store bolted onto a graph

### How They Model Context / Lineage

**The Enterprise Data Graph**
- Every data asset (table, column, metric, dashboard, pipeline, SOP) is a node
- Edges: lineage (upstream/downstream), ownership, classification, business term links, quality scores, usage patterns
- Graph is traversable — you can walk from a dashboard to the SQL that built it to the source table to the pipeline that loads it

**Lineage specifically:**
- Column-level lineage across warehouse SQL, BI definitions, and pipeline code
- Supports: Snowflake, Databricks, BigQuery, Redshift, dbt transformations, Airflow DAGs, Tableau/Looker/Power BI
- Example from a customer (Kiran Panja, GM): "Atlan had lineage across on-prem Oracle databases, BigQuery, and Looker within the first year"

**Semantic metadata:**
- Business glossary: human-certified definitions for terms like "revenue", "customer", "churn"
- Glossary terms link to assets — so an agent querying "net ACV" resolves to the right table via the glossary-to-lineage graph, not column-name guessing

### Their Integrations
80+ native connectors, including:
- **Warehouses**: Snowflake, Databricks, BigQuery, Redshift, Postgres
- **Orchestration**: dbt, Airflow
- **BI / Visualization**: Tableau, Looker, Power BI
- **Adjacent catalogs**: Microsoft Purview, Snowflake Horizon, Databricks Unity Catalog (Atlan layers on top, not replaces)
- **Agent frameworks**: MCP-compatible (any framework), plus named integrations for Cortex, Agent Space, Sierra, LangGraph

### The AI Value Chasm — In Your Own Words

The AI value chasm is the gap between "AI works in a demo" and "AI works reliably in production." It exists because:

1. **Models are commoditized** — every company has access to the same GPT-4, Claude, Gemini. Intelligence is not the differentiator.
2. **Context is not** — your company's definition of "revenue" vs. the world's, which table actually holds ARR, who owns it, who certified it, how it's calculated — that institutional knowledge is unique and it's not in any foundation model's training data.
3. **Without a context layer, agents hallucinate** the business-specific parts — they know SQL but not *your* SQL schema's semantics, they know statistics but not *your* company's definition of "churn."

Crossing the chasm means building a system that continuously captures, curates, and serves this institutional knowledge to agents. The payoff: Atlan's data shows that enhanced metadata improves AI SQL accuracy by 38%, and a working context layer improved AI analysts' answers by 5x in their AI Labs study.

Gartner's prediction: by 2027, organizations that prioritize semantic context will see up to 80% higher AI accuracy and 60% lower costs. The ones that don't will have spent two years building agents that still don't perform.

---

## 7. Cheat Sheet — Key Terms & Phrases

Use these naturally — don't force them, but don't avoid them either.

| Term | What it means | How to use it |
|------|--------------|---------------|
| **Context layer** | Persistent, versioned knowledge store between data infra and AI agents | "The problem I kept running into with Launchy was needing a proper context layer — not just a vector store, but versioned, certifiable knowledge that agents could trust" |
| **Active metadata** | Metadata that triggers downstream actions when it changes | "Launchy's Chroma memory is passive — it stores what happened. Active metadata would update the agent's priors in real time when a new trend fires" |
| **Enterprise Data Graph** | Graph of all data assets and relationships, the foundation of Atlan's context layer | "That's the graph traversal problem — you need to walk lineage edges, not just do vector search" |
| **Context engineering** | Practice of structuring, curating, and improving context quality over time | "The rubric weights in Launchy's scorer are a primitive form of context engineering — explicit, tunable, measurable" |
| **Lineage** | End-to-end tracking of where data came from and what transformed it | "If an agent's answer is wrong, lineage is how you trace back to which upstream transformation produced the bad number" |
| **Semantic metadata** | Business-level meaning on top of technical schema | "Column names are technical metadata. 'Net ACV' links to the glossary term that says 'use billing.subscriptions net of refunds' — that's semantic metadata" |
| **Trusted context** | Context that a human has reviewed and certified before it ships to agents | "The voice profile in Launchy is trusted context — a human curated it, and every agent prompt that uses it can rely on it being intentional" |
| **Human-on-the-loop** | AI drafts; human reviews and certifies critical decisions | "Not human-in-the-loop (approving every step) — human-on-the-loop means AI does the first 80%, human resolves conflicts and certifies" |
| **MCP** | Model Context Protocol — standard interface for agents to query context | "The Atlan MCP server is what makes the context layer portable — any agent framework that speaks MCP can pull certified context without custom integration work" |
| **Context curation** | The work of resolving conflicts and certifying context for production | "The hardest part isn't generating descriptions — it's knowing when two systems disagree on 'revenue' and surfacing that to the right human" |
| **Provenance** | Full traceability of data, decisions, and agent actions | "Every session in Launchy's Digital Twin is persisted as JSONL — that's provenance. You can replay any conversation and audit every tool call" |
| **AI value chasm** | Gap between GenAI demos that work and GenAI products that work in production | "The prototype hit the chasm when the revenue analysis agent couldn't answer a single real question — it had intelligence but no business context" |
| **Context bootstrapping** | Using AI to auto-generate the first 80% of context before human review | "Rather than asking every analyst to write descriptions, you bootstrap with AI — Atlan's Context Agents do this for the entire data estate" |
| **Topological execution** | Running DAG nodes in dependency order | "The workflow engine uses Kahn sort to resolve the topological order, then groups independent nodes into parallel levels" |
| **Structured output** | LLM constrained to produce output matching a Pydantic schema | "The whole reliability story for Launchy's scoring depends on structured output — without `extra='forbid'`, you get drift in every third run" |

---

### Night-Before Checklist

- [ ] Re-read sections 1 and 6 (Atlan context) — commit the 4-stage pipeline and 7 components to memory
- [ ] Re-read the Digital Twin walk-through in section 2 — be ready to explain SSE + tool loop in one minute
- [ ] Practice the 2-minute elevator pitch out loud
- [ ] Pick 4 questions from section 5 for each round
- [ ] Remember: the rubric dimensions and weights (`scorer_rubric.py`) are a talking point for "how do you evaluate AI output"
- [ ] Know your honest gaps: Instagram stub, manual engagement CSV, predicted-not-validated scores — own them confidently

---

*Built from Launchy codebase analysis + Atlan website/blog research, May 2026*
