import { db } from "./db";

let isSeeding = false;
let isSeeded = false;

export async function ensureDatabaseSeeded() {
  if (isSeeded) return;
  if (isSeeding) return;

  try {
    isSeeding = true;
    const count = await db.product.count().catch(() => 0);
    if (count > 0) {
      isSeeded = true;
      isSeeding = false;
      return;
    }

    console.log("🌱 Auto-seeding catalog & merchant data...");

    // Create default merchant
    const merchant = await db.merchant.upsert({
      where: { id: "merchant_default_rzg" },
      update: {},
      create: {
        id: "merchant_default_rzg",
        name: "ApexTech & Workspace Hub",
        email: "growth@apextech.store",
        currency: "INR",
        transactionLimit: 500000,
        autoApproveBelow: 10000,
      },
    });

    // Default policies
    await db.merchantPolicy.createMany({
      data: [
        {
          merchantId: merchant.id,
          ruleType: "MAX_DISCOUNT_PERCENT",
          ruleValue: JSON.stringify({ maxDiscountPercent: 20 }),
          isActive: true,
        },
        {
          merchantId: merchant.id,
          ruleType: "MAX_ORDER_VALUE",
          ruleValue: JSON.stringify({ maxAmountINR: 500000 }),
          isActive: true,
        },
        {
          merchantId: merchant.id,
          ruleType: "REQUIRE_HUMAN_APPROVAL_ON_CAMPAIGNS",
          ruleValue: JSON.stringify({ required: true }),
          isActive: true,
        },
      ],
    }).catch(() => {});

    // Core catalog products
    const products = [
      {
        sku: "LAP-DEV-PRO-14",
        name: "ApexBook Pro 14 M-Series (16GB, 512GB SSD)",
        description: "Flagship ultralight developer laptop with 18-hour battery, 3.2K Liquid Retina display, and lightning-fast compile speeds.",
        category: "Laptops",
        price: 68999,
        inventory: 45,
        viewsCount: 1420,
        purchasesCount: 88,
        attributes: JSON.stringify({
          brand: "ApexBook",
          ram: "16GB Unified",
          storage: "512GB NVMe",
          screen: "14.2 inch 120Hz",
          processor: "ApexSilicon M3 10-core",
        }),
        tags: JSON.stringify(["laptop", "developer", "student", "lightweight", "coding", "work-from-home"]),
        compatibleProductIds: JSON.stringify(["ACC-DOCK-TB4", "ACC-KB-MECH", "ACC-MOU-ERGO", "MON-4K-27", "ACC-SLEEVE-14"]),
        upsellProductIds: JSON.stringify(["LAP-DEV-MAX-16"]),
        crossSellProductIds: JSON.stringify(["ACC-KB-MECH", "ACC-DOCK-TB4", "MON-4K-27", "ACC-SLEEVE-14"]),
      },
      {
        sku: "LAP-STUDENT-AIR-13",
        name: "ApexAir Slim 13 (8GB, 256GB SSD)",
        description: "Ultra-portable all-day battery laptop for students, remote writers, and everyday productivity under ₹45k.",
        category: "Laptops",
        price: 42999,
        inventory: 60,
        viewsCount: 2200,
        purchasesCount: 154,
        attributes: JSON.stringify({
          brand: "ApexAir",
          ram: "8GB LPDDR5",
          storage: "256GB SSD",
          screen: "13.3 inch FHD IPS",
        }),
        tags: JSON.stringify(["laptop", "student", "budget", "lightweight", "college"]),
        compatibleProductIds: JSON.stringify(["ACC-HUB-7IN1", "ACC-MOU-SLIM", "ACC-SLEEVE-13", "AUD-ANC-PODS"]),
        upsellProductIds: JSON.stringify(["LAP-DEV-PRO-14"]),
        crossSellProductIds: JSON.stringify(["ACC-HUB-7IN1", "ACC-SLEEVE-13", "AUD-ANC-PODS"]),
      },
      {
        sku: "MON-4K-27",
        name: "ViewSonic Pro 27\" 4K UHD IPS Designer Monitor",
        description: "Calibrated 99% DCI-P3 4K display with single-cable 90W USB-C charging for laptops, anti-glare, and height-adjustable stand.",
        category: "Monitors",
        price: 24999,
        inventory: 35,
        viewsCount: 1650,
        purchasesCount: 95,
        attributes: JSON.stringify({
          brand: "ViewSonic",
          resolution: "3840x2160 (4K UHD)",
          powerDelivery: "90W Type-C",
        }),
        tags: JSON.stringify(["monitor", "4k", "display", "coding", "wfh-setup", "usb-c"]),
        compatibleProductIds: JSON.stringify(["LAP-DEV-PRO-14", "LAP-DEV-MAX-16", "ACC-LIGHT-BAR"]),
        upsellProductIds: JSON.stringify(["MON-4K-32"]),
        crossSellProductIds: JSON.stringify(["ACC-LIGHT-BAR", "ACC-DOCK-TB4"]),
      },
      {
        sku: "ACC-KB-MECH",
        name: "Keychron K2 V2 Wireless Mechanical Keyboard (RGB, Hot-Swap)",
        description: "75% compact mechanical keyboard with hot-swappable Gateron G Pro switches, Bluetooth 5.1 multi-device pairing, and Mac/Windows layout.",
        category: "Keyboards",
        price: 6499,
        inventory: 85,
        viewsCount: 3100,
        purchasesCount: 290,
        attributes: JSON.stringify({
          brand: "Keychron",
          switchType: "Gateron Brown (Tactile)",
          connectivity: "Bluetooth 5.1 & USB-C",
        }),
        tags: JSON.stringify(["keyboard", "mechanical", "wireless", "developer", "ergonomic"]),
        compatibleProductIds: JSON.stringify(["LAP-DEV-PRO-14", "LAP-STUDENT-AIR-13", "ACC-MOU-ERGO"]),
        upsellProductIds: JSON.stringify([]),
        crossSellProductIds: JSON.stringify(["ACC-MOU-ERGO", "ACC-DESK-MAT"]),
      },
      {
        sku: "ACC-MOU-ERGO",
        name: "Logitech MX Master 3S Wireless Performance Mouse",
        description: "Industry-standard ergonomic mouse with 8K DPI any-surface tracking, quiet clicks, and electromagnetic MagSpeed wheel.",
        category: "Mice",
        price: 7999,
        inventory: 70,
        viewsCount: 2800,
        purchasesCount: 310,
        attributes: JSON.stringify({
          brand: "Logitech",
          sensor: "8000 DPI Darkfield",
        }),
        tags: JSON.stringify(["mouse", "ergonomic", "productivity", "wireless"]),
        compatibleProductIds: JSON.stringify(["LAP-DEV-PRO-14", "ACC-KB-MECH"]),
        upsellProductIds: JSON.stringify([]),
        crossSellProductIds: JSON.stringify(["ACC-KB-MECH"]),
      },
      {
        sku: "ACC-DOCK-TB4",
        name: "CalDigit TS4 Thunderbolt 4 18-Port Station (98W Host Power)",
        description: "Ultimate workspace dock with 18 ports, dual 4K/single 8K output, 2.5GbE Ethernet, UHS-II SD, and 98W laptop charging.",
        category: "Accessories",
        price: 18999,
        inventory: 20,
        viewsCount: 1100,
        purchasesCount: 48,
        attributes: JSON.stringify({
          brand: "CalDigit",
          portsCount: 18,
          charging: "98W Power Delivery",
        }),
        tags: JSON.stringify(["dock", "thunderbolt4", "wfh-setup", "power-station"]),
        compatibleProductIds: JSON.stringify(["LAP-DEV-PRO-14", "MON-4K-27"]),
        upsellProductIds: JSON.stringify([]),
        crossSellProductIds: JSON.stringify(["MON-4K-27", "ACC-KB-MECH"]),
      },
      {
        sku: "ACC-HUB-7IN1",
        name: "Anker PowerExpand 7-in-1 USB-C PD Media Hub",
        description: "Compact aluminum USB-C hub with 4K HDMI, 100W PD passthrough, SD/TF slots, and 2x USB 3.0 ports.",
        category: "Accessories",
        price: 2999,
        inventory: 90,
        viewsCount: 2400,
        purchasesCount: 220,
        attributes: JSON.stringify({
          brand: "Anker",
          material: "Aluminum Alloy",
        }),
        tags: JSON.stringify(["hub", "usb-c", "adapter", "budget", "portable"]),
        compatibleProductIds: JSON.stringify(["LAP-STUDENT-AIR-13", "LAP-DEV-PRO-14"]),
        upsellProductIds: JSON.stringify(["ACC-DOCK-TB4"]),
        crossSellProductIds: JSON.stringify(["ACC-SLEEVE-13", "ACC-MOU-SLIM"]),
      },
      {
        sku: "ACC-SLEEVE-14",
        name: "Tomtoc 360° Protective Laptop Sleeve (14-inch)",
        description: "Military-grade CornerArmor protected water-resistant sleeve with front accessory zipper pouch.",
        category: "Accessories",
        price: 1999,
        inventory: 120,
        viewsCount: 1600,
        purchasesCount: 180,
        attributes: JSON.stringify({
          brand: "Tomtoc",
          protection: "CornerArmor Patent",
        }),
        tags: JSON.stringify(["sleeve", "bag", "protection", "travel", "student"]),
        compatibleProductIds: JSON.stringify(["LAP-DEV-PRO-14"]),
        upsellProductIds: JSON.stringify([]),
        crossSellProductIds: JSON.stringify(["LAP-DEV-PRO-14", "ACC-HUB-7IN1"]),
      },
    ];

    for (const p of products) {
      await db.product.upsert({
        where: { sku: p.sku },
        update: {},
        create: {
          merchantId: merchant.id,
          ...p,
        },
      });
    }

    // Default AI opportunity
    await db.opportunity.create({
      data: {
        merchantId: merchant.id,
        type: "UPSELL_ATTACH",
        title: "High Laptop Checkout Affinity: Mechanical Keyboard Upsell",
        description: "38.2% of shoppers purchasing the ApexBook Pro 14 also view or subsequently search for the Keychron K2 Mechanical Keyboard within 48 hours. Activating an in-checkout prompt is estimated to increase accessory attach rate by 24%.",
        evidence: JSON.stringify({
          primaryProductSku: "LAP-DEV-PRO-14",
          recommendedProductSku: "ACC-KB-MECH",
          historicalAffinity: 0.382,
          conversionLiftEstimate: 0.24,
          avgAdditionalOrderValueINR: 6499,
        }),
        estimatedImpact: 137250,
        confidenceScore: 0.88,
        riskLevel: "LOW",
        actionPayload: JSON.stringify({
          actionType: "ENABLE_ATTACH_RULE",
          triggerProductSku: "LAP-DEV-PRO-14",
          suggestProductSku: "ACC-KB-MECH",
          discountPercent: 5,
        }),
        status: "APPROVED",
        approvedAt: new Date(),
      },
    }).catch(() => {});

    isSeeded = true;
    isSeeding = false;
    console.log("✓ Database auto-seeding completed successfully");
  } catch (err) {
    console.error("Auto-seeding error:", err);
    isSeeding = false;
  }
}
