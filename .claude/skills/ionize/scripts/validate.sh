#!/usr/bin/env bash
# Validate the ionize plugin package: JSON parses, SKILL.md frontmatter, plugin.json manifest.
# The marketplace manifest lives at the vault root and is the vault's concern, not the plugin's.
# Pure stdlib (python3) so it runs in CI with no extra setup.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 2
errors=0
fail() { echo "  ✗ $1"; errors=$((errors + 1)); }
ok()   { echo "  ✓ $1"; }

echo "== JSON files parse =="
while IFS= read -r f; do
  if python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$f" 2>/dev/null; then
    ok "$f"
  else
    fail "$f does not parse as JSON"
  fi
done < <(find . -name '*.json' -not -path './node_modules/*' -not -path './dist/*')

echo "== SKILL.md frontmatter (name + description, closed ---) =="
python3 - <<'PY' || errors=$((errors + 1))
import re, sys
text = open("SKILL.md", encoding="utf-8").read()
m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
if not m:
    print("  ✗ SKILL.md: missing or unclosed frontmatter"); sys.exit(1)
fm = m.group(1)
miss = [k for k in ("name", "description") if not re.search(rf"^{k}:", fm, re.M)]
if miss:
    print("  ✗ SKILL.md: missing frontmatter field(s): " + ", ".join(miss)); sys.exit(1)
print("  ✓ SKILL.md frontmatter ok")
PY

echo "== plugin.json required fields =="
python3 - <<'PY' || errors=$((errors + 1))
import json, re, sys
bad = 0
p = json.load(open(".claude-plugin/plugin.json"))
if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", p.get("name", "")):
    print("  ✗ plugin.json: name missing or not kebab-case"); bad = 1
else:
    print("  ✓ plugin.json name:", p["name"])
sys.exit(bad)
PY

echo
if [ "$errors" -eq 0 ]; then
  echo "All checks passed."
else
  echo "$errors check(s) failed."
fi
exit $([ "$errors" -eq 0 ] && echo 0 || echo 1)
