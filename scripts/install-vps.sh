#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando Instalación de Dependencias para Rutas SaaS (Ubuntu 24.04)...${NC}"

# 1. Actualizar sistema
echo -e "${GREEN}📦 Actualizando repositorios...${NC}"
sudo apt update && sudo apt upgrade -y

# 2. Instalar herramientas básicas
echo -e "${GREEN}🛠️ Instalando herramientas base (Curl, Git)...${NC}"
sudo apt install -y curl git build-essential

# 3. Instalar Node.js 20 (LTS)
echo -e "${GREEN}🟢 Instalando Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar versiones
node_ver=$(node -v)
npm_ver=$(npm -v)
echo "Node: $node_ver | NPM: $npm_ver"

# 4. Instalar PM2 Globalmente
echo -e "${GREEN}🚀 Instalando PM2...${NC}"
sudo npm install -g pm2

# 5. Instalar PostgreSQL y PostGIS (CRÍTICO para mapas)
echo -e "${GREEN}🐘 Instalando PostgreSQL y PostGIS...${NC}"
sudo apt install -y postgresql postgresql-contrib postgresql-16-postgis-3

# 6. Iniciar servicio PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 7. Instalar Nginx (Para Reverse Proxy y SSL)
echo -e "${GREEN}🌐 Instalando Nginx...${NC}"
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 8. Instalar Certbot (Para HTTPS gratis)
echo -e "${GREEN}🔒 Instalando Certbot...${NC}"
sudo apt install -y certbot python3-certbot-nginx

# 9. Configuración Firewall (UFW)
echo -e "${GREEN}🛡️ Configurando Firewall básico...${NC}"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
# sudo ufw enable  # Deje comentado para que el usuario lo active manualmente si quiere

echo -e "${GREEN}✅ ¡Instalación completada!${NC}"
echo -e "------------------------------------------------"
echo -e "Siguientes pasos:"
echo -e "1. Clona tu repo: git clone <url_repo>"
echo -e "2. Configura PostgreSQL:"
echo -e "   sudo -u postgres psql"
echo -e "   CREATE DATABASE rutas_saas;"
echo -e "   CREATE USER admin WITH ENCRYPTED PASSWORD 'tu_password';"
echo -e "   GRANT ALL PRIVILEGES ON DATABASE rutas_saas TO admin;"
echo -e "   \c rutas_saas"
echo -e "   CREATE EXTENSION postgis;"
echo -e "   \q"
echo -e "------------------------------------------------"
