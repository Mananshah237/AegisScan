# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Resolve dependencies fresh on Linux. The committed lockfile is generated on Windows,
# and `npm ci` against it hits npm's optional-deps bug (missing esbuild/rollup native
# binaries -> "rollup/dist/native.js MODULE_NOT_FOUND"). A clean install in the image,
# combined with .dockerignore excluding the host node_modules, installs the correct
# linux-x64 binaries.
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .

# Vite inlines VITE_* at build time. Default to the AegisScan backend host port.
ARG VITE_API_URL=http://localhost:8001
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
