// ── MongoDB connection helper ──
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://denisknjazx_db_user:IHsN06G4G9yD4te0@cluster0.8wxiixq.mongodb.net/?appName=Cluster0';
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
