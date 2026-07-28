#!/usr/bin/env bash
#
# Deploy MedCounsel to production (single EC2 · nginx · systemd `medconsul`).
#
#   ./scripts/deploy.sh              # build + DRY-RUN (shows exactly what would change, changes nothing)
#   CONFIRM=1 ./scripts/deploy.sh    # actually deploy
#
# It deploys the CURRENTLY CHECKED-OUT code. It prints the branch + commit it is
# about to ship so you can confirm before anything leaves your machine.
#
# Order of operations (CONFIRM=1):
#   1. Build client (Vite) and server (tsc) locally from the current checkout.
#   2. Discover the server app dir (systemd WorkingDirectory) and the nginx web
#      root on prod. Print them. Show a dry-run of the rsync.
#   3. Back up the current remote server/dist + web root to ~/releases/<stamp> (rollback point).
#   4. rsync the new build in (the prod .env / node_modules / package.json are never touched).
#   5. sudo systemctl restart medconsul.
#   6. Poll https://.../api/health. If it never returns 200, AUTO-ROLL BACK and restart.
#
# Override any of these via env if auto-discovery is wrong or the host changes:
#   MEDC_PEM=~/Downloads/my-web-server-key.pem   MEDC_HOST=ec2-user@32.236.16.232
#   MEDC_SERVICE=medconsul                       MEDC_HEALTH=https://medconsul.earthlingaidtech.com/api/health
#   MEDC_SERVER_DIR=/path/on/prod                MEDC_WEB_ROOT=/path/on/prod
#
set -euo pipefail

KEY="${MEDC_PEM:-$HOME/Downloads/my-web-server-key.pem}"
HOST="${MEDC_HOST:-ec2-user@32.236.16.232}"
SERVICE="${MEDC_SERVICE:-medconsul}"
HEALTH="${MEDC_HEALTH:-https://medconsul.earthlingaidtech.com/api/health}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15"

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { printf '\033[31m  ERROR: %s\033[0m\n' "$*" >&2; exit 1; }

command -v rsync >/dev/null || die "rsync not found"
[ -f "$KEY" ] || die "SSH key not found at $KEY (set MEDC_PEM)"

BRANCH="$(git -C "$REPO" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
SHA="$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo '?')"
say "Deploying  $BRANCH @ $SHA  ->  $HOST  (service: $SERVICE)"
[ "$(git -C "$REPO" status --porcelain | grep -cv 'server/data/db.json')" -eq 0 ] \
  || echo "  note: working tree has uncommitted changes (they will be built and shipped)"

say "[1/6] Building locally"
npm --prefix "$REPO/server" run build
npm --prefix "$REPO/client" run build
[ -f "$REPO/server/dist/server.js" ] || die "server build produced no dist/server.js"
[ -f "$REPO/client/dist/index.html" ] || die "client build produced no dist/index.html"

say "[2/6] Discovering prod layout"
SERVER_DIR="${MEDC_SERVER_DIR:-$($SSH "$HOST" "systemctl show -p WorkingDirectory --value $SERVICE" 2>/dev/null || true)}"
[ -n "$SERVER_DIR" ] && [ "$SERVER_DIR" != "/" ] || die "could not discover server dir from systemd; set MEDC_SERVER_DIR"
# Take the root that belongs to the SERVER block, not one nested in a `location`. The port-80
# block matches server_name first and its only root is the Let's Encrypt webroot
# (`location /.well-known/acme-challenge { root /var/www/certbot; }`), so the old first-root-wins
# awk discovered /var/www/certbot. Deploying there would have missed the real docroot entirely AND
# --delete'd the ACME challenge dir, breaking certificate auto-renewal on a live HTTPS site.
# Skipping location blocks falls through to the 443 block's server-level root.
WEB_ROOT="${MEDC_WEB_ROOT:-$($SSH "$HOST" "sudo nginx -T 2>/dev/null | awk '/server_name[^;]*medconsul/{f=1} f&&/[[:space:]]*location[[:space:]]/{inloc=1} f&&inloc&&/}/{inloc=0; next} f&&!inloc&&/^[[:space:]]*root[[:space:]]/{print \$2; exit}' | tr -d ';'" 2>/dev/null || true)}"
[ -n "$WEB_ROOT" ] && [ "$WEB_ROOT" != "/" ] || die "could not discover nginx web root; set MEDC_WEB_ROOT"
# Belt and braces: never rsync --delete over an ACME webroot even if discovery regresses again.
case "$WEB_ROOT" in
  */certbot*|*acme*|/var/www/html) die "refusing to deploy to '$WEB_ROOT' — that looks like an ACME/default webroot, not the app docroot. Set MEDC_WEB_ROOT explicitly." ;;
esac

printf '    server dir : %s   (<- server/dist)\n' "$SERVER_DIR"
printf '    web root   : %s   (<- client/dist)\n' "$WEB_ROOT"
printf '    release tag: %s\n' "$STAMP"

say "Dry-run (no changes made):"
rsync -azn --delete --itemize-changes -e "$SSH" "$REPO/server/dist/" "$HOST:$SERVER_DIR/dist/" | sed 's/^/    [server] /' | head -30
rsync -azn --delete --itemize-changes --rsync-path="sudo rsync" -e "$SSH" "$REPO/client/dist/" "$HOST:$WEB_ROOT/" | sed 's/^/    [web]    /' | head -30

if [ "${CONFIRM:-0}" != "1" ]; then
  say "DRY-RUN ONLY. Nothing was changed."
  echo "  Verify the paths + changes above, then run:   CONFIRM=1 ./scripts/deploy.sh"
  exit 0
fi

say "[3/6] Backing up current release -> ~/releases/$STAMP"
$SSH "$HOST" "set -e; mkdir -p ~/releases/$STAMP; \
  [ -d '$SERVER_DIR/dist' ] && cp -a '$SERVER_DIR/dist' ~/releases/$STAMP/server-dist || true; \
  sudo cp -a '$WEB_ROOT' ~/releases/$STAMP/web-root || true; \
  echo '    backed up.'"

say "[4/6] Syncing new build"
rsync -az --delete -e "$SSH" "$REPO/server/dist/" "$HOST:$SERVER_DIR/dist/"
rsync -az --delete --rsync-path="sudo rsync" -e "$SSH" "$REPO/client/dist/" "$HOST:$WEB_ROOT/"

say "[5/6] Restarting $SERVICE"
$SSH "$HOST" "sudo systemctl restart $SERVICE"

say "[6/6] Health check ($HEALTH)"
ok=0
for i in $(seq 1 15); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH" || echo 000)"
  if [ "$code" = "200" ]; then ok=1; break; fi
  printf '    waiting for service... (%s) attempt %s/15\n' "$code" "$i"
  sleep 2
done

if [ "$ok" = "1" ]; then
  say "DEPLOYED  $BRANCH @ $SHA  (release $STAMP). Health check OK."
  # Keep the 5 most recent release backups.
  $SSH "$HOST" "ls -1dt ~/releases/*/ 2>/dev/null | tail -n +6 | xargs -r rm -rf" || true
else
  say "HEALTH CHECK FAILED (last: $code) — ROLLING BACK"
  $SSH "$HOST" "set -e; \
    [ -d ~/releases/$STAMP/server-dist ] && rsync -a --delete ~/releases/$STAMP/server-dist/ '$SERVER_DIR/dist/'; \
    [ -d ~/releases/$STAMP/web-root ] && sudo rsync -a --delete ~/releases/$STAMP/web-root/ '$WEB_ROOT/'; \
    sudo systemctl restart $SERVICE"
  die "rolled back to the previous release. Investigate before retrying."
fi
