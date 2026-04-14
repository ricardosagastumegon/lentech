# LEN — Versiones

| Versión | Fecha | Deploy URL | Estado |
|---------|-------|------------|--------|
| **v0.5.0** | 13 Abr 2026 | [web-production-1c372.up.railway.app](https://web-production-1c372.up.railway.app) | ✅ LIVE |
| v0.4.1 | 13 Abr 2026 | (mismo URL) | reemplazado |
| v0.4.0 | 13 Abr 2026 | (mismo URL) | reemplazado |
| v0.3.0 | 13 Abr 2026 | (mismo URL) | reemplazado |
| v0.2.0 | 12 Abr 2026 | (mismo URL) | reemplazado |
| v0.1.0 | 10 Abr 2026 | (mismo URL) | reemplazado |

## v0.5.0 — 13 Abr 2026
- PIN modal: z-[200] (above BottomNav), bottom-sheet móvil con drag handle, scroll seguro
- PINInput: colores migrados de mondega-green → len-purple (consistencia de marca)
- Demo history: 9 transacciones pre-cargadas en login (fiat_load, token_buy×2, token_sell, transfer×2, fx_swap×2, pending) — historia rica en cualquier dispositivo
- Badge de versión v0.5.0

## v0.3.0 — 13 Abr 2026
- Phase 1 coin system: QUETZA/MEXCOIN/LEMPI activos · Phase 2/3 ocultos
- Cash App nav: Home | Activity | [FAB Send] | Card | Profile
- Historial completo: búsqueda + filtros tipo/moneda/fecha
- Admin: panel Puente Bancario con latencia en vivo, liquidez, colas
- FX UI: eliminar USD de pantallas de usuario, mostrar fiat local (GTQ/MXN/HNL)
- Eliminar comparativo vs Western Union
- Rebrandear "Adquirir QUETZA" (compra de tokens, no intermediación)
- Badge de versión v0.3 en top bar

## v0.2.0 — 12 Abr 2026
- LEN rebrand completo (purple #6C5CE7, design system)
- FX Engine cliente (QUETZA⇄MEXCOIN⇄LEMPI sin backend)
- 3 usuarios demo GT/MX/HN con PIN 111111
- Páginas: add-money, receive QR, card coming soon, settings
- BalanceCard con gráfico, RatesTicker animado

## v0.1.0 — 10 Abr 2026
- Setup monorepo pnpm/Turborepo
- Railway deployment (Nixpacks, pnpm-lock.yaml)
- Login demo básico · root redirect
- Dashboard esqueleto

---
> Reporte de estado completo: `reports/2026-04-13_1600/LEN_StatusReport_v0.3.html`
