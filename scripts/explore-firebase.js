#!/usr/bin/env node
// Explore Firebase data — counts every collection and samples Auth users
const admin = require('firebase-admin');

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
admin.initializeApp({ credential: admin.credential.cert(sa) });

const db = admin.firestore();
const auth = admin.auth();

async function main() {
  console.log('\n=== FIREBASE AUTH ===');
  let authCount = 0;
  let pageToken;
  const sampleUsers = [];
  do {
    const result = await auth.listUsers(1000, pageToken);
    authCount += result.users.length;
    if (sampleUsers.length < 3) sampleUsers.push(...result.users.slice(0, 3 - sampleUsers.length));
    pageToken = result.pageToken;
  } while (pageToken);
  console.log(`Total Auth users: ${authCount}`);
  sampleUsers.forEach(u => console.log(`  - ${u.uid} | ${u.email} | providers: ${u.providerData.map(p=>p.providerId).join(',')}`));

  console.log('\n=== FIRESTORE COLLECTIONS ===');
  const collections = await db.listCollections();
  for (const col of collections) {
    const snap = await col.count().get();
    const count = snap.data().count;
    console.log(`  ${col.id}: ${count} docs`);

    // Sample one doc to show field names
    if (count > 0) {
      const sample = await col.limit(1).get();
      const fields = Object.keys(sample.docs[0].data());
      console.log(`    fields: ${fields.slice(0,8).join(', ')}${fields.length > 8 ? '...' : ''}`);
    }
  }

  console.log('\n=== DONE ===');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
