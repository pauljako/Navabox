FROM nginx:alpine
COPY . /usr/share/nginx/html

# Make available under the /navabox path, useful for setups where The Server and Navabox are on the same host.
COPY . /usr/share/nginx/html/navabox

EXPOSE 80