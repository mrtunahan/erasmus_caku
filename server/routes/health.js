const express = require("express");
const { getDbSafe } = require("../config/database");

const router = express.Router();

// Tüm bilinen koleksiyonlar
const COLLECTIONS = [
  "students", "users", "professors", "passwords", "departments",
  "department_classrooms", "department_supervisors",
  "sinav_programi", "sinav_dersler", "sinav_donemler",
  "exams", "exam_results", "exam_periods",
  "course_groups", "course_group_posts", "course_schedules",
  "trip_history",
  "portal_posts", "portal_moderators", "portal_notifications",
  "portal_profiles", "portal_follows", "portal_reports",
  "muafiyet_settings", "muafiyet_records",
  "projects", "project_courses",
  "yaz_okulu_students", "yaz_okulu_records", "yaz_okulu_settings",
  "surveys", "events", "resources", "forms", "internships",
];

// GET /api/health - Sunucu durumu ve koleksiyon sayıları
router.get("/", async (req, res) => {
  try {
    const db = await getDbSafe();
    const counts = {};
    let totalDocuments = 0;

    await Promise.all(
      COLLECTIONS.map(async (name) => {
        const snapshot = await db.collection(name).get();
        const count = snapshot.size;
        counts[name] = count;
        totalDocuments += count;
      })
    );

    res.json({
      status: "ok",
      database: "firestore",
      totalCollections: COLLECTIONS.length,
      totalDocuments,
      collections: counts,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
});

module.exports = router;
