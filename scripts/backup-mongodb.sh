#!/bin/bash
# MongoDB Yedekleme - Node.js ile (mongodump gerektirmez)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."
node scripts/backup-node.js
