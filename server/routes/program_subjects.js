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

router.get('/subjects', async (req, res) => {
  await executeQuery('SELECT subject_id, subject_code FROM subjects ORDER BY subject_code', [], res);
});

// Main CRUD operations
router.get('/', async (req, res) => {
  const query = `
    SELECT 
      program_subjects.program_id,
      program_subjects.description,
      program_subjects.subject_id,
      subjects.subject_code
    FROM program_subjects
    JOIN subjects ON subjects.subject_id = program_subjects.subject_id
    ORDER BY program_subjects.program_id ASC
  `;
  await executeQuery(query, [], res);
});

router.post('/', async (req, res) => {
  const { description, subject_id } = req.body;

  if (!description || !subject_id) {
    return res.status(400).send('กรุณาระบุข้อมูลให้ครบถ้วน');
  }

  try {
    const subjectExists = await checkExists('subjects', 'subject_id', subject_id);
    if (!subjectExists) return res.status(400).send('ไม่พบข้อมูลวิชา');

    const [lastId] = await pool.query('SELECT MAX(program_id) as max_id FROM program_subjects');
    const nextId = (lastId[0].max_id || 0) + 1;

    await executeQuery(
      'INSERT INTO program_subjects (program_id, description, subject_id) VALUES (?, ?, ?)',
      [nextId, description, subject_id],
      res,
      'เพิ่มข้อมูลเรียบร้อยแล้ว'
    );
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { description, subject_id } = req.body;

  if (!description || !subject_id) {
    return res.status(400).send('กรุณาระบุข้อมูลให้ครบถ้วน');
  }

  try {
    const subjectExists = await checkExists('subjects', 'subject_id', subject_id);
    if (!subjectExists) return res.status(400).send('ไม่พบข้อมูลวิชา');

    await executeQuery(
      'UPDATE program_subjects SET description = ?, subject_id = ? WHERE program_id = ?',
      [description, subject_id, id],
      res,
      'อัปเดตข้อมูลเรียบร้อยแล้ว'
    );
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const exists = await checkExists('program_subjects', 'program_id', id);
    if (!exists) return res.status(404).send('ไม่พบข้อมูลที่ต้องการลบ');

    await executeQuery(
      'DELETE FROM program_subjects WHERE program_id = ?',
      [id],
      res,
      'ลบข้อมูลเรียบร้อยแล้ว'
    );
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

module.exports = router;