#!/usr/bin/env bash
# build-desktop.sh — Gera o executável desktop do StudyQuest
# Pré-requisitos: Java 21, Node.js 18+, Maven wrapper (./mvnw)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ELECTRON_DIR="$ROOT/electron"

echo "==> [1/4] Build do backend (Quarkus)..."
cd "$ROOT/api"
./mvnw package -DskipTests -q
echo "    OK — $ROOT/api/target/quarkus-app/quarkus-run.jar"

echo "==> [2/4] Build do frontend (Vite)..."
cd "$ROOT/frontend"
npm ci --silent
npm run build
echo "    OK — $ROOT/frontend/dist/"

echo "==> [3/4] Instalando dependências do Electron..."
cd "$ELECTRON_DIR"
npm ci --silent

echo "==> [4/4] Empacotando com electron-builder..."
# Detecta plataforma e empacota apenas para ela por padrão.
# Para cross-compile passe: --win / --mac / --linux
npm run dist -- "${@}"

echo ""
echo "Pronto! Executável gerado em: $ELECTRON_DIR/dist-electron/"
