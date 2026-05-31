import base64
from datetime import datetime
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUTPUT_NORM = ROOT / "index.html"
OUTPUT_SM = ROOT / "index_sm.html"

CSS_TAG = '<link rel="stylesheet" href="./styles.css">'
JS_TAG = '<script type="module" src="./app.js"></script>'


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def escape_script_body(value: str) -> str:
    return value.replace("</script", "<\\/script")


def minify_css(css: str) -> str:
    css = re.sub(r'/\*[\s\S]*?\*/', '', css)
    css = re.sub(r'\s+', ' ', css)
    css = re.sub(r'\s*([{}:;,>+~])\s*', r'\1', css)
    return css.strip()


def minify_js(js: str) -> str:
    # Remove block comments
    js = re.sub(r'/\*[\s\S]*?\*/', '', js)
    # Remove full line comments and strip lines
    lines = []
    for line in js.split('\n'):
        line_stripped = line.strip()
        if line_stripped.startswith('//'):
            continue
        if line_stripped:
            lines.append(line_stripped)
    js = '\n'.join(lines)
    return js


def minify_html(html: str) -> str:
    html = re.sub(r'<!--[\s\S]*?-->', '', html)
    html = re.sub(r'>\s+<', '><', html)
    return html.strip()


def build_version(html: str, css: str, js: str, json_text: str, i18n_data: dict, svgs: dict, minify: bool) -> str:
    if minify:
        css = minify_css(css)
        js = minify_js(js)
        json_obj = json.loads(json_text)
        json_text = json.dumps(json_obj, separators=(',', ':'))
        
        svgs_json = json.dumps(svgs, separators=(',', ':'))
        i18n_json = json.dumps(i18n_data, separators=(',', ':'))
    else:
        svgs_json = json.dumps(svgs, indent=2)
        i18n_json = json.dumps(i18n_data, indent=2)

    inline_css = f"<style>\n{css.rstrip()}\n</style>"
    if minify:
        inline_css = f"<style>{css}</style>"

    inline_svgs = (
        "<script>\n"
        f"window.__MASTERY_SVGS__ = {escape_script_body(svgs_json)};\n"
        "</script>"
    )
    inline_data = (
        "<script>\n"
        f"window.__MASTERY_DATA__ = {escape_script_body(json_text.strip())};\n"
        "</script>"
    )
    inline_i18n = (
        "<script>\n"
        f"window.__I18N_DATA__ = {escape_script_body(i18n_json)};\n"
        "</script>"
    )
    
    if minify:
        inline_js = f"<script type=\"module\">\n{escape_script_body(js)}\n</script>"
        html = html.replace(CSS_TAG, inline_css, 1)
        html = html.replace(JS_TAG, f"{inline_svgs}{inline_data}{inline_i18n}{inline_js}", 1)
        html = minify_html(html)
    else:
        inline_js = f"<script type=\"module\">\n{escape_script_body(js.rstrip())}\n</script>"
        html = html.replace(CSS_TAG, inline_css, 1)
        html = html.replace(JS_TAG, f"{inline_svgs}\n  {inline_data}\n  {inline_i18n}\n  {inline_js}", 1)

    # Replace last update timestamp
    last_update = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    html = html.replace("{{LAST_UPDATE}}", last_update)

    return html


def main() -> None:
    html = read_text(SRC / "index.html")
    css = read_text(SRC / "styles.css")
    js = read_text(SRC / "app.js")
    json_text = read_text(SRC / "mastery_all.json")

    # Load i18n data
    i18n_data = {}
    for i18n_file in SRC.glob("i18n_*.json"):
        lang = i18n_file.stem.split("_")[1]
        i18n_data[lang] = json.loads(read_text(i18n_file))

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

    # Build regular version
    out_norm = build_version(html, css, js, json_text, i18n_data, svgs, minify=False)
    OUTPUT_NORM.write_text(out_norm, encoding="utf-8")
    print(f"Wrote {OUTPUT_NORM} (size: {OUTPUT_NORM.stat().st_size / 1024 / 1024:.2f} MB)")

    # Build minified version
    out_sm = build_version(html, css, js, json_text, i18n_data, svgs, minify=True)
    OUTPUT_SM.write_text(out_sm, encoding="utf-8")
    print(f"Wrote {OUTPUT_SM} (size: {OUTPUT_SM.stat().st_size / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    main()
