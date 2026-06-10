# Use the official Bun image
FROM oven/bun:alpine AS base
WORKDIR /app

# Install all dependencies (dev + prod)
FROM base AS install
COPY package.json bun.lock* ./
RUN bun install

# Copy source code
FROM install AS build
COPY . .

# Final production image
FROM base AS release
RUN apk add --no-cache libstdc++
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json .
COPY --from=build /app/tsconfig.json .

USER bun
EXPOSE 3001/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]