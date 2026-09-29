const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_KEY = process.env.API_KEY || 'osms_24a366588a5adf689da78bd656ef845effba51b53754bf57';
const API_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';

// Telegram Bot Bilgileri
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

// Bellek Veritabanı
let users = {
    "aklomanti": { balance: 1500.00, password: "123" }
};

let visitorsCount = 0;
let recentVisitors = [];
let depositRequests = [];

// SADECE İSTENEN ÜRÜNLER (WhatsApp TR, İngiltere, Filipinler ve Telegram TR)
const ankaCatalog = [
    { id: "wa_tr", service: "wa", country: "1", name: "WhatsApp Türkiye", price: 320, category: "WhatsApp", icon: "fa-whatsapp", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40" },
    { id: "tg_tr", service: "tg", country: "1", name: "Telegram Türkiye", price: 240, category: "Telegram", icon: "fa-telegram", color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/40" },
    { id: "wa_uk", service: "wa", country: "2", name: "WhatsApp İngiltere", price: 170, category: "WhatsApp", icon: "fa-whatsapp", color: "text-cyan-400", bg: "bg-cyan-500/15", border: "border-cyan-500/40" },
    { id: "wa_ph", service: "wa", country: "4", name: "WhatsApp Filipinler", price: 130, category: "WhatsApp", icon: "fa-whatsapp", color: "text-teal-400", bg: "bg-teal-500/15", border: "border-teal-500/40" }
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
    users[username] = { password, balance: 25.00 };
    res.json({ success: true, message: 'Kayıt başarılı! 25 TL bonus hesabınıza eklendi.', username, balance: 25.00 });
});

// ONAYLA SMS API'DEN NUMARA ÇEKME
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
            message: `Bakiyeniz yetersiz! Bu servis ${product.price} TL, sizin bakiyeniz ${users[username].balance.toFixed(2)} TL.` 
        });
    }

    try {
        const apiCallUrl = `${API_URL}?api_key=${API_KEY}&action=getNumber&service=${product.service}&country=${product.country}`;
        const response = await axios.get(apiCallUrl);
        const resultText = response.data;

        if (typeof resultText === 'string' && resultText.startsWith('ACCESS_NUMBER')) {
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
            return res.status(400).json({ success: false, message: `Tedarikçi Stok Durumu: ${resultText}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Onayla SMS API bağlantı hatası.', error: error.message });
    }
});

// ONAYLA SMS API'den KOD KONTROLÜ
app.get('/api/checkSms/:activationId', async (req, res) => {
    const { activationId } = req.params;
    try {
        const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getStatus&id=${activationId}`);
        const resultText = response.data;

        if (typeof resultText === 'string' && resultText.startsWith('STATUS_OK')) {
            return res.json({ success: true, status: 'completed', code: resultText.split(':')[1] });
        } else if (resultText === 'STATUS_WAIT_CODE') {
            return res.json({ success: true, status: 'waiting', message: 'Kod bekleniyor...' });
        } else {
            return res.json({ success: true, status: resultText, message: resultText });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'SMS durumu kontrol edilemedi.', error: error.message });
    }
});

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

    res.json({ success: true, message: 'Ödeme bildiriminiz yetkiliye iletildi. İnceleniyor...' });
});

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

    res.json({ success: true, message: `İşlem güncellendi: ${dep.status}` });
});

// ULTRA MODERN ÖN YÜZ (FRONTEND)
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ANKA SMS - Profesyonel Onay Paneli</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #030712; color: #f8fafc; overflow-x: hidden; }
        .glass { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(24px); border: 1px solid rgba(59, 130, 246, 0.18); }
        .glass-card { background: rgba(30, 41, 59, 0.45); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.06); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .glass-card:hover { transform: translateY(-6px); border-color: rgba(59, 130, 246, 0.5); box-shadow: 0 20px 40px -15px rgba(59, 130, 246, 0.25); }
        @keyframes modalAnim { from { opacity: 0; transform: scale(0.85) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal { animation: modalAnim 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes neonPulse { 0%, 100% { opacity: 0.25; transform: scale(1); filter: blur(50px); } 50% { opacity: 0.6; transform: scale(1.1); filter: blur(70px); } }
        .neon-bg-1 { animation: neonPulse 7s ease-in-out infinite; }
        .support-float { animation: floatAnim 3s ease-in-out infinite; }
        @keyframes floatAnim { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        #splash-screen { position: fixed; inset: 0; z-index: 9999; background: #030712; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: opacity 0.7s ease, visibility 0.7s ease; }
        .splash-logo-box { width: 85px; height: 85px; background: linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6); border-radius: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 50px rgba(59, 130, 246, 0.5); }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white">
    <div id="splash-screen">
        <div class="absolute w-96 h-96 bg-blue-600/20 rounded-full blur-3xl neon-bg-1"></div>
        <div class="splash-logo-box mb-5 relative z-10"><i class="fa-solid fa-feather text-white text-3xl"></i></div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent relative z-10">ANKA SMS</h1>
        <p class="text-[11px] text-slate-400 mt-2 tracking-widest uppercase relative z-10">Canlı Altyapı Hazırlanıyor...</p>
    </div>

    <header class="glass sticky top-0 z-40 border-b border-blue-900/20 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3 cursor-pointer" onclick="location.reload()">
            <div class="w-10 h-10 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <i class="fa-solid fa-feather text-white text-lg"></i>
            </div>
            <div>
                <span class="font-extrabold text-base tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">ANKA SMS</span>
                <span class="block text-[9px] text-blue-400 font-extrabold tracking-widest">ONAY SİSTEMİ</span>
            </div>
        </div>
        <div class="flex items-center space-x-2.5">
            <div class="glass px-3.5 py-2 rounded-2xl flex items-center space-x-2 text-xs border-blue-500/20 shadow-inner">
                <i class="fa-solid fa-wallet text-emerald-400"></i>
                <span class="text-slate-400 hidden sm:inline">Bakiye:</span>
                <span id="customer-balance" class="font-extrabold text-emerald-400 text-xs sm:text-sm">0.00 TL</span>
            </div>
            <button onclick="openDepositModal()" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/25">
                <i class="fa-solid fa-plus mr-1"></i> Bakiye Yükle
            </button>
            <button onclick="openAuthModal()" class="glass hover:bg-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center space-x-1.5">
                <i class="fa-solid fa-user-circle text-blue-400 text-sm"></i>
                <span id="user-profile-text" class="hidden sm:inline">Giriş Yap</span>
            </button>
            <button onclick="openAdminModal()" class="bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-2 rounded-xl text-xs font-bold transition border border-amber-500/30" title="Admin">
                <i class="fa-solid fa-shield-halved"></i>
            </button>
        </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-10 w-full flex-grow">
        <div class="relative overflow-hidden glass p-8 rounded-3xl mb-10 border border-blue-500/25 bg-gradient-to-r from-blue-950/40 via-slate-900/70 to-indigo-950/40 shadow-2xl">
            <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none neon-bg-1"></div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">Anında Sanal Numara Al</h1>
            <p class="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">WhatsApp ve Telegram servisleriniz için Onayla SMS altyapısıyla anlık havuzdan numara çekin, kodunuzu saniyeler içinde ekranda görün.</p>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div class="relative w-full sm:w-80">
                <i class="fa-solid fa-search absolute left-4 top-3.5 text-slate-400 text-xs"></i>
                <input type="text" id="search-input" oninput="filterServices()" placeholder="Servis ara (WhatsApp, Telegram...)" class="w-full bg-slate-900/90 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 transition">
            </div>
            <div class="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0" id="category-filters">
                <button onclick="filterCategory('Tümü')" class="cat-btn bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0">Tümü</button>
                <button onclick="filterCategory('WhatsApp')" class="cat-btn bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0">WhatsApp</button>
                <button onclick="filterCategory('Telegram')" class="cat-btn bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0">Telegram</button>
            </div>
        </div>

        <div id="services-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6 mb-12"></div>
    </main>

    <a href="https://t.me/SMSPATRONUM" target="_blank" class="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center text-lg support-float border border-blue-400/40" title="Canlı Destek">
        <i class="fa-brands fa-telegram"></i>
    </a>

    <!-- Order Modal -->
    <div id="order-modal" class="fixed inset-0 z-50 hidden bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-3xl p-7 border border-blue-500/40 relative animate-modal shadow-2xl">
            <button onclick="closeOrderModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-8 h-8 rounded-xl bg-slate-800/80 flex items-center justify-center"><i class="fa-solid fa-xmark text-xs"></i></button>
            <div id="order-step-1">
                <h3 id="modal-product-title" class="text-lg font-extrabold text-white mb-2">Servis Adı</h3>
                <div class="bg-slate-900/90 p-4 rounded-2xl border border-blue-500/20 mb-6 space-y-2 text-xs">
                    <div class="flex justify-between"><span class="text-slate-400">Servis Ücreti:</span> <span id="modal-product-price" class="font-extrabold text-emerald-400 text-sm">0 TL</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Mevcut Bakiyeniz:</span> <span id="modal-user-balance" class="font-extrabold text-white">0 TL</span></div>
                </div>
                <button onclick="executeBuy()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 rounded-2xl text-xs transition shadow-lg shadow-blue-600/30">Numarayı Havuzdan Çek ve Başlat</button>
            </div>
            <div id="order-step-2" class="hidden space-y-4">
                <div class="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl text-emerald-400 font-bold text-xs text-center">Numara Başarıyla Tahsis Edildi!</div>
                <div class="bg-slate-900 p-4 rounded-2xl text-center">
                    <span class="text-[10px] uppercase text-slate-400 tracking-wider block mb-1">Telefon Numarası</span>
                    <div id="res-phone" class="text-xl font-extrabold text-white font-mono tracking-wide">+90 ...</div>
                </div>
                <div class="bg-slate-900 p-4 rounded-2xl text-center">
                    <span class="text-[10px] uppercase text-slate-400 tracking-wider block mb-1">Gelen SMS Kodu</span>
                    <div id="res-code" class="text-2xl font-extrabold text-blue-400 font-mono animate-pulse">Kod Bekleniyor...</div>
                </div>
                <button onclick="closeOrderModal(); location.reload();" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-2xl text-xs font-bold transition">İşlemi Tamamla & Kapat</button>
            </div>
        </div>
    </div>

    <!-- Auth Modal -->
    <div id="auth-modal" class="fixed inset-0 z-50 hidden bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-sm rounded-3xl p-7 border border-blue-500/40 relative animate-modal shadow-2xl">
            <button onclick="closeAuthModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-8 h-8 rounded-xl bg-slate-800/80 flex items-center justify-center"><i class="fa-solid fa-xmark text-xs"></i></button>
            <div class="flex space-x-1.5 mb-6 bg-slate-900 p-1 rounded-2xl">
                <button onclick="switchAuthTab('login')" id="tab-login-btn" class="flex-1 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white transition">Giriş Yap</button>
                <button onclick="switchAuthTab('register')" id="tab-register-btn" class="flex-1 py-2 rounded-xl text-xs font-bold text-slate-400 transition">Kayıt Ol</button>
            </div>
            <form id="login-form" onsubmit="handleLogin(event)" class="space-y-3.5">
                <input type="text" id="login-username" placeholder="Kullanıcı Adı" required class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500">
                <input type="password" id="login-password" placeholder="Şifre" required class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500">
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3 rounded-2xl text-xs transition shadow-lg shadow-blue-600/30">Giriş Yap</button>
            </form>
            <form id="register-form" onsubmit="handleRegister(event)" class="space-y-3.5 hidden">
                <input type="text" id="reg-username" placeholder="Kullanıcı Adı" required class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500">
                <input type="password" id="reg-password" placeholder="Şifre" required class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500">
                <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-2xl text-xs transition shadow-lg shadow-emerald-600/30">Kayıt Ol (+25 TL Bonus)</button>
            </form>
        </div>
    </div>

    <!-- Deposit Modal -->
    <div id="deposit-modal" class="fixed inset-0 z-50 hidden bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-sm rounded-3xl p-7 border border-blue-500/40 relative animate-modal shadow-2xl">
            <button onclick="closeDepositModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-8 h-8 rounded-xl bg-slate-800/80 flex items-center justify-center"><i class="fa-solid fa-xmark text-xs"></i></button>
            <h3 class="text-sm font-extrabold text-white mb-2">Bakiye Yükleme Bildirimi</h3>
            <div class="bg-slate-950 p-3.5 rounded-2xl border border-blue-500/20 mb-4 text-[11px] space-y-1.5">
                <div class="flex justify-between"><span class="text-slate-400">Alıcı:</span> <span class="text-emerald-400 font-bold">Resul Sakal</span></div>
                <div class="flex justify-between"><span class="text-slate-400">IBAN:</span> <span class="text-blue-300 font-mono">TR62 0006 2000 5000 0006 8107 73</span></div>
            </div>
            <div class="space-y-3">
                <input type="text" id="dep-sender" placeholder="Gönderen Adı Soyadı" class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500">
                <input type="number" id="dep-amount" placeholder="Yatırılan Tutar (TL)" class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500">
                <button onclick="sendDepositNotice()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-2xl text-xs transition shadow-lg shadow-emerald-600/30">Ödeme Bildirimi Gönder</button>
            </div>
        </div>
    </div>

    <!-- Admin Modal -->
    <div id="admin-modal" class="fixed inset-0 z-50 hidden bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-3xl rounded-3xl p-6 border border-amber-500/40 relative animate-modal shadow-2xl max-h-[85vh] overflow-y-auto">
            <button onclick="closeAdminModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-8 h-8 rounded-xl bg-slate-800/80 flex items-center justify-center"><i class="fa-solid fa-xmark text-xs"></i></button>
            <div id="admin-login-screen">
                <h3 class="text-lg font-extrabold text-white mb-3">Admin Panel Girişi</h3>
                <input type="password" id="admin-pass-input" placeholder="Admin Şifresi" class="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white mb-3 focus:outline-none focus:border-amber-500">
                <button onclick="loadAdminPanel()" class="w-full max-w-xs bg-amber-600 hover:bg-amber-500 text-white font-extrabold py-3 rounded-2xl text-xs transition block shadow-lg shadow-amber-600/25">Giriş Yap</button>
            </div>
            <div id="admin-dashboard" class="hidden space-y-5">
                <h3 class="text-lg font-extrabold text-amber-400">Yönetim Paneli & Onay Kuyruğu</h3>
                <div class="grid grid-cols-3 gap-3">
                    <div class="bg-slate-900 p-3.5 rounded-2xl border border-slate-800"><span class="text-[10px] uppercase text-slate-400 block">Ziyaretçi</span><span id="adm-vis-count" class="text-lg font-bold text-white">0</span></div>
                    <div class="bg-slate-900 p-3.5 rounded-2xl border border-slate-800"><span class="text-[10px] uppercase text-slate-400 block">Kullanıcı</span><span id="adm-user-count" class="text-lg font-bold text-emerald-400">0</span></div>
                    <div class="bg-slate-900 p-3.5 rounded-2xl border border-slate-800"><span class="text-[10px] uppercase text-slate-400 block">Bekleyen Ödeme</span><span id="adm-dep-count" class="text-lg font-bold text-amber-400">0</span></div>
                </div>
                <div class="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-800 text-slate-400"><tr><th class="p-3">Kullanıcı</th><th class="p-3">Gönderen</th><th class="p-3">Tutar</th><th class="p-3">Durum</th><th class="p-3 text-right">İşlem</th></tr></thead>
                        <tbody id="adm-deposit-table"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <footer class="glass border-t border-blue-900/20 text-center py-6 text-[11px] text-slate-500">&copy; 2026 ANKA SMS HİZMETLERİ - Tüm Hakları Saklıdır.</footer>

    <script>
        window.addEventListener('load', () => { setTimeout(() => { const s = document.getElementById('splash-screen'); s.style.opacity = '0'; setTimeout(() => s.style.display = 'none', 700); }, 1000); });
        let currentUsername = localStorage.getItem('sms_username') || '';
        let selectedProductData = null, currentBalance = 0, allServicesData = [], currentCategory = 'Tümü', checkInterval = null;

        async function fetchInitialData() {
            try {
                const sRes = await fetch('/api/getServices');
                const sJson = await sRes.json();
                if(sJson.success) { allServicesData = sJson.services; renderServices(allServicesData); }
                if(currentUsername) {
                    document.getElementById('user-profile-text').innerText = currentUsername;
                    const bRes = await fetch(\`/api/getCustomerBalance?username=\${currentUsername}\`);
                    const bJson = await bRes.json();
                    if(bJson.success) { currentBalance = bJson.balance; document.getElementById('customer-balance').innerText = currentBalance.toFixed(2) + ' TL'; }
                }
            } catch(e) {}
        }
        fetchInitialData();

        function renderServices(services) {
            const grid = document.getElementById('services-grid');
            grid.innerHTML = services.map(s => \`
                <div class="glass-card p-6 rounded-3xl flex flex-col justify-between \${s.border}">
                    <div>
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-12 h-12 \${s.bg} rounded-2xl flex items-center justify-center \${s.color} text-xl"><i class="fa-brands \${s.icon}"></i></div>
                            <span class="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400">\${s.price} TL</span>
                        </div>
                        <span class="text-[9px] uppercase font-bold tracking-widest text-slate-400 mb-1 block">\${s.category}</span>
                        <h3 class="text-base font-extrabold text-white mb-2">\${s.name}</h3>
                        <p class="text-xs text-slate-400">Anlık havuzdan hızlı SMS doğrulaması.</p>
                    </div>
                    <button onclick='openOrderModal(\${JSON.stringify(s)})' class="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3 rounded-2xl text-xs transition shadow-md shadow-blue-600/20">Numara Satın Al</button>
                </div>
            \`).join('');
        }

        function filterCategory(cat) {
            currentCategory = cat;
            renderServices(cat === 'Tümü' ? allServicesData : allServicesData.filter(s => s.category === cat));
        }

        function filterServices() {
            const q = document.getElementById('search-input').value.toLowerCase();
            renderServices(allServicesData.filter(s => s.name.toLowerCase().includes(q) && (currentCategory === 'Tümü' || s.category === currentCategory)));
        }

        function openOrderModal(product) {
            if(!currentUsername) { alert('Lütfen önce giriş yapın!'); openAuthModal(); return; }
            selectedProductData = product;
            document.getElementById('modal-product-title').innerText = product.name;
            document.getElementById('modal-product-price').innerText = product.price + ' TL';
            document.getElementById('modal-user-balance').innerText = currentBalance.toFixed(2) + ' TL';
            document.getElementById('order-step-1').classList.remove('hidden');
            document.getElementById('order-step-2').classList.add('hidden');
            document.getElementById('order-modal').classList.remove('hidden');
        }
        function closeOrderModal() { document.getElementById('order-modal').classList.add('hidden'); if(checkInterval) clearInterval(checkInterval); }

        async function executeBuy() {
            const res = await fetch('/api/buyNumber', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productKey: selectedProductData.id, username: currentUsername }) });
            const json = await res.json();
            if(json.success) {
                document.getElementById('order-step-1').classList.add('hidden');
                document.getElementById('order-step-2').classList.remove('hidden');
                document.getElementById('res-phone').innerText = json.phoneNumber;
                document.getElementById('customer-balance').innerText = json.remainingBalance.toFixed(2) + ' TL';
                currentBalance = json.remainingBalance;
                
                checkInterval = setInterval(async () => {
                    const r = await fetch(\`/api/checkSms/\${json.activationId}\`);
                    const j = await r.json();
                    if(j.success && j.status === 'completed') {
                        document.getElementById('res-code').innerText = j.code;
                        clearInterval(checkInterval);
                    }
                }, 3000);
            } else { alert(json.message); }
        }

        function openAuthModal() { document.getElementById('auth-modal').classList.remove('hidden'); }
        function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }
        function switchAuthTab(tab) {
            if(tab === 'login') { document.getElementById('login-form').classList.remove('hidden'); document.getElementById('register-form').classList.add('hidden'); }
            else { document.getElementById('register-form').classList.remove('hidden'); document.getElementById('login-form').classList.add('hidden'); }
        }
        async function handleLogin(e) {
            e.preventDefault();
            const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.getElementById('login-username').value, password: document.getElementById('login-password').value }) });
            const json = await res.json();
            if(json.success) { currentUsername = json.username; localStorage.setItem('sms_username', currentUsername); closeAuthModal(); fetchInitialData(); } else { alert(json.message); }
        }
        async function handleRegister(e) {
            e.preventDefault();
            const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.getElementById('reg-username').value, password: document.getElementById('reg-password').value }) });
            const json = await res.json();
            if(json.success) { currentUsername = json.username; localStorage.setItem('sms_username', currentUsername); closeAuthModal(); fetchInitialData(); } else { alert(json.message); }
        }
        function openDepositModal() { document.getElementById('deposit-modal').classList.remove('hidden'); }
        function closeDepositModal() { document.getElementById('deposit-modal').classList.add('hidden'); }
        async function sendDepositNotice() {
            const res = await fetch('/api/deposit/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUsername, senderName: document.getElementById('dep-sender').value, amount: document.getElementById('dep-amount').value }) });
            const json = await res.json(); alert(json.message); closeDepositModal();
        }
        function openAdminModal() { document.getElementById('admin-modal').classList.remove('hidden'); }
        function closeAdminModal() { document.getElementById('admin-modal').classList.add('hidden'); }
        async function loadAdminPanel() {
            if(document.getElementById('admin-pass-input').value !== 'aklomanti') { alert('Şifre hatalı!'); return; }
            const res = await fetch('/api/admin/data'); const json = await res.json();
            if(json.success) {
                document.getElementById('admin-login-screen').classList.add('hidden');
                document.getElementById('admin-dashboard').classList.remove('hidden');
                document.getElementById('adm-vis-count').innerText = json.visitorsCount;
                document.getElementById('adm-user-count').innerText = json.usersCount;
                document.getElementById('adm-dep-count').innerText = json.depositRequests.filter(d => d.status === 'Bekliyor').length;
                document.getElementById('adm-deposit-table').innerHTML = json.depositRequests.map(d => \`
                    <tr class="border-b border-slate-800">
                        <td class="p-3">\${d.username}</td><td class="p-3">\${d.senderName}</td><td class="p-3 text-emerald-400">\${d.amount} TL</td>
                        <td class="p-3">\${d.status}</td>
                        <td class="p-3 text-right">\${d.status === 'Bekliyor' ? \`<button onclick="adminAction(\${d.id}, 'approve')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold">Onayla</button>\` : ''}</td>
                    </tr>
                \`).join('');
            }
        }
        async function adminAction(actionId, decision) {
            await fetch('/api/admin/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'aklomanti', actionId, decision }) });
            loadAdminPanel();
        }
    </script>
</body>
</html>`);
});

app.listen(PORT, () => {
    console.log('Sunucu calisiyor, port:', PORT);
});
