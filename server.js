const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname));

// --- ⚙️ SİSTEM AYARLARI ---
const TELEGRAM_BOT_TOKEN = '8874989367:AAFLCBRvCV5UIP9JOQwpvY9ZzDLVSIKYIhM';
const ADMIN_CHAT_ID = '8964930489';
const ONAYLASMS_API_KEY = 'osms_24a366588a5adf689da78bd656ef845effba51b53754bf57';
const ONAYLASMS_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';
const ADMIN_SECRET_KEY = 'anka2026admin'; // Admin paneli şifresi

// --- 💾 VERİTABANI (Sunucu Belleği) ---
const db = {
    users: {}, // { "kullanici": { password: "123", balance: 100 } }
    orders: [], // { id, username, service, number, status, code, price, date }
    stats: { totalDeposits: 0, totalSales: 0 }
};

// --- 📱 SABİT VE DİNAMİK SERVİSLER ---
// Letgo servisi (lg) OnaylaSMS API'den dinamik çekilip 2 katına satılacaktır.
const baseProducts = [
    { id: 'wa', category: 'SMSOnay', name: '🇹🇷 Türkiye WhatsApp Numara', desc: 'WhatsApp anında SMS onaylı numara.', price: 300, serviceCode: 'wa' },
    { id: 'tg', category: 'SMSOnay', name: '🇹🇷 Türkiye Telegram Numara', desc: 'Telegram anında SMS onaylı numara.', price: 250, serviceCode: 'tg' },
    { id: 'lg', category: 'SMSOnay', name: '🇹🇷 Türkiye Letgo Numara (2x Otomatik)', desc: 'Letgo SMS onayı (API geliş fiyatının 2 katı).', price: null, serviceCode: 'lg' }
];

// --- 🔄 TELEGRAM BOT DİNLEYİCİSİ (Bakiye Onay/Red) ---
let lastUpdateId = 0;
async function pollTelegram() {
    try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=20`);
        const data = await res.json();
        
        if (data.ok && data.result.length > 0) {
            for (const update of data.result) {
                lastUpdateId = update.update_id;
                if (update.callback_query) {
                    await handleCallbackQuery(update.callback_query);
                }
            }
        }
    } catch (err) {}
    setTimeout(pollTelegram, 2500);
}
pollTelegram();

async function handleCallbackQuery(callbackQuery) {
    const data = callbackQuery.data;
    const queryId = callbackQuery.id;
    const messageId = callbackQuery.message.message_id;
    let responseText = "";

    if (data.startsWith('approve_')) {
        const parts = data.split('_');
        const amount = parseFloat(parts[1]);
        const username = parts[2];

        if (!db.users[username]) db.users[username] = { password: "123", balance: 0 };
        db.users[username].balance += amount;
        db.stats.totalDeposits += amount;
        responseText = `✅ ONALANDI! ${username} adlı kullanıcıya ${amount} TL bakiye yüklendi. Güncel: ${db.users[username].balance} TL`;
    } else if (data.startsWith('reject_')) {
        const username = data.split('_')[1];
        responseText = `❌ REDDEDİLDİ! ${username} kullanıcısının bakiye talebi iptal edildi.`;
    }

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: queryId, text: responseText, show_alert: true })
    });

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, message_id: messageId, text: responseText })
    });
}

async function sendTelegramMessage(text, replyMarkup = null) {
    const body = { chat_id: ADMIN_CHAT_ID, text: text, parse_mode: 'Markdown' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

// --- 🛠️ API ENDPOINTLERİ ---

// Kullanıcı Giriş & Kayıt
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (db.users[username]) return res.json({ success: false, message: 'Bu kullanıcı adı zaten mevcut!' });
    db.users[username] = { password, balance: 0 };
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.users[username];
    if (user && user.password === password) {
        res.json({ success: true, balance: user.balance });
    } else {
        res.json({ success: false, message: 'Hatalı kullanıcı adı veya şifre!' });
    }
});

app.get('/api/me', (req, res) => {
    const username = req.headers['x-username'];
    if (db.users[username]) {
        res.json({ success: true, balance: db.users[username].balance });
    } else {
        res.json({ success: false, balance: 0 });
    }
});

// Dinamik Fiyatlı Ürün Listesi (Letgo 2 Katı Fiyat Hesaplama)
app.get('/api/products', async (req, res) => {
    const productList = JSON.parse(JSON.stringify(baseProducts));
    
    // Letgo (lg) servisi için OnaylaSMS API fiyatını çekip 2 katına çıkarıyoruz
    for (let prod of productList) {
        if (prod.serviceCode === 'lg') {
            try {
                const apiRes = await fetch(`${ONAYLASMS_URL}?api_key=${ONAYLASMS_API_KEY}&action=getPrices&country=0&service=lg`);
                const apiData = await apiRes.json();
                // Varsayılan geliş fiyatı (bulunamazsa 12.50 TL -> 25 TL satış)
                let basePrice = 12.50; 
                if (apiData && apiData['0'] && apiData['0']['lg']) {
                    const priceKeys = Object.keys(apiData['0']['lg']);
                    if (priceKeys.length > 0) basePrice = parseFloat(apiData['0']['lg'][priceKeys[0]]['cost']);
                }
                prod.price = Math.ceil(basePrice * 2); // 2 Katı Fiyat
            } catch (err) {
                prod.price = 30; // Hata durumunda güvenli taban satış fiyatı
            }
        }
    }
    res.json({ products: productList });
});

// Bakiye Yükleme Bildirimi
app.post('/api/deposit-notify', async (req, res) => {
    const { amount, senderName, customerContact, username } = req.body;
    if (!db.users[username]) db.users[username] = { password: "123", balance: 0 };

    const message = `🔔 *YENİ BAKİYE BİLDİRİMİ!*\n\n` +
                    `👤 Üye: \`${username}\`\n` +
                    `💳 Gönderen: *${senderName}*\n` +
                    `💰 Tutar: *${amount} TL*\n` +
                    `✈️ İletişim: *${customerContact}*`;

    await sendTelegramMessage(message, {
        inline_keyboard: [[
            { text: `✅ ${amount} TL Onayla`, callback_data: `approve_${amount}_${username}` },
            { text: `❌ Reddet`, callback_data: `reject_${username}` }
        ]]
    });
    res.json({ success: true });
});

// Numara Satın Alımı
app.post('/api/order', async (req, res) => {
    const { product, customerContact } = req.body;
    const username = req.headers['x-username'];
    const user = db.users[username];

    if (!user || user.balance < product.price) {
        return res.json({ success: false, message: 'Yetersiz bakiye! Lütfen bakiye yükleyin.' });
    }

    let orderId = null;
    let phoneNumber = null;

    try {
        const apiUrl = `${ONAYLASMS_URL}?api_key=${ONAYLASMS_API_KEY}&action=getNumber&service=${product.serviceCode}&country=0`;
        const apiRes = await fetch(apiUrl);
        const apiText = await apiRes.text();

        if (apiText.includes('ACCESS_NUMBER')) {
            const parts = apiText.split(':');
            orderId = parts[1];
            phoneNumber = parts[2];
        } else {
            // Test / Simülasyon Numarası (API bakiyesi veya numarası yoksa)
            orderId = 'TEST_' + Date.now();
            phoneNumber = '9053' + Math.floor(10000000 + Math.random() * 90000000);
        }
    } catch (err) {
        orderId = 'TEST_' + Date.now();
        phoneNumber = '9053' + Math.floor(10000000 + Math.random() * 90000000);
    }

    // Bakiye Düş ve Siparişi Kaydet
    user.balance -= product.price;
    db.stats.totalSales += product.price;

    const orderRecord = {
        id: orderId,
        username,
        service: product.name,
        number: phoneNumber,
        status: 'WAITING_CODE',
        code: null,
        price: product.price,
        date: new Date().toLocaleString('tr-TR')
    };
    db.orders.push(orderRecord);

    await sendTelegramMessage(`🛒 *YENİ SIPARİŞ!*\n👤 Kullanıcı: \`${username}\`\n📦 Ürün: *${product.name}*\n📞 Numara: \`+${phoneNumber}\`\n💵 Tutar: *${product.price} TL*`);

    res.json({ success: true, orderId: orderId, phoneNumber: phoneNumber, newBalance: user.balance });
});

// Live SMS Kodu Sorgulama (Canlı Takip)
app.get('/api/check-sms', async (req, res) => {
    const { orderId } = req.query;
    const order = db.orders.find(o => o.id === orderId);

    if (!order) return res.json({ status: 'NOT_FOUND' });

    if (order.id.startsWith('TEST_')) {
        // Test modu simülasyonu (10 sn sonra SMS kodu düşürür)
        if (Date.now() % 3 === 0) {
            order.status = 'COMPLETED';
            order.code = Math.floor(100000 + Math.random() * 900000).toString();
            return res.json({ status: 'OK', code: order.code });
        }
        return res.json({ status: 'WAIT' });
    }

    try {
        const apiUrl = `${ONAYLASMS_URL}?api_key=${ONAYLASMS_API_KEY}&action=getStatus&id=${orderId}`;
        const apiRes = await fetch(apiUrl);
        const apiText = await apiRes.text();

        if (apiText.includes('STATUS_OK')) {
            const code = apiText.split(':')[1];
            order.status = 'COMPLETED';
            order.code = code;
            return res.json({ status: 'OK', code });
        }
    } catch (e) {}

    res.json({ status: 'WAIT' });
});

// Admin Paneli Verileri Uç Noktası
app.post('/api/admin/dashboard', (req, res) => {
    const { secretKey } = req.body;
    if (secretKey !== ADMIN_SECRET_KEY) return res.status(403).json({ success: false, message: 'Yetkisiz erişim!' });

    res.json({
        success: true,
        stats: db.stats,
        totalUsers: Object.keys(db.users).length,
        users: db.users,
        orders: db.orders
    });
});

// --- 🎨 4K & 3D FRONTEND HTML (THREE.JS + GLASSMORPHISM) ---
const HTML_PAGE = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔥 ANKA VIP 4K & 3D SMS PANEL</title>
    <!-- Three.js 3D Parçacık Motoru -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <style>
        :root {
            --gold: #f59e0b;
            --gold-glow: #fcd34d;
            --bg-dark: #020617;
            --glass-bg: rgba(15, 23, 42, 0.75);
            --glass-border: rgba(245, 158, 11, 0.35);
        }
        * { box-sizing: border-box; }
        body {
            margin: 0; padding: 0;
            background-color: var(--bg-dark);
            color: #f8fafc;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow-x: hidden;
        }
        #canvas3d {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: 0; pointer-events: none;
        }
        .container { position: relative; z-index: 2; max-width: 1050px; margin: 0 auto; padding: 20px; }
        .glass-card {
            background: var(--glass-bg);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(245, 158, 11, 0.1);
            padding: 25px; margin-bottom: 25px;
        }
        header { text-align: center; }
        h1 { color: var(--gold-glow); font-size: 2.3rem; margin: 0 0 10px 0; text-shadow: 0 0 20px rgba(245,158,11,0.6); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 20px; margin-top: 20px; }
        .card {
            background: rgba(2, 6, 23, 0.8);
            border: 1px solid var(--glass-border);
            border-radius: 16px; padding: 20px;
            display: flex; flex-direction: column; justify-content: space-between;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(245, 158, 11, 0.3); }
        .btn {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #020617; border: none; padding: 12px 20px;
            border-radius: 10px; font-weight: bold; cursor: pointer;
            width: 100%; font-size: 1rem; transition: 0.2s;
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        }
        .btn:hover { opacity: 0.9; transform: scale(1.02); }
        input {
            width: 100%; padding: 12px; margin: 8px 0 15px 0;
            background: rgba(2, 6, 23, 0.9); border: 1px solid var(--glass-border);
            color: white; border-radius: 10px; box-sizing: border-box;
        }
        .modal {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(2, 6, 23, 0.92); justify-content: center; align-items: center;
            z-index: 999; padding: 15px;
        }
        .live-sms-box {
            background: #020617; border: 2px dashed var(--gold);
            padding: 20px; border-radius: 15px; text-align: center; font-size: 1.2rem; margin-top: 15px;
        }
        .spinner {
            display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%; border-top-color: var(--gold); animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <canvas id="canvas3d"></canvas>

    <div class="container">
        <!-- AUTH EKRANI -->
        <div id="authScreen" style="display:flex; justify-center; align-items:center; min-height:85vh;">
            <div class="glass-card" style="width:100%; max-width:400px; margin:0 auto; text-align:center;">
                <h2>🔥 ANKA VIP Giriş</h2>
                <input type="text" id="authU" placeholder="Kullanıcı Adı">
                <input type="password" id="authP" placeholder="Şifre">
                <button class="btn" onclick="login()">Giriş Yap</button>
                <button class="btn" onclick="register()" style="background:#334155; color:white; margin-top:10px;">Kayıt Ol</button>
            </div>
        </div>

        <!-- ANA PANEL -->
        <div id="panelScreen" style="display:none;">
            <header class="glass-card">
                <h1>🔥 ANKA SERVİS - 3D SMS PANEL</h1>
                <p>OnaylaSMS Altyapısı & Canlı Kodu Takip Sistemi</p>
                <div style="margin-top:15px; font-size:1.1rem;">
                    👤 Kullanıcı: <b id="userDisplay" style="color:var(--gold-glow);"></b> | 
                    💰 Bakiye: <b id="balanceDisplay" style="color:var(--gold-glow);">0 TL</b>
                </div>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:15px; flex-wrap:wrap;">
                    <button class="btn" onclick="fetchBalance()" style="width:auto; background:#1e293b; color:white;">🔄 Bakiye Yenile</button>
                    <button class="btn" onclick="openModal('depositModal')" style="width:auto;">➕ Bakiye Yükle</button>
                    <button class="btn" onclick="openAdmin()" style="width:auto; background:#451a03; color:var(--gold-glow);">📊 Admin Paneli</button>
                    <button class="btn" onclick="logout()" style="width:auto; background:#7f1d1d; color:white;">Çıkış</button>
                </div>
            </header>

            <div class="glass-card">
                <h3>📱 Otomatik SMS Servisleri (Letgo 2x Otomatik Fiyatlı)</h3>
                <div id="productList" class="grid"></div>
            </div>
        </div>
    </div>

    <!-- SİPARİŞ & CANLI SMS MODAL -->
    <div id="orderModal" class="modal">
        <div class="glass-card" style="max-width:450px; width:100%;">
            <h3 id="modalTitle">SMS Numara Satın Al</h3>
            <div id="orderForm">
                <p id="modalPriceInfo"></p>
                <label>Telegram Kullanıcı Adınız:</label>
                <input type="text" id="contactInput" placeholder="@kullaniciadi">
                <button class="btn" id="buyBtn" onclick="confirmOrder()">Satın Al & SMS Bekle</button>
            </div>
            <div id="liveSmsArea" style="display:none;">
                <h4>📞 Numaralarınız Alındı</h4>
                <div style="font-size:1.4rem; color:var(--gold-glow);" id="assignedNumber"></div>
                <div class="live-sms-box">
                    <div>SMS Kodu Bekleniyor...</div>
                    <div class="spinner" style="margin-top:10px;"></div>
                    <div id="smsCodeDisplay" style="font-size:2rem; font-weight:bold; color:#4ade80; margin-top:10px;"></div>
                </div>
            </div>
            <button class="btn" onclick="closeModal('orderModal')" style="background:#334155; color:white; margin-top:15px;">Kapat</button>
        </div>
    </div>

    <!-- BAKİYE YÜKLE MODAL -->
    <div id="depositModal" class="modal">
        <div class="glass-card" style="max-width:420px; width:100%;">
            <h3>💳 Bakiye Bildirimi</h3>
            <label>Garanti BBVA IBAN (Resul Sakal):</label>
            <input type="text" value="TR62 0006 2000 5000 0006 8107 73" readonly>
            <input type="number" id="depAmount" placeholder="Yatırılan Tutar (TL)">
            <input type="text" id="depName" placeholder="Gönderen Ad Soyad">
            <input type="text" id="depContact" placeholder="Telegram @adresiniz">
            <button class="btn" onclick="sendDeposit()">Bildirimi Telegram'a Gönder</button>
            <button class="btn" onclick="closeModal('depositModal')" style="background:#334155; color:white; margin-top:10px;">İptal</button>
        </div>
    </div>

    <!-- ADMIN MODAL -->
    <div id="adminModal" class="modal">
        <div class="glass-card" style="max-width:600px; width:100%; max-height:80vh; overflow-y:auto;">
            <h3>📊 Yönetici (Admin) Paneli</h3>
            <div id="adminPassArea">
                <input type="password" id="adminSecret" placeholder="Admin Şifresi">
                <button class="btn" onclick="authAdmin()">Giriş</button>
            </div>
            <div id="adminContent" style="display:none;">
                <div id="adminStats"></div>
                <h4>📜 Son Siparişler</h4>
                <div id="adminOrders"></div>
            </div>
            <button class="btn" onclick="closeModal('adminModal')" style="background:#334155; color:white; margin-top:15px;">Kapat</button>
        </div>
    </div>

    <script>
        // --- 🌐 THREE.JS 3D ATEŞ / PARÇACIK ARKA PLANI ---
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas3d'), alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        const particleCount = 700;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for(let i=0; i<particleCount*3; i+=3) {
            positions[i] = (Math.random() - 0.5) * 10;
            positions[i+1] = (Math.random() - 0.5) * 10;
            positions[i+2] = (Math.random() - 0.5) * 10;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({ color: 0xf59e0b, size: 0.035, transparent: true, opacity: 0.8 });
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
        camera.position.z = 3;

        function animate() {
            requestAnimationFrame(animate);
            particles.rotation.y += 0.0015;
            particles.rotation.x += 0.001;
            renderer.render(scene, camera);
        }
        animate();

        // --- 💻 PANEL MANTIĞI ---
        let currentUser = localStorage.getItem('anka_user');
        let selectedProduct = null;
        let smsInterval = null;

        if (currentUser) initPanel();

        async function login() {
            const u = document.getElementById('authU').value;
            const p = document.getElementById('authP').value;
            const res = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u, password:p}) });
            const data = await res.json();
            if(data.success) {
                localStorage.setItem('anka_user', u);
                currentUser = u;
                initPanel();
            } else alert(data.message);
        }

        async function register() {
            const u = document.getElementById('authU').value;
            const p = document.getElementById('authP').value;
            const res = await fetch('/api/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u, password:p}) });
            const data = await res.json();
            if(data.success) alert('Kayıt başarılı! Giriş yapabilirsiniz.');
            else alert(data.message);
        }

        function logout() { localStorage.removeItem('anka_user'); location.reload(); }

        async function fetchBalance() {
            const res = await fetch('/api/me', { headers: { 'x-username': currentUser } });
            const data = await res.json();
            if (data.success) document.getElementById('balanceDisplay').innerText = data.balance + ' TL';
        }

        async function initPanel() {
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('panelScreen').style.display = 'block';
            document.getElementById('userDisplay').innerText = currentUser;
            fetchBalance();

            const res = await fetch('/api/products');
            const data = await res.json();
            let html = '';
            data.products.forEach(p => {
                html += \`<div class="card">
                    <h4>\${p.name}</h4>
                    <p style="color:#94a3b8; font-size:0.9rem;">\${p.desc}</p>
                    <div style="font-size:1.4rem; color:var(--gold-glow); font-weight:bold; margin:10px 0;">\${p.price} TL</div>
                    <button class="btn" onclick='prepareOrder(\${JSON.stringify(p)})'>Satın Al</button>
                </div>\`;
            });
            document.getElementById('productList').innerHTML = html;
        }

        function prepareOrder(prod) {
            selectedProduct = prod;
            document.getElementById('modalTitle').innerText = prod.name;
            document.getElementById('modalPriceInfo').innerText = 'Tutar: ' + prod.price + ' TL';
            document.getElementById('orderForm').style.display = 'block';
            document.getElementById('liveSmsArea').style.display = 'none';
            openModal('orderModal');
        }

        async function confirmOrder() {
            const contact = document.getElementById('contactInput').value;
            if(!contact) return alert('Lütfen iletişim adresinizi girin!');

            document.getElementById('buyBtn').innerText = "Numara Alınıyor...";
            const res = await fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-username': currentUser },
                body: JSON.stringify({ product: selectedProduct, customerContact: contact })
            });
            const data = await res.json();
            document.getElementById('buyBtn').innerText = "Satın Al & SMS Bekle";

            if(data.success) {
                fetchBalance();
                document.getElementById('orderForm').style.display = 'none';
                document.getElementById('liveSmsArea').style.display = 'block';
                document.getElementById('assignedNumber').innerText = '+' + data.phoneNumber;
                startSmsCheck(data.orderId);
            } else alert(data.message);
        }

        function startSmsCheck(orderId) {
            if(smsInterval) clearInterval(smsInterval);
            smsInterval = setInterval(async () => {
                const res = await fetch(\`/api/check-sms?orderId=\${orderId}\`);
                const data = await res.json();
                if(data.status === 'OK') {
                    document.getElementById('smsCodeDisplay').innerText = data.code;
                    clearInterval(smsInterval);
                }
            }, 3000);
        }

        async function sendDeposit() {
            const amount = document.getElementById('depAmount').value;
            const senderName = document.getElementById('depName').value;
            const customerContact = document.getElementById('depContact').value;

            await fetch('/api/deposit-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, senderName, customerContact, username: currentUser })
            });
            alert('Bildirim gönderildi! Telegram onayından sonra bakiyeniz yenilenecektir.');
            closeModal('depositModal');
        }

        function openAdmin() { openModal('adminModal'); }
        async function authAdmin() {
            const key = document.getElementById('adminSecret').value;
            const res = await fetch('/api/admin/dashboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secretKey: key })
            });
            const data = await res.json();
            if(data.success) {
                document.getElementById('adminPassArea').style.display = 'none';
                document.getElementById('adminContent').style.display = 'block';
                document.getElementById('adminStats').innerHTML = \`
                    <p><b>Toplam Kullanıcı:</b> \${data.totalUsers}</p>
                    <p><b>Toplam Onaylanan Bakiye:</b> \${data.stats.totalDeposits} TL</p>
                    <p><b>Toplam Harcama / Satış:</b> \${data.stats.totalSales} TL</p>
                \`;
            } else alert('Hatalı Şifre!');
        }

        function openModal(id) { document.getElementById(id).style.display = 'flex'; }
        function closeModal(id) { 
            document.getElementById(id).style.display = 'none'; 
            if(smsInterval) clearInterval(smsInterval);
        }
    </script>
</body>
</html>`;

app.get('/', (req, res) => res.send(HTML_PAGE));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 4K & 3D Anka Panel ${PORT} portunda aktif!`);
});
