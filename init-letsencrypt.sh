#!/bin/bash

# Initialize Let's Encrypt SSL certificate for crm.garryschool.ru
# Run this script after first deployment

set -e

domain="crm.garryschool.ru"
email="vadiqbozhko@gmail.com"
staging=0 # Set to 1 for testing

echo "### Initializing SSL certificate for $domain ..."

# Check if certificate already exists
if [ -d "./certbot/conf/live/$domain" ]; then
  echo "### Certificate for $domain already exists. Skipping..."
  exit 0
fi

# Use initial nginx config (without SSL)
echo "### Using initial nginx configuration..."
cp ./nginx/conf.d/crm.conf.initial ./nginx/conf.d/crm.conf

# Reload nginx
docker-compose exec nginx nginx -s reload 2>/dev/null || true

# Wait for nginx to start
sleep 5

# Request certificate
echo "### Requesting Let's Encrypt certificate for $domain ..."

if [ $staging != "0" ]; then
  staging_arg="--staging"
  echo "### Using staging server (test mode)"
else
  staging_arg=""
fi

docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  $staging_arg \
  --email $email \
  --agree-tos \
  --no-eff-email \
  -d $domain

# Use production nginx config (with SSL)
echo "### Certificate obtained! Switching to production nginx configuration..."
cp ./nginx/conf.d/crm.conf.initial ./nginx/conf.d/crm.conf.backup
cat > ./nginx/conf.d/crm.conf << 'EOF'
# HTTP - redirect to HTTPS
server {
    listen 80;
    server_name crm.garryschool.ru;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name crm.garryschool.ru;

    ssl_certificate /etc/letsencrypt/live/crm.garryschool.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.garryschool.ru/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass http://frontend:80/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

# Reload nginx with new config
echo "### Reloading nginx..."
docker-compose exec nginx nginx -s reload

echo "### SSL certificate successfully installed!"
echo "### Your site is now available at https://$domain"
