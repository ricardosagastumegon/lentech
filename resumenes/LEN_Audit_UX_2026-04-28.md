# LEN — AUDITORÍA DE SEGURIDAD + UX REVIEW
**Fecha**: 2026-04-28 | **Skills**: audit-security + ux-review

---

## PARTE 1 — AUDITORÍA DE SEGURIDAD

### RESUMEN

| Severidad | Cantidad |
|---|---|
| 🔴 Crítico | 2 |
| 🟡 Alto | 4 |
| 🟠 Medio | 5 |
| 🟢 Bajo | 3 |

---

### 🔴 CRÍTICOS

**[SEC-01] Firebase API Key hardcodeada como fallback**
- **Archivo**: `apps/web/src/lib/firebase.ts:8`
- **Problema**: `apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyCNHgU4WyhsaixGvfX9lj0gBGJFxg5aynU'`
- La clave queda visible en el bundle JavaScript que el browser descarga. Cualquier persona puede verla con DevTools → Sources.
- **Fix**: Eliminar el fallback hardcodeado. Si la variable no existe, lanzar error en startup.
```typescript
// En firebase.ts
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
if (!apiKey) throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY no configurada');
```

**[SEC-02] protobufjs < 7.5.5 — Ejecución de código arbitrario**
- **Origen**: `firebase@10.14.1 → @firebase/firestore → @grpc/proto-loader → protobufjs@7.5.4`
- **CVE**: GHSA-xq3m-2v4x-88gg — permite ejecución de código arbitrario
- **Fix**: Actualizar firebase: `pnpm update firebase --latest` en `apps/web`

---

### 🟡 ALTOS

**[SEC-03] Next.js 14.2.35 — DoS via HTTP request deserialization**
- **Archivo**: `apps/web/package.json` y `apps/admin/package.json`
- **CVE**: Next.js < 15.0.8 vulnerable a DoS con React Server Components inseguros
- **Fix**: `pnpm update next@latest` (15.x) — requiere revisar breaking changes de App Router

**[SEC-04] Retiro quema MEXCOIN sin enviar SPEI**
- **Archivo**: `apps/web/src/app/api/transfers/withdraw/route.ts`
- El SPEI saliente está comentado como TODO. Si se habilita retiros sin proveedor SPEI integrado, el usuario pierde su dinero.
- **Fix**: Agregar variable de entorno `WITHDRAWALS_ENABLED=false` y bloquear el endpoint hasta tener proveedor.

**[SEC-05] Usuarios demo con PIN hardcodeado sin flag de control**
- **Archivo**: `apps/web/src/app/api/auth/token/route.ts`
- PIN `111111` para todos los demo users. Cualquiera puede autenticarse como `demo-mx`, `demo-gt`, `demo-hn`.
- Aceptable en demo, pero debe bloquearse para producción real.
- **Fix**: 
```typescript
if (process.env.DEMO_MODE !== 'true') {
  return NextResponse.json({ ok: false, error: 'Demo deshabilitado' }, { status: 403 });
}
```

**[SEC-06] glob CLI — Command injection**
- **Origen**: `eslint-config-next → @next/eslint-plugin-next → glob@10.3.10`
- Solo en dependencias de desarrollo (eslint), no afecta producción directamente.
- **Fix**: `pnpm update eslint-config-next` al actualizar Next.js

---

### 🟠 MEDIOS

**[SEC-07] ENCRYPTION_KEY en root .env = todos ceros**
- `ENCRYPTION_KEY=000...000` (64 ceros)
- Si algún servicio usa esta clave para cifrar PII, los datos están casi en texto plano.
- **Fix**: Generar clave real: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**[SEC-08] Retiro no verifica ownership de wallet**
- **Archivo**: `apps/web/src/app/api/transfers/withdraw/route.ts`
- Recibe `wallet_address` del body sin verificar que pertenezca al `userId` del token.
- **Fix**: Buscar `wallet_address` desde Firestore usando el `userId`, no confiar en el body.

**[SEC-09] Firestore Security Rules abiertas**
- Mencionado en análisis previo — modo demo con reglas abiertas.
- **Fix**: Cerrar rules antes de usuarios reales:
```
match /len_users/{userId} {
  allow read, write: if request.auth.uid == userId;
}
```

**[SEC-10] JWT expiry de 24h en Next.js (auth.ts)**
- **Archivo**: `apps/web/src/lib/auth.ts` — `JWT_EXPIRY = "24h"`
- Estándar bancario es 15 minutos. 24h aumenta ventana de ataque si el token se compromete.
- **Fix**: Reducir a 15m con refresh token para UX fluida.

**[SEC-11] 39 vulnerabilidades de dependencias totales**
- 1 crítica, 12 altas, 21 medias, 5 bajas
- La mayoría vienen de `firebase` y `next` desactualizados.
- **Fix**: Actualizar firebase y next como prioridad.

---

### 🟢 BAJOS

**[SEC-12] `@tootallnate/once` — Prototype pollution (dependencia profunda)**
- Viene de `firebase-admin → @google-cloud/storage → http-proxy-agent`
- Difícil de explotar en este contexto. Actualizar firebase-admin cuando salga parche.

**[SEC-13] Logs exponen datos sensibles en consola**
- `console.log` en rutas de producción muestra CLABEs parciales, user_ids, montos.
- En Railway los logs son visibles a cualquiera con acceso al dashboard.
- **Fix**: Usar logger estructurado (pino) con niveles, filtrar datos sensibles.

**[SEC-14] LEN_JWT_SECRET no configurado en .env.local**
- Las rutas API de Next.js fallarán al intentar verificar JWT si esta variable no está.
- **Fix**: Agregar en Railway: `LEN_JWT_SECRET=<openssl rand -hex 32>`

---

## PARTE 2 — UX REVIEW

### RESUMEN

| Severidad | Cantidad |
|---|---|
| 🔴 Bloqueante | 2 |
| 🟡 Importante | 5 |
| 🟢 Mejora | 4 |

---

### 🔴 BLOQUEANTES

**[UX-01] Usuario real no puede registrarse**
- **Ruta**: `/register`
- La página dice "Registro próximamente" y redirige al login. Un usuario real que quiera usar LEN no tiene forma de entrar.
- Correcto para demo, bloqueante para producción.
- **Fix**: Conectar con auth-service cuando esté deployado.

**[UX-02] Retiro muestra éxito pero no hace nada**
- **Ruta**: `/withdraw`
- El flujo completa correctamente (PIN, confirmación, voucher), pero el SPEI nunca llega porque está comentado.
- El usuario cree que retiró pero su dinero no llegó al banco.
- **Fix**: Deshabilitar el botón de retiro con mensaje "Disponible próximamente" hasta tener proveedor SPEI.

---

### 🟡 IMPORTANTES

**[UX-03] Onboarding confuso — usuarios demo no son obvios**
- **Ruta**: `/login`
- Las credenciales demo (`demo-gt`, `demo-mx`, `demo-hn` / PIN `111111`) están en la página de registro, no en login.
- Un usuario nuevo que llega directo a `/login` no sabe cómo entrar.
- **Fix**: Mostrar el panel de credenciales demo también en `/login`, o agregar botón "Entrar como demo" directo.

**[UX-04] Dashboard sin estado de carga claro**
- **Ruta**: `/dashboard`
- Si el backend no está conectado, el dashboard carga silenciosamente sin error. El usuario no sabe si está viendo datos reales o demo.
- **Fix**: Mostrar badge visible "MODO DEMO" en el dashboard cuando no hay backend conectado.

**[UX-05] Flujo de envío — fee no visible antes de confirmar**
- **Ruta**: `/send`
- El usuario llega hasta el paso de confirmación PIN antes de ver cuánto cuesta la transacción.
- Estándar bancario: mostrar fee en el paso de amount, no en confirmación.
- **Fix**: Mostrar comisión (0.3%) en el paso de `quote` antes del PIN.

**[UX-06] /add-money sin instrucciones específicas por usuario**
- **Ruta**: `/add-money`
- Las instrucciones de depósito son genéricas. En producción cada usuario necesita su CLABE o número de cuenta específico.
- **Fix**: Mostrar CLABE/cuenta individual del usuario cuando auth-service esté conectado.

**[UX-07] Mensajes de error técnicos expuestos**
- En varios flujos, errores de blockchain o API se muestran directamente: `"Error en blockchain: execution reverted: insufficient balance"`
- Un usuario final no entiende esto y genera desconfianza.
- **Fix**: Mapear errores técnicos a mensajes humanos: `"Saldo insuficiente para completar esta operación"`.

---

### 🟢 MEJORAS

**[UX-08] /card dice "Próximamente" sin fecha ni expectativa**
- Agregar texto: "Disponible Q3 2026 — regístrate para ser el primero" con campo de email.

**[UX-09] /kyc — niveles poco explicados**
- Los límites por nivel (KYC 0 = $500, KYC 1 = $5,000, etc.) no están visibles en la página KYC.
- El usuario no sabe qué gana al subir de nivel.

**[UX-10] Voucher de transacción sin branding consistente**
- El voucher PNG descargable es funcional pero podría incluir logo LEN más prominente y texto "Transferencia verificada en blockchain Celo" con link a celoscan.io.
- Aumenta la confianza del usuario.

**[UX-11] Sin pantalla de sesión expirada**
- Cuando el JWT expira (24h), el usuario probablemente ve un error genérico en vez de ser redirigido al login con mensaje claro.
- **Fix**: Interceptor en `api-client.ts` que detecte 401 y redirija a `/login?expired=true`.

---

## PLAN DE ACCIÓN PRIORIZADO

### Esta semana (antes de reunión Banrural)
1. 🔴 Quitar Firebase API key hardcodeada del código → git push
2. 🔴 Deshabilitar botón de retiro con "Próximamente" → evitar confusión
3. 🟡 Agregar credenciales demo en página de login

### Antes de usuarios reales
4. 🔴 Actualizar firebase y next.js (vulnerabilidades críticas/altas)
5. 🟡 Agregar `WITHDRAWALS_ENABLED` flag
6. 🟡 Agregar `DEMO_MODE` flag para controlar acceso demo
7. 🟡 Cerrar Firestore security rules
8. 🟡 Mapear errores técnicos a mensajes de usuario

### Post-lanzamiento
9. 🟠 Reducir JWT de 24h a 15min
10. 🟠 Implementar logger estructurado
11. 🟢 Mejorar voucher con branding Celo
12. 🟢 Pantalla de sesión expirada

---

*Generado con audit-security + ux-review — 2026-04-28*
