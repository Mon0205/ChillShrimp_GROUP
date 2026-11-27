FROM node:22-alpine

# Prisma picks its query engine by the OpenSSL version it finds; Alpine ships without it,
# so on Render the engine fails to load ("libssl not found") unless OpenSSL is installed.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
# Neon Auth beta currently has peer-dependency ranges that npm 10 resolves
# differently across environments. The lock file remains authoritative.
RUN npm ci --legacy-peer-deps

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]
