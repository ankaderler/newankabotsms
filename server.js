const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());

// --- TELEGRAM BOT AYARLARI ---
const TELEGRAM_BOT_TOKEN = '8874989367:AAFLCBRvCV5UIP9JOQwpvY9ZzDLVSIKYIhM';
const ADMIN_CHAT_ID = '8964930489';

// Örnek Ürün Veritabanı
const products = [
    { id: 1, category: 'Telegram', name: 'Telegram Abone Paketi (750 Adet)', desc: 'Gerçek ve aktif Türk aboneler.', price: 150 },
    { id: 2, category: 'TikTok', name: 'TikTok Takipçi (250 Adet)', desc: 'Kaliteli ve düşmeyen takipçi.', price: 250 },
    { id: 3, category: 'SMSOnay', name: 'Telegram Amerikan Numarası', desc: 'Anında SMS onay kodlu numara.', price: 50 },
    { id: 4, category: 'SMSOnay', name: 'WhatsApp İngiltere Numarası', desc: 'WhatsApp için anında teslimat.', price: 60 }
];

// Ürünleri Listeleme API
app.get('/api/products', (req, res) => {
    res.json({ products });
});

// Bakiye Bildirimi Geldiğinde Telegram'a Mesaj Gönder
app.post('/api/deposit-notify', async (req, res) => {
    const { amount, senderName, customerContact } = req.body;

    const message = `🔔 *YENİ BAKİYE BİLDİRİMİ!*\n\n` +
                    `👤 Gönderen Ad Soyad: *${senderName}*\n` +
                    `💰 Yatırılan Tutar: *${amount} TL*\n` +
                    `✈️ Müşteri Telegram: *${customerContact}*\n\n` +
                    `Garanti hesabınızı kontrol edip onay verin!`;

    try {
        await sendTelegramMessage(message, {
            inline_keyboard: [
                [
                    { text: `✅ ${amount} TL Onayla (${customerContact})`, callback_data: `approve_${amount}_${customerContact}` },
                    { text: `❌ Reddet`, callback_data: `reject_${customerContact}` }
                ]
            ]
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Telegram bildirim hatası:', error);
        res.status(500).json({ success: false, message: 'Bildirim gönderilemedi.' });
    }
});

// Sipariş İşlemi
app.post('/api/order', async (req, res) => {
    const { product, target, customerContact } = req.body;

    let phoneNumber = null;
    if (product.category === 'SMSOnay') {
        phoneNumber = Math.floor(1000000000 + Math.random() * 9000000000);
    }

    const adminMsg = `🛒 *YENİ SİPARİŞ / HARCAMA!*\n\n` +
                     `📦 Ürün: *${product.name}*\n` +
                     `💵 Tutar: *${product.price} TL*\n` +
                     `🎯 Hedef: \`${target}\`\n` +
                     `✈️ Müşteri: *${customerContact}*\n` +
                     (phoneNumber ? `📞 Verilen Numara: +${phoneNumber}` : '');

    await sendTelegramMessage(adminMsg);

    res.json({ success: true, phoneNumber: phoneNumber });
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

// Ana Sayfa (HTML Arayüzü Doğrudan Sunucudan Verilir)
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🦅 ANKA VIP - Premium Medya & SMS Paneli</title>
    <style>
        :root { 
            --bg-color: #0c0a09; 
            --gold-primary: #d4af37; 
            --gold-light: #fef08a; 
            --card-bg: rgba(20, 18, 16, 0.9); 
            --text-main: #f5f5f4; 
            --border-gold: rgba(212, 175, 55, 0.4); 
        }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: radial-gradient(circle at center, #1c1917 0%, var(--bg-color) 100%); 
            color: var(--text-main); 
            margin: 0; 
            padding: 20px; 
            min-height: 100vh;
        }
        .container { max-width: 1050px; margin: 0 auto; }
        header { 
            text-align: center; 
            padding: 35px 20px; 
            background: linear-gradient(135deg, #1c1917, #292524); 
            border-radius: 20px; 
            border: 1px solid var(--border-gold); 
            margin-bottom: 25px; 
            box-shadow: 0 15px 40px rgba(212, 175, 55, 0.15); 
        }
        h1 { color: var(--gold-light); margin: 0 0 10px 0; font-size: 2.4rem; text-shadow: 0 2px 10px rgba(212,175,55,0.3); }
        p { color: #d6d3d1; margin: 0; font-size: 1.05rem; }
        
        .wallet-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(12, 10, 9, 0.9);
            padding: 15px 25px;
            border-radius: 12px;
            border: 1px solid var(--gold-primary);
            margin-bottom: 30px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.4);
        }
        .wallet-info { font-size: 1.1rem; color: #e7e5e4; }
        .wallet-info b { color: var(--gold-light); font-size: 1.3rem; }
        .wallet-btn {
            background: linear-gradient(135deg, #d4af37, #b8860b);
            color: #0c0a09;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .wallet-btn:hover { opacity: 0.9; }

        .iban-box { 
            background: rgba(12, 10, 9, 0.85); 
            padding: 18px 25px; 
            border-radius: 14px; 
            display: inline-block; 
            margin-top: 20px; 
            border-left: 5px solid var(--gold-primary); 
            text-align: left; 
            border: 1px solid var(--border-gold); 
            cursor: pointer;
        }
        .iban-box:hover { background: rgba(212, 175, 55, 0.1); }
        .iban-box b { color: var(--gold-light); }
        
        .category-title { 
            color: var(--gold-light); 
            border-bottom: 2px solid var(--border-gold); 
            padding-bottom: 10px; 
            margin-top: 40px; 
            font-size: 1.6rem; 
            font-weight: 600; 
        }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 22px; margin-top: 20px; }
        .card { 
            background: var(--card-bg); 
            border-radius: 16px; 
            padding: 24px; 
            border: 1px solid var(--border-gold); 
            display: flex; 
            flex-direction: column; 
            justify-content: space-between; 
            transition: transform 0.3s ease;
        }
        .card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(212, 175, 55, 0.2); }
        .card h3 { margin-top: 0; color: #ffffff; font-size: 1.3rem; }
        .price { font-size: 1.7rem; color: var(--gold-light); font-weight: bold; margin: 15px 0; }
        .btn { 
            background: linear-gradient(135deg, #d4af37, #b8860b); 
            color: #0c0a09; 
            border: none; 
            padding: 12px 18px; 
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
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(12,10,9,0.9); justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #1c1917; padding: 35px; border-radius: 18px; width: 90%; max-width: 480px; border: 1px solid var(--gold-primary); box-shadow: 0 15px 50px rgba(212,175,55,0.3); }
        input { width: 100%; padding: 13px; margin: 8px 0 18px 0; background: #0c0a09; border: 1px solid var(--border-gold); color: white; border-radius: 10px; box-sizing: border-box; font-size: 1rem; }
        input:focus { outline: none; border-color: var(--gold-light); }
        .payment-info-box { background: #0c0a09; padding: 18px; border-radius: 12px; border: 1px dashed var(--gold-primary); margin-bottom: 20px; font-size: 0.95rem; color: #e7e5e4; }
        .result-box { background: #0c0a09; padding: 18px; border-radius: 12px; border: 1px solid var(--gold-light); color: var(--gold-light); margin-top: 15px; text-align: center; font-weight: 500; }
        .support-link { color: var(--gold-light); text-decoration: underline; font-weight: bold; }
        .copy-alert { position: fixed; bottom: 20px; right: 20px; background: var(--gold-primary); color: #0c0a09; padding: 12px 20px; border-radius: 8px; font-weight: bold; display: none; z-index: 2000; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🦅 ANKA VIP - Premium Medya & SMS Paneli</h1>
            <p>Kesintisiz ve Güvenli Sosyal Medya & Numara Çözümleri</p>
            <div class="iban-box" onclick="copyIban()" title="Kopyalamak için tıklayın">
                <strong>💳 Garanti BBVA IBAN (Kopyalamak için tıkla):</strong><br>
                • Alıcı: <b>Resul Sakal</b><br>
                • IBAN: <span id="ibanText">TR62 0006 2000 5000 0006 8107 73</span><br>
                • Destek: <a href="https://t.me/SMSPATRONUM" target="_blank" style="color:var(--gold-light);">@SMSPATRONUM</a>
            </div>
        </header>

        <div class="wallet-bar">
            <div class="wallet-info">
                Hesap Bakiyeniz: <b id="userBalance">0.00 TL</b>
            </div>
            <button class="wallet-btn" onclick="openDepositModal()">➕ Bakiye Yükle</button>
        </div>

        <div id="product-list"></div>
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
                
                <label style="font-size:0.9rem; color:#d6d3d1;"><b>Telegram Kullanıcı Adınız (@kullaniciadi):</b></label>
                <input type="text" id="customerContact" placeholder="@telegramadi" required>
                
                <button type="button" class="btn" id="payButton" onclick="submitOrder()">Bakiyeden Satın Al</button>
            </div>
            <div id="resultSection" style="display:none;"></div>
            <button type="button" onclick="closeModal()" style="background:#292524; color:#d6d3d1; border:1px solid var(--border-gold); padding:12px; width:100%; border-radius:10px; margin-top:15px; cursor:pointer; font-weight:bold;">Kapat / Ana Menü</button>
        </div>
    </div>

    <!-- Bakiye Yükleme Modal -->
    <div id="depositModal" class="modal">
        <div class="modal-content">
            <h3 style="color: var(--gold-light); margin-top:0;">💳 Hesaba Bakiye Yükle</h3>
            <div class="payment-info-box">
                • Garanti IBAN: <b>TR62 0006 2000 5000 0006 8107 73 (Resul Sakal)</b><br>
                • Havale/EFT yaptıktan sonra bilgileri girin.
            </div>
            
            <label style="font-size:0.9rem; color:#d6d3d1;"><b>Yatırılan Tutar (TL):</b></label>
            <input type="number" id="depositAmount" placeholder="Örn: 200" oninput="updateDepositButtonText()">
            
            <label style="font-size:0.9rem; color:#d6d3d1;"><b>Gönderen Adı Soyadı:</b></label>
            <input type="text" id="depositSenderName" placeholder="Örn: Ahmet Aslan">

            <label style="font-size:0.9rem; color:#d6d3d1;"><b>Telegram Kullanıcı Adınız (@kullaniciadi):</b></label>
            <input type="text" id="depositContact" placeholder="@telegramadi">

            <button type="button" class="btn" id="depositSubmitBtn" onclick="submitDeposit()">Bakiye Bildirimi Gönder</button>
            <button type="button" onclick="closeDepositModal()" style="background:#292524; color:#d6d3d1; border:1px solid var(--border-gold); padding:12px; width:100%; border-radius:10px; margin-top:12px; cursor:pointer; font-weight:bold;">İptal</button>
        </div>
    </div>

    <div id="copyAlert" class="copy-alert">📋 IBAN Panoya Kopyalandı!</div>

    <script>
        let allProducts = [];
        let selectedProductData = null;
        let userBalance = parseFloat(localStorage.getItem('anka_balance') || '0');

        document.getElementById('userBalance').innerText = userBalance.toFixed(2) + ' TL';

        fetch('/api/products').then(res => res.json()).then(data => {
            allProducts = data.products;
            renderProducts();
        });

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
                let catName = cat === 'SMSOnay' ? '📱 SMS Onay & Numara Servisleri' : '🦅 Anka ' + cat + ' Hizmetleri';
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
            
            if (userBalance < selectedProductData.price) {
                alert('⚠️ Bakiyeniz yetersiz! Lütfen önce bakiye yükleyin.');
                openDepositModal();
                return;
            }

            document.getElementById('modalTitle').innerText = selectedProductData.name;
            document.getElementById('modalDetailsText').innerHTML = \`
                • Ürün: <b style="color:var(--gold-light);">\${selectedProductData.name}</b><br>
                • Tutar: <b style="color:var(--gold-light);">\${selectedProductData.price} TL</b><br>
                • Güncel Bakiyeniz: <b style="color:var(--gold-light);">\${userBalance.toFixed(2)} TL</b>
            \`;

            const targetContainer = document.getElementById('targetFieldContainer');
            if (selectedProductData.category === 'SMSOnay') {
                targetContainer.style.display = 'none';
                document.getElementById('customerTarget').value = 'SMS_ONAY_URUNU';
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
                body: JSON.stringify({ amount, senderName, customerContact: contact })
            });

            alert('✅ Bakiye bildiriminiz Telegram botunuza iletildi.');
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
            
            document.getElementById('formSection').style.display = 'none';
            const resultSec = document.getElementById('resultSection');
            resultSec.style.display = 'block';

            if(data.success) {
                userBalance -= selectedProductData.price;
                localStorage.setItem('anka_balance', userBalance);
                document.getElementById('userBalance').innerText = userBalance.toFixed(2) + ' TL';

                if(data.phoneNumber) {
                    resultSec.innerHTML = \`<div class="result-box">✅ İşlem Başarılı!<br><br>📞 <b>Numaranız: +\${data.phoneNumber}</b></div>\`;
                } else {
                    resultSec.innerHTML = \`<div class="result-box">✅ Satın alım onaylandı ve işleme konuldu!</div>\`;
                }
            } else {
                resultSec.innerHTML = \`<div class="result-box" style="border-color:#ef4444; color:#ef4444;">⚠️ Hata: \${data.message || 'Stok bulunamadı'}</div>\`;
            }
        }
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ANKA VIP Panel ${PORT} portunda aktif!`);
});
