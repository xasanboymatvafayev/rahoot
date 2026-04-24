#!/bin/sh

# Railway provides PORT env var, default to 3000
PORT=${PORT:-3000}

# Update nginx to listen on Railway's PORT
sed -i "s/listen 3000;/listen ${PORT};/" /etc/nginx/http.d/default.conf

# Pass MANAGER_PASSWORD to socket process via supervisord env
sed -i "s/environment=NODE_ENV=\"production\",CONFIG_PATH=\"\/tmp\/rahoot-config\"/environment=NODE_ENV=\"production\",CONFIG_PATH=\"\/tmp\/rahoot-config\",MANAGER_PASSWORD=\"${MANAGER_PASSWORD}\"/" /etc/supervisord.conf

echo "Starting Rahoot on port ${PORT}..."
exec supervisord -c /etc/supervisord.conf
