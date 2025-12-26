FROM node:22.21.1-alpine3.23 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install -g @angular/cli@17
RUN npm ci
COPY . .
RUN ng build --configuration production

FROM nginx:alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10

COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=build /app/dist/last-hearth-landing/browser /usr/share/nginx/html
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
