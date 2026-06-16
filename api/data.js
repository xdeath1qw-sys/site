// ── Universal API endpoint ──
// GET  /api/data?col=users          — получить все документы
// POST /api/data?col=users          — вставить документ
// PUT  /api/data?col=users&id=123   — обновить документ
// DELETE /api/data?col=users&id=123 — удалить документ

const { getDb } = require('./db');
const { ObjectId } = require('mongodb');

const ALLOWED = ['users','players','teams','news','tournaments','matches','vetos','highlights','awards'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

module.exports = async (req, res) => {
  Object.entries(cors).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const col = req.query.col;
  if (!col || !ALLOWED.includes(col)) {
    return res.status(400).json({ error: 'Invalid collection' });
  }

  try {
    const db = await getDb();
    const collection = db.collection(col);

    if (req.method === 'GET') {
      const docs = await collection.find({}).toArray();
      // Конвертируем _id в id
      return res.json(docs.map(d => ({ ...d, id: d._id.toString(), _id: undefined })));
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body) return res.status(400).json({ error: 'No body' });
      const result = await collection.insertOne(body);
      return res.json({ ...body, id: result.insertedId.toString() });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'No id' });
      const body = req.body;
      delete body._id;
      delete body.id;
      await collection.updateOne({ _id: new ObjectId(id) }, { $set: body });
      return res.json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'No id' });
      await collection.deleteOne({ _id: new ObjectId(id) });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch(e) {
    console.error('[API]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
