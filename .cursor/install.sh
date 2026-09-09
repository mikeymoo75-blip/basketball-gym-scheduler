#!/usr/bin/env bash
set -euo pipefail

# Create a local .env from the example on first run, with a generated AUTH_SECRET.
if [ ! -f .env ]; then
  cp .env.example .env
  secret="$(openssl rand -base64 32)"
  sed -i "s#^AUTH_SECRET=.*#AUTH_SECRET=\"${secret}\"#" .env
fi

# Install dependencies and prepare the SQLite database (generate client, push schema, seed).
npm install
npm run db:setup
