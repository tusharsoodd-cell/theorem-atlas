#!/usr/bin/env python3
"""Validate the atlas graph: unique ids, known chapters, no dangling
dependencies, no cycles, everything reachable from a root node."""
import json
import sys
from collections import defaultdict

ATLAS = "data/atlas.json"


def main() -> int:
    with open(ATLAS, encoding="utf-8") as f:
        data = json.load(f)

    errors = []
    nodes = data["nodes"]
    ids = [n["id"] for n in nodes]
    if len(ids) != len(set(ids)):
        errors.append("duplicate node ids")

    chapters = {c["id"] for c in data["chapters"]}
    by_id = {n["id"]: n for n in nodes}

    for n in nodes:
        if n["chapter"] not in chapters:
            errors.append(f"{n['id']}: unknown chapter {n['chapter']!r}")
        if n["id"] in n.get("depends_on", []):
            errors.append(f"{n['id']}: depends on itself")
        for d in n.get("depends_on", []):
            if d not in by_id:
                errors.append(f"{n['id']}: dangling dependency {d!r}")
        for field in ("title", "kind", "statement"):
            if not n.get(field):
                errors.append(f"{n['id']}: missing {field}")

    # cycle detection (topological sort)
    indeg = {nid: 0 for nid in ids}
    children = defaultdict(list)
    for n in nodes:
        for d in n.get("depends_on", []):
            if d in by_id:
                children[d].append(n["id"])
                indeg[n["id"]] += 1
    queue = [nid for nid, k in indeg.items() if k == 0]
    seen = 0
    while queue:
        nid = queue.pop()
        seen += 1
        for c in children[nid]:
            indeg[c] -= 1
            if indeg[c] == 0:
                queue.append(c)
    if seen != len(ids):
        cyclic = [nid for nid, k in indeg.items() if k > 0]
        errors.append(f"cycle detected involving: {cyclic}")

    # reachability from roots
    roots = [n["id"] for n in nodes if not n.get("depends_on")]
    reachable = set()
    stack = list(roots)
    while stack:
        nid = stack.pop()
        if nid in reachable:
            continue
        reachable.add(nid)
        stack.extend(children[nid])
    unreachable = set(ids) - reachable
    if unreachable:
        errors.append(f"unreachable nodes: {sorted(unreachable)}")

    print(f"nodes: {len(nodes)}, edges: {sum(len(n.get('depends_on', [])) for n in nodes)}, roots: {len(roots)}")
    if errors:
        print("ERRORS:")
        for e in errors:
            print(" -", e)
        return 1
    print("atlas graph OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
