// server/routes/rooms.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all rooms

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

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rooms ORDER BY room_name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).send('Error fetching rooms');
  }
});

// Add room
router.post('/', async (req, res) => {
  const { room_name } = req.body;
  if (!room_name) {
    return res.status(400).send('Room name is required');
  }
  try {
    const [lastId] = await pool.query('SELECT MAX(room_id) as max_id FROM rooms');
    const nextId = (lastId[0].max_id || 0) + 1;
    // eslint-disable-next-line no-empty-pattern
    const query = 'INSERT INTO rooms (room_id, room_name) VALUES (?, ?)';
    await pool.query(query, [nextId, room_name]);
    res.status(201).send('Room added successfully');
  } catch (error) {
    console.error('Error adding room:', error);
    res.status(500).send('Error adding room');
  }
});

// Update room
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { room_name } = req.body;
  if (!room_name) {
    return res.status(400).send('Room name is required');
  }
  try {
    const [result] = await pool.query(
      'UPDATE rooms SET room_name = ? WHERE room_id = ?',
      [room_name, id]
    );
    if (result.affectedRows === 0) {
      res.status(404).send('Room not found');
    } else {
      res.send('Room updated successfully');
    }
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).send('Error updating room');
  }
});

// Delete room

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // ตรวจสอบว่า room_id มีอยู่จริงในตาราง rooms
    const [roomCheck] = await pool.query(
      'SELECT room_id FROM rooms WHERE room_id = ?',
      [id]
    );
    if (roomCheck.length === 0) {
      return res.status(404).send('ไม่พบข้อมูลห้อง');
    }

    // ตรวจสอบว่ามีการอ้างอิง room_id ในตาราง instructors หรือไม่
    const [referenceCheck] = await pool.query(
      'SELECT room_id FROM instructors WHERE room_id = ?',
      [id]
    );
    if (referenceCheck.length > 0) {
      return res.status(400).send('ไม่สามารถลบห้องได้ เนื่องจากมีการอ้างอิงข้อมูลอยู่');
    }

    // ลบข้อมูล room_id ออกจากตาราง rooms
    const query = 'DELETE FROM rooms WHERE room_id = ?';
    await executeQuery(query, [id], res, 'ลบข้อมูลห้องเรียบร้อยแล้ว');
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการลบข้อมูล:', err);
    res.status(500).send('เกิดข้อผิดพลาดในการลบข้อมูล');
  }
});


module.exports = router;