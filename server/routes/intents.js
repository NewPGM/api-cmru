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

// Routes for intents data
router.get('/', async (req, res) => {
  const query = `
    SELECT 
      intent_id,
      description
    FROM intents
    ORDER BY intent_id ASC
  `;
  await executeQuery(query, [], res);
});

router.post('/', async (req, res) => {
  const { description } = req.body;

  if (!description) {
    return res.status(400).send('กรุณาระบุคำอธิบาย (description)');
  }

  try {
    await executeQuery(
      'INSERT INTO intents (description) VALUES (?)',
      [description],
      res,
      'เพิ่มข้อมูล Intent เรียบร้อยแล้ว'
    );
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;

  if (!description) {
    return res.status(400).send('กรุณาระบุคำอธิบาย (description)');
  }

  try {
    const intentExists = await checkExists('intents', 'intent_id', id);
    if (!intentExists) return res.status(404).send('ไม่พบข้อมูล Intent');

    await executeQuery(
      'UPDATE intents SET description = ? WHERE intent_id = ?',
      [description, id],
      res,
      'อัปเดตข้อมูล Intent เรียบร้อยแล้ว'
    );
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const intentExists = await checkExists('intents', 'intent_id', id);
    if (!intentExists) return res.status(404).send('ไม่พบข้อมูล Intent');

    await executeQuery(
      'DELETE FROM intents WHERE intent_id = ?',
      [id],
      res,
      'ลบข้อมูล Intent เรียบร้อยแล้ว'
    );
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

module.exports = router;
