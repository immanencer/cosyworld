# Use the official Node.js image as a parent image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install PM2 globally
RUN npm install -g pm2

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the app with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
