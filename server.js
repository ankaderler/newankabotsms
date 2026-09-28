const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
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
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ANKA SERVİS 4K Ultra HD Panel ${PORT} portunda aktif!`);
});
