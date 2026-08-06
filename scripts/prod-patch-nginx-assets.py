#!/usr/bin/env python3
"""
Patch the production nginx vhost so a deploy stops breaking already-open browsers.

  scp -i <key> scripts/prod-patch-nginx-assets.py ec2-user@<host>:/tmp/
  ssh  -i <key> ec2-user@<host> 'sudo python3 /tmp/prod-patch-nginx-assets.py && sudo nginx -t'
  ssh  -i <key> ec2-user@<host> 'sudo systemctl reload nginx'

THE BUG
The vhost had one catch-all `location / { try_files $uri $uri/ /index.html; }`. That is correct
for SPA *routes*, but it also swallowed missing /assets/*.js: `rsync --delete` removes the previous
build's content-hashed chunks, so a browser holding a stale index.html requests a chunk that no
longer exists and nginx answers with index.html — HTTP 200, Content-Type text/html. The browser
reports "Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of
text/html" and renders a blank page.

Compounding it, index.html carried no Cache-Control (only an etag), so browsers cached it
heuristically and kept asking for the dead chunks after every deploy.

THE FIX
  /assets/     -> try_files $uri =404   (a missing chunk 404s honestly) + immutable long cache,
                  which is safe precisely because the filename contains a content hash
  /index.html  -> no-cache, must-revalidate, so a deploy is picked up on the next load

Idempotent: re-running detects the existing block and makes no change.
"""
import datetime
import shutil
import sys

CONF = '/etc/nginx/conf.d/medconsul.conf'

BLOCK = '''    # Content-hashed build assets. A MISSING one must 404 — never fall through to the SPA
    # handler below. Falling through returned index.html (text/html, HTTP 200) for a chunk that
    # rsync --delete had removed, which surfaced as "Expected a JavaScript-or-Wasm module script"
    # and a blank page for anyone holding a stale index.html after a deploy.
    location /assets/ {
        try_files $uri =404;
        # The filename carries a content hash, so a given URL's bytes never change.
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # index.html must NEVER be cached: it is the map from route -> current chunk hashes. A stale
    # copy points at chunks that no longer exist, breaking the app until a hard refresh.
    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate";
    }

    location / {'''


def main():
    src = open(CONF).read()

    if 'location /assets/' in src:
        print('already patched — no change made')
        return 0

    # There are two `location / {` blocks: the port-80 one is a bare redirect to HTTPS, and the
    # 443 one is the real SPA handler. Only the SPA handler may be patched — anchor on its
    # try_files line rather than on `location / {`, which is ambiguous.
    ANCHOR = '    location / {\n        try_files $uri $uri/ /index.html;'
    if src.count(ANCHOR) != 1:
        print(f'ERROR: expected exactly one SPA try_files block; found {src.count(ANCHOR)}. Not touching it.')
        return 1

    backup = f'{CONF}.bak-{datetime.datetime.now():%Y%m%d-%H%M%S}'
    shutil.copy2(CONF, backup)
    print(f'backed up -> {backup}')

    open(CONF, 'w').write(src.replace(ANCHOR, BLOCK + '\n        try_files $uri $uri/ /index.html;', 1))
    print('patched')
    return 0


if __name__ == '__main__':
    sys.exit(main())
