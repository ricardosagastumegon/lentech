# LEN — Runbook, Estado y Pasos a Seguir
**Fecha:** 2026-06-02
**Propósito:** Que los problemas de hoy (deploy caído, commits perdidos, token expuesto, skills rotas) NO vuelvan a pasar. Incluye el estado real del producto tras revisión completa y los pasos a seguir.

---

## 1. QUÉ PASÓ HOY Y CÓMO SE RESOLVIÓ

| Problema | Causa raíz | Resolución |
|---|---|---|
| ~49 cambios sin commitear (todo el backend Pomelo/Conduit/admin/auth) | Nunca se hizo `git add`+commit | 9 commits lógicos → **PR #1** (`feat/backend-pomelo-conduit-admin`) |
| CI en rojo desde el 16-abr | `pnpm-lock.yaml` desactualizado (`ERR_PNPM_OUTDATED_LOCKFILE`) con `--frozen-lockfile` | Regenerar lockfile + commit. **CI ahora VERDE** |
| Token de GitHub expuesto en el `git remote` (y ya expirado) | PAT incrustado en la URL del remote | Limpiado el remote; push como `ricardosagastumegon` vía `gh` |
| Railway: 3 servicios (`lentech`,`admin`,`web`) OFFLINE, builds FAILED | Railway cambió a builder **Railpack** + lockfile viejo + deployaba commits viejos | En curso: **migrar a Vercel** (más confiable para Next.js) |
| Skills no cargaban (solo ~10 de 50) | Estaban como archivos **planos** `.md`; Claude Code requiere `<name>/SKILL.md` (carpeta) | 27 skills LEN convertidas a formato carpeta; 35 `lexdocs-*` archivadas |

---

## 2. RUNBOOK — REGLAS PARA NO REPETIR ESTO

### Git y commits
- **Commitear seguido.** Nunca dejar decenas de cambios sueltos. Al terminar una sesión: `git status` limpio o stash documentado.
- **Cuenta correcta:** el repo es `github.com/ricardosagastumegon/lentech`. Solo `ricardosagastumegon` tiene push. NO usar `ajua-bpm` ni `svasistema-hash` (son de otros proyectos; solo lectura).
- Verificar antes de pushear: `gh api user --jq .login` → debe decir `ricardosagastumegon`.
- **Nunca** poner tokens en la URL del remote. Usar `gh auth login` (credential manager).
- Trabajar en branch + PR; mantener `main` siempre verde (CI).

### Deploy (objetivo: Vercel)
- **Plataforma:** Vercel, cuenta de **`ricardosagastumegon`** (NO `ajua-bpm` — ese es otro proyecto).
- **Dos proyectos** desde el mismo repo: `lentech-web` (Root Directory `apps/web`) y `lentech-admin` (Root Directory `apps/admin`).
- Vercel auto-deploya en push a `main`. `main` debe buildear verde (el CI lo garantiza).
- Las **variables de entorno** se cargan en el dashboard de Vercel, NO en el repo.
- Railway queda como opción para servicios always-on futuros (NestJS), no para las apps Next.js.

### Variables de entorno críticas (producción)
| Variable | Estado local | Acción para prod |
|---|---|---|
| `LEN_JWT_SECRET` | ✅ set (64 chars) | copiar a Vercel |
| `FIREBASE_CLIENT_EMAIL` | 🔴 VACÍA (local usa `firebase-service-account.json`) | configurar en Vercel/Railway |
| `FIREBASE_PRIVATE_KEY` | 🔴 VACÍA | configurar (con `\n` escapados) |
| `LEN_ADMIN_API_KEY` | 🔴 PLACEHOLDER `change...` | generar `openssl rand -hex 32`, igual en backend y panel admin |
| `NEXT_PUBLIC_FIREBASE_*` | vacías | OK — `firebase.ts` tiene fallback hardcodeado (proyecto `lentech-216a0`) |
| `POMELO_*`, `CONDUIT_*` | ✅ sandbox | OK para pruebas |

### Skills de Claude Code
- Formato obligatorio: `~/.claude/skills/<nombre>/SKILL.md` (carpeta + SKILL.md). Archivos planos NO cargan bien.
- Frontmatter: `name` (opcional) + `description` (recomendada, < 1536 chars combinados).
- Las de **otro proyecto** (LexDocs) están en `~/.claude/skills-lexdocs-archive/` para no saturar el listado.
- Verificar con `/skills`.

### Usuarios de prueba (Firestore `len_users`)
- **Sembrar** (desde `apps/web`): `node --env-file=.env.local --import tsx scripts/seed-test-users.ts` → crea admin GT `50212345678` y cliente MX `5215512345678` con PIN aleatorio impreso en consola. **Anotar el PIN.**
- **Limpiar** (no hay script): borrar docs de `len_users` (y `len_processed_webhooks`, `len_transactions`) desde la consola de Firebase. OJO: el `DELETE` del admin es soft-delete y NO libera el phone para re-seed.
- Deploy de reglas: `firebase deploy --only firestore:rules` (ya están cerradas en el repo).

---

## 3. ESTADO DEL PRODUCTO (revisión completa 2026-06-02)

### 3.1 Flujo "una sola moneda" (depósito → coin, sin comprar/vender)
- **Backend YA correcto:** los webhooks `cuenca/pomelo/conduit/deposit` auto-mintean el token 1:1.
- **Gap = 100% frontend** (modelo viejo de 2 saldos):
  - `apps/web/src/store/wallet.store.ts:53-63` — quitar `fiatBalance`/`fiatCurrency`; eliminar `buyTokens`/`sellTokens` (`:132-215`).
  - `apps/web/src/components/dashboard/BalanceCard.tsx:56-116` — borrar sección "Saldo fiat depositado / Comprar"; dejar un solo saldo.
  - Eliminar páginas `apps/web/src/app/(app)/buy-tokens/` y `sell-tokens/`.
  - Reescribir `add-money/page.tsx` (copy: "el depósito se convierte automáticamente").
  - **Conectar el dashboard al saldo real** (on-chain / `len_transactions`), hoy lee de `localStorage`/`len_demo_users`.
- **Riesgo:** sin el `fiatBalance` hay que sustituirlo por un **estado de transacción `pending_mint`** para no perder al usuario si el mint falla tras recibir el fiat.

### 3.2 Comisión (configurable en LEN Admin)
- ✅ Sistema existe y es configurable: `apps/web/src/lib/commission-config.ts` + `api/admin/commission` (splits por país, valida 100%).
- ✅ Bien aplicada en el **mint manual del admin** (`api/admin/mint/route.ts:108-188`).
- 🔴 **NO aplicada** en los 3 webhooks de depósito automático (mintean bruto, comisión 0).
- 🟡 `withdraw` usa `WITHDRAWAL_FEE_PERCENT = 0.003` hardcoded en vez de leer la config (que tiene 1.5%).
- 🟡 `transfer` (P2P) y `card_spend` declarados en la config pero sin reglas default ni aplicación.
- **Fix:** extraer helper `mintWithCommission(...)` y usarlo en los 4 sitios (replicar patrón de `admin/mint`).

### 3.3 Riesgos de dinero (peg 1:1 / fondos)
- 🔴 `api/transfers/send/route.ts:140-156` — transfiere ERC-20 firmando con `CELO_TREASURY_PRIVATE_KEY` (treasury), NO con la wallet del usuario → puede vaciar el treasury / fallar. Falta `approve`/allowance.
- 🔴 `api/transfers/withdraw/route.ts:107-143` — quema el token pero el **SPEI saliente no está implementado** (TODO) y **no hay rollback**. Burn irreversible si el fiat nunca sale.
- 🟡 Idempotencia con ventana de carrera (check `.get()` luego `.set()` no atómico) — usar `create()`/transacción Firestore.

### 3.4 Seguridad / auth
- ✅ JWT bien (HS256, `jose`, `algorithms:[HS256]`, secreto ≥32).
- ✅ PIN con scrypt timing-safe. ✅ firestore.rules CERRADAS.
- ✅ Admin endpoints protegidos con `verifyAdminAuth` (pero la API key es placeholder — ver §2).
- 🔴 Verificación HMAC de Pomelo (`pomelo-client.ts:120-127`) usa comparación casera NO timing-safe → usar `crypto.timingSafeEqual` (como Conduit).
- 🟡 Webhook Pomelo sin anti-replay (no valida frescura del `x-timestamp`); Conduit sí (≤5 min).
- 🟡 Login sin rate-limit/lockout (PIN de 6 dígitos = bruteforceable); planear a nivel edge.

---

## 4. PASOS A SEGUIR (priorizados)

### 🔴 Para la demo con el banco (mañana)
1. Decidir versión a demostrar: **`main` (demo probado, cero config)** vs **última (PR, requiere seed + env)**. Para una demo visual el backend es invisible → `main` es lo seguro.
2. Terminar deploy en **Vercel** (cuenta `ricardosagastumegon`, proyecto `lentech-web`, root `apps/web`). `main` ya tiene el lockfile arreglado.
3. Si se usa la última versión: cambiar `LEN_ADMIN_API_KEY`, configurar Firebase Admin env, sembrar usuarios, anotar PINs, probar login.

### 🟡 Corto plazo (post-demo)
4. Mergear PR #1 a `main`.
5. Implementar el **flujo de una sola moneda** (frontend §3.1) usando skills `money-flow-designer` + `fintech-ux`.
6. **Aplicar comisión en los webhooks de depósito** + unificar `withdraw` con la config (§3.2).
7. Arreglar `transfers/send` (firmante real) y `withdraw` (rollback/cola SPEI) (§3.3).

### 🟢 Mediano plazo
8. HMAC timing-safe + anti-replay en Pomelo; idempotencia atómica.
9. Conectar dashboard al saldo real on-chain (salir del demo `localStorage`).
10. Implementar mint de QUETZA/LEMPI (hoy `conduit/deposit` devuelve 501 para GT/HN).
11. Conciliación reservas vs supply + alertas (SPEI falla post-burn, gas CELO bajo).
12. Actualizar `CLAUDE.md` (dice que las firestore.rules están abiertas — ya están cerradas).

---

## 5. REFERENCIAS RÁPIDAS
- **Repo:** github.com/ricardosagastumegon/lentech · branch `main` · PR #1 `feat/backend-pomelo-conduit-admin`
- **Contratos Celo Sepolia:** MEXCOIN `0xAa0fF59Bbe62373D0954801abb51331d323f41A9` · Factory `0x02Ec604E61c65E31618B74E47F7C861928C5AaEB`
- **Skills LEN:** 27 en `~/.claude/skills/<name>/SKILL.md`
- **Seed usuarios:** `node --env-file=.env.local --import tsx scripts/seed-test-users.ts` (en `apps/web`)

*Generado: 2026-06-02 · Mantener actualizado tras cada cambio mayor.*
