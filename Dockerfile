# Stage 1: Build the Monorepo
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install dependencies and build the static application
RUN npm install
RUN npm run build

# Stage 2: Serve with Nginx and Proxy API
FROM nginx:alpine

# Copy the built React app from the builder stage
COPY --from=builder /app/apps/tropodisc/build /usr/share/nginx/html

# Copy our custom Nginx configuration template
# Nginx's entrypoint will automatically replace ${DISCOGS_TOKEN} with the environment variable
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

# Expose port 3000
EXPOSE 3000

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
