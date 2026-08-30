import { describe, it, expect } from "vitest";
import { ensureDatabaseSeeded } from "@/lib/db-seed";
import { db } from "@/lib/db";

describe("Database Self-Healing & Seeding", () => {
  it("ensures catalog products and merchant data exist", async () => {
    await ensureDatabaseSeeded();
    const count = await db.product.count();
    expect(count).toBeGreaterThanOrEqual(8);

    const devLaptop = await db.product.findUnique({ where: { sku: "LAP-DEV-PRO-14" } });
    expect(devLaptop).toBeDefined();
    expect(devLaptop?.category).toBe("Laptops");
  });
});
