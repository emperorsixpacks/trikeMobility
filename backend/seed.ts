/**
 * Seed the database with demo users and investment records.
 * Uses HD wallet derivation — each user gets a unique Cardano address.
 * Usage: npx tsx seed.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { provisionWallet } from "./src/services/wallet.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const password = await bcrypt.hash("demo123", 10);

  // Driver 1
  const w1 = await provisionWallet();
  const driver1 = await prisma.user.create({
    data: {
      email: "ama@demo.3rike.com",
      passwordHash: password,
      role: "driver",
      fullName: "Ama Okonkwo",
      phone: "+234 801 234 5678",
      country: "Nigeria",
      address: "12 Allen Avenue, Ikeja, Lagos",
      walletIndex: w1.walletIndex,
      walletAddress: w1.walletAddress,
      kycCommitment: "c1a2b3d4e5f6" + Date.now().toString(16),
    },
  });

  // Driver 2
  const w2 = await provisionWallet();
  const driver2 = await prisma.user.create({
    data: {
      email: "kwame@demo.3rike.com",
      passwordHash: password,
      role: "driver",
      fullName: "Kwame Mensah",
      phone: "+233 24 567 8901",
      country: "Ghana",
      address: "34 Osu Oxford St, Accra",
      walletIndex: w2.walletIndex,
      walletAddress: w2.walletAddress,
      kycCommitment: "f6e5d4c3b2a1" + Date.now().toString(16),
    },
  });

  // Investor 1
  const w3 = await provisionWallet();
  const investor1 = await prisma.user.create({
    data: {
      email: "sade@demo.3rike.com",
      passwordHash: password,
      role: "investor",
      fullName: "Sade Adebayo",
      phone: "+234 809 876 5432",
      country: "Nigeria",
      walletIndex: w3.walletIndex,
      walletAddress: w3.walletAddress,
    },
  });

  // Investor 2
  const w4 = await provisionWallet();
  const investor2 = await prisma.user.create({
    data: {
      email: "kofi@demo.3rike.com",
      passwordHash: password,
      role: "investor",
      fullName: "Kofi Asante",
      phone: "+233 50 123 4567",
      country: "Ghana",
      walletIndex: w4.walletIndex,
      walletAddress: w4.walletAddress,
    },
  });

  console.log(`  Driver 1:  ${driver1.email} → ${driver1.walletAddress}`);
  console.log(`  Driver 2:  ${driver2.email} → ${driver2.walletAddress}`);
  console.log(`  Investor 1: ${investor1.email} → ${investor1.walletAddress}`);
  console.log(`  Investor 2: ${investor2.email} → ${investor2.walletAddress}`);

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  // Deposits
  await prisma.deposit.createMany({
    data: [
      { userId: investor1.id, kind: "crypto", amountUsdc: "5000.000000", status: "confirmed", commitment: "dep-c1-" + Date.now(), createdAt: daysAgo(30) },
      { userId: investor1.id, kind: "crypto", amountUsdc: "3000.000000", status: "confirmed", commitment: "dep-c2-" + Date.now(), createdAt: daysAgo(14) },
      { userId: investor2.id, kind: "crypto", amountUsdc: "4500.000000", status: "confirmed", commitment: "dep-c3-" + Date.now(), createdAt: daysAgo(21) },
      { userId: investor2.id, kind: "bank", amountUsdc: "2000.000000", status: "confirmed", commitment: "dep-c4-" + Date.now(), createdAt: daysAgo(7) },
    ],
  });
  console.log("  Created 4 deposits");

  // Investments
  await prisma.investment.createMany({
    data: [
      { userId: investor1.id, tricycleId: 1, vehicleId: "TRK-001", action: "invest", shares: "30", amountUsdc: "1500.000000", commitment: "inv-001-i1", txHash: "commit-i1-trk1-001", createdAt: daysAgo(25) },
      { userId: investor1.id, tricycleId: 1, vehicleId: "TRK-001", action: "invest", shares: "10", amountUsdc: "500.000000", commitment: "inv-001-i1b", txHash: "commit-i1-trk1-002", createdAt: daysAgo(12) },
      { userId: investor1.id, tricycleId: 2, vehicleId: "TRK-002", action: "invest", shares: "20", amountUsdc: "1000.000000", commitment: "inv-002-i1", txHash: "commit-i1-trk2-001", createdAt: daysAgo(18) },
      { userId: investor1.id, tricycleId: 1, vehicleId: "TRK-001", action: "claim", shares: null, amountUsdc: "0", commitment: "clm-001-i1", txHash: "commit-claim-i1-trk1", createdAt: daysAgo(5) },
      { userId: investor2.id, tricycleId: 1, vehicleId: "TRK-001", action: "invest", shares: "15", amountUsdc: "750.000000", commitment: "inv-001-i2", txHash: "commit-i2-trk1-001", createdAt: daysAgo(20) },
      { userId: investor2.id, tricycleId: 3, vehicleId: "TRK-003", action: "invest", shares: "25", amountUsdc: "1250.000000", commitment: "inv-003-i2", txHash: "commit-i2-trk3-001", createdAt: daysAgo(15) },
    ],
  });
  console.log("  Created 6 investments");

  console.log("\nDemo accounts (password: demo123):");
  console.log("  Driver:  ama@demo.3rike.com");
  console.log("  Driver:  kwame@demo.3rike.com");
  console.log("  Investor: sade@demo.3rike.com");
  console.log("  Investor: kofi@demo.3rike.com");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
