import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';

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

export { firebase, db, auth };
