const express = require('express');
const path = require('path');
const { Telegraf } = require('telegraf');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = process.env.BOT_TOKEN || "8874989367:AAF9imqTVxSbBAgrfalatspzb7gBogTG1bE";
const ADMIN_ID = process.env.ADMIN_ID || "BURAYA_SENIN_TELEGRAM_USER_ID_YAZ";
const ADMIN_IBAN = "TR62 0006 2000 5000 0006 8107 73";
const ACCOUNT_HOLDER = "Resul Sakal";
const SUPPORT_USERNAME = "@SMSPATRONUM";

const bot = new Telegraf(BOT_TOKEN);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const products = [
  { id: 1, category: "Özel Hizmet", name: "Kendi Telegram Botunu Oluşturma Hizmeti", price: 500, desc: "Sıfırdan size özel, butonlu, yönetim panelli ve tamamen otomatik çalışan Telegram botu kurulumu ve teslimatı." },
  { id: 2, category: "Instagram", name: "Instagram Rastgele (Random) Hesap (10 Adet)", price: 120, desc: "Onaylı/onaysız karışık random Instagram hesapları." },
  { id: 3, category: "Instagram", name: "Instagram Türk Takipçi (1000 Adet)", price: 150, desc: "Kaliteli Türk gerçek görünümlü takipçi gönderimi." },
  { id: 4, category: "Instagram", name: "Instagram Gönderi Beğeni (1000 Adet)", price: 120, desc: "Paylaşımlarınız için hızlı Türk beğeni paketi." },
  { id: 5, category: "Instagram", name: "Instagram Hikaye İzlenme (5000 Adet)", price: 130, desc: "Hikayelerinizin etkileşimini artırın." },
  { id: 6, category: "TikTok", name: "TikTok Türk Takipçi (1000 Adet)", price: 180, desc: "Aktif ve kalıcı TikTok takipçi gönderimi." },
  { id: 7, category: "TikTok", name: "TikTok Video İzlenme + Beğeni Paketi", price: 140, desc: "Keşfet etkisi yaratan yüksek izlenme ve beğeni." },
  { id: 8, category: "Telegram", name: "Telegram Kanal Üyesi / Abone (1000 Adet)", price: 160, desc: "Kanalınız veya grubunuz için yüksek kaliteli abone." },
  { id: 9, category: "Telegram", name: "Telegram Bot Kullanıcı Test Gönderimi", price: 130, desc: "Bot içi etkileşim artırıcı özel servis." },
  { id: 10, category: "Gmail", name: "Gmail Random / Eskitilmiş Hesap (5 Adet)", price: 150, desc: "Onaylı, kullanılmaya hazır kaliteli mail adresleri." }
];

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/products', (req, res) => {
  res.json({ 
    success: true, 
    products, 
    iban: ADMIN_IBAN, 
    holder: ACCOUNT_HOLDER,
    support: SUPPORT_USERNAME 
  });
});

app.post('/api/order', async (req, res) => {
  const { productName, price, customerContact } = req.body;
  
  try {
    const message = `🚨 **YENİ ÖDEME / SİPARİŞ BİLDİRİMİ!**\n\n` +
                    `📦 **Ürün:** ${productName}\n` +
                    `💰 **Tutar:** ${price} TL\n` +
                    `👤 **Müşteri İletişim:** ${customerContact || 'Belirtilmedi'}\n\n` +
                    `⚠️ Müşteri ödemeyi yaptığını bildirdi, lütfen IBAN kontrolü sağlayın!`;

    if (ADMIN_ID && ADMIN_ID !== "BURAYA_SENIN_TELEGRAM_USER_ID_YAZ") {
      await bot.telegram.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
    }

    res.json({ success: true, message: "Sipariş başarıyla alındı." });
  } catch (err) {
    console.error(err);
    res.json({ success: true, message: "Siparişiniz alındı." });
  }
});

bot.start((ctx) => {
  ctx.reply(`👑 Anka VIP Medya & Bot Paneline Hoş Geldiniz!\n\nSipariş vermek ve destek almak için:\nDestek: ${SUPPORT_USERNAME}\nWeb Sitemizi ziyaret edebilirsiniz.`);
});

bot.launch().then(() => {
  console.log("Telegram Bot aktif ve çalışıyor!");
}).catch(err => {
  console.log("Bot başlatılırken hata oluştu:", err.message);
});

app.listen(PORT, () => {
  console.log(`Anka VIP Panel ${PORT} portunda başarıyla çalışıyor...`);
});
