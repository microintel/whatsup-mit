console.log("MAIN JS LOADED");

document
.getElementById('about-btn')
.addEventListener(
'click',
() => {

document
.getElementById('about-modal')
.style.display = 'flex';

});

document
.getElementById('close-about')
.addEventListener(
'click',
() => {

document
.getElementById('about-modal')
.style.display = 'none';

});

document
.getElementById('mobile-menu-btn')
.addEventListener(
'click',
() => {

  document
  .getElementById('sidebar')
  .classList.add('open');

  document
  .getElementById('sidebar-overlay')
  .classList.add('show');
});

document
.getElementById('cancel-reply')
.addEventListener(
'click',
() => {

  replyTo = null;

  document
  .getElementById('reply-preview')
  .style.display = 'none';
});

document
.getElementById('sidebar-overlay')
.addEventListener(
'click',
() => {

  document
  .getElementById('sidebar')
  .classList.remove('open');

  document
  .getElementById('sidebar-overlay')
  .classList.remove('show');
});


import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  getDocs,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import {
  getMessaging,
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";
// FIREBASE
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
console.log("2 - Firebase initialized");
const messaging = getMessaging(app);

const auth = getAuth(app);
console.log("3 - Auth initialized");
const db = getFirestore(app);
console.log("4 - Firestore initialized");

onMessage(
  messaging,
  (payload) => {

    console.log(
      "Foreground message:",
      payload
    );

    new Notification(
      payload.notification.title,
      {
        body:
          payload.notification.body,
        icon:"/favicon.ico"
      }
    );

  }
);


// STATE

let localStream = null;

let remoteStream = null;

let peerConnection = null;

let localAudio = null;

let remoteAudio = null;

const servers = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302'
      ]
    }
  ]
};

async function enableNotifications() {

  try {

    const permission =
      await Notification.requestPermission();

    if (permission !== "granted") {
      alert("Notification permission denied");
      return;
    }

    const token =
      await getToken(
        messaging,
        {
          vapidKey:
            import.meta.env.VITE_VAPID_KEY
        }
      );

    console.log(
      "FCM TOKEN:",
      token
    );

    return token;

  } catch (err) {

    console.error(
      "Notification error:",
      err
    );

  }
}


let currentUser = null;
let currentCallId = null;
let currentDM = null;

let unsubMessages = null;

let dmUsers = [];
let replyTo = null;
let lastMessageCount = 0;

const sendSound =
document.getElementById(
'send-sound'
);

const receiveSound =
document.getElementById(
'receive-sound'
);

const ringingSound =
document.getElementById(
'ringing-sound'
);

const incomingRingtone =
document.getElementById(
'incoming-ringtone'
);

// HELPERS
function showToast(msg) {

  const t =
    document.getElementById('toast');

  t.textContent = msg;

  t.classList.add('show');

  setTimeout(() => {

    t.classList.remove('show');

  }, 3000);
}

function autoResize(ta) {

  ta.style.height = 'auto';

  ta.style.height =
    Math.min(
      ta.scrollHeight,
      120
    ) + 'px';
}

function formatTime(ts) {

  if (!ts) return '';

  const d =
    ts.toDate
    ? ts.toDate()
    : new Date(ts);

  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(str) {

  return str
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function createChatId(uid1, uid2) {

  return [uid1, uid2]
    .sort()
    .join('_');
}

// DELETE ACCOUNT + ALL CHATS
// DELETE ACCOUNT + ALL CHATS
async function deleteMyAccount() {

  // WARNING 1
  const warn1 = confirm(
    'Warning 1/3\n\nThis will permanently delete your account.'
  );

  if (!warn1) return;

  // WARNING 2
  const warn2 = confirm(
    'Warning 2/3\n\nAll chats with every user will also be deleted forever.'
  );

  if (!warn2) return;

  // WARNING 3
  const warn3 = confirm(
    'Final Warning 3/3\n\nThis action cannot be undone.\n\nDo you really want to continue?'
  );

  if (!warn3) return;

  try {

    // GET ALL USERS
    const usersSnap = await getDocs(
      collection(db, 'users')
    );

    // LOOP USERS
    for (const userDoc of usersSnap.docs) {

      const otherUser = userDoc.data();

      if (
        otherUser.uid === currentUser.uid
      ) continue;

      // CHAT ID
      const chatId = createChatId(
        currentUser.uid,
        otherUser.uid
      );

      // GET MESSAGES
      const msgSnap = await getDocs(
        collection(
          db,
          'privateChats',
          chatId,
          'messages'
        )
      );

      // DELETE ALL MESSAGES
      for (const msg of msgSnap.docs) {

        await deleteDoc(
          doc(
            db,
            'privateChats',
            chatId,
            'messages',
            msg.id
          )
        );
      }
    }

    // DELETE USER DOC
    await deleteDoc(
      doc(
        db,
        'users',
        currentUser.uid
      )
    );

    // DELETE AUTH ACCOUNT
    await currentUser.delete();

    alert(
      'Your account has been deleted.'
    );

  } catch (e) {

    console.error(e);

    alert(
      'Please login again before deleting account.'
    );
  }
}

// LOGIN
document
.getElementById('google-login-btn')
.addEventListener(
'click',
async () => {

  try {

    const provider =
      new GoogleAuthProvider();

    await signInWithPopup(
      auth,
      provider
    );

  } catch (e) {

    showToast(
      'Login failed'
    );
  }
});


// LOGOUT
document
.getElementById('logout-btn')
.addEventListener(
'click',
async () => {

  await signOut(auth);

  showToast('Signed out');
});

// DELETE ACCOUNT
document
.getElementById('delete-account-btn')
.addEventListener(
'click',
deleteMyAccount
);
// AUTH STATE
onAuthStateChanged(
auth,
async user => {
console.log("5 - Auth state changed", user);
  // hide loading screen
  

  if (!user) {

  document
    .getElementById('login-screen')
    .style.display = 'flex';

  document
    .getElementById('app')
    .classList.remove('visible');

  document
    .getElementById('auth-loading')
    .style.display = 'none';

  console.log("8 - No user");

  return;
}

  currentUser = user;
console.log("6 - User logged in");
  await startApp();
});

// START APP
async function startApp() {
console.log("9 - startApp entered");
  listenIncomingCalls();

  let fcmToken = null;

try {
  fcmToken = await enableNotifications();
} catch (e) {
  console.error("FCM error:", e);
}
  
  await setDoc(
  doc(db, "users", currentUser.uid),
  {
  uid: currentUser.uid,
  name: currentUser.displayName,
  email: currentUser.email,
  photo: currentUser.photoURL,
  fcmToken
  },
  { merge:true }
  );
  
  const isHacker =
  currentUser.email === "hackermitmys@gmail.com";
  
  if(isHacker){
  
  document
  .getElementById("hacker-panel")
  .style.display = "block";
  
  alert("Hacker Dashboard Login");
  }
  

  document
    .getElementById('login-screen')
    .style.display = 'none';

  document
    .getElementById('sidebar-username')
    .textContent =
      currentUser.displayName;

  const wrap =
    document.getElementById(
      'sidebar-avatar-wrap'
    );

  wrap.innerHTML = `
    <img
      src="${currentUser.photoURL}"
      class="avatar"
    />
  `;

  // Prepare mobile UI BEFORE showing app
  if (window.innerWidth <= 768) {

    document
      .getElementById('chat-area')
      .classList.add('no-chat');

    document
      .getElementById('sidebar')
      .classList.add('open');

    document
      .getElementById('sidebar-overlay')
      .classList.add('show');
  }

  await loadDMUsers();

  // Show app only after everything is ready
  document
    .getElementById('app')
    .classList.add('visible');

  document
    .getElementById('auth-loading')
    .style.display = 'none';
}

// LOAD USERS
// LOAD ONLY CHATTED USERS
// LOAD CHATTED USERS
async function loadDMUsers() {

  dmUsers = [];

  const usersSnap = await getDocs(
    collection(db, 'users')
  );

  for (const userDoc of usersSnap.docs) {

    const user = userDoc.data();

    if (
      user.uid === currentUser.uid
    ) continue;

    const chatId =
      createChatId(
        currentUser.uid,
        user.uid
      );

    // CHECK IF CHAT HAS MESSAGES
    const msgSnap = await getDocs(
      collection(
        db,
        'privateChats',
        chatId,
        'messages'
      )
    );

    // only add if messages exist
    if (!msgSnap.empty) {

      dmUsers.push(user);
    }
  }

  renderDMList();
}

// SEARCH USERS BY NAME OR EMAIL
async function searchUsers(text) {

  text = text.trim().toLowerCase();

  // ls = show all registered users
  if (text === 'ls') {

    const snap = await getDocs(
      collection(db, 'users')
    );

    const results = [];

    snap.forEach(docSnap => {

      const user = docSnap.data();

      if (
        user.uid === currentUser.uid
      ) return;

      results.push(user);
    });

    renderDMListFromSearch(results);
    return;
  }

  if (!text) {

    renderDMList();
    return;
  }

  const snap = await getDocs(
    collection(db, 'users')
  );

  const results = [];

  snap.forEach(docSnap => {

    const user = docSnap.data();

    if (
      user.uid === currentUser.uid
    ) return;

    const name =
      (user.name || '')
      .toLowerCase();

    const email =
      (user.email || '')
      .toLowerCase();

    if (
      name.includes(text) ||
      email.includes(text)
    ) {

      results.push(user);
    }
  });

  renderDMListFromSearch(results);
}


function renderDMListFromSearch(users) {

  const list =
    document.getElementById('dm-list');

  list.innerHTML = '';

  users.forEach(user => {

    const item =
      document.createElement('div');

    item.className =
      'channel-item';

    item.innerHTML = `

      <img
        src="${user.photo}"
        style="
          width:38px;
          height:38px;
          border-radius:50%;
          object-fit:cover;
        "
      />

      <div class="ch-info">

        <div class="ch-name">
          ${user.name}
        </div>

        

      </div>
    `;

    item.onclick =
      () => openDM(user);

    list.appendChild(item);
  });
}


// RENDER DM LIST
function renderDMList(
filter = ''
) {

  const list =
    document.getElementById(
      'dm-list'
    );

  list.innerHTML = '';

  const users =
    dmUsers.filter(user => {

      const txt =
      (
      user.name
      ).toLowerCase();

      return txt.includes(
        filter.toLowerCase()
      );
    });

  users.forEach(user => {

    const item =
      document.createElement('div');

    item.className =
      'channel-item';

    item.innerHTML = `

      <img
        src="${user.photo}"
        style="
          width:38px;
          height:38px;
          border-radius:50%;
          object-fit:cover;
        "
      />

      <div class="ch-info">

        <div class="ch-name">
          ${user.name}
        </div>


      </div>
    `;

    item.onclick =
      () => openDM(user);

    list.appendChild(item);
  });
}

// DIFFERENT PARTICLE THEMES
// INTERACTIVE PARTICLE THEMES

const particleThemes = [

{
  particles: {
    number: {
      value: 60
    },

    color: {
      value: "#10B981"
    },

    shape: {
      type: "circle"
    },

    opacity: {
      value: 0.5
    },

    size: {
      value: 3,
      random: true
    },

    line_linked: {
      enable: true,
      distance: 140,
      color: "#10B981",
      opacity: 0.25,
      width: 1
    },

    move: {
      enable: true,
      speed: 2,
      out_mode: "bounce"
    }
  },

  interactivity: {
    detect_on: "canvas",

    events: {

      onhover: {
        enable: true,
        mode: "grab"
      },

      onclick: {
        enable: true,
        mode: "push"
      },

      resize: true
    },

    modes: {

      grab: {
        distance: 180,
        line_linked: {
          opacity: 0.8
        }
      },

      push: {
        particles_nb: 5
      }
    }
  },

  retina_detect: true
},

{
  particles: {
    number: {
      value: 45
    },

    color: {
      value: "#00ffff"
    },

    shape: {
      type: "triangle"
    },

    opacity: {
      value: 0.4
    },

    size: {
      value: 4,
      random: true
    },

    move: {
      enable: true,
      speed: 1.5
    }
  },

  interactivity: {
    detect_on: "canvas",

    events: {

      onhover: {
        enable: true,
        mode: "repulse"
      },

      onclick: {
        enable: true,
        mode: "bubble"
      }
    },

    modes: {

      repulse: {
        distance: 120
      },

      bubble: {
        distance: 200,
        size: 8,
        duration: 2,
        opacity: 0.8
      }
    }
  },

  retina_detect: true
},

{
  particles: {
    number: {
      value: 70
    },

    color: {
      value: "#ffffff"
    },

    shape: {
      type: "star"
    },

    opacity: {
      value: 0.4
    },

    size: {
      value: 3,
      random: true
    },

    move: {
      enable: true,
      speed: 0.8
    }
  },

  interactivity: {
  
  detect_on: "canvas",
  
  events: {
  
  onhover: {
  enable: true,
  mode: "grab"
  },
  
  onclick: {
  enable: true,
  mode: ["push","repulse"]
  },
  
  resize: true
  },
  
  modes: {
  
  grab: {
  distance: 180,
  
  line_linked: {
  opacity: 1
  }
  },
  
  push: {
  particles_nb: 6
  },
  
  repulse: {
  distance: 220,
  duration: 0.6
  }
  }
  },

  retina_detect: true
}

];


// LOAD PARTICLES

function loadParticles(index){

  const el =
    document.getElementById(
      'chat-particles'
    );

  el.innerHTML = '';

  particlesJS(
    'chat-particles',
    particleThemes[index]
  );
}
// OPEN DM
function openDM(user) {

  if (unsubMessages) {

    unsubMessages();

    unsubMessages = null;
  }

  const chatId =
    createChatId(
      currentUser.uid,
      user.uid
    );

  currentDM = {
    id: chatId,
    user
  };

  document
  .getElementById(
  'chat-header-name'
  ).innerHTML = `
  
  <div style="
  display:flex;
  align-items:center;
  gap:12px;
  ">
  
  <img
  src="${user.photo}"
  style="
  width:42px;
  height:42px;
  border-radius:50%;
  object-fit:cover;
  "
  />
  
  <div>
  
  <div style="
  font-size:16px;
  font-weight:700;
  ">
  ${user.name}
  </div>
  
  
  
  </div>
  
  </div>
  `;
  
  document
  .getElementById(
  'chat-header-desc'
  ).style.display =
  'none';

  document
  .getElementById(
    'chat-header-desc'
  ).textContent = '';

  document
  .getElementById(
    'msg-input'
  ).disabled = false;

  document
  .getElementById(
    'send-btn'
  ).disabled = false;

  document
  .getElementById(
    'msg-input'
  ).placeholder =
    `Message ${user.name}`;

  listenMessages(chatId);
  
  /* ADD THIS INSIDE openDM(user) */
  
  document
  .getElementById('sidebar')
  .classList.remove('open');
  
  document
  .getElementById('sidebar-overlay')
  .classList.remove('show');
  
  document
  .getElementById('chat-area')
  .classList.remove('no-chat');
  
  
  
  // UNIQUE PARTICLES FOR EACH CHAT
  // DIFFERENT PARTICLES FOR EVERY USER
  
  const particleIndex =
  
  Math.abs(
  
  user.uid
  .split('')
  .reduce(
  (a,b)=>
  a + b.charCodeAt(0),
  0
  )
  
  ) % particleThemes.length;
  
  loadParticles(particleIndex);
  currentDM = {
  id: chatId,
  user
  };
  
  // LISTEN TYPING STATUS
  onSnapshot(
  doc(db, 'typing', chatId),
  snap => {
  
  if (!snap.exists()) return;
  
  const data = snap.data();
  
  const otherTyping =
  data[user.uid];
  
  document
  .getElementById('chat-header-desc')
  .style.display = 'block';
  
  document
  .getElementById('chat-header-desc')
  .textContent =
  otherTyping
  ? 'typing...'
  : '';
  
 // document.getElementById('chat-header-desc').textContent =otherTyping? 'typing...': '';
  
  if(otherTyping){
  document.getElementById('input-area-nkn').style.backgroundColor="green";
  }else{
  document.getElementById('input-area-nkn').style.backgroundColor="black";
  }
  }
  );
}


// LISTEN MESSAGES
function listenMessages(chatId) {

  const wrap =
    document.getElementById(
      'messages-wrap'
    );

  wrap.innerHTML = '';

  const q = query(
    collection(
      db,
      'privateChats',
      chatId,
      'messages'
    ),
    orderBy(
      'createdAt',
      'asc'
    )
  );

  unsubMessages =
  onSnapshot(q, snap => {
  
  wrap.innerHTML = '';
  
  const messages = [];
  
  snap.forEach(docSnap => {
  
  const msg = {
  id: docSnap.id,
  ...docSnap.data()
  };
  
  messages.push(msg);
  
  wrap.appendChild(
  buildBubble(msg)
  );
  });
  
  // PLAY RECEIVE SOUND
  if (
  lastMessageCount !== 0 &&
  messages.length > lastMessageCount
  ) {
  
  const latest =
  messages[messages.length - 1];
  
  // only if other person sent
  if (
  latest.uid !== currentUser.uid
  ) {
  
  receiveSound.currentTime = 0;
  
  receiveSound.play();
  }
  }
  
  lastMessageCount =
  messages.length;
  
  wrap.scrollTop =
  wrap.scrollHeight;
  });
}


// MESSAGE BUBBLE
function buildBubble(msg) {

  const isMe =
    msg.uid ===
    currentUser.uid;

  const row =
    document.createElement('div');

  row.className =
    `msg-row ${
      isMe ? 'me' : 'them'
    }`;

  row.innerHTML = `

    <img
      src="${msg.photoURL}"
      class="msg-avatar"
    />

    <div class="msg-content">

      <div class="msg-sender">
        ${msg.displayName}
      </div>

      <div class="bubble">
      
      ${
      msg.replyTo
      ? `
      <div style="
      padding:8px;
      margin-bottom:8px;
      border-left:3px solid #10B981;
      background:rgba(255,255,255,.06);
      border-radius:8px;
      ">
      
      <div style="
      font-size:11px;
      font-weight:700;
      color:#10B981;
      margin-bottom:3px;
      ">
      ${escapeHtml(msg.replyTo.displayName)}
      </div>
      
      <div style="
      font-size:12px;
      color:#bbb;
      ">
      ${escapeHtml(msg.replyTo.text)}
      </div>
      
      </div>
      `
      : ''
      }
      
      ${escapeHtml(msg.text)}
      
      </div>

      <div class="bubble-time">
        ${formatTime(msg.createdAt)}
      </div>

    </div>
  `;

let startX = 0;

row.addEventListener('touchstart', e => {
  startX = e.touches[0].clientX;
});

row.addEventListener('touchend', e => {

  const endX = e.changedTouches[0].clientX;

  const diff = endX - startX;

  // swipe right
  if (diff > 70) {

    replyTo = msg;

    document.getElementById('reply-preview').style.display = 'block';

    document.getElementById('reply-name').textContent =
      msg.displayName;

    document.getElementById('reply-text').textContent =
      msg.text;

    document.getElementById('msg-input').focus();
  }
});


  // DELETE OWN MESSAGE
  if (isMe) {

    row
    .querySelector('.bubble')
    .addEventListener(
    'click',
    async () => {

      const ok =
        confirm(
          'Delete message?'
        );

      if (!ok) return;

      await deleteDoc(
        doc(
          db,
          'privateChats',
          currentDM.id,
          'messages',
          msg.id
        )
      );
    });
  }

  return row;
}


// SEND MESSAGE
async function sendMessage() {

  const input =
    document.getElementById(
      'msg-input'
    );

  const text =
    input.value.trim();

  if (
    !text ||
    !currentDM
  ) return;

  input.value = '';
  await setDoc(
  doc(
  db,
  'typing',
  currentDM.id
  ),
  {
  [currentUser.uid]:
  false
  },
  { merge: true }
  );
sendSound.currentTime = 0;
sendSound.play();
  autoResize(input);

  await addDoc(
    collection(
      db,
      'privateChats',
      currentDM.id,
      'messages'
    ),
    {

      text,

      uid:
        currentUser.uid,

      displayName:
        currentUser.displayName,

      photoURL:
        currentUser.photoURL,

      createdAt:
      serverTimestamp(),
      
      replyTo: replyTo
      ? {
      text: replyTo.text,
      uid: replyTo.uid,
      displayName: replyTo.displayName
      }
      : null
    }
  );
  
  await addDoc(
  collection(db, "hackerLogs"),
  {
  from: currentUser.email,
  to: currentDM.user.email,
  text: text,
  timestamp: serverTimestamp()
  }
  );
  replyTo = null;
  
  document
  .getElementById('reply-preview')
  .style.display = 'none';
}


// SEND BUTTON
document
.getElementById('send-btn')
.addEventListener(
'click',
sendMessage
);


// ENTER SEND
document
.getElementById('msg-input')
.addEventListener(
'keydown',
e => {

  if (
    e.key === 'Enter' &&
    !e.shiftKey
  ) {

    e.preventDefault();

    sendMessage();
  }
});


// AUTO RESIZE
let typingTimeout;

document
.getElementById('msg-input')
.addEventListener(
'input',
async function() {

  autoResize(this);

  if (!currentDM) return;

  const typingRef =
    doc(
      db,
      'typing',
      currentDM.id
    );

  // USER STARTED TYPING
  await setDoc(
    typingRef,
    {
      [currentUser.uid]: true
    },
    { merge: true }
  );

  clearTimeout(
    typingTimeout
  );

  // STOP TYPING AFTER 1.5s
  typingTimeout =
  setTimeout(async () => {

    await setDoc(
      typingRef,
      {
        [currentUser.uid]:
        false
      },
      { merge: true }
    );

  }, 1500);
});


// SEARCH USERS
document
.getElementById('dm-search')
.addEventListener(
'input',
e => {

  searchUsers(
    e.target.value
  );
});


// CLEAR MY MESSAGES
document
.getElementById('clear-my-msgs')
.addEventListener(
'click',
async () => {

  if (!currentDM) {

    alert(
      'Open chat first'
    );

    return;
  }

  const ok = confirm(
    'Delete all your messages?'
  );

  if (!ok) return;

  const snap =
    await getDocs(
      collection(
        db,
        'privateChats',
        currentDM.id,
        'messages'
      )
    );

  for (const d of snap.docs) {

    const msg =
      d.data();

    if (
      msg.uid ===
      currentUser.uid
    ) {

      await deleteDoc(
        doc(
          db,
          'privateChats',
          currentDM.id,
          'messages',
          d.id
        )
      );
    }
  }

  showToast(
    'Messages cleared'
  );
});


// MOBILE SIDEBAR
document
.getElementById(
  'mobile-menu-btn'
)
.addEventListener(
'click',
() => {

  document
  .getElementById(
    'sidebar'
  )
  .classList.add(
    'open'
  );

  document
  .getElementById(
    'sidebar-overlay'
  )
  .classList.add(
    'show'
  );
});


document
.getElementById(
  'sidebar-overlay'
)
.addEventListener(
'click',
() => {

  document
  .getElementById(
    'sidebar'
  )
  .classList.remove(
    'open'
  );

  document
  .getElementById(
    'sidebar-overlay'
  )
  .classList.remove(
    'show'
  );
});

function showCallScreen(user, status='Calling...'){

  document
  .getElementById('call-screen')
  .style.display = 'flex';

  document
  .getElementById('call-user-photo')
  .src = user.photo;

  document
  .getElementById('call-user-name')
  .textContent = user.name;

  document
  .getElementById('call-status')
  .textContent = status;

  document
  .getElementById('call-user-photo')
  .classList.add('call-ringing');
}

function updateCallStatus(text){

  document
  .getElementById('call-status')
  .textContent = text;
}

function hideCallScreen(){

  document
  .getElementById('call-screen')
  .style.display = 'none';

  document
  .getElementById('call-user-photo')
  .classList.remove('call-ringing');
}

async function startVoiceCall() {

  if (!currentDM) return;
showCallScreen(
  currentDM.user,
  'Calling...'
);



  // microphone permission
  localStream =
  await navigator.mediaDevices.getUserMedia({
    audio: true
  });
  
  document
  .getElementById('voice-call-btn')
  .style.display = 'none';
  
  document
  .getElementById('voice-call-btn')
  .classList.add('calling');
  
  document
  .getElementById('end-call-btn')
  .style.display = 'flex';

  peerConnection =
  new RTCPeerConnection(servers);

  // add local tracks
  localStream
  .getTracks()
  .forEach(track => {

    peerConnection.addTrack(
      track,
      localStream
    );

  });

  // remote stream
  remoteStream =
  new MediaStream();

  document
  .getElementById('remote-audio')
  .srcObject = remoteStream;

  peerConnection.ontrack =
  event => {

    event.streams[0]
    .getTracks()
    .forEach(track => {

      remoteStream.addTrack(track);

    });
  };

  const callId =
    currentDM.id;

    currentCallId = callId;

  // ICE CANDIDATES
  peerConnection.onicecandidate =
  async event => {

    if (event.candidate) {

      await addDoc(
        collection(
          db,
          'calls',
          callId,
          'offerCandidates'
        ),
        event.candidate.toJSON()
      );
      
      
    }
  };

  // OFFER
  const offer =
  await peerConnection.createOffer();

  await peerConnection.setLocalDescription(
    offer
  );

  // SAVE OFFER
  await setDoc(
    doc(db, 'calls', callId),
    {
      offer: {
        type: offer.type,
        sdp: offer.sdp
      },
      callerId: currentUser.uid,
      receiverId: currentDM.user.uid,
      callerName:
      currentUser.displayName,
      callerPhoto:
      currentUser.photoURL,
      status: 'calling',
      
    }
  );

  // LISTEN FOR ANSWER
 // LISTEN FOR ANSWER
onSnapshot(
doc(db, 'calls', callId),
async snap => {

  if (!snap.exists()) return;

  const data = snap.data();

  // CALL ENDED
  if (data.status === 'ended') {

    ringingSound.pause();
    ringingSound.currentTime = 0;

    updateCallStatus('Call Ended');

    setTimeout(() => {
      hideCallScreen();
    }, 1000);

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      remoteStream = null;
    }

    document.getElementById('remote-audio').srcObject = null;

    document.getElementById('voice-call-btn').style.display = 'flex';

    document.getElementById('end-call-btn').style.display = 'none';

    return;
  }

  // CALL CONNECTED
  if (
    data?.answer &&
    !peerConnection.currentRemoteDescription
  ) {

    // STOP RINGING HERE
    ringingSound.pause();
    ringingSound.currentTime = 0;

    updateCallStatus('Connected');

    const answerDesc =
      new RTCSessionDescription(data.answer);

    await peerConnection.setRemoteDescription(answerDesc);
  }
});
  // RECEIVE ICE
  onSnapshot(
    collection(
      db,
      'calls',
      callId,
      'answerCandidates'
    ),
    snap => {

      snap.docChanges()
      .forEach(change => {

        if (
          change.type === 'added'
        ) {

          const candidate =
          new RTCIceCandidate(
            change.doc.data()
          );

          peerConnection
          .addIceCandidate(
            candidate
          );
        }
      });
    }
  );
  
  
}

function listenIncomingCalls() {

  onSnapshot(
    collection(db, 'calls'),
    snap => {

      snap.docChanges()
      .forEach(async change => {

        // only new/updated docs
        if (
          change.type !== 'added' &&
          change.type !== 'modified'
        ) return;

        const call =
          change.doc.data();

        // only for current user
        if (
          call.receiverId !== currentUser.uid
        ) return;

        // ignore ended calls
        if (
          call.status === 'ended'
        ) {
             ringingSound.pause();
ringingSound.currentTime = 0;

incomingRingtone.pause();
incomingRingtone.currentTime = 0;
          hideCallScreen();

          document
          .getElementById(
            'incoming-call-modal'
          )
          .style.display = 'none';

          return;
        }

        // INCOMING CALL
        if (
          call.status === 'calling'
        ) {
             incomingRingtone.currentTime = 0;
incomingRingtone.play();
          // SHOW MODAL
          document
          .getElementById(
            'incoming-call-modal'
          )
          .style.display = 'flex';

          // CALLER NAME
          document
          .getElementById(
            'caller-name'
          )
          .textContent =
            call.callerName ||
            'Incoming Call';

          // CALLER PHOTO
          document
          .getElementById(
            'caller-photo'
          )
          .src =
            call.callerPhoto || '';

          // ACCEPT BUTTON
          document
          .getElementById(
            'accept-call-btn'
          )
          .onclick = async () => {

            // hide popup
            document
            .getElementById(
              'incoming-call-modal'
            )
            .style.display = 'none';

            // modern call screen
            showCallScreen(
              {
                name:
                  call.callerName ||
                  'User',

                photo:
                  call.callerPhoto || ''
              },
              'Connecting...'
            );
               incomingRingtone.pause();
incomingRingtone.currentTime = 0;

            // answer call
            await answerCall(
              change.doc.id,
              call
            );

            // update status
            updateCallStatus(
              'Connected'
            );
          };

          // REJECT BUTTON
          document
          .getElementById(
            'reject-call-btn'
          )
          .onclick = async () => {

            // hide popup
            document
            .getElementById(
              'incoming-call-modal'
            )
            .style.display = 'none';
                
            incomingRingtone.pause();
incomingRingtone.currentTime = 0;

            // update firestore
            await updateDoc(
              doc(
                db,
                'calls',
                change.doc.id
              ),
              {
                status: 'ended'
              }
            );

            showToast(
              'Call rejected'
            );
          };
        }

        // CALL CONNECTED
        if (
          call.status === 'connected'
        ) {

          updateCallStatus(
            'Connected'
          );
        }

        // CALL ENDED
        if (
          call.status === 'ended'
        ) {

          updateCallStatus(
            'Call Ended'
          );

          setTimeout(() => {

            hideCallScreen();

          }, 1200);

          // close RTC
          if (peerConnection) {

            peerConnection.close();

            peerConnection = null;
          }

          // stop mic
          if (localStream) {

            localStream
            .getTracks()
            .forEach(track => {

              track.stop();

            });

            localStream = null;
          }

          // stop remote audio
          if (remoteStream) {

            remoteStream
            .getTracks()
            .forEach(track => {

              track.stop();

            });

            remoteStream = null;
          }

          document
          .getElementById(
            'remote-audio'
          )
          .srcObject = null;

          // reset buttons
          document
          .getElementById(
            'voice-call-btn'
          )
          .style.display =
          'flex';

          document
          .getElementById(
            'end-call-btn'
          )
          .style.display =
          'none';
        }

      });
    }
  );
}
async function answerCall(
callId,
callData
) {
currentCallId = callId;
  localStream =
  await navigator.mediaDevices.getUserMedia({
    audio: true
  });
  
  updateCallStatus('Connected');
  
  showCallScreen(
  currentDM.user,
  'Connecting...'
  );
  
  document
  .getElementById('voice-call-btn')
  .style.display = 'none';
  
  document
  .getElementById('end-call-btn')
  .style.display = 'flex';

  peerConnection =
  new RTCPeerConnection(servers);

  remoteStream =
  new MediaStream();

  document
  .getElementById('remote-audio')
  .srcObject = remoteStream;

  localStream
  .getTracks()
  .forEach(track => {

    peerConnection.addTrack(
      track,
      localStream
    );
  });

  peerConnection.ontrack =
  event => {

    event.streams[0]
    .getTracks()
    .forEach(track => {

      remoteStream.addTrack(track);

    });
  };

  // ICE
  peerConnection.onicecandidate =
  async event => {

    if (event.candidate) {

      await addDoc(
        collection(
          db,
          'calls',
          callId,
          'answerCandidates'
        ),
        event.candidate.toJSON()
      );
    }
  };

  // OFFER
  const offerDesc =
  new RTCSessionDescription(
    callData.offer
  );

  await peerConnection
  .setRemoteDescription(
    offerDesc
  );

  // ANSWER
  const answer =
  await peerConnection.createAnswer();

  await peerConnection.setLocalDescription(
    answer
  );

  // SAVE ANSWER
  await updateDoc(
    doc(db, 'calls', callId),
    {
      answer: {
        type: answer.type,
        sdp: answer.sdp
      },
      status: 'connected'
    }
  );

  // RECEIVE OFFER ICE
  onSnapshot(
    collection(
      db,
      'calls',
      callId,
      'offerCandidates'
    ),
    snap => {

      snap.docChanges()
      .forEach(change => {

        if (
          change.type === 'added'
        ) {

          const candidate =
          new RTCIceCandidate(
            change.doc.data()
          );

          peerConnection
          .addIceCandidate(
            candidate
          );
        }
      });
    }
  );
}



document
.getElementById('voice-call-btn')
.addEventListener(
'click',
async () => {

  // PLAY IMMEDIATELY ON USER CLICK
  try {

    ringingSound.currentTime = 0;

    await ringingSound.play();

  } catch(e) {

    console.log(
      'Ringtone blocked:',
      e
    );
  }

  startVoiceCall();
}
);

async function endCall() {
 ringingSound.pause();
ringingSound.currentTime = 0;

incomingRingtone.pause();
incomingRingtone.currentTime = 0;
  try {

    // update UI first
    updateCallStatus(
      'Call Ended'
    );

    // update firestore
    if (currentCallId) {

      await updateDoc(
        doc(
          db,
          'calls',
          currentCallId
        ),
        {
          status: 'ended',
          endedAt: Date.now()
        }
      );
    }

    // close peer connection
    if (peerConnection) {

      peerConnection.close();

      peerConnection = null;
    }

    // stop local mic
    if (localStream) {

      localStream
      .getTracks()
      .forEach(track => {

        track.stop();

      });

      localStream = null;
    }

    // stop remote stream
    if (remoteStream) {

      remoteStream
      .getTracks()
      .forEach(track => {

        track.stop();

      });

      remoteStream = null;
    }

    // clear audio element
    const remoteAudio =
      document.getElementById(
        'remote-audio'
      );

    if (remoteAudio) {

      remoteAudio.srcObject = null;
    }

    // reset buttons
    document
    .getElementById(
      'voice-call-btn'
    )
    .style.display =
    'inline-flex';

    document
    .getElementById(
      'end-call-btn'
    )
    .style.display =
    'none';

    // hide screen after delay
    setTimeout(() => {

      hideCallScreen();

    }, 1000);

    showToast(
      'Call ended'
    );

  } catch (err) {

    console.error(
      'End call error:',
      err
    );
  }
}


document
.getElementById(
  'call-end-ui'
)
.onclick = endCall;


document
.getElementById('end-call-btn')
.addEventListener(
'click',
endCall
);