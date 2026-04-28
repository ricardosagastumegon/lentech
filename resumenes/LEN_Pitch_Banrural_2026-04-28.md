# LEN — PITCH PARA BANRURAL
**Fecha**: 2026-04-28 | **Objetivo**: Alianza estratégica — Fideicomiso + Conectividad ACH Guatemala

---

## 1. QUÉ ES LEN

LEN es una **plataforma fintech de pagos digitales** para Guatemala, México y Honduras.

Permite a los usuarios:
- Depositar dinero desde cualquier banco via transferencia electrónica
- Mantener saldo en una **wallet digital** respaldada 1:1 por su moneda local
- Enviar dinero instantáneo entre países (GT → MX, MX → HN, etc.)
- Pagar con tarjeta virtual Mastercard (en integración con Pomelo)

**No somos un banco.** Somos la capa tecnológica que conecta bancos existentes con usuarios digitales.

---

## 2. POR QUÉ BANRURAL

Banrural es el banco con **mayor presencia en Guatemala**, especialmente en poblaciones que hoy no tienen acceso a servicios financieros digitales.

LEN necesita a Banrural para:
1. **Fideicomiso de fondos** — los saldos de usuarios guatemaltecos deben estar custodiados en un banco regulado
2. **Conectividad ACH/BANGUAT** — para procesar depósitos y retiros en GTQ
3. **Legitimidad institucional** — asociarse con Banrural da confianza a usuarios y reguladores

Banrural se beneficia de:
- **Nuevos clientes digitales** sin costo de adquisición
- **Volumen transaccional** desde el primer día (usuarios MX enviando a GT)
- **Posicionamiento fintech** — alianza con tecnología blockchain de vanguardia

---

## 3. MODELO OPERATIVO — CÓMO FUNCIONA CON BANRURAL

```
Usuario GT deposita GTQ
    → Transferencia a cuenta fideicomiso LEN en Banrural
    → LEN mintea QUETZA (token 1:1 con GTQ) en blockchain Celo
    → Usuario ve su saldo en la app LEN

Usuario GT quiere retirar
    → LEN quema QUETZA en blockchain
    → LEN ordena transferencia desde fideicomiso Banrural al banco del usuario
    → Usuario recibe GTQ en su cuenta bancaria
```

**Los fondos de usuarios SIEMPRE están en Banrural.** LEN solo maneja la capa tecnológica.

---

## 4. ESTADO TÉCNICO ACTUAL — LO QUE YA EXISTE

### Infraestructura en producción hoy

| Componente | Estado | Detalle |
|---|---|---|
| App web (lenapp) | ✅ LIVE | Railway, URL pública, 15 rutas |
| Panel admin | ✅ LIVE | Gestión de bancos, KYC, AML, FX |
| App mobile | 🔷 En desarrollo | React Native / Expo |
| Smart contracts Celo **Mainnet** | ✅ LIVE | 8 tokens deployados |
| QUETZA (GTQ) | ✅ Mainnet | `0xba45b516C4fC485231863681B5ECc4E385105a13` |
| MEXCOIN (MXN) | ✅ Mainnet | `0xAa0fF59Bbe62373D0954801abb51331d323f41A9` |
| LEMPI (HNL) | ✅ Mainnet | `0x7d120f4e63937e944Fa5b1Ad97D38aC1C16D2e1A` |
| auth-service | ✅ Código listo | NestJS, PostgreSQL, deploy pendiente |
| card-service | ✅ Código listo | Integración Pomelo Mastercard |

### Stack tecnológico

```
Frontend:     Next.js 14 + TypeScript + Tailwind CSS
Backend:      NestJS 10 (microservicios)
Base datos:   PostgreSQL + Firebase Firestore
Blockchain:   Celo Mainnet (EVM compatible, bajo costo gas)
Tokens:       ERC-20 estándar (OpenZeppelin v5)
Infraestructura: Railway (activo) → AWS/GCP (roadmap)
Monorepo:     pnpm workspaces + Turborepo
```

---

## 5. SEGURIDAD BANCARIA — CAPAS DE PROTECCIÓN

LEN implementa **8 capas de seguridad** alineadas con estándares FATF y GAFILAT:

| # | Capa | Implementación |
|---|------|----------------|
| 01 | **Autenticación** | Argon2id (64MB RAM, 3 iteraciones) — estándar OWASP 2024 |
| 02 | **Tokens JWT** | Access 15min + Refresh 7 días con rotación automática |
| 03 | **Cifrado PII** | AES-256-GCM con IV aleatorio por operación |
| 04 | **Webhooks bancarios** | HMAC-SHA256 + comparación tiempo constante (anti timing attack) |
| 05 | **Idempotencia** | Cada evento bancario tiene ID único — imposible doble crédito |
| 06 | **Replay prevention** | Webhooks rechazados si tienen más de 5 minutos de antigüedad |
| 07 | **Fondos segregados** | Fideicomiso bancario — nunca mezclados con capital de LEN |
| 08 | **Smart contracts auditables** | Todo mint/burn queda registrado en blockchain público |

### Compliance AML/CFT

| Regla FATF | Implementación LEN |
|---|---|
| KYC niveles 0–3 | Límites escalonados: $500 / $5,000 / $50,000 / sin límite |
| Monitoreo de transacciones | Alertas automáticas en panel admin |
| Reporte de operaciones sospechosas | Cola de revisión manual con evidencia |
| Listas de sanciones | Integración Chainalysis (OFAC, ONU, UE) — roadmap |
| Conservación de registros | Logs 5 años en Firestore + PostgreSQL |
| Structuring detection | Alerta en fraccionamiento de montos |

---

## 6. CONECTIVIDAD — SOCIOS EN NEGOCIACIÓN

| País | Proveedor | Servicio | Estado |
|---|---|---|---|
| 🇲🇽 México | **Conekta** | SPEI + pagos | En negociación activa |
| 🇲🇽 México | **Pomelo / Natalia De Dios** | Tarjeta Mastercard | Contacto activo |
| 🇬🇹 Guatemala | **Banrural** | Fideicomiso + ACH | **REUNIÓN HOY** |
| 🇬🇹 🇭🇳 Regional | **Paymentology** | Tarjeta Mastercard CA | Identificado |
| 🌎 LATAM | **Celo blockchain** | Liquidación 24/7 | ✅ LIVE mainnet |

### Por qué Celo como blockchain

- **Costo de transacción**: $0.001 USD (vs $5–50 en Ethereum)
- **Velocidad**: 5 segundos de finalidad
- **Regulatorio**: No es DeFi especulativo — tokens 1:1 con fiat, no fluctúan
- **Auditabilidad**: Cualquier auditor puede verificar cada mint/burn en celoscan.io
- **Adoptado por**: Valora, GoodDollar, Moola Market — casos de uso financiero real

---

## 7. TOKENS LEN — TODOS EN MAINNET

| Token | País | Divisa | Contrato Celo Mainnet |
|---|---|---|---|
| **QUETZA** | 🇬🇹 Guatemala | GTQ | `0xba45b516...` |
| **MEXCOIN** | 🇲🇽 México | MXN | `0xAa0fF59B...` |
| **LEMPI** | 🇭🇳 Honduras | HNL | `0x7d120f4e...` |
| COLON | 🇸🇻 El Salvador | SVC | `0x546718C3...` |
| NICORD | 🇳🇮 Nicaragua | NIO | `0x19de414D...` |
| TIKAL | 🇧🇿 Belize | BZD | `0xF1C588c1...` |
| CORI | 🇨🇷 Costa Rica | CRC | `0xAcE18a30...` |
| DOLAR | 🌎 Regional | USD | `0x3b74B9f0...` |

Verificable en: **https://celoscan.io/address/0x02Ec604E61c65E31618B74E47F7C861928C5AaEB**

---

## 8. MODELO DE NEGOCIO

| Fuente de ingreso | Fee | Cuándo aplica |
|---|---|---|
| FX cross-country | 0.3% | Cada envío internacional |
| Retiro a banco | $0.50–$2.00 GTQ equiv. | Cada retiro |
| Venta de tokens | 0.5% | Conversión token → fiat |
| Tarjeta Mastercard | 1.5–2.5% interchange share | Cada pago con tarjeta |

**TAM Guatemala**: $2.8B USD en remesas entrantes/año (Banco de Guatemala 2025)
**TAM Corredor GT-MX-HN**: $8.5B USD movimiento informal estimado

---

## 9. LO QUE PROPONEMOS A BANRURAL

### Propuesta concreta

1. **Cuenta fideicomiso LEN en Banrural**
   - Fondos de usuarios guatemaltecos custodiados en Banrural
   - Sub-cuentas virtuales por usuario (modelo similar a STP en México)
   - Banrural recibe el float de los fondos depositados

2. **Conectividad ACH/BANGUAT**
   - API o acuerdo para procesar transferencias entrantes/salientes
   - Webhook de confirmación cuando llega un depósito
   - Procesamiento de retiros en tiempo real o T+0

3. **Co-marketing (opcional)**
   - LEN como canal digital de Banrural para usuarios no bancarizados
   - Posibilidad de onboarding Banrural dentro de la app LEN

### Lo que LEN aporta

- Tecnología completa desarrollada y funcional
- Equipo técnico dedicado a la integración
- Cumplimiento AML/KYC desde el día 1
- Modelo regulatorio claro (LEN = tech, Banrural = custodia regulada)

---

## 10. ROADMAP 2026

| Trimestre | Hito |
|---|---|
| Q2 2026 | Alianza Banrural GT + Conekta MX firmadas |
| Q2 2026 | auth-service en producción — primeros usuarios reales |
| Q3 2026 | Tarjeta Mastercard virtual LEN (Pomelo/Paymentology) |
| Q3 2026 | 1,000 usuarios activos GT + MX |
| Q4 2026 | Expansión Honduras (BAC Credomatic) |
| Q4 2026 | 10,000 usuarios activos — Serie A |

---

## 11. PREGUNTAS FRECUENTES PARA LA REUNIÓN

**¿LEN necesita licencia bancaria?**
No. LEN opera como capa tecnológica. Banrural es la entidad regulada. Modelo idéntico al de Clip con Banorte en México.

**¿Qué pasa si LEN quiebra?**
Los fondos están en el fideicomiso de Banrural — son intocables por LEN. Los usuarios pueden retirar siempre.

**¿El blockchain es seguro?**
Celo es una blockchain pública auditada, usada por entidades como la Fundación Rockefeller para inclusión financiera. Cada transacción es pública y verificable.

**¿Cuánto volumen esperan?**
Conservador año 1: $500K USD equivalente en GTQ. Optimista: $2M USD.

---

*Documento preparado para reunión con Banrural — 2026-04-28*
*Ricardo | Founder, LEN | agroajua@gmail.com*
