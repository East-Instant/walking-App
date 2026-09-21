FROM node:24-bookworm-slim
WORKDIR /app
ENV EXPO_NO_TELEMETRY=1
COPY package.json package-lock.json ./
RUN npm ci
ENV BROWSER=none
COPY . .
EXPOSE 8081
CMD ["npm", "run", "web", "--", "--host", "lan", "--port", "8081"]
