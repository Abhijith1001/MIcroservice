FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
RUN cd shared && npm ci || npm i
COPY tenant-service ./tenant-service
WORKDIR /app/tenant-service
RUN npm ci || npm i
ENV NODE_ENV=production
EXPOSE 4100
CMD ["npm","start"]
