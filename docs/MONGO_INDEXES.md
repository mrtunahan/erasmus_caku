# MongoDB indeks önerileri

Bu belge sık kullanılan query örüntülerine göre **önerilen** indeksleri
listeler. Production'da indeks eklemeden önce profile / explain çıktısı
ile doğrulayın. Mongo `db.<collection>.createIndex(...)` ile uygulanır,
ya da bir migration script'i olarak `server/migrations/` altına eklenir.

> Sıralama: koleksiyon adına göre. Her indeksin amacı belirtilmiştir.

## audit_logs _(yeni — `server/middleware/auditLog.js`)_

```js
db.audit_logs.createIndex({ at: -1 });
db.audit_logs.createIndex({ 'actor.userId': 1, at: -1 });
db.audit_logs.createIndex({ 'operations.collection': 1, at: -1 });
// TTL — 90 gün retention (PII koruması)
db.audit_logs.createIndex({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
```

## students

```js
db.students.createIndex({ _docId: 1 }, { unique: true, sparse: true });
db.students.createIndex({ department: 1, class: 1 });
db.students.createIndex({ email: 1 }, { unique: true, sparse: true });
```

## sinav_programi, sinav_dersler, sinav_donemler

```js
db.sinav_programi.createIndex({ donem: 1, ders: 1 });
db.sinav_dersler.createIndex({ donem: 1 });
db.sinav_donemler.createIndex({ aktif: 1, baslangic: -1 });
```

## portal_posts

```js
db.portal_posts.createIndex({ createdAt: -1 });
db.portal_posts.createIndex({ author: 1, createdAt: -1 });
db.portal_posts.createIndex({ tags: 1 });
```

## portal_notifications, student_notifications

```js
db.portal_notifications.createIndex({ recipientId: 1, read: 1, createdAt: -1 });
db.student_notifications.createIndex({ recipientId: 1, read: 1, createdAt: -1 });
```

## muafiyet_records

```js
db.muafiyet_records.createIndex({ studentId: 1, createdAt: -1 });
db.muafiyet_records.createIndex({ status: 1 });
```

## internships, internship_applications, internship_uploads

```js
db.internships.createIndex({ studentId: 1, status: 1 });
db.internship_applications.createIndex({ studentId: 1, periodId: 1 });
db.internship_uploads.createIndex({ studentId: 1, type: 1 });
```

## projects, project_courses, course_groups

```js
db.projects.createIndex({ status: 1, updatedAt: -1 });
db.project_courses.createIndex({ projectId: 1 });
db.course_groups.createIndex({ ders: 1, donem: 1 });
```

## performance_indicators, performance_targets, performance_forms

```js
db.performance_indicators.createIndex({ year: 1, departmentId: 1 });
db.performance_targets.createIndex({ indicatorId: 1, year: 1 });
db.performance_forms.createIndex({ userId: 1, year: 1 });
```

## Operasyonel notlar

- **Yeni indeks eklerken** önce staging'de `explain()` ile değer denetle,
  sonra prod'da `createIndex({ ..., background: true })` ile çalıştır
  (Mongo 4.2+ artık background'u görmezden gelir; varsayılan davranış).
- TTL indeksleri için `expireAfterSeconds` saniyedir, dakika değil.
- `unique` indeks varlığında geçmiş veride duplicate olabilir; önce
  `db.collection.aggregate([{$group:{_id:"$field",n:{$sum:1}}},{$match:{n:{$gt:1}}}])`
  ile temizle.
- `db.collection.stats()` ve `db.collection.getIndexes()` ile düzenli denetim
  yap; kullanılmayan indeksler write maliyetini şişirir.
