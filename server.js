const express = require('express');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// Girdiğin Admin ID buraya tanımlandı
const BOT_TOKEN = process.env.BOT_TOKEN || "8874989367:AAF9imqTVxSbBAgrfalatspzb7gBogTG1bE";
const ADMIN_ID = process.env.ADMIN_ID || "8964930489"; 
const ADMIN_IBAN = "TR62 0006 2000 5000 0006 8107 73";
const ACCOUNT_HOLDER = "Resul Sakal";

const SMS_API_URL = "https://onaylasms.com.tr/stubs/handler_api.php";
const SMS_API_KEY = "osms_7778905748d37f5a5998d9581c7e74e3f0214285925c9ae4";

const bot = new Telegraf(BOT_TOKEN);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const products = [
  { id: 1, category: "Instagram", name: "1. Düşmeyen Takipçi (500 Adet)", price: 450, desc: "Yüksek kaliteli Instagram takipçi paketi." },
  { id: 2, category: "Instagram", name: "2. Türk Beğeni (500 Adet)", price: 200, desc: "Türk kullanıcılardan beğeni paketi." },
  { id: 3, category: "Instagram", name: "3. Gönderi İzlenme (10000 Adet)", price: 250, desc: "Keşfet etkili reels izlenmesi." },
  { id: 6, category: "TikTok", name: "1. TikTok Takipçi (250 Adet)", price: 250, desc: "Aktif TikTok profil desteği." },
  { id: 7, category: "TikTok", name: "2. TikTok Beğeni (2500 Adet)", price: 300, desc: "TikTok video beğeni paketi." },
  { id: 11, category: "Telegram", name: "Telegram Abone Paketi (750 Adet)", price: 350, desc: "Kanal veya grup için kaliteli üye." },
  { id: 12, category: "SMSOnay", name: "🇺🇸 Telegram ABD Numara", price: 200, desc: "Anlık ABD Telegram numarası.", service: "tg", country: "usa" },
  { id: 13, category: "SMSOnay", name: "🇹🇷 Telegram TR Numara", price: 250, desc: "Türkiye Telegram numarası.", service: "tg", country: "turkey" },
  { id: 14, category: "SMSOnay", name: "🇬🇧 WhatsApp İngiltere Numara", price: 250, desc: "İngiltere WhatsApp numarası.", service: "wa", country: "uk" }
];

async function getNumberFromAPI(service, country) {
  try {
    const url = `${SMS_API_URL}?api_key=${SMS_API_KEY}&action=getNumber&service=${service}&country=${country}`;
    const response = await axios.get(url, { timeout: 10000 });
    if (response.data && response.data.startsWith('ACCESS_NUMBER')) {
      const parts = response.data.split(':');
      return { success: true, phoneNumber: parts[2], activationId: parts[1] };
    }
    return { success: false, message: response.data };
  } catch (err) {
    return { success: false, message: "API Bağlantı Hatası" };
  }
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/api/products', (req, res) => res.json({ success: true, products }));

app.post('/api/order', async (req, res) => {
  const { product, target, customerContact } = req.body;
  try {
    let assignedNumber = null;
    if (product.category === 'SMSOnay') {
      const apiRes = await getNumberFromAPI(product.service, product.country);
      if (apiRes.success) {
        assignedNumber = apiRes.phoneNumber;
      } else {
        return res.json({ success: false, message: "Şu an bu ülkede SMS stoğu bulunamadı (NO_NUMBERS). Lütfen daha sonra tekrar deneyin." });
      }
    }

    const message = `🔥 *YENİ VIP ÖDEME BİLDİRİMİ!* 🔥\n\n` +
                    `🦅 *Ürün:* ${product.name}\n` +
                    `💰 *Tutar:* ${product.price} TL\n` +
                    `🎯 *Hedef / Kullanıcı:* \`${target}\`\n` +
                    `👤 *Müşteri Telegram:* ${customerContact}\n` +
                    (assignedNumber ? `📞 *Sistemden Çekilen Numara:* +${assignedNumber}\n` : '') +
                    `\n💳 Alıcı: ${ACCOUNT_HOLDER} (${ADMIN_IBAN})`;

    if (ADMIN_ID) {
      await bot.telegram.sendMessage(ADMIN_ID, message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Ödemeyi Onayla & İşleme Al', `approve_order`),
            Markup.button.callback('❌ Reddet', `reject_order`)
          ]
        ])
      });
    }

    res.json({ success: true, phoneNumber: assignedNumber });
  } catch (err) {
    res.json({ success: false, message: "Bildirim gönderilirken bir hata oluştu." });
  }
});

bot.action('approve_order', async (ctx) => {
  await ctx.answerCbQuery("Sipariş Onaylandı!");
  await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n✅ *ÖDEME ONAYLANDI VE SİSTEME AKTARILDI!*", { parse_mode: 'Markdown' });
});

bot.action('reject_order', async (ctx) => {
  await ctx.answerCbQuery("Sipariş Reddedildi!");
  await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n❌ *ÖDEME REDDEDİLDİ / İPTAL EDİLDİ*", { parse_mode: 'Markdown' });
});

bot.start((ctx) => {
  ctx.reply(`🦅 *Anka VIP Yönetim Paneli Botu Aktif.*\n\nÖdeme bildirimleriniz ve onay butonlarınız bu ekrana düşecektir.`);
});

app.listen(PORT, () => console.log(`Anka VIP Panel ${PORT} portunda çalışıyor.`));
bot.launch().catch(e => console.log("Bot başlatma hatası:", e));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
