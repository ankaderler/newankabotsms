const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Arayüz kodunu doğrudan sunucudan servis ediyoruz
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnkaSMS - Premium SMS Onay Paneli</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #030712; color: #f3f4f6; overflow-x: hidden; }
        #canvas-container { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1; pointer-events: none; }
        .glass { background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(59, 130, 246, 0.2); }
        .glass-card { background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(59, 130, 246, 0.15); transition: all 0.3s ease; }
        .glass-card:hover { border-color: rgba(59, 130, 246, 0.5); transform: translateY(-3px); box-shadow: 0 10px 30px -10px rgba(59, 130, 246, 0.3); }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #030712; }
        ::-webkit-scrollbar-thumb { background: #1e3a8a; border-radius: 4px; }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white">
    <div id="canvas-container"></div>
    <div id="splash-screen" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-700">
        <div class="relative flex items-center justify-center mb-6">
            <div class="absolute w-24 h-24 bg-blue-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div class="w-20 h-20 bg-gradient-to-tr from-blue-700 to-indigo-500 rounded-2xl flex items-center justify-center shadow-2xl border border-blue-400/30">
                <i class="fa-solid fa-shield-halved text-4xl text-white"></i>
            </div>
        </div>
        <h1 class="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-200 to-blue-500 bg-clip-text text-transparent mb-2">ANKASMS</h1>
        <p class="text-slate-400 text-sm tracking-widest uppercase mb-8">Güvenli ve Hızlı SMS Onay Altyapısı</p>
        <div class="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div id="splash-progress" class="h-full bg-gradient-to-r from-blue-600 to-indigo-400 w-0 transition-all duration-300"></div>
        </div>
    </div>
    <div class="flex-grow flex flex-col">
        <header class="glass sticky top-0 z-40 border-b border-blue-900/30 px-6 py-4 flex items-center justify-between">
            <div class="flex items-center space-x-3 cursor-pointer">
                <div class="w-10 h-10 bg-blue-600/20 border border-blue-500/40 rounded-xl flex items-center justify-center">
                    <i class="fa-solid fa-bolt text-blue-400"></i>
                </div>
                <div>
                    <span class="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent">AnkaSMS</span>
                    <span class="block text-[10px] text-blue-400/80 font-medium">PRO PANEL</span>
                </div>
            </div>
            <div class="flex items-center space-x-3">
                <div class="glass px-3 py-1.5 rounded-xl flex items-center space-x-2 text-sm border-blue-500/20">
                    <i class="fa-solid fa-wallet text-blue-400"></i>
                    <span class="text-slate-400">Bakiye:</span>
                    <span id="user-balance" class="font-bold text-blue-300">0.00 TL</span>
                </div>
                <button onclick="openModal('deposit-modal')" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-lg shadow-blue-600/20 flex items-center space-x-2">
                    <i class="fa-solid fa-plus text-xs"></i>
                    <span>Bakiye Yükle</span>
                </button>
                <button onclick="openModal('admin-modal')" class="glass px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition">
                    <i class="fa-solid fa-lock text-sm"></i>
                </button>
            </div>
        </header>
        <main class="max-w-7xl mx-auto px-4 py-8 w-full flex-grow">
            <div class="mb-8">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h2 class="text-xl font-bold text-white flex items-center space-x-2">
                            <i class="fa-solid fa-store text-blue-500"></i>
                            <span>Aktif SMS Onay Servisleri</span>
                        </h2>
                    </div>
                </div>
                <div id="product-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"></div>
            </div>
        </main>
    </div>
    <div class="fixed bottom-6 right-6 z-40">
        <button onclick="toggleSupportChat()" class="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition border border-blue-400/30 relative">
            <i class="fa-solid fa-headset text-xl"></i>
            <span class="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
        </button>
        <div id="support-chat-box" class="hidden absolute bottom-20 right-0 w-80 sm:w-96 glass rounded-2xl shadow-2xl border border-blue-500/30 flex flex-col overflow-hidden">
            <div class="bg-blue-900/40 p-4 border-b border-blue-500/20 flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">AS</div>
                    <div>
                        <h4 class="font-bold text-sm text-white">Anka Destek Ekibi</h4>
                        <span class="text-[10px] text-emerald-400">Çevrim içi</span>
                    </div>
                </div>
                <button onclick="toggleSupportChat()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div id="chat-messages" class="p-4 h-64 overflow-y-auto space-y-3 text-xs flex flex-col">
                <div class="bg-slate-800/80 p-3 rounded-xl border border-blue-500/10 text-slate-300 max-w-[85%]">
                    Merhaba <b id="chat-username" class="text-blue-400">Kullanıcı</b>, destek hattına hoş geldiniz.
                </div>
            </div>
            <div class="p-3 border-t border-blue-500/20 bg-slate-900/60 flex items-center space-x-2">
                <input type="text" id="chat-input" placeholder="Mesajınızı yazın..." class="flex-grow bg-slate-800/80 border border-blue-500/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                <button onclick="sendChatMessage()" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </div>
    </div>
    <div id="deposit-modal" class="fixed inset-0 z-50 hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-2xl p-6 border border-blue-500/30 relative">
            <button onclick="closeModal('deposit-modal')" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
            <h3 class="text-lg font-bold text-white mb-2">Bakiye Yükleme</h3>
            <div class="bg-slate-900/80 p-4 rounded-xl border border-blue-500/20 mb-4 space-y-2 text-xs">
                <div class="flex justify-between"><span class="text-slate-400">IBAN:</span> <span class="font-mono text-blue-300 font-bold">TR36 0001 0020 3040 5060 7080 90</span></div>
            </div>
            <div class="space-y-4">
                <input type="text" id="deposit-name" placeholder="Gönderen Ad Soyad" class="w-full bg-slate-900/80 border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-white">
                <input type="number" id="deposit-amount" placeholder="Tutar (TL)" class="w-full bg-slate-900/80 border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-white">
                <button onclick="submitDeposit()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs">Bildirim Gönder</button>
            </div>
        </div>
    </div>
    <div id="admin-modal" class="fixed inset-0 z-50 hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-2xl p-6 border border-blue-500/30 relative">
            <button onclick="closeModal('admin-modal')" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
            <div id="admin-login-screen">
                <h3 class="text-lg font-bold text-white mb-2">Yönetici Girişi</h3>
                <input type="password" id="admin-pass-input" placeholder="Şifre..." class="w-full bg-slate-900/80 border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-white mb-4">
                <button onclick="checkAdminLogin()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs">Giriş Yap</button>
            </div>
            <div id="admin-panel-content" class="hidden">
                <h3 class="text-lg font-bold text-white mb-2 text-emerald-400">Yönetici Paneli Aktif</h3>
                <p class="text-xs text-slate-300">Şifre doğrulandı: aklomanti</p>
            </div>
        </div>
    </div>
    <script>
        const products = [
            { id: 1, name: '🇬🇧 İngiltere WhatsApp', price: 200, category: 'WhatsApp', stock: 142 },
            { id: 2, name: '🇵🇭 Filipinler WhatsApp', price: 230, category: 'WhatsApp', stock: 89 },
            { id: 3, name: '🇺🇸 ABD Telegram', price: 200, category: 'Telegram', stock: 310 },
            { id: 4, name: '🇹🇷 Letgo TR SMS', price: 80, category: 'SMS Onay', stock: 520 }
        ];
        let userBalance = 150.00;
        let currentUserName = "Ziyaretçi_" + Math.floor(Math.random() * 1000);

        window.addEventListener('DOMContentLoaded', () => {
            document.getElementById('splash-progress').style.width = '100%';
            document.getElementById('chat-username').innerText = currentUserName;
            renderProducts();
            updateBalanceDisplay();
            setTimeout(() => document.getElementById('splash-screen').remove(), 1000);
            initThreeJS();
        });

        function renderProducts() {
            const grid = document.getElementById('product-grid');
            grid.innerHTML = '';
            products.forEach(p => {
                grid.innerHTML += \`<div class="glass-card rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start mb-3">
                            <span class="bg-blue-600/20 text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">\${p.category}</span>
                            <span class="text-xs text-slate-400">\${p.stock} adet</span>
                        </div>
                        <h3 class="font-bold text-white text-sm mb-2">\${p.name}</h3>
                    </div>
                    <div>
                        <div class="flex items-baseline justify-between mb-4">
                            <span class="text-xs text-slate-400">Fiyat:</span>
                            <span class="text-lg font-extrabold text-blue-400">\${p.price} TL</span>
                        </div>
                        <button onclick="buyProduct(\${p.id})" class="w-full bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 font-semibold py-2 rounded-xl text-xs transition">Satın Al</button>
                    </div>
                </div>\`;
            });
        }

        function updateBalanceDisplay() { document.getElementById('user-balance').innerText = userBalance.toFixed(2) + ' TL'; }
        function buyProduct(id) {
            const product = products.find(p => p.id === id);
            if (userBalance >= product.price) {
                userBalance -= product.price;
                updateBalanceDisplay();
                alert(\`Başarıyla \${product.name} satın alındı!\`);
            } else { alert('Bakiyeniz yetersiz!'); }
        }

        function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
        function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
        function submitDeposit() { alert('Ödeme bildirimi alındı.'); closeModal('deposit-modal'); }
        
        function checkAdminLogin() {
            if (document.getElementById('admin-pass-input').value === 'aklomanti') {
                document.getElementById('admin-login-screen').classList.add('hidden');
                document.getElementById('admin-panel-content').classList.remove('hidden');
            } else { alert('Hatalı şifre!'); }
        }

        function toggleSupportChat() { document.getElementById('support-chat-box').classList.toggle('hidden'); }
        function sendChatMessage() {
            const input = document.getElementById('chat-input');
            if(!input.value) return;
            document.getElementById('chat-messages').innerHTML += \`<div class="bg-blue-600 text-white p-3 rounded-xl ml-auto max-w-[85%]">\${input.value}</div>\`;
            input.value = '';
        }

        function initThreeJS() {
            const container = document.getElementById('canvas-container');
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            container.appendChild(renderer.domElement);
            const geometry = new THREE.BufferGeometry();
            const count = 1000;
            const pos = new Float32Array(count * 3);
            for(let i=0; i<count*3; i++) pos[i] = (Math.random() - 0.5) * 15;
            geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            const material = new THREE.PointsMaterial({ size: 0.025, color: 0x3b82f6, transparent: true, opacity: 0.8 });
            const mesh = new THREE.Points(geometry, material);
            scene.add(mesh);
            camera.position.z = 5;
            function animate() {
                requestAnimationFrame(animate);
                mesh.rotation.y += 0.001;
                renderer.render(scene, camera);
            }
            animate();
        }
    </script>
</body>
</html>`);
});

app.listen(PORT, () => {
    console.log('Sunucu calisiyor, port:', PORT);
});
