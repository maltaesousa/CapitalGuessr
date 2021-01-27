FROM python:alpine3.12
RUN apk update && apk add postgresql-dev gcc python3-dev musl-dev
RUN pip install psycopg2
ENV PYTHONUNBUFFERED=1
COPY . /app
WORKDIR /app
CMD ["python3", "Backend_python_server.py"]
