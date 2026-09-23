/**
 * One-off: encrypt bank account numbers on withdrawal requests created before
 * field encryption existed. Safe to re-run (already-encrypted rows are skipped).
 *
 *   npx tsx scripts/encrypt-bank-accounts.ts
 */
import "dotenv/config";

import { encryptSecret, isEncrypted, lastFour } from "../src/lib/crypto";
import { prisma } from "../src/lib/prisma";

async function main() {
  const rows = await prisma.withdrawalRequest.findMany({
    select: { id: true, accountNumber: true },
  });

  let updated = 0;

  for (const row of rows) {
    if (isEncrypted(row.accountNumber)) {
      continue;
    }

    await prisma.withdrawalRequest.update({
      where: { id: row.id },
      data: {
        accountNumber: encryptSecret(row.accountNumber),
        accountLast4: lastFour(row.accountNumber),
      },
    });
    updated += 1;
  }

  console.log(`Encrypted ${updated} of ${rows.length} withdrawal requests.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
