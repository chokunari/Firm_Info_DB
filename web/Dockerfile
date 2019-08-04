FROM alpine:latest
RUN apk update
RUN apk add --no-cache nodejs \ 
    curl \
    vim \
    npm 
EXPOSE 8080
COPY ./web/ /var/www/html/

