import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  createUserWithEmailAndPassword, updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, setPersistence, browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig, EMAIL_DOMAIN, ADMIN_USERNAME, ADMIN_EMAILS } from './firebase-config.js';

export const app = initializeApp(firebaseConfig);
export const fbAuth = getAuth(app);
export const db = getFirestore(app);
setPersistence(fbAuth, browserLocalPersistence).catch(() => {});

export const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;
export const toEmail = u => `${String(u).trim().toLowerCase()}@${EMAIL_DOMAIN}`;

/** Current session: { ready, user, profile } — profile = users/{uid} doc. */
export const auth = { ready: false, user: null, profile: null, error: null };
export const isAdmin = () => !!(auth.profile && auth.profile.active && auth.profile.role === 'admin');
export const isIn = () => !!(auth.user && auth.profile && auth.profile.active);

let listeners = [];
let pendingError = null; // survives the sign-out we trigger ourselves
export function initAuth(onChange) {
  listeners.push(onChange);
  onAuthStateChanged(fbAuth, async user => {
    auth.user = user; auth.profile = null; auth.error = user ? null : pendingError; pendingError = null;
    if (user) {
      try {
        const profile = await loadOrBootstrapProfile(user);
        if (!profile || !profile.active) {
          pendingError = profile ? 'loginDisabled' : 'loginNoProfile';
          await signOut(fbAuth); return;
        }
        auth.profile = profile;
      } catch (e) {
        console.error(e); pendingError = 'errLoad'; await signOut(fbAuth); return;
      }
    }
    auth.ready = true;
    listeners.forEach(fn => fn(auth));
  });
}

async function loadOrBootstrapProfile(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { uid: user.uid, ...snap.data() };
  // First sign-in of the bootstrap admin: create its profile.
  if (ADMIN_EMAILS.includes(String(user.email).toLowerCase())) {
    const profile = { username: ADMIN_USERNAME, name: 'Admin', role: 'admin', active: true, createdAt: serverTimestamp() };
    await setDoc(ref, profile);
    return { uid: user.uid, ...profile };
  }
  return null;
}

export async function login(username, password) {
  const u = String(username).trim().toLowerCase();
  // accept "admin" or the full e-mail "admin@egygulf.com"
  const email = u.includes('@') ? u : (USERNAME_RE.test(u) ? toEmail(u) : null);
  if (!email || !password) throw codeErr('loginErr');
  try {
    await signInWithEmailAndPassword(fbAuth, email, password);
  } catch (e) {
    if (e.code === 'auth/too-many-requests') throw codeErr('loginTooMany');
    if (e.code === 'auth/network-request-failed') throw codeErr('errOffline');
    if (e.code === 'auth/unauthorized-domain') throw codeErr('loginDomain');
    if (e.code === 'auth/operation-not-allowed') throw codeErr('loginDisabledMethod');
    if (e.code === 'auth/invalid-api-key' || e.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') throw codeErr('loginConfig');
    console.error('login failed:', e.code, e.message);
    throw codeErr('loginErr');
  }
}

export const logout = () => signOut(fbAuth);

export async function changeOwnPassword(current, next) {
  const user = fbAuth.currentUser;
  if (!user) throw codeErr('errPerm');
  if (String(next).length < 6) throw codeErr('pwRule');
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
  } catch (e) { throw codeErr('pwWrong'); }
  await updatePassword(user, next);
}

/* ───── admin: users ───── */
let secondary = null;
export async function createUser({ username, name, password, role }) {
  const u = String(username).trim().toLowerCase();
  if (!USERNAME_RE.test(u)) throw codeErr('usernameRule');
  if (String(password).length < 6) throw codeErr('pwRule');
  // A secondary app instance creates the account without signing the admin out.
  if (!secondary) secondary = initializeApp(firebaseConfig, 'secondary');
  const secAuth = getAuth(secondary);
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(secAuth, toEmail(u), password);
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') throw codeErr('userExists');
    if (e.code === 'auth/weak-password') throw codeErr('pwRule');
    throw e;
  } finally {
    signOut(secAuth).catch(() => {});
  }
  await setDoc(doc(db, 'users', cred.user.uid), {
    username: u, name: String(name || u).trim().slice(0, 60), role: role === 'admin' ? 'admin' : 'user',
    active: true, createdAt: serverTimestamp(), createdBy: auth.user.uid,
  });
  return cred.user.uid;
}

export async function listUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export async function updateUser(uid, patch) {
  const allowed = {};
  if ('active' in patch) allowed.active = !!patch.active;
  if ('role' in patch) allowed.role = patch.role === 'admin' ? 'admin' : 'user';
  if ('name' in patch) allowed.name = String(patch.name).trim().slice(0, 60);
  await updateDoc(doc(db, 'users', uid), allowed);
}

export function codeErr(code) { const e = new Error(code); e.code = code; return e; }
