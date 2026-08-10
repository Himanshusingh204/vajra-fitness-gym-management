# Stage 1: Build the Vite React application
FROM node:20-alpine AS builder

# Build-time API URL. Vite bakes this into the bundle, so it MUST be passed at
# build time (e.g. --build-arg VITE_API_URL=https://api.example.com/api).
# It is NOT read from the runtime container environment.
ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Provide a custom nginx configuration to handle React Router (SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
