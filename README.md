# MONDEGA DIGITAL — Guía de Inicio para Desarrolladores

> **Documento confidencial** — Ecosistema de monedas digitales de Guatemala y Mesoamérica

## Las 8 Monedas Digitales del Ecosistema

| Código | Nombre | País | Fiat | Símbolo |
|--------|--------|------|------|---------|
| QUETZA | Quetzal Digital | Guatemala | GTQ | Q̈ |
| MEXCOIN | MexCoin | México | MXN | M̈ |
| LEMPI | Lempi | Honduras | HNL | L̈ |
| COLON | Colón Digital | El Salvador | SVC/USD | C̈ |
| NICORD | NiCord | Nicaragua | NIO | Ñ |
| TIKAL | Tikal | Belice | BZD | T̈ |
| CORI | Cori | Costa Rica | CRC | Ö |
| DOLAR | Dólar Digital | Regional | USD | Ð |

Cada moneda digital existe 1:1 con su fiat nacional. El tipo de cambio entre ellas se calcula en tiempo real usando USD como unidad interna de cálculo, **invisible para el usuario**.

---

## Requisitos previos

- Node.js v20 LTS
- pnpm v9+
- Docker Desktop
- VS Code con extensiones: ESLint, Prettier, Docker, GitLens

---

## Levantar el entorno de desarrollo

### 1. Clonar y configurar

```bash
git clone https://github.com/mondega/mondega-digital.git
cd mondega
cp .env.example .env.local
# Editar .env.local con tus valores
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Levantar bases de datos

```bash
pnpm docker:up
# Esto levanta: PostgreSQL, MongoDB, Redis, Kafka
```

### 4. Inicializar bases de datos

```bash
# PostgreSQL — ejecuta el schema SQL
docker exec -it mondega-postgres psql -U mondega_user -d mondega_db -f /docker-entrypoint-initdb.d/01-schema.sql

# Verificar que las tablas existen
docker exec -it mondega-postgres psql -U mondega_user -d mondega_db -c "\dt"
```

### 5. Levantar servicios

```bash
# Todos los servicios en paralelo
pnpm dev

# O un servicio específico
pnpm --filter auth-service dev
pnpm --filter wallet-service dev
pnpm --filter fx-engine dev
```

### 6. Herramientas de desarrollo (opcional)

```bash
# Kafka UI en http://localhost:8080
# Redis Commander en http://localhost:8081
# Mailhog (emails) en http://localhost:8025
docker-compose -f infrastructure/docker/docker-compose.dev.yml --profile tools up -d
```

---

## Estructura del proyecto

```
mondega/
├── apps/
│   ├── web/              → Next.js 14 (React) — Web app
│   ├── mobile/           → React Native + Expo — iOS y Android
│   └── admin/            → Panel de administración interno
│
├── services/
│   ├── auth-service/     → NestJS — Registro, login, KYC, JWT (puerto 3001)
│   ├── wallet-service/   → NestJS — Wallets, saldos, historial (puerto 3002)
│   ├── fx-engine/        → NestJS — Tipos de cambio entre monedas (puerto 3003)
│   ├── tx-engine/        → Go — Motor de transacciones alta velocidad (puerto 3004)
│   ├── fiat-bridge/      → NestJS — Integración bancaria GT/MX (puerto 3005)
│   ├── compliance/       → NestJS — AML, reportes regulatorios (puerto 3006)
│   ├── notification/     → NestJS — SMS, Push, Email, WhatsApp (puerto 3007)
│   └── card-service/     → NestJS — Tarjeta débito Mondega (puerto 3008, Fase 3)
│
├── blockchain/
│   ├── contracts/        → Solidity — MondegaCoin.sol, MondegaFactory.sol
│   ├── scripts/          → Deploy scripts (Hardhat)
│   └── test/             → Tests de contratos
│
├── packages/
│   ├── shared-types/     → Tipos TypeScript compartidos (currencies.ts, etc.)
│   ├── shared-utils/     → Utilidades: crypto, formateo, validación
│   ├── ui-components/    → Design system compartido
│   └── sdk/              → SDK público para comercios e integradores
│
├── infrastructure/
│   ├── docker/           → Docker Compose para desarrollo
│   │   └── init-scripts/ → SQL y JS de inicialización de bases de datos
│   ├── k8s/              → Manifests Kubernetes para producción
│   └── terraform/        → Infrastructure as Code (AWS)
│
└── docs/
    ├── legal/            → Marco legal por jurisdicción
    ├── api/              → OpenAPI 3.1 spec
    └── runbooks/         → Procedimientos operativos
```

---

## Puertos de servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| auth-service | 3001 | Autenticación y KYC |
| wallet-service | 3002 | Wallets y saldos |
| fx-engine | 3003 | Tipos de cambio |
| tx-engine | 3004 | Motor de transacciones |
| fiat-bridge | 3005 | Integración bancaria |
| compliance | 3006 | AML y reportes |
| notification | 3007 | Notificaciones |
| web (Next.js) | 3000 | Web app |
| PostgreSQL | 5432 | Base de datos principal |
| MongoDB | 27017 | Logs y auditoría |
| Redis | 6379 | Cache y sesiones |
| Kafka | 9092 | Event streaming |
| Kafka UI | 8080 | Panel Kafka (dev) |
| Redis UI | 8081 | Panel Redis (dev) |

---

## Conversión de monedas — cómo funciona

```
Usuario MX quiere pagar MXN 100,000 → Usuario GT recibe en QUETZA

1. FX Engine consulta tasas:
   MXN/USD = 0.0504
   GTQ/USD = 0.1286

2. Tipo de cambio MEXCOIN→QUETZA:
   0.0504 / 0.1286 = 0.3919
   (1 MEXCOIN = 0.3919 QUETZA)

3. Cálculo:
   100,000 MEXCOIN × 0.3919 = 39,190 QUETZA (bruto)
   Comisión 0.8%: -800 MEXCOIN
   99,200 MEXCOIN × 0.3919 = 38,876 QUETZA (neto)

4. El usuario MX ve: "Envías M̈ 100,000 MEXCOIN"
   El usuario GT ve: "Recibes Q̈ 38,876 QUETZA"
   USD nunca aparece en la interfaz.
```

---

## Blockchain — Polygon (Ethereum L2)

```bash
# Instalar dependencias blockchain
cd blockchain
npm install

# Compilar contratos
npx hardhat compile

# Ejecutar tests
npx hardhat test

# Deploy a testnet (Polygon Amoy)
npx hardhat run scripts/deploy.ts --network polygon_amoy

# Deploy a mainnet (cuando esté listo)
npx hardhat run scripts/deploy.ts --network polygon
```

---

## Variables de entorno críticas

Las variables más importantes para el primer arranque:

```bash
DATABASE_URL=postgresql://mondega_user:mondega_dev_password_change_in_prod@localhost:5432/mondega_db
REDIS_URL=redis://:mondega_dev_password_change_in_prod@localhost:6379
MONGO_URL=mongodb://mondega_admin:mondega_dev_password_change_in_prod@localhost:27017/mondega_logs
JWT_SECRET=genera_con_openssl_rand_hex_64
ENCRYPTION_KEY=genera_con_openssl_rand_hex_32
```

---

## Próximos pasos de implementación

1. ✅ Estructura base y tipos compartidos
2. ✅ Schema PostgreSQL completo
3. ✅ Motor FX multi-moneda
4. ✅ Smart contracts Solidity
5. ⏳ Auth Service completo (KYC con Jumio)
6. ⏳ Wallet Service + integración Polygon
7. ⏳ Web App (Next.js) — pantallas principales
8. ⏳ App móvil (React Native + Expo)
9. ⏳ Fiat Bridge GT (Banrural + BAM)
10. ⏳ Fiat Bridge MX (CoDi + SPEI + OXXO)
11. ⏳ Deploy testnet Polygon Amoy
12. ⏳ Auditoría de contratos
13. ⏳ Launch Guatemala + México

---

*Mondega Digital — La moneda digital de Guatemala y Mesoamérica*
*Documento confidencial © 2025 Mondega Holdings LLC*
