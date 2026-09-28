const express = require('express');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');

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

// Genişletilmiş VIP Ürün Listesi (120 TL ve üzeri, kar marjlı ve bol seçenekli)
const products = [
  { id: 1, category: "Özel Hizmet", name: "🤖 Kendi Telegram Botunu Oluşturma Hizmeti (Kılavuzlu)", price: 500, desc: "Sıfırdan size özel, butonlu, yönetim panelli ve tamamen otomatik çalışan Telegram botu kurulumu ve detaylı kılavuzu." },
  { id: 2, category: "Instagram", name: "Instagram Rastgele (Random) Hesap (10 Adet)", price: 120, desc: "Onaylı/onaysız karışık yüksek kaliteli random Instagram hesapları." },
  { id: 3, category: "Instagram", name: "Instagram Türk Gerçek Görünümlü Takipçi (1000 Adet)", price: 150, desc: "Profilinizi öne çıkaracak kaliteli Türk takipçi gönderimi." },
  { id: 4, category: "Instagram", name: "Instagram Gönderi Beğeni Paketi (1000 Adet)", price: 120, desc: "Paylaşımlarınızın etkileşimini artıran hızlı beğeni." },
  { id: 5, category: "Instagram", name: "Instagram Hikaye İzlenme Paketi (5000 Adet)", price: 130, desc: "Hikayeleriniz için yüksek hacimli görüntülenme." },
  { id: 6, category: "TikTok", name: "TikTok Türk Takipçi (1000 Adet)", price: 180, desc: "Aktif ve etkileşimli TikTok takipçi servisi." },
  { id: 7, category: "TikTok", name: "TikTok Video İzlenme + Beğeni Kombin (2000 Adet)", price: 140, desc: "Keşfet odaklı özel TikTok etkileşim paketi." },
  { id: 8, category: "Telegram", name: "Telegram Kanal / Grup Abonesi (1000 Adet)", price: 160, desc: "Kanalınızın güven vermesini sağlayacak kaliteli üye." },
  { id: 9, category: "Telegram", name: "Telegram Bot Kullanıcı Etkileşim Testi", price: 130, desc: "Bot içi test ve aktivite artırıcı özel servis." },
  { id: 10, category: "Genel Hesap", name: "Gmail Random / Eskitilmiş Hesap (5 Adet)", price: 150, desc: "Onaylı, iş veya kişisel kullanım için hazır mail adresleri." },
  { id: 11, category: "Genel Hesap", name: "Onaylı Dijital Platform / Numara Servisleri (10 Adet)", price: 200, desc: "Çeşitli platformlar için kullanılabilir onaylı dijital hesaplar." }
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
                    `⚠️ Müşteri ödemeyi yaptığını bildirdi. Lütfen IBAN kontrolü sağlayın!`;

    if (ADMIN_ID && ADMIN_ID !== "BURAYA_SENIN_TELEGRAM_USER_ID_YAZ") {
      await bot.telegram.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
    }

    res.json({ success: true, message: "Sipariş başarıyla alındı." });
  } catch (err) {
    console.error(err);
    res.json({ success: true, message: "Siparişiniz alındı." });
  }
});

// TELEGRAM BOT /start ve İnteraktif Menü Komutları
bot.start((ctx) => {
  ctx.reply(
    `👑 *Anka VIP Medya & Bot Paneline Hoş Geldiniz!*\n\n` +
    `En ucuz ve kaliteli sosyal medya hizmetleri, random hesaplar ve özel bot çözümleri burada!\n\n` +
    `💳 *Ödeme Bilgilerimiz:*\n` +
    `• Alıcı: ${ACCOUNT_HOLDER}\n` +
    `• IBAN: \`${ADMIN_IBAN}\`\n\n` +
    `🛒 Sipariş vermek, ürünleri incelemek veya ödeme bildirimi yapmak için aşağıdaki butonları kullanabilir ya da web sitemizi ziyaret edebilirsiniz.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📦 Ürünleri ve Fiyatları Gör', 'list_products')],
        [Markup.button.callback('📞 Destek / Ürün Teslimi Al', 'get_support')],
        [Markup.button.url('🌐 Web Paneline Git', 'https://' + (process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL.replace('https://', '') : 'localhost:3000'))]
      ])
    }
  );
});

bot.action('list_products', async (ctx) => {
  await ctx.answerCbQuery();
  let text = "📋 *Anka VIP Güncel Ürün Listemiz (120 TL+)*:\n\n";
  products.forEach(p => {
    text += `🔹 *${p.name}*\n💰 Fiyat: *${p.price} TL*\n📝 ${p.desc}\n\n`;
  });
  text += `👉 Satın almak için ödemeyi IBAN'a yapıp dekont ile birlikte ${SUPPORT_USERNAME} adresine yazınız.`;
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

bot.action('get_support', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(`📞 Destek almak ve ödeme dekontunu iletip ürününüzü/botunuzu anında teslim almak için yetkili iletişim adresimiz:\n\n👉 *${SUPPORT_USERNAME}*\n\nLütfen dekontunuzu ve aldığınız ürün adını mesajla gönderin!`, { parse_mode: 'Markdown' });
});

bot.launch().then(() => {
  console.log("Telegram Bot aktif, butonlar ve ürünler yüklendi!");
}).catch(err => {
  console.log("Bot başlatılırken hata oluştu:", err.message);
});

app.listen(PORT, () => {
  console.log(`Anka VIP Panel ${PORT} portunda başarıyla çalışıyor...`);
});
