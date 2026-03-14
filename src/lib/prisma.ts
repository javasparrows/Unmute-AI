import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

// Raw client - use for auth adapter, webhooks, admin queries
export const prismaAdmin = globalForPrisma.prismaBase ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = prismaAdmin;
}

// Filtered client - auto-excludes soft-deleted users
export const prisma = prismaAdmin.$extends({
  query: {
    user: {
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async count({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
    },
  },
});
