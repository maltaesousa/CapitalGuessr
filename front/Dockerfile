FROM httpd:2.4.46-alpine
RUN rm -r /usr/local/apache2/htdocs/*
COPY . /usr/local/apache2/htdocs
RUN mv /usr/local/apache2/htdocs/httpd.conf /usr/local/apache2/conf/

# Read only for user daemon
RUN chown -R root:daemon \
  /usr/local/apache2/htdocs/*
RUN chmod -R 440 \
  /usr/local/apache2/htdocs/*
RUN find /usr/local/apache2/htdocs/ -mindepth 1 -type d -exec chmod +x {} \;
