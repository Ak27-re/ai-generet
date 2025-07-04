import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, onSnapshot, orderBy } from 'firebase/firestore'; // Menambahkan orderBy untuk penggunaan di masa mendatang

// Komponen Aplikasi Utama
const App = () => {
    // --- State Aplikasi Inti ---
    // Teks input utama, digunakan untuk Subjek dalam mode AI/Acak, atau prompt lengkap dalam mode Manual
    const [inputText, setInputText] = useState('');
    // Menyimpan prompt akhir yang dihasilkan untuk ditampilkan kepada pengguna
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    // Indikator loading untuk panggilan API
    const [isLoading, setIsLoading] = useState(false);
    // Menyimpan pesan kesalahan
    const [error, setError] = useState('');
    // Pesan konfirmasi salin ke clipboard
    const [copyMessage, setCopyMessage] = useState('');

    // --- State Navigasi Tab ---
    // Mengontrol tab utama mana yang aktif: 'image', 'single_video', 'director_video', 'text', 'gallery'
    const [activePromptType, setActivePromptType] = useState('image'); // Default ke 'image'

    // --- State Mode Pembuatan Prompt ---
    // Mengontrol bagaimana prompt dihasilkan: 'ai', 'manual', 'random'
    const [creationMode, setCreationMode] = useState('ai'); // Default ke 'ai'

    // --- State Bidang Prompt Khusus Gambar ---
    const [imageStyle, setImageStyle] = useState('');
    const [imageCategory, setImageCategory] = useState('');
    const [cameraAngle, setCameraAngle] = useState('');
    const [timeLighting, setTimeLighting] = useState('');
    const [action, setAction] = useState('');
    const [background, setBackground] = useState('');
    const [mainMood, setMainMood] = useState(''); // Suasana/Emosi Utama
    const [materialsTextures, setMaterialsTextures] = useState(''); // Bahan/Tekstur
    const [expressionEmotion, setExpressionEmotion] = useState(''); // Ekspresi/Emosi
    const [ageEra, setAgeEra] = useState(''); // Usia/Era
    const [aspectRatio, setAspectRatio] = useState(''); // Rasio Aspek
    const [resolution, setResolution] = useState(''); // Resolusi
    const [additionalDetails, setAdditionalDetails] = useState(''); // Ide Tambahan / Detail Subjek
    const [negativePrompt, setNegativePrompt] = useState(''); // Prompt Negatif

    // --- State Bidang Prompt Khusus Video (untuk tab Video Tunggal) ---
    const [videoSubject, setVideoSubject] = useState('');
    const [mainCharacter, setMainCharacter] = useState('');
    const [supportingCharacters, setSupportingCharacters] = useState('');
    const [numCharactersForDialog, setNumCharactersForDialog] = useState(0); // Untuk bidang dialog dinamis
    const [dialogTexts, setDialogTexts] = useState({}); // Menyimpan dialog untuk setiap karakter { 'character1': 'text', ... }
    const [videoAction, setVideoAction] = useState('');
    const [videoSetting, setVideoSetting] = useState('');
    const [videoMood, setVideoMood] = useState('');
    const [videoDuration, setVideoDuration] = useState('');
    const [cameraMovement, setCameraMovement] = useState('');
    const [videoStyle, setVideoStyle] = useState('');
    const [dialogLanguage, setDialogLanguage] = useState('');
    const [backsound, setBacksound] = useState('');
    const [soundEffects, setSoundEffects] = useState('');
    const [additionalVideoDetails, setAdditionalVideoDetails] = useState('');
    const [negativeVideoPrompt, setNegativeVideoPrompt] = useState('');

    // --- State Autentikasi Firebase ---
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null); // Menyimpan objek Pengguna Firebase
    const [userId, setUserId] = useState(null); // String ID Pengguna
    const [isAuthReady, setIsAuthReady] = useState(false); // Menunjukkan apakah Autentikasi Firebase sudah siap

    // --- State Modal Login ---
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true); // true untuk login, false untuk daftar
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    // --- Data Opsi Dropdown ---
    const imageStyles = [
        { value: '', label: 'Pilih Gaya' }, { value: 'Realistis', label: 'Realistis' }, { value: 'Fotografi', label: 'Fotografi' },
        { value: 'Seni Digital', label: 'Seni Digital' }, { value: 'Ilustrasi', label: 'Ilustrasi' }, { value: 'Anime/Manga', label: 'Anime/Manga' },
        { value: 'Kartun', label: 'Kartun' }, { value: 'Lukisan Minyak', label: 'Lukisan Minyak' }, { value: 'Cat Air', label: 'Cat Air' },
        { value: 'Pixel Art', label: 'Pixel Art' }, { value: 'Cyberpunk', label: 'Cyberpunk' }, { value: 'Fantasi', label: 'Fantasi' },
        { value: 'Sci-Fi', label: 'Sci-Fi' }, { value: 'Minimalis', label: 'Minimalis' }, { value: 'Vintage', label: 'Vintage' },
        { value: 'Abstract', label: 'Abstrak' }, { value: 'Pop Art', label: 'Pop Art' }, { value: 'Impressionism', label: 'Impresionisme' },
        { value: 'Expressionism', label: 'Ekspresionisme' }, { value: 'Surrealism', label: 'Surealisme' }, { value: 'Gothic', label: 'Gotik' },
        { value: 'Steampunk', label: 'Steampunk' }, { value: 'Low Poly', label: 'Low Poly' }, { value: 'Vaporwave', label: 'Vaporwave' },
    ];

    const imageCategories = [
        { value: '', label: 'Pilih Kategori' }, { value: 'Pemandangan', label: 'Pemandangan' }, { value: 'Potret', label: 'Potret' },
        { value: 'Hewan', label: 'Hewan' }, { value: 'Arsitektur', label: 'Arsitektur' }, { value: 'Abstrak', label: 'Abstrak' },
        { value: 'Konsep', label: 'Konsep' }, { value: 'Kendaraan', label: 'Kendaraan' }, { value: 'Makanan', label: 'Makanan' },
        { value: 'Mode', label: 'Mode' }, { value: 'Teknologi', label: 'Teknologi' }, { value: 'Ruang Angkasa', label: 'Ruang Angkasa' },
        { value: 'Bawah Air', label: 'Bawah Air' }, { value: 'Kota', label: 'Kota' }, { value: 'Pedalaman', label: 'Pedalaman' },
    ];

    const cameraAngles = [
        { value: '', label: 'Pilih Sudut' },
        { value: 'Tampilan Mata Burung (Bird\'s Eye View)', label: 'Tampilan Mata Burung' },
        { value: 'Tampilan Mata Cacing (Worm\'s Eye View)', label: 'Tampilan Mata Cacing' },
        { value: 'Sudut Rendah (Low Angle)', label: 'Sudut Rendah' },
        { value: 'Sudut Tinggi (High Angle)', label: 'Sudut Tinggi' },
        { value: 'Tingkat Mata (Eye-Level)', label: 'Tingkat Mata' },
        { value: 'Close-up', label: 'Close-up' },
        { value: 'Long Shot', label: 'Long Shot' },
        { value: 'Medium Shot', label: 'Medium Shot' },
        { value: 'Over-the-shoulder', label: 'Over-the-shoulder' },
        { value: 'Dutch Angle', label: 'Dutch Angle' },
        { value: 'Wide Angle', label: 'Wide Angle' },
        { value: 'Macro', label: 'Makro' },
    ];

    const timeLightingOptions = [
        { value: '', label: 'Pilih Waktu/Pencahayaan' },
        { value: 'Pagi Hari', label: 'Pagi Hari' }, { value: 'Siang Hari', label: 'Siang Hari' }, { value: 'Senja', label: 'Senja' },
        { value: 'Malam Hari', label: 'Malam Hari' }, { value: 'Cahaya Neon', label: 'Cahaya Neon' }, { value: 'Mendung', label: 'Mendung' },
        { value: 'Terang Benderang', label: 'Terang Benderang' }, { value: 'Remang-remang', label: 'Remang-remang' }, { value: 'Cahaya Obor', label: 'Cahaya Obor' },
        { value: 'Cahaya Bulan', label: 'Cahaya Bulan' }, { value: 'Badai Petir', label: 'Badai Petir' }, { value: 'Cahaya Matahari Terbit', label: 'Cahaya Matahari Terbit' },
        { value: 'Cahaya Matahari Terbenam', label: 'Cahaya Matahari Terbenam' }, { value: 'Cahaya Lampu Kota', label: 'Cahaya Lampu Kota' },
    ];

    const videoCameraMovements = [
        { value: '', label: 'Pilih Pergerakan Kamera' },
        { value: 'Pan (Geser Horizontal)', label: 'Pan (Geser Horizontal)' },
        { value: 'Tilt (Miring Vertikal)', label: 'Tilt (Miring Vertikal)' },
        { value: 'Zoom In/Out', label: 'Zoom In/Out' },
        { value: 'Dolly In/Out (Maju/Mundur)', label: 'Dolly In/Out (Maju/Mundur)' },
        { value: 'Orbit (Mengelilingi Objek)', label: 'Orbit (Mengelilingi Objek)' },
        { value: 'Static (Diam)', label: 'Static (Diam)' },
        { value: 'Handheld (Genggam)', label: 'Handheld (Genggam)' },
        { value: 'Crane Shot', label: 'Crane Shot' },
        { value: 'Tracking Shot', label: 'Tracking Shot' },
    ];

    const videoStyles = [
        { value: '', label: 'Pilih Gaya Video' },
        { value: 'Cinematic', label: 'Sinematik' }, { value: 'Documentary', label: 'Dokumenter' }, { value: 'Vlog Style', label: 'Gaya Vlog' },
        { value: 'Animation', label: 'Animasi' }, { value: 'Stop Motion', label: 'Stop Motion' }, { value: 'Time-lapse', label: 'Time-lapse' },
        { value: 'Hyperlapse', label: 'Hyperlapse' }, { value: 'Slow Motion', label: 'Slow Motion' }, { value: 'Action Cam', label: 'Kamera Aksi' },
        { value: 'Drone Footage', label: 'Rekaman Drone' }, { value: 'Surveillance Footage', label: 'Rekaman Pengawasan' }, { value: 'Found Footage', label: 'Found Footage' },
        { value: 'Music Video', label: 'Video Musik' }, { value: 'Commercial', label: 'Iklan' }, { value: 'Explainer Video', label: 'Video Penjelas' },
        { value: 'Tutorial', label: 'Tutorial' },
    ];

    const dialogLanguages = [
        { value: '', label: 'Pilih Bahasa Dialog' },
        { value: 'Bahasa Indonesia', label: 'Bahasa Indonesia' },
        { value: 'Bahasa Inggris', label: 'Bahasa Inggris' },
        { value: 'Bahasa Jepang', label: 'Bahasa Jepang' },
        { value: 'Bahasa Korea', label: 'Bahasa Korea' },
        { value: 'Bahasa Mandarin', label: 'Bahasa Mandarin' },
        { value: 'Bahasa Spanyol', label: 'Bahasa Spanyol' },
        { value: 'Bahasa Prancis', label: 'Bahasa Prancis' },
        { value: 'Bahasa Jerman', label: 'Bahasa Jerman' },
        { value: 'Bahasa Jawa', label: 'Bahasa Jawa' }, // Menambahkan bahasa lokal
        { value: 'Bahasa Sunda', label: 'Bahasa Sunda' }, // Menambahkan bahasa lokal
        { value: 'Bahasa Batak', label: 'Bahasa Batak' }, // Menambahkan bahasa lokal
        { value: 'Bahasa Minang', label: 'Bahasa Minang' }, // Menambahkan bahasa lokal
        { value: 'Bahasa Bugis', label: 'Bahasa Bugis' }, // Menambahkan bahasa lokal
    ];


    // Fungsi bantuan untuk mendapatkan item acak dari array (tidak termasuk opsi 'Pilih X' pertama)
    const getRandomItem = useCallback((arr) => {
        // Memastikan usableArr tidak kosong sebelum mencoba mengakses elemennya.
        // Juga, memastikan item pertama (placeholder) dilewati.
        const usableArr = arr.slice(1);
        if (!usableArr || usableArr.length === 0) {
            return ''; // Mengembalikan string kosong jika tidak ada item yang dapat digunakan
        }
        return usableArr[Math.floor(Math.random() * usableArr.length)].value;
    }, []);

    /**
     * Mengisi bidang-bidang khusus gambar dengan nilai acak.
     */
    const generateRandomImageFields = useCallback(() => {
        setImageStyle(getRandomItem(imageStyles));
        setImageCategory(getRandomItem(imageCategories));
        setCameraAngle(getRandomItem(cameraAngles));
        setTimeLighting(getRandomItem(timeLightingOptions));

        setInputText(getRandomItem([
            { value: 'robot cyberpunk di kota hujan', label: '' },
            { value: 'naga kuno di gunung berapi', label: '' },
            { value: 'kucing astronot di luar angkasa', label: '' },
            { value: 'pahlawan super di gedung pencakar langit', label: '' },
            { value: 'penyihir di hutan ajaib', label: '' }
        ]));
        setAction(getRandomItem([
            { value: 'terbang di atas kota', label: '' },
            { value: 'bertempur dengan pedang laser', label: '' },
            { value: 'bermeditasi di kuil kuno', label: '' },
            { value: 'menjelajahi reruntuhan', label: '' },
            { value: 'bersembunyi di bayangan', label: '' }
        ]));
        setBackground(getRandomItem([
            { value: 'kota neon yang ramai dengan gedung-gedung tinggi', label: '' },
            { value: 'reruntuhan kuno yang ditumbuhi lumut', label: '' },
            { value: 'galaksi yang berputar dengan bintang-bintang bersinar', label: '' },
            { value: 'hutan lebat yang diselimuti kabut', label: '' },
            { value: 'laboratorium futuristik yang dipenuhi cahaya biru', label: '' }
        ]));
        setMainMood(getRandomItem([
            { value: 'tenang dan damai', label: '' },
            { value: 'dramatis dan intens', label: '' },
            { value: 'gembira dan ceria', label: '' },
            { value: 'misterius dan gelap', label: '' },
            { value: 'inspiratif dan megah', label: '' }
        ]));
        setMaterialsTextures(getRandomItem([
            { value: 'logam berkilau, kaca reflektif', label: '' },
            { value: 'kayu tua, batu kasar', label: '' },
            { value: 'sutra halus, bulu lembut', label: '' },
            { value: 'air mengalir, asap tebal', label: '' },
            { value: 'es kristal, api membara', label: '' }
        ]));
        setExpressionEmotion(getRandomItem([
            { value: 'senyum lebar, mata berbinar', label: '' },
            { value: 'wajah tegang, alis berkerut', label: '' },
            { value: 'ekspresi terkejut, mulut menganga', label: '' },
            { value: 'pandangan kosong, sedih', label: '' },
            { value: 'tatapan tajam, penuh tekad', label: '' }
        ]));
        setAgeEra(getRandomItem([
            { value: 'Abad Pertengahan', label: '' },
            { value: '1980-an', label: '' },
            { value: 'Era Victoria', label: '' },
            { value: 'Masa Depan Distopia', label: '' },
            { value: 'Prasejarah', label: '' }
        ]));
        setAspectRatio(getRandomItem([
            { value: '16:9', label: '' },
            { value: '4:3', label: '' },
            { value: '1:1', label: '' },
            { value: '21:9', label: '' },
            { value: '3:2', label: '' }
        ]));
        setResolution(getRandomItem([
            { value: '4K', label: '' },
            { value: '8K', label: '' },
            { value: 'Ultra HD', label: '' },
            { value: 'Full HD', label: '' },
            { value: '1080p', label: '' }
        ]));
        setAdditionalDetails(getRandomItem([
            { value: 'dengan detail hyper-realistis, pencahayaan dramatis, resolusi 8K', label: '' },
            { value: 'menggunakan palet warna pastel, suasana tenang, gaya impresionis', label: '' },
            { value: 'dengan efek glitch, gaya distopia, sinematik', label: '' },
            { value: 'menggambarkan emosi melankolis, komposisi simetris, bokeh', label: '' },
            { value: 'dengan tekstur kasar, gaya grunge, efek film lama', label: '' }
        ]));
        setNegativePrompt(getRandomItem([
            { value: 'buram, cacat, jelek, airbrush, tanda air, tulisan, logo, tangan aneh', label: '' },
            { value: 'distorsi, noise, tidak fokus, terlalu gelap, terlalu terang', label: '' },
            { value: 'monokrom, terlalu sederhana, kartun, 3D render', label: '' },
            { value: 'gambar pecah, resolusi rendah, artefak kompresi', label: '' },
            { value: 'objek tidak relevan, warna pudar, komposisi buruk', label: '' }
        ]));
    }, [getRandomItem, imageCategories, imageStyles, cameraAngles, timeLightingOptions]);

    /**
     * Mengisi bidang-bidang khusus video dengan nilai acak.
     */
    const generateRandomVideoFields = useCallback(() => {
        setVideoSubject(getRandomItem([
            { value: 'sebuah pesawat ruang angkasa mendarat di planet asing', label: '' },
            { value: 'seorang detektif memecahkan misteri di kota hujan', label: '' },
            { value: 'sekelompok teman menjelajahi hutan terlarang', label: '' },
            { value: 'pertarungan epik antara dua prajurit di medan perang', label: '' },
            { value: 'kehidupan sehari-hari di kota futuristik', label: '' }
        ]));
        setMainCharacter(getRandomItem([
            { value: 'seorang astronot pemberani', label: '' },
            { value: 'seorang ilmuwan jenius', label: '' },
            { value: 'seorang seniman melankolis', label: '' },
            { value: 'seorang anak kecil yang penasaran', label: '' }
        ]));
        setSupportingCharacters(getRandomItem([
            { value: 'robot pendamping yang setia', label: '' },
            { value: 'alien ramah', label: '' },
            { value: 'kelompok pemberontak', label: '' },
            { value: 'hewan peliharaan yang lucu', label: '' }
        ]));
        setNumCharactersForDialog(Math.floor(Math.random() * 3) + 1); // 1 hingga 3 karakter
        setDialogTexts({
            'character1': getRandomItem([
                { value: 'Ini adalah langkah kecil bagi manusia, lompatan besar bagi umat manusia.', label: '' },
                { value: 'Kita harus menemukan jawabannya sebelum terlambat.', label: '' },
                { value: 'Saya tidak pernah menyangka akan melihat ini.', label: '' }
            ])
        });
        setVideoAction(getRandomItem([
            { value: 'melarikan diri dari ledakan', label: '' },
            { value: 'menjelajahi reruntuhan kuno', label: '' },
            { value: 'berinteraksi dengan teknologi asing', label: '' },
            { value: 'berlari di tengah hujan lebat', label: '' }
        ]));
        setVideoSetting(getRandomItem([
            { value: 'di permukaan bulan yang tandus', label: '' },
            { value: 'di jalanan kota yang ramai di malam hari', label: '' },
            { value: 'di dalam kapal luar angkasa yang luas', label: '' },
            { value: 'di hutan neon yang misterius', label: '' }
        ]));
        setVideoMood(getRandomItem([
            { value: 'inspiratif dan penuh harapan', label: '' },
            { value: 'tegang dan mendebarkan', label: '' },
            { value: 'tenang dan reflektif', label: '' },
            { value: 'gelap dan distopia', label: '' }
        ]));
        setVideoDuration(getRandomItem([
            { value: '5 detik', label: '' },
            { value: '10 detik', label: '10 detik' },
            { value: '15 detik', label: '15 detik' },
            { value: '30 detik', label: '30 detik' }
        ]));
        setCameraMovement(getRandomItem(videoCameraMovements));
        setVideoStyle(getRandomItem(videoStyles));
        setDialogLanguage(getRandomItem(dialogLanguages));
        setBacksound(getRandomItem([
            { value: 'musik latar orkestra epik', label: '' },
            { value: 'suara alam yang menenangkan', label: '' },
            { value: 'synthwave futuristik', label: '' },
            { value: 'suara kota yang ramai', label: '' }
        ]));
        setSoundEffects(getRandomItem([
            { value: 'suara ledakan, deru mesin', label: '' },
            { value: 'langkah kaki, desisan angin', label: '' },
            { value: 'suara tembakan, teriakan', label: '' },
            { value: 'bunyi bip robot, suara antarmuka', label: '' }
        ]));
        setAdditionalVideoDetails(getRandomItem([
            { value: 'dengan transisi yang mulus dan efek visual yang memukau', label: '' },
            { value: 'fokus pada ekspresi wajah karakter dan detail lingkungan', label: '' },
            { value: 'menggunakan pencahayaan dramatis dan warna kontras', label: '' }
        ]));
        setNegativeVideoPrompt(getRandomItem([
            { value: 'buram, goyang, audio buruk, teks di layar', label: '' },
            { value: 'gambar pecah, distorsi, efek yang berlebihan', label: '' },
            { value: 'objek tidak relevan, transisi kasar', label: '' }
        ]));
    }, [getRandomItem, videoCameraMovements, videoStyles, dialogLanguages]);


    // Mereset semua bidang input saat jenis prompt atau mode pembuatan berubah
    useEffect(() => {
        // Hapus semua bidang gambar
        setImageStyle(''); setImageCategory(''); setCameraAngle(''); setTimeLighting('');
        setAction(''); setBackground(''); setMainMood(''); setMaterialsTextures('');
        setExpressionEmotion(''); setAgeEra(''); setAspectRatio(''); setResolution('');
        setAdditionalDetails(''); setNegativePrompt('');

        // Hapus semua bidang video
        setVideoSubject(''); setMainCharacter(''); setSupportingCharacters('');
        setNumCharactersForDialog(0); setDialogTexts({}); setVideoAction('');
        setVideoSetting(''); setVideoMood(''); setVideoDuration('');
        setCameraMovement(''); setVideoStyle(''); setDialogLanguage('');
        setBacksound(''); setSoundEffects(''); setAdditionalVideoDetails('');
        setNegativeVideoPrompt('');

        setInputText(''); // Hapus teks input utama
        setGeneratedPrompt(''); // Hapus prompt yang dihasilkan
        setError(''); // Hapus kesalahan
    }, [activePromptType, creationMode]);


    // Efek inisialisasi dan autentikasi Firebase
    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                // Inisialisasi Aplikasi Firebase
                const firebaseAppModule = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js');
                const { initializeApp } = firebaseAppModule;
                const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
                const appInstance = initializeApp(firebaseConfig);

                // Inisialisasi Autentikasi Firebase
                const authModule = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
                const { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } = authModule;
                const firebaseAuth = getAuth(appInstance);
                setAuth(firebaseAuth);

                // Inisialisasi Firestore
                const firestoreModule = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
                const { getFirestore } = firestoreModule;
                setDb(getFirestore(appInstance));

                // Tangani autentikasi awal
                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                if (initialAuthToken) {
                    try {
                        await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        console.log("Berhasil masuk dengan token kustom.");
                    } catch (err) {
                        console.error("Kesalahan saat masuk dengan token kustom:", err);
                        // Fallback ke anonim jika token kustom gagal
                        await signInAnonymously(firebaseAuth);
                        console.log("Berhasil masuk secara anonim setelah kegagalan token kustom.");
                    }
                } else {
                    await signInAnonymously(firebaseAuth);
                    console.log("Berhasil masuk secara anonim (tidak ada token kustom).");
                }

                // Dengarkan perubahan status autentikasi
                onAuthStateChanged(firebaseAuth, (currentUser) => {
                    if (currentUser) {
                        setUser(currentUser);
                        setUserId(currentUser.uid);
                        console.log("Status autentikasi berubah: Pengguna adalah", currentUser.uid, currentUser.isAnonymous ? "(Anonim)" : "(Terautentikasi)");
                    } else {
                        setUser(null);
                        // Jika tidak ada pengguna, buat ID acak untuk sesi yang tidak terautentikasi
                        setUserId(crypto.randomUUID());
                        console.log("Status autentikasi berubah: Tidak ada pengguna. Membuat ID acak.");
                    }
                    setIsAuthReady(true); // Autentikasi Firebase siap
                });

            } catch (err) {
                console.error("Kesalahan saat menginisialisasi Firebase:", err);
                setError("Gagal menginisialisasi Firebase. Periksa koneksi atau konfigurasi.");
            }
        };

        initializeFirebase();
    }, []);

    /**
     * Menangani pendaftaran atau masuk email/kata sandi.
     */
    const handleAuthAction = async () => {
        setAuthError('');
        if (!email || !password) {
            setAuthError('Email dan kata sandi harus diisi.');
            return;
        }

        setIsLoading(true);
        try {
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
                console.log("Login berhasil.");
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                console.log("Pendaftaran berhasil.");
            }
            setShowLoginModal(false); // Tutup modal saat berhasil
            setEmail('');
            setPassword('');
        } catch (err) {
            console.error("Kesalahan autentikasi:", err);
            let errorMessage = "Terjadi kesalahan autentikasi.";
            if (err.code === 'auth/invalid-email') {
                errorMessage = 'Format email tidak valid.';
            } else if (err.code === 'auth/user-disabled') {
                errorMessage = 'Akun ini telah dinonaktifkan.';
            } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                errorMessage = 'Email atau kata sandi salah.';
            } else if (err.code === 'auth/email-already-in-use') {
                errorMessage = 'Email ini sudah terdaftar.';
            } else if (err.code === 'auth/weak-password') {
                errorMessage = 'Kata sandi terlalu lemah (minimal 6 karakter).';
            }
            setAuthError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Menangani Masuk dengan Google.
     */
    const handleGoogleLogin = async () => {
        setAuthError('');
        setIsLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            console.log("Login dengan Google berhasil.");
            setShowLoginModal(false); // Tutup modal saat berhasil
        } catch (err) {
            console.error("Kesalahan masuk dengan Google:", err);
            // Pesan kesalahan yang lebih spesifik untuk login Google
            let errorMessage = "Gagal login dengan Google. ";
            if (err.code === 'auth/popup-closed-by-user') {
                errorMessage += "Jendela pop-up ditutup oleh pengguna.";
            } else if (err.code === 'auth/cancelled-popup-request') {
                errorMessage += "Permintaan pop-up dibatalkan (mungkin pemblokir pop-up).";
            } else if (err.code === 'auth/operation-not-allowed') {
                errorMessage += "Operasi tidak diizinkan. Pastikan login Google diaktifkan di konsol Firebase.";
            } else if (err.code === 'auth/auth-domain-config-required') {
                errorMessage += "Konfigurasi domain autentikasi diperlukan. Periksa Authorized domains di konsol Firebase.";
            } else if (err.code === 'auth/unauthorized-domain') {
                errorMessage += "Domain tidak sah. Tambahkan domain aplikasi Anda ke Authorized domains di konsol Firebase.";
            } else {
                errorMessage += "Terjadi kesalahan tidak dikenal. Periksa konsol browser untuk detail lebih lanjut.";
            }
            setAuthError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Menangani logout pengguna.
     */
    const handleLogout = async () => {
        if (auth) {
            try {
                await signOut(auth);
                console.log("Pengguna berhasil logout.");
                setError(''); // Hapus kesalahan sebelumnya
                setGeneratedPrompt(''); // Hapus prompt yang dihasilkan saat logout
            } catch (err) {
                console.error("Kesalahan saat logout:", err);
                setError("Gagal logout. Coba lagi.");
            }
        }
    };

    /**
     * Menghapus semua bidang input dan prompt yang dihasilkan.
     */
    const clearAllFields = () => {
        setImageStyle(''); setImageCategory(''); setCameraAngle(''); setTimeLighting('');
        setAction(''); setBackground(''); setMainMood(''); setMaterialsTextures('');
        setExpressionEmotion(''); setAgeEra(''); setAspectRatio(''); setResolution('');
        setAdditionalDetails(''); setNegativePrompt('');

        setVideoSubject(''); setMainCharacter(''); setSupportingCharacters('');
        setNumCharactersForDialog(0); setDialogTexts({}); setVideoAction('');
        setVideoSetting(''); setVideoMood(''); setVideoDuration('');
        setCameraMovement(''); setVideoStyle(''); setDialogLanguage('');
        setBacksound(''); setBacksound(''); setSoundEffects(''); setAdditionalVideoDetails('');
        setNegativeVideoPrompt('');

        setInputText('');
        setGeneratedPrompt('');
        setError('');
        setCopyMessage('');
    };

    /**
     * Menangani proses pembuatan prompt berdasarkan mode dan jenis yang dipilih.
     */
    const generatePrompt = async () => {
        setError('');
        setCopyMessage('');
        setGeneratedPrompt(''); // Hapus prompt yang dihasilkan sebelumnya

        // --- Pemeriksaan Autentikasi ---
        if (!user || user.isAnonymous) {
            setError('Anda harus login untuk menghasilkan prompt AI. Silakan daftar atau masuk.');
            setShowLoginModal(true); // Tampilkan modal login
            return;
        }

        if (creationMode === 'manual') {
            if (!inputText.trim()) {
                setError('Mohon masukkan prompt Anda secara manual.');
                return;
            }
            setGeneratedPrompt(inputText); // Untuk mode manual, input adalah output
            return;
        }

        // Untuk mode acak, isi bidang terlebih dahulu
        if (creationMode === 'random') {
            if (activePromptType === 'image') {
                generateRandomImageFields();
            } else if (activePromptType === 'single_video') {
                generateRandomVideoFields();
            }
            // Setelah mengisi bidang acak, lanjutkan ke pembuatan AI
        }

        // Validasi input utama untuk mode AI (jika bukan acak, karena acak mengisinya)
        // Untuk mode acak, bidang diisi, jadi kita tidak memerlukan validasi inputText di sini.
        if (creationMode === 'ai' && !inputText.trim()) {
            setError(activePromptType === 'image' ? 'Mohon masukkan Subjek untuk menghasilkan prompt gambar.' : 'Mohon masukkan ide atau kata kunci untuk menghasilkan prompt.');
            return;
        }


        setIsLoading(true);

        let promptInstruction = '';
        switch (activePromptType) {
            case 'image':
                promptInstruction = `Buatkan prompt yang sangat detail dan kreatif untuk menghasilkan gambar AI. `;
                promptInstruction += `Subjek: "${inputText}". `;
                if (imageStyle) promptInstruction += `Gaya: ${imageStyle}. `;
                if (imageCategory) promptInstruction += `Kategori: ${imageCategory}. `;
                if (cameraAngle) promptInstruction += `Sudut Kamera: ${cameraAngle}. `;
                if (timeLighting) promptInstruction += `Waktu/Pencahayaan: ${timeLighting}. `;
                if (action) promptInstruction += `Aksi: ${action}. `;
                if (background) promptInstruction += `Latar Belakang: ${background}. `;
                if (mainMood) promptInstruction += `Suasana/Emosi Utama: ${mainMood}. `;
                if (materialsTextures) promptInstruction += `Bahan/Tekstur: ${materialsTextures}. `;
                if (expressionEmotion) promptInstruction += `Ekspresi/Emosi: ${expressionEmotion}. `; // FIX: Baris ini sudah selesai
                if (ageEra) promptInstruction += `Usia/Era: ${ageEra}. `;
                if (aspectRatio) promptInstruction += `Rasio Aspek: ${aspectRatio}. `;
                if (resolution) promptInstruction += `Resolusi: ${resolution}. `;
                if (additionalDetails) promptInstruction += `Detail Tambahan: ${additionalDetails}. `;
                if (negativePrompt) promptInstruction += `Hindari elemen-elemen berikut: ${negativePrompt}. `;
                promptInstruction += `Berikan prompt dalam bahasa Indonesia.`;
                break;
            case 'single_video':
                promptInstruction = `Buatkan prompt yang sangat detail dan kreatif untuk menghasilkan video AI tunggal. `;
                promptInstruction += `Subjek Video: "${videoSubject || inputText}". `; // Gunakan videoSubject jika tersedia, jika tidak inputText
                if (mainCharacter) promptInstruction += `Karakter Utama: ${mainCharacter}. `;
                if (supportingCharacters) promptInstruction += `Karakter Pendukung: ${supportingCharacters}. `;
                if (numCharactersForDialog > 0) {
                    let dialogParts = [];
                    for (let i = 1; i <= numCharactersForDialog; i++) {
                        if (dialogTexts[`character${i}`]) {
                            dialogParts.push(`Dialog Karakter ${i}: "${dialogTexts[`character${i}`]}"`);
                        }
                    }
                    if (dialogParts.length > 0) promptInstruction += `Dialog: ${dialogParts.join('; ')}. `;
                }
                if (videoAction) promptInstruction += `Aksi Video: ${videoAction}. `;
                if (videoSetting) promptInstruction += `Pengaturan Video: ${videoSetting}. `;
                if (videoMood) promptInstruction += `Suasana/Emosi Video: ${videoMood}. `;
                if (videoDuration) promptInstruction += `Durasi Video: ${videoDuration}. `;
                if (cameraMovement) promptInstruction += `Pergerakan Kamera: ${cameraMovement}. `;
                if (videoStyle) promptInstruction += `Gaya Video: ${videoStyle}. `;
                if (dialogLanguage) promptInstruction += `Bahasa Dialog: ${dialogLanguage}. `;
                if (backsound) promptInstruction += `Backsound: ${backsound}. `;
                if (soundEffects) promptInstruction += `Efek Suara: ${soundEffects}. `;
                if (additionalVideoDetails) promptInstruction += `Detail Tambahan Video: ${additionalVideoDetails}. `;
                if (negativeVideoPrompt) promptInstruction += `Hindari elemen-elemen berikut: ${negativeVideoPrompt}. `;
                promptInstruction += `Berikan prompt dalam bahasa Indonesia.`;
                break;
            case 'director_video':
                promptInstruction = `Buatkan prompt yang detail dan kreatif untuk seorang sutradara video AI berdasarkan ide atau kata kunci berikut: "${inputText}". Prompt harus mencakup konsep cerita, gaya penyutradaraan, tone, target audiens, elemen kunci visual dan naratif, serta instruksi spesifik untuk AI sebagai 'sutradara'. Berikan dalam bahasa Indonesia.`;
                break;
            case 'text':
                promptInstruction = `Buatkan prompt yang detail dan kreatif untuk menghasilkan konten teks berdasarkan ide atau kata kunci berikut: "${inputText}". Prompt harus mencakup jenis teks (misal: artikel, cerita pendek, puisi, skrip), gaya penulisan, target audiens, panjang, dan detail spesifik lainnya yang dapat membantu AI menghasilkan teks yang lebih baik. Berikan dalam bahasa Indonesia.`;
                break;
            default: // Fallback untuk jenis prompt aktif lainnya yang tidak terduga
                promptInstruction = `Buatkan prompt yang detail dan kreatif berdasarkan ide atau kata kunci berikut: "${inputText}". Berikan dalam bahasa Indonesia.`;
                break;
        }


        try {
            const chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: promptInstruction }] });

            const payload = { contents: chatHistory };
            const apiKey = ""; // Kunci API disediakan oleh lingkungan Canvas untuk gemini-2.0-flash
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Kesalahan API: ${errorData.error.message || response.statusText}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                setGeneratedPrompt(text);
            } else {
                setError('Gagal menghasilkan prompt. Struktur respons tidak terduga.');
            }
        } catch (err) {
            console.error("Kesalahan saat menghasilkan prompt:", err);
            setError(`Terjadi kesalahan: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Menyalin prompt yang dihasilkan ke clipboard.
     */
    const copyToClipboard = () => {
        if (generatedPrompt) {
            const textarea = document.createElement('textarea');
            textarea.value = generatedPrompt;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                setCopyMessage('Prompt berhasil disalin!');
                setTimeout(() => setCopyMessage(''), 3000); // Hapus pesan setelah 3 detik
            } catch (err) {
                console.error('Gagal menyalin ke clipboard:', err);
                setCopyMessage('Gagal menyalin prompt.');
            }
            document.body.removeChild(textarea);
        }
    };

    // Render bidang input dialog secara dinamis berdasarkan numCharactersForDialog
    const renderDialogInputs = () => {
        const inputs = [];
        for (let i = 1; i <= numCharactersForDialog; i++) {
            inputs.push(
                <div key={`dialog-${i}`} className="col-span-1">
                    <label htmlFor={`dialog-character-${i}`} className="block text-blue-300 text-lg font-semibold mb-2">
                        Dialog Karakter {i}:
                    </label>
                    <textarea
                        id={`dialog-character-${i}`}
                        className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-y min-h-[60px] text-base placeholder-gray-500"
                        placeholder={`Masukkan dialog untuk Karakter ${i}`}
                        value={dialogTexts[`character${i}`] || ''}
                        onChange={(e) => setDialogTexts(prev => ({ ...prev, [`character${i}`]: e.target.value }))}
                        rows="2"
                        // Dihapus disabled={creationMode === 'random'}
                    ></textarea>
                </div>
            );
        }
        return inputs;
    };


    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
            {/* Header dengan Login/Logout dan ID Pengguna */}
            <div className="w-full max-w-2xl flex justify-between items-center mb-4">
                <div className="text-sm text-gray-400">
                    {isAuthReady && userId && (
                        <span>ID Pengguna: {userId}</span>
                    )}
                </div>
                {isAuthReady && (
                    user && !user.isAnonymous ? (
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full shadow-md shadow-red-500/30 transition-all duration-200 ease-in-out hover:scale-105"
                        >
                            Logout ({user.email || user.uid.substring(0, 8) + '...'})
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-md shadow-blue-500/30 transition-all duration-200 ease-in-out hover:scale-105"
                        >
                            Login / Daftar
                        </button>
                    )
                )}
            </div>

            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl shadow-purple-900/50 w-full max-w-2xl transform transition-all duration-300 hover:scale-[1.02] border border-blue-700/50">
                <h1 className="text-4xl font-extrabold text-center mb-2 drop-shadow-md">
                    <span className="text-white text-shadow-neon-white-subtle">GENERATOR PROMPT AI</span>
                </h1>
                <p className="text-md text-center mb-6">
                    <span className="text-purple-400 text-shadow-neon-purple">by Sing Sareh</span>
                </p>
                <p className="text-center text-gray-300 mb-8 text-lg">
                    Isi bidang-bidang di bawah untuk membuat prompt yang sangat detail dan siap dijual!
                </p>

                {/* --- Tab Navigasi Utama --- */}
                <div className="mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                        <button
                            onClick={() => setActivePromptType('image')}
                            className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center border-2 ${activePromptType === 'image' ? 'bg-blue-700 border-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-blue-500'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image mr-2">
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                <circle cx="9" cy="9" r="2" />
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                            Gambar
                        </button>
                        <button
                            onClick={() => setActivePromptType('single_video')}
                            className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center border-2 ${activePromptType === 'single_video' ? 'bg-blue-700 border-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-blue-500'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-video mr-2">
                                <path d="m22 8-6 4 6 4V8Z" />
                                <rect x="2" y="8" width="14" height="8" rx="2" ry="2" />
                            </svg>
                            Video Tunggal
                        </button>
                        <button
                            onClick={() => setActivePromptType('director_video')}
                            className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center border-2 ${activePromptType === 'director_video' ? 'bg-blue-700 border-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-blue-500'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-film mr-2">
                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                <path d="M7 3v18" />
                                <path d="M17 3v18" />
                                <path d="M3 7.5h4" />
                                <path d="M3 12h18" />
                                <path d="M3 16.5h4" />
                                <path d="M17 7.5h4" />
                                <path d="M17 16.5h4" />
                            </svg>
                            Sutradara
                        </button>
                        <button
                            onClick={() => setActivePromptType('text')}
                            className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center border-2 ${activePromptType === 'text' ? 'bg-blue-700 border-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-blue-500'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text mr-2">
                                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                                <path d="M10 9H8" />
                                <path d="M16 13H8" />
                                <path d="M16 17H8" />
                            </svg>
                            Teks
                        </button>
                        <button
                            onClick={() => setActivePromptType('gallery')}
                            className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center border-2 ${activePromptType === 'gallery' ? 'bg-blue-700 border-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-blue-500'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-gallery-horizontal mr-2">
                                <path d="M2 3h20" />
                                <path d="M2 21h20" />
                                <path d="M7 17V7l5 5 5-5v10" />
                            </svg>
                            Galeri
                        </button>
                    </div>
                </div>

                {/* --- Pemilihan Mode Pembuatan Prompt --- */}
                {activePromptType !== 'director_video' && activePromptType !== 'text' && activePromptType !== 'gallery' && (
                    <div className="mb-6">
                        <h2 className="block text-blue-300 text-lg font-semibold mb-2">
                            Pilih Metode Pembuatan Prompt:
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                            <button
                                onClick={() => setCreationMode('ai')}
                                className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center border-2 ${creationMode === 'ai' ? 'bg-purple-700 border-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-purple-500'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain mr-2">
                                    <path d="M12 12c2-2.5 4-2.5 6 0 2 2.5 2 5 .5 6.5-2.5 2.5-5 2-6.5.5-1.5-1.5-1.5-4 0-6.5Z" />
                                    <path d="M12 12c-2-2.5-4-2.5-6 0-2 2.5-2 5-.5 6.5 2.5 2.5 5 2 6.5.5 1.5-1.5 1.5-4 0-6.5Z" />
                                    <path d="M12 12c-2.5 2-2.5 4-0 6 .5 1.5 2 1.5 3.5 0 1.5-1.5 1.5-3.5 0-6Z" />
                                </svg>
                                Menggunakan AI
                            </button>
                            <button
                                onClick={() => setCreationMode('manual')}
                                className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center border-2 ${creationMode === 'manual' ? 'bg-purple-700 border-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-purple-500'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil mr-2">
                                    <path d="M17 3a2.85 2.85 0 0 0-4 0L7.5 7.5 2.5 12.5 6.5 16.5 11.5 11.5 15.5 7.5a2.85 2.85 0 0 0 0-4Z" />
                                    <path d="M18 18l-1.5-1.5" />
                                    <path d="M21 21l-1.5-1.5" />
                                </svg>
                                Manual
                            </button>
                            <button
                                onClick={() => setCreationMode('random')}
                                className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center border-2 ${creationMode === 'random' ? 'bg-purple-700 border-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-purple-500'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shuffle mr-2">
                                    <path d="M2 18h1.5a4 4 0 0 0 4-4V8a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1.5" />
                                    <path d="M22 17.5V20h-2.5" />
                                    <path d="m22 20-7-7" />
                                    <path d="M2 6h1.5a4 4 0 0 1 4 4v4a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-1.5" />
                                    <path d="M22 6.5V4h-2.5" />
                                    <path d="m22 4-7 7" />
                                </svg>
                                Acak
                            </button>
                        </div>
                    </div>
                )}

                {/* --- Bidang Input Kondisional berdasarkan Tab Aktif dan Mode Pembuatan --- */}
                {activePromptType === 'image' && creationMode !== 'manual' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Bidang Khusus Gambar */}
                        <div>
                            <label htmlFor="image-style" className="block text-blue-300 text-lg font-semibold mb-2">Gaya Gambar:</label>
                            <select id="image-style" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                                value={imageStyle} onChange={(e) => setImageStyle(e.target.value)} >
                                {imageStyles.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="image-category" className="block text-blue-300 text-lg font-semibold mb-2">Kategori Gambar:</label>
                            <select id="image-category" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                                value={imageCategory} onChange={(e) => setImageCategory(e.target.value)} >
                                {imageCategories.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="camera-angle" className="block text-blue-300 text-lg font-semibold mb-2">Sudut Kamera:</label>
                            <select id="camera-angle" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                                value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} >
                                {cameraAngles.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="time-lighting" className="block text-blue-300 text-lg font-semibold mb-2">Waktu/Pencahayaan:</label>
                            <select id="time-lighting" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                                value={timeLighting} onChange={(e) => setTimeLighting(e.target.value)} >
                                {timeLightingOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="subject-input" className="block text-blue-300 text-lg font-semibold mb-2">Subjek (Siapa/Apa?):</label>
                            <input type="text" id="subject-input" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'naga terbang', 'kota futuristik'" value={inputText} onChange={(e) => setInputText(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="action" className="block text-blue-300 text-lg font-semibold mb-2">Aksi (Apa yang dilakukan/terjadi?):</label>
                            <input type="text" id="action" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'melayang di udara', 'berlari kencang'" value={action} onChange={(e) => setAction(e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="background" className="block text-blue-300 text-lg font-semibold mb-2">Pengaturan (Di mana/Latar belakang?):</label>
                            <input type="text" id="background" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'hutan lebat', 'kota metropolitan', 'luar angkasa'" value={background} onChange={(e) => setBackground(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="main-mood" className="block text-blue-300 text-lg font-semibold mb-2">Suasana/Emosi Utama:</label>
                            <input type="text" id="main-mood" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'Tenang', 'Dramatis', 'Gembira'" value={mainMood} onChange={(e) => setMainMood(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="materials-textures" className="block text-blue-300 text-lg font-semibold mb-2">Bahan/Tekstur (Opsional):</label>
                            <input type="text" id="materials-textures" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'Kayu', 'Logam', 'Sutra', 'Air'" value={materialsTextures} onChange={(e) => setMaterialsTextures(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="expression-emotion" className="block text-blue-300 text-lg font-semibold mb-2">Ekspresi/Emosi (Opsional):</label>
                            <input type="text" id="expression-emotion" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'Senyum lebar', 'Wajah tegang'" value={expressionEmotion} onChange={(e) => setExpressionEmotion(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="age-era" className="block text-blue-300 text-lg font-semibold mb-2">Usia/Era (Opsional):</label>
                            <input type="text" id="age-era" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'Abad Pertengahan', '1980-an'" value={ageEra} onChange={(e) => setAgeEra(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="aspect-ratio" className="block text-blue-300 text-lg font-semibold mb-2">Rasio Aspek (Opsional):</label>
                            <input type="text" id="aspect-ratio" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: '16:9', '4:3', '1:1'" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="resolution" className="block text-blue-300 text-lg font-semibold mb-2">Resolusi (Opsional):</label>
                            <input type="text" id="resolution" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: '4K', '8K', 'Ultra HD'" value={resolution} onChange={(e) => setResolution(e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="additional-details" className="block text-blue-300 text-lg font-semibold mb-2">Ide Tambahan / Detail Subjek:</label>
                            <textarea id="additional-details" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-y min-h-[80px] text-base placeholder-gray-500"
                                placeholder="Tambahkan detail spesifik lainnya, seperti emosi, objek tambahan, atau gaya artistik tertentu." value={additionalDetails} onChange={(e) => setAdditionalDetails(e.target.value)} rows="3"></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="negative-prompt" className="block text-blue-300 text-lg font-semibold mb-2">Prompt Negatif (Hindari):</label>
                            <textarea id="negative-prompt" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-y min-h-[80px] text-base placeholder-gray-500"
                                placeholder="Contoh: 'buram, cacat, jelek, airbrush, tanda air, tulisan, logo'" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} rows="3"></textarea>
                        </div>
                    </div>
                ) : activePromptType === 'single_video' && creationMode !== 'manual' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Bidang Khusus Video Tunggal */}
                        <div>
                            <label htmlFor="video-subject" className="block text-blue-300 text-lg font-semibold mb-2">Subjek Video:</label>
                            <input type="text" id="video-subject" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'Seorang astronot di Mars'" value={videoSubject} onChange={(e) => setVideoSubject(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="main-character" className="block text-blue-300 text-lg font-semibold mb-2">Karakter Utama (Opsional):</label>
                            <input type="text" id="main-character" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'Seorang detektif tua'" value={mainCharacter} onChange={(e) => setMainCharacter(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="supporting-characters" className="block text-blue-300 text-lg font-semibold mb-2">Karakter Pendukung (Opsional):</label>
                            <input type="text" id="supporting-characters" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'Robot anjing'" value={supportingCharacters} onChange={(e) => setSupportingCharacters(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="num-characters-dialog" className="block text-blue-300 text-lg font-semibold mb-2">Jumlah Karakter (untuk dialog):</label>
                            <input type="number" id="num-characters-dialog" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                min="0" max="5" value={numCharactersForDialog} onChange={(e) => setNumCharactersForDialog(parseInt(e.target.value) || 0)} />
                        </div>
                        {renderDialogInputs()} {/* Render input dialog dinamis */}
                        <div>
                            <label htmlFor="video-action" className="block text-blue-300 text-lg font-semibold mb-2">Aksi Video:</label>
                            <input type="text" id="video-action" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'Melayang di luar angkasa'" value={videoAction} onChange={(e) => setVideoAction(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="video-setting" className="block text-blue-300 text-lg font-semibold mb-2">Pengaturan Video:</label>
                            <input type="text" id="video-setting" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'Di dalam kapal luar angkasa'" value={videoSetting} onChange={(e) => setVideoSetting(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="video-mood" className="block text-blue-300 text-lg font-semibold mb-2">Suasana/Emosi Video:</label>
                            <input type="text" id="video-mood" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'Misterius', 'Inspiratif'" value={videoMood} onChange={(e) => setVideoMood(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="video-duration" className="block text-blue-300 text-lg font-semibold mb-2">Durasi Video (detik):</label>
                            <input type="text" id="video-duration" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: '15 detik', '1 menit'" value={videoDuration} onChange={(e) => setVideoDuration(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="camera-movement" className="block text-blue-300 text-lg font-semibold mb-2">Pergerakan Kamera:</label>
                            <select id="camera-movement" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                                value={cameraMovement} onChange={(e) => setCameraMovement(e.target.value)} >
                                {videoCameraMovements.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="video-style" className="block text-blue-300 text-lg font-semibold mb-2">Gaya Video:</label>
                            <select id="video-style" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                                value={videoStyle} onChange={(e) => setVideoStyle(e.target.value)} >
                                {videoStyles.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="dialog-language" className="block text-blue-300 text-lg font-semibold mb-2">Bahasa Dialog (Opsional):</label>
                            <select id="dialog-language" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                                value={dialogLanguage} onChange={(e) => setDialogLanguage(e.target.value)} >
                                {dialogLanguages.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="backsound" className="block text-blue-300 text-lg font-semibold mb-2">Backsound (Opsional):</label>
                            <input type="text" id="backsound" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'Musik latar orkestra epik'" value={backsound} onChange={(e) => setBacksound(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="sound-effects" className="block text-blue-300 text-lg font-semibold mb-2">Efek Suara (Opsional):</label>
                            <input type="text" id="sound-effects" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Contoh: 'Suara ledakan, deru mesin'" value={soundEffects} onChange={(e) => setSoundEffects(e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="additional-video-details" className="block text-blue-300 text-lg font-semibold mb-2">Ide Tambahan Video (Opsional):</label>
                            <textarea id="additional-video-details" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-y min-h-[80px] text-base placeholder-gray-500"
                                placeholder="Detail tambahan atau instruksi khusus untuk video." value={additionalVideoDetails} onChange={(e) => setAdditionalVideoDetails(e.target.value)} rows="3"></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="negative-video-prompt" className="block text-blue-300 text-lg font-semibold mb-2">Prompt Negatif Video (Opsional):</label>
                            <textarea id="negative-video-prompt" className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-y min-h-[80px] text-base placeholder-gray-500"
                                placeholder="Contoh: 'buram, goyang, audio buruk, teks di layar'" value={negativeVideoPrompt} onChange={(e) => setNegativeVideoPrompt(e.target.value)} rows="3"></textarea>
                        </div>
                    </div>
                ) : activePromptType === 'director_video' || activePromptType === 'text' || activePromptType === 'gallery' ? (
                    // Placeholder untuk tab "Segera Hadir"
                    <div className="text-center py-12">
                        <p className="text-gray-400 text-2xl font-bold">Fitur ini akan segera hadir!</p>
                        <p className="text-gray-500 mt-2">Nantikan pembaruan selanjutnya.</p>
                    </div>
                ) : (
                    // Input generik untuk mode manual atau fallback - Dibungkus dalam Fragment
                    <React.Fragment>
                        <label htmlFor="prompt-input" className="block text-blue-300 text-lg font-semibold mb-2">
                            {creationMode === 'manual' ? 'Masukkan Prompt Lengkap Anda:' : 'Masukkan Ide atau Kata Kunci Anda:'}
                        </label>
                        <textarea
                            id="prompt-input"
                            className="w-full p-4 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-y min-h-[100px] text-base placeholder-gray-500"
                            placeholder={creationMode === 'manual' ? 'Tulis prompt lengkap Anda di sini...' : 'Contoh: "cerita fantasi tentang naga", "ide aplikasi manajemen tugas"'}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            rows="4"
                        ></textarea>
                    </React.Fragment>
                )}

                {/* --- Tombol Kontrol Utama --- */}
                <div className="flex flex-wrap justify-center gap-4 mb-6">
                    <button
                        onClick={clearAllFields}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-gray-500/30 transform transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-400 flex items-center justify-center border-2 border-gray-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eraser mr-2">
                            <path d="M20.5 17.5 17 14l1.5-1.5a2.83 2.83 0 1 1 4 4L20.5 17.5Z" />
                            <path d="M19 15 9 5l-7 7 10 10 7-7Z" />
                        </svg>
                        Bersihkan
                    </button>

                    {creationMode !== 'manual' && (
                        <button
                            onClick={() => {
                                if (activePromptType === 'image') {
                                    generateRandomImageFields();
                                } else if (activePromptType === 'single_video') {
                                    generateRandomVideoFields();
                                }
                                // Tidak ada acak untuk jenis lain
                            }}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-yellow-500/30 transform transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-400 flex items-center justify-center border-2 border-yellow-500"
                            disabled={activePromptType === 'director_video' || activePromptType === 'text' || activePromptType === 'gallery'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dice-5 mr-2">
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                <path d="M8 8h.01" />
                                <path d="M16 16h.01" />
                                <path d="M16 8h.01" />
                                <path d="M8 16h.01" />
                                <path d="M12 12h.01" />
                            </svg>
                            Acak
                        </button>
                    )}

                    <button
                        onClick={generatePrompt}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-purple-500/30 transform transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border-2 border-purple-500"
                        disabled={isLoading || activePromptType === 'director_video' || activePromptType === 'text' || activePromptType === 'gallery' || !user || user.isAnonymous}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Menghasilkan...
                            </>
                        ) : (
                            creationMode === 'manual' ? 'Tampilkan Prompt Manual' : 'Hasilkan Prompt'
                        )}
                    </button>
                </div>

                {/* --- Tombol Fitur Tambahan (Khusus Tab Gambar) --- */}
                {activePromptType === 'image' && creationMode !== 'manual' && (
                    <div className="mb-6 border-t border-gray-700 pt-6">
                        <h3 className="block text-blue-300 text-lg font-semibold mb-3">Fitur Tambahan (Gambar):</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <button className="bg-gray-700 text-gray-400 py-2 px-4 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 cursor-not-allowed">
                                Tingkatkan Prompt
                            </button>
                            <button className="bg-gray-700 text-gray-400 py-2 px-4 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 cursor-not-allowed">
                                Sarankan Kata Kunci
                            </button>
                            <button className="bg-gray-700 text-gray-400 py-2 px-4 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 cursor-not-allowed">
                                Hasilkan Deskripsi
                            </button>
                            <button className="bg-gray-700 text-gray-400 py-2 px-4 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 cursor-not-allowed">
                                Buat Variasi Prompt
                            </button>
                            <button className="bg-gray-700 text-gray-400 py-2 px-4 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 cursor-not-allowed">
                                Perbaiki Gramatika/Ejaan
                            </button>
                            <button className="bg-gray-700 text-gray-400 py-2 px-4 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 cursor-not-allowed">
                                Sarankan Palet Warna
                            </button>
                            <button className="bg-gray-700 text-gray-400 py-2 px-4 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 cursor-not-allowed">
                                Sarankan Konsep Terkait
                            </button>
                        </div>
                    </div>
                )}


                {/* --- Tampilan Kesalahan --- */}
                {error && (
                    <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6 shadow-md shadow-red-700/30" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> {error}</span>
                    </div>
                )}

                {/* --- Area Output Prompt yang Dihasilkan --- */}
                {generatedPrompt && (
                    <div className="bg-gray-900 p-6 rounded-lg border-2 border-green-700 shadow-inner shadow-green-700/30">
                        <h2 className="text-2xl font-bold text-green-400 mb-4 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Prompt yang Dihasilkan:
                        </h2>
                        <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-base mb-4">
                            {generatedPrompt}
                        </p>
                        <button
                            onClick={copyToClipboard}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-full shadow-md shadow-teal-500/30 transform transition-all duration-200 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-teal-400 flex items-center border-2 border-teal-500"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Salin Prompt
                        </button>
                        {copyMessage && (
                            <p className="text-green-500 text-sm mt-2 animate-pulse">{copyMessage}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Login/Daftar */}
            {showLoginModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 p-8 rounded-xl shadow-2xl shadow-purple-900/50 w-full max-w-md border border-blue-700/50 relative">
                        <button
                            onClick={() => setShowLoginModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold"
                        >
                            &times;
                        </button>
                        <h2 className="text-3xl font-bold text-center text-white mb-6">
                            {isLoginMode ? 'Login' : 'Daftar'}
                        </h2>

                        {authError && (
                            <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-4 text-sm" role="alert">
                                {authError}
                            </div>
                        )}

                        <div className="mb-4">
                            <label htmlFor="auth-email" className="block text-blue-300 text-lg font-semibold mb-2">Email:</label>
                            <input
                                type="email"
                                id="auth-email"
                                className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Masukkan email Anda"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="auth-password" className="block text-blue-300 text-lg font-semibold mb-2">Kata Sandi:</label>
                            <input
                                type="password"
                                id="auth-password"
                                className="w-full p-3 border-2 border-blue-700 bg-gray-900 text-green-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder-gray-500"
                                placeholder="Masukkan kata sandi Anda"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleAuthAction}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-purple-500/30 transform transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mb-4"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Memproses...
                                </>
                            ) : (
                                isLoginMode ? 'Login' : 'Daftar'
                            )}
                        </button>

                        <button
                            onClick={handleGoogleLogin}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-blue-500/30 transform transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mb-4"
                            disabled={isLoading}
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Logo Google" className="h-5 w-5 mr-3" />
                            Login dengan Google
                        </button>

                        <p className="text-center text-gray-400">
                            {isLoginMode ? (
                                <>Belum punya akun? <button onClick={() => { setIsLoginMode(false); setAuthError(''); }} className="text-blue-400 hover:underline font-semibold">Daftar</button></>
                            ) : (
                                <>Sudah punya akun? <button onClick={() => { setIsLoginMode(true); setAuthError(''); }} className="text-blue-400 hover:underline font-semibold">Login</button></>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* CSS Kustom untuk efek teks neon */}
            <style>
                {`
                .text-shadow-neon-white-subtle {
                    text-shadow: 0 0 2px #fff, 0 0 5px #fff, 0 0 10px #0ff; /* Sebaran dan blur berkurang */
                }
                .text-shadow-neon-purple {
                    text-shadow: 0 0 5px #f0f, 0 0 10px #f0f, 0 0 20px #f0f, 0 0 40px #80f, 0 0 80px #80f, 0 0 90px #80f, 0 0 100px #80f, 0 0 150px #80f;
                }
                `}
            </style>
        </div>
    );
};

export default App;
Initial upload of Generator Prompt AI app
