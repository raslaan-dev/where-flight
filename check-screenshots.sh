#!/usr/bin/env bash
# Lists which screenshots the documentation expects and which are still missing.
#   bash check-screenshots.sh
cd "$(git rev-parse --show-toplevel)"
missing=0; have=0
while read -r f; do
  if [ -f "$f" ]; then printf '  \033[32m✓\033[0m %s\n' "$f"; have=$((have+1))
  else printf '  \033[31m✗\033[0m %s\n' "$f"; missing=$((missing+1)); fi
done < <(grep -ho '](docs/screenshots/[^)]*\.png)' README.md USER_TESTING.md \
         | sed 's/^](//; s/)$//' | sort -u)
echo
echo "  $have present, $missing missing"
