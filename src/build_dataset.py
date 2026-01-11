# /scripts/build_dataset.py

#!/usr/bin/env python3
import argparse
from pathlib import Path
import rdflib

RDF_EXT_TO_FORMAT = {
    ".ttl": "turtle",
    ".rdf": "xml",
    ".owl": "xml",
    ".nt": "nt",
    ".nq": "nquads",
    ".trig": "trig",
    ".jsonld": "json-ld",
}

def guess_format(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in RDF_EXT_TO_FORMAT:
        return RDF_EXT_TO_FORMAT[ext]
    return "turtle"  # fallback

def iter_rdf_files(folder: Path):
    for p in folder.rglob("*"):
        if p.is_file() and p.suffix.lower() in RDF_EXT_TO_FORMAT:
            yield p

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input-folder", required=True)
    ap.add_argument("--out-jsonld", required=True)
    ap.add_argument("--out-nq", default=None, help="Optional N-Quads output for faster JS parsing")
    args = ap.parse_args()

    in_folder = Path(args.input_folder)
    g = rdflib.ConjunctiveGraph()

    files = list(iter_rdf_files(in_folder))
    if not files:
        raise SystemExit(f"No RDF files found in {in_folder}")

    for f in files:
        fmt = guess_format(f)
        try:
            g.parse(str(f), format=fmt)
            print(f"Loaded {f} ({fmt})")
        except Exception as e:
            raise SystemExit(f"Failed parsing {f} as {fmt}: {e}")

    out_jsonld = Path(args.out_jsonld)
    out_jsonld.parent.mkdir(parents=True, exist_ok=True)
    out_jsonld.write_text(g.serialize(format="json-ld", indent=2), encoding="utf-8")
    print(f"Wrote {out_jsonld}")

    if args.out_nq:
        out_nq = Path(args.out_nq)
        out_nq.parent.mkdir(parents=True, exist_ok=True)
        out_nq.write_text(g.serialize(format="nquads"), encoding="utf-8")
        print(f"Wrote {out_nq}")

if __name__ == "__main__":
    main()
