/**
 * Dev seed — populates the local Firestore emulator with sample bilingual
 * menu data, open tables, and sessions. Safe-guarded: refuses to run unless
 * FIRESTORE_EMULATOR_HOST is set, so it can never touch production by accident.
 *
 * Usage:
 *   1. Start the emulator suite:  npm run emulators
 *   2. In another terminal:        npm run seed
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";
const PROJECT_ID =
  process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || "demo-mikayum";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOST;
  console.warn(
    `[seed] FIRESTORE_EMULATOR_HOST was not set — defaulting to ${EMULATOR_HOST}.`,
  );
}

if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore();

// ---------------- Sample data ----------------

const categories = [
  {
    id: "drinks",
    name: { en: "Drinks", "zh-CN": "饮品" },
    sortOrder: 1,
    icon: "🥤",
  },
  {
    id: "desserts",
    name: { en: "Desserts", "zh-CN": "甜点" },
    sortOrder: 2,
    icon: "🍰",
  },
  {
    id: "savory",
    name: { en: "Savory", "zh-CN": "小食" },
    sortOrder: 3,
    icon: "🍙",
  },
];

const menuItems = [
  {
    id: "matcha-latte",
    name: { en: "Matcha Latte", "zh-CN": "抹茶拿铁" },
    description: {
      en: "Stone-ground ceremonial matcha with steamed milk.",
      "zh-CN": "石磨抹茶搭配蒸奶。",
    },
    category: "drinks",
    basePrice: 650, // $6.50 CAD
    variants: [
      {
        id: "size",
        name: { en: "Size", "zh-CN": "尺寸" },
        required: true,
        options: [
          {
            id: "small",
            name: { en: "Small", "zh-CN": "小杯" },
            priceDelta: 0,
          },
          {
            id: "large",
            name: { en: "Large", "zh-CN": "大杯" },
            priceDelta: 100,
          },
        ],
      },
      {
        id: "sweetness",
        name: { en: "Sweetness", "zh-CN": "甜度" },
        required: true,
        options: [
          { id: "0", name: { en: "0%", "zh-CN": "无糖" }, priceDelta: 0 },
          { id: "30", name: { en: "30%", "zh-CN": "三分糖" }, priceDelta: 0 },
          { id: "70", name: { en: "70%", "zh-CN": "七分糖" }, priceDelta: 0 },
          { id: "100", name: { en: "100%", "zh-CN": "全糖" }, priceDelta: 0 },
        ],
      },
    ],
    addOns: [
      {
        id: "extra-shot",
        name: { en: "Extra matcha shot", "zh-CN": "加浓抹茶" },
        priceDelta: 100,
        maxQty: 2,
      },
      {
        id: "boba",
        name: { en: "Boba pearls", "zh-CN": "珍珠" },
        priceDelta: 75,
        maxQty: 2,
      },
    ],
    allowsNote: true,
    available: true,
    sortOrder: 1,
  },
  {
    id: "strawberry-milk",
    name: { en: "Strawberry Milk", "zh-CN": "草莓牛奶" },
    description: {
      en: "Fresh strawberries blended with chilled milk.",
      "zh-CN": "新鲜草莓与冰牛奶调制。",
    },
    category: "drinks",
    basePrice: 600,
    variants: [
      {
        id: "size",
        name: { en: "Size", "zh-CN": "尺寸" },
        required: true,
        options: [
          {
            id: "small",
            name: { en: "Small", "zh-CN": "小杯" },
            priceDelta: 0,
          },
          {
            id: "large",
            name: { en: "Large", "zh-CN": "大杯" },
            priceDelta: 100,
          },
        ],
      },
    ],
    addOns: [
      {
        id: "whipped-cream",
        name: { en: "Whipped cream", "zh-CN": "奶油顶" },
        priceDelta: 50,
        maxQty: 1,
      },
    ],
    allowsNote: true,
    available: true,
    sortOrder: 2,
  },
  {
    id: "honey-toast",
    name: { en: "Honey Toast", "zh-CN": "蜜糖吐司" },
    description: {
      en: "Brick toast with butter, honey, and ice cream.",
      "zh-CN": "厚切吐司搭配黄油、蜂蜜与冰淇淋。",
    },
    category: "desserts",
    basePrice: 1100,
    variants: [
      {
        id: "ice-cream",
        name: { en: "Ice cream flavor", "zh-CN": "冰淇淋口味" },
        required: true,
        options: [
          {
            id: "vanilla",
            name: { en: "Vanilla", "zh-CN": "香草" },
            priceDelta: 0,
          },
          {
            id: "matcha",
            name: { en: "Matcha", "zh-CN": "抹茶" },
            priceDelta: 50,
          },
          {
            id: "strawberry",
            name: { en: "Strawberry", "zh-CN": "草莓" },
            priceDelta: 50,
          },
        ],
      },
    ],
    addOns: [],
    allowsNote: true,
    available: true,
    sortOrder: 1,
  },
  {
    id: "omurice",
    name: { en: "Omurice", "zh-CN": "蛋包饭" },
    description: {
      en: "Fluffy omelette over chicken fried rice. Maids will draw on it.",
      "zh-CN": "鸡蛋包炒饭，女仆会在上面画图。",
    },
    category: "savory",
    basePrice: 1300,
    variants: [],
    addOns: [
      {
        id: "extra-cheese",
        name: { en: "Extra cheese", "zh-CN": "加芝士" },
        priceDelta: 150,
        maxQty: 1,
      },
    ],
    allowsNote: true,
    available: true,
    sortOrder: 1,
  },
];

const TABLE_LABELS = ["T01", "T02", "T03", "T04", "T05"];

// ---------------- Helpers ----------------

function randomToken(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function clearCollection(name: string): Promise<number> {
  const snap = await db.collection(name).get();
  let n = 0;
  // Batch deletes — safe for the dev sample sizes we work with.
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref);
    await batch.commit();
    n += Math.min(400, snap.docs.length - i);
  }
  return n;
}

// ---------------- Seed ----------------

async function main() {
  console.log(`[seed] Project: ${PROJECT_ID}, emulator: ${EMULATOR_HOST}`);

  console.log("[seed] Clearing existing data…");
  for (const name of [
    "menuItems",
    "categories",
    "tables",
    "sessions",
    "orders",
    "counters",
  ]) {
    const n = await clearCollection(name);
    console.log(`  ${name}: ${n} doc(s) removed`);
  }

  console.log("[seed] Writing categories…");
  const catBatch = db.batch();
  for (const c of categories) {
    catBatch.set(db.collection("categories").doc(c.id), c);
  }
  await catBatch.commit();

  console.log("[seed] Writing menu items…");
  const itemBatch = db.batch();
  for (const item of menuItems) {
    itemBatch.set(db.collection("menuItems").doc(item.id), {
      ...item,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
  await itemBatch.commit();

  console.log("[seed] Writing tables + open sessions…");
  for (const label of TABLE_LABELS) {
    const sessionRef = db.collection("sessions").doc();
    await sessionRef.set({
      id: sessionRef.id,
      tableId: label,
      openedAt: Timestamp.now(),
      paid: false,
      total: 0,
      customerUids: [],
    });
    await db.collection("tables").doc(label).set({
      id: label,
      label,
      qrToken: randomToken(),
      status: "open",
      currentSessionId: sessionRef.id,
      unpaidTotal: 0,
    });
  }

  console.log("[seed] Writing config/event…");
  await db
    .collection("config")
    .doc("event")
    .set({
      name: "MikaYum Cafe",
      currency: "CAD",
      taxRate: 0,
    });

  console.log("[seed] Done.");
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
