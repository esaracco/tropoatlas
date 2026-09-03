# Stage 1: Build the Monorepo
FROM node:20-alpine AS builder

ARG APP_NAME=tropoaudio

# Set the working directory
WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install dependencies and build the target application
RUN npm ci
RUN npm run build -w apps/${APP_NAME}

# Inject dynamic User-Agent into Nginx template
RUN node -e '\
  const fs = require("fs"); \
  const app = process.argv[1]; \
  const pkg = JSON.parse(fs.readFileSync(`./apps/${app}/package.json`, "utf8")); \
  const formattedName = app === "tropocine" ? "TropoCine" : (app === "tropoaudio" ? "TropoAudio" : pkg.name); \
  const ua = `${formattedName}/${pkg.version} (${pkg.homepage})`; \
  const tpl = fs.readFileSync(`./docker/${app}/nginx.conf.template`, "utf8"); \
  fs.writeFileSync("/tmp/default.conf.template", tpl.replaceAll("__USER_AGENT__", ua)); \
' "${APP_NAME}"

# Stage 2: Serve with Nginx and Proxy API
FROM nginx:alpine

ARG APP_NAME=tropoaudio
ARG PORT=3000

# Copy the built React app from the builder stage
COPY --from=builder /app/apps/${APP_NAME}/build /usr/share/nginx/html

# Copy our custom Nginx configuration template with injected User-Agent
# Nginx entrypoint replaces environment variables (e.g. ${DISCOGS_TOKEN} or ${TMDB_TOKEN})
COPY --from=builder /tmp/default.conf.template /etc/nginx/templates/default.conf.template

# Expose target port
EXPOSE ${PORT}

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
