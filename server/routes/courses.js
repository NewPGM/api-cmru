// server/routes/locations.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// ฟังก์ชันทั่วไปสำหรับจัดการการทำงานกับฐานข้อมูล
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
    console.error('เกิดข้อผิดพลาดในการดำเนินการฐานข้อมูล:', err.message);
    res.status(500).send('เกิดข้อผิดพลาด');
  }
}

// Get all courses
router.get('/', async (req, res) => {
  const query = `
    SELECT 
      course_id,
      course_name,
      abbreviation
    FROM courses
  `;
  await executeQuery(query, [], res);
});
router.post('/', async (req, res) => {
  const { course_name, abbreviation } = req.body;

  if (!course_name || !abbreviation) {
    return res.status(400).send('กรุณาระบุข้อมูลให้ถูกต้อง');
  }

  try {
    const [maxIdResult] = await pool.query('SELECT MAX(course_id) as max_id FROM courses');
    const nextId = (maxIdResult[0].max_id || 0) + 1;

    const query = `
      INSERT INTO courses (course_id, course_name, abbreviation) 
      VALUES (?, ?, ?)
    `;
    await pool.query(query, [nextId, course_name, abbreviation || null]);
    res.status(201).send('เพิ่มข้อมูลสถานที่เรียบร้อยแล้ว');
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการเพิ่มข้อมูล:', err.message);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).send('มีข้อมูลสถานที่นี้ในระบบแล้ว');
    } else {
      res.status(500).send('เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
    }
  }
});
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { course_name, abbreviation } = req.body;

  if (!course_name || !abbreviation) {
    return res.status(400).send('กรุณาระบุชื่อสถานที่และอาคาร');
  }
  try {
    const [coursesCheck] = await pool.query(
      'SELECT course_id FROM courses WHERE course_id = ?',
      [id]
    );
    if (coursesCheck.length === 0) {
      return res.status(404).send('ไม่พบข้อมูลสถานที่');
    }
    const query = `
      UPDATE  courses 
      SET  course_name = ?, abbreviation = ?
      WHERE course_id = ?
    `;
    await executeQuery(
      query, 
      [course_name, abbreviation || null, id],
      res,
      'อัปเดตข้อมูลสถานที่เรียบร้อยแล้ว'
    );
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล:', err.message);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).send('มีข้อมูลสถานที่นี้ในระบบแล้ว');
    } else {
      res.status(500).send('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    }
  }
});
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = 'DELETE FROM courses WHERE course_id = ?';
    await executeQuery(query, [id], res, 'ลบข้อมูลสถานที่เรียบร้อยแล้ว');
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการลบข้อมูล:', err.message);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(400).send('ไม่สามารถลบได้เนื่องจากมีการใช้งานอยู่');
    } else {
      res.status(500).send('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  }
});

module.exports = router;