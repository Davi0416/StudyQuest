#!/bin/bash
# Gera par de chaves RSA 2048-bit para JWT (SmallRye JWT)
# Execute uma vez e coloque as chaves em api/src/main/resources/

set -e

OUT_DIR="../api/src/main/resources"

echo "Gerando chave privada RSA 2048..."
openssl genrsa -out "$OUT_DIR/privateKey.pem" 2048

echo "Convertendo para PKCS8..."
openssl pkcs8 -topk8 -inform PEM -in "$OUT_DIR/privateKey.pem" -out "$OUT_DIR/privateKey.pem" -nocrypt

echo "Extraindo chave pública..."
openssl rsa -in "$OUT_DIR/privateKey.pem" -pubout -out "$OUT_DIR/publicKey.pem"

echo "Chaves geradas em $OUT_DIR"
echo "  privateKey.pem — NUNCA comite no git!"
echo "  publicKey.pem  — pode ser pública"
