import base64
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUTPUT = ROOT / "index.html"

CSS_TAG = '<link rel="stylesheet" href="./styles.css">'
JS_TAG = '<script type="module" src="./app.js"></script>'


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def escape_script_body(value: str) -> str:
    return value.replace("</script", "<\\/script")


def main() -> None:
    html = read_text(SRC / "index.html")
    css = read_text(SRC / "styles.css")
    js = read_text(SRC / "app.js")
    json_text = read_text(SRC / "mastery_all.json")

    # Load and encode all SVG assets
    assets_dir = ROOT / "assets"
    svgs = {}
    if assets_dir.exists():
        for path in sorted(assets_dir.glob("*.svg")):
            key = path.stem.replace(" ", "_")
            svg_data = path.read_bytes()
            base64_data = base64.b64encode(svg_data).decode("utf-8")
            svgs[key] = f"data:image/svg+xml;base64,{base64_data}"
        print(f"Loaded and base64-encoded {len(svgs)} SVG assets.")
    else:
        print("Warning: assets directory not found.")

    if CSS_TAG not in html:
        raise ValueError(f"Could not find stylesheet tag in {SRC / 'index.html'}")

    if JS_TAG not in html:
        raise ValueError(f"Could not find script tag in {SRC / 'index.html'}")

    inline_css = f"<style>\n{css.rstrip()}\n</style>"
    inline_svgs = (
        "<script>\n"
        f"window.__MASTERY_SVGS__ = {escape_script_body(json.dumps(svgs, indent=2))};\n"
        "</script>"
    )
    inline_data = (
        "<script>\n"
        f"window.__MASTERY_DATA__ = {escape_script_body(json_text.strip())};\n"
        "</script>"
    )
    inline_js = f"<script type=\"module\">\n{escape_script_body(js.rstrip())}\n</script>"

    html = html.replace(CSS_TAG, inline_css, 1)
    html = html.replace(JS_TAG, f"{inline_svgs}\n  {inline_data}\n  {inline_js}", 1)

    OUTPUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUTPUT} (size: {OUTPUT.stat().st_size / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    main()
