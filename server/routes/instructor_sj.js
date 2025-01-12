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
router.get('/instructors', async (req, res) => {
  await executeQuery('SELECT instructor_id, name FROM instructors ORDER BY name', [], res);
});

router.get('/subjects', async (req, res) => {
  await executeQuery('SELECT subject_id, subject_code FROM subjects ORDER BY subject_code', [], res);
});

// Main CRUD operations
router.get('/', async (req, res) => {
  const query = `
    SELECT 
      instructor_sj.instructor_sj_id,
      instructor_sj.instructor_id,
      instructor_sj.subject_id,
      instructors.name,
      subjects.subject_code
    FROM instructor_sj
    JOIN instructors ON instructors.instructor_id = instructor_sj.instructor_id
    JOIN subjects ON subjects.subject_id = instructor_sj.subject_id
    ORDER BY instructors.instructor_id ASC
  `;
  await executeQuery(query, [], res);
});

router.post('/', async (req, res) => {
  const { instructor_id, subject_id } = req.body;

  if (!instructor_id || !subject_id) {
    return res.status(400).send('กรุณาระบุข้อมูลให้ครบถ้วน');
  }

  try {
    // Check if instructor and subject exist
    const instructorExists = await checkExists('instructors', 'instructor_id', instructor_id);
    const subjectExists = await checkExists('subjects', 'subject_id', subject_id);

    if (!instructorExists) return res.status(400).send('ไม่พบข้อมูลผู้สอน');
    if (!subjectExists) return res.status(400).send('ไม่พบข้อมูลวิชา');

    // Get next ID
    const [lastId] = await pool.query('SELECT MAX(instructor_sj_id) as max_id FROM instructor_sj');
    const nextId = (lastId[0].max_id || 0) + 1;

    await executeQuery(
      'INSERT INTO instructor_sj (instructor_sj_id, instructor_id, subject_id) VALUES (?, ?, ?)',
      [nextId, instructor_id, subject_id],
      res,
      'เพิ่มข้อมูลผู้สอนเรียบร้อยแล้ว'
    );
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { instructor_id, subject_id } = req.body;

  if (!instructor_id || !subject_id) {
    return res.status(400).send('กรุณาระบุข้อมูลให้ครบถ้วน');
  }

  try {
    const instructorExists = await checkExists('instructors', 'instructor_id', instructor_id);
    const subjectExists = await checkExists('subjects', 'subject_id', subject_id);

    if (!instructorExists) return res.status(400).send('ไม่พบข้อมูลผู้สอน');
    if (!subjectExists) return res.status(400).send('ไม่พบข้อมูลวิชา');

    await executeQuery(
      'UPDATE instructor_sj SET instructor_id = ?, subject_id = ? WHERE instructor_sj_id = ?',
      [instructor_id, subject_id, id],
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
    const exists = await checkExists('instructor_sj', 'instructor_sj_id', id);
    if (!exists) return res.status(404).send('ไม่พบข้อมูลที่ต้องการลบ');

    await executeQuery(
      'DELETE FROM instructor_sj WHERE instructor_sj_id = ?',
      [id],
      res,
      'ลบข้อมูลเรียบร้อยแล้ว'
    );
  } catch (err) {
    handleDatabaseError(err, res);
  }
});

module.exports = router;