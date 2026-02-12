import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAv7jWo-91xUkrhQ7o8stRoo6en5Ft1XXw",
    authDomain: "caku-erasmus.firebaseapp.com",
    projectId: "caku-erasmus",
    storageBucket: "caku-erasmus.appspot.com",
    messagingSenderId: "1080383700372",
    appId: "1:1080383700372:web:86b7a67bf8701f64afa381"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Enable long polling as per existing config
const db = firebase.firestore();
db.settings({ experimentalAutoDetectLongPolling: true });

const auth = firebase.auth();

// Make firebase available on window for legacy service code
if (typeof window !== 'undefined') {
    window.firebase = firebase;
}

// Default export for services that import as FirebaseDB
const FirebaseDB = {
    db: () => db,
    auth: () => auth,
    firebase: firebase,
};

export { firebase, db, auth };
export default FirebaseDB;
