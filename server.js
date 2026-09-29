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

// Veritabanı ve İstatistikler
let users = {
    "aklomanti": { balance: 5000.00, password: "123", role: "admin" } // İstediğin Admin Hesap
};
let pendingPayments = {}; 
let activeNumbers = [];   
let siteStats = {
    totalVisits: 0,
    uniqueVisitors: new Set()
};

// Ziyaretçi Sayacı Middleware
app.use((req, res, next) => {
    if (req.path === '/' && req.method === 'GET') {
        siteStats.totalVisits++;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
        siteStats.uniqueVisitors.add(ip);
    }
    next();
});

// KATALOG
const ankaCatalog = [
    { id: "wa_tr", service: "wa", country: "1", name: "WhatsApp Türkiye", price: 300, category: "WhatsApp", icon: "fa-whatsapp", color: "text-emerald-400", bg: "bg-emerald-500/15" },
    { id: "tg_tr", service: "tg", country: "1", name: "Telegram Türkiye", price: 200, category: "Telegram", icon: "fa-telegram", color: "text-blue-400", bg: "bg-blue-500/15" },
    { id: "tg_uk", service: "tg", country: "2", name: "Telegram İngiltere", price: 180, category: "Telegram", icon: "fa-telegram", color: "text-cyan-400", bg: "bg-cyan-500/15" },
    { id: "wa_uk", service: "wa", country: "2", name: "WhatsApp İngiltere", price: 200, category: "WhatsApp", icon: "fa-whatsapp", color: "text-cyan-400", bg: "bg-cyan-500/15" },
    { id: "wa_ph", service: "wa", country: "4", name: "WhatsApp Filipinler", price: 150, category: "WhatsApp", icon: "fa-whatsapp", color: "text-teal-400", bg: "bg-teal-500/15" }
];

// ENDPOINTLER
app.get('/api/getServices', (req, res) => res.json({ success: true, services: ankaCatalog }));

app.get('/api/getCustomerBalance', (req, res) => {
    const username = req.query.username;
    if (!username || !users[username]) return res.json({ success: false });
    res.json({ success: true, balance: users[username].balance, role: users[username].role });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username].password === password) {
        res.json({ success: true, message: 'Giriş başarılı!', username, balance: users[username].balance, role: users[username].role });
    } else {
        res.status(400).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı!' });
    }
});

app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Lütfen tüm alanları doldurun.' });
    if (users[username]) return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten alınmış!' });
    
    const role = (username === 'aklomanti') ? 'admin' : 'user';
    users[username] = { password, balance: 25.00, role }; 
    res.json({ success: true, message: 'Kayıt başarılı! 25 TL bonus hesabınıza eklendi.', username, balance: 25.00, role });
});

// ADMİN İŞLEMLERİ & İSTATİSTİKLER
app.get('/api/admin/getStats', (req, res) => {
    const { adminUsername } = req.query;
    if (!users[adminUsername] || users[adminUsername].role !== 'admin') return res.status(403).json({ success: false });
    res.json({ 
        success: true, 
        stats: {
            totalVisits: siteStats.totalVisits,
            uniqueVisitors: siteStats.uniqueVisitors.size
        }
    });
});

app.post('/api/admin/updateBalance', (req, res) => {
    const { adminUsername, targetUsername, newBalance } = req.body;
    if (!users[adminUsername] || users[adminUsername].role !== 'admin') return res.status(403).json({ success: false, message: 'Yetkisiz işlem!' });
    if (!users[targetUsername]) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    
    users[targetUsername].balance = parseFloat(newBalance);
    res.json({ success: true, message: `${targetUsername} bakiyesi güncellendi.` });
});

app.get('/api/admin/getUsers', (req, res) => {
    const { adminUsername } = req.query;
    if (!users[adminUsername] || users[adminUsername].role !== 'admin') return res.status(403).json({ success: false });
    
    const userList = Object.keys(users).map(k => ({ username: k, balance: users[k].balance, role: users[k].role }));
    res.json({ success: true, users: userList });
});

app.get('/api/admin/getPendingPayments', (req, res) => {
    const { adminUsername } = req.query;
    if (!users[adminUsername] || users[adminUsername].role !== 'admin') return res.status(403).json({ success: false });
    res.json({ success: true, payments: pendingPayments });
});

app.post('/api/admin/processPayment', (req, res) => {
    const { adminUsername, paymentId, action } = req.body;
    if (!users[adminUsername] || users[adminUsername].role !== 'admin') return res.status(403).json({ success: false, message: 'Yetkisiz!' });
    
    const payment = pendingPayments[paymentId];
    if (!payment || payment.status !== 'pending') return res.status(400).json({ success: false, message: 'Ödeme bulunamadı veya zaten işlenmiş.' });

    if (action === 'approve') {
        if (!users[payment.username]) users[payment.username] = { balance: 0, password: '123', role: 'user' };
        users[payment.username].balance += payment.amount;
        payment.status = 'approved';
        res.json({ success: true, message: 'Ödeme onaylandı ve bakiye yüklendi.' });
    } else {
        payment.status = 'rejected';
        res.json({ success: true, message: 'Ödeme reddedildi.' });
    }
});

// SORUNSUZ NUMARA ÇEKME SİSTEMİ
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/api/buyNumber', async (req, res) => {
    const { productKey, username } = req.body;
    if (!users[username]) return res.status(400).json({ success: false, message: 'Oturum bulunamadı. Lütfen giriş yapın.' });
    const product = ankaCatalog.find(s => s.id === productKey);
    if (!product) return res.status(400).json({ success: false, message: 'Ürün bulunamadı.' });
    if (users[username].balance < product.price) return res.status(400).json({ success: false, message: `Bakiyeniz yetersiz!` });

    const maxRetries = 15;
    let attempt = 0;
    while (attempt < maxRetries) {
        attempt++;
        try {
            const apiCallUrl = `${API_URL}?api_key=${API_KEY}&action=getNumber&service=${product.service}&country=${product.country}&operator=any`;
            const response = await axios.get(apiCallUrl, { timeout: 8000 });
            const data = typeof response.data === 'string' ? response.data.trim() : String(response.data);

            if (data.startsWith('ACCESS_NUMBER')) {
                users[username].balance -= product.price;
                const parts = data.split(':');
                const activationId = parts[1];
                const phoneNumber = parts[2];
                
                activeNumbers.push({ activationId, phoneNumber, username, productName: product.name, status: 'WAITING', code: null });
                return res.json({ success: true, activationId, phoneNumber, remainingBalance: users[username].balance });
            } else if (data === 'NO_NUMBERS' || data === 'STATUS_WAIT_PNUM') {
                await sleep(2000);
            } else if (data.startsWith('BAD_KEY') || data.startsWith('ERROR')) {
                return res.status(400).json({ success: false, message: `API Sağlayıcı Hatası: ${data}` });
            } else {
                await sleep(1500);
            }
        } catch (error) {
            console.error('Numara çekme bağlantı hatası:', error.message);
        }
    }
    res.status(400).json({ success: false, message: 'Şu an bu serviste müsait numara kalmadı, lütfen biraz sonra tekrar deneyin.' });
});

// KOD KONTROLÜ
app.get('/api/checkSms/:activationId', async (req, res) => {
    const { activationId } = req.params;
    try {
        const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getStatus&id=${activationId}`, { timeout: 5000 });
        const resultText = typeof response.data === 'string' ? response.data.trim() : String(response.data);
        let record = activeNumbers.find(a => a.activationId === activationId);

        if (resultText.startsWith('STATUS_OK')) {
            const smsCode = resultText.split(':')[1];
            if (record) { record.status = 'COMPLETED'; record.code = smsCode; }
            return res.json({ success: true, status: 'completed', code: smsCode });
        }
        return res.json({ success: true, status: 'waiting' });
    } catch (error) {
        res.json({ success: true, status: 'waiting' });
    }
});

// SORGU PANELİ
app.post('/api/querySms', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, message: 'Arama terimi girin.' });
    let found = activeNumbers.find(a => a.activationId === query || a.phoneNumber.includes(query));
    if (found) {
        try {
            const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getStatus&id=${found.activationId}`);
            const resultText = typeof response.data === 'string' ? response.data.trim() : String(response.data);
            if (resultText.startsWith('STATUS_OK')) {
                found.status = 'COMPLETED'; found.code = resultText.split(':')[1];
            }
        } catch(e) {}
        return res.json({ success: true, item: found });
    }
    res.status(404).json({ success: false, message: 'Kayıt bulunamadı.' });
});

// ÇİFT YÖNLÜ ÖDEME BİLDİRİMİ (TELEGRAM + WEB ADMIN PANEL)
app.post('/api/deposit/notify', async (req, res) => {
    const { username, senderName, amount } = req.body;
    if (!senderName || !amount) return res.status(400).json({ success: false, message: 'Eksik bilgi.' });

    const paymentId = 'pay_' + Date.now();
    pendingPayments[paymentId] = { id: paymentId, username, amount: parseFloat(amount), senderName, status: 'pending', time: new Date().toLocaleTimeString() };

    if (bot) {
        bot.sendMessage(TELEGRAM_CHAT_ID, `💰 *Yeni Bakiye Bildirimi*\n\n👤 Kullanıcı: ${username}\n💳 Gönderen: ${senderName}\n💵 Tutar: ${amount} TL\n\nOnaylıyor musunuz?`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: '✅ Onayla', callback_data: `approve_${paymentId}` }, { text: '❌ Reddet', callback_data: `reject_${paymentId}` }]]
            }
        }).catch(err => console.error('Telegram Mesaj Hatası:', err.message));
    }
    res.json({ success: true, message: 'Ödeme bildirimi başarıyla oluşturuldu ve yönetici onayına gönderildi.' });
});

if (bot) {
    bot.on('callback_query', (query) => {
        const data = query.data;
        const action = data.split('_')[0]; 
        const paymentId = data.replace(`${action}_`, '');
        const payment = pendingPayments[paymentId];

        if (!payment || payment.status !== 'pending') {
            return bot.answerCallbackQuery(query.id, { text: 'Bu işlem daha önce sonuçlanmış.', show_alert: true });
        }

        if (action === 'approve') {
            if (!users[payment.username]) users[payment.username] = { balance: 0, password: '123', role: 'user' };
            users[payment.username].balance += payment.amount;
            payment.status = 'approved';
            bot.editMessageText(query.message.text + `\n\n✅ *ONAYLANDI (Telegram)*`, { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown' }).catch(()=>{});
        } else {
            payment.status = 'rejected';
            bot.editMessageText(query.message.text + `\n\n❌ *REDDEDİLDİ (Telegram)*`, { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown' }).catch(()=>{});
        }
        bot.answerCallbackQuery(query.id, { text: 'İşlem başarıyla gerçekleştirildi.' });
    });
}

// ÖN YÜZ
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ANKA CIA SMS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #030712; color: #f8fafc; overflow-x: hidden; }
        #matrix-canvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -2; opacity: 0.55; pointer-events: none; }
        .glass { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(34, 197, 94, 0.35); }
        .glass-card { background: rgba(30, 41, 59, 0.70); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.15); transition: all 0.3s; }
        .glass-card:hover { transform: translateY(-4px); border-color: rgba(34, 197, 94, 0.8); }
        .animate-modal { animation: modalAnim 0.3s forwards; }
        @keyframes modalAnim { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-emerald-600">
    <canvas id="matrix-canvas"></canvas>

    <header class="glass sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3 cursor-pointer" onclick="location.reload()">
            <div class="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-blue-600 rounded-xl flex items-center justify-center">
                <i class="fa-solid fa-shield-halved text-white text-lg"></i>
            </div>
            <div>
                <span class="font-extrabold text-base bg-gradient-to-r from-emerald-400 to-white bg-clip-text text-transparent">ANKA CIA SMS</span>
            </div>
        </div>
        <div class="flex items-center space-x-2.5">
            <button id="admin-btn" onclick="openAdminModal()" class="hidden bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-rose-900/30">
                <i class="fa-solid fa-gauge mr-1"></i> Admin Paneli
            </button>
            <button onclick="openQueryModal()" class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3.5 py-2 rounded-xl text-xs font-bold">
                <i class="fa-solid fa-search"></i> Sorgu
            </button>
            <div class="glass px-3.5 py-2 rounded-2xl flex items-center space-x-2 text-xs">
                <i class="fa-solid fa-wallet text-emerald-400"></i>
                <span id="customer-balance" class="font-extrabold text-emerald-400">0.00 TL</span>
            </div>
            <button onclick="openDepositModal()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-plus"></i></button>
            <button onclick="openAuthModal()" class="glass hover:bg-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold">
                <i class="fa-solid fa-user-circle text-emerald-400 text-sm"></i> <span id="username-display" class="ml-1 hidden sm:inline">Giriş Yap</span>
            </button>
            <button onclick="logout()" id="logout-btn" class="hidden text-rose-400 px-2 py-2 text-xs"><i class="fa-solid fa-right-from-bracket"></i></button>
        </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-10 w-full flex-grow">
        <div id="services-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    </main>

    <!-- Admin Modal -->
    <div id="admin-modal" class="fixed inset-0 z-50 hidden bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-2xl rounded-3xl p-7 relative animate-modal max-h-[90vh] overflow-y-auto">
            <button onclick="closeAdminModal()" class="absolute top-5 right-5 text-slate-400 w-8 h-8 rounded-xl bg-slate-800/80"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-base font-extrabold text-white mb-4"><i class="fa-solid fa-lock text-rose-500"></i> Yönetim Paneli</h3>
            
            <div class="space-y-6">
                <!-- Ziyaretçi Sayacı İstatistikleri -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                        <span class="text-[10px] text-slate-400 block mb-1">Toplam Ziyaret (Sayfa Görünümü)</span>
                        <div id="stat-total-visits" class="text-xl font-extrabold text-emerald-400">0</div>
                    </div>
                    <div class="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                        <span class="text-[10px] text-slate-400 block mb-1">Tekil Ziyaretçi (Farklı IP)</span>
                        <div id="stat-unique-visitors" class="text-xl font-extrabold text-blue-400">0</div>
                    </div>
                </div>

                <!-- Bakiye Güncelleme Alanı -->
                <div class="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                    <h4 class="text-xs font-bold text-emerald-400 mb-3">Kullanıcı Bakiye Düzenle</h4>
                    <div class="flex gap-2">
                        <input type="text" id="admin-target-user" placeholder="Kullanıcı Adı" class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white">
                        <input type="number" id="admin-new-balance" placeholder="Yeni Bakiye" class="w-32 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white">
                        <button onclick="adminUpdateBalance()" class="bg-rose-600 hover:bg-rose-500 text-white px-4 rounded-xl text-xs font-bold">Güncelle</button>
                    </div>
                </div>

                <!-- Bekleyen Ödemeler Onay Alanı -->
                <div class="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                    <h4 class="text-xs font-bold text-amber-400 mb-3">Onay Bekleyen Ödemeler (Web & Telegram)</h4>
                    <div id="admin-pending-payments" class="space-y-2 max-h-40 overflow-y-auto">
                        <p class="text-xs text-slate-500">Yükleniyor...</p>
                    </div>
                </div>

                <!-- Kullanıcı Listesi -->
                <div class="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 max-h-48 overflow-y-auto">
                    <h4 class="text-xs font-bold text-blue-400 mb-3">Kayıtlı Kullanıcılar</h4>
                    <table class="w-full text-xs text-left text-slate-300" id="admin-users-table">
                        <thead class="text-slate-400 border-b border-slate-700"><tr><th class="pb-2">Kullanıcı</th><th class="pb-2">Rol</th><th class="pb-2">Bakiye</th></tr></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Deposit Modal -->
    <div id="deposit-modal" class="fixed inset-0 z-50 hidden bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-sm rounded-3xl p-7 relative animate-modal">
            <button onclick="closeDepositModal()" class="absolute top-5 right-5 text-slate-400 w-8 h-8 rounded-xl bg-slate-800/80"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-sm font-extrabold text-white mb-4">Bakiye Yükleme</h3>
            
            <div class="bg-slate-900/80 p-4 rounded-2xl border border-emerald-500/20 mb-5">
                <p class="text-[11px] text-slate-400 mb-1">Alıcı Adı: <span class="text-white font-bold">Resul Sakal</span></p>
                <p class="text-[11px] text-slate-400 mt-2">IBAN Numaramız:</p>
                <p class="text-xs text-emerald-400 font-mono font-bold tracking-widest bg-slate-950 p-2 rounded-lg text-center mt-1">TR62 0006 2000 5000 0006 8107 73</p>
            </div>

            <p class="text-[10px] text-slate-400 mb-3 text-center">Ödemeyi yaptıktan sonra formu gönderin.</p>
            <div class="space-y-3">
                <input type="text" id="dep-sender" placeholder="Gönderici Adı Soyadı" class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <input type="number" id="dep-amount" placeholder="Yüklenen Tutar (TL)" class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <button onclick="sendDepositNotice()" class="w-full bg-emerald-600 text-white font-extrabold py-3 rounded-2xl text-xs">Ödeme Bildirimi Yap</button>
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
                <input type="password" id="login-password" placeholder="Şifre" required class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <button type="submit" class="w-full bg-emerald-600 text-white font-extrabold py-3 rounded-2xl text-xs">Giriş Yap</button>
            </form>
            
            <form id="register-form" onsubmit="handleRegister(event)" class="space-y-3.5 hidden">
                <input type="text" id="reg-username" placeholder="Yeni Kullanıcı Adı" required class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <input type="password" id="reg-password" placeholder="Yeni Şifre" required class="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white">
                <button type="submit" class="w-full bg-blue-600 text-white font-extrabold py-3 rounded-2xl text-xs">Hesap Oluştur</button>
            </form>
        </div>
    </div>
    
    <!-- Sipariş Modal -->
    <div id="order-modal" class="fixed inset-0 z-50 hidden bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-3xl p-7 relative animate-modal">
            <button onclick="closeOrderModal()" class="absolute top-5 right-5 text-slate-400 w-8 h-8 rounded-xl bg-slate-800/80"><i class="fa-solid fa-xmark"></i></button>
            <div id="order-step-1">
                <h3 id="modal-product-title" class="text-lg font-extrabold text-white mb-2"></h3>
                <div class="bg-slate-900 p-4 rounded-2xl mb-6 text-xs">
                    <div class="flex justify-between mb-2"><span class="text-slate-400">Ücret:</span> <span id="modal-product-price" class="text-emerald-400"></span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Bakiyeniz:</span> <span id="modal-user-balance" class="text-white"></span></div>
                </div>
                <button onclick="executeBuy()" id="buy-btn" class="w-full bg-emerald-600 text-white font-extrabold py-3.5 rounded-2xl text-xs">Satın Al</button>
            </div>
            <div id="order-step-2" class="hidden space-y-4 text-center">
                <div class="bg-slate-900 p-4 rounded-2xl">
                    <span class="text-[10px] text-slate-400 block mb-1">Numara</span>
                    <div id="res-phone" class="text-xl font-extrabold text-white font-mono">+90 ...</div>
                </div>
                <div class="bg-slate-900 p-4 rounded-2xl">
                    <span class="text-[10px] text-slate-400 block mb-1">SMS Kodu</span>
                    <div id="res-code" class="text-2xl font-extrabold text-emerald-400 font-mono animate-pulse">Bekleniyor...</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Sorgu Modal -->
    <div id="query-modal" class="fixed inset-0 z-50 hidden bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
        <div class="glass w-full max-w-lg rounded-3xl p-7 relative animate-modal">
            <button onclick="closeQueryModal()" class="absolute top-5 right-5 text-slate-400 w-8 h-8 rounded-xl bg-slate-800/80"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-base font-extrabold text-white mb-4">Sorgu Paneli</h3>
            <div class="flex space-x-2 mb-4">
                <input type="text" id="query-input" placeholder="Aktivasyon ID veya Numara" class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white">
                <button onclick="runQuery()" class="bg-emerald-600 text-white px-5 rounded-xl text-xs font-bold">Bul</button>
            </div>
            <div id="query-result" class="hidden bg-slate-900 rounded-xl p-5 space-y-2">
                <div class="flex justify-between"><span class="text-xs text-slate-400">ID:</span><span id="q-act-id" class="text-xs font-bold text-white"></span></div>
                <div class="flex justify-between"><span class="text-xs text-slate-400">Numara:</span><span id="q-phone" class="text-xs font-bold text-emerald-400"></span></div>
                <div class="text-center mt-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span class="text-[10px] text-slate-500 block">KOD</span>
                    <span id="q-code" class="text-xl font-extrabold text-emerald-400 font-mono"></span>
                </div>
            </div>
        </div>
    </div>

    <script>
        const cvs = document.getElementById('matrix-canvas'); const ctx = cvs.getContext('2d');
        function resize() { cvs.width = window.innerWidth; cvs.height = window.innerHeight; }
        window.addEventListener('resize', resize); resize();
        const chars = '01ANKASMS'; const drops = Array(Math.floor(cvs.width / 14)).fill(1);
        setInterval(() => {
            ctx.fillStyle = 'rgba(3, 7, 18, 0.1)'; ctx.fillRect(0, 0, cvs.width, cvs.height);
            ctx.fillStyle = '#10b981'; ctx.font = '14px monospace';
            drops.forEach((y, i) => {
                ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 14, y * 14);
                if(y * 14 > cvs.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            });
        }, 50);

        let currentUsername = localStorage.getItem('sms_username') || '';
        let currentRole = localStorage.getItem('sms_role') || 'user';
        let currentBalance = 0; let checkInterval = null; let selProd = null;

        window.onload = async () => {
            if(currentUsername) {
                document.getElementById('username-display').innerText = currentUsername;
                document.getElementById('logout-btn').classList.remove('hidden');
                if(currentRole === 'admin') document.getElementById('admin-btn').classList.remove('hidden');
                const br = await fetch(\`/api/getCustomerBalance?username=\${currentUsername}\`);
                const bj = await br.json();
                if(bj.success) { 
                    currentBalance = bj.balance; 
                    document.getElementById('customer-balance').innerText = currentBalance.toFixed(2) + ' TL'; 
                } else logout();
            }
            const sr = await fetch('/api/getServices');
            const sj = await sr.json();
            if(sj.success) renderServices(sj.services);
        };

        function renderServices(data) {
            document.getElementById('services-grid').innerHTML = data.map(s => \`
                <div class="glass-card p-6 rounded-3xl flex flex-col justify-between">
                    <div class="flex justify-between items-center mb-4">
                        <div class="w-12 h-12 \${s.bg} rounded-xl flex items-center justify-center \${s.color} text-xl"><i class="fa-brands \${s.icon}"></i></div>
                        <span class="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">\${s.price} TL</span>
                    </div>
                    <h3 class="text-base font-extrabold text-white mb-4">\${s.name}</h3>
                    <button onclick='openOrderModal(\${JSON.stringify(s)})' class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs">Satın Al</button>
                </div>\`).join('');
        }

        function openAuthModal() { if(!currentUsername) document.getElementById('auth-modal').classList.remove('hidden'); }
        function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }
        function switchAuthTab(tab) {
            if(tab === 'login') {
                document.getElementById('login-form').classList.remove('hidden'); document.getElementById('register-form').classList.add('hidden');
                document.getElementById('tab-login-btn').className = "flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white";
                document.getElementById('tab-register-btn').className = "flex-1 py-2 rounded-xl text-xs font-bold text-slate-400";
            } else {
                document.getElementById('register-form').classList.remove('hidden'); document.getElementById('login-form').classList.add('hidden');
                document.getElementById('tab-register-btn').className = "flex-1 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white";
                document.getElementById('tab-login-btn').className = "flex-1 py-2 rounded-xl text-xs font-bold text-slate-400";
            }
        }
        async function handleLogin(e) {
            e.preventDefault();
            const r = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username: document.getElementById('login-username').value, password: document.getElementById('login-password').value}) });
            const j = await r.json();
            if(j.success) { localStorage.setItem('sms_username', j.username); localStorage.setItem('sms_role', j.role); location.reload(); } else alert(j.message);
        }
        async function handleRegister(e) {
            e.preventDefault();
            const r = await fetch('/api/auth/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username: document.getElementById('reg-username').value, password: document.getElementById('reg-password').value}) });
            const j = await r.json();
            if(j.success) { localStorage.setItem('sms_username', j.username); localStorage.setItem('sms_role', j.username === 'aklomanti' ? 'admin' : 'user'); alert(j.message); location.reload(); } else alert(j.message);
        }
        function logout() { localStorage.removeItem('sms_username'); localStorage.removeItem('sms_role'); location.reload(); }

        function openDepositModal() { if(!currentUsername) return openAuthModal(); document.getElementById('deposit-modal').classList.remove('hidden'); }
        function closeDepositModal() { document.getElementById('deposit-modal').classList.add('hidden'); }
        async function sendDepositNotice() {
            const r = await fetch('/api/deposit/notify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username: currentUsername, senderName: document.getElementById('dep-sender').value, amount: document.getElementById('dep-amount').value}) });
            const j = await r.json(); alert(j.message); closeDepositModal();
        }

        function openOrderModal(p) {
            if(!currentUsername) return openAuthModal();
            selProd = p;
            document.getElementById('modal-product-title').innerText = p.name;
            document.getElementById('modal-product-price').innerText = p.price + ' TL';
            document.getElementById('modal-user-balance').innerText = currentBalance.toFixed(2) + ' TL';
            document.getElementById('order-step-1').classList.remove('hidden');
            document.getElementById('order-step-2').classList.add('hidden');
            document.getElementById('order-modal').classList.remove('hidden');
        }
        function closeOrderModal() { document.getElementById('order-modal').classList.add('hidden'); clearInterval(checkInterval); }
        async function executeBuy() {
            const btn = document.getElementById('buy-btn'); btn.innerText = 'Numara Aranıyor...'; btn.disabled = true;
            const r = await fetch('/api/buyNumber', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({productKey: selProd.id, username: currentUsername}) });
            const j = await r.json();
            btn.innerText = 'Satın Al'; btn.disabled = false;
            if(j.success) {
                document.getElementById('order-step-1').classList.add('hidden'); document.getElementById('order-step-2').classList.remove('hidden');
                document.getElementById('res-phone').innerText = j.phoneNumber;
                document.getElementById('customer-balance').innerText = j.remainingBalance.toFixed(2) + ' TL';
                checkInterval = setInterval(async () => {
                    const c = await fetch(\`/api/checkSms/\${j.activationId}\`); const cj = await c.json();
                    if(cj.success && cj.status === 'completed') { document.getElementById('res-code').innerText = cj.code; clearInterval(checkInterval); }
                }, 3000);
            } else alert(j.message);
        }

        function openQueryModal() { document.getElementById('query-modal').classList.remove('hidden'); }
        function closeQueryModal() { document.getElementById('query-modal').classList.add('hidden'); }
        async function runQuery() {
            const r = await fetch('/api/querySms', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({query: document.getElementById('query-input').value}) });
            const j = await r.json();
            if(j.success && j.item) {
                document.getElementById('q-act-id').innerText = j.item.activationId;
                document.getElementById('q-phone').innerText = j.item.phoneNumber;
                document.getElementById('q-code').innerText = j.item.code || 'Bekleniyor';
                document.getElementById('query-result').classList.remove('hidden');
            } else alert(j.message);
        }

        async function openAdminModal() {
            document.getElementById('admin-modal').classList.remove('hidden');
            loadAdminData();
        }
        function closeAdminModal() { document.getElementById('admin-modal').classList.add('hidden'); }

        async function loadAdminData() {
            // Ziyaretçi Verilerini Çek
            const sr = await fetch(\`/api/admin/getStats?adminUsername=\${currentUsername}\`);
            const sj = await sr.json();
            if(sj.success) {
                document.getElementById('stat-total-visits').innerText = sj.stats.totalVisits;
                document.getElementById('stat-unique-visitors').innerText = sj.stats.uniqueVisitors;
            }

            // Kullanıcıları Çek
            const r = await fetch(\`/api/admin/getUsers?adminUsername=\${currentUsername}\`);
            const j = await r.json();
            if(j.success) {
                document.querySelector('#admin-users-table tbody').innerHTML = j.users.map(u => \`
                    <tr class="border-b border-slate-800">
                        <td class="py-2">\${u.username}</td>
                        <td class="py-2 text-slate-400">\${u.role}</td>
                        <td class="py-2 text-emerald-400 font-bold">\${u.balance} TL</td>
                    </tr>
                \`).join('');
            }

            // Bekleyen Ödemeleri Çek
            const pr = await fetch(\`/api/admin/getPendingPayments?adminUsername=\${currentUsername}\`);
            const pj = await pr.json();
            if(pj.success) {
                const paymentsArr = Object.values(pj.payments).filter(p => p.status === 'pending');
                if(paymentsArr.length === 0) {
                    document.getElementById('admin-pending-payments').innerHTML = '<p class="text-xs text-slate-500">Bekleyen ödeme yok.</p>';
                } else {
                    document.getElementById('admin-pending-payments').innerHTML = paymentsArr.map(p => \`
                        <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                            <div>
                                <span class="text-white font-bold">\${p.username}</span> - <span class="text-emerald-400">\${p.amount} TL</span><br>
                                <span class="text-[10px] text-slate-400">Gönderen: \${p.senderName} (\${p.time})</span>
                            </div>
                            <div class="space-x-1">
                                <button onclick="processPayment('\${p.id}', 'approve')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold">Onayla</button>
                                <button onclick="processPayment('\${p.id}', 'reject')" class="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg font-bold">Reddet</button>
                            </div>
                        </div>
                    \`).join('');
                }
            }
        }

        async function adminUpdateBalance() {
            const r = await fetch('/api/admin/updateBalance', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({adminUsername: currentUsername, targetUsername: document.getElementById('admin-target-user').value, newBalance: document.getElementById('admin-new-balance').value}) });
            const j = await r.json(); alert(j.message); if(j.success) loadAdminData();
        }

        async function processPayment(paymentId, action) {
            const r = await fetch('/api/admin/processPayment', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({adminUsername: currentUsername, paymentId, action}) });
            const j = await r.json(); alert(j.message); if(j.success) loadAdminData();
        }
    </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log('Sunucu calisiyor, port:', PORT));
