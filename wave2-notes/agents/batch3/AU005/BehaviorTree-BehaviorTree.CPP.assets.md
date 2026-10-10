# BehaviorTree-BehaviorTree.CPP: asset audit (AU005)

Path: /mnt/frankendom-donors/BehaviorTree-BehaviorTree.CPP (VPS, read-only). 337 files, 4.6M.

## Licence (as the files say)
- Code: MIT. LICENSE line 1 "The MIT License (MIT)".
- Copyright lines differ between files. LICENSE line 3: "Copyright (c) 2015 - 2018 Michele Colledanchise". README lines 129-133: 2019-2026 Davide Faconti; 2018-2019 Davide Faconti, Eurecat; 2014-2018 Michele Colledanchise. Recorded as written.
- Bundled libraries: minicoro is public domain or MIT (a choice, 3rdparty/minicoro/LICENSE lines 5 and 30); minitrace is MIT (Henrik Rydgard, 2014); tinyxml2 has a zlib-style header (full text not read).
- Assets: no separate asset licence. Non-code files sit under the repo MIT by location. The report PDF and the Groot screenshot have no licence statement of their own.

## Rights-holder status (from repo files only)
- Open-source C++ behaviour-tree library. Copyright holders named in LICENSE and README: Michele Colledanchise, Davide Faconti, Eurecat.
- No game content. Report PDF has no author or title field in its metadata; it is not referenced by any repo file.

## Asset inventory
- Logo: animated.svg (19.6K, inline SVG with a one-shot CSS keyframe animation), btcpp_logo.svg (7.5K), btcpp_logo.png (10K). Class A with repo MIT.
- Screenshot: docs/groot-screenshot.png (62.8K), embedded in README line 48. It shows a separate tool (Groot2). Class C. Not viewed (copying off the VPS is not allowed).
- Report: MOOD2Be_final_report.pdf (425K). TeX producer, creation date 2019. No author, no licence line. Class C. Metadata only.
- Behaviour-tree XML examples: 19 XML files donor-wide, including examples/test_files and sample_nodes (7 files). Class A (repo MIT).
- Example and sample code: about 30 example .cpp, sample_nodes source. Class A (repo MIT).
- Third-party code: 3rdparty/minicoro, minitrace, tinyxml2, flatbuffers. Class A for code licences stated.
- Docs markdown: 14 md files. Class A (repo MIT).
- Game art, models, audio, fonts, maps: none. Class D.

## Best class
A (MIT logo and XML examples, plus stated permissive third-party code). The screenshot and report are C. Nothing here is game content.

## Inspiration
1. The logo reveals itself with a one-shot CSS keyframe animation. Cheap title or splash reveal for our HUD, no video needed.
2. Behaviour trees are XML with named node types, typed ports and reusable subtrees. Creature brains as data files; code only for leaf actions.
3. The node-mocking example runs a tree against stand-in nodes inside a test (examples/t15_nodes_mocking.cpp). Pattern for headless tests of creature AI.
4. A SQLite logger records each tree tick for later replay (examples/ex03_sqlite_log.cpp). A decision timeline for our debug overlay would follow this.
5. Ports are typed and remapped at the call site (file names only: t12, t13, t19). One behaviour serves many creatures with different parameters.
6. A terminal manual-selector example (name only: ex03_ncurses_manual_selector.cpp) hints at a hand-driven decision mode for debugging.

## Inspiration briefs (3)
- Self-drawing title mark: one-shot outline reveal. Ref animated.svg (look only).
- Decision graph view: nodes with live state, sigil-style nodes instead of boxes. Ref docs/groot-screenshot.png. Not viewed; caption only, low confidence.
- Decision replay timeline: scrubbable tick log with markers. Ref examples/ex03_sqlite_log.cpp.
Full fields in BehaviorTree-BehaviorTree.CPP.assets.json.

## Cross-link to our cell topics
- animation: CSS keyframe reveal (logo only; no character animation here).
- hud-ui: logo reveal and a decision graph view.
- spawns and creature AI: data-driven behaviour trees and headless mock tests.
- vfx and sound: none.

## Not read
docs/groot-screenshot.png (not viewed), MOOD2Be report body (metadata grep only), btcpp_logo files (contents), most examples and test XML, sample_nodes source, full tinyxml2, minitrace and flatbuffers licence texts, docs markdown, all src and tests.
