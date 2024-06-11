FROM node:20-alpine
RUN mkdir -p /home/node/app/node_modules && chmod -r /home/node/app
WORKDIR /home/node/app
COPY package*.json ./
RUN npm install
COPY . .
COPY .env.production .env
CMD [ "node", "index" ]