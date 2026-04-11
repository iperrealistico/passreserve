import { buildSeedState } from "../lib/passreserve-seed.js";
import { getPrismaClient } from "../lib/passreserve-prisma.js";
import { mutatePersistentState } from "../lib/passreserve-state.js";

async function main() {
  process.env.DATABASE_URL ||= "";

  if (!process.env.DATABASE_URL.trim()) {
    throw new Error("DATABASE_URL is required for prisma seed.");
  }

  const prisma = getPrismaClient();

  await mutatePersistentState(async (draft) => {
    const seed = await buildSeedState();

    Object.assign(draft, seed);
  });

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
