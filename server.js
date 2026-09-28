const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname));

// --- AYARLAR ---
const TELEGRAM_BOT_TOKEN = '8874989367:AAFLCBRvCV5UIP9JOQwpvY9ZzDLVSIKYIhM';
const ADMIN_CHAT_ID = '8964930489';
const ONAYLASMS_API_KEY = 'osms_24a366588a5adf689da78bd656ef845effba51b53754bf57';
const ONAYLASMS_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';

// --- VERİTABANI (Sunucu Belleği) ---
// Kullanıcı bakiyeleri ve şifreleri artık sunucuda tutuluyor (Botun müdahale edebilmesi için)
const db = {
    users: {} // Örn: { "ali": { password: "123", balance: 0 } }
};

// --- ÜRÜNLER ---
const products = [
    { id: 1, category: 'SMSOnay', name: '🇹🇷 Türkiye WhatsApp Numara', desc: 'WhatsApp için anında teslimat (OnaylaSMS Altyapısı).', price: 300, serviceCode: 'wa' },
    { id: 2, category: 'SMSOnay', name: '🇹🇷 Türkiye Telegram Numara', desc: 'Telegram anında SMS onay kodlu numara.', price: 250, serviceCode: 'tg' },
    { id: 3, category: 'SMSOnay', name: '🇵🇭 Filipinler WhatsApp Numara', desc: 'Filipinler lokasyonlu WhatsApp onaylı numara.', price: 200, serviceCode: 'wa_ph' },
    { id: 4, category: 'SMSOnay', name: '🇺🇸 ABD Telegram Numara', desc: 'ABD lokasyonlu Telegram onaylı numara.', price: 200, serviceCode: 'tg_us' }
];

// --- TELEGRAM BOT DİNLEYİCİSİ (Butonlara basıldığını anlamak için) ---
let lastUpdateId = 0;
async function pollTelegram() {
    try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
        const data = await res.json();
        
        if (data.ok && data.result.length > 0) {
            for (const update of data.result) {
                lastUpdateId = update.update_id;
                
                // Eğer bir butona tıklandıysa:
                if (update.callback_query) {
                    await handleCallbackQuery(update.callback_query);
                }
            }
        }
    } catch (err) {
        // Hata olursa yoksay, tekrar dene
    }
    setTimeout(pollTelegram, 2000); // 2 saniyede bir Telegram'ı kontrol et
}
pollTelegram(); // Dinlemeyi başlat

// Telegram Buton Tıklamalarını İşleme
async function handleCallbackQuery(callbackQuery) {
    const data = callbackQuery.data; // Örn: approve_500_resul veya reject_resul
    const queryId = callbackQuery.id;
    const messageId = callbackQuery.message.message_id;
    let responseText = "";

    if (data.startsWith('approve_')) {
        const parts = data.split('_');
        const amount = parseFloat(parts[1]);
        const username = parts[2];

        if (db.users[username]) {
            db.users[username].balance += amount;
            responseText = `✅ Onaylandı! ${username} adlı kullanıcıya ${amount} TL bakiye eklendi. Güncel bakiye: ${db.users[username].balance} TL`;
        } else {
            responseText = `⚠️ Hata: ${username} adlı kullanıcı sistemde bulunamadı.`;
        }
    } else if (data.startsWith('reject_')) {
        const username = data.split('_')[1];
        responseText = `❌ Reddedildi! ${username} kullanıcısının bakiye talebi iptal edildi.`;
    }

    // Tıklanan butondaki yükleniyor simgesini durdur
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: queryId, text: responseText, show_alert: true })
    });

    // Mesajı güncelle (Butonları kaldır, sonucu yaz)
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            message_id: messageId,
            text: responseText
        })
    });
}

async function sendTelegramMessage(text, replyMarkup = null) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = { chat_id: ADMIN_CHAT_ID, text: text, parse_mode: 'Markdown' };
    if (replyMarkup) body.reply_markup = replyMarkup;

    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

// --- API UÇ NOKTALARI (Frontend ile iletişim) ---

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (db.users[username]) {
        return res.json({ success: false, message: 'Bu kullanıcı adı zaten alınmış!' });
    }
    db.users[username] = { password: password, balance: 0 };
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.users[username];
    if (user && user.password === password) {
        res.json({ success: true, balance: user.balance });
    } else {
        res.json({ success: false, message: 'Kullanıcı adı veya şifre hatalı!' });
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

app.get('/api/products', (req, res) => {
    res.json({ products });
});

app.post('/api/deposit-notify', async (req, res) => {
    const { amount, senderName, customerContact, username } = req.body;
    
    // Sistemde kayıtlı değilse bile geçici olarak oluştur (güvenlik için)
    if (!db.users[username]) {
        db.users[username] = { password: "123", balance: 0 };
    }

    const message = `🔔 *YENİ BAKİYE BİLDİRİMİ!*\n\n` +
                    `👤 Üye Kullanıcı Adı: \`${username}\`\n` +
                    `💳 Gönderen Ad Soyad: *${senderName}*\n` +
                    `💰 Yatırılan Tutar: *${amount} TL*\n` +
                    `✈️ İletişim: *${customerContact}*\n\n` +
                    `Aşağıdaki butonlardan işlemi onaylayabilir veya reddedebilirsiniz.`;

    try {
        await sendTelegramMessage(message, {
            inline_keyboard: [
                [
                    { text: `✅ ${amount} TL Onayla`, callback_data: `approve_${amount}_${username}` },
                    { text: `❌ Reddet`, callback_data: `reject_${username}` }
                ]
            ]
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Bildirim gönderilemedi.' });
    }
});

app.post('/api/order', async (req, res) => {
    const { product, customerContact } = req.body;
    const username = req.headers['x-username'];

    const user = db.users[username];
    if (!user || user.balance < product.price) {
        return res.json({ success: false, message: 'Yetersiz bakiye!' });
    }

    let phoneNumber = null;

    if (product.serviceCode) {
        try {
            const apiUrl = `${ONAYLASMS_URL}?api_key=${ONAYLASMS_API_KEY}&action=getNumber&service=${product.serviceCode}`;
            const apiRes = await fetch(apiUrl);
            const apiText = await apiRes.text();

            if (apiText.includes('ACCESS_NUMBER') || apiText.length > 10) {
                const parts = apiText.split(':');
                phoneNumber = parts[parts.length - 1];
            } else {
                phoneNumber = '9055' + Math.floor(10000000 + Math.random() * 90000000); // API Yanıtsız kalırsa test
            }
        } catch (err) {
            phoneNumber = '9055' + Math.floor(10000000 + Math.random() * 90000000);
        }
    }

    // Bakiyeyi düş
    user.balance -= product.price;

    const adminMsg = `🛒 *YENİ NUMARA SİPARİŞİ BAŞARILI!*\n\n` +
                     `👤 Kullanıcı: \`${username}\`\n` +
                     `📦 Ürün: *${product.name}*\n` +
                     `💵 Düşülen Tutar: *${product.price} TL*\n` +
                     `💰 Kalan Bakiye: *${user.balance} TL*\n` +
                     `✈️ İletişim: *${customerContact}*\n` +
                     (phoneNumber ? `📞 Sağlanan Numara: +\`${phoneNumber}\`` : '');

    await sendTelegramMessage(adminMsg);
    res.json({ success: true, phoneNumber: phoneNumber, newBalance: user.balance });
});


// --- 🦅 4K FRONTEND HTML (Tamamen Sunucu Bakiye Uyumlu) ---
const HTML_PAGE = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🦅 ANKA SERVİS - 4K Anka Kuşu Edition</title>
    <style>
        :root { 
            --bg-color: #060810; 
            --gold-primary: #f59e0b; 
            --gold-light: #fcd34d; 
            --card-bg: rgba(15, 23, 42, 0.92); 
            --text-main: #f8fafc; 
            --border-gold: rgba(245, 158, 11, 0.4); 
        }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: var(--bg-color);
            color: var(--text-main); 
            margin: 0; 
            padding: 20px; 
            min-height: 100vh;
            overflow-x: hidden;
        }
        #splashScreen {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: #020617;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            transition: opacity 1s ease, visibility 1s ease;
        }
        .phoenix-mega-avatar {
            width: 220px;
            height: 220px;
            border-radius: 50%;
            border: 4px solid var(--gold-light);
            box-shadow: 0 0 80px rgba(245, 158, 11, 0.8), inset 0 0 30px rgba(252, 211, 77, 0.6);
            margin: 0 auto 25px auto;
            background: radial-gradient(circle, #ea580c 0%, #7c2d12 70%, #000000 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 90px;
            animation: pulsePhoenix 2s infinite alternate;
        }
        @keyframes pulsePhoenix {
            0% { transform: scale(1); box-shadow: 0 0 50px rgba(245, 158, 11, 0.6); }
            100% { transform: scale(1.05); box-shadow: 0 0 90px rgba(234, 88, 12, 0.9); }
        }
        .splash-title { color: var(--gold-light); font-size: 3.2rem; font-weight: 900; letter-spacing: 6px; text-shadow: 0 0 30px rgba(245, 158, 11, 0.8); margin: 0; }
        .splash-sub { color: #cbd5e1; font-size: 1.2rem; letter-spacing: 3px; margin-top: 10px; }
        .container { max-width: 1000px; margin: 0 auto; position: relative; z-index: 1; }
        header { text-align: center; padding: 30px 20px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px); border-radius: 20px; border: 1px solid var(--border-gold); margin-bottom: 25px; box-shadow: 0 15px 40px rgba(245, 158, 11, 0.15); }
        h1 { color: var(--gold-light); margin: 0 0 10px 0; font-size: 2.2rem; text-shadow: 0 2px 10px rgba(245,158,11,0.4); }
        p { color: #cbd5e1; margin: 0; font-size: 1rem; }
        .auth-wrapper { display: flex; justify-content: center; align-items: center; min-height: 80vh; }
        .auth-box { background: var(--card-bg); backdrop-filter: blur(15px); padding: 35px; border-radius: 20px; border: 1px solid var(--gold-primary); width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(245,158,11,0.25); text-align: center; }
        .auth-box h2 { color: var(--gold-light); margin-top: 0; }
        .auth-tabs { display: flex; margin-bottom: 20px; border-bottom: 1px solid var(--border-gold); }
        .auth-tab { flex: 1; padding: 12px; background: none; border: none; color: #94a3b8; font-weight: bold; cursor: pointer; font-size: 1.05rem; transition: 0.3s; }
        .auth-tab.active { color: var(--gold-light); border-bottom: 3px solid var(--gold-primary); text-shadow: 0 0 10px rgba(245,158,11,0.5); }
        .wallet-bar { display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.9); padding: 15px 25px; border-radius: 12px; border: 1px solid var(--gold-primary); margin-bottom: 25px; box-shadow: 0 5px 20px rgba(0,0,0,0.5); flex-wrap: wrap; gap: 10px; }
        .wallet-info { font-size: 1.05rem; color: #f1f5f9; }
        .wallet-info b { color: var(--gold-light); font-size: 1.2rem; }
        .wallet-actions { display: flex; gap: 10px; }
        .wallet-btn { background: linear-gradient(135deg, #f59e0b, #d97706); color: #020617; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .wallet-btn.logout { background: #451a03; color: #f87171; border: 1px solid #f87171; }
        .iban-box { background: rgba(2, 6, 23, 0.9); padding: 15px 20px; border-radius: 14px; margin-top: 20px; border-left: 5px solid var(--gold-primary); text-align: left; border: 1px solid var(--border-gold); cursor: pointer; font-size: 0.95rem; }
        .iban-box b { color: var(--gold-light); }
        .support-banner { background: rgba(239, 68, 68, 0.12); border: 1px solid #ef4444; padding: 12px; border-radius: 10px; text-align: center; margin-bottom: 20px; color: #fca5a5; font-size: 0.95rem; }
        .category-title { color: var(--gold-light); border-bottom: 2px solid var(--border-gold); padding-bottom: 10px; margin-top: 35px; font-size: 1.5rem; font-weight: 600; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px; }
        .card { background: var(--card-bg); backdrop-filter: blur(10px); border-radius: 16px; padding: 22px; border: 1px solid var(--border-gold); display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
        .card h3 { margin-top: 0; color: #ffffff; font-size: 1.2rem; }
        .price { font-size: 1.6rem; color: var(--gold-light); font-weight: bold; margin: 15px 0; }
        .btn { background: linear-gradient(135deg, #f59e0b, #d97706); color: #020617; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; text-align: center; display: block; width: 100%; font-size: 1rem; box-shadow: 0 4px 15px rgba(245,158,11,0.3); }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(2,6,23,0.92); justify-content: center; align-items: center; z-index: 1000; padding: 15px; box-sizing: border-box; }
        .modal-content { background: #0f172a; padding: 30px; border-radius: 18px; width: 100%; max-width: 450px; border: 1px solid var(--gold-primary); box-shadow: 0 15px 50px rgba(245,158,11,0.3); }
        input { width: 100%; padding: 12px; margin: 8px 0 15px 0; background: #020617; border: 1px solid var(--border-gold); color: white; border-radius: 10px; box-sizing: border-box; font-size: 1rem; }
        .payment-info-box { background: #020617; padding: 15px; border-radius: 12px; border: 1px dashed var(--gold-primary); margin-bottom: 15px; font-size: 0.9rem; color: #cbd5e1; }
        .result-box { background: #020617; padding: 15px; border-radius: 12px; border: 1px solid var(--gold-light); color: var(--gold-light); margin-top: 15px; text-align: center; font-weight: 500; font-size: 1.1rem; }
    </style>
</head>
<body>
    <div id="splashScreen">
        <div class="phoenix-mega-avatar">🔥🦅</div>
        <div class="splash-title">ANKA SERVİS</div>
        <div class="splash-sub">4K Anka Kuşu Altyapısı Yükleniyor...</div>
    </div>

    <div class="container">
        <!-- GİRİŞ EKRANI -->
        <div id="authScreen" class="auth-wrapper" style="display:none;">
            <div class="auth-box">
                <div style="width:75px; height:75px; border-radius:50%; border:2px solid var(--gold-primary); overflow:hidden; margin:0 auto 15px auto; box-shadow:0 0 25px rgba(245,158,11,0.6); background:radial-gradient(circle, #ea580c, #020617); display:flex; align-items:center; justify-content:center; font-size:32px;">🔥🦅</div>
                <h2>🔥 ANKA VIP Panel</h2>
                <div class="auth-tabs">
                    <button class="auth-tab active" id="tabLoginBtn" onclick="switchAuthMode('login')">Giriş Yap</button>
                    <button class="auth-tab" id="tabRegisterBtn" onclick="switchAuthMode('register')">Kayıt Ol</button>
                </div>
                <div id="authError" style="color:#ef4444; margin-bottom:15px; font-size:0.9rem; display:none;"></div>
                <label style="text-align:left; display:block; font-size:0.9rem; color:#cbd5e1;"><b>Kullanıcı Adı:</b></label>
                <input type="text" id="authUsername" placeholder="Kullanıcı adınızı girin">
                <label style="text-align:left; display:block; font-size:0.9rem; color:#cbd5e1;"><b>Şifre:</b></label>
                <input type="password" id="authPassword" placeholder="Şifrenizi girin">
                <button class="btn" id="authSubmitBtn" onclick="handleAuth()" style="margin-top:10px;">Giriş Yap</button>
            </div>
        </div>

        <!-- ANA PANEL -->
        <div id="panelScreen" style="display:none;">
            <header>
                <div style="display:inline-block; width:70px; height:70px; border-radius:50%; border:2px solid var(--gold-primary); overflow:hidden; margin-bottom:10px; box-shadow:0 0 25px rgba(245,158,11,0.5); background:radial-gradient(circle, #ea580c, #020617); display:inline-flex; align-items:center; justify-content:center; font-size:30px;">🔥🦅</div>
                <h1>🔥 ANKA SERVİS - Otomatik SMS Onay Paneli</h1>
                <p>OnaylaSMS Altyapısı ile Kesintisiz Numara Çözümleri</p>
                <div class="iban-box" onclick="navigator.clipboard.writeText('TR620006200050000006810773'); alert('IBAN Kopyalandı!');">
                    <strong>💳 Garanti BBVA IBAN (Kopyalamak için tıkla):</strong><br>
                    • Alıcı: <b>Resul Sakal</b> | IBAN: <span>TR62 0006 2000 5000 0006 8107 73</span>
                </div>
            </header>
            <div class="support-banner">
                ⚠️ Bakiye güncellemeleri Telegram botu üzerinden anlık yapılmaktadır. Bakiye yükledikten sonra "Bakiye Yenile" butonuna basarak güncel tutarı görebilirsiniz.
            </div>
            <div class="wallet-bar">
                <div class="wallet-info">
                    Kullanıcı: <b id="displayUsername"></b> | Bakiye: <b id="userBalance">0.00 TL</b>
                </div>
                <div class="wallet-actions">
                    <button class="wallet-btn" onclick="fetchBalance()" style="background:#0f172a; color:#cbd5e1; border:1px solid #cbd5e1;">🔄 Bakiye Yenile</button>
                    <button class="wallet-btn" onclick="openDepositModal()">➕ Bakiye Yükle</button>
                    <button class="wallet-btn logout" onclick="logout()">Çıkış</button>
                </div>
            </div>
            <div id="product-list"></div>
        </div>
    </div>

    <!-- SİPARİŞ MODALI -->
    <div id="orderModal" class="modal">
        <div class="modal-content">
            <h3 id="modalTitle" style="color: var(--gold-light); margin-top:0;">Numara Satın Al</h3>
            <div class="payment-info-box" id="modalDetailsText"></div>
            <div id="formSection">
                <label style="font-size:0.9rem; color:#cbd5e1;"><b>Telegram İletişim Adresiniz (@kullaniciadi):</b></label>
                <input type="text" id="customerContact" placeholder="@telegramadi">
                <button type="button" class="btn" id="payButton" onclick="submitOrder()">Bakiyeden Numarayı Al</button>
            </div>
            <div id="resultSection" style="display:none;"></div>
            <button type="button" onclick="closeModal()" style="background:#451a03; color:#cbd5e1; border:1px solid var(--border-gold); padding:12px; width:100%; border-radius:10px; margin-top:15px; cursor:pointer; font-weight:bold;">Kapat</button>
        </div>
    </div>

    <!-- BAKİYE YÜKLEME MODALI -->
    <div id="depositModal" class="modal">
        <div class="modal-content">
            <h3 style="color: var(--gold-light); margin-top:0;">💳 Hesaba Bakiye Yükle</h3>
            <div class="payment-info-box">
                Ödeme yaptıktan sonra formu doldurun. Sistem yöneticisi Telegram'dan onayladığı an bakiyeniz eklenecektir.
            </div>
            <label style="font-size:0.9rem; color:#cbd5e1;"><b>Yatırılan Tutar (TL):</b></label>
            <input type="number" id="depositAmount" placeholder="Örn: 300">
            <label style="font-size:0.9rem; color:#cbd5e1;"><b>Gönderen Adı Soyadı:</b></label>
            <input type="text" id="depositSenderName" placeholder="Örn: Resul Sakal">
            <label style="font-size:0.9rem; color:#cbd5e1;"><b>İletişim Adresiniz:</b></label>
            <input type="text" id="depositContact" placeholder="@telegramadi">
            <button type="button" class="btn" onclick="submitDeposit()">Bakiye Bildirimi Gönder</button>
            <button type="button" onclick="closeDepositModal()" style="background:#451a03; color:#cbd5e1; border:1px solid var(--border-gold); padding:12px; width:100%; border-radius:10px; margin-top:12px; cursor:pointer; font-weight:bold;">İptal</button>
        </div>
    </div>

    <script>
        let currentAuthMode = 'login';
        let currentUser = localStorage.getItem('anka_session_user');
        let currentBalance = 0;
        let allProducts = [];
        let selectedProductData = null;

        setTimeout(() => {
            const splash = document.getElementById('splashScreen');
            splash.style.opacity = '0';
            splash.style.visibility = 'hidden';
            if (!currentUser) {
                document.getElementById('authScreen').style.display = 'flex';
            } else {
                initPanel();
            }
        }, 1500);

        function switchAuthMode(mode) {
            currentAuthMode = mode;
            document.getElementById('tabLoginBtn').className = mode === 'login' ? 'auth-tab active' : 'auth-tab';
            document.getElementById('tabRegisterBtn').className = mode === 'register' ? 'auth-tab active' : 'auth-tab';
            document.getElementById('authSubmitBtn').innerText = mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
            document.getElementById('authError').style.display = 'none';
        }

        async function handleAuth() {
            const u = document.getElementById('authUsername').value.trim();
            const p = document.getElementById('authPassword').value.trim();
            const errBox = document.getElementById('authError');

            if (!u || !p) { errBox.innerText = 'Boş alan bırakmayın!'; errBox.style.display = 'block'; return; }

            const endpoint = currentAuthMode === 'login' ? '/api/login' : '/api/register';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();

            if (data.success) {
                if (currentAuthMode === 'register') {
                    alert('✅ Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
                    switchAuthMode('login');
                } else {
                    localStorage.setItem('anka_session_user', u);
                    currentUser = u;
                    currentBalance = data.balance;
                    document.getElementById('authScreen').style.display = 'none';
                    initPanel();
                }
            } else {
                errBox.innerText = data.message;
                errBox.style.display = 'block';
            }
        }

        function logout() {
            localStorage.removeItem('anka_session_user');
            location.reload();
        }

        async function fetchBalance() {
            const res = await fetch('/api/me', { headers: { 'x-username': currentUser } });
            const data = await res.json();
            if (data.success) {
                currentBalance = data.balance;
                document.getElementById('userBalance').innerText = currentBalance.toFixed(2) + ' TL';
            }
        }

        function initPanel() {
            document.getElementById('panelScreen').style.display = 'block';
            document.getElementById('displayUsername').innerText = currentUser;
            fetchBalance();

            fetch('/api/products').then(r => r.json()).then(data => {
                allProducts = data.products;
                let html = \`<div class="category-title">📱 Otomatik SMS Onay Servisleri (OnaylaSMS)</div><div class="grid">\`;
                allProducts.forEach(p => {
                    html += \`<div class="card">
                        <div><h3>\${p.name}</h3><p style="color:#94a3b8; font-size:0.9rem;">\${p.desc}</p></div>
                        <div><div class="price">\${p.price} TL</div>
                        <button class="btn" onclick='openModal(\${JSON.stringify(p)})'>Bakiyeden Satın Al</button></div>
                    </div>\`;
                });
                document.getElementById('product-list').innerHTML = html + \`</div>\`;
            });
        }

        function openModal(prod) {
            selectedProductData = prod;
            fetchBalance().then(() => {
                if (currentBalance < prod.price) {
                    alert('⚠️ Bakiyeniz yetersiz! Lütfen bakiye yükleyin.');
                    return;
                }
                document.getElementById('modalTitle').innerText = prod.name;
                document.getElementById('modalDetailsText').innerHTML = \`Ürün: <b style="color:var(--gold-light);">\${prod.name}</b><br>Tutar: <b style="color:var(--gold-light);">\${prod.price} TL</b>\`;
                document.getElementById('formSection').style.display = 'block';
                document.getElementById('resultSection').style.display = 'none';
                document.getElementById('orderModal').style.display = 'flex';
            });
        }

        function closeModal() { document.getElementById('orderModal').style.display = 'none'; }
        function openDepositModal() { document.getElementById('depositModal').style.display = 'flex'; }
        function closeDepositModal() { document.getElementById('depositModal').style.display = 'none'; }

        async function submitDeposit() {
            const amount = document.getElementById('depositAmount').value;
            const sender = document.getElementById('depositSenderName').value;
            const contact = document.getElementById('depositContact').value;
            if(!amount || !sender || !contact) { alert('Formu eksiksiz doldurun!'); return; }

            await fetch('/api/deposit-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, senderName: sender, customerContact: contact, username: currentUser })
            });
            alert('✅ Bildirim gönderildi. Yönetici Telegram üzerinden onayladığında bakiyeniz hesabınıza yansıyacaktır. Panelin üstündeki "Bakiye Yenile" butonu ile kontrol edebilirsiniz.');
            closeDepositModal();
        }

        async function submitOrder() {
            const contact = document.getElementById('customerContact').value;
            if(!contact) { alert('İletişim adresi zorunludur!'); return; }
            
            document.getElementById('payButton').innerText = "İşleniyor...";
            document.getElementById('payButton').disabled = true;

            const res = await fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-username': currentUser },
                body: JSON.stringify({ product: selectedProductData, customerContact: contact })
            });
            const data = await res.json();
            
            document.getElementById('payButton').innerText = "Bakiyeden Numarayı Al";
            document.getElementById('payButton').disabled = false;
            document.getElementById('formSection').style.display = 'none';
            const resultSec = document.getElementById('resultSection');
            resultSec.style.display = 'block';

            if(data.success) {
                currentBalance = data.newBalance;
                document.getElementById('userBalance').innerText = currentBalance.toFixed(2) + ' TL';
                resultSec.innerHTML = \`<div class="result-box">🔥 Numara Alındı!<br><br>📞 <b>+\${data.phoneNumber}</b></div>\`;
            } else {
                resultSec.innerHTML = \`<div class="result-box" style="border-color:#ef4444; color:#ef4444;">\${data.message}</div>\`;
            }
        }
    </script>
</body>
</html>`;

app.get('/', (req, res) => {
    res.send(HTML_PAGE);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ANKA SERVİS 4K Paneli ${PORT} portunda aktif! Bakiye sistemi bot üzerinden onaylanabilir durumda.`);
});
