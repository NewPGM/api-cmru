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
      program_id,
      full_name,
      abbreviation,
      tuition_fee,
      Bachelor_Programs
    FROM degree_programs
  `;
  await executeQuery(query, [], res);
});
router.post('/', async (req, res) => {
  const { full_name, abbreviation, tuition_fee, Bachelor_Programs } = req.body;

  if (!full_name || !abbreviation) {
    return res.status(400).send('กรุณาระบุข้อมูลให้ถูกต้อง');
  }

  try {
    const [maxIdResult] = await pool.query('SELECT MAX(program_id) as max_id FROM degree_programs');
    
    const nextId = (maxIdResult[0].max_id || 0) + 1;

    const query = `
      INSERT INTO degree_programs (
        program_id,
        full_name, 
        abbreviation, 
        tuition_fee, 
        Bachelor_Programs
      ) VALUES (?, ?, ?, ?, ?)
    `;
    
    await pool.query(query, [
      nextId, 
      full_name, 
      abbreviation, 
      tuition_fee || null, 
      Bachelor_Programs || null, 
    ]);
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
  const { full_name, abbreviation, tuition_fee, Bachelor_Programs} = req.body;

  if (!full_name || !abbreviation) {
    return res.status(400).send('กรุณาระบุชื่อสถานที่และอาคาร');
  }
  try {
    const [programCheck] = await pool.query(
      'SELECT program_id FROM degree_programs WHERE program_id = ?',
      [id]
    );
    if (programCheck.length === 0) {
      return res.status(404).send('ไม่พบข้อมูลหลักสูตร');
    }
    const query = `
      UPDATE degree_programs 
      SET full_name = ?, 
          abbreviation = ?, 
          tuition_fee = ?,
          Bachelor_Programs = ?
      WHERE program_id = ?
    `;
    await executeQuery(
      query, 
      [full_name, abbreviation, tuition_fee || null, Bachelor_Programs, id],
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
    const query = 'DELETE FROM degree_programs WHERE program_id = ?';
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