/**
 * Seed the database with demo users and investment records for the video demo.
 * Usage: npx tsx seed.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function generateWalletAddress(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const base = Math.abs(hash).toString(16).padStart(8, "0");
  return (base + base + base + base + base + base + base + base).slice(0, 64);
}

function generateEncryptedKey(): string {
  const bytes = new Uint8Array(64);
  for (let i = 0; i < 64; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function main() {
  console.log("Seeding database...");

  const password = await bcrypt.hash("demo123", 10);

  // Driver 1 — owns 2 tricycles
  const driver1Seed = "demo-driver-1-seed-001";
  const driver1 = await prisma.user.upsert({
    where: { email: "ama@demo.3rike.com" },
    update: {},
    create: {
      email: "ama@demo.3rike.com",
      passwordHash: password,
      role: "driver",
      fullName: "Ama Okonkwo",
      phone: "+234 801 234 5678",
      country: "Nigeria",
      address: "12 Allen Avenue, Ikeja, Lagos",
      walletAddress: generateWalletAddress(driver1Seed),
      encryptedKey: generateEncryptedKey(),
      kycCommitment: "c1a2b3d4e5f6" + Date.now().toString(16),
    },
  });

  // Driver 2 — owns 1 tricycle
  const driver2Seed = "demo-driver-2-seed-002";
  const driver2 = await prisma.user.upsert({
    where: { email: "kwame@demo.3rike.com" },
    update: {},
    create: {
      email: "kwame@demo.3rike.com",
      passwordHash: password,
      role: "driver",
      fullName: "Kwame Mensah",
      phone: "+233 24 567 8901",
      country: "Ghana",
      address: "34 Osu Oxford St, Accra",
      walletAddress: generateWalletAddress(driver2Seed),
      encryptedKey: generateEncryptedKey(),
      kycCommitment: "f6e5d4c3b2a1" + Date.now().toString(16),
    },
  });

  // Investor 1
  const investor1Seed = "demo-investor-1-seed-003";
  const investor1 = await prisma.user.upsert({
    where: { email: "sade@demo.3rike.com" },
    update: {},
    create: {
      email: "sade@demo.3rike.com",
      passwordHash: password,
      role: "investor",
      fullName: "Sade Adebayo",
      phone: "+234 809 876 5432",
      country: "Nigeria",
      walletAddress: generateWalletAddress(investor1Seed),
      encryptedKey: generateEncryptedKey(),
    },
  });

  // Investor 2
  const investor2Seed = "demo-investor-2-seed-004";
  const investor2 = await prisma.user.upsert({
    where: { email: "kofi@demo.3rike.com" },
    update: {},
    create: {
      email: "kofi@demo.3rike.com",
      passwordHash: password,
      role: "investor",
      fullName: "Kofi Asante",
      phone: "+233 50 123 4567",
      country: "Ghana",
      walletAddress: generateWalletAddress(investor2Seed),
      encryptedKey: generateEncryptedKey(),
    },
  });

  console.log(`  Created driver1: ${driver1.email} (id=${driver1.id})`);
  console.log(`  Created driver2: ${driver2.email} (id=${driver2.id})`);
  console.log(`  Created investor1: ${investor1.email} (id=${investor1.id})`);
  console.log(`  Created investor2: ${investor2.email} (id=${investor2.id})`);

  // Clear existing investments
  await prisma.investment.deleteMany();
  await prisma.deposit.deleteMany();
  console.log("  Cleared old investment/deposit records");

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  // --- Deposits for investors ---
  await prisma.deposit.createMany({
    data: [
      { userId: investor1.id, kind: "crypto", amountUsdc: "5000.000000", status: "confirmed", commitment: "dep-c1-" + Date.now(), createdAt: daysAgo(30) },
      { userId: investor1.id, kind: "crypto", amountUsdc: "3000.000000", status: "confirmed", commitment: "dep-c2-" + Date.now(), createdAt: daysAgo(14) },
      { userId: investor2.id, kind: "crypto", amountUsdc: "4500.000000", status: "confirmed", commitment: "dep-c3-" + Date.now(), createdAt: daysAgo(21) },
      { userId: investor2.id, kind: "bank", amountUsdc: "2000.000000", status: "confirmed", commitment: "dep-c4-" + Date.now(), createdAt: daysAgo(7) },
    ],
  });
  console.log("  Created 4 deposit records");

  // --- Investments ---
  // Investor1 owns shares in TRK-001 and TRK-002
  // Investor2 owns shares in TRK-001 and TRK-003
  await prisma.investment.createMany({
    data: [
      // Investor 1 — TRK-001 (30 shares at $50/share = $1500)
      { userId: investor1.id, tricycleId: 1, vehicleId: "TRK-001", action: "invest", shares: "30", amountUsdc: "1500.000000", commitment: "inv-001-i1", txHash: "commit-i1-trk1-001", createdAt: daysAgo(25) },
      // Investor 1 — TRK-001 (10 more shares)
      { userId: investor1.id, tricycleId: 1, vehicleId: "TRK-001", action: "invest", shares: "10", amountUsdc: "500.000000", commitment: "inv-001-i1b", txHash: "commit-i1-trk1-002", createdAt: daysAgo(12) },
      // Investor 1 — TRK-002 (20 shares at $56/share = $1120)
      { userId: investor1.id, tricycleId: 2, vehicleId: "TRK-002", action: "invest", shares: "20", amountUsdc: "1120.000000", commitment: "inv-002-i1", txHash: "commit-i1-trk2-001", createdAt: daysAgo(18) },
      // Investor 1 — yield claim on TRK-001
      { userId: investor1.id, tricycleId: 1, vehicleId: "TRK-001", action: "claim", shares: null, amountUsdc: "0", commitment: "clm-001-i1", txHash: "commit-claim-i1-trk1", createdAt: daysAgo(5) },

      // Investor 2 — TRK-001 (15 shares at $50/share = $750)
      { userId: investor2.id, tricycleId: 1, vehicleId: "TRK-001", action: "invest", shares: "15", amountUsdc: "750.000000", commitment: "inv-001-i2", txHash: "commit-i2-trk1-001", createdAt: daysAgo(20) },
      // Investor 2 — TRK-003 (25 shares at $46/share = $1150)
      { userId: investor2.id, tricycleId: 3, vehicleId: "TRK-003", action: "invest", shares: "25", amountUsdc: "1150.000000", commitment: "inv-003-i2", txHash: "commit-i2-trk3-001", createdAt: daysAgo(15) },
    ],
  });
  console.log("  Created 6 investment records");

  console.log("\nDemo accounts (password: demo123):");
  console.log("  Driver:  ama@demo.3rike.com");
  console.log("  Driver:  kwame@demo.3rike.com");
  console.log("  Investor: sade@demo.3rike.com");
  console.log("  Investor: kofi@demo.3rike.com");
  console.log("\nDone!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
