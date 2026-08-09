// Tüm departmentId'si olmayan öğrencilere "bilgisayar" ata.
// (Önceki server/migrate-students-department.js'in framework içine alınmış hâli.)
module.exports = {
  description: "students.departmentId boş olanlara 'bilgisayar' ata",
  async up(db) {
    const result = await db.collection('students').updateMany(
      {
        $or: [{ departmentId: { $exists: false } }, { departmentId: '' }, { departmentId: null }],
      },
      { $set: { departmentId: 'bilgisayar', departmentName: 'Bilgisayar Mühendisliği' } }
    );
    console.log(`  → ${result.matchedCount} eşleşen, ${result.modifiedCount} güncellenen öğrenci.`);
  },
};
