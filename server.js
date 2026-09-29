const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Kodun içinde doğrudan tanımlandı, hata vermez
const API_KEY = process.env.API_KEY || 'osms_24a366588a5adf689da78bd656ef845effba51b53754bf57';
const API_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';

// Basit veritabanı simülasyonu
let users = {
    "musteri@gmail.com": { balance: 250.00, name: "Örnek Müşteri" }
};

const servicePrices = {
    "wa": 200,
    "tg": 200,
    "lg": 80
};

app.get('/api/getCustomerBalance', (req, res) => {
    const email = req.query.email || "musteri@gmail.com";
    const user = users[email] || { balance: 0 };
    res.json({ success: true, balance: user.balance });
});

app.post('/api/buyNumber', async (req, res) => {
    const { service, country, email } = req.body;
    const userEmail = email || "musteri@gmail.com";
    
    if (!users[userEmail]) {
        return res.status(400).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    const price = servicePrices[service] || 100;

    if (users[userEmail].balance < price) {
        return res.status(400).json({ 
            success: false, 
            message: `Bakiyeniz yetersiz! Bu ürün ${price} TL, sizin bakiyeniz ${users[userEmail].balance} TL. Lütfen bakiye yükleyin.` 
        });
    }

    try {
        const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getNumber&service=${service}&country=${country || 0}`);
        const resultText = response.data;

        if (resultText.startsWith('ACCESS_NUMBER')) {
            users[userEmail].balance -= price;
            const parts = resultText.split(':');
            return res.json({
                success: true,
                activationId: parts[1],
                phoneNumber: parts[2],
                remainingBalance: users[userEmail].balance,
                message: 'Numara başarıyla alındı!'
            });
        } else {
            return res.status(400).json({ success: false, message: `Sistem hatası (Tedarikçi): ${resultText}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Sunucu bağlantı hatası.', error: error.message });
    }
});

app.get('/api/checkSms/:activationId', async (req, res) => {
    const { activationId } = req.params;
    try {
        const response = await axios.get(`${API_URL}?api_key=${API_KEY}&action=getStatus&id=${activationId}`);
        const resultText = response.data;

        if (resultText.startsWith('STATUS_OK')) {
            return res.json({ success: true, status: 'completed', code: resultText.split(':')[1] });
        } else if (resultText === 'STATUS_WAIT_CODE') {
            return res.json({ success: true, status: 'waiting', message: 'Kod bekleniyor...' });
        } else {
            return res.json({ success: true, status: resultText, message: resultText });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'SMS kontrol edilemedi.', error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnkaSMS - Müşteri Paneli</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #030712; color: #f3f4f6; }
        .glass { background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(16px); border: 1px solid rgba(59, 130, 246, 0.2); }
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
                <span class="block text-[10px] text-blue-400 font-medium">MÜŞTERİ PANELİ</span>
            </div>
        </div>
        <div class="flex items-center space-x-3">
            <div class="glass px-3 py-1.5 rounded-xl flex items-center space-x-2 text-sm border-blue-500/20">
                <i class="fa-solid fa-wallet text-emerald-400"></i>
                <span class="text-slate-400">Bakiyeniz:</span>
                <span id="customer-balance" class="font-bold text-emerald-400">Yükleniyor...</span>
            </div>
            <button onclick="openDepositModal()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20">
                <i class="fa-solid fa-plus mr-1"></i> Bakiye Yükle
            </button>
        </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 py-8 w-full flex-grow">
        <div class="glass p-6 rounded-2xl mb-8 border border-blue-500/30">
            <h2 class="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <i class="fa-solid fa-cart-shopping text-blue-500"></i>
                <span>Hızlı Numara Satın Al</span>
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Servis Seçin</label>
                    <select id="service-select" class="w-full bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-2.5 text-xs text-white">
                        <option value="wa">WhatsApp - 200 TL</option>
                        <option value="tg">Telegram - 200 TL</option>
                        <option value="lg">Letgo TR SMS - 80 TL</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Ülke Kodu</label>
                    <input type="text" id="country-input" value="0" class="w-full bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-2.5 text-xs text-white" placeholder="Örn: 0">
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

    <!-- Bakiye Yükleme Modalı (Arda Sakla Adına Ödeme) -->
    <div id="deposit-modal" class="fixed inset-0 z-50 hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-2xl p-6 border border-blue-500/30 relative">
            <button onclick="closeDepositModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
            <h3 class="text-lg font-bold text-white mb-2"><i class="fa-solid fa-wallet text-blue-500"></i> Bakiye Yükleme Bilgileri</h3>
            <p class="text-xs text-slate-400 mb-4">Aşağıdaki hesaba ödeme yaptıktan sonra bildirim gönderin:</p>
            
            <div class="bg-slate-900/90 p-4 rounded-xl border border-blue-500/30 mb-4 space-y-2 text-xs">
                <div class="flex justify-between"><span class="text-slate-400">Alıcı Ad Soyad:</span> <span class="font-bold text-emerald-400 text-sm">Arda Sakla</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Banka / Papara:</span> <span class="font-semibold text-white">Papara / Ziraat Bankası</span></div>
                <div class="flex justify-between"><span class="text-slate-400">IBAN / Papara No:</span> <span class="font-mono text-blue-300 font-bold">TR36 0001 0020 3040 5060 7080 90</span></div>
            </div>

            <div class="space-y-3">
                <input type="text" id="dep-name" placeholder="Gönderen Adınız Soyadınız" class="w-full bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-2 text-xs text-white">
                <input type="number" id="dep-amount" placeholder="Yatırılan Tutar (TL)" class="w-full bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-2 text-xs text-white">
                <button onclick="sendDepositNotice()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition">Ödeme Bildirimi Gönder</button>
            </div>
        </div>
    </div>

    <script>
        async function fetchBalance() {
            try {
                const res = await fetch('/api/getCustomerBalance');
                const json = await res.json();
                if(json.success) {
                    document.getElementById('customer-balance').innerText = json.balance.toFixed(2) + ' TL';
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
                const res = await fetch('/api/buyNumber', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ service, country, email: 'musteri@gmail.com' })
                });
                const json = await res.json();

                if(json.success) {
                    document.getElementById('result-box').classList.remove('hidden');
                    document.getElementById('res-phone').innerText = json.phoneNumber;
                    document.getElementById('res-id').innerText = json.activationId;
                    
                    document.getElementById('customer-balance').innerText = json.remainingBalance.toFixed(2) + ' TL';

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

        function openDepositModal() { document.getElementById('deposit-modal').classList.remove('hidden'); }
        function closeDepositModal() { document.getElementById('deposit-modal').classList.add('hidden'); }
        function sendDepositNotice() {
            const name = document.getElementById('dep-name').value;
            const amount = document.getElementById('dep-amount').value;
            if(!name || !amount) { alert('Lütfen alanları doldurun.'); return; }
            alert('Ödeme bildiriminiz Arda Sakla adına alınmıştır. Admin onayından sonra bakiyeniz eklenecektir.');
            closeDepositModal();
        }
    </script>
</body>
</html>`);
});

app.listen(PORT, () => {
    console.log('Sunucu calisiyor, port:', PORT);
});
