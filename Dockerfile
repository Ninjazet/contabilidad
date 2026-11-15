FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .

ENV VITE_SUPABASE_URL=http://localhost:3002
ENV VITE_SUPABASE_ANON_KEY=super-secret-jwt-token-key-2026-sirh-contagestion

RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
