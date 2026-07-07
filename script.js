import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Credenciales de tu proyecto Halkin 10
const firebaseConfig = {
    apiKey: "AIzaSyC_QVqEUFopf4AtMe4Ov9WvG4hCdX4DKNo", 
    authDomain: "halkin10-3868a.firebaseapp.com",
    projectId: "halkin10-3868a",
    storageBucket: "halkin10-3868a.appspot.com",
    messagingSenderId: "816052134460",
    appId: "1:816052134460:web:4ba34a9b80899187b7d939",
    measurementId: "G-70J2YVMJWW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const statusBox = document.getElementById('status-message');
let emailGlobal = ""; 

function showStatus(text, type) {
    statusBox.innerText = text;
    statusBox.className = `status-box ${type}`;
    statusBox.style.display = 'block';
}

function cambiarPantalla(pasoId, descripcion) {
    document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
    document.getElementById(pasoId).classList.add('active');
    document.getElementById('header-desc').innerText = descripcion;
    statusBox.style.display = 'none';
}

// 1. EVALUAR CORREO (Determina si es usuario nuevo o viejo)
document.getElementById('form-email-check').addEventListener('submit', async (e) => {
    e.preventDefault();
    emailGlobal = document.getElementById('user-email').value.trim().toLowerCase();
    showStatus("Verificando credenciales...", "info");

    try {
        const usuariosRef = collection(db, "usuarios");
        const q = query(usuariosRef, where("email", "==", emailGlobal));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // El usuario existe en Firestore
            cambiarPantalla('step-login', 'Autenticación de Acceso');
            dispararLectorBiometrico();
        } else {
            // No existe en Firestore (Ojo: podría existir en Auth si hubo una desincronización previa)
            cambiarPantalla('step-register', 'Completa tu registro único');
        }
    } catch (error) {
        showStatus("Error de conexión con servidores.", "error");
    }
});

// 2. PROCESO DE REGISTRO NUEVO
document.getElementById('form-completar-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawUsername = document.getElementById('reg-username').value;
    const fullname = document.getElementById('reg-fullname').value;
    const password = document.getElementById('reg-password').value;
    const cleanUsername = rawUsername.trim().toLowerCase().replace(/[^a-zA-Z0-9_.]/g, "");

    showStatus("Procesando registro...", "info");

    try {
        // Verificar disponibilidad del Username en Firestore
        const userDocRef = doc(db, "usuarios", cleanUsername);
        const userSnapshot = await getDoc(userDocRef);

        if (userSnapshot.exists()) {
            showStatus("Este ID ya está ocupado.", "error");
            return;
        }

        // Crear usuario en Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, emailGlobal, password);
        
        // Guardar datos en Firestore usando el cleanUsername como ID del documento
        await setDoc(doc(db, "usuarios", cleanUsername), {
            uid: userCredential.user.uid,
            username: cleanUsername,
            nombre: fullname,
            email: emailGlobal,
            fecha_registro: new Date()
        });

        showStatus("¡Éxito! Redirigiendo a tu cuenta...", "success");
        setTimeout(() => { window.location.href = "https://task-done-951759405463.us-east1.run.app/"; }, 1500);
        
    } catch (error) {
        // CONTROL CLAVE: Si a pesar de pasar el paso 1, el correo ya existía en la Auth de Firebase
        if (error.code === 'auth/email-already-in-use') {
            showStatus("Este correo ya está registrado. Redirigiéndote al inicio de sesión...", "error");
            setTimeout(() => {
                cambiarPantalla('step-login', 'Autenticación de Acceso');
                dispararLectorBiometrico();
            }, 2000);
        } else if (error.code === 'auth/weak-password') {
            showStatus("La contraseña debe tener al menos 6 caracteres.", "error");
        } else {
            showStatus("Error en el registro: " + error.message, "error");
        }
    }
});

// 3. LECTOR BIOMÉTRICO (VÍA RÁPIDA)
async function dispararLectorBiometrico() {
    showStatus("Activando sensor de huella...", "info");
    
    const authOptions = {
        challenge: new Uint8Array([24, 53, 11, 99, 87, 41, 12, 54]),
        timeout: 60000,
        userVerification: 'required'
    };

    try {
        await navigator.credentials.get({ publicKey: authOptions });
        showStatus("¡Validación exitosa! Entrando...", "success");
        setTimeout(() => { window.location.href = "https://task-done-951759405463.us-east1.run.app/"; }, 1000);
    } catch (error) {
        showStatus("Validación biométrica no completada. Puedes usar tu contraseña abajo.", "error");
    }
}

document.getElementById('btn-activar-huella').addEventListener('click', dispararLectorBiometrico);

// 4. ALTERNAR ENLACE DE CONTRASEÑA MÁGICA
document.getElementById('link-usar-password').addEventListener('click', (e) => {
    e.preventDefault();
    const formFallback = document.getElementById('form-password-fallback');
    formFallback.style.display = formFallback.style.display === 'none' ? 'block' : 'none';
});

// 5. LOGIN CLÁSICO CON CONTRASEÑA (RESPALDO SI FALLA LA HUELLA)
document.getElementById('form-password-fallback').addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwordInput = document.getElementById('login-password').value;
    showStatus("Verificando contraseña de respaldo...", "info");

    try {
        await signInWithEmailAndPassword(auth, emailGlobal, passwordInput);
        showStatus("¡Identidad confirmada! Ingresando...", "success");
        setTimeout(() => { window.location.href = "https://task-done-951759405463.us-east1.run.app/"; }, 1200);
    } catch (error) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            showStatus("Contraseña incorrecta. Revisa tus datos.", "error");
        } else {
            showStatus("Error al iniciar sesión: " + error.message, "error");
        }
    }
});
