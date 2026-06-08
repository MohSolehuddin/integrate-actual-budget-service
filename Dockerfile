# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:alpine AS base
WORKDIR /app

# install native build dependencies (needed by better-sqlite3 / node-gyp)
FROM base AS install
RUN apk add --no-cache python3 make g++ linux-headers py3-setuptools

# install all dependencies into temp directory
RUN mkdir -p /temp/dev
COPY package.json bun.lock* /temp/dev/
RUN cd /temp/dev && bun install

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json /temp/prod/
RUN cd /temp/prod && bun install --production --no-lockfile

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# copy production dependencies and source code into final image
# also install runtime native deps needed by better-sqlite3
FROM base AS release
RUN apk add --no-cache libstdc++ libgcc
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/src ./src
COPY --from=prerelease /app/package.json .
COPY --from=prerelease /app/tsconfig.json .

# run the app
USER bun
EXPOSE 3001/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
