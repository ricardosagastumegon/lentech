# LEN — Resumen Ejecutivo de Proyecto
**Versión:** v0.1  
**Fecha:** 14 de Abril, 2026  
**Autor:** Sesión de trabajo con Claude (Anthropic)  
**Repo:** github.com/ricardosagastumegon/lentech  
**Deploy live:** https://web-production-1c372.up.railway.app  

---

## Índice
1. [¿Qué es LEN?](#que-es-len)
2. [Estado actual del producto](#estado-actual)
3. [Módulos construidos](#modulos-construidos)
4. [Tema Bancos — conectividad y estado](#bancos)
5. [Tema Tarjetas — plan y proveedores](#tarjetas)
6. [Tema Usuarios y KYC](#usuarios-kyc)
7. [Stack técnico](#stack)
8. [Próximos pasos priorizados](#proximos-pasos)
9. [Decisiones de diseño relevantes](#decisiones)

---

## 1. ¿Qué es LEN? {#que-es-len}

LEN es una plataforma fintech de pagos transfronterizos en Mesoamérica. Permite:
- Enviar dinero entre Guatemala, México y Honduras en segundos
- Convertir entre monedas locales (QUETZA, MEXCOIN, LEMPI) a tipo de cambio LEN
- Comprar / vender tokens digitales respaldados 1:1 con moneda fiat nacional
- Retirar a cuenta bancaria local de cualquier banco
- Recibir pagos con número de teléfono o QR

**Mercado primario:** Guatemala (QUETZA/GTQ), México (MEXCOIN/MXN), Honduras (LEMPI/HNL)  
**Mercado futuro (Fase 2-3):** El Salvador, USD, Belice, Nicaragua, Costa Rica

---

## 2. Estado actual del producto {#estado-actual}

| Área | Estado |
|------|--------|
| App web (Next.js) desplegada en Railway | ✅ En vivo |
| Demo P2P funcional (transferencias cross-user reales) | ✅ Funciona |
| Firebase / Firestore conectado y sincronizando | ✅ Activo |
| 3 usuarios demo (GT/MX/HN) con login one-click | ✅ Funciona |
| Panel Admin operacional | ✅ Construido |
| Backend API (Railway) | ⚠️ Parcial — modo demo/fallback |
| KYC verificación real | ❌ Pendiente integración |
| Bancos reales conectados | ❌ Pendiente contratos |
| Tarjetas débito/prepago | ❌ Pendiente |

---

## 3. Módulos construidos {#modulos-construidos}

### App usuario (web/mobile-ready PWA)

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Login | `/login` | Phone + PIN. 3 botones demo para GT/MX/HN (login instantáneo) |
| Registro | `/register` | Phone → País → PIN → OTP (4 pasos) |
| Dashboard | `/dashboard` | Balance, transacciones recientes, ticker de tasas FX |
| Enviar | `/send` | 3 pasos: destinatario → monto → confirmar. FX automático cross-moneda |
| Recibir | `/receive` | QR determinístico por usuario + número LEN + botón compartir |
| Comprar tokens | `/buy-tokens` | Fiat → Token 1:1, comisión 0%, cualquier PIN de 6 dígitos |
| Vender tokens | `/sell-tokens` | Token → Fiat, comisión 0.5%, comprobante descargable |
| Retirar | `/withdraw` | Selección de cuenta bancaria → monto → PIN → comprobante |
| Agregar dinero | `/add-money` | Instrucciones de depósito por país |
| Transacciones | `/transactions` | Historial con filtros (tipo, moneda, fecha, búsqueda) |
| KYC | `/kyc` | Pantalla de verificación (frontend listo, falta integración) |
| Configuración | `/settings` | Perfil, wallets activos, links a módulos, cerrar sesión |
| Tarjeta | `/card` | Pantalla "Próximamente" |
| Admin | `/admin` | Panel de operaciones (ver sección bancos) |
| Pitch | `/pitch` | Presentación bilingüe ES/EN para inversores |

### Panel Admin (`/admin`, contraseña: `len2025`)

| Tab | Contenido |
|-----|-----------|
| **Conectividad** | 21 bancos GT/MX/HN con estado Live/Demo/Offline/Degradado, latencia ms, ping individual y global |
| **Parámetros** | Fees editables (compra/venta/FX/retiro), límites KYC por nivel, mínimos y máximos por transacción |
| **Tipos FX** | Tasas USD por moneda, override manual por coin activable |
| **Sistema** | Toggle Live/Demo global, toggle mantenimiento, estado de todos los servicios internos |

### Sincronización en tiempo real
- `wallet-sync.ts`: sync bidireccional local ↔ Firestore
- `user-db.ts`: `creditTransfer()` → escribe en documento Firestore del destinatario
- `subscribeToUserSnapshot()`: listener `onSnapshot` en tiempo real
- Si usuario A envía a usuario B → B ve los tokens en < 1 segundo (cross-tab / cross-device)

---

## 4. Tema Bancos — conectividad y estado {#bancos}

### Arquitectura de redes bancarias

| País | Red | Banco ancla LEN | Alcance |
|------|-----|-----------------|---------|
| Guatemala | ACH BANGUAT (TELERED) | Banrural | Todos los bancos GT |
| México | SPEI | STP / Conekta | Todos los ~50 bancos MX con CLABE |
| Honduras | SIEFOM | BAC Credomatic | Todos los bancos HN |

### Modelo de depósito

| País | Tipo | Funcionamiento |
|------|------|---------------|
| Guatemala | Sub-cuenta virtual | Usuario deposita a cuenta maestra Banrural con sufijo de wallet |
| México | CLABE virtual única | STP genera CLABE de 18 dígitos por usuario. Transferencia SPEI automáticamente identificada |
| Honduras | Sub-cuenta virtual | Usuario deposita a cuenta maestra BAC con sufijo de wallet |

### Estado de conectividad hoy (2026-04-14)

**Guatemala — ACH BANGUAT:**
- En vivo: Banco Industrial, Banrural, BAM, G&T Continental
- En demo: Bantrab, Promerica GT, Citibank GT

**México — SPEI/STP:**
- En vivo: BBVA, Santander, Citibanamex, Banorte, HSBC, Nu (Nubank), Mercado Pago
- En demo: Scotiabank, Banco Azteca

**Honduras — SIEFOM:**
- En vivo: Atlántida, BAC Credomatic, Ficohsa
- En demo: Banco del País, Davivienda

> **Nota importante:** "En vivo" en el panel admin refleja el estado configurado en el store. Los contratos reales con Banrural, STP/Conekta y BAC están pendientes de firma. El estado es **simulado hasta que se firmen los contratos operacionales**.

### Requisitos para activar bancos reales
1. **Guatemala:** Contrato con Banrural para cuenta de custodia + acceso API ACH BANGUAT
2. **México:** Contrato con STP o Conekta para emisión de CLABEs + acceso SPEI
3. **Honduras:** Contrato con BAC Credomatic para cuenta de custodia + API SIEFOM
4. **Regulatorio:** Registro como Institución de Pago ante SB Guatemala / CNBV México / CNBS Honduras

---

## 5. Tema Tarjetas — plan y proveedores {#tarjetas}

### Opciones de emisión evaluadas

| Proveedor | Región | Tipo | Recomendación |
|-----------|--------|------|---------------|
| **Pomelo** | MX, GT, HN, CO, AR | Mastercard prepago virtual + física | ⭐ Primera opción — cobertura exacta |
| **Arcus FI** | MX únicamente | Mastercard + SPEI integrado | Buena si MX es prioridad |
| **Marqeta** | MX principalmente | Visa/Mastercard | Enterprise, requiere volumen |
| **Lithic** | US + LATAM via partners | Visa | Más orientado a US |
| **Unlimint** | MX + Centroamérica | Mastercard prepago | Alternativa accesible |

### Modelo de autorización en tiempo real

```
Usuario paga en POS/ATM/eCommerce
        ↓
Mastercard/Visa llama al issuer (Pomelo)
        ↓
Pomelo llama webhook LEN (< 2 segundos)
        ↓
LEN verifica saldo (fiat o tokens)
        ↓
Approve / Decline → respuesta a red
```

### Dos modelos de balance para la tarjeta

**Modo A — Lee saldo fiat (más simple, v1):**
- La tarjeta carga contra `wallet.fiatBalance` (GTQ / MXN / HNL)
- Usuario primero vende tokens → obtiene fiat → usa tarjeta

**Modo B — Lee tokens directamente (más avanzado, v2):**
- Al momento del pago, se auto-liquidan tokens a fiat al tipo de cambio LEN
- Similar a lo que hace Crypto.com con su tarjeta

### Lo que falta para tener tarjeta virtual (más próximo)

| Paso | Estado | Acción requerida |
|------|--------|-----------------|
| Contactar Pomelo | ❌ | Ricardo debe solicitar acceso sandbox en pomelo.la |
| KYC Nivel 1 completo | ⚠️ | Agregar DOB + email al registro (ver sección KYC) |
| Licencia o banco sponsor | ❌ | Gestionar con Banrural (GT) o STP (MX) |
| Integración webhook | ❌ | Desarrollar endpoint `/webhooks/card-authorization` |
| BIN Mastercard | ❌ | Pomelo lo gestiona cuando firmás contrato |

### Costos estimados (Pomelo)
- Setup por tarjeta: $1–3 USD
- Por transacción autorizada: $0.05–0.15 USD
- Tarjeta virtual: costo casi cero
- Tarjeta física: ~$3–5 USD incluyendo producción/envío

---

## 6. Tema Usuarios y KYC {#usuarios-kyc}

### Datos que se recolectan actualmente

| Campo | Recolectado en registro | Disponible en store |
|-------|------------------------|---------------------|
| Teléfono (verificado OTP) | ✅ | ✅ |
| País | ✅ | ✅ |
| PIN propio 6 dígitos | ✅ | — (no se almacena) |
| Nombre completo | ⚠️ Solo si lo devuelve el API | ✅ `displayName` |
| Email | ❌ No se pide | ⚠️ Campo opcional |
| Fecha de nacimiento | ❌ | ❌ |
| Dirección | ❌ | ❌ |
| Número DPI / INE / DNI | ❌ | ❌ |
| Foto documento | ❌ | ❌ |
| Selfie | ❌ | ❌ |

### Niveles KYC definidos en el sistema

| Nivel | Nombre | Límite mensual | Requisitos |
|-------|--------|---------------|------------|
| 0 | Anónimo | $200 USD/mes | Solo teléfono |
| 1 | Básico | $1,000 USD/mes | + nombre + DOB + email |
| 2 | Verificado | $10,000 USD/mes | + DPI/INE + selfie (Jumio/Onfido) |
| 3 | Corporativo | Sin límite | + documentos empresa |

### Gaps para activar tarjeta virtual (KYC Nivel 1)

**Solo faltan 3 campos en el registro:**
1. `firstName` + `lastName` (nombre completo separado)
2. `dateOfBirth` (fecha de nacimiento)
3. `email`

Con estos 3 campos, Pomelo puede emitir tarjeta virtual Tier 1 (~$500 USD/mes de límite).

### Para tarjeta física (KYC adicional)
- Dirección completa (calle, ciudad, código postal)
- Número de documento nacional (DPI para GT, CURP para MX, DNI para HN)

### Para KYC Nivel 2 (límites altos)
- Integrar SDK de Jumio u Onfido
- La pantalla `/kyc` ya está construida en el frontend
- Solo falta conectar el SDK y el webhook de resultado

### Usuarios demo activos

| Usuario | ID | País | Wallet | Acceso |
|---------|----|------|--------|--------|
| Carlos Mendoza | demo-gt | Guatemala 🇬🇹 | QUETZA | Botón demo login |
| Sofía Hernández | demo-mx | México 🇲🇽 | MEXCOIN | Botón demo login |
| José Reyes | demo-hn | Honduras 🇭🇳 | LEMPI | Botón demo login |

---

## 7. Stack técnico {#stack}

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Frontend | Next.js 14 (App Router) + TypeScript | ✅ En producción |
| Estilos | Tailwind CSS + Inter font | ✅ |
| Estado | Zustand (persist a localStorage) | ✅ |
| Base de datos | Firebase Firestore | ✅ Proyecto: lentech-216a0 |
| Auth | Firebase Auth | ✅ |
| Push notifications | Firebase Cloud Messaging | ✅ |
| Deploy | Railway (auto-deploy desde GitHub main) | ✅ |
| Backend API | Node.js / Express en Railway | ⚠️ Demo mode |
| FX Engine | Cliente: static rates. Prod: Chainlink + Open Exchange Rates | ⚠️ Static |
| KYC | Pendiente (Jumio / Onfido evaluados) | ❌ |
| Card issuing | Pendiente (Pomelo evaluado) | ❌ |

### Repositorio
- **Mono-repo:** pnpm workspaces + Turborepo
- **Apps:** `apps/web` (Next.js)
- **Servicios:** `services/` (backend API)
- **Packages:** `packages/` (shared types, utils)
- **Branch principal:** `main` → auto-deploy a Railway

---

## 8. Próximos pasos priorizados {#proximos-pasos}

### Corto plazo (días)
- [ ] Agregar campos DOB + email al flujo de registro
- [ ] Completar nombre completo en registro (firstName/lastName)
- [ ] Contactar Pomelo para sandbox de tarjetas

### Mediano plazo (semanas)
- [ ] Contrato con Banrural (GT) y/o STP (MX) para cuentas de custodia
- [ ] Integrar SDK KYC (Jumio u Onfido) en pantalla `/kyc`
- [ ] Desarrollar webhook de autorización de tarjeta
- [ ] Activar modo Live en el panel admin con bancos reales

### Largo plazo (meses)
- [ ] Tarjeta física (producción + envío)
- [ ] Obtener licencia de Institución de Pago (SB Guatemala / CNBV México)
- [ ] Activar monedas Fase 2: COLON (SV), DOLAR (USD)
- [ ] Integración con billeteras móviles (Tigo Money, Claro Pay)
- [ ] App nativa iOS/Android (React Native o PWA avanzada)

---

## 9. Decisiones de diseño relevantes {#decisiones}

### Colores (actualizado 2026-04-14)
- **Color primario:** `#4338CA` (índigo-700) — reemplazó `#6C5CE7` (violeta eléctrico)
- **Razón:** El violeta anterior era demasiado saturado/eléctrico, leía como app de crypto/gaming. El índigo-700 es más profundo, institucional, similar a Stripe y Linear.
- **Fondo:** `#F9FAFB` (blanco neutro) — reemplazó `#FAFAFE` (blanco con tinte de uva)
- **Dark:** `#1E1B4B` (navy profundo) — se mantiene, funciona bien

### Arquitectura de transferencias P2P
- Transfers cross-user: sender escribe en Firestore del destinatario via `creditTransfer()`
- Receptor recibe en tiempo real via `onSnapshot` en `wallet-sync.ts`
- Flag `isExternalUpdate` previene loop infinito de saves
- `updatedBy: 'system'` distingue escrituras externas de propias

### PIN
- Todos los flujos (compra, venta, retiro, envío) aceptan **cualquier PIN de 6 dígitos**
- PIN demo no es hardcoded — cualquier 6 dígitos funciona

### Demo mode
- 3 usuarios demo con login instantáneo (sin necesitar PIN ni OTP)
- Destinatarios resueltos localmente: 11111 (GT), 22222 (MX), 33333 (HN)
- Firestore sí está conectado — las transferencias entre demos son **reales y en tiempo real**

---

*Próxima revisión: LEN_Resumen_v0.2 — al completar integración KYC o tarjetas*
