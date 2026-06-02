#!/usr/bin/env bash
# build-desktop.sh — Gera o instalador desktop do StudyQuest (sem dependências para o usuário final)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ELECTRON_DIR="$ROOT/electron"
BACKEND_OUT="$ROOT/api/target/backend"
PYTHON_DIR="$ELECTRON_DIR/resources/python"
PYTHON_VERSION="3.12.10"

echo "==> [0/5] Chaves JWT..."
if [ ! -f "$ROOT/api/src/main/resources/privateKey.pem" ]; then
  bash "$ROOT/scripts/generate-jwt-keys.sh"
fi

echo "==> [1/5] Build nativo do backend (GraalVM via Docker)..."
cd "$ROOT/api"
./mvnw package -Pnative -DskipTests -Dquarkus.native.container-build=true -q

mkdir -p "$BACKEND_OUT"
cp "target/studyquest-runner" "$BACKEND_OUT/"
cp src/main/resources/privateKey.pem "$BACKEND_OUT/"
cp src/main/resources/publicKey.pem "$BACKEND_OUT/"
chmod +x "$BACKEND_OUT/studyquest-runner"
echo "    OK — $BACKEND_OUT/"

echo "==> [2/5] Python embutido..."
mkdir -p "$PYTHON_DIR"
if [ ! -f "$PYTHON_DIR/bin/python3" ]; then
  echo "    Use o Python do sistema em dev; para release Linux empacote em $PYTHON_DIR"
fi

echo "==> [3/5] Build do frontend (Vite)..."
cd "$ROOT/frontend"
npm ci --silent
npm run build
echo "    OK — $ROOT/frontend/dist/"

echo "==> [4/5] Dependências do Electron..."
cd "$ELECTRON_DIR"
npm ci --silent

echo "==> [5/5] Empacotando com electron-builder..."
npm run dist -- "$@"

echo ""
echo "Pronto! Instalador em: $ELECTRON_DIR/dist-electron/"
