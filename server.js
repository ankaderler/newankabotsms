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

// Zenginleştirilmiş ve Kategorize Edilmiş VIP Ürün Kataloğu
const products = [
  // Instagram Kategorisi
  { id: 1, category: "Instagram", name: "Instagram Türk Gerçek Görünümlü Takipçi (1000 Adet)", price: 150, desc: "Profilinizi öne çıkaracak kaliteli Türk takipçi gönderimi.", autoStock: "Havuzda hazır stok mevcut (Otomatik teslim edilebilir)." },
  { id: 2, category: "Instagram", name: "Instagram Gönderi Beğeni Paketi (1000 Adet)", price: 120, desc: "Paylaşımlarınızın etkileşimini artıran hızlı beğeni.", autoStock: "Hızlı gönderim sırasına eklenir." },
  { id: 3, category: "Instagram", name: "Instagram Hikaye İzlenme Paketi (5000 Adet)", price: 130, desc: "Hikayeleriniz için yüksek hacimli görüntülenme.", autoStock: "Otomatik başlar." },
  
  // TikTok Kategorisi
  { id: 4, category: "TikTok", name: "TikTok Türk Takipçi (1000 Adet)", price: 180, desc: "Aktif ve etkileşimli TikTok takipçi servisi.", autoStock: "Hazır gönderim listesi." },
  { id: 5, category: "TikTok", name: "TikTok Video İzlenme + Beğeni Kombin (2000 Adet)", price: 140, desc: "Keşfet odaklı özel TikTok etkileşim paketi.", autoStock: "Anında işleme alınır." },

  // Telegram Kategorisi
  { id: 6, category: "Telegram", name: "Telegram Kanal / Grup Abonesi (1000 Adet)", price: 160, desc: "Kanalınızın güven vermesini sağlayacak kaliteli üye.", autoStock: "Bot havuzundan anlık gönderim." },
  { id: 7, category: "Telegram", name: "🤖 Kendi Telegram Botunu Oluşturma Hizmeti", price: 500, desc: "Sıfırdan size özel butonlu, yönetim panelli bot kurulumu.", autoStock: "Admin birebir kurulum yapar (@SMSPATRONUM)." },

  // Hesaplar & Numara Satış Kategorisi
  { id: 8, category: "Hesaplar", name: "Instagram Rastgele (Random) Hesap (10 Adet)", price: 120, desc: "Onaylı/onaysız karışık yüksek kaliteli random Instagram hesapları.", autoStock: "Kullanıcı Adı:Şifre listesi anında verilir." },
  { id: 9, category: "Hesaplar", name: "Gmail Random / Eskitilmiş Hesap (5 Adet)", price: 150, desc: "Onaylı, iş veya kişisel kullanım için hazır mail adresleri.", autoStock: "Mail:Şifre listesi otomatik teslim edilir." },
  { id: 10, category: "Hesaplar", name: "Onaylı Dijital Platform / Numara Servisleri (10 Adet)", price: 200, desc: "Çeşitli platformlar için kullanılabilir onaylı dijital hesaplar.", autoStock: "Stoktan anında teslim veya admin desteği." }
];

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Web sitesi için güncel ve zengin index.html (IBAN, Alıcı Adı ve Kategori Görünümlü)
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
            .card { background: var(--card); border-radius: 12px; padding: 20px; border: 1px solid #334155; display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s; }
            .card:hover { transform: translateY(-5px); border-color: var(--accent); }
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
                <p>En Güvenilir Sosyal Medya, Hesap ve Otomasyon Çözümleri</p>
                <div class="iban-box">
                    <strong>💳 Ödeme Yapılacak IBAN Bilgileri:</strong><br>
                    • Alıcı Adı: <b>${ACCOUNT_HOLDER}</b><br>
                    • IBAN: <b>${ADMIN_IBAN}</b><br>
                    • Destek / Bildirim: <a href="https://t.me/SMSPATRONUM" target="_blank" style="color: var(--accent);">${SUPPORT_USERNAME}</a>
                </div>
            </header>

            <div id="product-list"></div>
        </div>

        <div id="orderModal" class="modal">
            <div class="modal-content">
                <h3 id="modalTitle" style="color: var(--gold); margin-top:0;">Sipariş Ver</h3>
                <p>Seçilen Tutar: <b id="modalPrice" style="color:var(--accent);"></b> TL</p>
                <p style="font-size: 0.9rem; color: #cbd5e1;">Ödemeyi yukarıdaki IBAN'a yaptıktan sonra aşağıdaki formu doldurun.</p>
                <form id="purchaseForm">
                    <input type="hidden" id="pName">
                    <input type="hidden" id="pPrice">
                    <label>Telegram Kullanıcı Adınız veya Telefonunuz:</label>
                    <input type="text" id="customerContact" required placeholder="@kullaniciadi veya 0555...">
                    <label>Ödemeyi Yaptığınıza Dair Açıklama / Dekont Notu:</label>
                    <textarea id="paymentNote" placeholder="Örn: Resul Sakal adına havale yapıldı. Dekont No: 12345" required></textarea>
                    
                    <label style="margin-top:10px; display:block;"><b>Teslimat Yöntemi Seçin:</b></label>
                    <select id="deliveryChoice" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #475569; border-radius:5px; margin-bottom:15px;">
                        <option value="auto">🤖 Otomatik Sistemden Anında Teslim Al</option>
                        <option value="admin">👤 Yetkili Admin ile Görüşerek Teslim Al (@SMSPATRONUM)</option>
                    </select>

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
                    html += \`<div class="category-title">📂 \${cat} Kategorisi</div><div class="grid">\`;
                    allProducts.filter(p => p.category === cat).forEach(p => {
                        html += \`
                            <div class="card">
                                <div>
                                    <h3>\${p.name}</h3>
                                    <p style="color:#94a3b8; font-size:0.9rem;">\${p.desc}</p>
                                    <div style="font-size:0.8rem; color:#38bdf8;">📦 \${p.autoStock}</div>
                                </div>
                                <div>
                                    <div class="price">\${p.price} TL</div>
                                    <button class="btn" onclick="openModal('\${p.name}', \${p.price})">Hemen Satın Al</button>
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

            function closeModal() {
                document.getElementById('orderModal').style.display = 'none';
            }

            document.getElementById('purchaseForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const productName = document.getElementById('pName').value;
                const price = document.getElementById('pPrice').value;
                const customerContact = document.getElementById('customerContact').value;
                const paymentNote = document.getElementById('paymentNote').value;
                const deliveryChoice = document.getElementById('deliveryChoice').value;

                const res = await fetch('/api/order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productName, price, customerContact, paymentNote, deliveryChoice })
                });
                const data = await res.json();
                
                if(data.success) {
                    if(deliveryChoice === 'admin') {
                        alert('Sipariş bildirimi admine iletildi! Lütfen @SMSPATRONUM adresine gidip dekontunuzu gönderin.');
                        window.location.href = 'https://t.me/SMSPATRONUM';
                    } else {
                        alert('Ödeme bildiriminiz alındı! Otomatik teslimat için lütfen Telegram botumuzu ziyaret edin.');
                        location.reload();
                    }
                } else {
                    alert('Bir hata oluştu, lütfen tekrar deneyin.');
                }
            });
        </script>
    </body>
    </html>
  `);
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
  const { productName, price, customerContact, paymentNote, deliveryChoice } = req.body;
  
  try {
    const message = `🚨 *YENİ WEB SİPARİŞİ / ÖDEME BİLDİRİMİ!* 🚨\n\n` +
                    `📦 *Ürün:* ${productName}\n` +
                    `💰 *Tutar:* ${price} TL\n` +
                    `👤 *Müşteri İletişim:* ${customerContact}\n` +
                    `📝 *Dekont/Not:* ${paymentNote}\n` +
                    `🚚 *Seçilen Teslimat:* ${deliveryChoice === 'admin' ? '👤 Admine Bağlanmak İstiyor' : '🤖 Otomatik / Bot İçi Teslimat'}\n\n` +
                    `⚠️ Lütfen IBAN hesabınızı kontrol edip müşteriye onay verin!`;

    if (ADMIN_ID && ADMIN_ID !== "BURAYA_SENIN_TELEGRAM_USER_ID_YAZ") {
      await bot.telegram.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
    }

    res.json({ success: true, message: "Sipariş alındı." });
  } catch (err) {
    console.error(err);
    res.json({ success: true, message: "Sipariş alındı." });
  }
});

// TELEGRAM BOT KATEGORİLİ İNTERAKTİF MENÜ
bot.start((ctx) => {
  ctx.reply(
    `👑 *Anka VIP Medya & Bot Paneline Hoş Geldiniz!*\n\n` +
    `Alıcı: *${ACCOUNT_HOLDER}*\n` +
    `IBAN: \`${ADMIN_IBAN}\`\n\n` +
    `Aşağıdaki kategorilerden dilediğiniz hizmeti inceleyebilir, ürünleri görebilir veya dilediğiniz an admine bağlanabilirsiniz.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📸 Instagram Hizmetleri', 'cat_Instagram')],
        [Markup.button.callback('🎵 TikTok Hizmetleri', 'cat_TikTok')],
        [Markup.button.callback('📢 Telegram Hizmetleri', 'cat_Telegram')],
        [Markup.button.callback('📁 Hesaplar & Numara / Mail', 'cat_Hesaplar')],
        [Markup.button.url('🌐 Web Paneline Git (Tüm Ürünler)', 'https://' + (process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL.replace('https://', '') : 'localhost:3000'))],
        [Markup.button.url('👤 Doğrudan Admine Bağlan (@SMSPATRONUM)', 'https://t.me/SMSPATRONUM')]
      ])
    }
  );
});

// Kategori Butonu Dinleyicileri
['Instagram', 'TikTok', 'Telegram', 'Hesaplar'].forEach(category => {
  bot.action(`cat_${category}`, async (ctx) => {
    await ctx.answerCbQuery();
    const filtered = products.filter(p => p.category === category);
    let text = `📂 *${category} Kategorisi Ürünleri*:\n\n`;
    
    filtered.forEach(p => {
      text += `🔹 *${p.name}*\n💰 Fiyat: *${p.price} TL*\n📝 ${p.desc}\n\n`;
    });
    
    text += `💳 *Ödeme Bilgisi:*\nTutarınızı yukarıdaki IBAN'a yatırıp dekontla birlikte ya otomatikten alabilir ya da adminle görüşebilirsiniz.`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Ana Menüye Dön', 'main_menu')],
        [Markup.button.url('👤 Ürünü Adminden Al / Destek Al', 'https://t.me/SMSPATRONUM')]
      ])
    });
  });
});

bot.action('main_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `👑 *Anka VIP Ana Menü:*`,
    Markup.inlineKeyboard([
      [Markup.button.callback('📸 Instagram Hizmetleri', 'cat_Instagram')],
      [Markup.button.callback('🎵 TikTok Hizmetleri', 'cat_TikTok')],
      [Markup.button.callback('📢 Telegram Hizmetleri', 'cat_Telegram')],
      [Markup.button.callback('📁 Hesaplar & Numara / Mail', 'cat_Hesaplar')],
      [Markup.button.url('👤 Doğrudan Admine Bağlan', 'https://t.me/SMSPATRONUM')]
    ])
  );
});

bot.launch().then(() => {
  console.log("Telegram Bot kategorili menüyle aktif!");
}).catch(err => {
  console.log("Bot başlatılırken hata oluştu:", err.message);
});

app.listen(PORT, () => {
  console.log(`Anka VIP Panel ${PORT} portunda başarıyla çalışıyor...`);
});
