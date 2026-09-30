const express = require('express');
const axios = require('axios');
const telegramModule = require('node-telegram-bot-api');
const TelegramBot = telegramModule.default || telegramModule; 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_KEY = 'osms_24a366588a5adf689da78bd656ef845effba51b53754bf57';
const API_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';
// Yeni ve güncel token:
const TELEGRAM_BOT_TOKEN = '8874989367:AAEw7YZYePXbQ2b04eFwTr5A9oYJLM7kStw';
const TELEGRAM_CHAT_ID = '8964930489';

let bot;
try {
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: { interval: 2000, timeout: 10 } });
    // Eski çakışma sinyallerini yakala
    bot.on('polling_error', (error) => {
        if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
            console.log('Bot çakışması algılandı, yeniden bağlanılıyor...');
        }
    });
} catch (error) {
    console.log('Telegram bot başlatma hatası:', error.message);
}

// Veritabanı ve Ziyaretçi İstatistikleri
let users = {
    "aklomanti": { balance: 5000.00, password: "123", role: "admin" }
};
let pendingPayments = {}; 
let activeNumbers = [];   
let siteVisitors = []; 

// Ziyaretçi Kayıt Sistemi
app.use((req, res, next) => {
    if (req.path === '/' && req.method === 'GET') {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Bilinmeyen IP';
        const time = new Date().toLocaleString('tr-TR');
        siteVisitors.unshift({ ip, time });
        if (siteVisitors.length > 50) siteVisitors.pop();
    }
    next();
});

const ankaCatalog = [
    { id: "wa_tr", service: "wa", country: "1", name: "WhatsApp Türkiye", price: 300, category: "WhatsApp", icon: "fa-whatsapp", color: "text-emerald-400", bg: "bg-emerald-500/15" },
    { id: "tg_tr", service: "tg", country: "1", name: "Telegram Türkiye", price: 200, category: "Telegram", icon: "fa-telegram", color: "text-blue-400", bg: "bg-blue-500/15" }
];

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
    if (!username || !password) return res.status(400).json({ success: false, message: 'Eksik bilgi.' });
    if (users[username]) return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten alınmış!' });
    
    const role = (username === 'aklomanti') ? 'admin' : 'user';
    users[username] = { password, balance: 25.00, role }; 
    res.json({ success: true, message: 'Kayıt başarılı!', username, balance: 25.00, role });
});

app.get('/api/admin/getStats', (req, res) => {
    const { adminUsername } = req.query;
    if (!users[adminUsername] || users[adminUsername].role !== 'admin') return res.status(403).json({ success: false });
    res.json({ success: true, visitors: siteVisitors, totalVisits: siteVisitors.length });
});

app.get('/api/admin/getPendingPayments', (req, res) => {
    const { adminUsername } = req.query;
    if (!users[adminUsername] || users[adminUsername].role !== 'admin') return res.status(403).json({ success: false });
    res.json({ success: true, payments: pendingPayments });
});

app.post('/api/admin/processPayment', (req, res) => {
    const { adminUsername, paymentId, action } = req.body;
    if (!users[adminUsername] || users[adminUsername].role !== 'admin') return res.status(403).json({ success: false });
    const payment = pendingPayments[paymentId];
    if (!payment || payment.status !== 'pending') return res.status(400).json({ success: false, message: 'Ödeme bulunamadı.' });

    if (action === 'approve') {
        if (!users[payment.username]) users[payment.username] = { balance: 0, password: '123', role: 'user' };
        users[payment.username].balance += payment.amount;
        payment.status = 'approved';
        res.json({ success: true, message: 'Ödeme onaylandı.' });
    } else {
        payment.status = 'rejected';
        res.json({ success: true, message: 'Ödeme reddedildi.' });
    }
});

// STOK SORUNUNU AŞAN AKILLI NUMARA ÇEKME MOTORU
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
app.post('/api/buyNumber', async (req, res) => {
    const { productKey, username } = req.body;
    if (!users[username]) return res.status(400).json({ success: false, message: 'Önce giriş yapmalısınız.' });
    const product = ankaCatalog.find(s => s.id === productKey);
    if (!product || users[username].balance < product.price) return res.status(400).json({ success: false, message: 'Yetersiz bakiye veya geçersiz ürün.' });

    let successData = null;
    for (let attempt = 1; attempt <= 6; attempt++) {
        try {
            let response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getNumber&service=${product.service}&country=${product.country}&operator=any`, { timeout: 5000 });
            let text = String(response.data).trim();
            if (text.startsWith('ACCESS_NUMBER')) { successData = text; break; }

            response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getNumber&service=${product.service}&country=${product.country}`, { timeout: 5000 });
            text = String(response.data).trim();
            if (text.startsWith('ACCESS_NUMBER')) { successData = text; break; }
        } catch (e) {}
        await sleep(1500);
    }

    if (successData) {
        users[username].balance -= product.price;
        const parts = successData.split(':');
        const activationId = parts[1];
        const phoneNumber = parts[2];
        activeNumbers.push({ activationId, phoneNumber, username, productName: product.name });
        return res.json({ success: true, activationId, phoneNumber, remainingBalance: users[username].balance });
    }

    res.status(400).json({ success: false, message: 'Şu an API stoklarında yoğunluk var. Lütfen 5 saniye sonra tekrar deneyin.' });
});

app.get('/api/checkSms/:activationId', async (req, res) => {
    try {
        const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getStatus&id=${req.params.activationId}`, { timeout: 4000 });
        const text = String(response.data).trim();
        if (text.startsWith('STATUS_OK')) {
            return res.json({ success: true, status: 'completed', code: text.split(':')[1] });
        }
    } catch (e) {}
    res.json({ success: true, status: 'waiting' });
});

app.post('/api/deposit/notify', async (req, res) => {
    const { username, senderName, amount } = req.body;
    if (!senderName || !amount) return res.status(400).json({ success: false, message: 'Eksik bilgi.' });

    const paymentId = 'pay_' + Date.now();
    pendingPayments[paymentId] = { id: paymentId, username, amount: parseFloat(amount), senderName, status: 'pending', time: new Date().toLocaleTimeString() };

    if (bot) {
        bot.sendMessage(TELEGRAM_CHAT_ID, `💰 *Yeni Ödeme Bildirimi*\n\n👤 Kullanıcı: ${username}\n💳 Gönderen: ${senderName}\n💵 Tutar: ${amount} TL`, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '✅ Onayla', callback_data: `approve_${paymentId}` }, { text: '❌ Reddet', callback_data: `reject_${paymentId}` }]] }
        }).catch(()=>{});
    }
    res.json({ success: true, message: 'Bildirim gönderildi.' });
});

if (bot) {
    bot.on('callback_query', (query) => {
        const data = query.data;
        const action = data.split('_')[0]; 
        const paymentId = data.replace(`${action}_`, '');
        const payment = pendingPayments[paymentId];

        if (payment && payment.status === 'pending') {
            if (action === 'approve') {
                if (!users[payment.username]) users[payment.username] = { balance: 0, password: '123', role: 'user' };
                users[payment.username].balance += payment.amount;
                payment.status = 'approved';
                bot.editMessageText(query.message.text + `\n\n✅ ONAYLANDI`, { chat_id: query.message.chat.id, message_id: query.message.message_id }).catch(()=>{});
            } else {
                payment.status = 'rejected';
                bot.editMessageText(query.message.text + `\n\n❌ REDDEDİLDİ`, { chat_id: query.message.chat.id, message_id: query.message.message_id }).catch(()=>{});
            }
        }
        bot.answerCallbackQuery(query.id);
    });
}

// ARAYÜZ (HTML)
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ANKA SMS - Sanal Numara Paneli</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
    <header class="p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center sticky top-0 z-50">
        <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold"><i class="fa-solid fa-shield-halved"></i></div>
            <h1 class="font-black tracking-wider text-emerald-400 text-lg">ANKA SMS</h1>
        </div>
        <div class="flex items-center space-x-3">
            <button id="admin-btn" onclick="openAdmin()" class="hidden bg-rose-600 hover:bg-rose-500 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-lg shadow-rose-900/20"><i class="fa-solid fa-lock mr-1"></i> Admin Paneli</button>
            <div class="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center space-x-1">
                <i class="fa-solid fa-wallet text-emerald-400 text-xs"></i>
                <span id="bal" class="text-xs text-emerald-400 font-extrabold">0.00 TL</span>
            </div>
            <button onclick="openAuth()" id="auth-txt" class="bg-slate-800 hover:bg-slate-700 px-4 py-1.5 rounded-xl text-xs font-semibold transition">Giriş Yap</button>
            <button onclick="logout()" id="out-btn" class="hidden text-rose-400 hover:text-rose-300 p-2 text-xs transition" title="Çıkış Yap"><i class="fa-solid fa-right-from-bracket text-sm"></i></button>
        </div>
    </header>

    <main class="max-w-4xl mx-auto p-6 w-full flex-grow">
        <div class="text-center my-6">
            <h2 class="text-2xl font-extrabold tracking-tight">Güvenilir Onay SMS Hizmeti</h2>
            <p class="text-xs text-slate-400 mt-1">Anında numara al, SMS'lerini saniyeler içinde onayla.</p>
        </div>
        <div id="grid" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>
        <div class="mt-8 text-center">
            <button onclick="openDep()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-900/30 flex items-center justify-center mx-auto space-x-2">
                <i class="fa-solid fa-circle-plus"></i><span>Bakiye Yükle (IBAN Bildirimi)</span>
            </button>
        </div>
    </main>

    <!-- Admin Modal -->
    <div id="admin-m" class="fixed inset-0 hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-2xl p-6 rounded-3xl relative max-h-[85vh] overflow-y-auto shadow-2xl">
            <button onclick="closeAdmin()" class="absolute top-5 right-5 text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
            <h3 class="font-extrabold text-sm mb-4 text-rose-500 flex items-center"><i class="fa-solid fa-shield-dog mr-2"></i> Admin Paneli & Ziyaretçi Takibi</h3>
            
            <div class="mb-6">
                <h4 class="text-xs font-bold mb-2 text-emerald-400 flex items-center"><i class="fa-solid fa-users mr-1"></i> Siteyi Ziyaret Edenler (Son IP'ler)</h4>
                <div id="admin-visitors" class="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-2 text-xs max-h-40 overflow-y-auto">
                    <p class="text-slate-500">Yükleniyor...</p>
                </div>
            </div>

            <h4 class="text-xs font-bold mb-2 text-amber-400 flex items-center"><i class="fa-solid fa-credit-card mr-1"></i> Onay Bekleyen Ödemeler</h4>
            <div id="admin-payments" class="space-y-2 text-xs">
                <p class="text-slate-500">Bekleyen ödeme bulunmuyor.</p>
            </div>
        </div>
    </div>

    <!-- Auth Modal -->
    <div id="auth-m" class="fixed inset-0 hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-xs p-6 rounded-3xl relative shadow-2xl">
            <button onclick="closeAuth()" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="font-bold text-xs mb-4 text-center">Giriş / Kayıt Ol <br><span class="text-[10px] text-slate-500 font-normal">(Admin: aklomanti / 123)</span></h3>
            <input type="text" id="u-in" placeholder="Kullanıcı Adı" class="w-full bg-slate-950 border border-slate-800 p-3 text-xs mb-3 rounded-xl focus:outline-none focus:border-emerald-500 text-white">
            <input type="password" id="p-in" placeholder="Şifre" class="w-full bg-slate-950 border border-slate-800 p-3 text-xs mb-4 rounded-xl focus:outline-none focus:border-emerald-500 text-white">
            <button onclick="login()" class="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl text-xs font-bold mb-2 transition shadow-lg shadow-emerald-900/20">Giriş Yap</button>
            <button onclick="register()" class="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-xs font-bold transition">Kayıt Ol</button>
        </div>
    </div>

    <!-- Deposit Modal -->
    <div id="dep-m" class="fixed inset-0 hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-xs p-6 rounded-3xl relative shadow-2xl">
            <button onclick="closeDep()" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="font-bold text-xs mb-3 text-center">Bakiye Bildirim Formu</h3>
            <input type="text" id="dep-s" placeholder="Gönderen Ad Soyad" class="w-full bg-slate-950 border border-slate-800 p-3 text-xs mb-3 rounded-xl focus:outline-none focus:border-emerald-500 text-white">
            <input type="number" id="dep-a" placeholder="Tutar (TL)" class="w-full bg-slate-950 border border-slate-800 p-3 text-xs mb-4 rounded-xl focus:outline-none focus:border-emerald-500 text-white">
            <button onclick="sendDep()" class="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-900/20">Bildirimi Gönder</button>
        </div>
    </div>

    <footer class="p-4 bg-slate-900/40 border-t border-slate-900 text-center text-[10px] text-slate-500">
        ANKA SMS © 2026 - Tüm Hakları Saklıdır.
    </footer>

    <script>
        let user = localStorage.getItem('usr') || '';
        let role = localStorage.getItem('rol') || 'user';

        window.onload = async () => {
            if(user) {
                document.getElementById('auth-txt').innerText = user;
                document.getElementById('out-btn').classList.remove('hidden');
                if(role === 'admin') document.getElementById('admin-btn').classList.remove('hidden');
                const r = await fetch('/api/getCustomerBalance?username=' + user);
                const j = await r.json();
                if(j.success) document.getElementById('bal').innerText = j.balance.toFixed(2) + ' TL';
            }
            const s = await fetch('/api/getServices');
            const sj = await s.json();
            if(sj.success) {
                document.getElementById('grid').innerHTML = sj.services.map(x => \`
                    <div class="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex justify-between items-center hover:border-slate-700 transition">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-xl \${x.bg} flex items-center justify-center \${x.color} text-lg"><i class="fa-brands \${x.icon}"></i></div>
                            <div>
                                <h4 class="font-bold text-sm">\${x.name}</h4>
                                <span class="text-xs \${x.color} font-bold">\${x.price} TL</span>
                            </div>
                        </div>
                        <button onclick="buy('\${x.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-900/20">Satın Al</button>
                    </div>
                \`).join('');
            }
        };

        function openAuth() { if(!user) document.getElementById('auth-m').classList.remove('hidden'); }
        function closeAuth() { document.getElementById('auth-m').classList.add('hidden'); }
        function openDep() { if(!user) return openAuth(); document.getElementById('dep-m').classList.remove('hidden'); }
        function closeDep() { document.getElementById('dep-m').classList.add('hidden'); }
        function openAdmin() { document.getElementById('admin-m').classList.remove('hidden'); loadAdmin(); }
        function closeAdmin() { document.getElementById('admin-m').classList.add('hidden'); }
        function logout() { localStorage.clear(); location.reload(); }

        async function login() {
            const r = await fetch('/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:document.getElementById('u-in').value, password:document.getElementById('p-in').value})});
            const j = await r.json();
            if(j.success) { localStorage.setItem('usr', j.username); localStorage.setItem('rol', j.role); location.reload(); } else alert(j.message);
        }
        async function register() {
            const r = await fetch('/api/auth/register', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:document.getElementById('u-in').value, password:document.getElementById('p-in').value})});
            const j = await r.json();
            if(j.success) { localStorage.setItem('usr', j.username); localStorage.setItem('rol', j.role); location.reload(); } else alert(j.message);
        }
        async function sendDep() {
            const r = await fetch('/api/deposit/notify', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:user, senderName:document.getElementById('dep-s').value, amount:document.getElementById('dep-a').value})});
            const j = await r.json(); alert(j.message); closeDep();
        }
        async function loadAdmin() {
            const sr = await fetch('/api/admin/getStats?adminUsername=' + user);
            const sj = await sr.json();
            if(sj.success) {
                document.getElementById('admin-visitors').innerHTML = sj.visitors.length ? sj.visitors.map(v => \`<div class="flex justify-between border-b border-slate-950 pb-1"><span>IP: \${v.ip}</span><span class="text-slate-500">\${v.time}</span></div>\`).join('') : '<p class="text-slate-500">Henüz ziyaretçi yok.</p>';
            }

            const pr = await fetch('/api/admin/getPendingPayments?adminUsername=' + user);
            const pj = await pr.json();
            if(pj.success) {
                const arr = Object.values(pj.payments).filter(p => p.status === 'pending');
                document.getElementById('admin-payments').innerHTML = arr.length ? arr.map(p => \`<div class="flex justify-between items-center bg-slate-950 border border-slate-800 p-3 rounded-xl"><span><b>\${p.username}</b> - \${p.amount} TL (<span class="text-slate-400">\${p.senderName}</span>)</span><div><button onclick="payAction('\${p.id}','approve')" class="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded-lg mr-1 font-bold">Onayla</button><button onclick="payAction('\${p.id}','reject')" class="bg-rose-600 hover:bg-rose-500 px-3 py-1 rounded-lg font-bold">Red</button></div></div>\`).join('') : '<p class="text-slate-500">Bekleyen ödeme yok.</p>';
            }
        }
        async function payAction(id, action) {
            const r = await fetch('/api/admin/processPayment', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({adminUsername:user, paymentId:id, action})});
            const j = await r.json(); alert(j.message); loadAdmin();
        }
        async function buy(id) {
            if(!user) return openAuth();
            alert('Numara talep ediliyor, stoklar kontrol ediliyor...');
            const r = await fetch('/api/buyNumber', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({productKey:id, username:user})});
            const j = await r.json();
            if(j.success) {
                alert('Numara başarıyla alındı! Numara: ' + j.phoneNumber);
                location.reload();
            } else {
                alert(j.message);
            }
        }
    </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log('Sunucu calisiyor, port:', PORT));
