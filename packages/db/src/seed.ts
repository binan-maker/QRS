/**
 * @binro/db — Development seed data
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
      { name: "Website",    slug: "website"    },
      { name: "Contact",    slug: "contact"    },
      { name: "WiFi",       slug: "wifi"       },
      { name: "Location",   slug: "location"   },
      { name: "Event",      slug: "event"      },
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
      .insert(schema.qrCodes)
      .values({
        id: "dev-qr-001",
        content: "https://binro.app",
        displayDestination: "https://binro.app",
        contentType: "url",
        qrType: "qr",
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
