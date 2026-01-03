#!/bin/bash

# 1. Login to Docker Hub (Interactive)
echo "🔑 Por favor, inicia sesión en Docker Hub..."
docker login

# 2. Build Backend
echo "🏗️  Construyendo Backend..."
docker build -t alfredobartaburu/logistica-backend:latest .

# 3. Build Frontend
echo "🏗️  Construyendo Frontend..."
docker build -f frontend/Dockerfile -t alfredobartaburu/logistica-frontend:latest frontend/

# 4. Push Backend
echo "🚀 Subiendo Backend..."
docker push alfredobartaburu/logistica-backend:latest

# 5. Push Frontend
echo "🚀 Subiendo Frontend..."
docker push alfredobartaburu/logistica-frontend:latest

echo "✅ ¡Todo subido exitosamente!"
