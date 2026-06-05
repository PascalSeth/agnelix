# Agnelix: Database & Backend Setup
**Stack: Next.js + Prisma + Supabase**

This setup ensures type-safe database interactions and real-time lead updates.

## 1. Supabase Initialization
1. Create a new project on [Supabase](https://supabase.com/).
2. Enable **Database**, **Auth**, and **Storage**.
3. Connection string should be used in your `.env` as `DATABASE_URL`.

## 2. Prisma Schema (`prisma/schema.prisma`)
Define your core data models:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  hunts     Hunt[]
  leads     Lead[]
}

model Lead {
  id          String   @id @default(uuid())
  companyName String
  contactName String?
  email       String?
  intentScore Int
  status      String   // NEW, CONTACTED, BOOKED, CLOSED
  signals     Signal[]
  userId      String
  user        User     @relation(fields: [userId], references: [id])
}

model Signal {
  id        String   @id @default(uuid())
  type      String   // REVIEW_DROP, HIRING, TECH_GAP
  content   String
  leadId    String
  lead      Lead     @relation(fields: [leadId], references: [id])
  createdAt DateTime @default(now())
}

model Hunt {
  id        String   @id @default(uuid())
  niche     String   // e.g., "Dentist"
  location  String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  isActive  Boolean  @default(true)
}
```

## 3. Implementation Workflow
1. **`npx prisma db push`**: Push schema to Supabase.
2. **`npx prisma generate`**: Generate the Prisma client.
3. **Route Handlers**: Build `/app/api/leads` to fetch data for your dashboard.
