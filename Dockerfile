FROM node:20-slim

# Install dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Create required directories
RUN mkdir -p data outputs core/profiles

# Expose API port
EXPOSE 3001

# Start with node
CMD ["node", "api/server.js"]
