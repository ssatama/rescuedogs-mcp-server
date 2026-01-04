FROM node:20-slim
WORKDIR /app
RUN npm install -g rescuedogs-mcp-server
ENTRYPOINT ["rescuedogs-mcp-server"]
