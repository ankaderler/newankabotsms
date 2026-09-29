const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Onayla SMS API Bilgileri
const API_KEY = 'osms_24a366588a5adf689da78bd656ef845effba51b53754bf57';
const API_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';

// Yedek / Fallback Giriş Bilgileri (API yanıt vermezse kullanılacak yetki/oturum takibi için)
const USER_CREDENTIALS = {
    email: 'ardasakla458@gmail.com',
    pass: 'AZC.anka.34'
};

// Aktif siparişleri tutmak için geçici bellek (Gerçek projede veritabanı kullanılmalıdır)
let activeOrders = {};

// 1. Kullanıcı bakiye sorgulama endpoint'i
app.get('/api/getBalance', async (req, res) => {
    try {
        const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getBalance`);
        res.json({ success: true, data: response.data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Bakiye alınamadı.', error: error.message });
    }
});

// 2. Numara Satın Alma Endpoint'i
app.post('/api/getNumber', async (req, res) => {
    const { service, country } = req.body; // Örn: service = 'wa' (WhatsApp), country = 'tr'
    
    try {
        // Onayla SMS API üzerinden numara alım isteği
        const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getNumber&service=${service}&country=${country || 0}`);
        const resultText = response.data; // Genellikle "ACCESS_NUMBER:id:number" veya hata döner

        if (resultText.startsWith('ACCESS_NUMBER')) {
            const parts = resultText.split(':');
            const activationId = parts[1];
            const phoneNumber = parts[2];

            // Siparişi hafızaya kaydedelim
            activeOrders[activationId] = {
                phoneNumber,
                service,
                status: 'waiting_sms',
                createdAt: new Date()
            };

            return res.json({
                success: true,
                activationId,
                phoneNumber,
                message: 'Numara başarıyla alındı!'
            });
        } else {
            // Eğer API üzerinden doğrudan numara alınamazsa, belirttiğin hesap bilgileriyle
            // yedek süreç tetiklenebilir veya hata döndürülür.
            return res.status(400).json({ 
                success: false, 
                message: `Numara alınamadı: ${resultText}`,
                fallbackAccount: USER_CREDENTIALS.email // Bilgi amaçlı
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Sunucu hatası.', error: error.message });
    }
});

// 3. SMS Kodunu Yakalama (Kontrol Etme) Endpoint'i
app.get('/api/checkSms/:activationId', async (req, res) => {
    const { activationId } = req.params;

    try {
        const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getStatus&id=${activationId}`);
        const resultText = response.data; // Örn: "STATUS_OK:G-123456" veya "STATUS_WAIT_CODE"

        if (resultText.startsWith('STATUS_OK')) {
            const smsCode = resultText.split(':')[1];
            if (activeOrders[activationId]) {
                activeOrders[activationId].status = 'completed';
                activeOrders[activationId].code = smsCode;
            }
            return res.json({ success: true, status: 'completed', code: smsCode });
        } else if (resultText === 'STATUS_WAIT_CODE') {
            return res.json({ success: true, status: 'waiting', message: 'Kod bekleniyor...' });
        } else {
            return res.json({ success: true, status: resultText, message: resultText });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'SMS kontrol edilemedi.', error: error.message });
    }
});

// Ana Arayüz (Frontend)
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnkaSMS - Otomatik Onay Paneli</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #030712; color: #f3f4f6; }
        .glass { background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(16px); border: 1px solid rgba(59, 130, 246, 0.2); }
        .glass-card { background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(59, 130, 246, 0.15); transition: all 0.3s ease; }
        .glass-card:hover { border-color: rgba(59, 130, 246, 0.5); transform: translateY(-3px); }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between">
    <header class="glass sticky top-0 z-40 border-b border-blue-900/30 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-blue-600/20 border border-blue-500/40 rounded-xl flex items-center justify-center">
                <i class="fa-solid fa-bolt text-blue-400"></i>
            </div>
            <div>
                <span class="font-bold text-lg tracking-tight text-white">AnkaSMS</span>
                <span class="block text-[10px] text-blue-400 font-medium">OTOMATİK API PANELİ</span>
            </div>
        </div>
        <div class="flex items-center space-x-3">
            <div class="glass px-3 py-1.5 rounded-xl flex items-center space-x-2 text-sm border-blue-500/20">
                <i class="fa-solid fa-wallet text-blue-400"></i>
                <span class="text-slate-400">Sistem Bakiye:</span>
                <span id="system-balance" class="font-bold text-blue-300">Yükleniyor...</span>
            </div>
        </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 py-8 w-full flex-grow">
        <div class="glass p-6 rounded-2xl mb-8 border border-blue-500/30">
            <h2 class="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <i class="fa-solid fa-cart-shopping text-blue-500"></i>
                <span>Hızlı Numara Satın Al (OnaylaSMS Entegrasyonlu)</span>
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Servis Seçin</label>
                    <select id="service-select" class="w-full bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-2.5 text-xs text-white">
                        <option value="wa">WhatsApp (TR / Global)</option>
                        <option value="tg">Telegram</option>
                        <option value="lg">Letgo</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Ülke Kodu</label>
                    <input type="text" id="country-input" value="0" class="w-full bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-2.5 text-xs text-white" placeholder="Örn: 0 (Genel) veya 2 (Türkiye)">
                </div>
            </div>
            <button onclick="buyNumber()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-blue-600/20">
                Numara Satın Al ve Kodu Bekle
            </button>
        </div>

        <div id="result-box" class="hidden glass p-6 rounded-2xl border border-emerald-500/30">
            <h3 class="text-lg font-bold text-emerald-400 mb-2"><i class="fa-solid fa-circle-check"></i> Numara Tahsis Edildi</h3>
            <p class="text-xs text-slate-300 mb-2">Telefon Numaranız: <b id="res-phone" class="text-white text-sm font-mono"></b></p>
            <p class="text-xs text-slate-300 mb-4">İşlem ID: <span id="res-id" class="font-mono text-slate-400"></span></p>
            
            <div class="bg-slate-900/80 p-4 rounded-xl border border-blue-500/20">
                <span class="text-xs text-slate-400 block mb-1">Gelen SMS Kodu:</span>
                <div id="res-code" class="text-2xl font-extrabold text-blue-400 font-mono">Kod bekleniyor...</div>
            </div>
        </div>
    </main>

    <script>
        async function fetchBalance() {
            try {
                const res = await fetch('/api/getBalance');
                const json = await res.json();
                if(json.success) {
                    document.getElementById('system-balance').innerText = json.data;
                }
            } catch(e) { console.error(e); }
        }
        fetchBalance();

        let checkInterval = null;

        async function buyNumber() {
            const service = document.getElementById('service-select').value;
            const country = document.getElementById('country-input').value;

            alert('Numara talep ediliyor, lütfen bekleyin...');
            
            try {
                const res = await fetch('/api/getNumber', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ service, country })
                });
                const json = await res.json();

                if(json.success) {
                    document.getElementById('result-box').classList.remove('hidden');
                    document.getElementById('res-phone').innerText = json.phoneNumber;
                    document.getElementById('res-id').innerText = json.activationId;

                    // Her 3 saniyede bir SMS kodunu kontrol et
                    if(checkInterval) clearInterval(checkInterval);
                    checkInterval = setInterval(() => checkSmsCode(json.activationId), 3000);
                } else {
                    alert('Hata: ' + json.message);
                }
            } catch(e) {
                alert('Bağlantı hatası oluştu!');
            }
        }

        async function checkSmsCode(activationId) {
            try {
                const res = await fetch(\`/api/checkSms/\${activationId}\`);
                const json = await res.json();

                if(json.success && json.status === 'completed') {
                    document.getElementById('res-code').innerText = json.code;
                    clearInterval(checkInterval);
                    alert('SMS Kodu başarıyla geldi!');
                }
            } catch(e) { console.error(e); }
        }
    </script>
</body>
</html>`);
});

app.listen(PORT, () => {
    console.log('Sunucu calisiyor, port:', PORT);
});
