# ---- Build Stage ----
FROM node:22 AS builder

# Set working directory for the monorepo root
WORKDIR /app

# Copy entire monorepo
COPY . .

# Install all dependencies at root level
RUN pnpm install --frozen-lockfile

# Build the API project using Turborepo
RUN cd /app && pnpm run build --filter=api

# ---- Production Stage ----
FROM node:22-alpine3.20

# Set working directory to api folder
WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app .

# Expose the API port
EXPOSE 3000

# Set the working directory to the api folder
WORKDIR /app/apps/api

# Start the server (removed cd command since we're already in the correct directory)
CMD ["pnpm", "start"]