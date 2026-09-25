#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Uso: scripts/start-feature.sh nombre-corto" >&2
  exit 2
fi

git fetch origin dev
git switch -c "feature/$1" origin/dev
