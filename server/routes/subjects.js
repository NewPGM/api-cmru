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

// Get all subjects
router.get('/', async (req, res) => {
  const query = `
    SELECT 
      subject_id,
      subject_code,
      subject_name,
      description
    FROM subjects
  `;
  await executeQuery(query, [], res);
});

router.post('/', async (req, res) => {
  const { subject_code, subject_name, description } = req.body;

  if (!subject_code || !subject_name) {
    return res.status(400).send('กรุณาระบุรหัสวิชาและชื่อวิชา');
  }

  try {
    const [maxIdResult] = await pool.query('SELECT MAX(subject_id) as max_id FROM subjects');
    const nextId = (maxIdResult[0].max_id || 0) + 1;

    const query = `
      INSERT INTO subjects (subject_id, subject_code, subject_name, description)
      VALUES (?, ?, ?, ?)
    `;
    await pool.query(query, [nextId, subject_code, subject_name, description || null]);
    res.status(201).send('เพิ่มข้อมูลวิชาเรียบร้อยแล้ว');
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการเพิ่มข้อมูล:', err.message);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).send('มีรหัสวิชานี้ในระบบแล้ว');
    } else {
      res.status(500).send('เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
    }
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { subject_code, subject_name, description } = req.body;

  if (!subject_code || !subject_name) {
    return res.status(400).send('กรุณาระบุรหัสวิชาและชื่อวิชา');
  }

  try {
    const [subjectCheck] = await pool.query(
      'SELECT subject_id FROM subjects WHERE subject_id = ?',
      [id]
    );
    if (subjectCheck.length === 0) {
      return res.status(404).send('ไม่พบข้อมูลวิชา');
    }

    const query = `
      UPDATE subjects 
      SET subject_code = ?, subject_name = ?, description = ?
      WHERE subject_id = ?
    `;
    await executeQuery(
      query, 
      [subject_code, subject_name, description || null, id],
      res,
      'อัปเดตข้อมูลวิชาเรียบร้อยแล้ว'
    );
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล:', err.message);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).send('มีรหัสวิชานี้ในระบบแล้ว');
    } else {
      res.status(500).send('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    }
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = 'DELETE FROM subjects WHERE subject_id = ?';
    await executeQuery(query, [id], res, 'ลบข้อมูลวิชาเรียบร้อยแล้ว');
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