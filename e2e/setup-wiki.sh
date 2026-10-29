#!/usr/bin/env bash
# Installs MediaWiki <version> into <dir> with SQLite, then the built gadget
# (dist/) as a wiki would have it after a deploy, plus the test pages. TACP is
# made default so anonymous visitors get it.
# Usage: e2e/setup-wiki.sh <version, e.g. 1.43.11> <dir>
set -euo pipefail

VERSION="$1"
MW="$2"
SERVER="${MW_SERVER:-http://127.0.0.1:8080}"
DIST="$(cd "$(dirname "$0")/../dist" && pwd)"
PAGES="$(cd "$(dirname "$0")/pages" && pwd)"

mkdir -p "$MW"
curl -sSfL "https://releases.wikimedia.org/mediawiki/${VERSION%.*}/mediawiki-$VERSION.tar.gz" |
	tar xz -C "$MW" --strip-components 1
php "$MW/maintenance/install.php" --dbtype sqlite --dbpath "$MW/data" --server "$SERVER" \
	--scriptpath '' --pass 'tacp-e2e-admin' --skins Vector,MinervaNeue --extensions Gadgets \
	TACP Admin > /dev/null

edit() {
	php "$MW/maintenance/run.php" edit --summary "TACP e2e" "$1" < "$2" > /dev/null
}

for f in TACP.js TACP.css TACP-core.js TACP-core.css TACP-config.json; do
	edit "MediaWiki:Gadget-$f" "$DIST/$f"
done
sed 's/^\* TACP\[ResourceLoader|/* TACP[ResourceLoader|default|/' "$DIST/Gadgets-definition.txt" > "$MW/tacp-definition.txt"
edit 'MediaWiki:Gadgets-definition' "$MW/tacp-definition.txt"

for f in "$PAGES"/*.wiki; do
	name="$(basename "$f" .wiki)"
	edit "${name//_/ }" "$f"
done
