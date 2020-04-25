FROM node:8

WORKDIR /usr/src/app

# Install dependencies.
COPY package*.json ./

RUN npm install

# Copy project directory.
COPY . ./
RUN npm run build
RUN npm run test

EXPOSE 3000
ENTRYPOINT [ "npm", "start" ]
