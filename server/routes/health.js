const express = require("express");
const { getDbSafe } = require("../config/database");

const router = express.Router();

// Tüm bilinen koleksiyonlar
const COLLECTIONS = [
  "students", "professors", "passwords", "departments",
  "department_classrooms",
  "sinav_programi", "sinav_dersler", "sinav_donemler",
  "exams", "exam_results", "exam_periods",
  "course_groups", "course_group_posts", "course_schedules",
  "trip_history",
  "portal_posts", "portal_moderators", "portal_notifications",
  "portal_profiles", "portal_follows", "portal_reports",
  "muafiyet_settings", "muafiyet_records",
  "projects", "project_courses",
  "events", "resources", "forms", "internships",
];

// GET /api/health
router.get("/", async (req, res) => {
  try {
    const db = await getDbSafe();
    const counts = {};
    let totalDocuments = 0;

    await Promise.all(
      COLLECTIONS.map(async (name) => {
        const count = await db.collection(name).countDocuments();
        counts[name] = count;
        totalDocuments += count;
      })
    );

    res.json({
      status: "ok",
      database: "mongodb",
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
