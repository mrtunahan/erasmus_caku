import FirebaseDB from '../../services/firebase';

const YazOkuluService = {
  // Koleksiyon referansları
  studentsRef() {
    const db = FirebaseDB.db();
    return db ? db.collection('yaz_okulu_students') : null;
  },
  applicationsRef() {
    const db = FirebaseDB.db();
    return db ? db.collection('yaz_okulu_applications') : null;
  },

  // ── Admin: Öğrenci CRUD ──
  async addStudent(student) {
    const ref = this.studentsRef();
    if (!ref) throw new Error('Firebase bağlantısı yok');
    const docRef = await ref.add({
      ...student,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });
    return { ...student, id: docRef.id };
  },

  async getStudents() {
    const ref = this.studentsRef();
    if (!ref) return [];
    const snap = await ref.orderBy('studentNo', 'asc').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  },

  async updateStudent(id, data) {
    const ref = this.studentsRef();
    if (!ref) throw new Error('Firebase bağlantısı yok');
    await ref.doc(id).update(data);
  },

  async deleteStudent(id) {
    const ref = this.studentsRef();
    if (!ref) throw new Error('Firebase bağlantısı yok');
    await ref.doc(id).delete();
  },

  async resetPassword(id, newPassword) {
    const ref = this.studentsRef();
    if (!ref) throw new Error('Firebase bağlantısı yok');
    await ref.doc(id).update({ password: newPassword });
  },

  // Öğrenci giriş doğrulama
  async loginStudent(studentNo, password) {
    const ref = this.studentsRef();
    if (!ref) throw new Error('Firebase bağlantısı yok');
    const snap = await ref.where('studentNo', '==', studentNo).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data();
    if (data.password !== password) return null;
    return { ...data, id: doc.id };
  },

  // ── Başvurular ──
  async createApplication(app) {
    const ref = this.applicationsRef();
    if (!ref) throw new Error('Firebase bağlantısı yok');
    const docRef = await ref.add({
      ...app,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });
    return { ...app, id: docRef.id };
  },

  async getApplicationsByStudent(studentNo) {
    const ref = this.applicationsRef();
    if (!ref) return [];
    const snap = await ref.where('studentNo', '==', studentNo).orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  },

  async getAllApplications() {
    const ref = this.applicationsRef();
    if (!ref) return [];
    const snap = await ref.orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  },

  async updateApplication(id, data) {
    const ref = this.applicationsRef();
    if (!ref) throw new Error('Firebase bağlantısı yok');
    await ref.doc(id).update({
      ...data,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  async deleteApplication(id) {
    const ref = this.applicationsRef();
    if (!ref) throw new Error('Firebase bağlantısı yok');
    await ref.doc(id).delete();
  },
};

export default YazOkuluService;
