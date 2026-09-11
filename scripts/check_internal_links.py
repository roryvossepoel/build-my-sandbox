#!/usr/bin/env python3
from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

DIST = Path("dist").resolve()
RUNTIME_ANCHORS = {
    ("faq.html", "fixes"),
}


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[tuple[str, str]] = []
        self.ids: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        element_id = values.get("id")
        if element_id:
            self.ids.add(element_id)

        for attribute in ("href", "src"):
            value = values.get(attribute)
            if value:
                self.references.append((attribute, value))


def parse_html(path: Path) -> LinkParser:
    parser = LinkParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def resolve_target(source: Path, raw_path: str) -> Path:
    if not raw_path:
        return source

    decoded = unquote(raw_path)
    if decoded.startswith("/"):
        target = DIST / decoded.lstrip("/")
    else:
        target = source.parent / decoded

    if decoded.endswith("/"):
        target = target / "index.html"

    return target.resolve()


def main() -> int:
    if not DIST.is_dir():
        raise SystemExit("dist/ does not exist. Run the production build first.")

    # Only public entry pages are checked. Vite may emit imported HTML snippets
    # under dist/assets/; those are implementation artifacts, not navigable pages.
    html_files = sorted(DIST.glob("*.html"))
    if not html_files:
        raise SystemExit("No HTML files found in dist/.")

    parsed = {path: parse_html(path) for path in html_files}
    errors: list[str] = []
    checked = 0

    for source, document in parsed.items():
        for attribute, reference in document.references:
            parts = urlsplit(reference)
            if parts.scheme or parts.netloc:
                continue
            if reference.startswith(("mailto:", "tel:", "javascript:", "data:")):
                continue

            target = resolve_target(source, parts.path)
            try:
                target.relative_to(DIST)
            except ValueError:
                errors.append(f"{source.relative_to(DIST)}: {attribute}=\"{reference}\" escapes dist/")
                continue

            if not target.exists():
                errors.append(
                    f"{source.relative_to(DIST)}: {attribute}=\"{reference}\" -> missing {target.relative_to(DIST)}"
                )
                continue

            checked += 1

            if not parts.fragment or target.suffix.lower() != ".html":
                continue

            # index.html is rendered by the client-side builder, so its anchors
            # are created at runtime. FAQ #fixes is also installed by the shared
            # shell so deep links continue to work without duplicating markup.
            if target.name == "index.html" or (target.name, parts.fragment) in RUNTIME_ANCHORS:
                continue

            target_doc = parsed.get(target)
            if target_doc is None:
                target_doc = parse_html(target)
                parsed[target] = target_doc
            if parts.fragment not in target_doc.ids:
                errors.append(
                    f"{source.relative_to(DIST)}: {attribute}=\"{reference}\" -> missing anchor #{parts.fragment} in {target.relative_to(DIST)}"
                )

    if errors:
        print("Internal link check failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(f"Internal link check passed: {len(html_files)} HTML files, {checked} local references checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
