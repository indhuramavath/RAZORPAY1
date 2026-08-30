import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding RazorGrow AI Database with realistic commerce data...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.recommendationLog.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.paymentAttempt.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.message.deleteMany();
  await prisma.session.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.merchantPolicy.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.idempotencyRecord.deleteMany();

  // 1. Create Main Demo Merchant
  const merchant = await prisma.merchant.create({
    data: {
      id: "merchant_default_rzg",
      name: "ApexTech & Workspace Hub",
      email: "growth@apextech.store",
      currency: "INR",
      transactionLimit: 500000,
      autoApproveBelow: 10000,
      policies: {
        create: [
          {
            ruleType: "MAX_DISCOUNT_PERCENT",
            ruleValue: JSON.stringify({ maxDiscountPercent: 20 }),
            isActive: true,
          },
          {
            ruleType: "MAX_ORDER_VALUE",
            ruleValue: JSON.stringify({ maxAmountINR: 500000 }),
            isActive: true,
          },
          {
            ruleType: "REQUIRE_HUMAN_APPROVAL_ON_CAMPAIGNS",
            ruleValue: JSON.stringify({ required: true }),
            isActive: true,
          },
        ],
      },
    },
  });

  console.log("✓ Created Merchant:", merchant.name);

  // 2. Structured Product Catalog (AI-readable catalog with attributes, compatibility, and affinity)
  const productsData = [
    // LAPTOPS
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
        weight: "1.4kg",
        ports: ["Thunderbolt 4 x3", "HDMI 2.1", "MagSafe", "SDXC"],
        warranty: "2 Years Comprehensive",
      }),
      tags: JSON.stringify(["laptop", "developer", "student", "lightweight", "coding", "work-from-home"]),
      compatibleProductIds: JSON.stringify(["ACC-DOCK-TB4", "ACC-KB-MECH", "ACC-MOU-ERGO", "MON-4K-27", "ACC-SLEEVE-14"]),
      upsellProductIds: JSON.stringify(["LAP-DEV-MAX-16"]),
      crossSellProductIds: JSON.stringify(["ACC-KB-MECH", "ACC-DOCK-TB4", "MON-4K-27", "ACC-SLEEVE-14"]),
    },
    {
      sku: "LAP-DEV-MAX-16",
      name: "ApexBook Max 16 Workstation (32GB, 1TB SSD)",
      description: "Ultimate power workstation designed for machine learning engineers, video editors, and heavy multi-tasking.",
      category: "Laptops",
      price: 119999,
      inventory: 25,
      viewsCount: 890,
      purchasesCount: 42,
      attributes: JSON.stringify({
        brand: "ApexBook",
        ram: "32GB Unified",
        storage: "1TB NVMe Gen4",
        screen: "16.2 inch XDR",
        processor: "ApexSilicon M3 Max 16-core",
        weight: "2.1kg",
        ports: ["Thunderbolt 4 x3", "HDMI 2.1", "MagSafe", "SDXC"],
        warranty: "3 Years Comprehensive",
      }),
      tags: JSON.stringify(["laptop", "workstation", "ml-engineering", "creator", "premium"]),
      compatibleProductIds: JSON.stringify(["ACC-DOCK-TB4", "ACC-KB-MECH", "MON-4K-32", "ACC-STAND-ALU"]),
      upsellProductIds: JSON.stringify([]),
      crossSellProductIds: JSON.stringify(["ACC-DOCK-TB4", "MON-4K-32", "ACC-KB-MECH"]),
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
        processor: "Intel Core i5 13th Gen",
        weight: "1.1kg",
        ports: ["USB-C x2", "3.5mm Jack"],
        warranty: "1 Year Standard",
      }),
      tags: JSON.stringify(["laptop", "student", "budget", "lightweight", "college"]),
      compatibleProductIds: JSON.stringify(["ACC-HUB-7IN1", "ACC-MOU-SLIM", "ACC-SLEEVE-13", "AUD-ANC-PODS"]),
      upsellProductIds: JSON.stringify(["LAP-DEV-PRO-14"]),
      crossSellProductIds: JSON.stringify(["ACC-HUB-7IN1", "ACC-SLEEVE-13", "AUD-ANC-PODS"]),
    },

    // MONITORS
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
        refreshRate: "60Hz",
        panelType: "IPS Anti-Glare",
        powerDelivery: "90W Type-C",
        vesaCompatible: true,
      }),
      tags: JSON.stringify(["monitor", "4k", "display", "coding", "wfh-setup", "usb-c"]),
      compatibleProductIds: JSON.stringify(["LAP-DEV-PRO-14", "LAP-DEV-MAX-16", "ACC-LIGHT-BAR", "ACC-ARM-VESA"]),
      upsellProductIds: JSON.stringify(["MON-4K-32"]),
      crossSellProductIds: JSON.stringify(["ACC-LIGHT-BAR", "ACC-ARM-VESA"]),
    },
    {
      sku: "MON-4K-32",
      name: "ViewSonic Ultra 32\" 4K 144Hz HDR600 Curved Display",
      description: "Immersive curved 32-inch studio monitor with HDR600, 144Hz high refresh rate, and built-in KVM switch.",
      category: "Monitors",
      price: 44999,
      inventory: 18,
      viewsCount: 620,
      purchasesCount: 28,
      attributes: JSON.stringify({
        brand: "ViewSonic",
        resolution: "3840x2160 (4K UHD)",
        refreshRate: "144Hz",
        panelType: "Fast IPS Curved",
        features: ["KVM Switch", "HDR600", "96W Type-C Charging"],
      }),
      tags: JSON.stringify(["monitor", "curved", "gaming", "creator", "144hz"]),
      compatibleProductIds: JSON.stringify(["LAP-DEV-MAX-16", "ACC-LIGHT-BAR"]),
      upsellProductIds: JSON.stringify([]),
      crossSellProductIds: JSON.stringify(["ACC-LIGHT-BAR", "ACC-KB-MECH"]),
    },

    // KEYBOARDS & MICE
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
        batteryLife: "240 Hours (Backlight Off)",
        layout: "75% Compact (84 keys)",
        backlight: "RGB 18 Modes",
      }),
      tags: JSON.stringify(["keyboard", "mechanical", "wireless", "developer", "ergonomic", "mac-compatible"]),
      compatibleProductIds: JSON.stringify(["LAP-DEV-PRO-14", "LAP-DEV-MAX-16", "LAP-STUDENT-AIR-13", "ACC-MOU-ERGO", "ACC-PALM-REST"]),
      upsellProductIds: JSON.stringify([]),
      crossSellProductIds: JSON.stringify(["ACC-MOU-ERGO", "ACC-PALM-REST", "ACC-DESK-MAT"]),
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
        scrollWheel: "MagSpeed Electromagnetic",
        connectivity: "Bluetooth & Logi Bolt USB",
        battery: "70 Days on full charge",
      }),
      tags: JSON.stringify(["mouse", "ergonomic", "productivity", "wireless", "developer"]),
      compatibleProductIds: JSON.stringify(["LAP-DEV-PRO-14", "LAP-DEV-MAX-16", "ACC-KB-MECH", "ACC-DESK-MAT"]),
      upsellProductIds: JSON.stringify([]),
      crossSellProductIds: JSON.stringify(["ACC-KB-MECH", "ACC-DESK-MAT"]),
    },
    {
      sku: "ACC-MOU-SLIM",
      name: "Logi Pebble M350 Ultra-Portable Silent Mouse",
      description: "Slim minimalist silent click mouse with dual connectivity (Bluetooth + 2.4GHz) for student travel and cafe work.",
      category: "Mice",
      price: 1499,
      inventory: 110,
      viewsCount: 1400,
      purchasesCount: 190,
      attributes: JSON.stringify({
        brand: "Logitech",
        sensor: "1000 DPI Optical",
        noise: "90% Noise Reduction",
        battery: "18 Months (1x AA)",
      }),
      tags: JSON.stringify(["mouse", "budget", "portable", "silent", "student"]),
      compatibleProductIds: JSON.stringify(["LAP-STUDENT-AIR-13", "ACC-SLEEVE-13"]),
      upsellProductIds: JSON.stringify(["ACC-MOU-ERGO"]),
      crossSellProductIds: JSON.stringify(["ACC-SLEEVE-13", "ACC-HUB-7IN1"]),
    },

    // DOCKS, HUBS & ACCESSORIES
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
        displays: "Dual 4K 60Hz or Single 8K",
        ethernet: "2.5 Gigabit LAN",
      }),
      tags: JSON.stringify(["dock", "thunderbolt4", "wfh-setup", "power-station", "developer"]),
      compatibleProductIds: JSON.stringify(["LAP-DEV-PRO-14", "LAP-DEV-MAX-16", "MON-4K-27"]),
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
        ports: ["4K@60Hz HDMI", "100W PD Input", "2x USB 3.0 5Gbps", "SD Card", "microSD", "USB-C Data"],
        material: "Aluminum Alloy",
      }),
      tags: JSON.stringify(["hub", "usb-c", "adapter", "budget", "portable", "hdmi"]),
      compatibleProductIds: JSON.stringify(["LAP-STUDENT-AIR-13", "LAP-DEV-PRO-14"]),
      upsellProductIds: JSON.stringify(["ACC-DOCK-TB4"]),
      crossSellProductIds: JSON.stringify(["ACC-SLEEVE-13", "ACC-MOU-SLIM"]),
    },
    {
      sku: "ACC-LIGHT-BAR",
      name: "BenQ ScreenBar Halo Eye-Care Monitor Light",
      description: "Auto-dimming asymmetrical monitor lamp with wireless rotary puck controller and back ambient halo light to eliminate screen glare.",
      category: "Accessories",
      price: 8499,
      inventory: 40,
      viewsCount: 1500,
      purchasesCount: 110,
      attributes: JSON.stringify({
        brand: "BenQ",
        illumination: "500 Lux auto-adjusted",
        colorTemp: "2700K to 6500K adjustable",
        controller: "Wireless 2.4GHz Smart Dial",
      }),
      tags: JSON.stringify(["light-bar", "desk-lamp", "eye-care", "ergonomic", "wfh-setup"]),
      compatibleProductIds: JSON.stringify(["MON-4K-27", "MON-4K-32"]),
      upsellProductIds: JSON.stringify([]),
      crossSellProductIds: JSON.stringify(["MON-4K-27", "ACC-KB-MECH"]),
    },
    {
      sku: "ACC-STAND-ALU",
      name: "Rain Design mStand Ergonomic Aluminum Laptop Riser",
      description: "Solid single-piece aluminum riser that elevates screen 5.9 inches for neck comfort and provides airflow cooling.",
      category: "Accessories",
      price: 3499,
      inventory: 65,
      viewsCount: 1800,
      purchasesCount: 175,
      attributes: JSON.stringify({
        brand: "Rain Design",
        material: "Sand-blasted Anodized Aluminum",
        elevation: "5.9 inches (150mm)",
        compatibility: "Fits all 13\" to 16\" laptops",
      }),
      tags: JSON.stringify(["stand", "riser", "ergonomic", "aluminum", "cooling"]),
      compatibleProductIds: JSON.stringify(["LAP-DEV-PRO-14", "LAP-DEV-MAX-16", "LAP-STUDENT-AIR-13"]),
      upsellProductIds: JSON.stringify([]),
      crossSellProductIds: JSON.stringify(["ACC-KB-MECH", "ACC-MOU-ERGO"]),
    },

    // AUDIO & NOISE CANCELLING
    {
      sku: "AUD-ANC-XM5",
      name: "Sony WH-1000XM5 Wireless Noise-Cancelling Headphones",
      description: "Industry-leading noise cancellation with 8 microphones, 30-hour battery, and crystal clear call quality for remote focus.",
      category: "Audio",
      price: 26999,
      inventory: 30,
      viewsCount: 1900,
      purchasesCount: 115,
      attributes: JSON.stringify({
        brand: "Sony",
        anc: "Dual Processor V1 + HD QN1",
        battery: "30 Hours (3 min quick charge for 3 hrs)",
        codecs: ["LDAC", "AAC", "SBC"],
        weight: "250g",
      }),
      tags: JSON.stringify(["headphones", "anc", "audio", "focus", "work-from-home", "wireless"]),
      compatibleProductIds: JSON.stringify(["LAP-DEV-PRO-14", "LAP-DEV-MAX-16", "LAP-STUDENT-AIR-13"]),
      upsellProductIds: JSON.stringify([]),
      crossSellProductIds: JSON.stringify(["ACC-STAND-ALU", "ACC-KB-MECH"]),
    },
    {
      sku: "AUD-ANC-PODS",
      name: "Soundcore Space A40 ANC Wireless Earbuds (50h Playtime)",
      description: "Compact Hi-Res wireless earbuds with adaptive active noise cancellation and LDAC audio for budget-conscious students.",
      category: "Audio",
      price: 4999,
      inventory: 80,
      viewsCount: 2100,
      purchasesCount: 240,
      attributes: JSON.stringify({
        brand: "Soundcore",
        anc: "Up to 98% Adaptive Noise Reduction",
        battery: "10h single charge / 50h with case",
        waterResistance: "IPX4",
      }),
      tags: JSON.stringify(["earbuds", "anc", "budget", "audio", "student", "portable"]),
      compatibleProductIds: JSON.stringify(["LAP-STUDENT-AIR-13"]),
      upsellProductIds: JSON.stringify(["AUD-ANC-XM5"]),
      crossSellProductIds: JSON.stringify(["ACC-SLEEVE-13", "ACC-HUB-7IN1"]),
    },

    // ERGONOMIC FURNITURE & DESK ACCESSORIES
    {
      sku: "FUR-CHAIR-ERGO",
      name: "ErgoSmart Pro High-Back Mesh Task Chair with 3D Armrests",
      description: "Breathable Korean mesh ergonomic office chair with dynamic lumbar support, tilt-lock recline, and 5-year warranty.",
      category: "Furniture",
      price: 15999,
      inventory: 22,
      viewsCount: 1300,
      purchasesCount: 65,
      attributes: JSON.stringify({
        brand: "ErgoSmart",
        material: "German Breathable Mesh & Nylon Base",
        adjustments: ["3D Armrest", "Seat Height", "Lumbar Depth", "135° Recline"],
        maxWeight: "135kg",
      }),
      tags: JSON.stringify(["chair", "ergonomic", "furniture", "wfh-setup", "back-support"]),
      compatibleProductIds: JSON.stringify(["FUR-DESK-STAND", "ACC-DESK-MAT"]),
      upsellProductIds: JSON.stringify([]),
      crossSellProductIds: JSON.stringify(["FUR-DESK-STAND", "ACC-DESK-MAT"]),
    },
    {
      sku: "ACC-DESK-MAT",
      name: "Orbitkey Vegan Leather Desk Mat with Magnetic Cable Holder",
      description: "Water-resistant premium vegan leather desk pad with built-in toolbar organizer and magnetic cable anchor.",
      category: "Accessories",
      price: 2499,
      inventory: 95,
      viewsCount: 1850,
      purchasesCount: 210,
      attributes: JSON.stringify({
        brand: "Orbitkey",
        dimensions: "68 x 37 cm (Medium)",
        material: "Premium Vegan PU Leather & Recycled PET Felt",
      }),
      tags: JSON.stringify(["desk-mat", "leather", "organization", "accessories", "aesthetic"]),
      compatibleProductIds: JSON.stringify(["ACC-KB-MECH", "ACC-MOU-ERGO"]),
      upsellProductIds: JSON.stringify([]),
      crossSellProductIds: JSON.stringify(["ACC-KB-MECH", "ACC-MOU-ERGO"]),
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
        protection: "CornerArmor Patent + Thick 3D Foam",
        compatibility: "14-inch Laptops",
      }),
      tags: JSON.stringify(["sleeve", "bag", "protection", "travel", "student"]),
      compatibleProductIds: JSON.stringify(["LAP-DEV-PRO-14"]),
      upsellProductIds: JSON.stringify([]),
      crossSellProductIds: JSON.stringify(["LAP-DEV-PRO-14", "ACC-HUB-7IN1"]),
    },
  ];

  for (const prod of productsData) {
    await prisma.product.create({
      data: {
        merchantId: merchant.id,
        ...prod,
      },
    });
  }
  console.log(`✓ Inserted ${productsData.length} structured catalog products`);

  // 3. Synthetic Customer Cohorts
  const customersData = [
    {
      email: "aditi.sharma@techcorp.in",
      name: "Aditi Sharma",
      phone: "+919876543210",
      segments: JSON.stringify(["developer", "high_ltv", "wfh_pro"]),
      lifetimeValue: 124500,
    },
    {
      email: "rohit.verma@college.edu.in",
      name: "Rohit Verma",
      phone: "+919812345678",
      segments: JSON.stringify(["student", "budget_conscious"]),
      lifetimeValue: 47998,
    },
    {
      email: "priya.nair@startup.io",
      name: "Priya Nair",
      phone: "+919988776655",
      segments: JSON.stringify(["founder", "tech_pro", "fast_buyer"]),
      lifetimeValue: 88400,
    },
    {
      email: "karthik.r@consulting.com",
      name: "Karthik Raghavan",
      phone: "+919765432109",
      segments: JSON.stringify(["consultant", "accessories_buyer"]),
      lifetimeValue: 34997,
    },
  ];

  const createdCustomers = [];
  for (const cust of customersData) {
    const c = await prisma.customer.create({ data: cust });
    createdCustomers.push(c);
  }
  console.log(`✓ Inserted ${createdCustomers.length} synthetic customer cohorts`);

  // 4. Pre-computed Historical Orders (to power real analytics & association mining)
  const devLaptop = await prisma.product.findUnique({ where: { sku: "LAP-DEV-PRO-14" } });
  const mechKb = await prisma.product.findUnique({ where: { sku: "ACC-KB-MECH" } });
  const ergoMouse = await prisma.product.findUnique({ where: { sku: "ACC-MOU-ERGO" } });
  const mon4k = await prisma.product.findUnique({ where: { sku: "MON-4K-27" } });
  const tbDock = await prisma.product.findUnique({ where: { sku: "ACC-DOCK-TB4" } });

  // --- Current period orders (last 30 days) — 4 orders ---
  const sampleOrders = [
    {
      customerIndex: 0,
      items: [
        { product: devLaptop!, qty: 1, isUpsell: false },
        { product: mechKb!, qty: 1, isUpsell: true },
        { product: ergoMouse!, qty: 1, isUpsell: true },
      ],
      aiAttributed: true,
      aiType: "UPSELL",
      aiAmount: 14498,
      status: "PAID",
      confirmed: true,
      daysAgo: 14,
    },
    {
      customerIndex: 1,
      items: [
        { product: devLaptop!, qty: 1, isUpsell: false },
        { product: mechKb!, qty: 1, isUpsell: true },
      ],
      aiAttributed: true,
      aiType: "CROSS_SELL",
      aiAmount: 6499,
      status: "PAID",
      confirmed: true,
      daysAgo: 10,
    },
    {
      customerIndex: 2,
      items: [
        { product: mon4k!, qty: 1, isUpsell: false },
        { product: tbDock!, qty: 1, isUpsell: true },
      ],
      aiAttributed: true,
      aiType: "UPSELL",
      aiAmount: 18999,
      status: "PAID",
      confirmed: true,
      daysAgo: 7,
    },
    {
      customerIndex: 3,
      items: [
        { product: mechKb!, qty: 1, isUpsell: false },
        { product: ergoMouse!, qty: 1, isUpsell: true },
      ],
      aiAttributed: true,
      aiType: "CROSS_SELL",
      aiAmount: 7999,
      status: "PAID",
      confirmed: true,
      daysAgo: 3,
    },
    // --- Previous period orders (31-60 days ago) — for real period-over-period growth calculation ---
    {
      customerIndex: 0,
      items: [
        { product: devLaptop!, qty: 1, isUpsell: false },
        { product: mechKb!, qty: 1, isUpsell: true },
      ],
      aiAttributed: true,
      aiType: "UPSELL",
      aiAmount: 6499,
      status: "PAID",
      confirmed: true,
      daysAgo: 38,
    },
    {
      customerIndex: 2,
      items: [
        { product: mon4k!, qty: 1, isUpsell: false },
      ],
      aiAttributed: false,
      aiType: "DIRECT_DISCOVERY",
      aiAmount: 0,
      status: "PAID",
      confirmed: true,
      daysAgo: 45,
    },
    {
      customerIndex: 1,
      items: [
        { product: mechKb!, qty: 1, isUpsell: false },
        { product: ergoMouse!, qty: 1, isUpsell: false },
      ],
      aiAttributed: false,
      aiType: "DIRECT_DISCOVERY",
      aiAmount: 0,
      status: "PAID",
      confirmed: true,
      daysAgo: 52,
    },
  ];

  for (let i = 0; i < sampleOrders.length; i++) {
    const oData = sampleOrders[i];
    const customer = createdCustomers[oData.customerIndex];
    const subtotal = oData.items.reduce((sum, it) => sum + it.product.price * it.qty, 0);
    const orderNumber = `RZG-2026-${1000 + i}`;
    const rzpOrderId = `order_test_${1000 + i}`;
    const rzpPaymentId = `pay_test_${1000 + i}`;
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - oData.daysAgo);

    // Create session & cart
    const sess = await prisma.session.create({
      data: {
        customerId: customer.id,
        sessionToken: `sess_hist_${i}`,
        state: "COMPLETE",
        createdAt: orderDate,
      },
    });

    const cart = await prisma.cart.create({
      data: {
        sessionId: sess.id,
        customerId: customer.id,
        status: "CONVERTED",
        subtotal,
        total: subtotal,
        createdAt: orderDate,
        items: {
          create: oData.items.map((it) => ({
            productId: it.product.id,
            quantity: it.qty,
            unitPrice: it.product.price,
            totalPrice: it.product.price * it.qty,
            isUpsell: it.isUpsell,
            addedVia: it.isUpsell ? "AGENT_RECOMMENDATION" : "DIRECT",
          })),
        },
      },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber,
        merchantId: merchant.id,
        customerId: customer.id,
        cartId: cart.id,
        subtotal,
        total: subtotal,
        currency: "INR",
        status: oData.status,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: `sig_verified_hist_${i}`,
        idempotencyKey: `idemp_hist_${i}`,
        confirmedByCustomer: oData.confirmed,
        aiAttributed: oData.aiAttributed,
        aiAttributionType: oData.aiType,
        aiRevenueAmount: oData.aiAmount,
        createdAt: orderDate,
        items: {
          create: oData.items.map((it) => ({
            productId: it.product.id,
            quantity: it.qty,
            unitPrice: it.product.price,
            totalPrice: it.product.price * it.qty,
            isUpsell: it.isUpsell,
          })),
        },
      },
    });

    await prisma.paymentAttempt.create({
      data: {
        orderId: order.id,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        amount: subtotal,
        currency: "INR",
        status: "SUCCESS",
        idempotencyKey: `pay_idemp_hist_${i}`,
        createdAt: orderDate,
      },
    });

    await prisma.auditLog.create({
      data: {
        merchantId: merchant.id,
        actor: "BUYER",
        actorType: "HUMAN",
        sessionId: sess.id,
        orderId: order.id,
        action: "PAYMENT_SUCCESS",
        toolName: "verify_payment",
        inputState: JSON.stringify({ rzpOrderId, rzpPaymentId, amount: subtotal }),
        outputState: JSON.stringify({ status: "PAID", orderNumber }),
        decision: "ALLOWED",
        riskScore: 0.02,
        createdAt: orderDate,
      },
    });
  }

  console.log("✓ Seeded historical settled orders & audit traces");

  // 4b. Seed abandoned carts — required for real cart abandonment rate metric
  // 3 abandoned carts out of total ~10 carts = ~30% abandonment rate
  const studentLaptop = await prisma.product.findUnique({ where: { sku: "LAP-STUDENT-AIR-13" } });
  const ankerHub = await prisma.product.findUnique({ where: { sku: "ACC-HUB-7IN1" } });

  const abandonedCartsData = [
    {
      customer: createdCustomers[1], // Rohit Verma — student
      items: [{ product: studentLaptop!, qty: 1 }],
      daysAgo: 8,
      reason: "Price barrier at ₹42,999 checkout",
    },
    {
      customer: createdCustomers[3], // Karthik — accessories buyer
      items: [
        { product: mechKb!, qty: 1 },
        { product: ankerHub!, qty: 1 },
      ],
      daysAgo: 18,
      reason: "Dropped off at ORDER_REVIEW step",
    },
    {
      customer: createdCustomers[1], // Rohit — second attempt, also abandoned
      items: [{ product: ankerHub!, qty: 1 }],
      daysAgo: 25,
      reason: "Session expired before payment confirmation",
    },
  ];

  for (let i = 0; i < abandonedCartsData.length; i++) {
    const aData = abandonedCartsData[i];
    const abandonDate = new Date();
    abandonDate.setDate(abandonDate.getDate() - aData.daysAgo);
    const subtotalAbandoned = aData.items.reduce((sum, it) => sum + it.product.price * it.qty, 0);

    const abandonedSession = await prisma.session.create({
      data: {
        customerId: aData.customer.id,
        sessionToken: `sess_abandoned_${i}_${Date.now()}`,
        state: "ORDER_REVIEW",
        createdAt: abandonDate,
      },
    });

    await prisma.cart.create({
      data: {
        sessionId: abandonedSession.id,
        customerId: aData.customer.id,
        status: "ABANDONED",
        subtotal: subtotalAbandoned,
        total: subtotalAbandoned,
        createdAt: abandonDate,
        items: {
          create: aData.items.map((it) => ({
            productId: it.product.id,
            quantity: it.qty,
            unitPrice: it.product.price,
            totalPrice: it.product.price * it.qty,
            isUpsell: false,
            addedVia: "DIRECT",
          })),
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        merchantId: merchant.id,
        actor: "SYSTEM",
        actorType: "WORKER",
        sessionId: abandonedSession.id,
        action: "CART_ABANDONED:CHECKOUT_DROPOFF",
        toolName: "session_monitor",
        inputState: JSON.stringify({ sessionId: abandonedSession.id, subtotal: subtotalAbandoned }),
        outputState: JSON.stringify({ reason: aData.reason, cartStatus: "ABANDONED" }),
        decision: "BLOCKED",
        riskScore: 0.15,
        createdAt: abandonDate,
      },
    });
  }

  console.log(`✓ Seeded ${abandonedCartsData.length} abandoned carts for real abandonment rate metric`);

  // 5. Pre-Detected AI Revenue Opportunities for Merchant Copilot
  const opportunities = [
    {
      merchantId: merchant.id,
      type: "UPSELL_ATTACH",
      title: "High Laptop Checkout Affinity: Mechanical Keyboard Upsell",
      description:
        "38.2% of shoppers purchasing the ApexBook Pro 14 also view or subsequently search for the Keychron K2 Mechanical Keyboard within 48 hours. Activating an in-checkout prompt is estimated to increase accessory attach rate by 24%.",
      evidence: JSON.stringify({
        primaryProductSku: "LAP-DEV-PRO-14",
        recommendedProductSku: "ACC-KB-MECH",
        historicalAffinity: 0.382,
        monthlyQualifiedOrders: 88,
        conversionLiftEstimate: 0.24,
        avgAdditionalOrderValueINR: 6499,
        sampleSize: 1420,
      }),
      estimatedImpact: 137250, // ₹1,37,250 / month uplift
      confidenceScore: 0.88,
      riskLevel: "LOW",
      actionPayload: JSON.stringify({
        actionType: "ENABLE_ATTACH_RULE",
        triggerProductSku: "LAP-DEV-PRO-14",
        suggestProductSku: "ACC-KB-MECH",
        discountPercent: 5,
        maxDiscountINR: 350,
        position: "CHECKOUT_CONFIRMATION",
      }),
      status: "APPROVED", // Pre-approved to demonstrate closed-loop immediately
      approvedAt: new Date(),
    },
    {
      merchantId: merchant.id,
      type: "BUNDLE_CROSS_SELL",
      title: "4K Designer Display + Thunderbolt 4 Dock Pro Bundle",
      description:
        "Customers purchasing the ViewSonic 27\" 4K monitor frequently face port shortage on ultrabooks. Offering the CalDigit TS4 Dock with a ₹1,000 bundle incentive closes dual-purchase decisions 3.1x faster.",
      evidence: JSON.stringify({
        primaryProductSku: "MON-4K-27",
        recommendedProductSku: "ACC-DOCK-TB4",
        historicalAffinity: 0.295,
        monthlyQualifiedOrders: 95,
        conversionLiftEstimate: 0.18,
        avgAdditionalOrderValueINR: 18999,
        sampleSize: 1650,
      }),
      estimatedImpact: 324880,
      confidenceScore: 0.82,
      riskLevel: "LOW",
      actionPayload: JSON.stringify({
        actionType: "ENABLE_BUNDLE_PROMOTION",
        triggerProductSku: "MON-4K-27",
        suggestProductSku: "ACC-DOCK-TB4",
        bundleDiscountINR: 1000,
        position: "CONVERSATIONAL_RECOMMENDATION",
      }),
      status: "PENDING", // Pending merchant review
    },
    {
      merchantId: merchant.id,
      type: "CART_ABANDONMENT",
      title: "Student Laptop Checkout Drop-off at ₹45k Price Barrier",
      description:
        "High cart abandonment (42%) observed for ApexAir Slim 13 when paired with accessories exceeding ₹50,000 budget thresholds. Recommending the Anker 7-in-1 Hub as a budget bundle preserves cart conversions.",
      evidence: JSON.stringify({
        primaryProductSku: "LAP-STUDENT-AIR-13",
        abandonmentRate: 0.42,
        detectedDropoffStep: "ORDER_REVIEW",
        targetBudgetCap: 50000,
        sampleSize: 2200,
      }),
      estimatedImpact: 98000,
      confidenceScore: 0.79,
      riskLevel: "MEDIUM",
      actionPayload: JSON.stringify({
        actionType: "AUTO_APPLY_STUDENT_BUNDLE_INCENTIVE",
        triggerCategory: "Laptops",
        maxBudgetConstraintINR: 50000,
        incentiveDiscountINR: 500,
      }),
      status: "PENDING",
    },
  ];

  for (const opp of opportunities) {
    await prisma.opportunity.create({ data: opp });
  }

  console.log(`✓ Inserted ${opportunities.length} AI growth opportunities`);
  console.log("🚀 Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
