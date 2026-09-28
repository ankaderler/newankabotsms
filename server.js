const express = require('express');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = process.env.BOT_TOKEN || "8874989367:AAF9imqTVxSbBAgrfalatspzb7gBogTG1bE";
const ADMIN_ID = process.env.ADMIN_ID || "BURAYA_SENIN_TELEGRAM_USER_ID_YAZ";
const ADMIN_IBAN = "TR62 0006 2000 5000 0006 8107 73";
const ACCOUNT_HOLDER = "Resul Sakal";
const SUPPORT_USERNAME = "@SMSPATRONUM";

// OnaylaSMS API Bilgileri
const SMS_API_URL = "https://onaylasms.com.tr/stubs/handler_api.php";
const SMS_API_KEY = "osms_7778905748d37f5a5998d9581c7e74e3f0214285925c9ae4";

const agent = new https.Agent({
  keepAlive: true,
  timeout: 60000
});

const bot = new Telegraf(BOT_TOKEN, {
  telegram: {
    agent: agent,
    apiRoot: 'https://api.telegram.org'
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ürün Kataloğu (SMS Onay ürünleri service ve country parametreleri ile işaretlendi)
const products = [
  // Instagram Hizmetleri
  { id: 1, category: "Instagram", name: "1. Düşmeyen Takipçi (500 Adet)", price: 450, desc: "Yüksek kaliteli, düşüşe karşı korumalı özel Instagram takipçi." },
  { id: 2, category: "Instagram", name: "2. Türk Beğeni (500 Adet)", price: 200, desc: "Gerçek görünümlü Türk kullanıcılardan beğeni paketi." },
  { id: 3, category: "Instagram", name: "3. Gönderi İzlenme (10000 Adet)", price: 250, desc: "Keşfet etkili yüksek hacimli video/reels izlenmesi." },
  { id: 4, category: "Instagram", name: "4a. Ucuz Takipçi (100 Adet)", price: 120, desc: "Ekonomik başlangıç paketi." },
  { id: 5, category: "Instagram", name: "4b. Ucuz Takipçi (250 Adet)", price: 270, desc: "Ekonomik orta paket." },

  // TikTok Hizmetleri
  { id: 6, category: "TikTok", name: "1. TikTok Takipçi (250 Adet)", price: 250, desc: "Aktif TikTok profil desteği." },
  { id: 7, category: "TikTok", name: "2. TikTok Beğeni (2500 Adet)", price: 300, desc: "Yüksek adetli TikTok video beğeni paketi." },
  { id: 8, category: "TikTok", name: "3a. TikTok İzlenme (100 Bin Adet)", price: 10000, desc: "Devasa kitleye ulaşmak için 100K izlenme." },
  { id: 9, category: "TikTok", name: "3b. TikTok İzlenme (25 Bin Adet)", price: 320, desc: "Popülerleşme odaklı 25K izlenme paketi." },
  { id: 10, category: "TikTok", name: "4. TikTok PK Puan Savaşı (250 Adet)", price: 100, desc: "Canlı yayınlar için 250 PK Puan desteği." },

  // Telegram Hizmetleri
  { id: 11, category: "Telegram", name: "Telegram Abone Paketi (750 Adet)", price: 350, desc: "Kanal veya grup için kaliteli 750 üye." },

  // SMS Onay / Numara Servisleri
  { id: 12, category: "SMSOnay", name: "🇺🇸 Telegram ABD Numara", price: 200, desc: "Anlık API üzerinden çekilen ABD Telegram numarası.", service: "tg", country: "usa" },
  { id: 13, category: "SMSOnay", name: "🇹🇷 Telegram TR Numara", price: 250, desc: "onaylasms.com.tr üzerinden Türkiye Telegram numarası.", service: "tg", country: "turkey" },
  { id: 14, category: "SMSOnay", name: "🇹🇷 WhatsApp TR Numara", price: 320, desc: "onaylasms.com.tr üzerinden Türkiye WhatsApp numarası.", service: "wa", country: "turkey" },
  { id: 15, category: "SMSOnay", name: "🇵🇭 WhatsApp Filipinler Numara", price: 250, desc: "onaylasms.com.tr üzerinden Filipinler WhatsApp numarası.", service: "wa", country: "philippines" },
  { id: 16, category: "SMSOnay", name: "🇬🇧 WhatsApp İngiltere Numara", price: 250, desc: "onaylasms.com.tr üzerinden İngiltere WhatsApp numarası.", service: "wa", country: "uk" }
];

async function getNumberFromAPI(service, country) {
  try {
    const url = `${SMS_API_URL}?api_key=${SMS_API_KEY}&action=getNumber&service=${service}&country=${country}`;
    const response = await axios.get(url, { timeout: 10000 });
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

// Yepyeni, Kusursuz Mavi VIP Web Paneli Arayüzü
app.get('/index.html', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🦅 Anka VIP Medya & SMS Paneli</title>
        <style>
            :root { 
                --bg: #030712; 
                --card: #0b1329; 
                --accent: #2563eb; 
                --accent-hover: #1d4ed8; 
                --blue-glow: #38bdf8; 
                --text: #f0f9ff; 
                --border: #1e3a8a; 
            }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
            .container { max-width: 1050px; margin: 0 auto; }
            header { text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #0f172a, #1e3a8a); border-radius: 18px; border: 1px solid var(--border); margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); position: relative; overflow: hidden; }
            header::before { content: "🦅"; font-size: 5rem; position: absolute; right: 25px; top: 15px; opacity: 0.08; }
            h1 { color: var(--blue-glow); margin: 0 0 10px 0; font-size: 2.4rem; letter-spacing: 1px; }
            p { color: #94a3b8; margin: 0; }
            .iban-box { background: #0f172a; padding: 20px 25px; border-radius: 14px; display: inline-block; margin-top: 22px; border-left: 5px solid var(--blue-glow); text-align: left; border: 1px solid var(--border); box-shadow: 0 4px 15px rgba(0,0,0,0.5); max-width: 550px; width: 100%; box-sizing: border-box; }
            .iban-box b { color: var(--blue-glow); }
            .category-title { color: var(--blue-glow); border-bottom: 2px solid var(--border); padding-bottom: 8px; margin-top: 45px; font-size: 1.6rem; display: flex; align-items: center; gap: 10px; font-weight: 600; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 20px; margin-top: 20px; }
            .card { background: var(--card); border-radius: 14px; padding: 22px; border: 1px solid var(--border); display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s ease, border-color 0.2s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
            .card:hover { transform: translateY(-3px); border-color: var(--blue-glow); }
            .card h3 { margin-top: 0; color: #ffffff; font-size: 1.2rem; }
            .price { font-size: 1.6rem; color: var(--blue-glow); font-weight: bold; margin: 15px 0; }
            .btn { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; border: none; padding: 12px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; text-decoration: none; text-align: center; display: block; width: 100%; box-sizing: border-box; transition: opacity 0.2s; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); }
            .btn:hover { opacity: 0.9; }
            .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(3,7,18,0.88); justify-content: center; align-items: center; z-index: 1000; }
            .modal-content { background: var(--card); padding: 30px; border-radius: 16px; width: 90%; max-width: 480px; border: 1px solid var(--blue-glow); box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
            input { width: 100%; padding: 12px; margin: 8px 0 15px 0; background: #030712; border: 1px solid #1e3a8a; color: white; border-radius: 8px; box-sizing: border-box; }
            input:focus { border-color: var(--blue-glow); outline: none; }
            .support-link { color: var(--blue-glow); text-decoration: none; font-weight: bold; }
            .support-link:hover { text-decoration: underline; }
            .payment-info-box { background: #030712; padding: 15px; border-radius: 10px; border: 1px dashed var(--blue-glow); margin-bottom: 15px; font-size: 0.95rem; color: #cbd5e1; line-height: 1.6; }
            .result-box { background: #030712; padding: 15px; border-radius: 10px; border: 1px solid #10b981; color: #34d399; margin-top: 15px; text-align: center; font-size: 1.1rem; word-break: break-all; }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <h1>🦅 Anka VIP Medya & SMS Paneli</h1>
                <p>Güvenli Otomatik Teslimat ve Sosyal Medya Hizmetleri</p>
                <div class="iban-box">
                    <strong>💳 Ödeme Yapılacak Kişisel IBAN Adresi:</strong><br>
                    • Alıcı Adı Soyadı: <b>Resul Sakal</b><br>
                    • IBAN: <b>TR62 0006 2000 5000 0006 8107 73</b><br>
                    • Açıklama / Destek: <a href="https://t.me/SMSPATRONUM" target="_blank" class="support-link">@SMSPATRONUM</a>
                </div>
            </header>
            <div id="product-list"></div>
        </div>

        <div id="orderModal" class="modal">
            <div class="modal-content">
                <h3 id="modalTitle" style="color: var(--blue-glow); margin-top:0;">Ödeme ve Sipariş Ekranı</h3>
                <div class="payment-info-box" id="modalDetailsText">
                    <!-- Dinamik Ödeme Detayları -->
                </div>
                <div id="formSection">
                    <label><b>Telegram Kullanıcı Adınız (@kullaniciadi):</b></label>
                    <input type="text" id="customerContact" placeholder="@kullaniciadi" required>
                    <button type="button" class="btn" id="payButton" onclick="submitPayment()">Ödemeyi Yaptım</button>
                </div>
                <div id="resultSection" style="display:none;"></div>
                <button type="button" onclick="closeModal()" style="background:#1e3a8a; color:#cbd5e1; border:none; padding:10px; width:100%; border-radius:8px; margin-top:15px; cursor:pointer;">Kapat / Ana Menü</button>
            </div>
        </div>

        <script>
            let allProducts = [];
            let selectedProductData = null;

            fetch('/api/products').then(res => res.json()).then(data => {
                allProducts = data.products;
                renderProducts();
            });

            function renderProducts() {
                const container = document.getElementById('product-list');
                const categories = [...new Set(allProducts.map(p => p.category))];
                let html = '';
                categories.forEach(cat => {
                    let catName = cat === 'SMSOnay' ? '📱 SMS Onay & Numara Servisleri' : '🦅 ' + cat + ' Hizmetleri';
                    html += \`<div class="category-title">\${catName}</div><div class="grid">\`;
                    allProducts.filter(p => p.category === cat).forEach(p => {
                        let pJson = encodeURIComponent(JSON.stringify(p));
                        html += \`
                            <div class="card">
                                <div>
                                    <h3>\${p.name}</h3>
                                    <p style="color:#94a3b8; font-size:0.9rem;">\${p.desc}</p>
                                </div>
                                <div>
                                    <div class="price">\${p.price} TL</div>
                                    <button class="btn" onclick="openModal('\${pJson}')">Satın Al</button>
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
                document.getElementById('modalTitle0').innerText = selectedProductData.name;
                
                let detailsHTML = \`
                    • Ürün / Hizmet: <b style="color:var(--blue-glow);">\${selectedProductData.name}</b><br>
                    • Ödenecek Tutar: <b style="color:var(--blue-glow);">\${selectedProductData.price} TL</b><br>
                    • Alıcı Adı Soyadı: <b>Resul Sakal</b><br>
                    • IBAN: <b style="color:var(--blue-glow);">TR62 0006 2000 5000 0006 8107 73</b><br><br>
                    <span style="font-size:0.85rem; color:#94a3b8;">⚠️ Lütfen yukarıdaki tutarı IBAN'a gönderdikten sonra aşağıya kullanıcı adınızı yazıp <b>"Ödemeyi Yaptım"</b> butonuna basınız.</span>
                \`;
                document.getElementById('modalDetailsText').innerHTML = detailsHTML;
                document.getElementById('customerContact').value = '';
                document.getElementById('formSection').style.display = 'block';
                document.getElementById('resultSection').style.display = 'none';
                document.getElementById('orderModal').style.display = 'flex';
            }

            function closeModal() { 
                document.getElementById('orderModal').style.display = 'none'; 
                location.reload();
            }

            async function submitPayment() {
                const customerContact = document.getElementById('customerContact').value.trim();
                if(!customerContact) {
                    alert('Lütfen Telegram kullanıcı adınızı giriniz!');
                    return;
                }

                const payBtn = document.getElementById('payButton');
                payBtn.innerText = "İşleniyor, Lütfen Bekleyin...";
                payBtn.disabled = true;

                const res = await fetch('/api/order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        product: selectedProductData,
                        customerContact: customerContact
                    })
                });
                const data = await res.json();
                
                document.getElementById('formSection').style.display = 'none';
                const resultSec = document.getElementById('resultSection');
                resultSec.style.display = 'block';

                if(data.success) {
                    if(data.phoneNumber) {
                        resultSec.innerHTML = \`
                            <div class="result-box">
                                ✅ Ödeme Bildirimi Alındı ve Numaranız Çekildi!<br><br>
                                📞 <b>Numara: +\${data.phoneNumber}</b><br>
                                <span style="font-size:0.85rem; color:#cbd5e1;">Lütfen bu numarayı ilgili uygulamada kullanın.</span>
                            </div>
                        \`;
                    } else {
                        resultSec.innerHTML = \`
                            <div class="result-box" style="border-color:#38bdf8; color:#38bdf8;">
                                ✅ Ödeme Bildiriminiz Başarıyla Gönderildi!<br><br>
                                Admin (@SMSPATRONUM) ödemenizi kontrol edip hizmetinizi en kısa sürede teslim edecektir.
                            </div>
                        \`;
                    }
                } else {
                    resultSec.innerHTML = \`
                        <div class="result-box" style="border-color:#ef4444; color:#ef4444;">
                            ⚠️ Bildirim iletildi ancak SMS API stok hatası alındı: \${data.message || 'Stok bulunamadı'}<br>
                            Lütfen @SMSPATRONUM ile iletişime geçin.
                        </div>
                    \`;
                }
            }
        </script>
    </body>
    </html>
  `);
});

app.get('/api/products', (req, res) => {
  res.json({ success: true, products });
});

// Sipariş / Ödeme Bildirimi ve Otomatik Numara Alma API'si
app.post('/api/order', async (req, res) => {
  const { product, customerContact } = req.body;
  try {
    let phoneNumber = null;

    // Eğer ürün bir SMS Onay servisi ise, butona basıldığı an API'den numarayı çek
    if (product.category === 'SMSOnay' && product.service && product.country) {
      const apiResult = await getNumberFromAPI(product.service, product.country);
      if (apiResult.success) {
        phoneNumber = apiResult.phoneNumber;
      }
    }

    // Admine Telegram üzerinden detaylı bildirim gönder
    const message = `🚨 *YENİ WEB ÖDEME BİLDİRİMİ!* 🚨\n\n` +
                    `📦 *Ürün:* ${product.name}\n` +
                    `💰 *Tutar:* ${product.price} TL\n` +
                    `👤 *Müşteri Telegram:* ${customerContact}\n` +
                    (phoneNumber ? `📞 *Verilen Numara:* +${phoneNumber}\n` : '') +
                    `\n💳 Alıcı: ${ACCOUNT_HOLDER} -${ADMIN_IBAN}`;

    if (ADMIN_ID && ADMIN_ID !== "BURAYA_SENIN_TELEGRAM_USER_ID_YAZ") {
      await bot.telegram.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
    }

    res.json({ success: true, phoneNumber });
  } catch (err) {
    res.json({ success: false, message: "İşlem sırasında hata oluştu." });
  }
});

// TELEGRAM BOT KOMUTLARI
bot.start((ctx) => {
  ctx.reply(
    `🦅 *Anka VIP Medya & Bot Paneline Hoş Geldiniz!*\n\n` +
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
        [Markup.button.url('🌐 Web Paneline Git', 'https://' + (process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL.replace('https://', '') : 'localhost:10000'))],
        [Markup.button.url('👤 Destek / İletişim (@SMSPATRONUM)', 'https://t.me/SMSPATRONUM')]
      ])
    }
  );
});

bot.action('menu_Instagram', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.reply(
    `📸 *Instagram Hizmetleri*:\n\n💳 Alıcı: *${ACCOUNT_HOLDER}*\n💳 IBAN: \`${ADMIN_IBAN}\``,
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
    `🎵 *TikTok Hizmetleri*:\n\n💳 Alıcı: *${ACCOUNT_HOLDER}*\n💳 IBAN: \`${ADMIN_IBAN}\``,
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
    `📢 *Telegram Hizmetleri*:\n\n💳 Alıcı: *${ACCOUNT_HOLDER}*\n💳 IBAN: \`${ADMIN_IBAN}\``,
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
    `📱 *SMS Onay & Numara Servisleri*:\n\n` +
    `Sistem API üzerinden otomatik numara çeker.\n` +
    `💳 Alıcı: *${ACCOUNT_HOLDER}* | IBAN: \`${ADMIN_IBAN}\``,
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
      `💳 Alıcı Adı Soyadı: *${ACCOUNT_HOLDER}*\n` +
      `• IBAN: \`${ADMIN_IBAN}\`\n\n` +
      `⚠️ Ödemeyi yaptıktan sonra dekontunuzla birlikte lütfen **@SMSPATRONUM** adresine kullanıcı adınızı yazarak bildiriniz.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('👤 Dekont Gönder / İletişim', 'https://t.me/SMSPATRONUM')],
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
      `💳 Alıcı Adı Soyadı: *${ACCOUNT_HOLDER}*\n` +
      `💳 IBAN: \`${ADMIN_IBAN}\`\n\n` +
      `⚠️ Lütfen ödemeyi yukarıdaki IBAN'a yapıp dekontu @SMSPATRONUM adresine iletin.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('👤 Ödemeyi Yaptım, Dekont Gönder', 'https://t.me/SMSPATRONUM')],
          [Markup.button.callback('🔄 Numara Değiştir', item.action)],
          [Markup.button.callback('🔙 Ana Menü', 'main_menu')]
        ])
      }
    );
  });
});

bot.action('main_menu', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.reply(
    `🦅 *Anka VIP Ana Menü:*`,
    Markup.inlineKeyboard([
      [Markup.button.callback('📸 Instagram Hizmetleri', 'menu_Instagram')],
      [Markup.button.callback('🎵 TikTok Hizmetleri', 'menu_TikTok')],
      [Markup.button.callback('📢 Telegram Hizmetleri', 'menu_Telegram')],
      [Markup.button.callback('📱 SMS Onay & Numara Servisleri', 'menu_SMSOnay')],
      [Markup.button.url('👤 Destek / İletişim', 'https://t.me/SMSPATRONUM')]
    ])
  );
});

app.listen(PORT, () => {
  console.log(`Panel ${PORT} portunda başarıyla çalışıyor...`);
  
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (externalUrl) {
    setInterval(() => {
      axios.get(externalUrl).catch(() => {});
    }, 600000);
  }
});

bot.launch().then(() => {
  console.log("Telegram Bot başarıyla aktif edildi!");
}).catch(err => {
  console.error("Bot başlatma hatası:", err);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
