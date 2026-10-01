# syntax=docker/dockerfile:1

# Build once on the build machine's platform: the output is static files.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# No .git in the build context, so the commit comes in as an argument.
ARG FRETWORK_COMMIT=""
ENV FRETWORK_COMMIT=$FRETWORK_COMMIT
RUN npm run build && node_modules/.bin/tsx scripts/nginx-headers.ts > /src/nginx-headers.conf

FROM nginxinc/nginx-unprivileged:alpine
USER root
RUN apk add --no-cache jq && rm -rf /usr/share/nginx/html/*
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 deploy/40-fretwork-config.sh /docker-entrypoint.d/40-fretwork-config.sh
COPY --from=build /src/nginx-headers.conf /etc/nginx/fretwork/headers.conf
COPY --from=build /src/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
