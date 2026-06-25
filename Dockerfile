# ==========================================================================
# Dockerfile - CallIntelligence AI Production Build & Serve
# ==========================================================================

# Stage 1: Build the Vite production bundle
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy codebase and compile
COPY . .
RUN npm run build

# Stage 2: Serve compiled assets using Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
