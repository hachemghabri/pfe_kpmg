FROM node:16-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Install serve for production static file serving
RUN npm install -g serve

# Copy the rest of the code
COPY . .

# Set the backend API URL for production
ENV REACT_APP_API_URL=http://backend:8000

# Build the app
RUN npm run build

# Expose port
EXPOSE 80

# Command to run the server using serve instead of nginx
CMD ["serve", "-s", "build", "-l", "80"] 