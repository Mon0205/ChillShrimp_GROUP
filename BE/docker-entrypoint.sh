#!/bin/sh
set -e

echo "Applying Prisma migrations..."
node scripts/migrate.js deploy
exec node src/server.js
