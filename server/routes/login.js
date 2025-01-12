const express = require('express');
const router = express.Router(); // ใช้ Router แทน app
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const SECRET_KEY = 'your-secret-key';

// เปลี่ยนจาก app.post เป็น router.post และลบ /api/login ออก
// เพราะเรากำหนด path base ไว้ที่ server.js แล้ว
router.post('/', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [users] = await pool.query('SELECT * FROM admin WHERE username = ?', [username]);

    if (users.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send('Invalid credentials');
    }

    const token = jwt.sign(
      { admin_id: user.admin_id, username: user.username },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    const userResponse = {
      admin_id: user.admin_id,
      username: user.username,
      // เพิ่มข้อมูลอื่นๆ ที่ต้องการส่งกลับ
    };
    res.json({ token, userResponse });
  } catch (err) {
    console.error('Error during login:', err.message);
    res.status(500).send('Server error');
  }
});

// ลบ app.listen ออก เพราะเราจะใช้ server.js เป็นตัว start server

// export router แทน
module.exports = router;