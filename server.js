const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_KEY = process.env.API_KEY || 'osms_24a366588a5adf689da78bd656ef845effba51b53754bf57';
const API_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';

// Veritabanı ve kullanıcı simülasyonu (Bakiyelerin karışmaması için her kullanıcıya özel)
let users = {
    "musteri@gmail.com": { balance: 350.00, name: "Resul Sakal", password: "123" }
};

// İstediğin Ürünler, Ülke Kodları ve Fiyatlar (OnaylaSMS uyumlu)
const services = [
    { id: "wa_tr", service: "wa", country: "1", name: "WhatsApp Türkiye", price: 300, icon: "fa-whatsapp", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40" },
    { id: "tg_tr", service: "tg", country: "1", name: "Telegram Türkiye", price: 220, icon: "fa-telegram", color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/40" },
    { id: "tg_usa", service: "tg", country: "18", name: "Telegram ABD", price: 150, icon: "fa-telegram", color: "text-indigo-400", bg: "bg-indigo-500/15", border: "border-indigo-500/40" },
    { id: "wa_ph", service: "wa", country: "4", name: "WhatsApp Philippines", price: 150, icon: "fa-whatsapp", color: "text-teal-400", bg: "bg-teal-500/15", border: "border-teal-500/40" },
    { id: "wa_uk", service: "wa", country: "2", name: "WhatsApp İngiltere", price: 150, icon: "fa-whatsapp", color: "text-cyan-400", bg: "bg-cyan-500/15", border: "border-cyan-500/40" }
];

app.get('/api/getServices', (req, res) => {
    res.json({ success: true, services });
});

app.get('/api/getCustomerBalance', (req, res) => {
    const email = req.query.email || "musteri@gmail.com";
    if (!users[email]) {
        users[email] = { balance: 50.00, name: "Kullanıcı", password: "123" };
    }
    res.json({ success: true, balance: users[email].balance, name: users[email].name });
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
    users[email] = { name, password, balance: 50.00 }; // 50 TL hoşgeldin bonusu
    res.json({ success: true, message: 'Kayıt başarılı! 50 TL bonus eklendi.', email, name, balance: 50.00 });
});

// Numara Satın Alma Altyapısı (OnaylaSMS)
app.post('/api/buyNumber', async (req, res) => {
    const { productKey, email } = req.body;
    const userEmail = email || "musteri@gmail.com";
    
    if (!users[userEmail]) {
        return res.status(400).json({ success: false, message: 'Oturum bulunamadı. Lütfen giriş yapın.' });
    }

    const product = services.find(s => s.id === productKey);
    if (!product) {
        return res.status(400).json({ success: false, message: 'Ürün bulunamadı.' });
    }

    if (users[userEmail].balance < product.price) {
        return res.status(400).json({ 
            success: false, 
            message: `Bakiyeniz yetersiz! Bu ürün ${product.price} TL, sizin bakiyeniz ${users[userEmail].balance.toFixed(2)} TL.` 
        });
    }

    try {
        const apiCallUrl = `${API_URL}?api_key=${API_KEY}&action=getNumber&service=${product.service}&country=${product.country}`;
        const response = await axios.get(apiCallUrl);
        const resultText = response.data;

        if (resultText.startsWith('ACCESS_NUMBER')) {
            users[userEmail].balance -= product.price;
            const parts = resultText.split(':');
            return res.json({
                success: true,
                activationId: parts[1],
                phoneNumber: parts[2],
                remainingBalance: users[userEmail].balance,
                productName: product.name,
                message: 'Numara başarıyla alındı!'
            });
        } else {
            return res.status(400).json({ success: false, message: `OnaylaSMS Tedarikçi Hatası: ${resultText}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Sunucu bağlantı hatası.', error: error.message });
    }
});

// SMS Kontrol Endpoint'i
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
    <title>AnkaSMS - 4K Premium SMS Paneli</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #030712; color: #f8fafc; overflow-x: hidden; }
        .glass { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(24px); border: 1px solid rgba(59, 130, 246, 0.2); }
        .glass-card { background: rgba(30, 41, 59, 0.55); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.07); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .glass-card:hover { transform: translateY(-6px); border-color: rgba(59, 130, 246, 0.6); box-shadow: 0 20px 40px -15px rgba(59, 130, 246, 0.3); }
        @keyframes modalAnim { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal { animation: modalAnim 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        .animate-glow { animation: glow 4s ease-in-out infinite; }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white">

    <!-- Header -->
    <header class="glass sticky top-0 z-40 border-b border-blue-900/30 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3 cursor-pointer" onclick="location.reload()">
            <div class="w-11 h-11 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
                <i class="fa-solid fa-bolt text-white text-xl"></i>
            </div>
            <div>
                <span class="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">AnkaSMS</span>
                <span class="block text-[10px] text-blue-400 font-extrabold tracking-widest">4K PREMIUM ALTYAPI</span>
            </div>
        </div>

        <div class="flex items-center space-x-3">
            <div class="glass px-4 py-2 rounded-2xl flex items-center space-x-2 text-xs border-blue-500/30 shadow-inner">
                <i class="fa-solid fa-wallet text-emerald-400"></i>
                <span class="text-slate-400">Bakiye:</span>
                <span id="customer-balance" class="font-extrabold text-emerald-400 text-sm">0.00 TL</span>
            </div>
            <button onclick="openDepositModal()" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-lg shadow-blue-600/30">
                <i class="fa-solid fa-plus mr-1"></i> Bakiye Yükle
            </button>
            <button onclick="openAuthModal()" class="glass hover:bg-slate-800 text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold transition border border-slate-700 flex items-center space-x-1.5">
                <i class="fa-solid fa-user-circle text-blue-400 text-sm"></i>
                <span id="user-profile-text">Giriş / Kayıt</span>
            </button>
        </div>
    </header>

    <!-- Main -->
    <main class="max-w-6xl mx-auto px-4 py-10 w-full flex-grow">
        <div class="relative overflow-hidden glass p-8 sm:p-10 rounded-3xl mb-12 border border-blue-500/30 bg-gradient-to-r from-blue-950/50 via-slate-900/80 to-indigo-950/50 shadow-2xl">
            <div class="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none animate-glow"></div>
            <h1 class="text-2xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">Anında Sanal Numara ve SMS Onay</h1>
            <p class="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">OnaylaSMS altyapısı ile tamamen otomatik çalışan sistemimizden dilediğiniz ülkeyi ve servisi seçerek anında numara kiralayın, SMS kodunuzu canlı olarak ekranda görün.</p>
        </div>

        <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-extrabold text-white flex items-center space-x-2">
                <i class="fa-solid fa-globe text-blue-500"></i>
                <span>Özel Ürün ve Ülke Seçenekleri</span>
            </h2>
            <span class="text-xs text-blue-400 font-semibold bg-blue-500/10 px-3 py-1 rounded-xl border border-blue-500/20">Canlı Stok</span>
        </div>

        <!-- Ürünler Listesi -->
        <div id="services-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
            <!-- Dinamik yüklenecek -->
        </div>
    </main>

    <!-- SATIN ALMA VE KOD TAKİP PANELİ (MODAL) -->
    <div id="order-modal" class="fixed inset-0 z-50 hidden bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-lg rounded-3xl p-8 border border-blue-500/40 relative animate-modal shadow-2xl">
            <button onclick="closeOrderModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-9 h-9 rounded-2xl bg-slate-800/80 flex items-center justify-center transition border border-slate-700"><i class="fa-solid fa-xmark text-sm"></i></button>
            
            <div id="order-step-1">
                <div class="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 text-xl mb-4 border border-blue-500/30">
                    <i class="fa-solid fa-cart-shopping"></i>
                </div>
                <h3 id="modal-product-title" class="text-xl font-extrabold text-white mb-2">Ürün Adı</h3>
                <p class="text-xs text-slate-400 mb-6">Seçtiğiniz ülke ve servis için OnaylaSMS üzerinden anında hat tahsis edilecektir.</p>
                
                <div class="bg-slate-900/90 p-4 rounded-2xl border border-blue-500/20 mb-6 space-y-2.5 text-xs">
                    <div class="flex justify-between"><span class="text-slate-400">Ürün Fiyatı:</span> <span id="modal-product-price" class="font-extrabold text-emerald-400 text-sm">0 TL</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Güncel Bakiyeniz:</span> <span id="modal-user-balance" class="font-extrabold text-white">0 TL</span></div>
                </div>

                <button id="confirm-buy-btn" onclick="executeBuy()" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-3.5 rounded-2xl text-xs transition shadow-xl shadow-blue-600/30">
                    Numarayı Satın Al ve Kodu Bekle
                </button>
            </div>

            <!-- Sonuç ve Kod Ekranı -->
            <div id="order-step-2" class="hidden space-y-5">
                <div class="flex items-center space-x-3.5 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl">
                    <div class="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 text-lg flex-shrink-0">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-emerald-400">Numara Başarıyla Tahsis Edildi!</h4>
                        <p class="text-[11px] text-slate-300">İşlem ID: <span id="res-id" class="font-mono text-white font-bold">#0</span></p>
                    </div>
                </div>

                <div class="bg-slate-900/90 p-4 rounded-2xl border border-blue-500/30">
                    <span class="text-[11px] text-slate-400 block mb-1.5">Telefon Numaranız:</span>
                    <div class="flex items-center justify-between">
                        <div id="res-phone" class="text-2xl font-extrabold text-white font-mono tracking-wide">+90 ...</div>
                        <button onclick="navigator.clipboard.writeText(document.getElementById('res-phone').innerText); alert('Numara kopyalandı!');" class="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-3.5 py-2 rounded-xl text-xs font-bold transition">Kopyala</button>
                    </div>
                </div>

                <div class="bg-slate-900/90 p-4 rounded-2xl border border-blue-500/30 text-center">
                    <span class="text-[11px] text-slate-400 block mb-1">Gelen SMS Onay Kodu:</span>
                    <div id="res-code" class="text-3xl font-extrabold text-blue-400 font-mono tracking-widest animate-pulse py-2">Kod bekleniyor...</div>
                    <span class="text-[10px] text-slate-500 block mt-1">Kod geldiğinde otomatik olarak ekrana yansıtılacaktır.</span>
                </div>

                <button onclick="closeOrderModal(); location.reload();" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-2xl text-xs transition font-bold border border-slate-700">Pencereyi Kapat</button>
            </div>
        </div>
    </div>

    <!-- 4K ANİMASYONLU GİRİŞ / KAYIT MODALI -->
    <div id="auth-modal" class="fixed inset-0 z-50 hidden bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-3xl p-8 border border-blue-500/40 relative animate-modal shadow-2xl overflow-hidden">
            <div class="absolute -top-12 -left-12 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <button onclick="closeAuthModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-9 h-9 rounded-2xl bg-slate-800/80 flex items-center justify-center transition border border-slate-700"><i class="fa-solid fa-xmark text-sm"></i></button>
            
            <div class="flex space-x-2 mb-6 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
                <button onclick="switchAuthTab('login')" id="tab-login-btn" class="flex-1 py-2.5 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-lg shadow-blue-600/30">Giriş Yap</button>
                <button onclick="switchAuthTab('register')" id="tab-register-btn" class="flex-1 py-2.5 rounded-xl text-xs font-bold transition text-slate-400 hover:text-white">Kayıt Ol</button>
            </div>

            <!-- Giriş Formu -->
            <form id="login-form" onsubmit="handleLogin(event)" class="space-y-4">
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">E-posta Adresi</label>
                    <input type="email" id="login-email" required class="w-full bg-slate-900/90 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">Şifre</label>
                    <input type="password" id="login-password" required class="w-full bg-slate-900/90 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <button type="submit" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-3.5 rounded-2xl text-xs transition shadow-xl shadow-blue-600/30">Giriş Yap</button>
            </form>

            <!-- Kayıt Formu -->
            <form id="register-form" onsubmit="handleRegister(event)" class="space-y-4 hidden">
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">Ad Soyad</label>
                    <input type="text" id="reg-name" required class="w-full bg-slate-900/90 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">E-posta Adresi</label>
                    <input type="email" id="reg-email" required class="w-full bg-slate-900/90 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">Şifre Belirle</label>
                    <input type="password" id="reg-password" required class="w-full bg-slate-900/90 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <button type="submit" class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 rounded-2xl text-xs transition shadow-xl shadow-emerald-600/30">Kayıt Ol ve 50 TL Kazan</button>
            </form>
        </div>
    </div>

    <!-- Bakiye Yükleme Modalı (Garanti Bankası - Resul Sakal) -->
    <div id="deposit-modal" class="fixed inset-0 z-50 hidden bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-3xl p-8 border border-blue-500/40 relative animate-modal shadow-2xl">
            <button onclick="closeDepositModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-9 h-9 rounded-2xl bg-slate-800/80 flex items-center justify-center transition border border-slate-700"><i class="fa-solid fa-xmark text-sm"></i></button>
            <h3 class="text-base font-extrabold text-white mb-2 flex items-center space-x-2">
                <i class="fa-solid fa-wallet text-blue-500"></i>
                <span>Bakiye Yükleme Bilgileri</span>
            </h3>
            <p class="text-xs text-slate-400 mb-5">Ödemenizi aşağıdaki hesaba yaptıktan sonra bildirim gönderin:</p>
            
            <div class="bg-slate-900/90 p-5 rounded-2xl border border-blue-500/30 mb-5 space-y-3 text-xs">
                <div class="flex justify-between items-center"><span class="text-slate-400">Alıcı Adı:</span> <span class="font-extrabold text-emerald-400 text-sm">Resul Sakal</span></div>
                <div class="flex justify-between items-center"><span class="text-slate-400">Banka:</span> <span class="font-bold text-white">Garanti Bankası</span></div>
                <div class="flex justify-between items-center pt-2 border-t border-slate-800"><span class="text-slate-400">IBAN:</span> <span id="iban-text" class="font-mono text-blue-300 font-extrabold text-xs">TR62 0006 2000 5000 0006 8107 73</span></div>
            </div>
            <button onclick="navigator.clipboard.writeText('TR620006200050000006810773'); alert('IBAN kopyalandı!');" class="w-full mb-4 bg-slate-800 hover:bg-slate-700 text-blue-400 py-2.5 rounded-xl text-xs font-bold transition border border-slate-700">IBAN'ı Kopyala</button>

            <div class="space-y-3">
                <input type="text" id="dep-name" placeholder="Gönderen Adınız Soyadınız" class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <input type="number" id="dep-amount" placeholder="Yatırılan Tutar (TL)" class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <button onclick="sendDepositNotice()" class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 rounded-2xl text-xs transition shadow-xl shadow-emerald-600/30">Ödeme Bildirimi Gönder</button>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="glass border-t border-blue-900/30 text-center py-6 text-xs text-slate-500">
        &copy; 2026 AnkaSMS - Tüm Hakları Saklıdır.
    </footer>

    <script>
        let currentUserEmail = localStorage.getItem('ankasms_user') || 'musteri@gmail.com';
        let selectedProductData = null;
        let currentBalance = 0;

        async function fetchInitialData() {
            try {
                const sRes = await fetch('/api/getServices');
                const sJson = await sRes.json();
                if(sJson.success) {
                    const grid = document.getElementById('services-grid');
                    grid.innerHTML = sJson.services.map(s => \`
                        <div class="glass-card p-6 rounded-3xl flex flex-col justify-between \${s.border}">
                            <div>
                                <div class="flex items-center justify-between mb-4">
                                    <div class="w-14 h-14 \${s.bg} rounded-2xl flex items-center justify-center \${s.color} text-2xl border border-white/5 shadow-inner">
                                        <i class="fa-brands \${s.icon}"></i>
                                    </div>
                                    <span class="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">\${s.price} TL</span>
                                </div>
                                <h3 class="text-base font-extrabold text-white mb-1.5">\${s.name}</h3>
                                <p class="text-[11px] text-slate-400 mb-6 leading-relaxed">OnaylaSMS altyapısı ile anında numara tahsisi ve canlı SMS kod takibi.</p>
                            </div>
                            <button onclick='openOrderModal(\${JSON.stringify(s)})' class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-3 rounded-2xl text-xs transition shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2">
                                <i class="fa-solid fa-cart-shopping"></i>
                                <span>Satın Al</span>
                            </button>
                        </div>
                    \`).join('');
                }

                const bRes = await fetch(\`/api/getCustomerBalance?email=\${currentUserEmail}\`);
                const bJson = await bRes.json();
                if(bJson.success) {
                    currentBalance = bJson.balance;
                    document.getElementById('customer-balance').innerText = currentBalance.toFixed(2) + ' TL';
                    if(bJson.name) document.getElementById('user-profile-text').innerText = bJson.name;
                }
            } catch(e) { console.error(e); }
        }
        fetchInitialData();

        let checkInterval = null;

        function openOrderModal(product) {
            selectedProductData = product;
            document.getElementById('modal-product-title').innerText = product.name + ' Satın Al';
            document.getElementById('modal-product-price').innerText = product.price + ' TL';
            document.getElementById('modal-user-balance').innerText = currentBalance.toFixed(2) + ' TL';
            
            document.getElementById('order-step-1').classList.remove('hidden');
            document.getElementById('order-step-2').classList.add('hidden');
            document.getElementById('order-modal').classList.remove('hidden');
        }

        function closeOrderModal() {
            document.getElementById('order-modal').classList.add('hidden');
            if(checkInterval) clearInterval(checkInterval);
        }

        async function executeBuy() {
            const btn = document.getElementById('confirm-buy-btn');
            btn.innerText = 'Numara Alınıyor, Lütfen Bekleyin...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/buyNumber', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productKey: selectedProductData.id, email: currentUserEmail })
                });
                const json = await res.json();

                if(json.success) {
                    document.getElementById('order-step-1').classList.add('hidden');
                    document.getElementById('order-step-2').classList.remove('hidden');
                    
                    document.getElementById('res-phone').innerText = json.phoneNumber;
                    document.getElementById('res-id').innerText = '#' + json.activationId;
                    document.getElementById('customer-balance').innerText = json.remainingBalance.toFixed(2) + ' TL';
                    currentBalance = json.remainingBalance;

                    if(checkInterval) clearInterval(checkInterval);
                    checkInterval = setInterval(() => checkSmsCode(json.activationId), 3000);
                } else {
                    alert('Hata: ' + json.message);
                    btn.innerText = 'Numarayı Satın Al ve Kodu Bekle';
                    btn.disabled = false;
                }
            } catch(e) {
                alert('Bağlantı hatası!');
                btn.innerText = 'Numarayı Satın Al ve Kodu Bekle';
                btn.disabled = false;
            }
        }

        async function checkSmsCode(activationId) {
            try {
                const res = await fetch(\`/api/checkSms/\${activationId}\`);
                const json = await res.json();
                if(json.success && json.status === 'completed') {
                    document.getElementById('res-code').innerText = json.code;
                    clearInterval(checkInterval);
                    alert('Tebrikler! SMS Onay Kodunuz başarıyla geldi.');
                }
            } catch(e) { console.error(e); }
        }

        function openAuthModal() { document.getElementById('auth-modal').classList.remove('hidden'); }
        function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }
        
        function switchAuthTab(tab) {
            const loginBtn = document.getElementById('tab-login-btn');
            const regBtn = document.getElementById('tab-register-btn');
            const loginForm = document.getElementById('login-form');
            const regForm = document.getElementById('register-form');

            if(tab === 'login') {
                loginBtn.className = "flex-1 py-2.5 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-lg shadow-blue-600/30";
                regBtn.className = "flex-1 py-2.5 rounded-xl text-xs font-bold transition text-slate-400 hover:text-white";
                loginForm.classList.remove('hidden');
                regForm.classList.add('hidden');
            } else {
                regBtn.className = "flex-1 py-2.5 rounded-xl text-xs font-bold transition bg-emerald-600 text-white shadow-lg shadow-emerald-600/30";
                loginBtn.className = "flex-1 py-2.5 rounded-xl text-xs font-bold transition text-slate-400 hover:text-white";
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
            } else { alert(json.message); }
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
            } else { alert(json.message); }
        }

        function openDepositModal() { document.getElementById('deposit-modal').classList.remove('hidden'); }
        function closeDepositModal() { document.getElementById('deposit-modal').classList.add('hidden'); }
        function sendDepositNotice() {
            const name = document.getElementById('dep-name').value;
            const amount = document.getElementById('dep-amount').value;
            if(!name || !amount) { alert('Lütfen tüm alanları doldurun.'); return; }
            alert('Ödeme bildiriminiz Resul Sakal adına Garanti Bankası hesabına iletildi. Admin onayından sonra bakiyenize yansıtılacaktır.');
            closeDepositModal();
        }
    </script>
</body>
</html>`);
});

app.listen(PORT, () => {
    console.log('Sunucu calisiyor, port:', PORT);
});
