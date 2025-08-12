# deps (cached)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# build
FROM deps AS build
WORKDIR /app
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# runtime
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/ || exit 1
