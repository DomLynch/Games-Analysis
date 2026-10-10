# gtker-wow_messages: asset audit (AU024)

Donor path (VPS, read-only): /mnt/frankendom-donors/gtker-wow_messages/

**Half read:** data pack only (wowm message definitions, mdBook docs, JSON schemas and the ember_output JSON). The code halves are in the box: examples/vanilla_client, examples/vanilla_server, examples/tbc_server, examples/wrath_server (names only, not opened). The wow_world_messages and wow_login_messages Rust crates are the generated output of the definitions (not opened beyond the file list).

## Licences (what the files say)
- Code: "Licensed under either of" Apache-2.0 or MIT, "at your option" (README.md line 48). Cargo.toml line 14: license = "MIT OR Apache-2.0". LICENSE-MIT line 1: "Copyright 2020 Gtker". LICENSE-APACHE is the Apache 2.0 text.
- README "Contribution" section: contributions are dual-licensed the same way.
- No separate asset licence. No per-folder licence file found for the wowm, docs or JSON trees.

## Rights-holder status
Unknown from the repo files. The only copyright holder named is Gtker (LICENSE-MIT line 1). The README says the definitions describe World of Warcraft 1.x network messages but does not say whether the protocol facts come from a licensed source. Nothing here is a clean-room claim.

## Asset inventory (counts from find or ls, no binary files exist)
- wow_message_parser/wowm/**/*.wowm: 1062 files (largest: world/spell 94, world/social 68, world/movement/smsg 65). Text DSL. Sample read: wow_message_parser/wowm/login/cmd_auth_logon/challenge_client.wowm.
- wowm_language/src/docs: 1439 entries (mdBook prose plus enum tables, e.g. addontype.md).
- ember_output/*.json: 653 files, one per message, with name, opcode, direction and typed field list (sample: cmsg_who.json).
- intermediate_representation.json: 29.8 MB machine-readable IR (head -c 300 only).
- Schemas: intermediate_representation_schema.json, intermediate_representation_schema_2020_12.json, intermediate_representation_schema.capnp, schema.proto.
- Extension scan of the whole box: rs 2371, md 1471, wowm 1062, json 656, txt 31, toml 14, yml 3, sh 1, proto 1, pest 1, capnp 1. No images, audio, models, fonts, maps or levels.

## Classes per group
- wowm DSL, ember_output JSON, IR JSON: C. Repo licence applies to the repo, but these describe a commercial game's protocol and the repo does not state the publisher's rights.
- mdBook docs and schema files: A (repo dual licence, text only).
- Overall best_class: A, for repo-written text only. There is no usable art, audio or map content (D for that).

## Data first
Names and enums live in the .wowm files and the ember_output JSON, not in any loader. Start with wow_message_parser/wowm/world/spell and world/item if you want item or spell name structure.

## Inspiration (own words, no copied text)
- One source definition generates many outputs (Rust crates, a JSON IR, a JSON schema, docs). For us: keep one data definition for item, creature and skill tables and generate the JSON the game reads, plus the reference docs. See README.md lines 3-7.
- Version-scoped enums: the ProtocolVersion enum at the top of challenge_client.wowm documents which client builds use each member, in its doc comments. For us: tag content rows with the content version they belong to.
- Conditional fields are data: the test fixtures (wow_message_parser/tests/simple_if_enum.txt and similar) show a field that exists only when an earlier type field has a given value. For us: a row type that carries different extra fields.
- Generated inspector: README.md documents an env var (WOWM_WIRESHARK) that generates a dissector from the same definitions. For us: generate a debug viewer for our data files.
- Headless test harness: examples/vanilla_client and examples/vanilla_server pair a client and a server for regression runs. For us: a scripted client against our own server.
- Auto-generated reference tables per enum value (wowm_language/src/docs/addontype.md line 23 shows one row per value). For us: generated reference tables for item and skill enums.

## Briefs
None. The donor has no creatures, items, armour, zones or effects in visual form, so there is nothing to brief (nothing usable is fine).

## Cross-link to our cell topics
- camera, zones, spawns, hud-ui, vfx, animation, sound: no assets in this donor.
- loot and spells: the overlap is the item and spell enum tables inside wow_message_parser/wowm/world/item and world/spell. Structure only, not content.
