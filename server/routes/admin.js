const express = require('express');
const bcrypt = require('bcrypt'); // นำเข้า bcrypt
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
      admin_id,
      username,
      email_admin
    FROM admin
  `;
  await executeQuery(query, [], res);
});

// Create new admin
router.post('/', async (req, res) => {
  const { username, password, email_admin } = req.body;

  if (!username || !password || !email_admin) {
    return res.status(400).send('กรุณาระบุข้อมูลให้ถูกต้อง');
  }

  try {
    const [maxIdResult] = await pool.query('SELECT MAX(admin_id) as max_id FROM admin');
    const nextId = (maxIdResult[0].max_id || 0) + 1;

    // แฮชรหัสผ่านก่อนบันทึก
    const hashedPassword = await bcrypt.hash(password, 10); // ใช้ bcrypt เพื่อแฮชรหัสผ่าน

    const query = `
      INSERT INTO admin (admin_id, username, password, email_admin) 
      VALUES (?, ?, ?, ?)
    `;
    await pool.query(query, [nextId, username, hashedPassword, email_admin || null]);
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

// Update admin
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, email_admin } = req.body;

  if (!username || !password || !email_admin) {
    return res.status(400).send('กรุณาระบุข้อมูลให้ถูกต้อง');
  }

  try {
    const [adminCheck] = await pool.query(
      'SELECT admin_id FROM admin WHERE admin_id = ?',
      [id]
    );
    if (adminCheck.length === 0) {
      return res.status(404).send('ไม่พบข้อมูลสถานที่');
    }

    // แฮชรหัสผ่านก่อนอัปเดต
    const hashedPassword = await bcrypt.hash(password, 10); // ใช้ bcrypt เพื่อแฮชรหัสผ่านใหม่

    const query = `
      UPDATE admin 
      SET username = ?, password = ?, email_admin = ? 
      WHERE admin_id = ?
    `;
    await executeQuery(
      query, 
      [username, hashedPassword, email_admin || null, id],
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

// Delete admin
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = 'DELETE FROM admin WHERE admin_id = ?';
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
