# API-only container (frontend served from GitHub Pages)
FROM oven/bun:1
WORKDIR /app
COPY package.json package-lock.json ./
RUN bun install --production
COPY server ./server

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["bun", "server/index.ts"]
