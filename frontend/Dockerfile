FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build with standalone output for smaller image
ENV NEXT_TELEMETRY_DISABLED=1
# BACKEND_HOST is used in next.config.ts rewrites to proxy API calls
ARG BACKEND_HOST=teamoreview-backend
ENV BACKEND_HOST=${BACKEND_HOST}
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
