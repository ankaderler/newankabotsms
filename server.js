const express = require('express');
const axios = require('axios');

// Telegram kütüphanesini hata önleyici (fallback) yöntemle çağırıyoruz
const telegramModule = require('node-telegram-bot-api');
const TelegramBot = telegramModule.default || telegramModule; 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === YAPILANDIRMA AYARLARI ===
const API_KEY = process.env.API_KEY || 'osms_24a366588a5adf689da78bd656ef845effba51b53754bf57';
const API_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';
const TELEGRAM_BOT_TOKEN = '8874989367:AAFLCBRvCV5UIP9JOQwpvY9ZzDLVSIKYIhM';
const TELEGRAM_CHAT_ID = '8964930489';

// Telegram Botunu Başlat
let bot;
try {
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
} catch (error) {
    console.error('Telegram bot başlatılamadı:', error.message);
}

// Bellek Veritabanı
let users = {
    "aklomanti": { balance: 1500.00, password: "123" }
};
let visitorsCount = 0;
let recentVisitors = [];
let pendingPayments = {}; // Butonlu onay sistemi için eklendi
let activeNumbers = [];   // Sorgulama paneli için

// GÜNCELLENMİŞ KATALOG
const ankaCatalog = [
    { id: "wa_tr", service: "wa", country: "1", name: "WhatsApp Türkiye", price: 300, category: "WhatsApp", icon: "fa-whatsapp", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40" },
    { id: "tg_tr", service: "tg", country: "1", name: "Telegram Türkiye", price: 200, category: "Telegram", icon: "fa-telegram", color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/40" },
    { id: "tg_uk", service: "tg", country: "2", name: "Telegram İngiltere", price: 180, category: "Telegram", icon: "fa-telegram", color: "text-cyan-400", bg: "bg-cyan-500/15", border: "border-cyan-500/40" },
    { id: "wa_uk", service: "wa", country: "2", name: "WhatsApp İngiltere", price: 200, category: "WhatsApp", icon: "fa-whatsapp", color: "text-cyan-400", bg: "bg-cyan-500/15", border: "border-cyan-500/40" },
    { id: "wa_ph", service: "wa", country: "4", name: "WhatsApp Filipinler", price: 150, category: "WhatsApp", icon: "fa-whatsapp", color: "text-teal-400", bg: "bg-teal-500/15", border: "border-teal-500/40" }
];

app.use((req, res, next) => {
    if (req.path === '/' && req.method === 'GET') {
        visitorsCount++;
        recentVisitors.push({ ip: req.ip || '127.0.0.1', time: new Date().toLocaleTimeString('tr-TR') });
        if(recentVisitors.length > 20) recentVisitors.shift();
    }
    next();
});

// STANDART ENDPOINTLER
app.get('/api/getServices', (req, res) => res.json({ success: true, services: ankaCatalog }));
app.get('/api/getCustomerBalance', (req, res) => {
    const username = req.query.username || "misafir";
    res.json({ success: true, balance: users[username] ? users[username].balance : 0.00, name: username });
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
    if (!username || !password) return res.status(400).json({ success: false, message: 'Lütfen tüm alanları doldurun.' });
    if (users[username]) return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten alınmış!' });
    
    users[username] = { password, balance: 25.00 };
    res.json({ success: true, message: 'Kayıt başarılı! 25 TL bonus hesabınıza eklendi.', username, balance: 25.00 });
});

// Bekleme fonksiyonu (Polling döngüsü için)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// YENİ: DÖNGÜLÜ NUMARA ÇEKME SİSTEMİ
app.post('/api/buyNumber', async (req, res) => {
    const { productKey, username } = req.body;
    if (!users[username]) return res.status(400).json({ success: false, message: 'Oturum bulunamadı. Lütfen giriş yapın.' });

    const product = ankaCatalog.find(s => s.id === productKey);
    if (!product) return res.status(400).json({ success: false, message: 'Ürün bulunamadı.' });

    if (users[username].balance < product.price) {
        return res.status(400).json({ success: false, message: `Bakiyeniz yetersiz! Bu servis ${product.price} TL.` });
    }

    const maxRetries = 15;
    const delayMs = 2500;
    let attempt = 0;

    while (attempt < maxRetries) {
        attempt++;
        try {
            const apiCallUrl = `${API_URL}?api_key=${API_KEY}&action=getNumber&service=${product.service}&country=${product.country}&operator=any`;
            const response = await axios.get(apiCallUrl);
            const data = typeof response.data === 'string' ? response.data.trim() : String(response.data);

            if (data.startsWith('ACCESS_NUMBER')) {
                users[username].balance -= product.price;
                const parts = data.split(':');
                const activationId = parts[1];
                const phoneNumber = parts[2];

                activeNumbers.push({
                    activationId, phoneNumber, username,
                    productName: product.name, price: product.price,
                    status: 'WAITING', code: null,
                    createdAt: new Date().toLocaleString('tr-TR')
                });

                return res.json({
                    success: true, activationId, phoneNumber,
                    remainingBalance: users[username].balance,
                    productName: product.name, message: 'Numara başarıyla alındı!'
                });
            } else if (data === 'NO_NUMBERS') {
                console.log(`[Stok Aranıyor] Deneme ${attempt}/${maxRetries}`);
                await sleep(delayMs);
            } else {
                return res.status(400).json({ success: false, message: `API Hatası: ${data}` });
            }
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Bağlantı hatası.', error: error.message });
        }
    }
    res.status(400).json({ success: false, message: 'Sistemde anlık boş numara kalmadı, lütfen birazdan tekrar deneyin.' });
});

// KOD KONTROLÜ
app.get('/api/checkSms/:activationId', async (req, res) => {
    const { activationId } = req.params;
    try {
        const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getStatus&id=${activationId}`);
        const resultText = response.data;
        let record = activeNumbers.find(a => a.activationId === activationId);

        if (typeof resultText === 'string' && resultText.startsWith('STATUS_OK')) {
            const smsCode = resultText.split(':')[1];
            if(record) { record.status = 'COMPLETED'; record.code = smsCode; }
            return res.json({ success: true, status: 'completed', code: smsCode });
        } else if (resultText === 'STATUS_WAIT_CODE') {
            if(record) record.status = 'WAITING';
            return res.json({ success: true, status: 'waiting', message: 'Kod bekleniyor...' });
        } else {
            if(record) record.status = resultText;
            return res.json({ success: true, status: resultText, message: resultText });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'SMS durumu kontrol edilemedi.' });
    }
});

// SORGU PANELİ ENDPOINTI
app.post('/api/querySms', async (req, res) => {
    const { query } = req.body;
    if (!query || !query.trim()) return res.status(400).json({ success: false, message: 'Aktivasyon ID veya Numara girin.' });
    const searchTerm = query.trim();
    let found = activeNumbers.find(a => a.activationId === searchTerm || a.phoneNumber === searchTerm || a.phoneNumber.includes(searchTerm));

    if (found) {
        try {
            const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getStatus&id=${found.activationId}`);
            if (typeof response.data === 'string' && response.data.startsWith('STATUS_OK')) {
                found.status = 'COMPLETED'; found.code = response.data.split(':')[1];
            } else if (response.data === 'STATUS_WAIT_CODE') {
                found.status = 'WAITING';
            }
        } catch(e) {}
        return res.json({ success: true, item: found });
    } else {
        try {
            const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getStatus&id=${searchTerm}`);
            const resultText = response.data;
            let statusStr = 'WAITING', codeVal = null;
            if (typeof resultText === 'string' && resultText.startsWith('STATUS_OK')) {
                statusStr = 'COMPLETED'; codeVal = resultText.split(':')[1];
            }
            return res.json({
                success: true, item: { activationId: searchTerm, phoneNumber: 'Bilinmiyor', productName: 'Doğrulama', status: statusStr, code: codeVal }
            });
        } catch (error) {
            return res.status(404).json({ success: false, message: 'Sorgulanan kayıt bulunamadı.' });
        }
    }
});

// YENİ: TELEGRAM BUTONLU ÖDEME BİLDİRİMİ
app.post('/api/deposit/notify', async (req, res) => {
    const { username, senderName, amount } = req.body;
    if (!senderName || !amount) return res.status(400).json({ success: false, message: 'Bilgiler eksik.' });

    const paymentId = 'pay_' + Date.now();
    pendingPayments[paymentId] = { username, senderName, amount: parseFloat(amount), status: 'pending' };

    const msg = `💰 *Yeni Bakiye Bildirimi*\n\n👤 Kullanıcı: ${username}\n💳 Gönderen: ${senderName}\n💵 Tutar: ${amount} TL\n\nLütfen işlemi onaylayın veya reddedin:`;
    
    if (bot) {
        bot.sendMessage(TELEGRAM_CHAT_ID, msg, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ Onayla', callback_data: `approve_${paymentId}` }, { text: '❌ Reddet', callback_data: `reject_${paymentId}` }]
                ]
            }
        }).catch(err => console.error("Telegram gönderim hatası:", err));
    }

    res.json({ success: true, message: 'Bildirim iletildi. İnceleniyor...' });
});

// TELEGRAM BUTON TIKLAMA (CALLBACK) DİNLEYİCİSİ
if (bot) {
    bot.on('callback_query', (query) => {
        const data = query.data;
        const action = data.split('_')[0]; 
        const paymentId = data.replace(`${action}_`, '');
        const payment = pendingPayments[paymentId];

        if (!payment || payment.status !== 'pending') {
            return bot.answerCallbackQuery(query.id, { text: 'Bu işlem zaten sonuçlandırılmış.', show_alert: true });
        }

        if (action === 'approve') {
            if(!users[payment.username]) users[payment.username] = { balance: 0, password: '123' };
            users[payment.username].balance += payment.amount;
            payment.status = 'approved';
            
            const updatedText = query.message.text + `\n\n✅ *DURUM: ONAYLANDI* (Bakiye Eklendi)`;
            bot.editMessageText(updatedText, { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown' });
            bot.answerCallbackQuery(query.id, { text: 'Bakiye eklendi!' });
        } else if (action === 'reject') {
            payment.status = 'rejected';
            const updatedText = query.message.text + `\n\n❌ *DURUM: REDDEDİLDİ*`;
            bot.editMessageText(updatedText, { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown' });
            bot.answerCallbackQuery(query.id, { text: 'Reddedildi.' });
        }
    });
}

// ULTRA MODERN ÖN YÜZ
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ANKA CIA SMS HİZMETLERİ</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #030712; color: #f8fafc; overflow-x: hidden; }
        #matrix-canvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -2; opacity: 0.55; pointer-events: none; }
        .bg-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: linear-gradient(rgba(3, 7, 18, 0.45), rgba(3, 7, 18, 0.65)), url('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1920&auto=format&fit=crop') no-repeat center center fixed; background-size: cover; z-index: -1; pointer-events: none; }
        .glass { background: rgba(15, 23, 42, 0.82); backdrop-filter: blur(16px); border: 1px solid rgba(34, 197, 94, 0.35); }
        .glass-card { background: rgba(30, 41, 59, 0.70); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.15); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .glass-card:hover { transform: translateY(-6px); border-color: rgba(34, 197, 94, 0.8); box-shadow: 0 20px 40px -15px rgba(34, 197, 94, 0.4); }
        @keyframes modalAnim { from { opacity: 0; transform: scale(0.85) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal { animation: modalAnim 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        #splash-screen { position: fixed; inset: 0; z-index: 9999; background: #030712; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: opacity 0.7s ease, visibility 0.7s ease; }
        .splash-logo-box { width: 85px; height: 85px; background: linear-gradient(135deg, #10b981, #3b82f6); border-radius: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 50px rgba(16, 185, 129, 0.5); }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
    <canvas id="matrix-canvas"></canvas>
    <div class="bg-overlay"></div>

    <div id="splash-screen">
        <div class="splash-logo-box mb-5 relative z-10"><i class="fa-solid fa-terminal text-white text-3xl"></i></div>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-white bg-clip-text text-transparent relative z-10">ANKA CIA SMS</h1>
    </div>

    <header class="glass sticky top-0 z-40 border-b border-emerald-500/30 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3 cursor-pointer" onclick="location.reload()">
            <div class="w-10 h-10 bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <i class="fa-solid fa-shield-halved text-white text-lg"></i>
            </div>
            <div>
                <span class="font-extrabold text-base tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-white bg-clip-text text-transparent">ANKA CIA SMS</span>
                <span class="block text-[9px] text-emerald-400 font-extrabold tracking-widest">GÜVENLİ ONAY SİSTEMİ</span>
            </div>
        </div>
        <div class="flex items-center space-x-2.5">
            <button onclick="openQueryModal()" class="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5">
                <i class="fa-solid fa-search"></i>
                <span class="hidden sm:inline">Sorgu Paneli</span>
            </button>
            <div class="glass px-3.5 py-2 rounded-2xl flex items-center space-x-2 text-xs border-emerald-500/30 shadow-inner">
                <i class="fa-solid fa-wallet text-emerald-400"></i>
                <span id="customer-balance" class="font-extrabold text-emerald-400 text-xs sm:text-sm">0.00 TL</span>
            </div>
            <button onclick="openDepositModal()" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition">
                <i class="fa-solid fa-plus"></i>
            </button>
            <button onclick="openAuthModal()" class="glass hover:bg-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition">
                <i class="fa-solid fa-user-circle text-emerald-400 text-sm"></i>
            </button>
        </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-10 w-full flex-grow">
        <div class="relative overflow-hidden glass p-8 rounded-3xl mb-10 border border-emerald-500/35 shadow-2xl">
            <h1 class="text-2xl sm:text-3xl font-extrabold text-white mb-2">Anında Sanal Numara Al</h1>
            <p class="text-xs sm:text-sm text-slate-300 max-w-xl">WhatsApp ve Telegram servisleriniz için anlık havuzdan numara çekin.</p>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div class="relative w-full sm:w-80">
                <i class="fa-solid fa-search absolute left-4 top-3.5 text-slate-400 text-xs"></i>
                <input type="text" id="search-input" oninput="filterServices()" class="w-full bg-slate-900/90 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-xs text-white focus:border-emerald-500 transition">
            </div>
            <div class="flex space-x-2 overflow-x-auto w-full sm:w-auto" id="category-filters">
                <button onclick="filterCategory('Tümü')" class="cat-btn bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Tümü</button>
                <button onclick="filterCategory('WhatsApp')" class="cat-btn bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold">WhatsApp</button>
                <button onclick="filterCategory('Telegram')" class="cat-btn bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold">Telegram</button>
            </div>
        </div>
        <div id="services-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12"></div>
    </main>

    <!-- Modal Yapıları -->
    <!-- Sorgu Paneli Modal -->
    <div id="query-modal" class="fixed inset-0 z-50 hidden bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-lg rounded-3xl p-7 border border-emerald-500/40 relative animate-modal">
            <button onclick="closeQueryModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-8 h-8 rounded-xl bg-slate-800/80"><i class="fa-solid fa-xmark text-xs"></i></button>
            <h3 class="text-base font-extrabold text-white mb-4">Sorgu Paneli</h3>
            <div class="flex space-x-2 mb-4">
                <input type="text" id="query-input" placeholder="Aktivasyon ID veya Numara" class="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <button onclick="runQuery()" class="bg-emerald-600 text-white px-5 rounded-2xl text-xs font-bold">Sorgula</button>
            </div>
            <div id="query-result" class="hidden bg-slate-900/90 rounded-2xl p-5 border border-emerald-500/30 space-y-3">
                <div class="flex justify-between border-b border-slate-800 pb-2"><span class="text-xs text-slate-400">ID:</span><span id="q-act-id" class="text-xs font-bold text-white"></span></div>
                <div class="flex justify-between border-b border-slate-800 pb-2"><span class="text-xs text-slate-400">Numara:</span><span id="q-phone" class="text-xs font-bold text-emerald-400"></span></div>
                <div class="flex justify-between border-b border-slate-800 pb-2"><span class="text-xs text-slate-400">Durum:</span><span id="q-status" class="text-xs font-bold text-amber-400"></span></div>
                <div class="pt-2 text-center bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span class="text-[10px] text-slate-500 block mb-1">Gelen Kodu</span>
                    <span id="q-code" class="text-2xl font-extrabold text-emerald-400 font-mono"></span>
                </div>
            </div>
        </div>
    </div>

    <!-- Sipariş Modal -->
    <div id="order-modal" class="fixed inset-0 z-50 hidden bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-3xl p-7 relative animate-modal">
            <button onclick="closeOrderModal()" class="absolute top-5 right-5 text-slate-400 w-8 h-8 rounded-xl bg-slate-800/80"><i class="fa-solid fa-xmark"></i></button>
            <div id="order-step-1">
                <h3 id="modal-product-title" class="text-lg font-extrabold text-white mb-2"></h3>
                <div class="bg-slate-900/90 p-4 rounded-2xl mb-6 space-y-2 text-xs">
                    <div class="flex justify-between"><span class="text-slate-400">Ücret:</span> <span id="modal-product-price" class="font-extrabold text-emerald-400"></span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Bakiyeniz:</span> <span id="modal-user-balance" class="font-extrabold text-white"></span></div>
                </div>
                <button onclick="executeBuy()" id="buy-btn" class="w-full bg-emerald-600 text-white font-extrabold py-3.5 rounded-2xl text-xs">Numarayı Çek</button>
            </div>
            <div id="order-step-2" class="hidden space-y-4">
                <div class="bg-emerald-500/10 p-3.5 rounded-2xl text-emerald-400 font-bold text-xs text-center">Numara Alındı!</div>
                <div class="bg-slate-900 p-4 rounded-2xl text-center">
                    <span class="text-[10px] text-slate-400 block mb-1">Numara</span>
                    <div id="res-phone" class="text-xl font-extrabold text-white font-mono">+90 ...</div>
                </div>
                <div class="bg-slate-900 p-4 rounded-2xl text-center">
                    <span class="text-[10px] text-slate-400 block mb-1">SMS Kodu</span>
                    <div id="res-code" class="text-2xl font-extrabold text-emerald-400 font-mono animate-pulse">Kod Bekleniyor...</div>
                </div>
                <button onclick="location.reload()" class="w-full bg-slate-800 text-slate-300 py-3 rounded-2xl text-xs font-bold">Kapat</button>
            </div>
        </div>
    </div>

    <!-- Auth Modal -->
    <div id="auth-modal" class="fixed inset-0 z-50 hidden bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-sm rounded-3xl p-7 relative animate-modal">
            <button onclick="closeAuthModal()" class="absolute top-5 right-5 text-slate-400 w-8 h-8 rounded-xl bg-slate-800/80"><i class="fa-solid fa-xmark"></i></button>
            <div class="flex space-x-1.5 mb-6 bg-slate-900 p-1 rounded-2xl">
                <button onclick="switchAuthTab('login')" id="tab-login-btn" class="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white">Giriş Yap</button>
                <button onclick="switchAuthTab('register')" id="tab-register-btn" class="flex-1 py-2 rounded-xl text-xs font-bold text-slate-400">Kayıt Ol</button>
            </div>
            <form id="login-form" onsubmit="handleLogin(event)" class="space-y-3.5">
                <input type="text" id="login-username" placeholder="Kullanıcı Adı" required class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <input type="password" id="login-password" autocomplete="new-password" value="" placeholder="Şifre" required class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <button type="submit" class="w-full bg-emerald-600 text-white font-extrabold py-3 rounded-2xl text-xs">Giriş Yap</button>
            </form>
            <form id="register-form" onsubmit="handleRegister(event)" class="space-y-3.5 hidden">
                <input type="text" id="reg-username" placeholder="Kullanıcı Adı" required class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <input type="password" id="reg-password" autocomplete="new-password" placeholder="Şifre" required class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <button type="submit" class="w-full bg-emerald-600 text-white font-extrabold py-3 rounded-2xl text-xs">Kayıt Ol</button>
            </form>
        </div>
    </div>

    <!-- Deposit Modal -->
    <div id="deposit-modal" class="fixed inset-0 z-50 hidden bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-sm rounded-3xl p-7 relative animate-modal">
            <button onclick="closeDepositModal()" class="absolute top-5 right-5 text-slate-400 w-8 h-8 rounded-xl bg-slate-800/80"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-sm font-extrabold text-white mb-4">Bakiye Bildirimi</h3>
            <div class="space-y-3">
                <input type="text" id="dep-sender" placeholder="Gönderen Adı Soyadı" class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <input type="number" id="dep-amount" placeholder="Tutar (TL)" class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <button onclick="sendDepositNotice()" class="w-full bg-emerald-600 text-white font-extrabold py-3 rounded-2xl text-xs">Bildir</button>
            </div>
        </div>
    </div>

    <script>
        // Matrix Efekti
        const canvas = document.getElementById('matrix-canvas'); const ctx = canvas.getContext('2d');
        function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        window.addEventListener('resize', resizeCanvas); resizeCanvas();
        const chars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+'; const fontSize = 14;
        let columns = canvas.width / fontSize; let drops = [];
        for(let i = 0; i < columns; i++) drops[i] = 1;
        function drawMatrix() {
            ctx.fillStyle = 'rgba(3, 7, 18, 0.08)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#10b981'; ctx.font = fontSize + 'px monospace';
            for(let i = 0; i < drops.length; i++) {
                ctx.fillText(chars.charAt(Math.floor(Math.random() * chars.length)), i * fontSize, drops[i] * fontSize);
                if(drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        }
        setInterval(drawMatrix, 35);

        window.onload = () => { setTimeout(() => { document.getElementById('splash-screen').style.display = 'none'; }, 1000); fetchInitialData(); };

        let currentUsername = localStorage.getItem('sms_username') || '';
        let selectedProductData = null, currentBalance = 0, allServicesData = [], currentCategory = 'Tümü', checkInterval = null;

        async function fetchInitialData() {
            try {
                const [sRes, bRes] = await Promise.all([
                    fetch('/api/getServices'),
                    currentUsername ? fetch(\`/api/getCustomerBalance?username=\${currentUsername}\`) : Promise.resolve(null)
                ]);
                const sJson = await sRes.json();
                if(sJson.success) { allServicesData = sJson.services; renderServices(allServicesData); }
                if(bRes) {
                    const bJson = await bRes.json();
                    if(bJson.success) { currentBalance = bJson.balance; document.getElementById('customer-balance').innerText = currentBalance.toFixed(2) + ' TL'; }
                }
            } catch(e) {}
        }

        function renderServices(services) {
            const grid = document.getElementById('services-grid');
            grid.innerHTML = services.map(s => \`
                <div class="glass-card p-6 rounded-3xl flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-12 h-12 \${s.bg} rounded-2xl flex items-center justify-center \${s.color} text-xl"><i class="fa-brands \${s.icon}"></i></div>
                            <span class="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">\${s.price} TL</span>
                        </div>
                        <h3 class="text-base font-extrabold text-white mb-2">\${s.name}</h3>
                    </div>
                    <button onclick='openOrderModal(\${JSON.stringify(s)})' class="mt-6 w-full bg-emerald-600 text-white font-extrabold py-3 rounded-2xl text-xs">Numara Satın Al</button>
                </div>
            \`).join('');
        }

        function filterCategory(cat) { currentCategory = cat; filterServices(); }
        function filterServices() {
            const q = document.getElementById('search-input').value.toLowerCase();
            let f = allServicesData;
            if(currentCategory !== 'Tümü') f = f.filter(s => s.category === currentCategory);
            if(q) f = f.filter(s => s.name.toLowerCase().includes(q));
            renderServices(f);
        }

        function openQueryModal() { document.getElementById('query-modal').classList.remove('hidden'); }
        function closeQueryModal() { document.getElementById('query-modal').classList.add('hidden'); }
        async function runQuery() {
            const val = document.getElementById('query-input').value;
            const res = await fetch('/api/querySms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: val }) });
            const json = await res.json();
            if(json.success && json.item) {
                document.getElementById('q-act-id').innerText = json.item.activationId;
                document.getElementById('q-phone').innerText = json.item.phoneNumber;
                document.getElementById('q-status').innerText = json.item.status;
                document.getElementById('q-code').innerText = json.item.code || 'Bekleniyor';
                document.getElementById('query-result').classList.remove('hidden');
            } else alert('Bulunamadı!');
        }

        function openOrderModal(product) {
            if(!currentUsername) return openAuthModal();
            selectedProductData = product;
            document.getElementById('modal-product-title').innerText = product.name;
            document.getElementById('modal-product-price').innerText = product.price + ' TL';
            document.getElementById('modal-user-balance').innerText = currentBalance.toFixed(2) + ' TL';
            document.getElementById('order-step-1').classList.remove('hidden');
            document.getElementById('order-step-2').classList.add('hidden');
            document.getElementById('order-modal').classList.remove('hidden');
        }
        function closeOrderModal() { document.getElementById('order-modal').classList.add('hidden'); clearInterval(checkInterval); }

        async function executeBuy() {
            const btn = document.getElementById('buy-btn');
            btn.innerText = 'Numara Aranıyor... Lütfen Bekleyin...';
            btn.disabled = true;

            const res = await fetch('/api/buyNumber', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productKey: selectedProductData.id, username: currentUsername }) });
            const json = await res.json();
            
            btn.innerText = 'Numarayı Çek';
            btn.disabled = false;

            if(json.success) {
                document.getElementById('order-step-1').classList.add('hidden');
                document.getElementById('order-step-2').classList.remove('hidden');
                document.getElementById('res-phone').innerText = json.phoneNumber;
                currentBalance = json.remainingBalance;
                document.getElementById('customer-balance').innerText = currentBalance.toFixed(2) + ' TL';
                
                checkInterval = setInterval(async () => {
                    const r = await fetch(\`/api/checkSms/\${json.activationId}\`);
                    const j = await r.json();
                    if(j.success && j.status === 'completed') {
                        document.getElementById('res-code').innerText = j.code;
                        clearInterval(checkInterval);
                    }
                }, 3000);
            } else alert(json.message);
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
            if(json.success) { currentUsername = json.username; localStorage.setItem('sms_username', currentUsername); location.reload(); } else alert(json.message);
        }
        async function handleRegister(e) {
            e.preventDefault();
            const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.getElementById('reg-username').value, password: document.getElementById('reg-password').value }) });
            const json = await res.json();
            if(json.success) { currentUsername = json.username; localStorage.setItem('sms_username', currentUsername); location.reload(); } else alert(json.message);
        }
        function openDepositModal() { document.getElementById('deposit-modal').classList.remove('hidden'); }
        function closeDepositModal() { document.getElementById('deposit-modal').classList.add('hidden'); }
        async function sendDepositNotice() {
            if(!currentUsername) return alert('Önce giriş yapın.');
            const res = await fetch('/api/deposit/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUsername, senderName: document.getElementById('dep-sender').value, amount: document.getElementById('dep-amount').value }) });
            const json = await res.json(); alert(json.message); closeDepositModal();
        }
    </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log('Sunucu calisiyor, port:', PORT));
