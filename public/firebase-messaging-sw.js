importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyBkK16_d4R0VWeQCgOjH296cTbZNLxM-ts",
  authDomain: "microintel-saraswati.firebaseapp.com",
  projectId: "microintel-saraswati",
  storageBucket: "microintel-saraswati.firebasestorage.app",
  messagingSenderId: "42134813237",
  appId: "1:42134813237:web:2ba582aa74b2a74c480f7c"
};
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {

  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: "/favicon.ico"
    }
  );

});
