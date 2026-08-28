# Minimal Bun Alpine image for low-resource VPS
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install --production

# Copy source files
COPY . .

# Provide a default DATABASE_URL for prisma generate to avoid PrismaConfigEnvError
ENV DATABASE_URL="file:./db.sql"

# Generate Prisma Client
RUN bun --bun run prisma generate

# Ensure upload directory exists
RUN mkdir -p uploads

EXPOSE 4000

# Direct Bun runtime for minimal RAM/CPU usage
CMD ["bun", "index.ts"]
