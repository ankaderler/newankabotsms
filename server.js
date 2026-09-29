const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_KEY = process.env.API_KEY || 'osms_24a366588a5adf689da78bd656ef845effba51b53754bf57';
const API_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';

// Telegram Bot Bilgilerin
const TELEGRAM_BOT_TOKEN = '8874989367:AAFLCBRvCV5UIP9JOQwpvY9ZzDLVSIKYIhM';
const TELEGRAM_CHAT_ID = '8964930489';

async function sendTelegramNotification(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('Telegram bildirim hatası:', error.message);
    }
}

// Veritabanı ve Bellek Yapıları
let users = {
    "aklomanti": { balance: 1500.00, password: "123" }
};

let visitorsCount = 0;
let recentVisitors = [];
let depositRequests = [];

// ANKA SMS HİZMETLERİ - Genişletilmiş Servis ve Ülke Kataloğu
const ankaCatalog = [
    // Türkiye
    { id: "wa_tr", service: "wa", country: "1", name: "WhatsApp Türkiye", price: 300, category: "Popüler", icon: "fa-whatsapp", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40" },
    { id: "tg_tr", service: "tg", country: "1", name: "Telegram Türkiye", price: 220, category: "Popüler", icon: "fa-telegram", color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/40" },
    { id: "ig_tr", service: "ig", country: "1", name: "Instagram Türkiye", price: 250, category: "Sosyal Medya", icon: "fa-instagram", color: "text-pink-400", bg: "bg-pink-500/15", border: "border-pink-500/40" },
    { id: "fb_tr", service: "fb", country: "1", name: "Facebook Türkiye", price: 180, category: "Sosyal Medya", icon: "fa-facebook", color: "text-blue-500", bg: "bg-blue-600/15", border: "border-blue-600/40" },
    { id: "tw_tr", service: "tw", country: "1", name: "Twitter / X Türkiye", price: 200, category: "Sosyal Medya", icon: "fa-twitter", color: "text-sky-400", bg: "bg-sky-500/15", border: "border-sky-500/40" },
    { id: "go_tr", service: "go", country: "1", name: "Google / Gmail Türkiye", price: 150, category: "Genel", icon: "fa-google", color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/40" },
    { id: "nf_tr", service: "nf", country: "1", name: "Netflix Türkiye", price: 280, category: "Eğlence", icon: "fa-film", color: "text-red-500", bg: "bg-red-600/15", border: "border-red-600/40" },
    { id: "bl_tr", service: "bl", country: "1", name: "Exxen / Blutv Türkiye", price: 190, category: "Eğlence", icon: "fa-tv", color: "text-violet-400", bg: "bg-violet-500/15", border: "border-violet-500/40" },
    { id: "tk_tr", service: "tk", country: "1", name: "TikTok Türkiye", price: 210, category: "Sosyal Medya", icon: "fa-tiktok", color: "text-white", bg: "bg-slate-700/50", border: "border-slate-600" },
    { id: "sn_tr", service: "sn", country: "1", name: "Snapchat Türkiye", price: 170, category: "Sosyal Medya", icon: "fa-snapchat", color: "text-yellow-400", bg: "bg-yellow-500/15", border: "border-yellow-500/40" },

    // ABD (Amerika Birleşik Devletleri)
    { id: "wa_usa", service: "wa", country: "18", name: "WhatsApp ABD", price: 140, category: "Yurtdışı", icon: "fa-whatsapp", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40" },
    { id: "tg_usa", service: "tg", country: "18", name: "Telegram ABD", price: 150, category: "Yurtdışı", icon: "fa-telegram", color: "text-indigo-400", bg: "bg-indigo-500/15", border: "border-indigo-500/40" },
    { id: "ig_usa", service: "ig", country: "18", name: "Instagram ABD", price: 130, category: "Yurtdışı", icon: "fa-instagram", color: "text-pink-400", bg: "bg-pink-500/15", border: "border-pink-500/40" },
    { id: "go_usa", service: "go", country: "18", name: "Google ABD", price: 100, category: "Yurtdışı", icon: "fa-google", color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/40" },

    // İngiltere
    { id: "wa_uk", service: "wa", country: "2", name: "WhatsApp İngiltere", price: 160, category: "Yurtdışı", icon: "fa-whatsapp", color: "text-cyan-400", bg: "bg-cyan-500/15", border: "border-cyan-500/40" },
    { id: "tg_uk", service: "tg", country: "2", name: "Telegram İngiltere", price: 170, category: "Yurtdışı", icon: "fa-telegram", color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/40" },

    // Filipinler
    { id: "wa_ph", service: "wa", country: "4", name: "WhatsApp Filipinler", price: 120, category: "Yurtdışı", icon: "fa-whatsapp", color: "text-teal-400", bg: "bg-teal-500/15", border: "border-teal-500/40" },
    { id: "tg_ph", service: "tg", country: "4", name: "Telegram Filipinler", price: 110, category: "Yurtdışı", icon: "fa-telegram", color: "text-teal-500", bg: "bg-teal-600/15", border: "border-teal-600/40" },

    // Endonezya & Rusya
    { id: "wa_id", service: "wa", country: "6", name: "WhatsApp Endonezya", price: 90, category: "Yurtdışı", icon: "fa-whatsapp", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40" },
    { id: "tg_ru", service: "tg", country: "0", name: "Telegram Rusya", price: 95, category: "Yurtdışı", icon: "fa-telegram", color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/40" }
];

app.use((req, res, next) => {
    if (req.path === '/' && req.method === 'GET') {
        visitorsCount++;
        recentVisitors.push({ ip: req.ip || '127.0.0.1', time: new Date().toLocaleTimeString('tr-TR') });
        if(recentVisitors.length > 20) recentVisitors.shift();
    }
    next();
});

app.get('/api/getServices', (req, res) => {
    res.json({ success: true, services: ankaCatalog });
});

app.get('/api/getCustomerBalance', (req, res) => {
    const username = req.query.username || "misafir";
    if (!users[username]) {
        return res.json({ success: true, balance: 0.00, name: username });
    }
    res.json({ success: true, balance: users[username].balance, name: username });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username].password === password) {
        res.json({ success: true, message: 'Giriş başarılı!', username, balance: users[username].balance });
    } else {
        res.status(400).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı!' });
    }
});

app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Lütfen tüm alanları doldurun.' });
    }
    if (users[username]) {
        return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten alınmış!' });
    }
    users[username] = { password, balance: 25.00 }; // 25 TL hoşgeldin bonusu
    res.json({ success: true, message: 'Kayıt başarılı! 25 TL bonus hesabınıza eklendi.', username, balance: 25.00 });
});

// Numara Satın Alma (Senin API Anahtarın Üzerinden)
app.post('/api/buyNumber', async (req, res) => {
    const { productKey, username } = req.body;
    
    if (!users[username]) {
        return res.status(400).json({ success: false, message: 'Oturum bulunamadı. Lütfen giriş yapın.' });
    }

    const product = ankaCatalog.find(s => s.id === productKey);
    if (!product) {
        return res.status(400).json({ success: false, message: 'Ürün bulunamadı.' });
    }

    if (users[username].balance < product.price) {
        return res.status(400).json({ 
            success: false, 
            message: `Bakiyeniz yetersiz! Bu ürün ${product.price} TL, sizin bakiyeniz ${users[username].balance.toFixed(2)} TL.` 
        });
    }

    try {
        const apiCallUrl = `${API_URL}?api_key=${API_KEY}&action=getNumber&service=${product.service}&country=${product.country}`;
        const response = await axios.get(apiCallUrl);
        const resultText = response.data;

        if (resultText.startsWith('ACCESS_NUMBER')) {
            users[username].balance -= product.price;
            const parts = resultText.split(':');
            return res.json({
                success: true,
                activationId: parts[1],
                phoneNumber: parts[2],
                remainingBalance: users[username].balance,
                productName: product.name,
                message: 'Numara başarıyla alındı!'
            });
        } else {
            return res.status(400).json({ success: false, message: `Sistem Tedarikçi Hatası: ${resultText}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Sunucu bağlantı hatası.', error: error.message });
    }
});

// SMS Takip
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

// Ödeme Bildirimi ve Telegram Bot Bildirimi
app.post('/api/deposit/notify', async (req, res) => {
    const { username, senderName, amount } = req.body;
    if (!senderName || !amount) {
        return res.status(400).json({ success: false, message: 'Bilgiler eksik.' });
    }

    const newDep = {
        id: Date.now(),
        username: username || 'Misafir',
        senderName,
        amount: parseFloat(amount),
        status: 'Bekliyor',
        time: new Date().toLocaleString('tr-TR')
    };

    depositRequests.push(newDep);

    const msg = `🔔 <b>ANKA SMS - YENİ ÖDEME BİLDİRİMİ!</b>\n\n` +
                `👤 <b>Kullanıcı:</b> ${newDep.username}\n` +
                `💳 <b>Gönderen:</b> ${newDep.senderName}\n` +
                `💰 <b>Tutar:</b> ${newDep.amount} TL\n` +
                `⏱ <b>Zaman:</b> ${newDep.time}\n\n` +
                `👉 Admin panelinden onaylayabilirsiniz!`;
    
    await sendTelegramNotification(msg);

    res.json({ success: true, message: 'Ödeme bildiriminiz başarıyla yetkiliye iletildi.' });
});

// Admin Paneli Verileri
app.get('/api/admin/data', (req, res) => {
    res.json({
        success: true,
        visitorsCount,
        recentVisitors,
        depositRequests,
        usersCount: Object.keys(users).length
    });
});

app.post('/api/admin/action', (req, res) => {
    const { password, actionId, decision } = req.body;
    if (password !== 'aklomanti') {
        return res.status(403).json({ success: false, message: 'Yetkisiz şifre!' });
    }

    const reqIndex = depositRequests.findIndex(d => d.id === actionId);
    if (reqIndex === -1) {
        return res.status(404).json({ success: false, message: 'Bildirim bulunamadı.' });
    }

    const dep = depositRequests[reqIndex];
    if (decision === 'approve') {
        if (users[dep.username]) {
            users[dep.username].balance += dep.amount;
        } else {
            users[dep.username] = { password: "123", balance: dep.amount };
        }
        dep.status = 'Onaylandı';
    } else {
        dep.status = 'Reddedildi';
    }

    res.json({ success: true, message: `İşlem başarıyla güncellendi: ${dep.status}` });
});

// Ana Sayfa HTML (ANKA CANLI SMS HİZMETLERİ + 4K INTRO ANİMASYONU)
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ANKA SMS HİZMETLERİ - Profesyonel SMS Onay Paneli</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #030712; color: #f8fafc; overflow-x: hidden; }
        .glass { background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(24px); border: 1px solid rgba(59, 130, 246, 0.2); }
        .glass-card { background: rgba(30, 41, 59, 0.55); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.07); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .glass-card:hover { transform: translateY(-6px); border-color: rgba(59, 130, 246, 0.6); box-shadow: 0 20px 40px -15px rgba(59, 130, 246, 0.3); }
        
        @keyframes modalAnim { from { opacity: 0; transform: scale(0.85) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal { animation: modalAnim 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes neonPulse { 0%, 100% { opacity: 0.3; transform: scale(1); filter: blur(40px); } 50% { opacity: 0.7; transform: scale(1.12); filter: blur(60px); } }
        .neon-bg-1 { animation: neonPulse 6s ease-in-out infinite; }
        .neon-bg-2 { animation: neonPulse 8s ease-in-out infinite reverse; }

        @keyframes floatAnim { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .support-float { animation: floatAnim 3s ease-in-out infinite; }

        /* INTRO SPLASH SCREEN */
        #splash-screen {
            position: fixed; inset: 0; z-index: 9999;
            background: #030712; display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            transition: opacity 0.8s ease, visibility 0.8s ease;
        }
        .splash-logo-box {
            width: 90px; height: 90px;
            background: linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6);
            border-radius: 30px; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 50px rgba(59, 130, 246, 0.6);
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white">

    <!-- 4K INTRO AÇILIŞ ANİMASYONU -->
    <div id="splash-screen">
        <div class="absolute w-96 h-96 bg-blue-600/20 rounded-full blur-3xl neon-bg-1"></div>
        <div class="splash-logo-box mb-6 relative z-10">
            <i class="fa-solid fa-feather text-white text-4xl"></i>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent relative z-10">ANKA SMS HİZMETLERİ</h1>
        <p class="text-xs text-slate-400 mt-2 tracking-widest uppercase relative z-10">Güvenli Altyapı Yükleniyor...</p>
    </div>

    <!-- Header -->
    <header class="glass sticky top-0 z-40 border-b border-blue-900/30 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3 cursor-pointer" onclick="location.reload()">
            <div class="w-11 h-11 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
                <i class="fa-solid fa-feather text-white text-xl"></i>
            </div>
            <div>
                <span class="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">ANKA SMS</span>
                <span class="block text-[10px] text-blue-400 font-extrabold tracking-widest">CANLI HİZMETLER</span>
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
                <span id="user-profile-text">Giriş / Kayıt Ol</span>
            </button>
            <button onclick="openAdminModal()" class="bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-2.5 rounded-2xl text-xs font-bold transition border border-amber-500/30" title="Admin Paneli">
                <i class="fa-solid fa-shield-halved"></i>
            </button>
        </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-4 py-10 w-full flex-grow">
        <div class="relative overflow-hidden glass p-8 sm:p-10 rounded-3xl mb-10 border border-blue-500/30 bg-gradient-to-r from-blue-950/50 via-slate-900/80 to-indigo-950/50 shadow-2xl">
            <div class="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none neon-bg-1"></div>
            <h1 class="text-2xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">ANKA CAİ SMS HİZMETLERİ</h1>
            <p class="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">Dünya genelinde yüzlerce platform için anında sanal numara kiralayın, SMS kodunuzu saniyeler içinde ekranda görün ve güvenle işlem yapın.</p>
        </div>

        <!-- Arama ve Kategori Filtreleme Çubuğu -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div class="relative w-full sm:w-96">
                <i class="fa-solid fa-search absolute left-4 top-3.5 text-slate-400 text-xs"></i>
                <input type="text" id="search-input" oninput="filterServices()" placeholder="Servis veya ülke ara (Örn: WhatsApp, Türkiye)..." class="w-full bg-slate-900/90 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition">
            </div>
            <div class="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0" id="category-filters">
                <button onclick="filterCategory('Tümü')" class="cat-btn bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0">Tümü</button>
                <button onclick="filterCategory('Popüler')" class="cat-btn bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0">Popüler</button>
                <button onclick="filterCategory('Sosyal Medya')" class="cat-btn bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0">Sosyal Medya</button>
                <button onclick="filterCategory('Yurtdışı')" class="cat-btn bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0">Yurtdışı</button>
                <button onclick="filterCategory('Eğlence')" class="cat-btn bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0">Eğlence</button>
            </div>
        </div>

        <!-- Ürünler Grid -->
        <div id="services-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
            <!-- Dinamik yüklenecek -->
        </div>
    </main>

    <!-- CANLI DESTEK BUTONU (@SMSPATRONUM) -->
    <a href="https://t.me/SMSPATRONUM" target="_blank" class="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-4 rounded-full shadow-2xl shadow-blue-500/50 flex items-center justify-center text-xl support-float border border-blue-400/40" title="Canlı Destek ile Bağlan">
        <i class="fa-brands fa-telegram"></i>
    </a>

    <!-- NUMARA SATIN ALMA VE KOD TAKİP MODALI -->
    <div id="order-modal" class="fixed inset-0 z-50 hidden bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-lg rounded-3xl p-8 border border-blue-500/40 relative animate-modal shadow-2xl">
            <button onclick="closeOrderModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-9 h-9 rounded-2xl bg-slate-800/80 flex items-center justify-center transition border border-slate-700"><i class="fa-solid fa-xmark text-sm"></i></button>
            
            <div id="order-step-1">
                <div class="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 text-xl mb-4 border border-blue-500/30">
                    <i class="fa-solid fa-cart-shopping"></i>
                </div>
                <h3 id="modal-product-title" class="text-xl font-extrabold text-white mb-2">Ürün Adı</h3>
                <p class="text-xs text-slate-400 mb-6">Seçtiğiniz ülke ve servis için anında hat tahsis edilecektir.</p>
                
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

    <!-- 4K NEON ANİMASYONLU GİRİŞ / KAYIT MODALI -->
    <div id="auth-modal" class="fixed inset-0 z-50 hidden bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-3xl p-8 border border-blue-500/40 relative animate-modal shadow-2xl overflow-hidden">
            <div class="absolute -top-16 -left-16 w-48 h-48 bg-blue-600/30 rounded-full blur-3xl pointer-events-none neon-bg-1"></div>
            <div class="absolute -bottom-16 -right-16 w-48 h-48 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none neon-bg-2"></div>
            
            <button onclick="closeAuthModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-9 h-9 rounded-2xl bg-slate-800/80 flex items-center justify-center transition border border-slate-700 z-10"><i class="fa-solid fa-xmark text-sm"></i></button>
            
            <div class="flex space-x-2 mb-6 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 relative z-10">
                <button onclick="switchAuthTab('login')" id="tab-login-btn" class="flex-1 py-2.5 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-lg shadow-blue-600/30">Giriş Yap</button>
                <button onclick="switchAuthTab('register')" id="tab-register-btn" class="flex-1 py-2.5 rounded-xl text-xs font-bold transition text-slate-400 hover:text-white">Kayıt Ol</button>
            </div>

            <!-- Giriş Formu -->
            <form id="login-form" onsubmit="handleLogin(event)" class="space-y-4 relative z-10">
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">Kullanıcı Adı</label>
                    <input type="text" id="login-username" required class="w-full bg-slate-900/90 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">Şifre</label>
                    <input type="password" id="login-password" required class="w-full bg-slate-900/90 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <button type="submit" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-3.5 rounded-2xl text-xs transition shadow-xl shadow-blue-600/30">Giriş Yap</button>
            </form>

            <!-- Kayıt Formu -->
            <form id="register-form" onsubmit="handleRegister(event)" class="space-y-4 relative z-10 hidden">
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">Kullanıcı Adı Seç</label>
                    <input type="text" id="reg-username" required class="w-full bg-slate-900/90 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1.5">Şifre Belirle</label>
                    <input type="password" id="reg-password" required class="w-full bg-slate-900/90 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition">
                </div>
                <button type="submit" class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 rounded-2xl text-xs transition shadow-xl shadow-emerald-600/30">Kayıt Ol ve 25 TL Kazan</button>
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
            <p class="text-xs text-slate-400 mb-5">Ödemenizi aşağıdaki Garanti Bankası hesabına yaptıktan sonra bildirim gönderin:</p>
            
            <div class="bg-slate-900/90 p-5 rounded-2xl border border-blue-500/30 mb-5 space-y-3 text-xs">
                <div class="flex justify-between items-center"><span class="text-slate-400">Alıcı Adı:</span> <span class="font-extrabold text-emerald-400 text-sm">Resul Sakal</span></div>
                <div class="flex justify-between items-center"><span class="text-slate-400">Banka:</span> <span class="font-bold text-white">Garanti Bankası</span></div>
                <div class="flex justify-between items-center pt-2 border-t border-slate-800"><span class="text-slate-400">IBAN:</span> <span id="iban-text" class="font-mono text-blue-300 font-extrabold text-xs">TR62 0006 2000 5000 0006 8107 73</span></div>
            </div>
            <button onclick="navigator.clipboard.writeText('TR620006200050000006810773'); alert('IBAN kopyalandı!');" class="w-full mb-4 bg-slate-800 hover:bg-slate-700 text-blue-400 py-2.5 rounded-xl text-xs font-bold transition border border-slate-700">IBAN'ı Kopyala</button>

            <div class="space-y-3">
                <input type="text" id="dep-sender" placeholder="Gönderen Adınız Soyadınız" class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <input type="number" id="dep-amount" placeholder="Yatırılan Tutar (TL)" class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <button onclick="sendDepositNotice()" class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 rounded-2xl text-xs transition shadow-xl shadow-emerald-600/30">Ödeme Bildirimi Gönder</button>
            </div>
        </div>
    </div>

    <!-- ADMIN PANELİ MODALI -->
    <div id="admin-modal" class="fixed inset-0 z-50 hidden bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-4xl rounded-3xl p-6 sm:p-8 border border-amber-500/40 relative animate-modal shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onclick="closeAdminModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-9 h-9 rounded-2xl bg-slate-800/80 flex items-center justify-center transition border border-slate-700"><i class="fa-solid fa-xmark text-sm"></i></button>
            
            <div id="admin-login-screen">
                <div class="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 text-xl mb-4 border border-amber-500/30">
                    <i class="fa-solid fa-shield-halved"></i>
                </div>
                <h3 class="text-xl font-extrabold text-white mb-2">Admin Paneli Girişi</h3>
                <p class="text-xs text-slate-400 mb-6">Yönetici şifrenizi (aklomanti) girerek finans ve ziyaretçi raporlarına ulaşın.</p>
                <div class="space-y-4 max-w-sm">
                    <input type="password" id="admin-pass-input" placeholder="Admin Şifresi" class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                    <button onclick="loadAdminPanel()" class="w-full bg-amber-600 hover:bg-amber-500 text-white font-extrabold py-3.5 rounded-2xl text-xs transition shadow-lg shadow-amber-600/30">Paneli Aç</button>
                </div>
            </div>

            <div id="admin-dashboard" class="hidden space-y-6">
                <div class="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                        <h3 class="text-xl font-extrabold text-amber-400 flex items-center space-x-2">
                            <i class="fa-solid fa-gauge-high"></i>
                            <span>ANKA SMS - Admin Yönetim Paneli</span>
                        </h3>
                        <p class="text-xs text-slate-400">Canlı ziyaretçiler, bekleyen ödemeler ve finansal kontroller.</p>
                    </div>
                    <button onclick="document.getElementById('admin-dashboard').classList.add('hidden'); document.getElementById('admin-login-screen').classList.remove('hidden');" class="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700">Çıkış</button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="bg-slate-900/80 p-4 rounded-2xl border border-blue-500/20">
                        <span class="text-xs text-slate-400 block mb-1">Toplam Ziyaretçi</span>
                        <span id="adm-vis-count" class="text-2xl font-extrabold text-white">0</span>
                    </div>
                    <div class="bg-slate-900/80 p-4 rounded-2xl border border-emerald-500/20">
                        <span class="text-xs text-slate-400 block mb-1">Kayıtlı Kullanıcı</span>
                        <span id="adm-user-count" class="text-2xl font-extrabold text-emerald-400">0</span>
                    </div>
                    <div class="bg-slate-900/80 p-4 rounded-2xl border border-amber-500/20">
                        <span class="text-xs text-slate-400 block mb-1">Bekleyen Ödemeler</span>
                        <span id="adm-dep-count" class="text-2xl font-extrabold text-amber-400">0</span>
                    </div>
                </div>

                <!-- Ödeme Bildirimleri -->
                <div>
                    <h4 class="text-sm font-extrabold text-white mb-3">Müşteri Ödeme Bildirimleri</h4>
                    <div class="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-slate-800/80 text-slate-400 border-b border-slate-700">
                                <tr>
                                    <th class="p-3">Kullanıcı</th>
                                    <th class="p-3">Gönderen Adı</th>
                                    <th class="p-3">Tutar</th>
                                    <th class="p-3">Durum</th>
                                    <th class="p-3 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody id="adm-deposit-table">
                                <!-- Dinamik -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Son Ziyaretçiler -->
                <div>
                    <h4 class="text-sm font-extrabold text-white mb-3">Son Site Ziyaretçileri</h4>
                    <div class="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 max-h-48 overflow-y-auto text-xs space-y-2" id="adm-visitors-list">
                        <!-- Dinamik -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="glass border-t border-blue-900/30 text-center py-6 text-xs text-slate-500">
        &copy; 2026 ANKA CAİ SMS HİZMETLERİ - Tüm Hakları Saklıdır.
    </footer>

    <script>
        // Intro ekranını 1.2 saniye sonra yavaşça kapat
        window.addEventListener('load', () => {
            setTimeout(() => {
                const splash = document.getElementById('splash-screen');
                splash.style.opacity = '0';
                setTimeout(() => splash.style.display = 'none', 800);
            }, 1200);
        });

        let currentUsername = localStorage.getItem('sms_username') || '';
        let selectedProductData = null;
        let currentBalance = 0;
        let allServicesData = [];
        let currentCategory = 'Tümü';

        async function fetchInitialData() {
            try {
                const sRes = await fetch('/api/getServices');
                const sJson = await sRes.json();
                if(sJson.success) {
                    allServicesData = sJson.services;
                    renderServices(allServicesData);
                }

                if(currentUsername) {
                    document.getElementById('user-profile-text').innerText = currentUsername;
                    const bRes = await fetch(\`/api/getCustomerBalance?username=\${currentUsername}\`);
                    const bJson = await bRes.json();
                    if(bJson.success) {
                        currentBalance = bJson.balance;
                        document.getElementById('customer-balance').innerText = currentBalance.toFixed(2) + ' TL';
                    }
                }
            } catch(e) { console.error(e); }
        }
        fetchInitialData();

        function renderServices(services) {
            const grid = document.getElementById('services-grid');
            if(services.length === 0) {
                grid.innerHTML = \`<div class="col-span-full text-center py-12 text-slate-500 text-xs">Aradığınız kriterlere uygun servis bulunamadı.</div>\`;
                return;
            }

            grid.innerHTML = services.map(s => \`
                <div class="glass-card p-6 rounded-3xl flex flex-col justify-between \${s.border}">
                    <div>
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-14 h-14 \${s.bg} rounded-2xl flex items-center justify-center \${s.color} text-2xl border border-white/5 shadow-inner">
                                <i class="fa-brands \${s.icon}"></i>
                            </div>
                            <span class="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">\${s.price} TL</span>
                        </div>
                        <span class="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 block">\${s.category}</span>
                        <h3 class="text-base font-extrabold text-white mb-1.5">\${s.name}</h3>
                        <p class="text-[11px] text-slate-400 mb-6 leading-relaxed">ANKA altyapısı ile anında numara tahsisi ve canlı SMS kod takibi.</p>
                    </div>
                    <button onclick='openOrderModal(\${JSON.stringify(s)})' class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-3 rounded-2xl text-xs transition shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2">
                        <i class="fa-solid fa-cart-shopping"></i>
                        <span>Satın Al</span>
                    </button>
                </div>
            \`).join('');
        }

        function filterCategory(category) {
            currentCategory = category;
            document.querySelectorAll('.cat-btn').forEach(btn => {
                if(btn.innerText.includes(category)) {
                    btn.className = "cat-btn bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0";
                } else {
                    btn.className = "cat-btn bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0";
                }
            });
            filterServices();
        }

        function filterServices() {
            const query = document.getElementById('search-input').value.toLowerCase();
            let filtered = allServicesData;

            if(currentCategory !== 'Tümü') {
                filtered = filtered.filter(s => s.category === currentCategory);
            }

            if(query) {
                filtered = filtered.filter(s => s.name.toLowerCase().includes(query) || s.category.toLowerCase().includes(query));
            }

            renderServices(filtered);
        }

        let checkInterval = null;

        function openOrderModal(product) {
            if(!currentUsername) {
                alert('Lütfen önce giriş yapın veya kayıt olun!');
                openAuthModal();
                return;
            }
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
                    body: JSON.stringify({ productKey: selectedProductData.id, username: currentUsername })
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
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const json = await res.json();
            if(json.success) {
                currentUsername = json.username;
                localStorage.setItem('sms_username', currentUsername);
                alert(json.message);
                closeAuthModal();
                fetchInitialData();
            } else { alert(json.message); }
        }

        async function handleRegister(e) {
            e.preventDefault();
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const json = await res.json();
            if(json.success) {
                currentUsername = json.username;
                localStorage.setItem('sms_username', currentUsername);
                alert(json.message);
                closeAuthModal();
                fetchInitialData();
            } else { alert(json.message); }
        }

        function openDepositModal() { document.getElementById('deposit-modal').classList.remove('hidden'); }
        function closeDepositModal() { document.getElementById('deposit-modal').classList.add('hidden'); }
        
        async function sendDepositNotice() {
            if(!currentUsername) { alert('Lütfen önce giriş yapın.'); openAuthModal(); return; }
            const senderName = document.getElementById('dep-sender').value;
            const amount = document.getElementById('dep-amount').value;
            if(!senderName || !amount) { alert('Lütfen tüm alanları doldurun.'); return; }

            const res = await fetch('/api/deposit/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUsername, senderName, amount })
            });
            const json = await res.json();
            if(json.success) {
                alert(json.message);
                closeDepositModal();
            } else { alert(json.message); }
        }

        function openAdminModal() { document.getElementById('admin-modal').classList.remove('hidden'); }
        function closeAdminModal() { document.getElementById('admin-modal').classList.add('hidden'); }

        async function loadAdminPanel() {
            const pass = document.getElementById('admin-pass-input').value;
            if(pass !== 'aklomanti') { alert('Hatalı şifre!'); return; }

            try {
                const res = await fetch('/api/admin/data');
                const json = await res.json();
                if(json.success) {
                    document.getElementById('admin-login-screen').classList.add('hidden');
                    document.getElementById('admin-dashboard').classList.remove('hidden');

                    document.getElementById('adm-vis-count').innerText = json.visitorsCount;
                    document.getElementById('adm-user-count').innerText = json.usersCount;
                    document.getElementById('adm-dep-count').innerText = json.depositRequests.filter(d => d.status === 'Bekliyor').length;

                    const tbody = document.getElementById('adm-deposit-table');
                    tbody.innerHTML = json.depositRequests.map(d => \`
                        <tr class="border-b border-slate-800">
                            <td class="p-3 text-white font-bold">\${d.username}</td>
                            <td class="p-3 text-slate-300">\${d.senderName}</td>
                            <td class="p-3 text-emerald-400 font-bold">\${d.amount} TL</td>
                            <td class="p-3">
                                <span class="px-2 py-1 rounded-lg text-[10px] font-bold \${d.status === 'Bekliyor' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : d.status === 'Onaylandı' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}">\${d.status}</span>
                            </td>
                            <td class="p-3 text-right space-x-1">
                                \${d.status === 'Bekliyor' ? \`
                                    <button onclick="adminAction(\${d.id}, 'approve')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-bold">Onayla</button>
                                    <button onclick="adminAction(\${d.id}, 'reject')" class="bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded-lg font-bold">Reddet</button>
                                \` : '<span class="text-slate-500">Tamamlandı</span>'}
                            </td>
                        </tr>
                    \`).join('');

                    const vList = document.getElementById('adm-visitors-list');
                    vList.innerHTML = json.recentVisitors.map(v => \`
                        <div class="flex justify-between items-center bg-slate-950/40 p-2 rounded-xl">
                            <span class="text-slate-300 font-mono">IP: \${v.ip}</span>
                            <span class="text-slate-500">\${v.time}</span>
                        </div>
                    \`).join('');
                }
            } catch(e) { alert('Admin verileri alınamadı.'); }
        }

        async function adminAction(actionId, decision) {
            const res = await fetch('/api/admin/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: 'aklomanti', actionId, decision })
            });
            const json = await res.json();
            if(json.success) {
                alert(json.message);
                loadAdminPanel();
            } else { alert(json.message); }
        }
    </script>
</body>
</html>`);
});

app.listen(PORT, () => {
    console.log('Sunucu calisiyor, port:', PORT);
});
