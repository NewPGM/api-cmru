const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Utility functions
async function executeQuery(query, params, res, successMessage) {
  try {
    const [results] = await pool.query(query, params);
    if (successMessage && results.affectedRows > 0) {
      res.status(201).send(successMessage);
    } else if (results.affectedRows === 0) {
      res.status(404).send('ไม่พบข้อมูลหรือไม่มีการเปลี่ยนแปลง');
    } else {
      res.json(results);
    }
  } catch (err) {
    handleDatabaseError(err, res);
  }
}

async function checkExists(table, field, value) {
  const [results] = await pool.query(`SELECT ${field} FROM ${table} WHERE ${field} = ?`, [value]);
  return results.length > 0;
}

function handleDatabaseError(err, res) {
  console.error('เกิดข้อผิดพลาดในการดำเนินการฐานข้อมูล:', err.message);
  if (err.code === 'ER_DUP_ENTRY') {
    res.status(400).send('ข้อมูลซ้ำในระบบ');
  } else {
    res.status(500).send('เกิดข้อผิดพลาดในการดำเนินการฐานข้อมูล');
  }
}

// Routes for lookup data

router.get('/intents', async (req, res) => {
  await executeQuery('SELECT intent_id,description FROM intents ORDER BY description', [], res);
});

// Main CRUD operations
router.get('/', async (req, res) => {
  const query = `
    SELECT 
      training_phrases.phrase_id,
      training_phrases.intent_id,
      training_phrases.phrase,
      intents.description
    FROM training_phrases
    JOIN intents ON intents.intent_id = training_phrases.intent_id
    ORDER BY training_phrases.phrase_id ASC
  `;
  await executeQuery(query, [], res);
});

router.post('/', async (req, res) => {
  const { intent_id, phrase } = req.body;

  if (!intent_id || !phrase) {
    return res.status(400).send('กรุณาระบุข้อมูลให้ครบถ้วน');
  }

  try {
    const intentExists = await checkExists('intents', 'intent_id', intent_id);
    if (!intentExists) return res.status(400).send('ไม่พบข้อมูล Intent');

    await executeQuery(
      'INSERT INTO training_phrases (intent_id, phrase) VALUES (?, ?)',
      [intent_id, phrase],
      res,
      'เพิ่มข้อมูล Training Phrase เรียบร้อยแล้ว'
    );
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { intent_id, phrase } = req.body;

  if (!intent_id || !phrase) {
    return res.status(400).send('กรุณาระบุข้อมูลให้ครบถ้วน');
  }

  try {
    const intentExists = await checkExists('intents', 'intent_id', intent_id);
    if (!intentExists) return res.status(400).send('ไม่พบข้อมูล Intent');

    await executeQuery(
      'UPDATE training_phrases SET intent_id = ?, phrase = ? WHERE phrase_id = ?',
      [intent_id, phrase, id],
      res,
      'อัปเดตข้อมูล Training Phrase เรียบร้อยแล้ว'
    );
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const exists = await checkExists('training_phrases', 'phrase_id', id);
    if (!exists) return res.status(404).send('ไม่พบข้อมูลที่ต้องการลบ');

    await executeQuery(
      'DELETE FROM training_phrases WHERE phrase_id = ?',
      [id],
      res,
      'ลบข้อมูล Training Phrase เรียบร้อยแล้ว'
    );
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

module.exports = router;