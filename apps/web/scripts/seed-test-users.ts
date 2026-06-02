/**
 * Script: seed 2 usuarios de prueba reales en Firestore.
 *
 * Uso (Node 20.6+ tiene --env-file built-in, no necesitamos dotenv):
 *   cd apps/web
 *   node --env-file=.env.local --import tsx scripts/seed-test-users.ts
 *
 * O si tu Node es más viejo:
 *   cd apps/web && set -a && source .env.local && set +a && npx tsx scripts/seed-test-users.ts
 *
 * Requiere variables de entorno:
 *   - FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *     o firebase-service-account.json en raíz del repo
 *
 * Crea 2 usuarios:
 *   1. Operador Guatemala (admin) — phone 50212345678 — PIN aleatorio
 *   2. Cliente prueba México (user)  — phone 5215512345678 — PIN aleatorio
 *
 * Los PINs se imprimen en pantalla. Guárdalos en un lugar seguro.
 * Después del primer login, el usuario puede cambiar su PIN desde la app.
 */

import { randomBytes } from "crypto";

async function main() {
  const { createUser, getUserByPhone } = await import("../src/lib/users-db");

  const seeds = [
    {
      label:        "Operador Guatemala (admin)",
      phone:        "50212345678",
      display_name: "Operador LEN — Guatemala",
      country:      "GT" as const,
      role:         "admin" as const,
    },
    {
      label:        "Cliente prueba México",
      phone:        "5215512345678",
      display_name: "Cliente Prueba — México",
      country:      "MX" as const,
      role:         "user" as const,
    },
  ];

  console.log("\n=================================================");
  console.log(" LEN — Seed de usuarios de prueba");
  console.log("=================================================\n");

  for (const seed of seeds) {
    // Skip si ya existe
    const existing = await getUserByPhone(seed.phone);
    if (existing) {
      console.log(`⏭  ${seed.label} ya existe (phone: ${seed.phone}, user_id: ${existing.user_id})`);
      continue;
    }

    // Generar PIN aleatorio de 6 dígitos
    const pin = String(parseInt(randomBytes(3).toString("hex"), 16) % 1000000).padStart(6, "0");

    try {
      const user = await createUser({
        phone:        seed.phone,
        display_name: seed.display_name,
        country:      seed.country,
        pin,
        role:         seed.role,
      });

      console.log(`\n✓ Creado: ${seed.label}`);
      console.log(`  user_id:      ${user.user_id}`);
      console.log(`  phone:        ${user.phone}`);
      console.log(`  country:      ${user.country}`);
      console.log(`  role:         ${user.role}`);
      console.log(`  PIN inicial:  ${pin}   ← GUARDA ESTE PIN`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n✗ Error creando ${seed.label}: ${msg}`);
    }
  }

  console.log("\n=================================================");
  console.log(" Seed completo.");
  console.log(" Para hacer login:");
  console.log("   1. Abre la app web");
  console.log("   2. Usa el phone + PIN que aparece arriba");
  console.log(" Si necesitas resetear un PIN: panel admin → Accesos");
  console.log("=================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error fatal:", err);
    process.exit(1);
  });
