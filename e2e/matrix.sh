#!/usr/bin/env bash
# The manual test matrix of the specification (§11.2): installs each MediaWiki
# version with every skin, opens TACP on each and writes one screenshot per
# case and one contact sheet per version, for a person to look over.
# Needs a build in dist/ (npm run build).
# Usage: e2e/matrix.sh <work dir> [version...]   (default: 1.43.11 1.45.7 1.46.3)
set -euo pipefail

WORK="$(mkdir -p "$1" && cd "$1" && pwd)"
shift
VERSIONS=( "${@:-1.43.11 1.45.7 1.46.3}" )
VERSIONS=( ${VERSIONS[*]} )
CITIZEN=v3.9.0
HERE="$(cd "$(dirname "$0")" && pwd)"

[ -d "$WORK/Citizen" ] || git clone -q --depth 1 --branch "$CITIZEN" \
	https://github.com/StarCitizenTools/mediawiki-skins-Citizen.git "$WORK/Citizen"

pids=()
trap 'kill "${pids[@]}" 2> /dev/null || true' EXIT
wikis=()
port=8090
for version in "${VERSIONS[@]}"; do
	port=$(( port + 1 ))
	mw="$WORK/mw-$version"
	if [ ! -d "$mw" ]; then
		MW_SERVER="http://127.0.0.1:$port" "$HERE/setup-wiki.sh" "$version" "$mw"
		cp -r "$WORK/Citizen" "$mw/skins/Citizen"
		printf "wfLoadSkin( '%s' );\n" MonoBook Timeless Citizen >> "$mw/LocalSettings.php"
	fi
	php -d apc.enabled=0 -S "127.0.0.1:$port" -t "$mw" > /dev/null 2>&1 &
	pids+=( $! )
	wikis+=( "${version%.*}=$port" )
done
sleep 1
node "$HERE/matrix.js" "$WORK/shots" "${wikis[@]}"
