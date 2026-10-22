/**
 * safeSeed.js
 * ───────────
 * Safe seeder for FoodFlow AI.
 * 1. Preserves ALL existing users, products, and documents.
 * 2. Ensures demo users (admin@foodplatform.com, production@foodplatform.com) exist with Password123.
 * 3. Populates suppliers, raw materials, products, batches, waste logs, alerts, and demand history ONLY if empty.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import User from './models/User.js';
import Supplier from './models/Supplier.js';
import RawMaterial from './models/RawMaterial.js';
import Product from './models/Product.js';
import Production from './models/Production.js';
import Waste from './models/Waste.js';
import DemandHistory from './models/DemandHistory.js';
import Alert from './models/Alert.js';
import InventoryTransaction from './models/InventoryTransaction.js';

dotenv.config();

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);
const daysFuture = (n) => new Date(Date.now() + n * 86_400_000);

const runSafeSeed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // 1. Ensure Demo Users
    const demoPassword = await bcrypt.hash('Password123', 10);
    
    let adminUser = await User.findOne({ email: 'admin@foodplatform.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@foodplatform.com',
        password: demoPassword,
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Created demo admin user: admin@foodplatform.com');
    } else {
      console.log('ℹ️ Demo admin user already exists');
    }

    let prodManager = await User.findOne({ email: 'production@foodplatform.com' });
    if (!prodManager) {
      prodManager = await User.create({
        name: 'Production Manager',
        email: 'production@foodplatform.com',
        password: demoPassword,
        role: 'production_manager',
        isActive: true,
      });
      console.log('✅ Created demo production manager: production@foodplatform.com');
    } else {
      console.log('ℹ️ Demo production manager already exists');
    }

    // 2. Suppliers (seed if 0)
    let suppliers = await Supplier.find({});
    if (suppliers.length === 0) {
      suppliers = await Supplier.insertMany([
        {
          companyName: 'GrainMaster Co.',
          name: 'James Wheat',
          email: 'james@grainmaster.com',
          phone: '+1-555-0101',
          address: '12 Mill Road, Kansas City, KS',
          rating: 4.8,
          leadTimeDays: 3,
          materialsSupplied: ['Wheat Flour', 'Corn Starch'],
          status: 'Active',
        },
        {
          companyName: 'DairyFresh Ltd.',
          name: 'Emma Butter',
          email: 'emma@dairyfresh.com',
          phone: '+1-555-0202',
          address: '45 Cream Lane, Wisconsin, WI',
          rating: 4.5,
          leadTimeDays: 2,
          materialsSupplied: ['Full-Fat Milk', 'Butter', 'Cheese Powder'],
          status: 'Active',
        },
        {
          companyName: 'SweetRoots Inc.',
          name: 'Carlos Sugar',
          email: 'carlos@sweetroots.com',
          phone: '+1-555-0303',
          address: '88 Cane Street, Louisiana, LA',
          rating: 4.2,
          leadTimeDays: 5,
          materialsSupplied: ['Refined Sugar', 'Brown Sugar', 'Cocoa Powder'],
          status: 'Active',
        },
        {
          companyName: 'OilTech Suppliers',
          name: 'Linda Press',
          email: 'linda@oiltech.com',
          phone: '+1-555-0404',
          address: '23 Refinery Blvd, Texas, TX',
          rating: 3.9,
          leadTimeDays: 4,
          materialsSupplied: ['Vegetable Oil', 'Palm Oil'],
          status: 'Active',
        },
      ]);
      console.log(`✅ Seeded ${suppliers.length} suppliers`);
    }

    // 3. Raw Materials (seed if 0)
    let materials = await RawMaterial.find({});
    if (materials.length === 0) {
      materials = await RawMaterial.insertMany([
        {
          name: 'Wheat Flour',
          code: 'RM-001',
          category: 'Grains & Flours',
          unit: 'kg',
          currentStock: 850,
          minStock: 200,
          maxStock: 2000,
          costPerUnit: 40,
          supplier: suppliers[0]._id,
          expiryDate: daysFuture(120),
          location: 'Warehouse A - Bay 1',
        },
        {
          name: 'Refined Sugar Raw',
          code: 'RM-002',
          category: 'Sweeteners',
          unit: 'kg',
          currentStock: 320,
          minStock: 100,
          maxStock: 1000,
          costPerUnit: 55,
          supplier: suppliers[2]._id,
          expiryDate: daysFuture(365),
          location: 'Warehouse A - Bay 2',
        },
        {
          name: 'Full-Fat Milk',
          code: 'RM-003',
          category: 'Dairy Ingredients',
          unit: 'liters',
          currentStock: 45,
          minStock: 100,
          maxStock: 500,
          costPerUnit: 60,
          supplier: suppliers[1]._id,
          expiryDate: daysFuture(5),
          location: 'Cold Room 1',
        },
        {
          name: 'Cocoa Powder',
          code: 'RM-004',
          category: 'Seasoning & Spices',
          unit: 'kg',
          currentStock: 180,
          minStock: 50,
          maxStock: 400,
          costPerUnit: 350,
          supplier: suppliers[2]._id,
          expiryDate: daysFuture(200),
          location: 'Warehouse B - Bay 3',
        },
        {
          name: 'Vegetable Oil',
          code: 'RM-005',
          category: 'Oils & Fats',
          unit: 'liters',
          currentStock: 600,
          minStock: 150,
          maxStock: 1500,
          costPerUnit: 140,
          supplier: suppliers[3]._id,
          expiryDate: daysFuture(180),
          location: 'Warehouse B - Bay 4',
        },
        {
          name: 'Butter',
          code: 'RM-006',
          category: 'Dairy Ingredients',
          unit: 'kg',
          currentStock: 90,
          minStock: 80,
          maxStock: 300,
          costPerUnit: 480,
          supplier: suppliers[1]._id,
          expiryDate: daysFuture(30),
          location: 'Cold Room 2',
        },
        {
          name: 'Corn Starch',
          code: 'RM-007',
          category: 'Grains & Flours',
          unit: 'kg',
          currentStock: 240,
          minStock: 60,
          maxStock: 600,
          costPerUnit: 50,
          supplier: suppliers[0]._id,
          expiryDate: daysFuture(300),
          location: 'Warehouse A - Bay 5',
        },
        {
          name: 'Baking Powder',
          code: 'RM-008',
          category: 'Seasoning & Spices',
          unit: 'kg',
          currentStock: 35,
          minStock: 40,
          maxStock: 200,
          costPerUnit: 180,
          supplier: suppliers[0]._id,
          expiryDate: daysFuture(90),
          location: 'Warehouse A - Bay 6',
        },
      ]);
      console.log(`✅ Seeded ${materials.length} raw materials`);
    }

    // 4. Products with recipes (ensure rich products exist)
    let products = await Product.find({});
    if (products.length <= 1) {
      const newProducts = await Product.insertMany([
        {
          name: 'Classic White Bread',
          code: 'PRD-001',
          category: 'Bakery',
          description: 'Standard 800g white sandwich loaf. High-volume everyday product.',
          unit: 'units',
          currentStock: 240,
          minStock: 50,
          maxStock: 1000,
          productionCost: 65,
          sellingPrice: 150,
          shelfLifeDays: 5,
          recipe: [
            { material: materials[0]._id, quantity: 0.6 },
            { material: materials[6]._id, quantity: 0.02 },
            { material: materials[7]._id, quantity: 0.01 },
            { material: materials[4]._id, quantity: 0.03 },
          ],
          status: 'Active',
        },
        {
          name: 'Chocolate Fudge Cake',
          code: 'PRD-002',
          category: 'Bakery',
          description: 'Rich 500g chocolate fudge layer cake. Premium product line.',
          unit: 'units',
          currentStock: 36,
          minStock: 20,
          maxStock: 200,
          productionCost: 280,
          sellingPrice: 750,
          shelfLifeDays: 7,
          recipe: [
            { material: materials[0]._id, quantity: 0.25 },
            { material: materials[3]._id, quantity: 0.08 },
            { material: materials[1]._id, quantity: 0.20 },
            { material: materials[5]._id, quantity: 0.10 },
            { material: materials[2]._id, quantity: 0.15 },
          ],
          status: 'Active',
        },
        {
          name: 'Butter Croissant',
          code: 'PRD-003',
          category: 'Bakery',
          description: 'Flaky, golden 85g French-style butter croissant.',
          unit: 'units',
          currentStock: 120,
          minStock: 30,
          maxStock: 500,
          productionCost: 45,
          sellingPrice: 120,
          shelfLifeDays: 3,
          recipe: [
            { material: materials[0]._id, quantity: 0.05 },
            { material: materials[5]._id, quantity: 0.035 },
            { material: materials[1]._id, quantity: 0.008 },
            { material: materials[2]._id, quantity: 0.02 },
          ],
          status: 'Active',
        },
      ]);
      products = await Product.find({});
      console.log(`✅ Seeded additional products, total now: ${products.length}`);
    }

    // 5. Production Batches (if 0)
    let productions = await Production.find({});
    if (productions.length === 0 && products.length > 0) {
      productions = await Production.insertMany([
        {
          batchNumber: 'BAT-2024-001',
          product: products[0]._id,
          plannedQuantity: 500,
          actualQuantity: 492,
          wasteQuantity: 8,
          status: 'Completed',
          productionDate: daysAgo(5),
          completionDate: daysAgo(4),
          manager: prodManager._id,
          productionCost: 492 * products[0].productionCost,
          notes: 'Standard morning run. Minor trimmings waste.',
        },
        {
          batchNumber: 'BAT-2024-002',
          product: products[1] ? products[1]._id : products[0]._id,
          plannedQuantity: 60,
          actualQuantity: 58,
          wasteQuantity: 2,
          status: 'Completed',
          productionDate: daysAgo(3),
          completionDate: daysAgo(2),
          manager: prodManager._id,
          productionCost: 58 * (products[1] || products[0]).productionCost,
        },
        {
          batchNumber: 'BAT-2024-003',
          product: products[0]._id,
          plannedQuantity: 400,
          actualQuantity: 0,
          wasteQuantity: 0,
          status: 'In Progress',
          productionDate: daysAgo(1),
          manager: prodManager._id,
          productionCost: 400 * products[0].productionCost,
        },
        {
          batchNumber: 'BAT-2024-004',
          product: products[2] ? products[2]._id : products[0]._id,
          plannedQuantity: 200,
          actualQuantity: 0,
          wasteQuantity: 0,
          status: 'Planned',
          productionDate: daysFuture(1),
          manager: prodManager._id,
          productionCost: 200 * (products[2] || products[0]).productionCost,
        },
      ]);
      console.log(`✅ Seeded ${productions.length} production batches`);
    }

    // 6. Waste Records (if 0)
    let wastes = await Waste.find({});
    if (wastes.length === 0 && materials.length > 0) {
      wastes = await Waste.insertMany([
        {
          itemType: 'RawMaterial',
          itemId: materials[2]._id, // Milk
          itemName: materials[2].name,
          quantity: 12,
          unit: materials[2].unit,
          cost: 12 * materials[2].costPerUnit,
          wasteType: 'Expired',
          reason: 'Cold storage door left ajar overnight; milk spoiled',
          date: daysAgo(2),
          recordedBy: prodManager._id,
          mitigationNotes: 'Replaced door seal sensor.',
        },
        {
          itemType: 'Product',
          itemId: products[0]._id,
          itemName: products[0].name,
          quantity: 8,
          unit: 'units',
          cost: 8 * products[0].productionCost,
          wasteType: 'Overproduction',
          reason: 'Weekend buffer surplus expired past shelf life',
          date: daysAgo(3),
          recordedBy: prodManager._id,
          mitigationNotes: 'Adjust AI production plan multiplier downwards.',
        },
        {
          itemType: 'RawMaterial',
          itemId: materials[0]._id,
          itemName: materials[0].name,
          quantity: 25,
          unit: materials[0].unit,
          cost: 25 * materials[0].costPerUnit,
          wasteType: 'Damaged',
          reason: 'Torn bag during unloading from delivery truck',
          date: daysAgo(6),
          recordedBy: prodManager._id,
          mitigationNotes: 'Filed freight claim with carrier.',
        },
      ]);
      console.log(`✅ Seeded ${wastes.length} waste records`);
    }

    // 7. Alerts (if 0)
    let alerts = await Alert.find({});
    if (alerts.length === 0 && materials.length > 0) {
      alerts = await Alert.insertMany([
        {
          title: `Low Stock: ${materials[2].name}`,
          message: `Stock level is ${materials[2].currentStock} ${materials[2].unit}, below threshold of ${materials[2].minStock} ${materials[2].unit}.`,
          type: 'LOW_STOCK',
          severity: 'critical',
          relatedItem: materials[2]._id,
          relatedItemType: 'RawMaterial',
          isRead: false,
          createdAt: daysAgo(1),
        },
        {
          title: `Near Expiry: ${materials[2].name}`,
          message: `${materials[2].name} batch expires in 5 days. Expedite usage in upcoming production runs.`,
          type: 'EXPIRY',
          severity: 'warning',
          relatedItem: materials[2]._id,
          relatedItemType: 'RawMaterial',
          isRead: false,
          createdAt: daysAgo(2),
        },
        {
          title: 'High Spoilage Alert in Cold Room',
          message: 'Temperature sensor fluctuation reported in Cold Room 1.',
          type: 'HIGH_WASTE',
          severity: 'critical',
          isRead: false,
          createdAt: daysAgo(3),
        },
      ]);
      console.log(`✅ Seeded ${alerts.length} alerts`);
    }

    // 8. Demand History (if 0) for Forecasting
    let demandCount = await DemandHistory.countDocuments();
    if (demandCount === 0 && products.length > 0) {
      const records = [];
      const baseProduct = products[0]._id;
      for (let i = 30; i >= 1; i--) {
        const isWeekend = [0, 6].includes(daysAgo(i).getDay());
        const baseDemand = isWeekend ? 350 : 220;
        const actualDemand = Math.round(baseDemand + (Math.random() * 40 - 20));
        records.push({
          product: baseProduct,
          date: daysAgo(i),
          actualDemand,
          channel: 'Retail',
          notes: isWeekend ? 'Weekend spike' : 'Regular weekday',
        });
      }
      await DemandHistory.insertMany(records);
      console.log(`✅ Seeded ${records.length} demand history data points for forecasting`);
    }

    // 9. Inventory Transactions (if 0)
    let txnCount = await InventoryTransaction.countDocuments();
    if (txnCount === 0 && materials.length > 0) {
      await InventoryTransaction.insertMany([
        {
          itemType: 'RawMaterial',
          itemId: materials[0]._id,
          type: 'IN',
          quantity: 500,
          unit: materials[0].unit,
          unitCost: materials[0].costPerUnit,
          totalCost: 500 * materials[0].costPerUnit,
          reason: 'Purchase Order',
          batchNumber: 'LOT-FL-991',
          performedBy: adminUser._id,
          createdAt: daysAgo(7),
        },
        {
          itemType: 'RawMaterial',
          itemId: materials[2]._id,
          type: 'OUT',
          quantity: 60,
          unit: materials[2].unit,
          unitCost: materials[2].costPerUnit,
          totalCost: 60 * materials[2].costPerUnit,
          reason: 'Production Usage',
          batchNumber: 'LOT-MK-002',
          performedBy: prodManager._id,
          createdAt: daysAgo(5),
        },
        {
          itemType: 'Product',
          itemId: products[0]._id,
          type: 'IN',
          quantity: 492,
          unit: products[0].unit,
          unitCost: products[0].productionCost,
          totalCost: 492 * products[0].productionCost,
          reason: 'Production Output',
          batchNumber: 'BAT-2024-001',
          performedBy: prodManager._id,
          createdAt: daysAgo(4),
        },
      ]);
      console.log('✅ Seeded initial inventory ledger transactions');
    }

    console.log('🎉 Safe seeding successfully completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during safe seeding:', error);
    process.exit(1);
  }
};

runSafeSeed();
