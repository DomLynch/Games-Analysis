import sys
OUT = "/private/tmp/p2/wave2-haiku/batch3/Q042/receipts.tsv"

def append(note, rows):
    with open(OUT, "a") as f:
        for claim, path, line, quote in rows:
            assert "\t" not in quote and "\t" not in claim and "\n" not in quote
            if not (15 <= len(quote) <= 90):
                print("LENGTH WARN", len(quote), quote)
            f.write("\t".join([note, claim, path, str(line), quote]) + "\n")
    print("appended", len(rows), "for", note)
