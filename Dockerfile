FROM node:8

# Change the working directory.
WORKDIR /home/node/app

# Workaround because `WORKDIR` always runs as root.
RUN chown -R node /home/node

# Change the user to avoid running as `root`.
USER node

# Install dependencies.
COPY *.json ./
RUN npm install --ignore-scripts

# Copy project directory.
COPY . ./

# Change to `root` so we can change the ownership of the copied files.
USER root

# Change ownership to user `node`.
RUN chown -R node .

# Change the user to `node` to run the application.
USER node

# Rebuild packages.
RUN npm rebuild

# Setup node entrypoint.
ENTRYPOINT ["npm", "start"]
