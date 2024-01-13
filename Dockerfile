# Use node:18-alpine as the base image for both stages
FROM node:18-alpine as base

# Builder stage
FROM base as builder

# Set working directory
WORKDIR /home/node

# Copy package.json and yarn.lock (assuming you're using yarn workspaces)
COPY package.json yarn.lock ./

# Copy the entire workspace
COPY . .

# Install all dependencies, including devDependencies
RUN yarn install

# Build the application
RUN yarn build

# Runtime stage
FROM base as runtime

# Set NODE_ENV to production
ENV NODE_ENV=production

# Set working directory
WORKDIR /home/node

# Copy package.json, yarn.lock and other necessary files for production
COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --production

# Copy built assets from the builder stage
COPY --from=builder /home/node/dist ./dist
COPY --from=builder /home/node/build ./build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]
