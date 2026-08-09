#!/bin/sh
set -e

CERT_DIR="${CERT_DIR:-/data/certs}"
CERT_HOSTS="${CERT_HOSTS:-localhost}"
DAYS=3650

mkdir -p "$CERT_DIR"

CA_KEY="$CERT_DIR/ca-key.pem"
CA_CERT="$CERT_DIR/ca.pem"
SERVER_KEY="$CERT_DIR/key.pem"
SERVER_CSR="$CERT_DIR/server.csr"
SERVER_CERT="$CERT_DIR/cert.pem"

if [ -f "$SERVER_CERT" ] && [ -f "$SERVER_KEY" ]; then
  echo "Certificates already exist, skipping generation."
  exit 0
fi

echo "Generating certificates for: $CERT_HOSTS"

# Local CA
openssl genrsa -out "$CA_KEY" 2048
openssl req -x509 -new -key "$CA_KEY" -sha256 -days $DAYS \
  -out "$CA_CERT" \
  -subj "/CN=Baby Tracker Local CA"

# Server certificate signed by that CA
SAN=""
for host in $CERT_HOSTS; do
  case "$host" in
    *[!0-9.]*) SAN="$SAN DNS:$host," ;;
    *)          SAN="$SAN IP:$host," ;;
  esac
done
SAN="${SAN%,}"

openssl genrsa -out "$SERVER_KEY" 2048
openssl req -new -key "$SERVER_KEY" -out "$SERVER_CSR" \
  -subj "/CN=baby-tracker" \
  -addext "subjectAltName=$SAN"
EXTFILE="$CERT_DIR/ext.cnf"
printf 'subjectAltName=%s\n' "$SAN" > "$EXTFILE"
openssl x509 -req -in "$SERVER_CSR" -CA "$CA_CERT" -CAkey "$CA_KEY" -CAcreateserial \
  -out "$SERVER_CERT" -days $DAYS -sha256 -extfile "$EXTFILE"
rm -f "$EXTFILE"

rm -f "$SERVER_CSR"
echo "Certificates written to $CERT_DIR"
