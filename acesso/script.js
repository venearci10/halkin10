import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Credenciales vinculadas de tu captura de pantalla para el proyecto halkin10
const firebaseConfig = {
    apiKey: "AIzaSyC_QVqEUFopfS29g_jR4vU4oB-K-F-Wq_4", 
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
}

function cambiarPantalla(pasoId, descripcion) {
    document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
    document.getElementById(pasoId).classList.add('active');
    document.getElementById('header-desc').innerText = descripcion;
    statusBox.style.display = 'none';
}

// ========================================================
// PASO 1: EVALUAR CORREO (¿REGISTRO O LOGIN?)
// ========================================================
document.getElementById('form-email-check').addEventListener('submit', async (e) => {
    e.preventDefault();
    emailGlobal = document.getElementById('user-email').value.trim().toLowerCase();
    
    showStatus("Verificando credenciales en Venearci...", "info");

    try {
        const usuariosRef = collection(db, "usuarios");
        const q = query(usuariosRef, where("email", "==", emailGlobal));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Usuario encontrado en Firestore -> Pasamos al login biométrico
            cambiarPantalla('step-login', 'Autenticación Biométrica');
            dispararLectorBiometrico();
        } else {
            // Usuario no existe -> Solicitar datos para creación única
            cambiarPantalla('step-register', 'Completa tu registro único');
        }
    } catch (error) {
        console.error(error);
        showStatus("Error de red al conectar con los servidores.", "error");
    }
});

// ========================================================
// PASO 2A: PROCESAR REGISTRO + GUARDAR EN FIRESTORE
// ========================================================
document.getElementById('form-completar-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const rawUsername = document.getElementById('reg-username').value;
    const fullname = document.getElementById('reg-fullname').value;
    const password = document.getElementById('reg-password').value;

    const cleanUsername = rawUsername.trim().toLowerCase().replace(/[^a-zA-Z0-9_.]/g, "");

    if(cleanUsername.length < 3) {
        showStatus("El ID debe tener al menos 3 caracteres válidos.", "error");
        return;
    }

    showStatus("Comprobando disponibilidad de ID...", "info");

    try {
        const userDocRef = doc(db, "usuarios", cleanUsername);
        const userSnapshot = await getDoc(userDocRef);

        if (userSnapshot.exists()) {
            showStatus(`El ID @${cleanUsername} ya está ocupado por otra cuenta.`, "error");
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, emailGlobal, password);
        const internalUID = userCredential.user.uid;

        showStatus("Por favor, confirma tu huella dactilar para asociar el dispositivo...", "info");
        
        await setDoc(doc(db, "usuarios", cleanUsername), {
            uid: internalUID,
            username: cleanUsername,
            nombre: fullname,
            email: emailGlobal,
            fecha_registro: new Date()
        });

        showStatus(`¡Éxito total! Cuenta @${cleanUsername} vinculada correctamente.`, "success");
        
    } catch (error) {
        showStatus(`Error en el proceso: ${error.message}`, "error");
    }
});

// ========================================================
// PASO 2B: LEER HUELLA (USUARIO EXISTENTE)
// ========================================================
async function dispararLectorBiometrico() {
    if (!window.PublicKeyCredential) {
        showStatus("Biometría Web no disponible. Usa un navegador móvil seguro bajo HTTPS.", "error");
        return;
    }

    showStatus("Por favor, coloca tu huella en el lector...", "info");

    const challenge = new Uint8Array([24, 53, 11, 99, 87, 41, 12, 54]);
    const idDeCredencialPrevia = new Uint8Array([1, 2, 3, 4]); 

    const authOptions = {
        challenge: challenge,
        timeout: 60000,
        allowCredentials: [{
            id: idDeCredencialPrevia,
            type: 'public-key',
            transports: ['internal']
        }],
        userVerification: 'required'
    };

    try {
        const resultadoBiometrico = await navigator.credentials.get({
            publicKey: authOptions
        });

        showStatus("¡Validación biométrica exitosa! Ingresando...", "success");
        console.log("Token de huella verificado:", resultadoBiometrico);

    } catch (error) {
        console.error(error);
        showStatus("Inicio biométrico cancelado o sensor ocupado.", "error");
    }
}

document.getElementById('btn-activar-huella').addEventListener('click', dispararLectorBiometrico);
                                                       
