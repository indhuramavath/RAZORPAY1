import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && !envUrl.startsWith("file:")) {
    return envUrl;
  }

  // On Vercel / AWS Lambda Serverless environments, the root directory is read-only (EROFS).
  // SQLite requires write permissions to create locks, write-ahead logs, and mutate data.
  // We copy the database file to the writable `/tmp` directory.
  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    (process.env.NODE_ENV === "production" && process.platform === "linux");

  if (isServerless) {
    const tmpDbPath = path.join("/tmp", "dev.db");

    if (!fs.existsSync(tmpDbPath)) {
      const candidatePaths = [
        path.join(process.cwd(), "prisma", "dev.db"),
        path.join(process.cwd(), "dev.db"),
        path.resolve("./prisma/dev.db"),
        path.resolve("./dev.db"),
      ];

      let copied = false;
      for (const src of candidatePaths) {
        if (fs.existsSync(src)) {
          try {
            fs.copyFileSync(src, tmpDbPath);
            console.log(`✓ Copied SQLite database from ${src} to ${tmpDbPath}`);
            copied = true;
            break;
          } catch (e) {
            console.warn(`Failed to copy database from ${src} to /tmp:`, e);
          }
        }
      }

      if (!copied) {
        try {
          fs.writeFileSync(tmpDbPath, "");
        } catch (e) {
          console.warn("Could not create empty /tmp/dev.db file:", e);
        }
      }
    }

    return `file:${tmpDbPath}`;
  }

  return envUrl || "file:./prisma/dev.db";
}

const dbUrl = getDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
