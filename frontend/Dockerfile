FROM node:20-alpine AS build
WORKDIR /source

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.29-alpine AS runtime
ENV BACKEND_UPSTREAM=http://agaval-backend:8080
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /source/dist/agaval-inventory/browser /usr/share/nginx/html

EXPOSE 8080
