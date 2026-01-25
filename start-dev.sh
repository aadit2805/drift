#!/bin/bash
export PATH="/Users/aaditshah/.nvm/versions/node/v20.19.6/bin:$PATH"
echo "Using Node $(node --version)"

cd /Users/aaditshah/Documents/drift

case "$1" in
  api)
    cd apps/api && npm run dev
    ;;
  web)
    cd apps/web && npm run dev
    ;;
  *)
    echo "Usage: ./start-dev.sh [api|web]"
    ;;
esac
