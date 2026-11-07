from pathlib import Path
import urllib.request,tarfile,io
root=Path(__file__).resolve().parents[1]/".local"/"node_modules"/"playwright-core"
root.mkdir(parents=True,exist_ok=True)
url="https://registry.npmjs.org/playwright-core/-/playwright-core-1.56.1.tgz"
data=urllib.request.urlopen(url,timeout=60).read()
with tarfile.open(fileobj=io.BytesIO(data),mode="r:gz") as archive:
    for member in archive.getmembers():
        name=member.name.removeprefix("package/")
        if not name or member.isdir(): continue
        dest=(root/name).resolve()
        if not dest.is_relative_to(root.resolve()) or not member.isfile(): raise ValueError("Unexpected archive member")
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_bytes(archive.extractfile(member).read())
fixture=Path(__file__).resolve().parents[1]/".local"/"portrait.jpg"
if not fixture.exists():
    fixture.write_bytes(urllib.request.urlopen("https://storage.googleapis.com/mediapipe-assets/portrait.jpg",timeout=40).read())
print("Isolated Playwright dependency and public MediaPipe fixture installed.")

