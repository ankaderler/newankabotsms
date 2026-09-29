const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_KEY = process.env.API_KEY || 'osms_24a366588a5adf689da78bd656ef845effba51b53754bf57';
const API_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';

// Veritabanı simülasyonu
let users = {
    "musteri@gmail.com": { balance: 350.00, name: "Örnek Müşteri", password: "123" }
};

// İstediğin gibi ayrı ayrı servis ve ülke kodları (OnaylaSMS standartlarına uygun)
const services = [
    { id: "tg_tr", service: "tg", country: "1", name: "Telegram Türkiye", price: 150, icon: "fa-telegram", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    { id: "tg_global", service: "tg", country: "0", name: "Telegram Yurtdışı", price: 100, icon: "fa-telegram", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
    { id: "wa_tr", service: "wa", country: "1", name: "WhatsApp Türkiye", price: 200, icon: "fa-whatsapp", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    { id: "wa_ph", service: "wa", country: "18", name: "WhatsApp Philippines", price: 120, icon: "fa-whatsapp", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/30" },
    { id: "tw_global", service: "tw", country: "0", name: "Twitter / X", price: 90, icon: "fa-twitter", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" },
    { id: "ig_global", service: "ig", country: "0", name: "Instagram", price: 130, icon: "fa-instagram", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30" }
];

app.get('/api/getServices', (req, res) => {
    res.json({ success: true, services });
});

app.get('/api/getCustomerBalance', (req, res) => {
    const email = req.query.email || "musteri@gmail.com";
    const user = users[email] || { balance: 0 };
    res.json({ success: true, balance: user.balance, name: user.name });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (users[email] && users[email].password === password) {
        res.json({ success: true, message: 'Giriş başarılı!', email, name: users[email].name, balance: users[email].balance });
    } else {
        res.status(400).json({ success: false, message: 'E-posta veya şifre hatalı!' });
    }
});

app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (users[email]) {
        return res.status(400).json({ success: false, message: 'Bu e-posta adresi zaten kayıtlı!' });
    }
    users[email] = { name, password, balance: 50.00 };
    res.json({ success: true, message: 'Kayıt başarılı! 50 TL bonus eklendi.', email, name, balance: 50.00 });
});

// Numara Satın Alma (OnaylaSMS Entegrasyonlu)
app.post('/api/buyNumber', async (req, res) => {
    const { productKey, email } = req.body;
    const userEmail = email || "musteri@gmail.com";
    
    if (!users[userEmail]) {
        return res.status(400).json({ success: false, message: 'Oturum bulunamadı.' });
    }

    const product = services.find(s => s.id === productKey);
    if (!product) {
        return res.status(400).json({ success: false, message: 'Ürün bulunamadı.' });
    }

    if (users[userEmail].balance < product.price) {
        return res.status(400).json({ 
            success: false, 
            message: `Bakiyeniz yetersiz! Bu ürün ${product.price} TL, sizin bakiyeniz ${users[userEmail].balance} TL.` 
        });
    }

    try {
        // OnaylaSMS API'ye bağlanıp senin hesabından numarayı çekiyoruz
        const apiCallUrl = `${API_URL}?api_key=${API_KEY}&action=getNumber&service=${product.service}&country=${product.country}`;
        const response = await axios.get(apiCallUrl);
        const resultText = response.data;

        if (resultText.startsWith('ACCESS_NUMBER')) {
            // Başarılı olursa müşterinin bakiyesinden düş
            users[userEmail].balance -= product.price;
            const parts = resultText.split(':');
            return res.json({
                success: true,
                activationId: parts[1],
                phoneNumber: parts[2],
                remainingBalance: users[userEmail].balance,
                productName: product.name,
                message: 'Numara başarıyla tahsis edildi!'
            });
        } else {
            return res.status(400).json({ success: false, message: `OnaylaSMS Tedarikçi Hatası: ${resultText}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Sunucu bağlantı hatası.', error: error.message });
    }
});

// SMS Kodunu OnaylaSMS'ten Yakalama Endpoint'i
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
<html lang="tr" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnkaSMS - Premium Numara ve SMS Paneli</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #020617; color: #f8fafc; overflow-x: hidden; }
        .glass { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(59, 130, 246, 0.15); }
        .glass-card { background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); transition: all 0.3s ease; }
        .glass-card:hover { transform: translateY(-4px); border-color: rgba(59, 130, 246, 0.4); box-shadow: 0 10px 30px -10px rgba(59, 130, 246, 0.2); }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between">

    <!-- Header -->
    <header class="glass sticky top-0 z-40 border-b border-blue-900/20 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3 cursor-pointer" onclick="location.reload()">
            <div class="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <i class="fa-solid fa-bolt text-white text-lg"></i>
            </div>
            <div>
                <span class="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">AnkaSMS</span>
                <span class="block text-[10px] text-blue-400 font-bold tracking-wider">CANLI API PANELİ</span>
            </div>
        </div>

        <div class="flex items-center space-x-3">
            <div class="glass px-3.5 py-2 rounded-xl flex items-center space-x-2 text-xs border-blue-500/20">
                <i class="fa-solid fa-wallet text-emerald-400"></i>
                <span class="text-slate-400">Bakiyeniz:</span>
                <span id="customer-balance" class="font-extrabold text-emerald-400">Yükleniyor...</span>
            </div>
            <button onclick="openDepositModal()" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30">
                <i class="fa-solid fa-plus mr-1"></i> Bakiye Yükle
            </button>
            <button onclick="openAuthModal()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition border border-slate-700">
                <i class="fa-solid fa-user mr-1"></i> <span id="user-profile-text">Hesabım</span>
            </button>
        </div>
    </header>

    <!-- Main -->
    <main class="max-w-6xl mx-auto px-4 py-8 w-full flex-grow">
        <div class="relative overflow-hidden glass p-8 rounded-3xl mb-10 border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-indigo-950/40">
            <div class="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-white mb-2">Anında Sanal Numara ve SMS Onay 🚀</h1>
            <p class="text-xs sm:text-sm text-slate-400 max-w-xl">İstediğiniz ülkeyi ve servisi seçin, anında numaranızı alın ve gelen SMS kodunu canlı olarak ekranda takip edin.</p>
        </div>

        <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-bold text-white flex items-center space-x-2">
                <i class="fa-solid fa-globe text-blue-500"></i>
                <span>Mevcut Servisler ve Ülke Seçenekleri</span>
            </h2>
            <span class="text-xs text-slate-400">OnaylaSMS Entegrasyonlu</span>
        </div>

        <!-- Ürünler Grid -->
        <div id="services-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-10">
            <!-- Dinamik yüklenecek -->
        </div>
    </main>

    <!-- MÜŞTERİ SATIN ALMA VE KOD TAKİP PANELİ (MODAL) -->
    <div id="order-modal" class="fixed inset-0 z-50 hidden bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass w-full max-w-lg rounded-3xl p-8 border border-blue-500/40 relative animate-fade shadow-2xl">
            <button onclick="closeOrderModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>
            
            <div id="order-step-1">
                <h3 class="text-lg font-extrabold text-white mb-2 flex items-center space-x-2">
                    <i class="fa-solid fa-cart-shopping text-blue-500"></i>
                    <span id="modal-product-title">Ürün Adı</span>
                </h3>
                <p class="text-xs text-slate-400 mb-6">Seçilen servis için sistemimizden anında numara tahsis edilecektir.</p>
                
                <div class="bg-slate-900/90 p-4 rounded-2xl border border-blue-500/20 mb-6 space-y-2 text-xs">
                    <div class="flex justify-between"><span class="text-slate-400">Ücret:</span> <span id="modal-product-price" class="font-bold text-emerald-400 text-sm">0 TL</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Mevcut Bakiyeniz:</span> <span id="modal-user-balance" class="font-bold text-white">0 TL</span></div>
                </div>

                <button id="confirm-buy-btn" onclick="executeBuy()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl text-xs transition shadow-lg shadow-blue-600/30">
                    Numarayı Satın Al ve Kodu Bekle
                </button>
            </div>

            <!-- İşlem Sonucu / Numara ve Kod Takip Ekranı -->
            <div id="order-step-2" class="hidden space-y-4">
                <div class="flex items-center space-x-3 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl">
                    <i class="fa-solid fa-circle-check text-emerald-400 text-2xl"></i>
                    <div>
                        <h4 class="text-sm font-bold text-emerald-400">Numara Başarıyla Tahsis Edildi!</h4>
                        <p class="text-[11px] text-slate-300">İşlem ID: <span id="res-id" class="font-mono text-white">#0</span></p>
                    </div>
                </div>

                <div class="bg-slate-900/90 p-4 rounded-2xl border border-blue-500/30">
                    <span class="text-[11px] text-slate-400 block mb-1">Telefon Numaranız:</span>
                    <div class="flex items-center justify-between">
                        <div id="res-phone" class="text-2xl font-extrabold text-white font-mono tracking-wide">+90 ...</div>
                        <button onclick="navigator.clipboard.writeText(document.getElementById('res-phone').innerText); alert('Numara kopyalandı!');" class="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-3 py-1.5 rounded-xl text-xs font-bold transition">Kopyala</button>
                    </div>
                </div>

                <div class="bg-slate-900/90 p-4 rounded-2xl border border-blue-500/30 text-center">
                    <span class="text-[11px] text-slate-400 block mb-1">Gelen SMS Onay Kodu:</span>
                    <div id="res-code" class="text-3xl font-extrabold text-blue-400 font-mono tracking-widest animate-pulse py-2">Kod bekleniyor...</div>
                    <span class="text-[10px] text-slate-500 block mt-1">Kod geldiğinde otomatik olarak ekrana yansıtılacaktır.</span>
                </div>

                <button onclick="closeOrderModal(); location.reload();" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-2xl text-xs transition font-bold">Pencereyi Kapat</button>
            </div>
        </div>
    </div>

    <!-- Giriş / Kayıt Modalı -->
    <div id="auth-modal" class="fixed inset-0 z-50 hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-3xl p-8 border border-blue-500/35 relative animate-fade">
            <button onclick="closeAuthModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>
            
            <div class="flex space-x-2 mb-6 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
                <button onclick="switchAuthTab('login')" id="tab-login-btn" class="flex-1 py-2 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-lg">Giriş Yap</button>
                <button onclick="switchAuthTab('register')" id="tab-register-btn" class="flex-1 py-2 rounded-xl text-xs font-bold transition text-slate-400 hover:text-white">Kayıt Ol</button>
            </div>

            <form id="login-form" onsubmit="handleLogin(event)" class="space-y-4">
                <div><label class="block text-xs text-slate-400 mb-1">E-posta</label><input type="email" id="login-email" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"></div>
                <div><label class="block text-xs text-slate-400 mb-1">Şifre</label><input type="password" id="login-password" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"></div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg">Giriş Yap</button>
            </form>

            <form id="register-form" onsubmit="handleRegister(event)" class="space-y-4 hidden">
                <div><label class="block text-xs text-slate-400 mb-1">Ad Soyad</label><input type="text" id="reg-name" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"></div>
                <div><label class="block text-xs text-slate-400 mb-1">E-posta</label><input type="email" id="reg-email" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"></div>
                <div><label class="block text-xs text-slate-400 mb-1">Şifre</label><input type="password" id="reg-password" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"></div>
                <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg">Kayıt Ol (50 TL Bonus)</button>
            </form>
        </div>
    </div>

    <!-- Bakiye Yükleme Modalı -->
    <div id="deposit-modal" class="fixed inset-0 z-50 hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-3xl p-8 border border-blue-500/35 relative animate-fade">
            <button onclick="closeDepositModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-base font-bold text-white mb-2"><i class="fa-solid fa-wallet text-blue-500 mr-2"></i> Bakiye Yükleme (Arda Sakla)</h3>
            <p class="text-xs text-slate-400 mb-4">Aşağıdaki Papara/IBAN adresine ödemenizi yapın:</p>
            
            <div class="bg-slate-900/90 p-4 rounded-2xl border border-blue-500/20 mb-4 space-y-2 text-xs">
                <div class="flex justify-between"><span class="text-slate-400">Alıcı:</span> <span class="font-bold text-emerald-400 text-sm">Arda Sakla</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Banka / Papara:</span> <span class="font-semibold text-white">Ziraat / Papara</span></div>
                <div class="flex justify-between"><span class="text-slate-400">IBAN / Papara No:</span> <span class="font-mono text-blue-300 font-bold">TR36 0001 0020 3040 5060 7080 90</span></div>
            </div>

            <div class="space-y-3">
                <input type="text" id="dep-name" placeholder="Gönderen Ad Soyad" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white">
                <input type="number" id="dep-amount" placeholder="Tutar (TL)" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white">
                <button onclick="sendDepositNotice()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg">Ödeme Bildirimi Gönder</button>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="glass border-t border-blue-900/20 text-center py-6 text-xs text-slate-500">
        &copy; 2026 AnkaSMS - Tüm Hakları Saklıdır.
    </footer>

    <script>
        let currentUserEmail = localStorage.getItem('ankasms_user') || 'musteri@gmail.com';
        let selectedProductData = null;
        let currentBalance = 0;

        async function fetchInitialData() {
            try {
                const sRes = await fetch('/api/getServices');
                const sJson = await sRes.json();
                if(sJson.success) {
                    const grid = document.getElementById('services-grid');
                    grid.innerHTML = sJson.services.map(s => \`
                        <div class="glass-card p-5 rounded-2xl flex flex-col justify-between \${s.border}">
                            <div>
                                <div class="flex items-center justify-between mb-3">
                                    <div class="w-12 h-12 \${s.bg} rounded-2xl flex items-center justify-center \${s.color} text-xl border border-white/5">
                                        <i class="fa-brands \${s.icon}"></i>
                                    </div>
                                    <span class="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">\${s.price} TL</span>
                                </div>
                                <h3 class="text-base font-bold text-white mb-1">\${s.name}</h3>
                                <p class="text-[11px] text-slate-400 mb-4">Anında hat tahsisi ve SMS kod takip sistemi.</p>
                            </div>
                            <button onclick='openOrderModal(\${JSON.stringify(s)})' class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-blue-600/20">
                                <i class="fa-solid fa-cart-shopping mr-1.5"></i> Satın Al
                            </button>
                        </div>
                    \`).join('');
                }

                const bRes = await fetch(\`/api/getCustomerBalance?email=\${currentUserEmail}\`);
                const bJson = await bRes.json();
                if(bJson.success) {
                    currentBalance = bJson.balance;
                    document.getElementById('customer-balance').innerText = currentBalance.toFixed(2) + ' TL';
                    if(bJson.name) document.getElementById('user-profile-text').innerText = bJson.name;
                }
            } catch(e) { console.error(e); }
        }
        fetchInitialData();

        let checkInterval = null;

        function openOrderModal(product) {
            selectedProductData = product;
            document.getElementById('modal-product-title').innerText = product.name + ' Satın Al';
            document.getElementById('modal-product-price').innerText = product.price + ' TL';
            document.getElementById('modal-user-balance').innerText = currentBalance.toFixed(2) + ' TL';
            
            document.getElementById('order-step-1').classList.remove('hidden');
            document.getElementById('order-step-2').classList.add('hidden');
            document.getElementById('order-modal').classList.remove('hidden');
        }

        function closeOrderModal() {
            document.getElementById('order-modal').classList.add('hidden');
            if(checkInterval) clearInterval(checkInterval);
        }

        async function executeBuy() {
            const btn = document.getElementById('confirm-buy-btn');
            btn.innerText = 'Numara Alınıyor, Lütfen Bekleyin...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/buyNumber', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productKey: selectedProductData.id, email: currentUserEmail })
                });
                const json = await res.json();

                if(json.success) {
                    document.getElementById('order-step-1').classList.add('hidden');
                    document.getElementById('order-step-2').classList.remove('hidden');
                    
                    document.getElementById('res-phone').innerText = json.phoneNumber;
                    document.getElementById('res-id').innerText = '#' + json.activationId;
                    document.getElementById('customer-balance').innerText = json.remainingBalance.toFixed(2) + ' TL';
                    currentBalance = json.remainingBalance;

                    if(checkInterval) clearInterval(checkInterval);
                    checkInterval = setInterval(() => checkSmsCode(json.activationId), 3000);
                } else {
                    alert('Hata: ' + json.message);
                    btn.innerText = 'Numarayı Satın Al ve Kodu Bekle';
                    btn.disabled = false;
                }
            } catch(e) {
                alert('Bağlantı hatası!');
                btn.innerText = 'Numarayı Satın Al ve Kodu Bekle';
                btn.disabled = false;
            }
        }

        async function checkSmsCode(activationId) {
            try {
                const res = await fetch(\`/api/checkSms/\${activationId}\`);
                const json = await res.json();
                if(json.success && json.status === 'completed') {
                    document.getElementById('res-code').innerText = json.code;
                    clearInterval(checkInterval);
                    alert('Tebrikler! SMS Onay Kodunuz başarıyla geldi.');
                }
            } catch(e) { console.error(e); }
        }

        function openAuthModal() { document.getElementById('auth-modal').classList.remove('hidden'); }
        function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }
        
        function switchAuthTab(tab) {
            const loginBtn = document.getElementById('tab-login-btn');
            const regBtn = document.getElementById('tab-register-btn');
            const loginForm = document.getElementById('login-form');
            const regForm = document.getElementById('register-form');

            if(tab === 'login') {
                loginBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-lg";
                regBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition text-slate-400 hover:text-white";
                loginForm.classList.remove('hidden');
                regForm.classList.add('hidden');
            } else {
                regBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition bg-emerald-600 text-white shadow-lg";
                loginBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition text-slate-400 hover:text-white";
                regForm.classList.remove('hidden');
                loginForm.classList.add('hidden');
            }
        }

        async function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const json = await res.json();
            if(json.success) {
                currentUserEmail = json.email;
                localStorage.setItem('ankasms_user', currentUserEmail);
                alert(json.message);
                closeAuthModal();
                fetchInitialData();
            } else { alert(json.message); }
        }

        async function handleRegister(e) {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const json = await res.json();
            if(json.success) {
                currentUserEmail = json.email;
                localStorage.setItem('ankasms_user', currentUserEmail);
                alert(json.message);
                closeAuthModal();
                fetchInitialData();
            } else { alert(json.message); }
        }

        function openDepositModal() { document.getElementById('deposit-modal').classList.remove('hidden'); }
        function closeDepositModal() { document.getElementById('deposit-modal').classList.add('hidden'); }
        function sendDepositNotice() {
            const name = document.getElementById('dep-name').value;
            const amount = document.getElementById('dep-amount').value;
            if(!name || !amount) { alert('Lütfen alanları doldurun.'); return; }
            alert('Ödeme bildiriminiz Arda Sakla adına iletildi. Admin onayından sonra bakiyenize eklenecektir.');
            closeDepositModal();
        }
    </script>
</body>
</html>`);
});

app.listen(PORT, () => {
    console.log('Sunucu calisiyor, port:', PORT);
});
