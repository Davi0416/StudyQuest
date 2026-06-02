#!/usr/bin/env bash
# build-desktop.sh — Gera o executável desktop do StudyQuest (sem dependências externas)
# Pré-requisitos: GraalVM 21+, Node.js 18+, Maven wrapper (./mvnw)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ELECTRON_DIR="$ROOT/electron"
BACKEND_OUT="$ROOT/api/target/backend"

echo "==> [1/4] Build nativo do backend (GraalVM)..."
cd "$ROOT/api"
./mvnw package -Pnative -DskipTests -q

# Organiza o binário e a chave privada numa pasta limpa para o electron-builder
mkdir -p "$BACKEND_OUT"
cp target/studyquest-runner* "$BACKEND_OUT/"
[ -f src/main/resources/privateKey.pem ] && cp src/main/resources/privateKey.pem "$BACKEND_OUT/"
echo "    OK — $BACKEND_OUT/"

echo "==> [2/4] Build do frontend (Vite)..."
cd "$ROOT/frontend"
npm ci --silent
npm run build
echo "    OK — $ROOT/frontend/dist/"

echo "==> [3/4] Instalando dependências do Electron..."
cd "$ELECTRON_DIR"
npm ci --silent

echo "==> [4/4] Empacotando com electron-builder..."
npm run dist -- "${@}"

echo ""
echo "Pronto! Executável em: $ELECTRON_DIR/dist-electron/"
