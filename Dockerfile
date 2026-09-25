FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# An empty VITE_API_BASE_URL makes the SPA call the API on its own origin
# (/api/v1/...), so one image works behind any host that routes /api to FastAPI.
ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_MAX_PDF_BYTES=10485760
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_MAX_PDF_BYTES=${VITE_MAX_PDF_BYTES}
RUN npm run build

# Unprivileged nginx (uid 101, listens on 8080) so the container runs under
# runAsNonRoot with a read-only root filesystem.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
