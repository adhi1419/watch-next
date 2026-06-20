# Build frontend
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN bun install
COPY . .
ENV VITE_FIREBASE_API_KEY=AIzaSyBG3i2KLxYvgaYd0r08Kf9fzHmXBongNUQ
ENV VITE_FIREBASE_AUTH_DOMAIN=watch-next-500021.firebaseapp.com
ENV VITE_FIREBASE_PROJECT_ID=watch-next-500021
RUN bun run build

# Production
FROM oven/bun:1
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["bun", "server/index.ts"]
