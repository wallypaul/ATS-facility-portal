# Build stage — VITE_API_BASE / VITE_GOOGLE_MAPS_API_KEY are baked into the bundle
# here (.env is dockerignored, so these must come in as build args), pass them at
# build time:
#   docker build --build-arg VITE_API_BASE=https://api.example.com \
#                 --build-arg VITE_GOOGLE_MAPS_API_KEY=... -t ats-facility-portal .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
RUN npm run build

# Serve stage — static files only, nginx listens on 80 inside the container.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
