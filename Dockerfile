FROM node:8

WORKDIR /usr/src/app

# Install dependencies.
COPY package*.json ./

RUN npm install

# Copy project directory.
COPY . ./

CMD [ "npm", "start" ]
