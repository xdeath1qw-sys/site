// ── MongoDB connection helper ──
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set. Configure it in Vercel project settings.');
}
const DB_NAME = 'efl_league';

let client;
let db;

async function getDb() {
  if (db) return db;
  if (!client) {
    client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
  }
  db = client.db(DB_NAME);
  return db;
}

module.exports = { getDb };
