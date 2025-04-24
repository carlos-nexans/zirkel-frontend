FROM node:20.18.0-alpine

# Dependencias del sistema
RUN apk add --no-cache \
  build-base \
  libc6-compat \
  vips-dev \
  python3 \
  bash

# Instalar pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY . .

# Sharp necesita estos flags para compilar bindings para Alpine
ENV npm_config_arch=x64 \
    npm_config_platform=linux \
    npm_config_libc=musl \
    npm_config_sharp_binary_host= \
    npm_config_sharp_libvips_binary_host= \
    HOST=0.0.0.0 \
    PORT=3000

# Limpiar módulos existentes para evitar conflictos
RUN rm -rf node_modules && pnpm install --frozen-lockfile

# Build
RUN pnpm run build --filter=api

EXPOSE 3000

WORKDIR /app/apps/api

CMD ["pnpm", "start"]
