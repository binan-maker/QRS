/**
 * @binro/db — Development seed data
 *
 * Populates a fresh PostgreSQL database with:
 *   - 10 default categories (already in migration 0001)
 *   - Sample users (dev/test only)
 *   - Sample QR codes
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx packages/db/src/seed.ts
 *
 * WARNING: Never run against production.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index";

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed production database");
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  console.log("🌱 Seeding database...");

  // ── Categories ──────────────────────────────────────────────────────────────
  await db
    .insert(schema.categories)
    .values([
      { name: "Payment",    slug: "payment"    },
      { name: "Business",   slug: "business"   },
      { name: "Social",     slug: "social"     },
      { name: "Website",    slug: "website"    },
      { name: "Contact",    slug: "contact"    },
      { name: "WiFi",       slug: "wifi"       },
      { name: "Location",   slug: "location"   },
      { name: "Event",      slug: "event"      },
      { name: "Government", slug: "government" },
      { name: "Other",      slug: "other"      },
    ])
    .onConflictDoNothing();

  console.log("✅ Categories seeded");

  // ── Dev users (non-production only) ─────────────────────────────────────────
  const [devUser] = await db
    .insert(schema.users)
    .values({
      id: "dev-user-001",
      email: "dev@binro.test",
      emailVerified: true,
      displayName: "Dev User",
      username: "devuser",
    })
    .onConflictDoNothing()
    .returning();

  if (devUser) {
    await db
      .insert(schema.unifiedQrs)
      .values({
        id: "dev-qr-001",
        ownerId: devUser.id,
        ownerName: devUser.displayName,
        destination: "https://binro.app",
        rawDestination: "https://binro.app",
        contentType: "url",
        title: "Sample QR",
        isDynamic: true,
      })
      .onConflictDoNothing();
    console.log("✅ Dev user + sample QR seeded");
  }

  await pool.end();
  console.log("🌱 Seeding complete");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
