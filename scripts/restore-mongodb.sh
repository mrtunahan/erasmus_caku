#!/bin/bash
# MongoDB Geri Yükleme - Node.js ile
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."
node scripts/restore-node.js "$@"
