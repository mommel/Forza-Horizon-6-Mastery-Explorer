from datetime import datetime
import hashlib
import json
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUTPUT = ROOT / "index_mobile.html"
SVG_REGISTRY_OUTPUT = ROOT / "mobile_svgs.js"

CSS_TAG = '<link rel="stylesheet" href="./styles.css">'
JS_TAG = '<script type="module" src="./app.js"></script>'

MOBILE_PERFORMANCE_CSS = """
<style id="mobile-performance-overrides">
  /* Keep GPU and paint costs predictable on resource-constrained mobile browsers. */
  @media (max-width: 980px) {
    body::before,
    .background-glow {
      display: none !important;
    }

    .panel,
    .burger-menu-toggle,
    .drawer-overlay,
    .mobile-drawer {
      -webkit-backdrop-filter: none !important;
      backdrop-filter: none !important;
    }

    .icon-button,
    .car-card,
    .manufacturer-header,
    .filter-chip {
      animation: none !important;
    }

    .car-card {
      contain: layout style paint;
      content-visibility: auto;
      contain-intrinsic-size: auto 430px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
""".strip()

MOBILE_JS_REPLACEMENTS = {
    # Render fewer mastery grids per frame and fetch the next group closer to
    # the viewport. A four-card batch creates at most 64 mastery image nodes.
    "const CHUNK_SIZE = 10;": "const CHUNK_SIZE = 4;",
    '}, { rootMargin: "400px" });': '}, { rootMargin: "160px" });',
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def escape_script_body(value: str) -> str:
    return value.replace("</script", "<\\/script")


def make_mobile_js(js: str) -> str:
    for source, replacement in MOBILE_JS_REPLACEMENTS.items():
        occurrences = js.count(source)
        if occurrences != 1:
            raise ValueError(
                f"Expected exactly one mobile JavaScript marker {source!r}, "
                f"found {occurrences}"
            )
        js = js.replace(source, replacement, 1)
    return js


def write_svg_url_registry(assets_dir: Path) -> tuple[int, str]:
    if not assets_dir.is_dir():
        raise FileNotFoundError(f"Assets directory not found: {assets_dir}")

    svg_urls = {}
    for path in sorted(assets_dir.glob("*.svg")):
        key = path.stem.replace(" ", "_")
        svg_urls[key] = f"./assets/{quote(path.name)}"

    if not svg_urls:
        raise ValueError(f"No SVG assets found in {assets_dir}")

    registry_json = json.dumps(svg_urls, ensure_ascii=False, separators=(",", ":"))
    registry = (
        "// URL-only registry: assets stay out of JavaScript memory and load lazily.\n"
        f"window.__MASTERY_SVGS__ = Object.freeze({registry_json});\n"
    )
    SVG_REGISTRY_OUTPUT.write_text(registry, encoding="utf-8")
    content_hash = hashlib.sha256(registry.encode("utf-8")).hexdigest()[:12]
    return len(svg_urls), content_hash


def main() -> None:
    html = read_text(SRC / "index.html")
    css = read_text(SRC / "styles.css")
    js = make_mobile_js(read_text(SRC / "app.js"))
    json_text = read_text(SRC / "mastery_all.json")

    # Load i18n data
    i18n_data = {}
    for i18n_file in SRC.glob("i18n_*.json"):
        lang = i18n_file.stem.split("_")[1]
        i18n_data[lang] = json.loads(read_text(i18n_file))

    # GitHub Pages already serves assets/. Keep only their URLs in JavaScript so
    # mobile browsers do not parse and retain ~12 MB of base64 strings at startup.
    svg_count, svg_content_hash = write_svg_url_registry(ROOT / "assets")
    print(f"Wrote URL registry for {svg_count} mobile SVG assets.")

    if CSS_TAG not in html:
        raise ValueError(f"Could not find stylesheet tag in {SRC / 'index.html'}")

    if JS_TAG not in html:
        raise ValueError(f"Could not find script tag in {SRC / 'index.html'}")

    inline_css = f"<style>\n{css.rstrip()}\n</style>\n  {MOBILE_PERFORMANCE_CSS}"
    inline_svgs_script = (
        f'<script src="./mobile_svgs.js?v={svg_content_hash}"></script>'
    )
    inline_data = (
        "<script>\n"
        f"window.__MASTERY_DATA__ = {escape_script_body(json_text.strip())};\n"
        "</script>"
    )
    inline_i18n = (
        "<script>\n"
        f"window.__I18N_DATA__ = {escape_script_body(json.dumps(i18n_data, indent=2))};\n"
        "</script>"
    )
    inline_js = f"<script type=\"module\">\n{escape_script_body(js.rstrip())}\n</script>"

    html = html.replace(CSS_TAG, inline_css, 1)
    html = html.replace(JS_TAG, f"{inline_svgs_script}\n  {inline_data}\n  {inline_i18n}\n  {inline_js}", 1)

    # Replace last update timestamp
    last_update = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    html = html.replace("{{LAST_UPDATE}}", last_update)

    OUTPUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUTPUT} (size: {OUTPUT.stat().st_size / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    main()
