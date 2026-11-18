// Firebase web config — safe to ship in client code (access is enforced by firestore.rules).
export const firebaseConfig = {
  apiKey: "AIzaSyDPpP36I5cd_-wh07C12bx9QOFxdjsxvJw",
  authDomain: "bigcatalog-e8da6.firebaseapp.com",
  projectId: "bigcatalog-e8da6",
  storageBucket: "bigcatalog-e8da6.firebasestorage.app",
  messagingSenderId: "968528715655",
  appId: "1:968528715655:web:5bd376beb2adea03d77d22",
};

// Usernames are mapped to internal e-mails: "<username>@egygulf.com" (users can also type the full e-mail).
export const EMAIL_DOMAIN = 'egygulf.com';
// The first admin. Create this user once in Firebase Console → Authentication.
export const ADMIN_USERNAME = 'admin';
// E-mails accepted as the first admin (whichever one was created in the console).
export const ADMIN_EMAILS = ['admin@egygulf.com', 'admin@egygulf.app'];
