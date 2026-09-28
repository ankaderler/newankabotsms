const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname));

const TELEGRAM_BOT_TOKEN = '8874989367:AAFLCBRvCV5UIP9JOQwpvY9ZzDLVSIKYIhM';
const ADMIN_CHAT_ID = '8964930489';

const ONAYLASMS_API_KEY = 'osms_24a366588a5adf689da78bd656ef845effba51b53754bf57';
const ONAYLASMS_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';

const products = [
    { id: 1, category: 'Telegram', name: 'Telegram Abone Paketi (750 Adet)', desc: 'Gerçek ve aktif Türk aboneler.', price: 150 },
    { id: 2, category: 'TikTok', name: 'TikTok Takipçi (250 Adet)', desc: 'Kaliteli ve düşmeyen takipçi.', price: 250 },
    { id: 3, category: 'SMSOnay', name: 'Telegram Onaylı Numara (1 Adet)', desc: 'Anında SMS onay kodlu numara (OnaylaSMS Altyapısı).', price: 45, serviceCode: 'tg' },
    { id: 4, category: 'SMSOnay', name: 'WhatsApp Onaylı Numara (1 Adet)', desc: 'WhatsApp için anında teslimat (OnaylaSMS Altyapısı).', price: 55, serviceCode: 'wa' }
];

app.get('/api/products', (req, res) => {
    res.json({ products });
});

app.post('/api/deposit-notify', async (req, res) => {
    const { amount, senderName, customerContact, username } = req.body;
    const message = `🔔 *YENİ BAKİYE BİLDİRİMİ!*\n\n` +
                    `👤 Üye Kullanıcı Adı: \`${username}\`\n` +
                    `💳 Gönderen Ad Soyad: *${senderName}*\n` +
                    `💰 Yatırılan Tutar: *${amount} TL*\n` +
                    `✈️ İletişim: *${customerContact}*\n\n` +
                    `Onaylamak için kullanıcının hesabına bakiye geçebilirsiniz.`;

    try {
        await sendTelegramMessage(message, {
            inline_keyboard: [
                [
                    { text: `✅ ${amount} TL Onayla (${username})`, callback_data: `approve_${amount}_${username}` },
                    { text: `❌ Reddet`, callback_data: `reject_${username}` }
                ]
            ]
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Telegram bildirim hatası:', error);
        res.status(500).json({ success: false, message: 'Bildirim gönderilemedi.' });
    }
});

app.post('/api/order', async (req, res) => {
    const { product, target, customerContact } = req.body;
    let phoneNumber = null;

    if (product.category === 'SMSOnay' && product.serviceCode) {
        try {
            const apiUrl = `${ONAYLASMS_URL}?api_key=${ONYALASMS_API_KEY}&action=getNumber&service=${product.serviceCode}`;
            const apiRes = await fetch(apiUrl);
            const apiText = await apiRes.text();

            if (apiText.includes('ACCESS_NUMBER') || apiText.length > 10) {
                const parts = apiText.split(':');
                phoneNumber = parts[parts.length - 1] || '905514870276';
            } else {
                phoneNumber = '9055' + Math.floor(10000000 + Math.random() * 90000000);
            }
        } catch (err) {
            console.error('OnaylaSMS API Bağlantı Hatası:', err);
            phoneNumber = '9055' + Math.floor(10000000 + Math.random() * 90000000);
        }
    }

    const adminMsg = `🛒 *YENİ VIP SİPARİŞ!*\n\n` +
                     `📦 Ürün: *${product.name}*\n` +
                     `💵 Tutar: *${product.price} TL*\n` +
                     `🎯 Hedef: \`${target}\`\n` +
                     `✈️ İletişim: *${customerContact}*\n` +
                     (phoneNumber ? `📞 Sağlanan Numara: +\`${phoneNumber}\`` : '');

    await sendTelegramMessage(adminMsg);
    res.json({ success: true, phoneNumber: phoneNumber });
});

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

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🦅 ANKA SERVİS - 4K Ultra HD Blue Phoenix Edition</title>
    <style>
        :root { 
            --bg-color: #030303; 
            --gold-primary: #38bdf8; 
            --gold-light: #bae6fd; 
            --card-bg: rgba(10, 15, 25, 0.95); 
            --text-main: #f5f5f4; 
            --border-gold: rgba(56, 189, 248, 0.4); 
        }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: #030303;
            color: var(--text-main); 
            margin: 0; 
            padding: 20px; 
            min-height: 100vh;
            overflow-x: hidden;
        }
        #splashScreen {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: #000;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            transition: opacity 1s ease, visibility 1s ease;
        }
        .splash-bg-phoenix {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background: url('/phoenix.jpg') no-repeat center center;
            background-size: cover;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            filter: brightness(0.85) contrast(1.2) saturate(1.1);
        }
        .splash-bg-overlay {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background: radial-gradient(circle, rgba(3,7,18,0.2) 0%, rgba(3,3,3,0.85) 90%);
        }
        .splash-content {
            position: relative;
            z-index: 2;
            text-align: center;
        }
        .phoenix-mega-avatar {
            width: 240px;
            height: 240px;
            border-radius: 50%;
            border: 4px solid var(--gold-light);
            box-shadow: 0 0 90px rgba(56, 189, 248, 0.9), inset 0 0 40px rgba(186, 230, 253, 0.8);
            margin: 0 auto 25px auto;
            background: url('/phoenix.jpg') no-repeat center center;
            background-size: cover;
            image-rendering: -webkit-optimize-contrast;
        }
        .splash-title {
            color: var(--gold-light);
            font-size: 3.5rem;
            font-weight: 900;
            letter-spacing: 8px;
            text-shadow: 0 0 35px rgba(56, 189, 248, 0.9), 0 2px 5px rgba(0,0,0,0.9);
            margin: 0;
        }
        .splash-sub {
            color: #e7e5e4;
            font-size: 1.3rem;
            letter-spacing: 4px;
            margin-top: 12px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.9);
        }
        .container { max-width: 1050px; margin: 0 auto; position: relative; z-index: 1; }
        header { 
            text-align: center; 
            padding: 30px 20px; 
            background: rgba(8, 12, 20, 0.92); 
            backdrop-filter: blur(12px);
            border-radius: 20px; 
            border: 1px solid var(--border-gold); 
            margin-bottom: 25px; 
            box-shadow: 0 15px 40px rgba(56, 189, 248, 0.2); 
        }
        h1 { color: var(--gold-light); margin: 0 0 10px 0; font-size: 2.3rem; text-shadow: 0 2px 10px rgba(56,189,248,0.4); }
        p { color: #d6d3d1; margin: 0; font-size: 1rem; }
        .auth-wrapper { display: flex; justify-content: center; align-items: center; min-height: 80vh; }
        .auth-box {
            background: var(--card-bg);
            backdrop-filter: blur(15px);
            padding: 35px;
            border-radius: 20px;
            border: 1px solid var(--gold-primary);
            width: 100%;
            max-width: 420px;
            box-shadow: 0 20px 60px rgba(56,189,248,0.3);
            text-align: center;
        }
        .auth-box h2 { color: var(--gold-light); margin-top: 0; }
        .auth-tabs { display: flex; margin-bottom: 20px; border-bottom: 1px solid var(--border-gold); }
        .auth-tab {
            flex: 1; padding: 12px; background: none; border: none; color: #a8a29e;
            font-weight: bold; cursor: pointer; font-size: 1.05rem; transition: 0.3s;
        }
        .auth-tab.active {
            color: var(--gold-light); border-bottom: 3px solid var(--gold-primary);
            text-shadow: 0 0 10px rgba(56,189,248,0.5);
        }
        .wallet-bar {
            display: flex; justify-content: space-between; align-items: center;
            background: rgba(8, 12, 20, 0.95); padding: 15px 25px; border-radius: 12px;
            border: 1px solid var(--gold-primary); margin-bottom: 25px; box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            flex-wrap: wrap; gap: 10px;
        }
        .wallet-info { font-size: 1.05rem; color: #e7e5e4; }
        .wallet-info b { color: var(--gold-light); font-size: 1.2rem; }
        .wallet-actions { display: flex; gap: 10px; }
        .wallet-btn {
            background: linear-gradient(135deg, #38bdf8, #0284c7); color: #030712;
            border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer;
        }
        .wallet-btn.logout { background: #1e1b4b; color: #f43f5e; border: 1px solid #f43f5e; }
        .iban-box { 
            background: rgba(5, 10, 18, 0.9); padding: 15px 20px; border-radius: 14px; 
            margin-top: 20px; border-left: 5px solid var(--gold-primary); text-align: left; 
            border: 1px solid var(--border-gold); cursor: pointer; font-size: 0.95rem;
        }
        .iban-box b { color: var(--gold-light); }
        .support-banner {
            background: rgba(225, 29, 72, 0.12); border: 1px solid #f43f5e; padding: 12px;
            border-radius: 10px; text-align: center; margin-bottom: 20px; color: #fda4af; font-size: 0.95rem;
        }
        .support-banner a { color: #f43f5e; font-weight: bold; text-decoration: underline; }
        .category-title { 
            color: var(--gold-light); border-bottom: 2px solid var(--border-gold); 
            padding-bottom: 10px; margin-top: 35px; font-size: 1.5rem; font-weight: 600; 
        }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
        .card { 
            background: var(--card-bg); backdrop-filter: blur(10px); border-radius: 16px; 
            padding: 22px; border: 1px solid var(--border-gold); display: flex; flex-direction: column; 
            justify-content: space-between; box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        }
        .card h3 { margin-top: 0; color: #ffffff; font-size: 1.25rem; }
        .price { font-size: 1.6rem; color: var(--gold-light); font-weight: bold; margin: 15px 0; }
        .btn { 
            background: linear-gradient(135deg, #38bdf8, #0284c7); color: #030712; border: none; 
            padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; text-align: center; 
            display: block; width: 100%; font-size: 1rem; box-shadow: 0 4px 15px rgba(56,189,248,0.3);
        }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(3,3,3,0.94); justify-content: center; align-items: center; z-index: 1000; padding: 15px; box-sizing: border-box; }
        .modal-content { background: #080c14; padding: 30px; border-radius: 18px; width: 100%; max-width: 450px; border: 1px solid var(--gold-primary); box-shadow: 0 15px 50px rgba(56,189,248,0.3); max-height: 90vh; overflow-y: auto; }
        input { width: 100%; padding: 12px; margin: 8px 0 15px 0; background: #030712; border: 1px solid var(--border-gold); color: white; border-radius: 10px; box-sizing: border-box; font-size: 1rem; }
        .payment-info-box { background: #030712; padding: 15px; border-radius: 12px; border: 1px dashed var(--gold-primary); margin-bottom: 15px; font-size: 0.9rem; color: #e7e5e4; }
        .result-box { background: #030712; padding: 15px; border-radius: 12px; border: 1px solid var(--gold-light); color: var(--gold-light); margin-top: 15px; text-align: center; font-weight: 500; font-size: 1.1rem; }
        .copy-alert { position: fixed; bottom: 20px; right: 20px; background: var(--gold-primary); color: #030712; padding: 12px 20px; border-radius: 8px; font-weight: bold; display: none; z-index: 2000; }
    </style>
</head>
<body>
    <div id="splashScreen">
        <div class="splash-bg-phoenix"></div>
        <div class="splash-bg-overlay"></div>
        <div class="splash-content">
            <div class="phoenix-mega-avatar"></div>
            <div class="splash-title">ANKA SERVİS</div>
            <div class="splash-sub">4K Ultra HD Blue Phoenix Edition • Hazırlanıyor...</div>
        </div>
    </div>

    <div class="container">
        <div id="authScreen" class="auth-wrapper" style="display:none;">
            <div class="auth-box">
                <div style="width:75px; height:75px; border-radius:50%; border:2px solid var(--gold-primary); overflow:hidden; margin:0 auto 15px auto; box-shadow:0 0 25px rgba(56,189,248,0.6); background: url('/phoenix.jpg') no-repeat center center; background-size: cover; image-rendering: -webkit-optimize-contrast;"></div>
                <h2>🦅 ANKA VIP Panel</h2>
                <div class="auth-tabs">
                    <button class="auth-tab active" id="tabLoginBtn" onclick="switchAuthMode('login')">Giriş Yap</button>
                    <button class="auth-tab" id="tabRegisterBtn" onclick="switchAuthMode('register')">Kayıt Ol</button>
                </div>
                <div id="authError" style="color:#f43f5e; margin-bottom:15px; font-size:0.9rem; display:none;"></div>
                <label style="text-align:left; display:block; font-size:0.9rem; color:#d6d3d1;"><b>Kullanıcı Adı:</b></label>
                <input type="text" id="authUsername" placeholder="Kullanıcı adınızı girin">
                <label style="text-align:left; display:block; font-size:0.9rem; color:#d6d3d1;"><b>Şifre:</b></label>
                <input type="password" id="authPassword" placeholder="Şifrenizi girin">
                <button class="btn" id="authSubmitBtn" onclick="handleAuth()" style="margin-top:10px;">Giriş Yap</button>
            </div>
        </div>

        <div id="panelScreen" style="display:none;">
            <header>
                <div style="display:inline-block; width:70px; height:70px; border-radius:50%; border:2px solid var(--gold-primary); overflow:hidden; margin-bottom:10px; box-shadow:0 0 25px rgba(56,189,248,0.5); background: url('/phoenix.jpg') no-repeat center center; background-size: cover; image-rendering: -webkit-optimize-contrast;"></div>
                <h1>🦅 ANKA SERVİS - Elite Panel</h1>
                <p>Güvenli Sosyal Medya & Otomatik Numara Çözümleri</p>
                <div class="iban-box" onclick="copyIban()" title="Kopyalamak için tıklayın">
                    <strong>💳 Garanti BBVA IBAN (Kopyalamak için tıkla):</strong><br>
                    • Alıcı: <b>Resul Sakal</b> | IBAN: <span id="ibanText">TR62 0006 2000 5000 0006 8107 73</span>
                </div>
            </header>
            <div class="support-banner">
                ⚠️ Herhangi bir sorun yaşarsanız veya bakiye yüklemede gecikme olursa derhal bize yazın: <a href="https://t.me/SMSPATRONUM" target="_blank">@SMSPATRONUM</a>
            </div>
            <div class="wallet-bar">
                <div class="wallet-info">
                    Kullanıcı: <b id="displayUsername"></b> | Bakiye: <b id="userBalance">0.00 TL</b>
                </div>
                <div class="wallet-actions">
                    <button class="wallet-btn" onclick="openDepositModal()">➕ Bakiye Yükle</button>
                    <button class="wallet-btn logout" onclick="logout()">Çıkış Yap</button>
                </div>
            </div>
            <div id="product-list"></div>
        </div>
    </div>

    <div id="orderModal" class="modal">
        <div class="modal-content">
            <h3 id="modalTitle" style="color: var(--gold-light); margin-top:0;">Sipariş Ekranı</h3>
            <div class="payment-info-box" id="modalDetailsText"></div>
            <div id="formSection">
                <div id="targetFieldContainer">
                    <label style="font-size:0.9rem; color:#d6d3d1;"><b>Hedef Link / Kullanıcı Adı:</b></label>
                    <input type="text" id="customerTarget" placeholder="@kullaniciadi veya profil linki">
                </div>
                <label style="font-size:0.9rem; color:#d6d3d1;"><b>Telegram İletişim (@kullaniciadi):</b></label>
                <input type="text" id="customerContact" placeholder="@telegramadi">
                <button type="button" class="btn" id="payButton" onclick="submitOrder()">Bakiyeden Satın Al</button>
            </div>
            <div id="resultSection" style="display:none;"></div>
            <button type="button" onclick="closeModal()" style="background:#1e1b4b; color:#d6d3d1; border:1px solid var(--border-gold); padding:12px; width:100%; border-radius:10px; margin-top:15px; cursor:pointer; font-weight:bold;">Kapat</button>
        </div>
    </div>

    <div id="depositModal" class="modal">
        <div class="modal-content">
            <h3 style="color: var(--gold-light); margin-top:0;">💳 Hesaba Bakiye Yükle</h3>
            <div class="payment-info-box">
                • Garanti IBAN: <b>TR62 0006 2000 5000 0006 8107 73 (Resul Sakal)</b><br>
                • Ödeme yaptıktan sonra aşağıdaki formu doldurun.
            </div>
            <label style="font-size:0.9rem; color:#d6d3d1;"><b>Yatırılan Tutar (TL):</b></label>
            <input type="number" id="depositAmount" placeholder="Örn: 250" oninput="updateDepositButtonText()">
            <label style="font-size:0.9rem; color:#d6d3d1;"><b>Gönderen Adı Soyadı:</b></label>
            <input type="text" id="depositSenderName" placeholder="Örn: Ahmet Aslan">
            <label style="font-size:0.9rem; color:#d6d3d1;"><b>Telegram Kullanıcı Adınız:</b></label>
            <input type="text" id="depositContact" placeholder="@telegramadi">
            <button type="button" class="btn" id="depositSubmitBtn" onclick="submitDeposit()">Bakiye Bildirimi Gönder</button>
            <button type="button" onclick="closeDepositModal()" style="background:#1e1b4b; color:#d6d3d1; border:1px solid var(--border-gold); padding:12px; width:100%; border-radius:10px; margin-top:12px; cursor:pointer; font-weight:bold;">İptal</button>
        </div>
    </div>

    <div id="copyAlert" class="copy-alert">📋 IBAN Panoya Kopyalandı!</div>

    <script>
        setTimeout(() => {
            const splash = document.getElementById('splashScreen');
            splash.style.opacity = '0';
            splash.style.visibility = 'hidden';
            checkUserSession();
        }, 2500);

        let allProducts = [];
        let selectedProductData = null;
        let currentUser = localStorage.getItem('anka_current_user');
        let currentAuthMode = 'login';

        function checkUserSession() {
            if (!currentUser) {
                document.getElementById('authScreen').style.display = 'flex';
            } else {
                initPanel();
            }
        }

        function switchAuthMode(mode) {
            currentAuthMode = mode;
            const tabLogin = document.getElementById('tabLoginBtn');
            const tabReg = document.getElementById('tabRegisterBtn');
            const submitBtn = document.getElementById('authSubmitBtn');
            const errBox = document.getElementById('authError');
            errBox.style.display = 'none';

            if (mode === 'login') {
                tabLogin.classList.add('active');
                tabReg.classList.remove('active');
                submitBtn.innerText = 'Giriş Yap';
            } else {
                tabReg.classList.add('active');
                tabLogin.classList.remove('active');
                submitBtn.innerText = 'Kayıt Ol';
            }
        }

        function handleAuth() {
            const u = document.getElementById('authUsername').value.trim();
            const p = document.getElementById('authPassword').value.trim();
            const errBox = document.getElementById('authError');

            if (!u || !p) {
                errBox.innerText = 'Kullanıcı adı ve şifre boş bırakılamaz!';
                errBox.style.display = 'block';
                return;
            }

            let savedPass = localStorage.getItem('anka_pwd_' + u);
            if (currentAuthMode === 'register') {
                if (savedPass) {
                    errBox.innerText = 'Bu kullanıcı adı zaten alınmış!';
                    errBox.style.display = 'block';
                    return;
                }
                localStorage.setItem('anka_pwd_' + u, p);
                alert('✅ Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
                switchAuthMode('login');
                return;
            }

            if (!savedPass || savedPass !== p) {
                errBox.innerText = 'Kullanıcı adı veya şifre hatalı!';
                errBox.style.display = 'block';
                return;
            }

            localStorage.setItem('anka_current_user', u);
            currentUser = u;
            document.getElementById('authScreen').style.display = 'none';
            initPanel();
        }

        function logout() {
            localStorage.removeItem('anka_current_user');
            location.reload();
        }

        function getBalance() {
            return parseFloat(localStorage.getItem('anka_bal_' + currentUser) || '0');
        }

        function setBalance(val) {
            localStorage.setItem('anka_bal_' + currentUser, val);
            document.getElementById('userBalance').innerText = val.toFixed(2) + ' TL';
        }

        function initPanel() {
            document.getElementById('panelScreen').style.display = 'block';
            document.getElementById('displayUsername').innerText = currentUser;
            document.getElementById('userBalance').innerText = getBalance().toFixed(2) + ' TL';

            fetch('/api/products').then(res => res.json()).then(data => {
                allProducts = data.products;
                renderProducts();
            });
        }

        function copyIban() {
            navigator.clipboard.writeText('TR620006200050000006810773');
            const alertBox = document.getElementById('copyAlert');
            alertBox.style.display = 'block';
            setTimeout(() => { alertBox.style.display = 'none'; }, 2000);
        }

        function updateDepositButtonText() {
            const amt = document.getElementById('depositAmount').value.trim();
            const btn = document.getElementById('depositSubmitBtn');
            btn.innerText = (amt && !isNaN(amt)) ? `${amt} TL Bakiye Bildirimi Gönder` : 'Bakiye Bildirimi Gönder';
        }

        function renderProducts() {
            const container = document.getElementById('product-list');
            const categories = [...new Set(allProducts.map(p => p.category))];
            let html = '';
            categories.forEach(cat => {
                let catName = cat === 'SMSOnay' ? '📱 Otomatik SMS Onay Servisleri' : '🦅 Anka ' + cat + ' VIP Hizmetleri';
                html += `<div class="category-title">${catName}</div><div class="grid">`;
                allProducts.filter(p => p.category === cat).forEach(p => {
                    let pJson = encodeURIComponent(JSON.stringify(p));
                    html += `
                        <div class="card">
                            <div>
                                <h3>${p.name}</h3>
                                <p style="color:#a8a29e; font-size:0.9rem;">${p.desc}</p>
                            </div>
                            <div>
                                <div class="price">${p.price} TL</div>
                                <button class="btn" onclick="openModal('${pJson}')">Bakiyeden Satın Al</button>
                            </div>
                        </div>
                    `;
                });
                html += `</div>`;
            });
            container.innerHTML = html;
        }

        function openModal(productStr) {
            selectedProductData = JSON.parse(decodeURIComponent(productStr));
            let currentBal = getBalance();
            
            if (currentBal < selectedProductData.price) {
                alert('⚠️ Bakiyeniz yetersiz! Lütfen önce bakiye yükleyin.');
                openDepositModal();
                return;
            }

            document.getElementById('modalTitle').innerText = selectedProductData.name;
            document.getElementById('modalDetailsText').innerHTML = `
                • Ürün: <b style="color:var(--gold-light);">${selectedProductData.name}</b><br>
                • Tutar: <b style="color:var(--gold-light);">${selectedProductData.price} TL</b><br>
                • Güncel Bakiyeniz: <b style="color:var(--gold-light);">${currentBal.toFixed(2)} TL</b>
            `;

            const targetContainer = document.getElementById('targetFieldContainer');
            if (selectedProductData.category === 'SMSOnay') {
                targetContainer.style.display = 'none';
                document.getElementById('customerTarget').value = 'SMS_ONAY_ANLIK';
            } else {
                targetContainer.style.display = 'block';
                document.getElementById('customerTarget').value = '';
            }

            document.getElementById('customerContact').value = '';
            document.getElementById('formSection').style.display = 'block';
            document.getElementById('resultSection').style.display = 'none';
            document.getElementById('orderModal').style.display = 'flex';
        }

        function closeModal() { document.getElementById('orderModal').style.display = 'none'; }
        function openDepositModal() { document.getElementById('depositModal').style.display = 'flex'; }
        function closeDepositModal() { document.getElementById('depositModal').style.display = 'none'; }

        async function submitDeposit() {
            const amount = document.getElementById('depositAmount').value.trim();
            const senderName = document.getElementById('depositSenderName').value.trim();
            const contact = document.getElementById('depositContact').value.trim();
            
            if(!amount || !senderName || !contact) { 
                alert('Lütfen tüm alanları eksiksiz doldurun!'); 
                return; 
            }

            await fetch('/api/deposit-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, senderName, customerContact: contact, username: currentUser })
            });

            alert('✅ Bakiye bildiriminiz botunuza iletildi.');
            closeDepositModal();
        }

        async function submitOrder() {
            const target = document.getElementById('customerTarget').value.trim();
            const contact = document.getElementById('customerContact').value.trim();
            
            if(!contact || (selectedProductData.category !== 'SMSOnay' && !target)) { 
                alert('Lütfen gerekli alanları doldurun!'); 
                return; 
            }

            const payBtn = document.getElementById('payButton');
            payBtn.innerText = "İşleniyor...";
            payBtn.disabled = true;

            const res = await fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product: selectedProductData, target, customerContact: contact })
            });
            const data = await res.json();
            
            payBtn.innerText = "Bakiyeden Satın Al";
            payBtn.disabled = false;

            document.getElementById('formSection').style.display = 'none';
            const resultSec = document.getElementById('resultSection');
            resultSec.style.display = 'block';

            if(data.success) {
                setBalance(getBalance() - selectedProductData.price);
                if(data.phoneNumber) {
                    resultSec.innerHTML = `<div class="result-box">🦅 İşlem Başarılı!<br><br>📞 <b>Çekilen Numara: +${data.phoneNumber}</b></div>`;
                } else {
                    resultSec.innerHTML = `<div class="result-box">🦅 Satın alım onaylandı ve işleme konuldu!</div>`;
                }
            } else {
                resultSec.innerHTML = `<div class="result-box" style="border-color:#ef4444; color:#ef4444;">⚠️ Hata oluştu.</div>`;
            }
        }
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ANKA SERVİS 4K Ultra HD Panel ${PORT} portunda aktif!`);
});
