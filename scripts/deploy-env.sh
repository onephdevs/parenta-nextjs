#!/usr/bin/env bash
# Shared deploy/SSH secret loader. Source from deploy scripts.
# Never commit real values — use scripts/.deploy-secrets (gitignored).

_deploy_secrets_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "${_deploy_secrets_dir}/.deploy-secrets" ]]; then
  # shellcheck disable=SC1091
  source "${_deploy_secrets_dir}/.deploy-secrets"
fi

SSH_USER="${SSH_USER:-u876334876}"
SSH_HOST="${SSH_HOST:-145.79.25.103}"
SSH_PORT="${SSH_PORT:-65002}"
SSH_PASS="${SSH_PASS:-}"
APP_DIR="${APP_DIR:-domains/parenta.com.mx/nodejs-app}"
SERVER_APP_DIR="${SERVER_APP_DIR:-/home/${SSH_USER}/apps/parenta-nextjs}"

require_ssh_pass() {
  if [[ -z "${SSH_PASS}" ]]; then
    echo "ERROR: SSH_PASS is not set."
    echo "Create scripts/.deploy-secrets from scripts/.deploy-secrets.example"
    echo "or export SSH_PASS in your environment."
    exit 1
  fi
}
