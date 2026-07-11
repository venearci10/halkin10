import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAkcGzGGlUQkuIe6iFR4M5ZpkKs6ioMsN0",
    authDomain: "venearci-10.firebaseapp.com",
    projectId: "venearci-10",
    storageBucket: "venearci-10.firebasestorage.app",
    messagingSenderId: "688161659977",
    appId: "1:688161659977:web:0edf544a3826b01c5e7398",
    measurementId: "G-NQ0CEGKNY9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const player = videojs('venearci-player');

// Eventos de interfaz
document.getElementById('showRegister').onclick = () => {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
};
document.getElementById('showLogin').onclick = () => {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
};

// Acciones de autenticación
document.getElementById('loginBtn').onclick = () => signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value).catch(e => alert(e.message));
document.getElementById('registerBtn').onclick = () => createUserWithEmailAndPassword(auth, document.getElementById('regEmail').value, document.getElementById('regPassword').value).catch(e => alert(e.message));
document.getElementById('googleBtn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
document.getElementById('logoutBtn').onclick = () => signOut(auth);

// Manejo de estado de usuario
onAuthStateChanged(auth, async (user) => {
    const grid = document.getElementById('contentGrid');
    const userDisplay = document.getElementById('userEmailDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const navLogo = document.getElementById('navLogo'); // Referencia al logo del header
    
    if (user) {
        // Usuario logueado: Mostramos todo
        document.getElementById('authOverlay').classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        navLogo.classList.remove('hidden'); // Mostrar logo en header
        
        const username = user.email.split('@')[0];
        userDisplay.innerText = username;
        
        const snap = await getDocs(collection(db, "content"));
        grid.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const card = document.createElement('div');
            card.className = 'video-card';
            card.innerHTML = `<img src="${d.thumbnailUrl}" loading="lazy"><h3>${d.title}</h3>`;
            card.onclick = () => window.playVideo(d.videoUrl);
            grid.appendChild(card);
        });
    } else {
        // Usuario desconectado: Ocultamos todo
        document.getElementById('authOverlay').classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        navLogo.classList.add('hidden'); // Ocultar logo en header
        
        userDisplay.innerText = '';
        grid.innerHTML = ''; 
        document.getElementById('videoContainer').classList.add('hidden');
        if(player) player.pause();
    }
});

// Reproductor
window.playVideo = (url) => {
    document.getElementById('videoContainer').classList.remove('hidden');
    player.src({ src: url, type: 'application/x-mpegURL' });
    player.play().catch(e => console.log("Interacción requerida."));
};

