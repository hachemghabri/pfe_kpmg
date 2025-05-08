FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies using legacy peer deps if needed
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build the React application for production
# Use NODE_OPTIONS to increase memory if needed
# Set CI=false to treat warnings as non-errors during build
ENV NODE_OPTIONS=--max_old_space_size=4096
ENV CI=false
RUN npm run build

# Install serve to run the static files
RUN npm install -g serve

# Expose the port the app will run on
EXPOSE 80

# Command to serve the build folder
# -s indicates single-page application mode
# -l specifies the listener port (maps to EXPOSE 80)
CMD ["serve", "-s", "build", "-l", "80"] 