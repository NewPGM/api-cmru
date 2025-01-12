const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // แก้ไขเป็นตัวพิมพ์เล็ก

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
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).send('ข้อมูลซ้ำในระบบ');
    } else {
      res.status(500).send('เกิดข้อผิดพลาดในการดำเนินการฐานข้อมูล');
    }
  }
}

// Endpoint สำหรับดึงข้อมูลห้องทั้งหมด
router.get('/rooms', async (req, res) => {
  const query = 'SELECT room_id, room_name FROM rooms ORDER BY room_name';
  await executeQuery(query, [], res);
});

// Endpoint สำหรับดึงข้อมูลผู้สอนทั้งหมด
router.get('/', async (req, res) => {
  const query = `
    SELECT 
      instructors.instructor_id,
      instructors.name,
      instructors.email,
      instructors.room_id,
      instructors.Url,
      instructors.phone_number,
      rooms.room_name
    FROM instructors
    JOIN rooms ON instructors.room_id = rooms.room_id
    ORDER BY instructors.instructor_id ASC
  `;
  await executeQuery(query, [], res);
});

// Endpoint สำหรับเพิ่มข้อมูลผู้สอน
router.post('/', async (req, res) => {
  const { name, email, room_id, Url, phone_number } = req.body;

  // ตรวจสอบข้อมูลที่จำเป็น
  if (!name || !email || !room_id || !Url || !phone_number) {
    return res.status(400).send('กรุณาระบุข้อมูลให้ครบถ้วน');
  }

  try {
    // ตรวจสอบว่า room_id มีอยู่จริง
    const [roomCheck] = await pool.query('SELECT room_id FROM rooms WHERE room_id = ?', [room_id]);
    if (roomCheck.length === 0) {
      return res.status(400).send('ไม่พบห้องที่ระบุ');
    }

    // ตรวจสอบว่าอีเมลซ้ำหรือไม่
    const [emailCheck] = await pool.query('SELECT instructor_id FROM instructors WHERE email = ?', [email]);
    if (emailCheck.length > 0) {
      return res.status(400).send('อีเมลนี้มีอยู่ในระบบแล้ว');
    }

    // หา ID ล่าสุดและเพิ่มข้อมูล
    const [lastId] = await pool.query('SELECT MAX(instructor_id) as max_id FROM instructors');
    const nextId = (lastId[0].max_id || 0) + 1;

    const query = 'INSERT INTO instructors (instructor_id, name, email, room_id, Url, phone_number) VALUES (?, ?, ?, ?)';
    await pool.query(query, [nextId, name, email, room_id, Url, phone_number]);
    
    res.status(201).send('เพิ่มข้อมูลผู้สอนเรียบร้อยแล้ว');
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการดำเนินการฐานข้อมูล:', err.message);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).send('อีเมลนี้มีอยู่ในระบบแล้ว');
    } else {
      res.status(500).send('เกิดข้อผิดพลาดในการดำเนินการฐานข้อมูล');
    }
  }
});

// Endpoint สำหรับอัปเดตข้อมูลผู้สอน
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, room_id, Url, phone_number } = req.body;

  if (!name || !email || !room_id || !Url || !phone_number) {
    return res.status(400).send('กรุณาระบุข้อมูลให้ครบถ้วน');
  }

  try {
    // ตรวจสอบว่า instructor_id มีอยู่จริง
    const [instructorCheck] = await pool.query(
      'SELECT instructor_id FROM instructors WHERE instructor_id = ?',
      [id]
    );
    if (instructorCheck.length === 0) {
      return res.status(404).send('ไม่พบข้อมูลผู้สอน');
    }

    // ตรวจสอบว่า room_id มีอยู่จริง
    const [roomCheck] = await pool.query('SELECT room_id FROM rooms WHERE room_id = ?', [room_id]);
    if (roomCheck.length === 0) {
      return res.status(400).send('ไม่พบห้องที่ระบุ');
    }

    // ตรวจสอบว่าอีเมลซ้ำหรือไม่ (ยกเว้นอีเมลของผู้สอนคนนี้)
    const [emailCheck] = await pool.query(
      'SELECT instructor_id FROM instructors WHERE email = ? AND instructor_id != ?',
      [email, id]
    );
    if (emailCheck.length > 0) {
      return res.status(400).send('อีเมลนี้มีอยู่ในระบบแล้ว');
    }

    const query = `
      UPDATE instructors
      SET name = ?, email = ?, room_id = ? , Url = ?, phone_number = ?
      WHERE instructor_id = ?
    `;
    await executeQuery(query, [name, email, room_id, id, Url, phone_number], res, 'อัปเดตข้อมูลผู้สอนเรียบร้อยแล้ว');
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการดำเนินการฐานข้อมูล:', err.message);
    res.status(500).send('เกิดข้อผิดพลาดในการดำเนินการฐานข้อมูล');
  }
});

// Endpoint สำหรับลบข้อมูลผู้สอน
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // ตรวจสอบว่า instructor_id มีอยู่จริง
    const [instructorCheck] = await pool.query(
      'SELECT instructor_id FROM instructors WHERE instructor_id = ?',
      [id]
    );
    if (instructorCheck.length === 0) {
      return res.status(404).send('ไม่พบข้อมูลผู้สอน');
    }

    const query = 'DELETE FROM instructors WHERE instructor_id = ?';
    await executeQuery(query, [id], res, 'ลบข้อมูลผู้สอนเรียบร้อยแล้ว');
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการลบข้อมูล:', err);
    res.status(500).send('เกิดข้อผิดพลาดในการลบข้อมูล');
  }
});

module.exports = router;