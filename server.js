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
// Güncel Bot Token'ın buraya eklendi:
const TELEGRAM_BOT_TOKEN = '8874989367:AAG-R1nZEN0Brx0cbB1--G3dYxyCMrwLuPg';
const TELEGRAM_CHAT_ID = '8964930489';

let bot;
try {
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
} catch (error) {
    console.log('Telegram bot hatası:', error.message);
}

// Veritabanı ve İstatistikler
let users = {
    "aklomanti": { balance: 5000.00, password: "123", role: "admin" }
};
let pendingPayments = {}; 
let activeNumbers = [];   
let siteStats = {
    totalVisits: 0,
    uniqueVisitors: new Set()
};

// Ziyaretçi Sayacı
app.use((req, res, next) => {
    if (req.path === '/' && req.method === 'GET') {
        siteStats.totalVisits++;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ip';
        siteStats.uniqueVisitors.add(ip);
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
    res.json({ success: true, stats: { totalVisits: siteStats.totalVisits, uniqueVisitors: siteStats.uniqueVisitors.size } });
});

app.post('/api/admin/updateBalance', (req, res) => {
    const { adminUsername, targetUsername, newBalance } = req.body;
    if (!users[adminUsername] || users[adminUsername].role !== 'admin') return res.status(403).json({ success: false });
    if (!users[targetUsername]) return res.status(404).json({ success: false, message: 'Kullanıcı yok.' });
    users[targetUsername].balance = parseFloat(newBalance);
    res.json({ success: true, message: 'Bakiye güncellendi.' });
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
app.post('/api/buyNumber', async (req, res) => {
    const { productKey, username } = req.body;
    if (!users[username]) return res.status(400).json({ success: false, message: 'Giriş yapın.' });
    const product = ankaCatalog.find(s => s.id === productKey);
    if (!product || users[username].balance < product.price) return res.status(400).json({ success: false, message: 'Yetersiz bakiye veya ürün yok.' });

    for (let i = 0; i < 10; i++) {
        try {
            const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getNumber&service=${product.service}&country=${product.country}&operator=any`, { timeout: 6000 });
            const data = String(response.data).trim();
            if (data.startsWith('ACCESS_NUMBER')) {
                users[username].balance -= product.price;
                const parts = data.split(':');
                activeNumbers.push({ activationId: parts[1], phoneNumber: parts[2], username, productName: product.name, status: 'WAITING', code: null });
                return res.json({ success: true, activationId: parts[1], phoneNumber: parts[2], remainingBalance: users[username].balance });
            }
            await sleep(2000);
        } catch (e) {}
    }
    res.status(400).json({ success: false, message: 'Numara bulunamadı.' });
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

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr" class="dark">
<head>
    <meta charset="UTF-8"><title>ANKA SMS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-slate-950 text-white min-h-screen flex flex-col justify-between">
    <header class="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
        <h1 class="font-extrabold text-emerald-400">ANKA SMS</h1>
        <div class="flex items-center space-x-2">
            <button id="admin-btn" onclick="openAdmin()" class="hidden bg-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold">Admin Paneli</button>
            <span id="bal" class="text-xs text-emerald-400 font-bold">0 TL</span>
            <button onclick="openAuth()" id="auth-txt" class="bg-slate-800 px-3 py-1.5 rounded-lg text-xs">Giriş Yap</button>
            <button onclick="logout()" id="out-btn" class="hidden text-rose-400 text-xs"><i class="fa-solid fa-right-from-bracket"></i></button>
        </div>
    </header>
    <main class="max-w-4xl mx-auto p-6 w-full flex-grow">
        <div id="grid" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>
        <div class="mt-6 text-center"><button onclick="openDep()" class="bg-emerald-600 px-4 py-2 rounded-xl text-xs font-bold">Bakiye Yükle (IBAN)</button></div>
    </main>

    <!-- Admin Modal -->
    <div id="admin-m" class="fixed inset-0 hidden bg-black/80 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-700 w-full max-w-lg p-6 rounded-2xl relative max-h-[80vh] overflow-y-auto">
            <button onclick="closeAdmin()" class="absolute top-4 right-4 text-slate-400"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="font-bold text-sm mb-4 text-rose-500">Admin Paneli & İstatistikler</h3>
            <div class="grid grid-cols-2 gap-2 mb-4">
                <div class="bg-slate-950 p-3 rounded-xl border border-slate-800"><span class="text-[10px] text-slate-400">Toplam Ziyaret</span><div id="st-total" class="text-lg font-bold text-emerald-400">0</div></div>
                <div class="bg-slate-950 p-3 rounded-xl border border-slate-800"><span class="text-[10px] text-slate-400">Tekil Ziyaretçi</span><div id="st-unique" class="text-lg font-bold text-blue-400">0</div></div>
            </div>
            <h4 class="text-xs font-bold mb-2 text-amber-400">Bekleyen Ödemeler</h4>
            <div id="admin-payments" class="space-y-2 mb-4 text-xs"><p class="text-slate-500">Yükleniyor...</p></div>
        </div>
    </div>

    <!-- Auth Modal -->
    <div id="auth-m" class="fixed inset-0 hidden bg-black/80 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-700 w-full max-w-xs p-6 rounded-2xl relative">
            <button onclick="closeAuth()" class="absolute top-4 right-4 text-slate-400"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="font-bold text-xs mb-3">Giriş / Kayıt Ol (admin: aklomanti / 123)</h3>
            <input type="text" id="u-in" placeholder="Kullanıcı Adı" class="w-full bg-slate-955 border border-slate-700 p-2 text-xs mb-2 rounded bg-slate-950 text-white">
            <input type="password" id="p-in" placeholder="Şifre" class="w-full border border-slate-700 p-2 text-xs mb-3 rounded bg-slate-950 text-white">
            <button onclick="login()" class="w-full bg-emerald-600 py-2 rounded text-xs font-bold mb-1">Giriş Yap</button>
            <button onclick="register()" class="w-full bg-blue-600 py-2 rounded text-xs font-bold">Kayıt Ol</button>
        </div>
    </div>

    <!-- Deposit Modal -->
    <div id="dep-m" class="fixed inset-0 hidden bg-black/80 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-700 w-full max-w-xs p-6 rounded-2xl relative">
            <button onclick="closeDep()" class="absolute top-4 right-4 text-slate-400"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="font-bold text-xs mb-2">Bakiye Bildir</h3>
            <input type="text" id="dep-s" placeholder="Gönderen Ad Soyad" class="w-full border border-slate-700 p-2 text-xs mb-2 rounded bg-slate-950 text-white">
            <input type="number" id="dep-a" placeholder="Tutar (TL)" class="w-full border border-slate-700 p-2 text-xs mb-3 rounded bg-slate-950 text-white">
            <button onclick="sendDep()" class="w-full bg-emerald-600 py-2 rounded text-xs font-bold">Bildir Gönder</button>
        </div>
    </div>

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
                if(j.success) document.getElementById('bal').innerText = j.balance + ' TL';
            }
            const s = await fetch('/api/getServices');
            const sj = await s.json();
            if(sj.success) {
                document.getElementById('grid').innerHTML = sj.services.map(x => \`<div class="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center"><div><h4 class="font-bold text-sm">\${x.name}</h4><span class="text-xs text-emerald-400">\${x.price} TL</span></div><button onclick="buy('\${x.id}')" class="bg-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold">Al</button></div>\`).join('');
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
            if(sj.success) { document.getElementById('st-total').innerText = sj.stats.totalVisits; document.getElementById('st-unique').innerText = sj.stats.uniqueVisitors; }

            const pr = await fetch('/api/admin/getPendingPayments?adminUsername=' + user);
            const pj = await pr.json();
            if(pj.success) {
                const arr = Object.values(pj.payments).filter(p => p.status === 'pending');
                document.getElementById('admin-payments').innerHTML = arr.length ? arr.map(p => \`<div class="flex justify-between items-center bg-slate-950 p-2 rounded"><span>\${p.username} - \${p.amount} TL</span><div><button onclick="payAction('\${p.id}','approve')" class="bg-emerald-600 px-2 py-1 rounded mr-1">Onayla</button><button onclick="payAction('\${p.id}','reject')" class="bg-rose-600 px-2 py-1 rounded">Red</button></div></div>\`).join('') : '<p class="text-slate-500">Bekleyen ödeme yok.</p>';
            }
        }
        async function payAction(id, action) {
            const r = await fetch('/api/admin/processPayment', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({adminUsername:user, paymentId:id, action})});
            const j = await r.json(); alert(j.message); loadAdmin();
        }
        async function buy(id) {
            if(!user) return openAuth();
            const r = await fetch('/api/buyNumber', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({productKey:id, username:user})});
            const j = await r.json();
            if(j.success) alert('Numara alındı: ' + j.phoneNumber); else alert(j.message);
        }
    </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log('Sunucu calisiyor, port:', PORT));
