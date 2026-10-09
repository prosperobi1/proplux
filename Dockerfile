# Proplux production image. The host only needs Docker: everything the app
# requires (Node 22 and a modern glibc for the Next.js compiler) is inside.
FROM node:22-bookworm-slim

# OpenSSL is required at runtime by the Prisma engines.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3000
CMD ["node", "start.js"]
