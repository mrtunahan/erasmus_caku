
import FirebaseDB from '../../services/firebase';

const ExemptionService = {
    settingsRef: function () {
        return FirebaseDB.db() ? FirebaseDB.db().collection("muafiyet_settings") : null;
    },
    recordsRef: function () {
        return window.FirebaseDB.db() ? window.FirebaseDB.db().collection("muafiyet_records") : null;
    },

    // ÇAKÜ ders içerikleri kaydet
    async saveCourseContents(contents) {
        var ref = this.settingsRef();
        if (!ref) throw new Error("Firebase bağlantısı yok");
        await ref.doc("course_contents").set({
            courses: contents,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        });
    },
    async fetchCourseContents() {
        var ref = this.settingsRef();
        if (!ref) return [];
        var doc = await ref.doc("course_contents").get();
        return doc.exists ? (doc.data().courses || []) : [];
    },

    // Not sistemi kaydet
    async saveGradingSystem(system) {
        var ref = this.settingsRef();
        if (!ref) throw new Error("Firebase bağlantısı yok");
        await ref.doc("grading_system").set({
            grades: system,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        });
    },
    async fetchGradingSystem() {
        var ref = this.settingsRef();
        if (!ref) return null;
        var doc = await ref.doc("grading_system").get();
        return doc.exists ? (doc.data().grades || null) : null;
    },

    // Muafiyet kaydı CRUD
    async saveRecord(record) {
        var ref = this.recordsRef();
        if (!ref) throw new Error("Firebase bağlantısı yok");
        var id = record.id;
        var data = Object.assign({}, record);
        delete data.id;
        if (id) {
            await ref.doc(String(id)).update(Object.assign({}, data, {
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            }));
            return record;
        } else {
            var docRef = await ref.add(Object.assign({}, data, {
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            }));
            return Object.assign({}, record, { id: docRef.id });
        }
    },
    async fetchRecords() {
        var ref = this.recordsRef();
        if (!ref) return [];
        var snapshot = await ref.orderBy("createdAt", "desc").get();
        return snapshot.docs.map(function (doc) { return Object.assign({}, doc.data(), { id: doc.id }); });
    },
    async deleteRecord(id) {
        var ref = this.recordsRef();
        if (!ref) throw new Error("Firebase bağlantısı yok");
        await ref.doc(String(id)).delete();
    },
};

export default ExemptionService;
