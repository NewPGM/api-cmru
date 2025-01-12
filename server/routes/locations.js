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

// Get all locations
router.get('/', async (req, res) => {
  const query = `
    SELECT 
      location_id,
      location_name,
      building,
      address
    FROM locations
    ORDER BY location_id ASC
  `;
  await executeQuery(query, [], res);
});

// Add location
router.post('/', async (req, res) => {
  const { location_name, building, address } = req.body;

  // Validation
  if (!location_name || !building) {
    return res.status(400).send('กรุณาระบุชื่อสถานที่และอาคาร');
  }

  try {
    // หา ID ถัดไป
    const [maxIdResult] = await pool.query('SELECT MAX(location_id) as max_id FROM locations');
    const nextId = (maxIdResult[0].max_id || 0) + 1;

    const query = `
      INSERT INTO locations (location_id, location_name, building, address) 
      VALUES (?, ?, ?, ?)
    `;
    await pool.query(query, [nextId, location_name, building, address || null]);
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

// Update location
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { location_name, building, address } = req.body;

  if (!location_name || !building) {
    return res.status(400).send('กรุณาระบุชื่อสถานที่และอาคาร');
  }

  try {
    // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
    const [locationCheck] = await pool.query(
      'SELECT location_id FROM locations WHERE location_id = ?',
      [id]
    );
    if (locationCheck.length === 0) {
      return res.status(404).send('ไม่พบข้อมูลสถานที่');
    }

    const query = `
      UPDATE locations 
      SET location_name = ?, building = ?, address = ?
      WHERE location_id = ?
    `;
    await executeQuery(
      query, 
      [location_name, building, address || null, id],
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

// Delete location
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // ตรวจสอบว่ามีการใช้งานอยู่หรือไม่
    // const [usageCheck] = await pool.query(
    //   'SELECT room_id FROM rooms WHERE location_id = ?',
    //   [id]
    // );
    // if (usageCheck.length > 0) {
    //   return res.status(400).send('ไม่สามารถลบได้เนื่องจากมีการใช้งานอยู่');
    // }

    const query = 'DELETE FROM locations WHERE location_id = ?';
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