FROM node:22-slim
WORKDIR /app
RUN npm install -g rescuedogs-mcp-server
ENTRYPOINT ["rescuedogs-mcp-server"]
