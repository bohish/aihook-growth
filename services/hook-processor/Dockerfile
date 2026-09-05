FROM mcr.microsoft.com/playwright:v1.55.0-noble
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json server.mjs ./
RUN npm install --omit=dev
ENV NODE_ENV=production
CMD ["node", "server.mjs"]
