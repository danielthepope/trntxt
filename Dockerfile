FROM node:22-alpine
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
# TODO The browser tests don't work within Docker; execute just the unit tests for now
# RUN npm run test
RUN npm run test:unit

EXPOSE 3000
ENTRYPOINT [ "npm", "start" ]
