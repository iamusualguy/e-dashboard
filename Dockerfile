# Build stage for webapp
FROM node:18-alpine AS webapp-builder

WORKDIR /app/webapp

# Copy webapp package files
COPY webapp/package*.json ./

# Install webapp dependencies
RUN npm ci

# Copy webapp source
COPY webapp/ ./

# Build webapp
RUN npm run build

# Production stage
FROM node:18-alpine

# Install Chromium and dependencies for Playwright
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

# Tell Playwright to use the installed Chromium
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy built webapp from builder stage
COPY --from=webapp-builder /app/webapp/dist ../webapp/dist

# Expose port
EXPOSE 3000

# Start the backend server
CMD ["node", "server.js"]
