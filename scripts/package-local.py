"""Package source and bundled app without profiles, credentials, or test artifacts."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
out=root.parent/"Relay-hackathon.zip"
include=["dist","scripts","tests","README.md","DEMO.md","VERIFICATION.md","PRODUCT.md","CHANGELOG.md","package.json",".gitignore"]
with zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for item in include:
        p=root/item
        for f in sorted(p.rglob("*")) if p.is_dir() else [p]:
            if f.is_file() and "__pycache__" not in f.parts:
                archive.write(f,Path("relay")/f.relative_to(root))
print(str(out),out.stat().st_size,"bytes")
