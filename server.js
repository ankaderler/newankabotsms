const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

// === YAPILANDIRMA AYARLARI ===
const ONAYLASMS_API_KEY = 'SENIN_ONAYLASMS_API_KEY_BURAYA';
const TELEGRAM_BOT_TOKEN = 'SENIN_TELEGRAM_BOT_TOKEN_BURAYA';
const ADMIN_CHAT_ID = 'SENIN_TELEGRAM_CHAT_ID_BURAYA'; // Bildirimlerin geleceği ID

// Telegram Botunu Başlat
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Geçici Veritabanı (Gerçek projede MongoDB veya MySQL kullanmalısın)
let users = { 'user_1': { id: 'user_1', balance: 0 } };
let pendingPayments = {}; // { 'pay_123': { userId: 'user_1', amount: 100, status: 'pending' } }

// ==========================================
// 1. TELEGRAM BAKİYE ONAY/RED SİSTEMİ
// ==========================================

// Müşteri panelden bakiye bildirimi yaptığında çalışacak endpoint
app.post('/api/bakiye-bildir', async (req, res) => {
    const { userId, amount, senderName } = req.body;
    const paymentId = 'pay_' + Date.now(); // Benzersiz işlem ID'si

    // Bildirimi geçici olarak kaydet
    pendingPayments[paymentId] = { userId, amount, status: 'pending' };

    // Admin'e Telegram'dan butonlu mesaj gönder
    const message = `💰 *Yeni Bakiye Bildirimi*\n\n👤 Kullanıcı: ${senderName} (ID: ${userId})\n💵 Tutar: ${amount} TL\n\nLütfen işlemi onaylayın veya reddedin:`;
    
    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Onayla', callback_data: `approve_${paymentId}` },
                    { text: '❌ Reddet', callback_data: `reject_${paymentId}` }
                ]
            ]
        }
    };

    try {
        await bot.sendMessage(ADMIN_CHAT_ID, message, options);
        res.json({ success: true, message: 'Bildirim yöneticiye iletildi.' });
    } catch (error) {
        console.error('Telegram mesaj hatası:', error);
        res.status(500).json({ success: false, message: 'Bildirim gönderilemedi.' });
    }
});

// Telegram'daki Buton Tıklamalarını (Callback) Yakalama
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data; // Örn: 'approve_pay_123' VEYA 'reject_pay_123'

    const action = data.split('_')[0]; // approve veya reject
    const paymentId = data.replace(`${action}_`, '');
    const payment = pendingPayments[paymentId];

    if (!payment || payment.status !== 'pending') {
        bot.answerCallbackQuery(query.id, { text: 'Bu işlem zaten sonuçlandırılmış.', show_alert: true });
        return;
    }

    if (action === 'approve') {
        // Kullanıcının bakiyesini artır
        if(users[payment.userId]) {
            users[payment.userId].balance += payment.amount;
        }
        payment.status = 'approved';

        // Mesajı butonları kaldırarak güncelle
        const updatedText = query.message.text + `\n\n✅ *DURUM: ONAYLANDI* (Bakiye Eklendi)`;
        bot.editMessageText(updatedText, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });
        bot.answerCallbackQuery(query.id, { text: 'Bakiye başarıyla eklendi!' });

    } else if (action === 'reject') {
        payment.status = 'rejected';

        // Mesajı butonları kaldırarak güncelle
        const updatedText = query.message.text + `\n\n❌ *DURUM: REDDEDİLDİ*`;
        bot.editMessageText(updatedText, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });
        bot.answerCallbackQuery(query.id, { text: 'Bildirim reddedildi.' });
    }
});


// ==========================================
// 2. STOK/NUMARA YAKALAMA DÖNGÜSÜ (RETRY)
// ==========================================

// Bekleme fonksiyonu (Sleep)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/api/numara-al', async (req, res) => {
    const { service, country } = req.body; // Örn: service=wa, country=tr
    const maxRetries = 15; // API'ye maksimum kaç kez soracak
    const delayMs = 2500;  // Ban yememek için her sorgu arası bekleme süresi (2.5 saniye)

    let attempt = 0;
    let numberData = null;

    while (attempt < maxRetries) {
        attempt++;
        try {
            // &operator=any parametresi eklendi
            const url = `https://onaylasms.com.tr/stubs/handler_api.php?api_key=${ONAYLASMS_API_KEY}&action=getNumber&service=${service}&country=${country}&operator=any`;
            
            const response = await axios.get(url);
            const data = response.data.trim();

            if (data.startsWith('ACCESS_NUMBER')) {
                // Başarılı! Numara yakalandı. Format: ACCESS_NUMBER:ID:NUMBER
                const parts = data.split(':');
                numberData = {
                    success: true,
                    activationId: parts[1],
                    phoneNumber: parts[2]
                };
                break; // Numarayı bulduğumuz için döngüden çık
            } 
            else if (data === 'NO_NUMBERS') {
                // Stok yok, biraz bekleyip tekrar dene
                console.log(`Deneme ${attempt}/${maxRetries}: Numara yok, tekrar aranıyor...`);
                await sleep(delayMs);
            } 
            else {
                // BAD_KEY, BAD_ACTION, NO_BALANCE gibi diğer hatalar. Bunlarda tekrar denemeye gerek yok.
                return res.json({ success: false, message: `API Hatası: ${data}` });
            }

        } catch (error) {
            console.error('API İsteği Başarısız:', error.message);
            return res.json({ success: false, message: 'Sunucu bağlantı hatası.' });
        }
    }

    // Döngü bittiğinde sonuç
    if (numberData) {
        // Burada kullanıcının bakiyesinden düşme işlemlerini yapabilirsin
        res.json({ success: true, message: 'Numara başarıyla alındı!', data: numberData });
    } else {
        // 15 denemenin sonunda hala numara bulamadıysa
        res.json({ success: false, message: 'Şu anda sistemde boşta numara bulunmuyor, lütfen birazdan tekrar deneyin.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
    console.log('Telegram Botu dinliyor...');
});
