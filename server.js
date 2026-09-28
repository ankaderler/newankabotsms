const express = require('express');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = process.env.BOT_TOKEN || "8874989367:AAF9imqTVxSbBAgrfalatspzb7gBogTG1bE";
const ADMIN_ID = process.env.ADMIN_ID || "BURAYA_SENIN_TELEGRAM_USER_ID_YAZ";
const ADMIN_IBAN = "TR62 0006 2000 5000 0006 8107 73";
const ACCOUNT_HOLDER = "Resul Sakal";
const SUPPORT_USERNAME = "@SMSPATRONUM";

// OnaylaSMS API Bilgileri
const SMS_API_URL = "https://onaylasms.com.tr/stubs/handler_api.php";
const SMS_API_KEY = "osms_7778905748d37f5a5998d9581c7e74e3f0214285925c9ae4";

const bot = new Telegraf(BOT_TOKEN);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ürün Kataloğu
const products = [
  { id: 1, category: "Instagram", name: "1. Düşmeyen Takipçi (500 Adet)", price: 450, desc: "Yüksek kaliteli, düşüşe karşı korumalı özel Instagram takipçi." },
  { id: 2, category: "Instagram", name: "2. Türk Beğeni (500 Adet)", price: 200, desc: "Gerçek görünümlü Türk kullanıcılardan beğeni paketi." },
  { id: 3, category: "Instagram", name: "3. Gönderi İzlenme (10000 Adet)", price: 250, desc: "Keşfet etkili yüksek hacimli video/reels izlenmesi." },
  { id: 4, category: "Instagram", name: "4a. Ucuz Takipçi (100 Adet)", price: 120, desc: "Ekonomik başlangıç paketi." },
  { id: 5, category: "Instagram", name: "4b. Ucuz Takipçi (250 Adet)", price: 270, desc: "Ekonomik orta paket." },
  { id: 6, category: "TikTok", name: "1. TikTok Takipçi (250 Adet)", price: 250, desc: "Aktif TikTok profil desteği." },
  { id: 7, category: "TikTok", name: "2. TikTok Beğeni (2500 Adet)", price: 300, desc: "Yüksek adetli TikTok video beğeni paketi." },
  { id: 8, category: "TikTok", name: "3a. TikTok İzlenme (100 Bin Adet)", price: 10000, desc: "Devasa kitleye ulaşmak için 100K izlenme." },
  { id: 9, category: "TikTok", name: "3b. TikTok İzlenme (25 Bin Adet)", price: 320, desc: "Popülerleşme odaklı 25K izlenme paketi." },
  { id: 10, category: "TikTok", name: "4. TikTok PK Puan Savaşı", price: 100, desc: "Canlı yayınlar için 250 PK Puan desteği." },
  { id: 11, category: "Telegram", name: "Telegram Abone Paketi (750 Adet)", price: 350, desc: "Kanal veya grup için kaliteli 750 üye." },
  { id: 12, category: "SMSOnay", name: "🇺🇸 Telegram ABD Numara", price: 200, desc: "onaylasms.com.tr üzerinden ABD Telegram numarası.", service: "tg", country: "usa" },
  { id: 13, category: "SMSOnay", name: "🇹🇷 Telegram TR Numara", price: 250, desc: "onaylasms.com.tr üzerinden Türkiye Telegram numarası.", service: "tg", country: "turkey" },
  { id: 14, category: "SMSOnay", name: "🇹🇷 WhatsApp TR Numara", price: 320, desc: "onaylasms.com.tr üzerinden Türkiye WhatsApp numarası.", service: "wa", country: "turkey" },
  { id: 15, category: "SMSOnay", name: "🇵🇭 WhatsApp Filipinler Numara", price: 250, desc: "onaylasms.com.tr üzerinden Filipinler WhatsApp numarası.", service: "wa", country: "philippines" },
  { id: 16, category: "SMSOnay", name: "🇬🇧 WhatsApp İngiltere Numara", price: 250, desc: "onaylasms.com.tr üzerinden İngiltere WhatsApp numarası.", service: "wa", country: "uk" }
];

// API Fonksiyonları
async function getNumberFromAPI(service, country) {
  try {
    const url = `${SMS_API_URL}?api_key=${SMS_API_KEY}&action=getNumber&service=${service}&country=${country}`;
    const response = await axios.get(url);
    const resText = response.data;
    if (resText.startsWith('ACCESS_NUMBER')) {
      const parts = resText.split(':');
      return { success: true, activationId: parts[1], phoneNumber: parts[2] };
    }
    return { success: false, message: resText };
  } catch (err) {
    return { success: false, message: "API Bağlantı Hatası" };
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Web Paneli
app.get('/index.html', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>👑 Anka VIP Medya & Bot Paneli</title>
        <style>
            :root { --bg: #0f172a; --card: #1e293b; --accent: #38bdf8; --text: #f8fafc; --gold: #f59e0b; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
            .container { max-width: 1000px; margin: 0 auto; }
            header { text-align: center; padding: 30px 0; background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 15px; border: 1px solid #334155; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { color: var(--gold); margin: 0 0 10px 0; font-size: 2.2rem; }
            .iban-box { background: #334155; padding: 15px; border-radius: 10px; display: inline-block; margin-top: 15px; border-left: 4px solid var(--gold); text-align: left; }
            .category-title { color: var(--accent); border-bottom: 2px solid var(--accent); padding-bottom: 5px; margin-top: 40px; font-size: 1.5rem; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
            .card { background: var(--card); border-radius: 12px; padding: 20px; border: 1px solid #334155; display: flex; flex-direction: column; justify-content: space-between; }
            .price { font-size: 1.4rem; color: var(--gold); font-weight: bold; margin: 15px 0; }
            .btn { background: var(--accent); color: #0f172a; border: none; padding: 10px 15px; border-radius: 8px; font-weight: bold; cursor: pointer; text-decoration: none; text-align: center; display: block; margin-top: 10px; }
            .btn:hover { background: #0ea5e9; color: white; }
            .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); justify-content: center; align-items: center; }
            .modal-content { background: var(--card); padding: 30px; border-radius: 15px; width: 90%; max-width: 450px; border: 1px solid var(--gold); }
            input, textarea { width: 100%; padding: 10px; margin: 10px 0; background: #0f172a; border: 1px solid #475569; color: white; border-radius: 5px; box-sizing: border-box; }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <h1>👑 Anka VIP Medya & Bot Paneli</h1>
                <p>onaylasms.com.tr Altyapılı Otomatik Numara ve Sosyal Medya Hizmetleri</p>
                <div class="iban-box">
                    <strong>💳 Ödeme Yapılacak IBAN Bilgileri:</strong><br>
                    • Alıcı Adı Soyadı: <b>${ACCOUNT_HOLDER}</b><br>
                    • IBAN: <b>${ADMIN_IBAN}</b><br>
                    • Destek / Sorun Bildirimi: <a href="https://t.me/SMSPATRONUM" target="_blank" style="color: var(--accent);">${SUPPORT_USERNAME}</a>
                </div>
            </header>
            <div id="product-list"></div>
        </div>

        <div id="orderModal" class="modal">
            <div class="modal-content">
                <h3 id="modalTitle" style="color: var(--gold); margin-top:0;">Sipariş Ver</h3>
                <p>Tutar: <b id="modalPrice" style="color:var(--accent);"></b> TL</p>
                <form id="purchaseForm">
                    <input type="hidden" id="pName">
                    <input type="hidden" id="pPrice">
                    <label>Telegram Kullanıcı Adınız:</label>
                    <input type="text" id="customerContact" required placeholder="@kullaniciadi">
                    <label>Dekont / Ödeme Açıklama Notu:</label>
                    <textarea id="paymentNote" placeholder="Resul Sakal adına havale yapıldı..." required></textarea>
                    <button type="submit" class="btn" style="width:100%;">Ödeme Bildirimi Gönder</button>
                    <button type="button" onclick="closeModal()" style="background:#475569; color:white; border:none; padding:8px; width:100%; border-radius:5px; margin-top:10px; cursor:pointer;">İptal</button>
                </form>
            </div>
        </div>

        <script>
            let allProducts = [];
            fetch('/api/products').then(res => res.json()).then(data => {
                allProducts = data.products;
                renderProducts();
            });

            function renderProducts() {
                const container = document.getElementById('product-list');
                const categories = [...new Set(allProducts.map(p => p.category))];
                let html = '';
                categories.forEach(cat => {
                    let catName = cat === 'SMSOnay' ? '📱 SMS Onay & Numara Servisleri' : cat + ' Hizmetleri';
                    html += \`<div class="category-title">\${catName}</div><div class="grid">\`;
                    allProducts.filter(p => p.category === cat).forEach(p => {
                        html += \`
                            <div class="card">
                                <div>
                                    <h3>\${p.name}</h3>
                                    <p style="color:#94a3b8; font-size:0.9rem;">\${p.desc}</p>
                                </div>
                                <div>
                                    <div class="price">\${p.price} TL</div>
                                    <button class="btn" onclick="openModal('\${p.name}', \${p.price})">Satın Al</button>
                                </div>
                            </div>
                        \`;
                    });
                    html += \`</div>\`;
                });
                container.innerHTML = html;
            }

            function openModal(name, price) {
                document.getElementById('modalTitle').innerText = name;
                document.getElementById('modalPrice').innerText = price;
                document.getElementById('pName').value = name;
                document.getElementById('pPrice').value = price;
                document.getElementById('orderModal').style.display = 'flex';
            }

            function closeModal() { document.getElementById('orderModal').style.display = 'none'; }

            document.getElementById('purchaseForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const res = await fetch('/api/order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productName: document.getElementById('pName').value,
                        price: document.getElementById('pPrice').value,
                        customerContact: document.getElementById('customerContact').value,
                        paymentNote: document.getElementById('paymentNote').value
                    })
                });
                const data = await res.json();
                if(data.success) {
                    alert('Sipariş bildirimi gönderildi! Lütfen @SMSPATRONUM adresine dekontunuzu iletin.');
                    location.reload();
                }
            });
        </script>
    </body>
    </html>
  `);
});

app.get('/api/products', (req, res) => {
  res.json({ success: true, products, iban: ADMIN_IBAN, holder: ACCOUNT_HOLDER, support: SUPPORT_USERNAME });
});

app.post('/api/order', async (req, res) => {
  const { productName, price, customerContact, paymentNote } = req.body;
  try {
    const message = `🚨 *YENİ WEB SİPARİŞİ / ÖDEME BİLDİRİMİ!* 🚨\n\n` +
                    `📦 *Ürün:* ${productName}\n` +
                    `💰 *Tutar:* ${price} TL\n` +
                    `👤 *Müşteri:* ${customerContact}\n` +
                    `📝 *Not:* ${paymentNote}\n\n` +
                    `💳 Alıcı: ${ACCOUNT_HOLDER} - ${ADMIN_IBAN}`;

    if (ADMIN_ID && ADMIN_ID !== "BURAYA_SENIN_TELEGRAM_USER_ID_YAZ") {
      await bot.telegram.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: true });
  }
});

// TELEGRAM BOT
bot.start((ctx) => {
  ctx.reply(
    `👑 *Anka VIP Medya & Bot Paneline Hoş Geldiniz!*\n\n` +
    `💳 *Ödeme Bilgilerimiz:*\n` +
    `• Alıcı Adı Soyadı: *${ACCOUNT_HOLDER}*\n` +
    `• IBAN: \`${ADMIN_IBAN}\`\n\n` +
    `Lütfen işlem yapmak istediğiniz kategoriyi seçiniz:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📸 Instagram Hizmetleri', 'menu_Instagram')],
        [Markup.button.callback('🎵 TikTok Hizmetleri', 'menu_TikTok')],
        [Markup.button.callback('📢 Telegram Hizmetleri', 'menu_Telegram')],
        [Markup.button.callback('📱 SMS Onay & Numara Servisleri', 'menu_SMSOnay')],
        [Markup.button.url('🌐 Web Paneline Git', 'https://' + (process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL.replace('https://', '') : 'localhost:3000'))],
        [Markup.button.url('👤 Sorun Yaşarsanız Admine Bağlan (@SMSPATRONUM)', 'https://t.me/SMSPATRONUM')]
      ])
    }
  );
});

bot.action('menu_Instagram', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.reply(
    `📸 *Instagram Hizmetleri*:\n💳 IBAN: \`${ADMIN_IBAN}\` (${ACCOUNT_HOLDER})\n\nPaket seçin:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('1️⃣ Düşmeyen Takipçi (500 Adet) - 450 TL', 'buy_1')],
        [Markup.button.callback('2️⃣ Türk Beğeni (500 Adet) - 200 TL', 'buy_2')],
        [Markup.button.callback('3️⃣ Gönderi İzlenme (10K) - 250 TL', 'buy_3')],
        [Markup.button.callback('4️⃣ Ucuz Takipçi (100 Adet: 120 TL / 250 Adet: 270 TL)', 'buy_4_options')],
        [Markup.button.callback('🔙 Ana Menüye Dön', 'main_menu')]
      ])
    }
  );
});

bot.action('menu_TikTok', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.reply(
    `🎵 *TikTok Hizmetleri*:\n💳 IBAN: \`${ADMIN_IBAN}\` (${ACCOUNT_HOLDER})\n\nPaket seçin:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('1️⃣ TikTok Takipçi (250 Adet) - 250 TL', 'buy_6')],
        [Markup.button.callback('2️⃣ TikTok Beğeni (2500 Adet) - 300 TL', 'buy_7')],
        [Markup.button.callback('3️⃣ TikTok İzlenme (100K: 10000 TL / 25K: 320 TL)', 'buy_8_options')],
        [Markup.button.callback('4️⃣ PK Puan Savaşı (250 Adet) - 100 TL', 'buy_10')],
        [Markup.button.callback('🔙 Ana Menüye Dön', 'main_menu')]
      ])
    }
  );
});

bot.action('menu_Telegram', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.reply(
    `📢 *Telegram Hizmetleri*:\n💳 IBAN: \`${ADMIN_IBAN}\` (${ACCOUNT_HOLDER})\n\nSeçenekler:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔹 750 Abone - 350 TL', 'buy_11')],
        [Markup.button.callback('🔙 Ana Menüye Dön', 'main_menu')]
      ])
    }
  );
});

bot.action('menu_SMSOnay', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.reply(
    `📱 *SMS Onay & Numara Servisleri*:\n` +
    `Sistem *onaylasms.com.tr* API altyapısıyla çalışır.\n` +
    `💳 IBAN: \`${ADMIN_IBAN}\` (${ACCOUNT_HOLDER})\n\n` +
    `Ülke ve Platform Seçiniz:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🇺🇸 Telegram ABD Numara (200 TL)', 'sms_usa_tg')],
        [Markup.button.callback('🇹🇷 Telegram TR Numara (250 TL)', 'sms_turkey_tg')],
        [Markup.button.callback('🇹🇷 WhatsApp TR Numara (320 TL)', 'sms_turkey_wa')],
        [Markup.button.callback('🇵🇭 WhatsApp Filipinler (250 TL)', 'sms_philippines_wa')],
        [Markup.button.callback('🇬🇧 WhatsApp İngiltere (250 TL)', 'sms_uk_wa')],
        [Markup.button.callback('🔙 Ana Menüye Dön', 'main_menu')]
      ])
    }
  );
});

['buy_1', 'buy_2', 'buy_3', 'buy_4_options', 'buy_6', 'buy_7', 'buy_8_options', 'buy_10', 'buy_11'].forEach(action => {
  bot.action(action, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.reply(
      `🛒 *Sipariş Bilgisi*\n\n` +
      `💳 Ödemeyi yapacağınız IBAN:\n` +
      `• Alıcı: *${ACCOUNT_HOLDER}*\n` +
      `• IBAN: \`${ADMIN_IBAN}\`\n\n` +
      `⚠️ Ödemeyi yaptıktan sonra dekontunuzla birlikte lütfen **@SMSPATRONUM** adresine yazınız.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('👤 Adminden Teslim Al / Dekont Gönder', 'https://t.me/SMSPATRONUM')],
          [Markup.button.callback('🔙 Ana Menü', 'main_menu')]
        ])
      }
    );
  });
});

const smsRoutes = [
  { action: 'sms_usa_tg', service: 'tg', country: 'usa', name: 'Telegram ABD', price: 200 },
  { action: 'sms_turkey_tg', service: 'tg', country: 'turkey', name: 'Telegram TR', price: 250 },
  { action: 'sms_turkey_wa', service: 'wa', country: 'turkey', name: 'WhatsApp TR', price: 320 },
  { action: 'sms_philippines_wa', service: 'wa', country: 'philippines', name: 'WhatsApp Filipinler', price: 250 },
  { action: 'sms_uk_wa', service: 'wa', country: 'uk', name: 'WhatsApp İngiltere', price: 250 }
];

smsRoutes.forEach(item => {
  bot.action(item.action, async (ctx) => {
    await ctx.answerCbQuery();
    const apiResult = await getNumberFromAPI(item.service, item.country);
    
    if (!apiResult.success) {
      return ctx.reply(
        `❌ Şuan bu ülkede stok bulunamadı veya API yanıtı: ${apiResult.message}\nLütfen birazdan tekrar deneyin.`,
        Markup.inlineKeyboard([[Markup.button.callback('🔙 Ana Menü', 'main_menu')]])
      );
    }

    const { phoneNumber } = apiResult;

    ctx.reply(
      `📱 *${item.name} Numaranız Başarıyla Çekildi!*\n\n` +
      `📞 Numara: \`+${phoneNumber}\`\n` +
      `💰 Tutar: *${item.price} TL*\n` +
      `💳 Alıcı: *${ACCOUNT_HOLDER}* (\`${ADMIN_IBAN}\`)\n\n` +
      `⚠️ Lütfen ödemeyi yukarıdaki IBAN'a yapıp dekontu @SMSPATRONUM adresine iletin.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('👤 Ödemeyi Yaptım, Dekont Gönder', 'https://t.me/SMSPATRONUM')],
          [Markup.button.callback('🔄 Kod Gelmedi / Numara Değiştir', item.action)],
          [Markup.button.callback('🔙 Ana Menü', 'main_menu')]
        ])
      }
    );
  });
});

bot.action('main_menu', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.reply(
    `👑 *Anka VIP Ana Menü:*`,
    Markup.inlineKeyboard([
      [Markup.button.callback('📸 Instagram Hizmetleri', 'menu_Instagram')],
      [Markup.button.callback('🎵 TikTok Hizmetleri', 'menu_TikTok')],
      [Markup.button.callback('📢 Telegram Hizmetleri', 'menu_Telegram')],
      [Markup.button.callback('📱 SMS Onay & Numara Servisleri', 'menu_SMSOnay')],
      [Markup.button.url('👤 Sorun Yaşarsanız Admine Bağlan', 'https://t.me/SMSPATRONUM')]
    ])
  );
});

bot.launch().then(() => {
  console.log("Telegram Bot aktif!");
});

app.listen(PORT, () => {
  console.log(`Panel ${PORT} portunda çalışıyor...`);
});
