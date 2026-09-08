FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=43147
ENV TZ=America/New_York
EXPOSE 43147

CMD ["sh", "-c", "npx prisma db push --skip-generate && node scripts/ensure-admin.mjs && npm start"]
