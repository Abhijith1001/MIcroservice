FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
RUN cd shared && npm ci || npm i
COPY product-service ./product-service
WORKDIR /app/product-service
RUN npm ci || npm i
ENV NODE_ENV=production
EXPOSE 4300
CMD ["npm","start"]
