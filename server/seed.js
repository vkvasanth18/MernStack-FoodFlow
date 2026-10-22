/**
 * seed.js
 * ───────────────────────────────────────────────────────────────
 * ONE-COMMAND seed script for FoodFlow AI.
 *
 * Run from the server/ folder:
 *   node seed.js            ← populates DB with sample data
 *   node seed.js --destroy  ← wipes ALL data from every collection
 *
 * What gets created:
 *   • 2 Users         (admin + manager)
 *   • 4 Suppliers
 *   • 8 Raw Materials (with realistic stock & expiry dates)
 *   • 5 Products      (with recipes linking to raw materials)
 *   • 6 Production batches (mix of Planned / In Progress / Completed)
 *   • 10 Waste records
 *   • 30 Demand history records (last 30 days, for 3 products)
 *   • 5 Alerts        (LOW_STOCK, EXPIRY, HIGH_WASTE)
 *   • Inventory transactions (auto-created as side-effects)
 * ─────────────────────────────────────────────────────────────
 */

import mongoose  from 'mongoose';
import dotenv    from 'dotenv';
import bcrypt    from 'bcryptjs';
import colors    from 'colors';

import User                from './models/User.js';
import Supplier            from './models/Supplier.js';
import RawMaterial         from './models/RawMaterial.js';
import Product             from './models/Product.js';
import Production          from './models/Production.js';
import Waste               from './models/Waste.js';
import DemandHistory       from './models/DemandHistory.js';
import Alert               from './models/Alert.js';
import InventoryTransaction from './models/InventoryTransaction.js';
import Forecast            from './models/Forecast.js';

dotenv.config();

// ─── Connect to MongoDB ───────────────────────────────────────
const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌  MONGO_URI not found in server/.env'.red.bold);
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('✅  MongoDB connected'.green.bold);
};

// ─── Helpers ──────────────────────────────────────────────────
// Returns a date N days in the past / future from today
const daysAgo    = (n) => new Date(Date.now() - n * 86_400_000);
const daysFuture = (n) => new Date(Date.now() + n * 86_400_000);

// Random integer between min and max (inclusive)
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─────────────────────────────────────────────────────────────
// DESTROY mode — wipe everything
// ─────────────────────────────────────────────────────────────
const destroyData = async () => {
  await Promise.all([
    User.deleteMany(),
    Supplier.deleteMany(),
    RawMaterial.deleteMany(),
    Product.deleteMany(),
    Production.deleteMany(),
    Waste.deleteMany(),
    DemandHistory.deleteMany(),
    Alert.deleteMany(),
    InventoryTransaction.deleteMany(),
    Forecast.deleteMany(),
  ]);
  console.log('🗑️   All data destroyed'.red.bold);
  process.exit(0);
};

// ─────────────────────────────────────────────────────────────
// IMPORT / SEED mode
// ─────────────────────────────────────────────────────────────
const importData = async () => {

  // ── 0. Clean slate ───────────────────────────────────────
  await Promise.all([
    User.deleteMany(),
    Supplier.deleteMany(),
    RawMaterial.deleteMany(),
    Product.deleteMany(),
    Production.deleteMany(),
    Waste.deleteMany(),
    DemandHistory.deleteMany(),
    Alert.deleteMany(),
    InventoryTransaction.deleteMany(),
    Forecast.deleteMany(),
  ]);
  console.log('🧹  Cleared existing data'.yellow);

  // ── 1. USERS ─────────────────────────────────────────────
  const adminPass1   = await bcrypt.hash('admin123', 10);
  const adminPass2   = await bcrypt.hash('Password123', 10);
  const managerPass1 = await bcrypt.hash('manager123', 10);
  const managerPass2 = await bcrypt.hash('Password123', 10);

  const [admin, manager] = await User.insertMany([
    {
      name    : 'Admin User',
      email   : 'admin@foodplatform.com',
      password: adminPass2,
      role    : 'admin',
      isActive: true,
    },
    {
      name    : 'Production Manager',
      email   : 'production@foodplatform.com',
      password: managerPass2,
      role    : 'production_manager',
      isActive: true,
    },
    {
      name    : 'Admin FoodFlow',
      email   : 'admin@foodflow.com',
      password: adminPass1,
      role    : 'admin',
      isActive: true,
    },
    {
      name    : 'Sarah Manager',
      email   : 'manager@foodflow.com',
      password: managerPass1,
      role    : 'production_manager',
      isActive: true,
    },
  ]);
  console.log('👤  Users seeded (4)'.cyan);

  // ── 2. SUPPLIERS ─────────────────────────────────────────
  const suppliers = await Supplier.insertMany([
    {
      companyName     : 'GrainMaster Co.',
      name            : 'James Wheat',
      email           : 'james@grainmaster.com',
      phone           : '+1-555-0101',
      address         : '12 Mill Road, Kansas City, KS',
      rating          : 4.8,
      leadTimeDays    : 3,
      materialsSupplied: ['Wheat Flour', 'Corn Starch'],
      status          : 'Active',
    },
    {
      companyName     : 'DairyFresh Ltd.',
      name            : 'Emma Butter',
      email           : 'emma@dairyfresh.com',
      phone           : '+1-555-0202',
      address         : '45 Cream Lane, Wisconsin, WI',
      rating          : 4.5,
      leadTimeDays    : 2,
      materialsSupplied: ['Full-Fat Milk', 'Butter', 'Cheese Powder'],
      status          : 'Active',
    },
    {
      companyName     : 'SweetRoots Inc.',
      name            : 'Carlos Sugar',
      email           : 'carlos@sweetroots.com',
      phone           : '+1-555-0303',
      address         : '88 Cane Street, Louisiana, LA',
      rating          : 4.2,
      leadTimeDays    : 5,
      materialsSupplied: ['Refined Sugar', 'Brown Sugar', 'Cocoa Powder'],
      status          : 'Active',
    },
    {
      companyName     : 'OilTech Suppliers',
      name            : 'Linda Press',
      email           : 'linda@oiltech.com',
      phone           : '+1-555-0404',
      address         : '23 Refinery Blvd, Texas, TX',
      rating          : 3.9,
      leadTimeDays    : 4,
      materialsSupplied: ['Vegetable Oil', 'Palm Oil'],
      status          : 'Active',
    },
  ]);
  console.log('🏭  Suppliers seeded (4)'.cyan);

  // ── 3. RAW MATERIALS ─────────────────────────────────────
  const materials = await RawMaterial.insertMany([
    {
      name        : 'Wheat Flour',
      code        : 'RM-001',
      category    : 'Grains & Flours',
      unit        : 'kg',
      currentStock: 850,
      minStock    : 200,
      maxStock    : 2000,
      costPerUnit : 40,
      supplier    : suppliers[0]._id,
      expiryDate  : daysFuture(120),
      location    : 'Warehouse A - Bay 1',
      notes       : 'Store in dry, cool conditions. Humidity < 60%.',
    },
    {
      name        : 'Refined Sugar',
      code        : 'RM-002',
      category    : 'Sweeteners',
      unit        : 'kg',
      currentStock: 320,
      minStock    : 100,
      maxStock    : 1000,
      costPerUnit : 55,
      supplier    : suppliers[2]._id,
      expiryDate  : daysFuture(365),
      location    : 'Warehouse A - Bay 2',
    },
    {
      name        : 'Full-Fat Milk',
      code        : 'RM-003',
      category    : 'Dairy Ingredients',
      unit        : 'liters',
      currentStock: 45,          // ← deliberately LOW (triggers low-stock alert)
      minStock    : 100,
      maxStock    : 500,
      costPerUnit : 60,
      supplier    : suppliers[1]._id,
      expiryDate  : daysFuture(5), // ← near expiry (triggers expiry alert)
      location    : 'Cold Room 1',
      notes       : 'Must be kept at 2-4°C at all times.',
    },
    {
      name        : 'Cocoa Powder',
      code        : 'RM-004',
      category    : 'Seasoning & Spices',
      unit        : 'kg',
      currentStock: 180,
      minStock    : 50,
      maxStock    : 400,
      costPerUnit : 350,
      supplier    : suppliers[2]._id,
      expiryDate  : daysFuture(200),
      location    : 'Warehouse B - Bay 3',
    },
    {
      name        : 'Vegetable Oil',
      code        : 'RM-005',
      category    : 'Oils & Fats',
      unit        : 'liters',
      currentStock: 600,
      minStock    : 150,
      maxStock    : 1500,
      costPerUnit : 140,
      supplier    : suppliers[3]._id,
      expiryDate  : daysFuture(180),
      location    : 'Warehouse B - Bay 4',
    },
    {
      name        : 'Butter',
      code        : 'RM-006',
      category    : 'Dairy Ingredients',
      unit        : 'kg',
      currentStock: 90,
      minStock    : 80,           // ← barely above minimum
      maxStock    : 300,
      costPerUnit : 480,
      supplier    : suppliers[1]._id,
      expiryDate  : daysFuture(30),
      location    : 'Cold Room 2',
    },
    {
      name        : 'Corn Starch',
      code        : 'RM-007',
      category    : 'Grains & Flours',
      unit        : 'kg',
      currentStock: 240,
      minStock    : 60,
      maxStock    : 600,
      costPerUnit : 50,
      supplier    : suppliers[0]._id,
      expiryDate  : daysFuture(300),
      location    : 'Warehouse A - Bay 5',
    },
    {
      name        : 'Baking Powder',
      code        : 'RM-008',
      category    : 'Seasoning & Spices',
      unit        : 'kg',
      currentStock: 35,           // ← LOW stock (below minStock)
      minStock    : 40,
      maxStock    : 200,
      costPerUnit : 180,
      supplier    : suppliers[0]._id,
      expiryDate  : daysFuture(90),
      location    : 'Warehouse A - Bay 6',
      notes       : 'Keep sealed. Moisture-sensitive.',
    },
  ]);
  console.log('🧂  Raw Materials seeded (8)'.cyan);

  // ── 4. PRODUCTS ──────────────────────────────────────────
  const products = await Product.insertMany([
    {
      name          : 'Classic White Bread',
      code          : 'PRD-001',
      category      : 'Bakery',
      description   : 'Standard 800g white sandwich loaf. High-volume everyday product.',
      unit          : 'units',
      currentStock  : 240,
      minStock      : 50,
      maxStock      : 1000,
      productionCost: 65,
      sellingPrice  : 150,
      shelfLifeDays : 5,
      recipe        : [
        { material: materials[0]._id, quantity: 0.6  }, // 600g wheat flour per loaf
        { material: materials[6]._id, quantity: 0.02 }, // 20g corn starch
        { material: materials[7]._id, quantity: 0.01 }, // 10g baking powder
        { material: materials[4]._id, quantity: 0.03 }, // 30ml oil
      ],
      isActive: true,
    },
    {
      name          : 'Chocolate Fudge Cake',
      code          : 'PRD-002',
      category      : 'Bakery',
      description   : 'Rich 500g chocolate fudge layer cake. Premium product line.',
      unit          : 'units',
      currentStock  : 36,
      minStock      : 20,
      maxStock      : 200,
      productionCost: 280,
      sellingPrice  : 750,
      shelfLifeDays : 7,
      recipe        : [
        { material: materials[0]._id, quantity: 0.25 }, // flour
        { material: materials[3]._id, quantity: 0.08 }, // cocoa
        { material: materials[1]._id, quantity: 0.20 }, // sugar
        { material: materials[5]._id, quantity: 0.10 }, // butter
        { material: materials[2]._id, quantity: 0.15 }, // milk
      ],
      isActive: true,
    },
    {
      name          : 'Butter Croissant',
      code          : 'PRD-003',
      category      : 'Bakery',
      description   : 'Flaky, golden 85g French-style butter croissant.',
      unit          : 'units',
      currentStock  : 120,
      minStock      : 30,
      maxStock      : 500,
      productionCost: 45,
      sellingPrice  : 120,
      shelfLifeDays : 3,
      recipe        : [
        { material: materials[0]._id, quantity: 0.12 }, // flour
        { material: materials[5]._id, quantity: 0.05 }, // butter
        { material: materials[1]._id, quantity: 0.02 }, // sugar
      ],
      isActive: true,
    },
    {
      name          : 'Vanilla Sponge Cake',
      code          : 'PRD-004',
      category      : 'Bakery',
      description   : 'Light 400g vanilla sponge with cream filling.',
      unit          : 'units',
      currentStock  : 18,
      minStock      : 10,
      maxStock      : 150,
      productionCost: 175,
      sellingPrice  : 520,
      shelfLifeDays : 5,
      recipe        : [
        { material: materials[0]._id, quantity: 0.20 }, // flour
        { material: materials[1]._id, quantity: 0.15 }, // sugar
        { material: materials[5]._id, quantity: 0.08 }, // butter
        { material: materials[2]._id, quantity: 0.10 }, // milk
        { material: materials[7]._id, quantity: 0.01 }, // baking powder
      ],
      isActive: true,
    },
    {
      name          : 'Corn Starch Biscuit',
      code          : 'PRD-005',
      category      : 'Snacks',
      description   : 'Light 200g packet of gluten-reduced corn starch biscuits.',
      unit          : 'packs',
      currentStock  : 75,
      minStock      : 25,
      maxStock      : 400,
      productionCost: 55,
      sellingPrice  : 180,
      shelfLifeDays : 30,
      recipe        : [
        { material: materials[6]._id, quantity: 0.15 }, // corn starch
        { material: materials[1]._id, quantity: 0.05 }, // sugar
        { material: materials[4]._id, quantity: 0.04 }, // oil
      ],
      isActive: true,
    },
  ]);
  console.log('🍞  Products seeded (5)'.cyan);

  // ── 5. PRODUCTION BATCHES ────────────────────────────────
  const productions = await Production.insertMany([
    // Completed batches (past)
    {
      batchNumber    : 'BATCH-2024-001',
      product        : products[0]._id,
      plannedQuantity: 500,
      actualQuantity : 488,
      efficiency     : 97.6,
      status         : 'Completed',
      productionDate : daysAgo(6),
      completionDate : daysAgo(6),
      materialsUsed  : [
        { material: materials[0]._id, quantity: 300 },
        { material: materials[6]._id, quantity: 10  },
        { material: materials[7]._id, quantity: 5   },
        { material: materials[4]._id, quantity: 15  },
      ],
      notes          : 'Slight under-yield due to oven temperature variance.',
      manager        : admin._id,
    },
    {
      batchNumber    : 'BATCH-2024-002',
      product        : products[1]._id,
      plannedQuantity: 80,
      actualQuantity : 82,
      efficiency     : 102.5,
      status         : 'Completed',
      productionDate : daysAgo(5),
      completionDate : daysAgo(5),
      materialsUsed  : [
        { material: materials[0]._id, quantity: 20  },
        { material: materials[3]._id, quantity: 6.4 },
        { material: materials[1]._id, quantity: 16  },
        { material: materials[5]._id, quantity: 8   },
        { material: materials[2]._id, quantity: 12  },
      ],
      notes          : 'Over-yield. Recipe refined for next batch.',
      manager        : manager._id,
    },
    {
      batchNumber    : 'BATCH-2024-003',
      product        : products[2]._id,
      plannedQuantity: 200,
      actualQuantity : 195,
      efficiency     : 97.5,
      status         : 'Completed',
      productionDate : daysAgo(4),
      completionDate : daysAgo(4),
      materialsUsed  : [
        { material: materials[0]._id, quantity: 24 },
        { material: materials[5]._id, quantity: 10 },
        { material: materials[1]._id, quantity: 4  },
      ],
      manager        : admin._id,
    },
    {
      batchNumber    : 'BATCH-2024-004',
      product        : products[3]._id,
      plannedQuantity: 60,
      actualQuantity : 58,
      efficiency     : 96.7,
      status         : 'Completed',
      productionDate : daysAgo(3),
      completionDate : daysAgo(3),
      materialsUsed  : [
        { material: materials[0]._id, quantity: 12  },
        { material: materials[1]._id, quantity: 9   },
        { material: materials[5]._id, quantity: 4.8 },
        { material: materials[2]._id, quantity: 6   },
        { material: materials[7]._id, quantity: 0.6 },
      ],
      manager        : manager._id,
    },
    // In-progress batch
    {
      batchNumber    : 'BATCH-2024-005',
      product        : products[0]._id,
      plannedQuantity: 400,
      status         : 'In Progress',
      productionDate : daysAgo(1),
      materialsUsed  : [
        { material: materials[0]._id, quantity: 240 },
        { material: materials[6]._id, quantity: 8   },
        { material: materials[7]._id, quantity: 4   },
        { material: materials[4]._id, quantity: 12  },
      ],
      notes          : 'Night-shift run. Expected completion tomorrow morning.',
      manager        : admin._id,
    },
    // Planned batch
    {
      batchNumber    : 'BATCH-2024-006',
      product        : products[4]._id,
      plannedQuantity: 150,
      status         : 'Planned',
      productionDate : daysFuture(1),
      materialsUsed  : [
        { material: materials[6]._id, quantity: 22.5 },
        { material: materials[1]._id, quantity: 7.5  },
        { material: materials[4]._id, quantity: 6    },
      ],
      manager        : manager._id,
    },
  ]);
  console.log('🏗️   Production batches seeded (6)'.cyan);

  // ── 6. INVENTORY TRANSACTIONS (manual — for chart data) ──
  // Record stock changes for completed batches to populate ledger
  const txDocs = [];
  // OUT transactions: materials consumed during completed batches
  for (const prod of productions.slice(0, 4)) {
    for (const mu of prod.materialsUsed) {
      txDocs.push({
        itemId     : mu.material,
        itemType   : 'RawMaterial',
        type       : 'OUT',
        quantity   : mu.quantity,
        unit       : 'kg',
        reason     : 'Production Usage',
        batchNumber: prod.batchNumber,
        createdAt  : prod.productionDate,
      });
    }
    // IN transaction: finished goods
    txDocs.push({
      itemId     : prod.product,
      itemType   : 'Product',
      type       : 'IN',
      quantity   : prod.actualQuantity,
      unit       : 'units',
      reason     : 'Production Output',
      batchNumber: prod.batchNumber,
      createdAt  : prod.completionDate || prod.productionDate,
    });
  }
  await InventoryTransaction.insertMany(txDocs);
  console.log(`📦  Inventory transactions seeded (${txDocs.length})`.cyan);

  // ── 7. WASTE RECORDS ─────────────────────────────────────
  const wasteEntries = await Waste.insertMany([
    {
      itemId     : materials[2]._id,          // Full-Fat Milk
      itemType   : 'RawMaterial',
      wasteType  : 'Spoilage',
      quantity   : 30,
      unit       : 'liters',
      cost       : 36.00,
      reason     : 'Cold chain failure during overnight delivery',
      date       : daysAgo(6),
    },
    {
      itemId     : products[1]._id,           // Chocolate Fudge Cake
      itemType   : 'Product',
      wasteType  : 'Overproduction',
      quantity   : 8,
      unit       : 'units',
      cost       : 71.92,
      reason     : 'Forecasting error — produced 10% above weekend orders',
      date       : daysAgo(5),
    },
    {
      itemId     : materials[0]._id,          // Wheat Flour
      itemType   : 'RawMaterial',
      wasteType  : 'Processing Loss',
      quantity   : 12,
      unit       : 'kg',
      cost       : 5.40,
      reason     : 'Mixing machine seal worn — excess spill',
      date       : daysAgo(4),
    },
    {
      itemId     : products[2]._id,           // Butter Croissant
      itemType   : 'Product',
      wasteType  : 'Expired',
      quantity   : 15,
      unit       : 'units',
      cost       : 8.25,
      reason     : 'Delivery van breakdown — products exceeded shelf life',
      date       : daysAgo(3),
    },
    {
      itemId     : materials[5]._id,          // Butter
      itemType   : 'RawMaterial',
      wasteType  : 'Quality Rejection',
      quantity   : 5,
      unit       : 'kg',
      cost       : 21.00,
      reason     : 'Received batch off-spec (rancidity detected on QA check)',
      date       : daysAgo(2),
    },
    {
      itemId     : materials[3]._id,          // Cocoa Powder
      itemType   : 'RawMaterial',
      wasteType  : 'Processing Loss',
      quantity   : 3,
      unit       : 'kg',
      cost       : 10.50,
      reason     : 'Sifter blockage caused excess spillage',
      date       : daysAgo(2),
    },
    {
      itemId     : products[0]._id,           // White Bread
      itemType   : 'Product',
      wasteType  : 'Processing Loss',
      quantity   : 20,
      unit       : 'units',
      cost       : 17.00,
      reason     : 'Oven calibration drift — first 20 loaves underbaked',
      date       : daysAgo(1),
    },
    {
      itemId     : materials[4]._id,          // Vegetable Oil
      itemType   : 'RawMaterial',
      wasteType  : 'Processing Loss',
      quantity   : 10,
      unit       : 'liters',
      cost       : 11.00,
      reason     : 'Forklift accident in warehouse aisle',
      date       : daysAgo(1),
    },
    {
      itemId     : products[3]._id,           // Vanilla Sponge Cake
      itemType   : 'Product',
      wasteType  : 'Overproduction',
      quantity   : 4,
      unit       : 'units',
      cost       : 26.00,
      reason     : 'Weekend order cancellation received too late',
      date       : daysAgo(1),
    },
    {
      itemId     : materials[1]._id,          // Refined Sugar
      itemType   : 'RawMaterial',
      wasteType  : 'Quality Rejection',
      quantity   : 20,
      unit       : 'kg',
      cost       : 16.00,
      reason     : 'Moisture ingress — bag seal defective on supplier delivery',
      date       : daysAgo(0),
    },
  ]);
  console.log('🗑️   Waste records seeded (10)'.cyan);

  // ── 8. DEMAND HISTORY (30 days per product for forecasting) ─
  const demandDocs = [];
  const demandProducts = products.map((p) => p._id);
  const baseQty        = [480, 75, 190, 45, 110];          // realistic daily production targets

  for (let i = 30; i >= 1; i--) {
    demandProducts.forEach((pid, idx) => {
      // Add a small random ±15% variation + a slight weekly pattern
      const dayOfWeek = new Date(daysAgo(i)).getDay();          // 0=Sun
      const weekendDip = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.75 : 1.0;
      const variation  = 0.85 + Math.random() * 0.30;           // 85%–115%
      const qty        = Math.round((baseQty[idx] || 60) * variation * weekendDip);

      demandDocs.push({
        product         : pid,
        date            : daysAgo(i),
        quantity        : qty,
        quantitySold    : qty,
        quantityProduced: Math.round(qty * 1.05),
        channel         : ['Retail', 'Online', 'Wholesale', 'Direct Contract', 'Retail'][idx % 5],
        notes           : `Day-${i} auto-seeded demand record`,
      });
    });
  }

  await DemandHistory.insertMany(demandDocs);
  console.log(`📈  Demand history seeded (${demandDocs.length} records across ${demandProducts.length} products)`.cyan);

  // ── 9. ALERTS ─────────────────────────────────────────────
  await Alert.insertMany([
    {
      title  : 'Full-Fat Milk — Critically Low Stock',
      message: 'Full-Fat Milk stock is 45 L, below the minimum threshold of 100 L. Reorder from DairyFresh Ltd. immediately to avoid production stoppages.',
      type   : 'LOW_STOCK',
      severity: 'critical',
      isRead : false,
      relatedItem    : materials[2]._id,
      relatedItemType: 'RawMaterial',
    },
    {
      title  : 'Baking Powder — Low Stock',
      message: 'Baking Powder stock (35 kg) is below minimum level (40 kg). Current batch BATCH-2024-006 may be affected.',
      type   : 'LOW_STOCK',
      severity: 'warning',
      isRead : false,
      relatedItem    : materials[7]._id,
      relatedItemType: 'RawMaterial',
    },
    {
      title  : 'Full-Fat Milk — Expiring in 5 Days',
      message: 'Full-Fat Milk (Batch Cold Room 1) expires on ' + daysFuture(5).toLocaleDateString() + '. Use in next chocolate cake production run or return to supplier.',
      type   : 'EXPIRY',
      severity: 'critical',
      isRead : false,
      relatedItem    : materials[2]._id,
      relatedItemType: 'RawMaterial',
    },
    {
      title  : 'High Waste Detected — Chocolate Fudge Cake',
      message: '8 Chocolate Fudge Cakes wasted (cost: ₹5,992) due to overproduction on ' + daysAgo(5).toLocaleDateString() + '. Consider adjusting forecast for weekend batches.',
      type   : 'HIGH_WASTE',
      severity: 'warning',
      isRead : false,
      relatedItem    : products[1]._id,
      relatedItemType: 'Product',
    },
    {
      title  : 'Production Risk — BATCH-2024-006 (Corn Starch Biscuit)',
      message: 'Baking Powder stock is insufficient to complete BATCH-2024-006 (need 6 kg, available 35 kg). Reorder before batch start date.',
      type   : 'PRODUCTION_RISK',
      severity: 'warning',
      isRead : true,   // ← this one was already acknowledged
      relatedItem    : productions[5]._id,
      relatedItemType: 'Production',
    },
  ]);
  console.log('🔔  Alerts seeded (5)'.cyan);

  // ── Done ──────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'.green);
  console.log('✅  DATABASE SEEDED SUCCESSFULLY!'.green.bold);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'.green);
  console.log('  Test Credentials:'.yellow.bold);
  console.log('  ┌─────────────────────────────────────────────┐');
  console.log('  │ ADMIN   → admin@foodflow.com / admin123     │');
  console.log('  │ MANAGER → manager@foodflow.com / manager123 │');
  console.log('  └─────────────────────────────────────────────┘\n');

  process.exit(0);
};

// ─── Entry Point ──────────────────────────────────────────────
const run = async () => {
  await connectDB();
  if (process.argv[2] === '--destroy') {
    await destroyData();
  } else {
    await importData();
  }
};

run().catch((err) => {
  console.error('❌  Seeder error:', err.message);
  process.exit(1);
});
