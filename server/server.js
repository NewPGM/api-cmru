//server/server.js
require('dotenv').config(); // โหลดตัวแปรสิ่งแวดล้อมจากไฟล์ .env
const express = require('express');
const cors = require('cors');
const instructorsRoutes = require('./routes/instructors'); // แก้ไขเส้นทาง
const roomsRoutes = require('./routes/rooms'); // แก้ไขเส้นทาง
const locationsRoutes = require('./routes/locations');
const PhilosophyRoutes = require('./routes/Philosophy');
const coursesRoutes = require('./routes/courses');
const degreeProgramsRoutes = require('./routes/degree_programs');
const instructor_sjRoutes = require('./routes/instructor_sj');
const subjectsRoutes = require('./routes/subjects');
const program_subjects = require('./routes/program_subjects');
const training_phrases = require('./routes/training_phrases');
const intents = require('./routes/intents');
const adminRoutes = require('./routes/admin');
const loginRoutes = require('./routes/login');



const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ใช้ route สำหรับผู้สอน
app.use('/api/instructors', instructorsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/Philosophy', PhilosophyRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/degree_programs', degreeProgramsRoutes);
app.use('/api/instructor_sj', instructor_sjRoutes);
app.use('/api/subjects',subjectsRoutes );
app.use('/api/program_subjects',program_subjects );
app.use('/api/training_phrases',training_phrases );
app.use('/api/intents',intents );
app.use('/api/admin', adminRoutes);
app.use('/api/login', loginRoutes);

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`เซิร์ฟเวอร์กำลังทำงานที่ http://localhost:${port}`);
  });
}

module.exports = app;
