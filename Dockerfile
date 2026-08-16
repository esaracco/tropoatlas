# Stage 1: Build the Monorepo
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install dependencies and build the static application
RUN npm install
RUN npm run build

# Inject dynamic User-Agent from package.json into Nginx template
RUN node -e '\
  const pkg = JSON.parse(require("fs").readFileSync("./apps/tropodisc/package.json", "utf8")); \
  const name = pkg.name === "tropodisc" ? "TropoDisc" : pkg.name; \
  const ua = `${name}/${pkg.version} (${pkg.homepage})`; \
  const tpl = require("fs").readFileSync("./docker/nginx.conf.template", "utf8"); \
  require("fs").writeFileSync("/tmp/default.conf.template", tpl.replaceAll("__USER_AGENT__", ua)); \
'

# Stage 2: Serve with Nginx and Proxy API
FROM nginx:alpine

# Copy the built React app from the builder stage
COPY --from=builder /app/apps/tropodisc/build /usr/share/nginx/html

# Copy our custom Nginx configuration template with injected User-Agent
# Nginx entrypoint replaces ${DISCOGS_TOKEN} with the environment variable
COPY --from=builder /tmp/default.conf.template /etc/nginx/templates/default.conf.template

# Expose port 3000
EXPOSE 3000

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
