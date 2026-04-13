# Mondega Digital — Setup Guide

## 1. Conectar con GitHub

```bash
cd C:/Users/PC/OneDrive/LEN/MONDEGA

# Inicializar git
git init
git add .
git commit -m "feat: initial Mondega Digital monorepo"

# Conectar tu repo (reemplaza con tu URL)
git remote add origin https://github.com/TU_USUARIO/LEN.git
git branch -M main
git push -u origin main
```

## 2. Variables de entorno locales

```bash
cp .env.example .env
# Edita .env con tus valores reales
```

## 3. Firebase — Pasos

### Cuenta de servicio (para backend/notificaciones)
1. Firebase Console → Configuración ⚙️ → Cuentas de servicio
2. "Generar nueva clave privada" → descarga JSON
3. Renombra el archivo a `firebase-service-account.json`
4. Colócalo en la raíz del proyecto (está en .gitignore, no se sube)

### App web (para push notifications en browser)
1. Firebase Console → Configuración ⚙️ → Tus aplicaciones → Agregar app → Web (</>)
2. Nombre: "Mondega Web"
3. Copia los valores al .env:
   - NEXT_PUBLIC_FIREBASE_API_KEY
   - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   - NEXT_PUBLIC_FIREBASE_APP_ID

### VAPID Key (Web Push)
1. Firebase Console → Configuración ⚙️ → Cloud Messaging
2. Web Push certificates → "Generate key pair"
3. Copia la clave a: NEXT_PUBLIC_FIREBASE_VAPID_KEY

### App móvil (Android + iOS)
1. Firebase Console → Agrega app Android
   - Package name: com.mondega.app
   - Descarga `google-services.json` → coloca en `apps/mobile/android/app/`
2. Firebase Console → Agrega app iOS
   - Bundle ID: com.mondega.app
   - Descarga `GoogleService-Info.plist` → coloca en `apps/mobile/ios/`

## 4. GitHub Actions — Secrets requeridos

Ve a tu repo GitHub → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Valor |
|--------|-------|
| `STAGING_HOST` | IP o dominio de tu servidor staging |
| `STAGING_USER` | Usuario SSH del servidor (ej: ubuntu) |
| `STAGING_SSH_KEY` | Clave privada SSH (contenido completo del .pem) |
| `SLACK_WEBHOOK_URL` | URL webhook de Slack para notificaciones |
| `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` | Base64 del JSON de cuenta de servicio |

Para generar el base64 del service account:
```bash
node -e "console.log(Buffer.from(require('fs').readFileSync('./firebase-service-account.json')).toString('base64'))"
```

## 5. Levantar entorno de desarrollo

```bash
# Instalar dependencias
pnpm install

# Levantar bases de datos
pnpm docker:up
# o: docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d

# Levantar todos los servicios
pnpm dev

# Solo herramientas adicionales (Kafka UI, Redis Commander, Mailhog)
docker-compose -f infrastructure/docker/docker-compose.dev.yml --profile tools up -d
```

## 6. Generar claves de seguridad

```bash
# JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Encryption key (AES-256-GCM)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
