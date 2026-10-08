# Theorem Atlas

An interactive dependency graph of AP Calculus AB — every definition, theorem, lemma, and technique as a node; edges mean "you need this to understand that."

Alpha scope: **Calculus AB only.** No series, no parametric/polar/vector, no integration by parts, no improper integrals (all BC topics).

## Why

Textbooks are linear; understanding is a graph. The atlas answers three questions textbooks don't:

- **Where am I?** — mark nodes unseen / learning / known / shaky as you study.
- **What's next?** — the *Up next* panel lists everything whose dependencies you already know.
- **Why am I stuck?** — open a confusing proof and look two levels down; the shaky dependency is usually there.

## Run it

```bash
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

(`file://` won't work — the page fetches `data/atlas.json`.)

Deploy: the `site/` folder is a static site — publish it with GitHub Pages (Settings → Pages → deploy from `site/`).

## Data model

`data/atlas.json` is the product; the site is the frame.

```json
{
  "id": "mvt",
  "title": "Mean Value Theorem",
  "kind": "theorem | lemma | definition | technique | concept",
  "chapter": "limits | differentiation | applications | integration",
  "statement": "LaTeX with \\( \\) delimiters, rendered by KaTeX",
  "proof_sketch": "concise LaTeX proof sketch, or null",
  "notes": "why it matters, traps, connections",
  "depends_on": ["rolles"]
}
```

## Validate the graph

```bash
python3 tools/validate.py
```

Checks: unique ids, known chapters, no dangling dependencies, no cycles, every node reachable from a root. Run it before committing data changes.

`site/data/atlas.json` is a copy of `data/atlas.json` for deployment — re-copy after edits:

```bash
cp data/atlas.json site/data/atlas.json
```

## Current map

39 nodes, 67 edges, 1 root (`limit-intuition`):

| Chapter | Nodes |
|---|---|
| Limits & Continuity | 9 |
| Differentiation | 11 |
| Applications of Derivatives | 7 |
| Integration | 12 |

## Roadmap

- Extend the spine: proof craft (Stage 0) below, real analysis (Stage 3) above — with locked/mysterious rendering for the far frontier.
- Counterexample nodes (continuous but not differentiable, etc.).
- Drill mode: "prove this using only these tools."
- Progress export/import (currently localStorage only).
