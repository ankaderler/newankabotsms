const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_KEY = process.env.API_KEY || 'osms_24a366588a5adf689da78bd656ef845effba51b53754bf57';
const API_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';

// Veritabanı simülasyonu (Kullanıcılar ve Bakiyeler)
let users = {
    "musteri@gmail.com": { balance: 250.00, name: "Örnek Müşteri", password: "123" }
};

const services = [
    { id: "wa", name: "WhatsApp", price: 200, icon: "fa-whatsapp", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    { id: "tg", name: "Telegram", price: 200, icon: "fa-telegram", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    { id: "lg", name: "Letgo TR", price: 80, icon: "fa-store", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    { id: "ig", name: "Instagram", price: 150, icon: "fa-instagram", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30" },
    { id: "tw", name: "Twitter / X", price: 120, icon: "fa-twitter", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" },
    { id: "gm", name: "Google / Gmail", price: 100, icon: "fa-google", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" }
];

app.get('/api/getServices', (req, res) => {
    res.json({ success: true, services });
});

app.get('/api/getCustomerBalance', (req, res) => {
    const email = req.query.email || "musteri@gmail.com";
    const user = users[email] || { balance: 0 };
    res.json({ success: true, balance: user.balance, name: user.name });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (users[email] && users[email].password === password) {
        res.json({ success: true, message: 'Giriş başarılı!', email, name: users[email].name, balance: users[email].balance });
    } else {
        res.status(400).json({ success: false, message: 'E-posta veya şifre hatalı!' });
    }
});

app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (users[email]) {
        return res.status(400).json({ success: false, message: 'Bu e-posta adresi zaten kayıtlı!' });
    }
    users[email] = { name, password, balance: 50.00 }; // Hoşgeldin bonusu 50 TL
    res.json({ success: true, message: 'Kayıt başarılı! 50 TL hoşgeldin bonusu yüklendi.', email, name, balance: 50.00 });
});

app.post('/api/buyNumber', async (req, res) => {
    const { service, country, email } = req.body;
    const userEmail = email || "musteri@gmail.com";
    
    if (!users[userEmail]) {
        return res.status(400).json({ success: false, message: 'Kullanıcı oturumu bulunamadı.' });
    }

    const srvObj = services.find(s => s.id === service);
    const price = srvObj ? srvObj.price : 100;

    if (users[userEmail].balance < price) {
        return res.status(400).json({ 
            success: false, 
            message: `Bakiyeniz yetersiz! Bu ürün ${price} TL, sizin bakiyeniz ${users[userEmail].balance} TL.` 
        });
    }

    try {
        const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getNumber&service=${service}&country=${country || 0}`);
        const resultText = response.data;

        if (resultText.startsWith('ACCESS_NUMBER')) {
            users[userEmail].balance -= price;
            const parts = resultText.split(':');
            return res.json({
                success: true,
                activationId: parts[1],
                phoneNumber: parts[2],
                remainingBalance: users[userEmail].balance,
                message: 'Numara başarıyla alındı!'
            });
        } else {
            return res.status(400).json({ success: false, message: `Sistem Hatası: ${resultText}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Sunucu bağlantı hatası.', error: error.message });
    }
});

app.get('/api/checkSms/:activationId', async (req, res) => {
    const { activationId } = req.params;
    try {
        const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getStatus&id=${activationId}`);
        const resultText = response.data;

        if (resultText.startsWith('STATUS_OK')) {
            return res.json({ success: true, status: 'completed', code: resultText.split(':')[1] });
        } else if (resultText === 'STATUS_WAIT_CODE') {
            return res.json({ success: true, status: 'waiting', message: 'Kod bekleniyor...' });
        } else {
            return res.json({ success: true, status: resultText, message: resultText });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'SMS kontrol edilemedi.', error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnkaSMS - Premium SMS Onay Paneli</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #020617; color: #f8fafc; overflow-x: hidden; }
        .glass { background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(20px); border: 1px solid rgba(59, 130, 246, 0.15); }
        .glass-card { background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .glass-card:hover { transform: translateY(-4px); border-color: rgba(59, 130, 246, 0.4); box-shadow: 0 10px 30px -10px rgba(59, 130, 246, 0.2); }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-blue-500 selection:text-white">

    <!-- Header / Navigasyon -->
    <header class="glass sticky top-0 z-40 border-b border-blue-900/20 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3 cursor-pointer" onclick="location.reload()">
            <div class="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <i class="fa-solid fa-bolt text-white text-lg"></i>
            </div>
            <div>
                <span class="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">AnkaSMS</span>
                <span class="block text-[10px] text-blue-400 font-bold tracking-wider">PREMIUM PANEL</span>
            </div>
        </div>

        <div class="flex items-center space-x-3" id="nav-auth-area">
            <div class="glass px-3.5 py-2 rounded-xl flex items-center space-x-2 text-xs border-blue-500/20">
                <i class="fa-solid fa-wallet text-emerald-400"></i>
                <span class="text-slate-400">Bakiye:</span>
                <span id="customer-balance" class="font-extrabold text-emerald-400">250.00 TL</span>
            </div>
            <button onclick="openDepositModal()" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30">
                <i class="fa-solid fa-plus mr-1"></i> Bakiye Yükle
            </button>
            <button onclick="openAuthModal('login')" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition border border-slate-700">
                <i class="fa-solid fa-user mr-1"></i> <span id="user-profile-text">Giriş Yap</span>
            </button>
        </div>
    </header>

    <!-- Ana İçerik -->
    <main class="max-w-6xl mx-auto px-4 py-8 w-full flex-grow">
        <!-- Banner / Hoşgeldin -->
        <div class="relative overflow-hidden glass p-8 rounded-3xl mb-10 border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-indigo-950/40">
            <div class="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-white mb-2">Hızlı ve Güvenilir SMS Onay Servisi 🚀</h1>
            <p class="text-xs sm:text-sm text-slate-400 max-w-xl">WhatsApp, Telegram, Letgo ve onlarca farklı platform için anında sanal numara kiralayın, SMS kodlarınızı saniyeler içinde görüntüleyin.</p>
        </div>

        <!-- Ürünler (Ayrı Ayrı Kartlar) Başlığı -->
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-bold text-white flex items-center space-x-2">
                <i class="fa-solid fa-boxes-stacked text-blue-500"></i>
                <span>Aktif Servisler ve Ürünler</span>
            </h2>
            <span class="text-xs text-slate-400">Güncel fiyatlandırma</span>
        </div>

        <!-- Ürünler Grid Listesi -->
        <div id="services-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-10">
            <!-- Dinamik doldurulacak -->
        </div>

        <!-- Sonuç / Gelen Kod Paneli -->
        <div id="result-box" class="hidden glass p-6 rounded-2xl border border-emerald-500/30 animate-fade">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-base font-bold text-emerald-400 flex items-center space-x-2">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>Numara Başarıyla Tahsis Edildi</span>
                </h3>
                <span id="res-id" class="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg">ID: #0</span>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div class="bg-slate-900/80 p-4 rounded-xl border border-blue-500/20">
                    <span class="text-[11px] text-slate-400 block mb-1">Telefon Numaranız:</span>
                    <div id="res-phone" class="text-xl font-extrabold text-white font-mono tracking-wide">+90 ...</div>
                </div>
                <div class="bg-slate-900/80 p-4 rounded-xl border border-blue-500/20">
                    <span class="text-[11px] text-slate-400 block mb-1">Gelen SMS Kodu:</span>
                    <div id="res-code" class="text-xl font-extrabold text-blue-400 font-mono animate-pulse">Kod bekleniyor...</div>
                </div>
            </div>
            <button onclick="document.getElementById('result-box').classList.add('hidden')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-xs transition">Pencereyi Kapat</button>
        </div>
    </main>

    <!-- Giriş / Kayıt Animasyonlu Modal -->
    <div id="auth-modal" class="fixed inset-0 z-50 hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-3xl p-8 border border-blue-500/30 relative animate-fade shadow-2xl shadow-blue-500/10">
            <button onclick="closeAuthModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>
            
            <div class="flex space-x-2 mb-6 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                <button onclick="switchAuthTab('login')" id="tab-login-btn" class="flex-1 py-2 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-lg shadow-blue-600/30">Giriş Yap</button>
                <button onclick="switchAuthTab('register')" id="tab-register-btn" class="flex-1 py-2 rounded-xl text-xs font-bold transition text-slate-400 hover:text-white">Kayıt Ol</button>
            </div>

            <!-- Giriş Formu -->
            <form id="login-form" onsubmit="handleLogin(event)" class="space-y-4">
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">E-posta Adresi</label>
                    <input type="email" id="login-email" required class="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">Şifre</label>
                    <input type="password" id="login-password" required class="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-blue-600/20">Giriş Yap</button>
            </form>

            <!-- Kayıt Formu -->
            <form id="register-form" onsubmit="handleRegister(event)" class="space-y-4 hidden">
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">Ad Soyad</label>
                    <input type="text" id="reg-name" required class="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">E-posta Adresi</label>
                    <input type="email" id="reg-email" required class="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">Şifre Belirle</label>
                    <input type="password" id="reg-password" required class="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-emerald-600/20">Kayıt Ol ve 50 TL Kazan</button>
            </form>
        </div>
    </div>

    <!-- Bakiye Yükleme Modalı -->
    <div id="deposit-modal" class="fixed inset-0 z-50 hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-3xl p-8 border border-blue-500/30 relative animate-fade">
            <button onclick="closeDepositModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-base font-bold text-white mb-2"><i class="fa-solid fa-wallet text-blue-500 mr-2"></i> Bakiye Yükleme Bilgileri</h3>
            <p class="text-xs text-slate-400 mb-4">Aşağıdaki IBAN/Papara adresine ödeme yaptıktan sonra bildirim gönderin:</p>
            
            <div class="bg-slate-900/90 p-4 rounded-2xl border border-blue-500/20 mb-4 space-y-2 text-xs">
                <div class="flex justify-between"><span class="text-slate-400">Alıcı Adı:</span> <span class="font-bold text-emerald-400 text-sm">Arda Sakla</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Banka / Papara:</span> <span class="font-semibold text-white">Ziraat Bankası / Papara</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Papara / IBAN No:</span> <span class="font-mono text-blue-300 font-bold">TR36 0001 0020 3040 5060 7080 90</span></div>
            </div>

            <div class="space-y-3">
                <input type="text" id="dep-name" placeholder="Gönderen Adınız Soyadınız" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white">
                <input type="number" id="dep-amount" placeholder="Yatırılan Tutar (TL)" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white">
                <button onclick="sendDepositNotice()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-emerald-600/20">Ödeme Bildirimi Gönder</button>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="glass border-t border-blue-900/20 text-center py-6 text-xs text-slate-500">
        &copy; 2026 AnkaSMS - Tüm Hakları Saklıdır.
    </footer>

    <script>
        let currentUserEmail = localStorage.getItem('ankasms_user') || 'musteri@gmail.com';

        async function fetchInitialData() {
            try {
                // Servisleri yükle
                const sRes = await fetch('/api/getServices');
                const sJson = await sRes.json();
                if(sJson.success) {
                    const grid = document.getElementById('services-grid');
                    grid.innerHTML = sJson.services.map(s => \`
                        <div class="glass-card p-5 rounded-2xl flex flex-col justify-between \${s.border}">
                            <div>
                                <div class="flex items-center justify-between mb-3">
                                    <div class="w-12 h-12 \${s.bg} rounded-2xl flex items-center justify-center \${s.color} text-xl border border-white/5">
                                        <i class="fa-brands \${s.icon}"></i>
                                    </div>
                                    <span class="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">\${s.price} TL</span>
                                </div>
                                <h3 class="text-base font-bold text-white mb-1">\${s.name}</h3>
                                <p class="text-[11px] text-slate-400 mb-4">Anında hat tahsisi ve hızlı SMS doğrulama kodu alımı.</p>
                            </div>
                            <button onclick="buyNumber('\${s.id}')" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-blue-600/20">
                                <i class="fa-solid fa-cart-shopping mr-1.5"></i> Satın Al
                            </button>
                        </div>
                    \`).join('');
                }

                // Bakiye ve kullanıcı adı güncelle
                const bRes = await fetch(\`/api/getCustomerBalance?email=\${currentUserEmail}\`);
                const bJson = await bRes.json();
                if(bJson.success) {
                    document.getElementById('customer-balance').innerText = bJson.balance.toFixed(2) + ' TL';
                    if(bJson.name) document.getElementById('user-profile-text').innerText = bJson.name;
                }
            } catch(e) { console.error(e); }
        }
        fetchInitialData();

        let checkInterval = null;

        async function buyNumber(serviceId) {
            if(!confirm(serviceId.toUpperCase() + ' servisi için numara satın almak istiyor musunuz?')) return;
            
            alert('Numara talep ediliyor, lütfen bekleyin...');
            try {
                const res = await fetch('/api/buyNumber', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ service: serviceId, country: 0, email: currentUserEmail })
                });
                const json = await res.json();

                if(json.success) {
                    document.getElementById('result-box').classList.remove('hidden');
                    document.getElementById('res-phone').innerText = json.phoneNumber;
                    document.getElementById('res-id').innerText = '#' + json.activationId;
                    document.getElementById('customer-balance').innerText = json.remainingBalance.toFixed(2) + ' TL';
                    
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

                    if(checkInterval) clearInterval(checkInterval);
                    checkInterval = setInterval(() => checkSmsCode(json.activationId), 3000);
                } else {
                    alert('Hata: ' + json.message);
                }
            } catch(e) {
                alert('Bağlantı hatası!');
            }
        }

        async function checkSmsCode(activationId) {
            try {
                const res = await fetch(\`/api/checkSms/\${activationId}\`);
                const json = await res.json();
                if(json.success && json.status === 'completed') {
                    document.getElementById('res-code').innerText = json.code;
                    clearInterval(checkInterval);
                    alert('Tebrikler! SMS Kodunuz başarıyla geldi.');
                }
            } catch(e) { console.error(e); }
        }

        // Modal Fonksiyonları
        function openAuthModal(tab) {
            document.getElementById('auth-modal').classList.remove('hidden');
            switchAuthTab(tab);
        }
        function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }
        
        function switchAuthTab(tab) {
            const loginBtn = document.getElementById('tab-login-btn');
            const regBtn = document.getElementById('tab-register-btn');
            const loginForm = document.getElementById('login-form');
            const regForm = document.getElementById('register-form');

            if(tab === 'login') {
                loginBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-lg shadow-blue-600/30";
                regBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition text-slate-400 hover:text-white";
                loginForm.classList.remove('hidden');
                regForm.classList.add('hidden');
            } else {
                regBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition bg-emerald-600 text-white shadow-lg shadow-emerald-600/30";
                loginBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition text-slate-400 hover:text-white";
                regForm.classList.remove('hidden');
                loginForm.classList.add('hidden');
            }
        }

        async function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const json = await res.json();
            if(json.success) {
                currentUserEmail = json.email;
                localStorage.setItem('ankasms_user', currentUserEmail);
                alert(json.message);
                closeAuthModal();
                fetchInitialData();
            } else {
                alert(json.message);
            }
        }

        async function handleRegister(e) {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;

            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const json = await res.json();
            if(json.success) {
                currentUserEmail = json.email;
                localStorage.setItem('ankasms_user', currentUserEmail);
                alert(json.message);
                closeAuthModal();
                fetchInitialData();
            } else {
                alert(json.message);
            }
        }

        function openDepositModal() { document.getElementById('deposit-modal').classList.remove('hidden'); }
        function closeDepositModal() { document.getElementById('deposit-modal').classList.add('hidden'); }
        function sendDepositNotice() {
            const name = document.getElementById('dep-name').value;
            const amount = document.getElementById('dep-amount').value;
            if(!name || !amount) { alert('Lütfen tüm alanları doldurun.'); return; }
            alert('Ödeme bildiriminiz Arda Sakla adına başarıyla iletildi. Admin onayından sonra bakiyenize yansıtılacaktır.');
            closeDepositModal();
        }
    </script>
</body>
</html>`);
});

app.listen(PORT, () => {
    console.log('Sunucu calisiyor, port:', PORT);
});
