FROM node:16-alpine
RUN apk update
RUN apk add graphicsmagick-dev

WORKDIR /usr/src/app

# Install dependencies.
COPY package*.json ./
COPY config ./config
COPY gulpfile.js ./
# Skip postinstall script during initial install
RUN npm install --ignore-scripts
# Run copy task manually
RUN mkdir -p config && touch config/config.yaml

# Copy project directory.
COPY . ./
RUN npm run build
RUN npm run test

EXPOSE 3000
ENTRYPOINT [ "npm", "start" ]
