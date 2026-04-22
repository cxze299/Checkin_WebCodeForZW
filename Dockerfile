FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=6717
ENV STATIC_DIR=/app

EXPOSE 6717

CMD ["npm", "run", "start"]
