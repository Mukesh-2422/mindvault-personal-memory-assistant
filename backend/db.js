const dns = require("dns");
const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");

const MONGODB_URI = process.env.MONGODB_URI;
const USE_MONGO = Boolean(MONGODB_URI);
const DATA_FILE = path.join(__dirname, "data", "db.json");

if (USE_MONGO) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

async function connect() {
  if (USE_MONGO) {
    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB connected");
    return;
  }

  // Ensure the JSON data file exists for the file-based fallback
  try {
    await fs.access(DATA_FILE);
  } catch (err) {
    const initial = { users: [], memories: [], people: [], vaults: [], passwordResetTokens: [] };
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
  console.log("Using file-based JSON DB at", DATA_FILE);
}

async function readData() {
  try {
    let raw = await fs.readFile(DATA_FILE, "utf8");
    raw = raw.replace(/^\uFEFF/, "").trim();
    if (!raw) {
      return { users: [], memories: [], people: [], vaults: [], passwordResetTokens: [] };
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading JSON DB:", err);
    return { users: [], memories: [], people: [], vaults: [], passwordResetTokens: [] };
  }
}

async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

async function getCollection(name, query = {}) {
  if (USE_MONGO) {
    const db = mongoose.connection.db;
    return db.collection(name).find(query).toArray();
  }
  const data = await readData();
  const items = data[name] || [];
  if (!query || Object.keys(query).length === 0) return items;
  // simple filtering for equality
  return items.filter((it) => {
    return Object.keys(query).every((k) => it[k] === query[k]);
  });
}

async function countDocuments(name, query = {}) {
  if (USE_MONGO) {
    const db = mongoose.connection.db;
    return db.collection(name).countDocuments(query);
  }
  const items = await getCollection(name, query);
  return items.length;
}

async function findOne(name, filter) {
  if (USE_MONGO) {
    const db = mongoose.connection.db;
    if (typeof filter === "function") {
      const items = await db.collection(name).find().toArray();
      return items.find(filter) || null;
    }
    return db.collection(name).findOne(filter);
  }
  const items = await getCollection(name);
  if (typeof filter === "function") return items.find(filter) || null;
  return items.find((i) => {
    return Object.keys(filter).every((k) => i[k] === filter[k]);
  }) || null;
}

async function findById(name, id) {
  if (USE_MONGO) {
    const db = mongoose.connection.db;
    const { ObjectId } = require("mongodb");
    let query = { id };
    if (ObjectId.isValid(id)) {
      query = { $or: [{ id }, { _id: new ObjectId(id) }, { _id: id }] };
    }
    return db.collection(name).findOne(query);
  }
  const items = await getCollection(name);
  return items.find((i) => i.id === id || i._id === id || String(i.id) === String(id) || String(i._id) === String(id)) || null;
}

async function insertOne(name, item) {
  if (USE_MONGO) {
    const db = mongoose.connection.db;
    await db.collection(name).insertOne(item);
    return item;
  }
  const data = await readData();
  data[name] = data[name] || [];
  data[name].push(item);
  await writeData(data);
  return item;
}

async function updateOne(name, id, updates) {
  if (USE_MONGO) {
    const db = mongoose.connection.db;
    const { ObjectId } = require("mongodb");
    let filter = { id };
    if (ObjectId.isValid(id)) {
      filter = { $or: [{ id }, { _id: new ObjectId(id) }, { _id: String(id) }] };
    }
    const cleanUpdates = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) cleanUpdates[k] = v;
    }
    const result = await db
      .collection(name)
      .findOneAndUpdate(filter, { $set: cleanUpdates }, { returnDocument: "after" });
    return result.value || result;
  }
  const data = await readData();
  data[name] = data[name] || [];
  const idx = data[name].findIndex((i) => i.id === id || i._id === id || String(i.id) === String(id) || String(i._id) === String(id));
  if (idx === -1) return null;
  const cleanUpdates = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) cleanUpdates[k] = v;
  }
  data[name][idx] = { ...data[name][idx], ...cleanUpdates };
  await writeData(data);
  return data[name][idx];
}

async function deleteOne(name, id) {
  if (USE_MONGO) {
    const db = mongoose.connection.db;
    const { ObjectId } = require("mongodb");
    let filter = { id };
    if (ObjectId.isValid(id)) {
      filter = { $or: [{ id }, { _id: new ObjectId(id) }, { _id: id }] };
    }
    const result = await db.collection(name).deleteOne(filter);
    return result.deletedCount > 0;
  }
  const data = await readData();
  data[name] = data[name] || [];
  const origLen = data[name].length;
  data[name] = data[name].filter((i) => !(i.id === id || i._id === id || String(i.id) === String(id) || String(i._id) === String(id)));
  await writeData(data);
  return data[name].length < origLen;
}

async function saveCollection(name, items) {
  if (USE_MONGO) {
    const db = mongoose.connection.db;
    await db.collection(name).deleteMany({});
    if (items.length > 0) {
      await db.collection(name).insertMany(items);
    }
    return items;
  }
  const data = await readData();
  data[name] = items || [];
  await writeData(data);
  return items;
}

module.exports = {
  connect,
  getCollection,
  countDocuments,
  findOne,
  findById,
  insertOne,
  updateOne,
  deleteOne,
  saveCollection,
};
