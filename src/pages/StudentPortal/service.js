
import FirebaseDB from '../../../services/firebase';

const PortalService = {
    postsRef: function () {
        return FirebaseDB.db() ? FirebaseDB.db().collection("portal_posts") : null;
    },
    commentsRef: function (postId) {
        return FirebaseDB.db() ? FirebaseDB.db().collection("portal_posts").doc(String(postId)).collection("comments") : null;
    },

    // Gönderiler
    async createPost(post) {
        var ref = this.postsRef();
        if (!ref) throw new Error("Firebase bağlantısı yok");
        // Use window.firebase or import firebase if available, assuming window.firebase for now as per legacy
        var docRef = await ref.add(Object.assign({}, post, {
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            reactions: {},
            commentCount: 0,
            views: 0,
            pinned: false,
        }));
        return Object.assign({}, post, { id: docRef.id });
    },

    async fetchPosts(category, limit) {
        var ref = this.postsRef();
        if (!ref) return [];
        var query = ref.orderBy("createdAt", "desc");
        if (category && category !== "tumu") {
            query = query.where("category", "==", category);
        }
        if (limit) query = query.limit(limit);
        var snapshot = await query.get();
        return snapshot.docs.map(function (doc) {
            return Object.assign({}, doc.data(), { id: doc.id });
        });
    },

    async updatePost(id, data) {
        var ref = this.postsRef();
        if (!ref) throw new Error("Firebase bağlantısı yok");
        await ref.doc(String(id)).update(data);
    },

    async deletePost(id) {
        var ref = this.postsRef();
        if (!ref) throw new Error("Firebase bağlantısı yok");
        await ref.doc(String(id)).delete();
    },

    async toggleReaction(postId, reactionType, userId) {
        var ref = this.postsRef();
        if (!ref) return;
        var docRef = ref.doc(String(postId));
        var doc = await docRef.get();
        if (!doc.exists) return;
        var data = doc.data();
        var reactions = data.reactions || {};
        var reactionList = reactions[reactionType] || [];
        var idx = reactionList.indexOf(userId);
        if (idx >= 0) {
            reactionList.splice(idx, 1);
        } else {
            reactionList.push(userId);
        }
        reactions[reactionType] = reactionList;
        await docRef.update({ reactions: reactions });
        return reactions;
    },

    // Yorumlar
    async addComment(postId, comment) {
        var ref = this.commentsRef(postId);
        if (!ref) throw new Error("Firebase bağlantısı yok");
        var docRef = await ref.add(Object.assign({}, comment, {
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            likes: [],
        }));
        // Yorum sayısını artır
        var postRef = this.postsRef().doc(String(postId));
        await postRef.update({
            commentCount: window.firebase.firestore.FieldValue.increment(1),
        });
        return Object.assign({}, comment, { id: docRef.id });
    },

    async fetchComments(postId) {
        var ref = this.commentsRef(postId);
        if (!ref) return [];
        var snapshot = await ref.orderBy("createdAt", "asc").get();
        return snapshot.docs.map(function (doc) {
            return Object.assign({}, doc.data(), { id: doc.id });
        });
    },

    async updateComment(postId, commentId, data) {
        var ref = this.commentsRef(postId);
        if (!ref) throw new Error("Firebase bağlantısı yok");
        await ref.doc(String(commentId)).update(data);
    },

    async deleteComment(postId, commentId) {
        var ref = this.commentsRef(postId);
        if (!ref) throw new Error("Firebase bağlantısı yok");
        await ref.doc(String(commentId)).delete();
        // Yorum sayısını azalt
        var postRef = this.postsRef().doc(String(postId));
        await postRef.update({
            commentCount: window.firebase.firestore.FieldValue.increment(-1),
        });
    },

    async toggleCommentLike(postId, commentId, userId) {
        var ref = this.commentsRef(postId);
        if (!ref) return [];
        var docRef = ref.doc(String(commentId));
        var doc = await docRef.get();
        if (!doc.exists) return [];
        var data = doc.data();
        var likes = data.likes || [];
        var idx = likes.indexOf(userId);
        if (idx >= 0) {
            likes.splice(idx, 1);
        } else {
            likes.push(userId);
        }
        await docRef.update({ likes: likes });
        return likes;
    },

    // Anket oyu
    async votePoll(postId, optionIndex, userId) {
        var ref = this.postsRef();
        if (!ref) return;
        var docRef = ref.doc(String(postId));
        var doc = await docRef.get();
        if (!doc.exists) return;
        var data = doc.data();
        var pollVotes = data.pollVotes || {};
        // Önceki oyu kaldır
        Object.keys(pollVotes).forEach(function (key) {
            var voters = pollVotes[key] || [];
            var idx = voters.indexOf(userId);
            if (idx >= 0) voters.splice(idx, 1);
            pollVotes[key] = voters;
        });
        // Yeni oy
        var key = String(optionIndex);
        if (!pollVotes[key]) pollVotes[key] = [];
        pollVotes[key].push(userId);
        await docRef.update({ pollVotes: pollVotes });
        return pollVotes;
    },

    // Görüntülenme artır
    async incrementViews(postId) {
        var ref = this.postsRef();
        if (!ref) return;
        await ref.doc(String(postId)).update({
            views: window.firebase.firestore.FieldValue.increment(1),
        });
    },

    // ── Dosya Yükleme (Firebase Storage) ──
    async uploadFile(file) {
        var storage = window.firebase.storage();
        var ext = file.name.split(".").pop();
        var filename = "portal_files/" + Date.now() + "_" + Math.random().toString(36).substr(2) + "." + ext;
        var ref = storage.ref(filename);
        await ref.put(file);
        var url = await ref.getDownloadURL();
        return { url: url, name: file.name, type: file.type, size: file.size };
    },

    // ── Bildirimler ──
    notificationsRef: function (userId) {
        return FirebaseDB.db() ? FirebaseDB.db().collection("portal_notifications").doc(String(userId)).collection("items") : null;
    },

    async addNotification(targetUserId, notification) {
        var ref = this.notificationsRef(targetUserId);
        if (!ref) return;
        await ref.add(Object.assign({}, notification, {
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
        }));
    },

    async fetchNotifications(userId, limit) {
        var ref = this.notificationsRef(userId);
        if (!ref) return [];
        var query = ref.orderBy("createdAt", "desc").limit(limit || 20);
        var snapshot = await query.get();
        return snapshot.docs.map(function (doc) {
            return Object.assign({}, doc.data(), { id: doc.id });
        });
    },

    async markNotificationRead(userId, notifId) {
        var ref = this.notificationsRef(userId);
        if (!ref) return;
        await ref.doc(String(notifId)).update({ read: true });
    },

    async markAllNotificationsRead(userId) {
        var ref = this.notificationsRef(userId);
        if (!ref) return;
        var snapshot = await ref.where("read", "==", false).get();
        var batch = FirebaseDB.db().batch();
        snapshot.docs.forEach(function (doc) { batch.update(doc.ref, { read: true }); });
        await batch.commit();
    },

    // ── Raporlama ──
    reportsRef: function () {
        return FirebaseDB.db() ? FirebaseDB.db().collection("portal_reports") : null;
    },

    async reportPost(postId, reportData) {
        var ref = this.reportsRef();
        if (!ref) throw new Error("Firebase bağlantısı yok");
        await ref.add(Object.assign({}, reportData, {
            postId: postId,
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            status: "pending",
        }));
    },

    async fetchReports() {
        var ref = this.reportsRef();
        if (!ref) return [];
        var snapshot = await ref.orderBy("createdAt", "desc").get();
        return snapshot.docs.map(function (doc) {
            return Object.assign({}, doc.data(), { id: doc.id });
        });
    },

    async resolveReport(reportId) {
        var ref = this.reportsRef();
        if (!ref) return;
        await ref.doc(String(reportId)).update({ status: "resolved" });
    },
};

export default PortalService;
