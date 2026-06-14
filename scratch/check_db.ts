import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/db';

async function main() {
  console.log("Checking DB stats...");
  try {
    const userCount = await prisma.user.count();
    console.log(`Total users: ${userCount}`);
    
    const users = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        companyDesc: true,
        role: true,
        onboardingDone: true
      }
    });
    console.log("Users:", JSON.stringify(users, null, 2));

    const campaignCount = await prisma.campaign.count();
    console.log(`Total campaigns: ${campaignCount}`);

    const leadCount = await prisma.lead.count();
    console.log(`Total leads: ${leadCount}`);

    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      _count: true
    });
    console.log("Leads by status:", JSON.stringify(leadsByStatus, null, 2));

  } catch (err) {
    console.error("Error querying database:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
