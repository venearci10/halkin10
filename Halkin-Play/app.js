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

// Variables globales del reproductor, telemetría y temporizadores
let player = null;
let qualityLevels = null;
let statsInterval = null;
let localStream = null;
let adTimerInterval = null; // Temporizador para comercial periódico
let currentMainSource = null; // Guarda el canal actual
let currentMainOptions = {};
let savedVideoTime = 0; // Guarda el segundo exacto donde se pausó el canal

// =========================================================================
// 📢 [CONFIGURACIÓN DE URLS - COMERCIAL Y LOGO EN BARRA]
// =========================================================================
const DEFAULT_AD_URL = "https://raw.githubusercontent.com/angel10arcila/videos/refs/heads/main/venearci-intro-video3.mp4";
const DEFAULT_LOGO_URL = "https://raw.githubusercontent.com/venearci10/halkin10/refs/heads/main/Halkin1.png";

// ==========================================
// 🔑 EVENTOS Y AUTENTICACIÓN
// ==========================================

const showRegister = document.getElementById('showRegister');
if (showRegister) {
    showRegister.onclick = () => {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    };
}

const showLogin = document.getElementById('showLogin');
if (showLogin) {
    showLogin.onclick = () => {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    };
}

const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.onclick = () => signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value).catch(e => alert(e.message));
}

const registerBtn = document.getElementById('registerBtn');
if (registerBtn) {
    registerBtn.onclick = () => createUserWithEmailAndPassword(auth, document.getElementById('regEmail').value, document.getElementById('regPassword').value).catch(e => alert(e.message));
}

const googleBtn = document.getElementById('googleBtn');
if (googleBtn) {
    googleBtn.onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = () => signOut(auth);
}

onAuthStateChanged(auth, async (user) => {
    const grid = document.getElementById('contentGrid');
    const userDisplay = document.getElementById('userEmailDisplay');
    const logoutBtnEl = document.getElementById('logoutBtn');
    const navLogo = document.getElementById('navLogo');
    
    if (user) {
        document.getElementById('authOverlay').classList.add('hidden');
        if (logoutBtnEl) logoutBtnEl.classList.remove('hidden');
        if (navLogo) navLogo.classList.remove('hidden');
        
        const username = user.email.split('@')[0];
        if (userDisplay) userDisplay.innerText = username;
        
        if (grid) {
            const snap = await getDocs(collection(db, "content"));
            grid.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                const card = document.createElement('div');
                card.className = 'video-card';
                card.innerHTML = `<img src="${d.thumbnailUrl}" loading="lazy"><h3>${d.title}</h3>`;
                
                // Comercial al iniciar el canal por primera vez
                card.onclick = () => {
                    const mainSource = d.sources || d.videoUrl;
                    const options = { type: d.mimeType };
                    
                    savedVideoTime = 0; // Reiniciar posición al cambiar de canal
                    
                    window.playCommercial(DEFAULT_AD_URL, () => {
                        window.playVideo(mainSource, options);
                    });
                };

                grid.appendChild(card);
            });
        }
    } else {
        document.getElementById('authOverlay').classList.add('hidden');
        if (logoutBtnEl) logoutBtnEl.classList.add('hidden');
        if (navLogo) navLogo.classList.add('hidden');
        
        if (userDisplay) userDisplay.innerText = '';
        if (grid) grid.innerHTML = ''; 
        document.getElementById('videoContainer').classList.add('hidden');
        if (player) player.pause();
        if (adTimerInterval) clearInterval(adTimerInterval);
    }
});

// ==========================================
// ⚙️ INICIALIZACIÓN DEL REPRODUCTOR
// ==========================================

function getOrCreatePlayer() {
    if (!player && typeof videojs !== 'undefined') {
        const videoElement = document.getElementById('venearci-player');
        if (videoElement) {
            player = videojs('venearci-player', {
                controls: true,
                autoplay: false,
                preload: 'auto',
                html5: {
                    vhs: {
                        overrideNative: true,
                        enableLowInitialPlaylist: true,
                        smoothQualityChange: true,
                        bandwidth: 800000, 
                        GOAL_BUFFER_LENGTH: 30,
                        MAX_GOAL_BUFFER_LENGTH: 60,
                        allowSeamLessWithCustomTransformers: true
                    }
                },
                controlBar: {
                    children: [
                        'playToggle',
                        'volumePanel',
                        'liveDisplay',
                        'currentTimeDisplay',
                        'timeDivider',
                        'durationDisplay',
                        'progressControl',
                        'audioTrackButton',
                        'subsCapsButton',
                        'pictureInPictureToggle',
                        'fullscreenToggle'
                    ]
                }
            });

            // 🏷️ COMPONENTE: LOGO EN LA BARRA ANTES DEL BOTÓN PLAY
            const Component = videojs.getComponent('Component');
            const BrandLogoComponent = videojs.extend(Component, {
                constructor: function(player, options) {
                    Component.apply(this, arguments);
                },
                createEl: function() {
                    const container = videojs.dom.createEl('div', {
                        className: 'vjs-control vjs-brand-logo-control'
                    });
                    container.style.cssText = 'display: flex; align-items: center; justify-content: center; padding: 0 6px; margin-right: 4px;';

                    const img = videojs.dom.createEl('img', {
                        src: DEFAULT_LOGO_URL,
                        alt: 'Logo'
                    });
                    img.style.cssText = 'max-height: 26px; width: auto; object-fit: contain; pointer-events: none;';

                    container.appendChild(img);
                    return container;
                }
            });

            videojs.registerComponent('BrandLogoComponent', BrandLogoComponent);
            // Se inserta en el índice 0 para quedar a la izquierda, antes del botón de Play
            player.getChild('controlBar').addChild('BrandLogoComponent', {}, 0);

            // Botón de Velocidad ("1x")
            const Button = videojs.getComponent('Button');
            const SpeedBtn = videojs.extend(Button, {
                constructor: function() {
                    Button.apply(this, arguments);
                    this.addClass('vjs-speed-button');
                    this.el().innerText = '1x';
                },
                handleClick: function() {
                    const rates = [0.5, 1, 1.25, 1.5, 2];
                    let currentRate = player.playbackRate();
                    let nextRate = rates[(rates.indexOf(currentRate) + 1) % rates.length];
                    player.playbackRate(nextRate);
                    this.el().innerText = `${nextRate}x`;
                }
            });
            videojs.registerComponent('SpeedBtn', SpeedBtn);
            player.getChild('controlBar').addChild('SpeedBtn', {}, 8);

            // Menú Desplegable Integrado de Ajustes
            const MenuButton = videojs.getComponent('MenuButton');
            const MenuItem = videojs.getComponent('MenuItem');

            const SettingsMenuButton = videojs.extend(MenuButton, {
                constructor: function() {
                    MenuButton.apply(this, arguments);
                    this.addClass('vjs-yt-settings-menu');
                    this.controlText('Ajustes');
                },
                createItems: function() {
                    const items = [];

                    items.push(new MenuItem(player, {
                        label: '📊 Telemetría / Stats',
                        selectable: false
                    }));
                    items[0].handleClick = function() {
                        const panel = document.querySelector('.player-info-panel');
                        if (panel) {
                            panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
                        }
                    };

                    items.push(new MenuItem(player, {
                        label: '🔒 Bloquear Pantalla',
                        selectable: false
                    }));
                    items[1].handleClick = function() {
                        const container = document.getElementById('videoContainer');
                        if (!document.getElementById('screenLockOverlay')) {
                            const lockOverlay = document.createElement('div');
                            lockOverlay.className = 'screen-locked-overlay';
                            lockOverlay.id = 'screenLockOverlay';
                            lockOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:99;display:flex;justify-content:center;align-items:center;background:rgba(0,0,0,0.5);';
                            lockOverlay.innerHTML = `<button onclick="document.getElementById('screenLockOverlay').remove()" style="background:#00a8e1;color:#fff;border:none;padding:12px 24px;border-radius:20px;font-weight:bold;cursor:pointer;">🔒 Pantalla Bloqueada (Toca para Desbloquear)</button>`;
                            container.appendChild(lockOverlay);
                        }
                    };

                    return items;
                }
            });

            videojs.registerComponent('SettingsMenuButton', SettingsMenuButton);
            player.getChild('controlBar').addChild('SettingsMenuButton', {}, 9);

            player.ready(function() {
                const self = this;

                self.on('loadedmetadata', function() {
                    if (typeof self.hlsQualitySelector === 'function') {
                        try {
                            self.hlsQualitySelector({ displayCurrentQuality: true });
                        } catch (e) {
                            console.log("HLS Selector preparado");
                        }
                    }
                });

                startTelemetryMonitor();
            });
        }
    }
    return player;
}

// ==========================================
// 📺 REPRODUCCIÓN Y COMERCIALES
// ==========================================

// 🛡️ SOLUCIÓN PARA BLOQUEOS DE CORS Y HTTPS EN GITHUB PAGES
function formatStreamUrl(rawUrl) {
    if (!rawUrl) return '';

    // Evitar duplicación si la URL ya contiene el proxy
    if (rawUrl.includes('corsproxy.io')) {
        return rawUrl;
    }

    // Usar proxy si es transmisión HTTP insegura o si la app corre en GitHub Pages
    if (rawUrl.startsWith('http://') || window.location.hostname.includes('github.io')) {
        return `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`;
    }

    return rawUrl;
}

// Lógica de comercial
window.playCommercial = function(adUrl, onAdEndedCallback) {
    const activePlayer = getOrCreatePlayer();
    if (!activePlayer) return;

    document.getElementById('videoContainer').classList.remove('hidden');

    console.log("🎬 Reproduciendo comercial...");

    const finalAdUrl = formatStreamUrl(adUrl || DEFAULT_AD_URL);

    activePlayer.src({
        src: finalAdUrl,
        type: inferMimeType(finalAdUrl)
    });

    activePlayer.play().catch(e => {
        console.log("Interacción requerida para el comercial, reanudando canal...");
        if (onAdEndedCallback) onAdEndedCallback();
    });

    // Al terminar el comercial se reanuda la señal exactamente donde se pausó
    activePlayer.one('ended', function() {
        console.log("✅ Comercial finalizado. Reanudando canal en el punto exacto...");
        if (typeof onAdEndedCallback === 'function') {
            onAdEndedCallback();
        }
    });
};

// Temporizador para pausa y comercial cada 3 minutos
function startPeriodicAds() {
    if (adTimerInterval) clearInterval(adTimerInterval);

    // 3 minutos = 180,000 ms
    adTimerInterval = setInterval(() => {
        if (player && !player.paused() && currentMainSource) {
            
            // 1. Guardar la posición exacta donde se pausó el canal
            savedVideoTime = player.currentTime();
            console.log(`⏰ 60 minutos cumplidos. Guardando tiempo de pausa: ${savedVideoTime}s`);

            // 2. Pausar la señal del canal
            player.pause();

            // 3. Reproducir comercial y volver exactamente al segundo guardado
            window.playCommercial(DEFAULT_AD_URL, () => {
                window.playVideo(currentMainSource, currentMainOptions, false);
            });
        }
    }, 180000); 
}

window.playVideo = (sources, options = {}, resetTimer = true) => {
    const activePlayer = getOrCreatePlayer();
    if (!activePlayer) return;

    currentMainSource = sources;
    currentMainOptions = options;

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    document.getElementById('videoContainer').classList.remove('hidden');

    if (Array.isArray(sources)) {
        const formattedSources = sources.map(s => {
            if (typeof s === 'string') {
                return { src: formatStreamUrl(s), type: inferMimeType(s) };
            }
            return { ...s, src: formatStreamUrl(s.src) };
        });
        activePlayer.src(formattedSources);
    } else {
        let finalUrl = formatStreamUrl(sources);
        let detectedType = options.type || inferMimeType(sources);
        activePlayer.src({ 
            src: finalUrl, 
            type: detectedType 
        });
    }

    // Al cargar los metadatos del canal, restaurar el tiempo guardado si aplica
    activePlayer.one('loadedmetadata', function() {
        if (savedVideoTime > 0) {
            console.log(`Restaurando emisión al segundo: ${savedVideoTime}`);
            activePlayer.currentTime(savedVideoTime);
            savedVideoTime = 0; // Limpiar para el próximo ciclo
        }
    });

    activePlayer.play().then(() => {
        if (resetTimer) {
            startPeriodicAds();
        }
    }).catch(e => console.log("Interacción de reproducción requerida."));
};

function inferMimeType(url) {
    if (!url) return 'video/mp4';
    if (url.includes('.m3u8')) return 'application/x-mpegURL';
    if (url.includes('.mpd')) return 'application/dash+xml';
    if (url.includes('.mp3')) return 'audio/mp3';
    if (url.includes('.aac')) return 'audio/aac';
    if (url.includes('.webm')) return 'video/webm';
    return 'video/mp4';
}

// ==========================================
// 📊 TELEMETRÍA Y MONITOR
// ==========================================

function startTelemetryMonitor() {
    if (statsInterval) clearInterval(statsInterval);

    statsInterval = setInterval(() => {
        if (!player || player.paused()) return;

        updateStatUI('statEngine', 'Video.js + VHS');

        const width = player.videoWidth();
        const height = player.videoHeight();
        updateStatUI('statResolution', (width && height) ? `${width}x${height}p` : 'Auto');

        let currentBitrate = 'Adaptativo';
        let bandwidth = 'Baja latencia';
        let segmentLen = 'Varía';

        if (player.tech_ && player.tech_.vhs) {
            const vhs = player.tech_.vhs;
            if (vhs.bandwidth) bandwidth = `${(vhs.bandwidth / 1000000).toFixed(2)} Mbps`;
            if (vhs.stats && vhs.stats.mediaBytesTransferred) {
                currentBitrate = `${((vhs.stats.mediaBytesTransferred * 8) / 1024 / 10).toFixed(0)} kbps`;
            }
            if (vhs.targetDuration) segmentLen = `${vhs.targetDuration}s`;
        }
        updateStatUI('statBitrate', currentBitrate);
        updateStatUI('statBandwidth', bandwidth);
        updateStatUI('statSegment', segmentLen);

        const buffered = player.buffered();
        const currentTime = player.currentTime();
        let bufferHealth = 0;

        if (buffered && buffered.length) {
            for (let i = 0; i < buffered.length; i++) {
                if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
                    bufferHealth = (buffered.end(i) - currentTime).toFixed(1);
                    break;
                }
            }
        }
        updateStatUI('statBuffer', `${bufferHealth} s`);

        let droppedFrames = 0;
        if (player.getVideoPlaybackQuality) {
            droppedFrames = player.getVideoPlaybackQuality().droppedVideoFrames || 0;
        }
        updateStatUI('statDropped', `${droppedFrames}`);

    }, 1000);
}

function updateStatUI(elementId, textValue) {
    const el = document.getElementById(elementId);
    if (el) el.innerText = textValue;
}
