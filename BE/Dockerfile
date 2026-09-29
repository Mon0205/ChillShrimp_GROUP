FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# Neon Auth beta currently has peer-dependency ranges that npm 10 resolves
# differently across environments. The lock file remains authoritative.
RUN npm ci --legacy-peer-deps

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]
