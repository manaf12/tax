# Development-focused Dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
# This is done separately to leverage Docker's layer caching
COPY package*.json ./
RUN npm install

# The rest of the code is mounted via docker-compose volumes for hot-reloading

# Expose the port the app runs on
EXPOSE 3000

# Command to run the app in development mode
# This must match the script you fixed in package.json
CMD ["npm", "run", "start:dev", "--", "--host", "0.0.0.0"]
