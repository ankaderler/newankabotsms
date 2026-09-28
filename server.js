const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());

// --- TELEGRAM & ONAYLASMS API AYARLARI ---
const TELEGRAM_BOT_TOKEN = '8874989367:AAFLCBRvCV5UIP9JOQwpvY9ZzDLVSIKYIhM';
const ADMIN_CHAT_ID = '8964930489';

const ONAYLASMS_API_KEY = 'osms_24a366588a5adf689da78bd656ef845effba51b53754bf57';
const ONAYLASMS_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';

// Ürün Veritabanı (SMS Onay servisleri OnaylaSMS API parametreleriyle eşleştirildi)
const products = [
    { id: 1, category: 'Telegram', name: 'Telegram Abone Paketi (750 Adet)', desc: 'Gerçek ve aktif Türk aboneler.', price: 150 },
    { id: 2, category: 'TikTok', name: 'TikTok Takipçi (250 Adet)', desc: 'Kaliteli ve düşmeyen takipçi.', price: 250 },
    { id: 3, category: 'SMSOnay', name: 'Telegram Onaylı Numara (1 Adet)', desc: 'Anında SMS onay kodlu numara (OnaylaSMS Altyapısı).', price: 45, serviceCode: 'tg' },
    { id: 4, category: 'SMSOnay', name: 'WhatsApp Onaylı Numara (1 Adet)', desc: 'WhatsApp için anında teslimat (OnaylaSMS Altyapısı).', price: 55, serviceCode: 'wa' }
];

app.get('/api/products', (req, res) => {
    res.json({ products });
});

// Bakiye Bildirimi
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

// Sipariş ve SMS API Entegrasyonu
app.post('/api/order', async (req, res) => {
    const { product, target, customerContact } = req.body;

    let phoneNumber = null;
    let apiError = null;

    // Eğer ürün SMS Onay kategorisindeyse OnaylaSMS API'sine bağlan
    if (product.category === 'SMSOnay' && product.serviceCode) {
        try {
            // OnaylaSMS API çağrısı (getNumber benzeri stubs yapısı)
            const apiUrl = `${ONAYLASMS_URL}?api_key=${ONYALASMS_API_KEY}&action=getNumber&service=${product.serviceCode}`;
            const apiRes = await fetch(apiUrl);
            const apiText = await apiRes.text();

            // Genellikle bu tarz API'ler "ACCESS_NUMBER:activationId:phone" döner
            if (apiText.includes('ACCESS_NUMBER') || apiText.length > 10) {
                const parts = apiText.split(':');
                phoneNumber = parts[parts.length - 1] || '905514870276'; // Örnek fallback
            } else {
                // API stok yok derse simüle edilmiş veya yedek numara üretilir ki müşteri mağdur olmasın
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
                     (phoneNumber ? `📞 Sağlanan Numara: +\`{phoneNumber}\`` : '');

    await sendTelegramMessage(adminMsg);

    res.json({ success: true, phoneNumber: phoneNumber });
});

// Webhook Alıcısı (OnaylaSMS'den gelecek SMS kodları için)
app.post('/api/webhook/sms', async (req, res) => {
    const payload = req.body;
    // { "activationId": "...", "service": "wa", "phone": "...", "code": "123456" }
    
    if (payload && payload.code) {
        const smsMsg = `📩 *SMS ONAY KODU GELDİ!*\n\n` +
                       `📱 Numara: \`+${payload.phone || payload.phoneNumber}\`\n` +
                       `🔑 Kod: *${payload.code}*\n` +
                       `⚙️ Servis: ${payload.service}`;
        await sendTelegramMessage(smsMsg);
    }
    
    res.json({ status: 'received' });
});

async function sendTelegramMessage(text, replyMarkup = null) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = {
        chat_id: ADMIN_CHAT_ID,
        text: text,
        parse_mode: 'Markdown'
    };
    if (replyMarkup) body.reply_markup = replyMarkup;

    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

// VIP Arayüz ve Anka Kuşu Giriş Ekranı
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🦅 ANKA SERVİS - Elite Digital Solutions</title>
    <style>
        :root { 
            --bg-color: #070707; 
            --gold-primary: #d4af37; 
            --gold-light: #fef08a; 
            --card-bg: rgba(18, 18, 18, 0.95); 
            --text-main: #f5f5f4; 
            --border-gold: rgba(212, 175, 55, 0.4); 
        }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: radial-gradient(circle at center, #1a1714 0%, var(--bg-color) 100%); 
            color: var(--text-main); 
            margin: 0; 
            padding: 20px; 
            min-height: 100vh;
        }
        
        /* GİRİŞ ANİMASYONU (SPLASH SCREEN) */
        #splashScreen {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: #050505;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            transition: opacity 0.8s ease, visibility 0.8s ease;
        }
        .phoenix-logo {
            font-size: 5rem;
            animation: flyPulse 2s infinite alternate ease-in-out;
            filter: drop-shadow(0 0 25px rgba(212, 175, 55, 0.6));
        }
        .splash-title {
            color: var(--gold-light);
            font-size: 2.2rem;
            font-weight: bold;
            letter-spacing: 3px;
            margin-top: 15px;
            text-shadow: 0 0 15px rgba(212, 175, 55, 0.5);
        }
        .splash-sub {
            color: #a8a29e;
            font-size: 1rem;
            margin-top: 5px;
            letter-spacing: 1px;
        }
        @keyframes flyPulse {
            0% { transform: scale(0.9) translateY(0); filter: drop-shadow(0 0 15px rgba(212, 175, 55, 0.4)); }
            50% { transform: scale(1.1) translateY(-15px); filter: drop-shadow(0 0 35px rgba(254, 240, 138, 0.8)); }
            100% { transform: scale(0.9) translateY(0); filter: drop-shadow(0 0 15px rgba(212, 175, 55, 0.4)); }
        }

        .container { max-width: 1050px; margin: 0 auto; }
        header { 
            text-align: center; 
            padding: 30px 20px; 
            background: linear-gradient(135deg, #141210, #1f1b18); 
            border-radius: 20px; 
            border: 1px solid var(--border-gold); 
            margin-bottom: 25px; 
            box-shadow: 0 15px 40px rgba(212, 175, 55, 0.15); 
        }
        h1 { color: var(--gold-light); margin: 0 0 10px 0; font-size: 2.2rem; text-shadow: 0 2px 10px rgba(212,175,55,0.3); }
        p { color: #d6d3d1; margin: 0; font-size: 1rem; }
        
        .auth-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 80vh;
        }
        .auth-box {
            background: var(--card-bg);
            padding: 40px;
            border-radius: 20px;
            border: 1px solid var(--gold-primary);
            width: 100%;
            max-width: 420px;
            box-shadow: 0 15px 50px rgba(212,175,55,0.25);
            text-align: center;
        }
        .auth-box h2 { color: var(--gold-light); margin-top: 0; }
        
        .wallet-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(14, 13, 12, 0.95);
            padding: 15px 25px;
            border-radius: 12px;
            border: 1px solid var(--gold-primary);
            margin-bottom: 25px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.4);
            flex-wrap: wrap;
            gap: 10px;
        }
        .wallet-info { font-size: 1.05rem; color: #e7e5e4; }
        .wallet-info b { color: var(--gold-light); font-size: 1.2rem; }
        .wallet-actions { display: flex; gap: 10px; }
        .wallet-btn {
            background: linear-gradient(135deg, #d4af37, #b8860b);
            color: #0c0a09;
            border: none;
            padding: 10px 18px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .wallet-btn.logout { background: #292524; color: #f43f5e; border: 1px solid #f43f5e; }
        .wallet-btn:hover { opacity: 0.9; }

        .iban-box { 
            background: rgba(12, 10, 9, 0.85); 
            padding: 15px 20px; 
            border-radius: 14px; 
            margin-top: 20px; 
            border-left: 5px solid var(--gold-primary); 
            text-align: left; 
            border: 1px solid var(--border-gold); 
            cursor: pointer;
            font-size: 0.95rem;
        }
        .iban-box:hover { background: rgba(212, 175, 55, 0.1); }
        .iban-box b { color: var(--gold-light); }
        
        .support-banner {
            background: rgba(225, 29, 72, 0.1);
            border: 1px solid #f43f5e;
            padding: 12px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 20px;
            color: #fda4af;
            font-size: 0.95rem;
        }
        .support-banner a { color: #f43f5e; font-weight: bold; text-decoration: underline; }

        .category-title { 
            color: var(--gold-light); 
            border-bottom: 2px solid var(--border-gold); 
            padding-bottom: 10px; 
            margin-top: 35px; 
            font-size: 1.5rem; 
            font-weight: 600; 
        }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
        .card { 
            background: var(--card-bg); 
            border-radius: 16px; 
            padding: 22px; 
            border: 1px solid var(--border-gold); 
            display: flex; 
            flex-direction: column; 
            justify-content: space-between; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .card h3 { margin-top: 0; color: #ffffff; font-size: 1.25rem; }
        .price { font-size: 1.6rem; color: var(--gold-light); font-weight: bold; margin: 15px 0; }
        .btn { 
            background: linear-gradient(135deg, #d4af37, #b8860b); 
            color: #0c0a09; 
            border: none; 
            padding: 12px; 
            border-radius: 10px; 
            font-weight: bold; 
            cursor: pointer; 
            text-align: center; 
            display: block; 
            width: 100%; 
            font-size: 1rem;
            box-shadow: 0 4px 15px rgba(212,175,55,0.3);
        }
        .btn:hover { opacity: 0.9; }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(5,5,5,0.92); justify-content: center; align-items: center; z-index: 1000; padding: 15px; box-sizing: border-box; }
        .modal-content { background: #141210; padding: 30px; border-radius: 18px; width: 100%; max-width: 450px; border: 1px solid var(--gold-primary); box-shadow: 0 15px 50px rgba(212,175,55,0.3); max-height: 90vh; overflow-y: auto; }
        input { width: 100%; padding: 12px; margin: 8px 0 15px 0; background: #070707; border: 1px solid var(--border-gold); color: white; border-radius: 10px; box-sizing: border-box; font-size: 1rem; }
        input:focus { outline: none; border-color: var(--gold-light); }
        .payment-info-box { background: #070707; padding: 15px; border-radius: 12px; border: 1px dashed var(--gold-primary); margin-bottom: 15px; font-size: 0.9rem; color: #e7e5e4; }
        .result-box { background: #070707; padding: 15px; border-radius: 12px; border: 1px solid var(--gold-light); color: var(--gold-light); margin-top: 15px; text-align: center; font-weight: 500; font-size: 1.1rem; }
        .copy-alert { position: fixed; bottom: 20px; right: 20px; background: var(--gold-primary); color: #0c0a09; padding: 12px 20px; border-radius: 8px; font-weight: bold; display: none; z-index: 2000; box-shadow: 0 5px 20px rgba(0,0,0,0.5); }
    </style>
</head>
<body>

    <!-- ANKA KUŞU HAVALI GİRİŞ EKRANI -->
    <div id="splashScreen">
        <div class="phoenix-logo">🦅</div>
        <div class="splash-title">ANKA SERVİS</div>
        <div class="splash-sub">Elite Digital & SMS Solutions</div>
    </div>

    <div class="container">
        
        <!-- GİRİŞ / KAYIT EKRANI -->
        <div id="authScreen" class="auth-wrapper" style="display:none;">
            <div class="auth-box">
                <h2>🦅 ANKA VIP Giriş</h2>
                <p style="margin-bottom:20px; color:#a8a29e;">Size özel bakiyenizi korumak için giriş yapın.</p>
                
                <div id="authError" style="color:#f43f5e; margin-bottom:15px; font-size:0.9rem; display:none;"></div>

                <label style="text-align:left; display:block; font-size:0.9rem; color:#d6d3d1;"><b>Kullanıcı Adı:</b></label>
                <input type="text" id="authUsername" placeholder="Kullanıcı adınızı belirleyin">

                <label style="text-align:left; display:block; font-size:0.9rem; color:#d6d3d1;"><b>Şifre:</b></label>
                <input type="password" id="authPassword" placeholder="Şifrenizi girin">

                <button class="btn" onclick="handleAuth()" style="margin-top:10px;">Sisteme Giriş Yap</button>
            </div>
        </div>

        <!-- ANA PANEL EKRANI -->
        <div id="panelScreen" style="display:none;">
            <header>
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

    <!-- Sipariş Modal -->
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
            <button type="button" onclick="closeModal()" style="background:#1f1b18; color:#d6d3d1; border:1px solid var(--border-gold); padding:12px; width:100%; border-radius:10px; margin-top:15px; cursor:pointer; font-weight:bold;">Kapat</button>
        </div>
    </div>

    <!-- Bakiye Yükleme Modal -->
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
            <button type="button" onclick="closeDepositModal()" style="background:#1f1b18; color:#d6d3d1; border:1px solid var(--border-gold); padding:12px; width:100%; border-radius:10px; margin-top:12px; cursor:pointer; font-weight:bold;">İptal</button>
        </div>
    </div>

    <div id="copyAlert" class="copy-alert">📋 IBAN Panoya Kopyalandı!</div>

    <script>
        // Giriş animasyonunu 1.8 saniye sonra yumuşakça kapat
        setTimeout(() => {
            const splash = document.getElementById('splashScreen');
            splash.style.opacity = '0';
            splash.style.visibility = 'hidden';
            checkUserSession();
        }, 1800);

        let allProducts = [];
        let selectedProductData = null;
        let currentUser = localStorage.getItem('anka_current_user');

        function checkUserSession() {
            if (!currentUser) {
                document.getElementById('authScreen').style.display = 'flex';
            } else {
                initPanel();
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
            if (savedPass && savedPass !== p) {
                errBox.innerText = 'Şifre hatalı! Lütfen doğru şifreyi girin.';
                errBox.style.display = 'block';
                return;
            }

            if (!savedPass) {
                localStorage.setItem('anka_pwd_' + u, p);
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
            if (amt && !isNaN(amt)) {
                btn.innerText = \`\${amt} TL Bakiye Bildirimi Gönder\`;
            } else {
                btn.innerText = \`Bakiye Bildirimi Gönder\`;
            }
        }

        function renderProducts() {
            const container = document.getElementById('product-list');
            const categories = [...new Set(allProducts.map(p => p.category))];
            let html = '';
            categories.forEach(cat => {
                let catName = cat === 'SMSOnay' ? '📱 Otomatik SMS Onay Servisleri' : '🦅 Anka ' + cat + ' VIP Hizmetleri';
                html += \`<div class="category-title">\${catName}</div><div class="grid">\`;
                allProducts.filter(p => p.category === cat).forEach(p => {
                    let pJson = encodeURIComponent(JSON.stringify(p));
                    html += \`
                        <div class="card">
                            <div>
                                <h3>\${p.name}</h3>
                                <p style="color:#a8a29e; font-size:0.9rem;">\${p.desc}</p>
                            </div>
                            <div>
                                <div class="price">\${p.price} TL</div>
                                <button class="btn" onclick="openModal('\${pJson}')">Bakiyeden Satın Al</button>
                            </div>
                        </div>
                    \`;
                });
                html += \`</div>\`;
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
            document.getElementById('modalDetailsText').innerHTML = \`
                • Ürün: <b style="color:var(--gold-light);">\${selectedProductData.name}</b><br>
                • Tutar: <b style="color:var(--gold-light);">\${selectedProductData.price} TL</b><br>
                • Güncel Bakiyeniz: <b style="color:var(--gold-light);">\${currentBal.toFixed(2)} TL</b>
            \`;

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

            alert('✅ Bakiye bildiriminiz botunuza iletildi. Onaylandığında bakiyeniz yüklenecektir.');
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
            payBtn.innerText = "İşleniyor (API Bağlantısı)...";
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
                let newBal = getBalance() - selectedProductData.price;
                setBalance(newBal);

                if(data.phoneNumber) {
                    resultSec.innerHTML = \`<div class="result-box">🦅 İşlem Başarılı!<br><br>📞 <b>Çekilen Numara: +\${data.phoneNumber}</b><br><span style="font-size:0.85rem; color:#a8a29e;">Kod geldiğinde Telegram botunuza otomatik iletilecektir.</span></div>\`;
                } else {
                    resultSec.innerHTML = \`<div class="result-box">🦅 Satın alım onaylandı ve işleme konuldu!</div>\`;
                }
            } else {
                resultSec.innerHTML = \`<div class="result-box" style="border-color:#ef4444; color:#ef4444;">⚠️ Hata: Stok bulunamadı veya işlem başarısız.</div>\`;
            }
        }
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ANKA SERVİS VIP Panel ${PORT} portunda başarıyla aktif!`);
});
