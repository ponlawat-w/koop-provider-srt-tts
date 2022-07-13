FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm i --force

COPY . .

EXPOSE 8080

CMD [ "npm", "start" ]
