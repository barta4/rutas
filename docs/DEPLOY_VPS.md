# Guía de Despliegue en VPS (Ubuntu 24.04)

Esta guía te llevará paso a paso para desplegar **Rutas SaaS** en un servidor limpio.

## 1. Requisitos Previos
Necesitas un servidor Ubuntu 24.04 con acceso `root` o `sudo`.

## 2. Instalación Automática
Hemos preparado un script que instala todo lo necesario (Node, Postgres, PostGIS, Nginx, PM2).

1. Sube el script al servidor o créalo:
   ```bash
   nano install.sh
   # Pega el contenido de scripts/install-vps.sh
   chmod +x install.sh
   ./install.sh
   ```

## 3. Configuración de Base de Datos
PostGIS es obligatorio para las funciones de geolocalización.

```bash
sudo -u postgres psql
```

Dentro de la consola SQL:
```sql
CREATE DATABASE rutas_db;
CREATE USER rutas_user WITH ENCRYPTED PASSWORD 'DB_PASSWORD_AQUI';
GRANT ALL PRIVILEGES ON DATABASE rutas_db TO rutas_user;
-- Conectarse a la base para activar PostGIS
\c rutas_db
CREATE EXTENSION postgis;
\q
```

## 4. Instalación del Proyecto

```bash
# 1. Clonar (o subir código)
git clone https://github.com/tu-usuario/rutas-app.git
cd rutas-app

# 2. Instalar dependencias
npm install

# 3. Variables de Entorno
cp .env.example .env
nano .env
# Edita DATABASE_URL: postgres://rutas_user:DB_PASSWORD_AQUI@localhost:5432/rutas_db

# 4. Inicializar DB (Tablas y Datos Base)
npm run init-db

# 5. Build y Despliegue
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 5. Configurar Nginx (Dominio y SSL)

Edita la configuración: `sudo nano /etc/nginx/sites-available/facilenvio`

```nginx
server {
    server_name facilenvio.urufile.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activa el sitio y el SSL:
```bash
sudo ln -s /etc/nginx/sites-available/facilenvio /etc/nginx/sites-enabled/
sudo systemctl restart nginx
sudo certbot --nginx -d facilenvio.urufile.com
```

¡Listo! Tu SaaS está online y seguro.
