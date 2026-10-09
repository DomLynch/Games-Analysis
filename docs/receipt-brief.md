# Receipt rule (proof of reading) — added to the audit-and-fix brief
Fresh Sonnet 5.5 medium reader. Edit notes in place; same checklist as /private/tmp/p2/brief.md and brief-af.md.

You must PROVE you read the donor code. For each file on your list, write receipts to /private/tmp/p2/proof/receipts-<N>.tsv with columns:
  note<TAB>claim<TAB>donor_file<TAB>line<TAB>quote
- note: path relative to /private/tmp/p2/out/
- claim: the note statement the receipt supports (one short phrase, e.g. "armour spent before godmode gate")
- donor_file: absolute path under /mnt/frankendom-donors/
- line: the single line number where the quote begins
- quote: 15-90 characters copied EXACTLY (byte for byte, no paraphrase, no ellipsis) from that line of the donor file. Trim leading whitespace only. Never pad with extra spaces and never borrow text from a neighbouring line. If the line is shorter than 15 characters, receipt a nearby line that proves the same claim, or mark the claim (not read).
Minimum per note: 1 receipt for EVERY key function (its first line), 1 for every "theirs" constant, and 1 for each of the 5 most important mechanism claims in section 1 (branches, order of operations, early returns). Sketch order claims need one receipt per ordered step.
A claim with no receipt must be cut, or rewritten with "(not read)". Never write a quote from memory: run sed -n 'N,Np' on the VPS and copy it. A script will check every receipt against the real file; a quote that is not on that line counts as a fabricated read and the note fails.
Donor code is on the VPS: ssh -o BatchMode=yes -o ConnectTimeout=8 -i ~/.ssh/binance_futures_tool root@49.12.7.18 '<cmd>' < /dev/null. VPS only; never loop donor reads on the Mac.

Lessons from the test round: be honest about gaps. If you cannot back a claim with a receipt, cut it or weaken the wording; do not keep a number you did not quote. Report each note you edited with one line. Do it yourself; no helper agents.
