<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnkaSMS - Premium SMS Onay Paneli</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- FontAwesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Three.js for 4K/720fps realistic animations -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #030712; color: #f3f4f6; overflow-x: hidden; }
        #canvas-container { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1; pointer-events: none; }
        .glass { background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(59, 130, 246, 0.2); }
        .glass-card { background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(59, 130, 246, 0.15); transition: all 0.3s ease; }
        .glass-card:hover { border-color: rgba(59, 130, 246, 0.5); transform: translateY(-3px); box-shadow: 0 10px 30px -10px rgba(59, 130, 246, 0.3); }
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #030712; }
        ::-webkit-scrollbar-thumb { background: #1e3a8a; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #2563eb; }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white">

    <!-- 3D Arka Plan (Mavi Tema & Gelişmiş Akıcı Parçacıklar) -->
    <div id="canvas-container"></div>

    <!-- Gerçekçi Giriş / Splash Ekranı -->
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

    <!-- Ana Konteyner -->
    <div class="flex-grow flex flex-col">
        <!-- Üst Menü (Navbar) -->
        <header class="glass sticky top-0 z-40 border-b border-blue-900/30 px-6 py-4 flex items-center justify-between">
            <div class="flex items-center space-x-3 cursor-pointer" onclick="switchTab('market')">
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
                <button onclick="openModal('admin-modal')" class="glass px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition" title="Yönetici Paneli">
                    <i class="fa-solid fa-lock text-sm"></i>
                </button>
            </div>
        </header>

        <!-- İçerik Alanı -->
        <main class="max-w-7xl mx-auto px-4 py-8 w-full flex-grow">
            <!-- Ürün Listesi Izgarası -->
            <div class="mb-8">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h2 class="text-xl font-bold text-white flex items-center space-x-2">
                            <i class="fa-solid fa-store text-blue-500"></i>
                            <span>Aktif SMS Onay Servisleri</span>
                        </h2>
                        <p class="text-xs text-slate-400 mt-1">Anlık kod teslimatlı güncel servis listesi</p>
                    </div>
                </div>

                <div id="product-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <!-- Dinamik Ürün Kartları Buraya Gelecek -->
                </div>
            </div>
        </main>
    </div>

    <!-- Canlı Destek Widget (Kullanıcı Adı Özelleştirilmiş) -->
    <div class="fixed bottom-6 right-6 z-40">
        <button onclick="toggleSupportChat()" class="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition border border-blue-400/30 relative">
            <i class="fa-solid fa-headset text-xl"></i>
            <span class="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
        </button>

        <!-- Canlı Destek Penceresi -->
        <div id="support-chat-box" class="hidden absolute bottom-20 right-0 w-80 sm:w-96 glass rounded-2xl shadow-2xl border border-blue-500/30 flex flex-col overflow-hidden">
            <div class="bg-blue-900/40 p-4 border-b border-blue-500/20 flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">AS</div>
                    <div>
                        <h4 class="font-bold text-sm text-white">Anka Destek Ekibi</h4>
                        <span class="text-[10px] text-emerald-400 flex items-center space-x-1">
                            <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                            <span>Çevrim içi</span>
                        </span>
                    </div>
                </div>
                <button onclick="toggleSupportChat()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div id="chat-messages" class="p-4 h-64 overflow-y-auto space-y-3 text-xs flex flex-col">
                <div class="bg-slate-800/80 p-3 rounded-xl rounded-tl-none border border-blue-500/10 text-slate-300 max-w-[85%]">
                    Merhaba <b id="chat-username" class="text-blue-400">Kullanıcı</b>, AnkaSMS canlı destek hattına hoş geldiniz. Size nasıl yardımcı olabilirim?
                </div>
            </div>
            <div class="p-3 border-t border-blue-500/20 bg-slate-900/60 flex items-center space-x-2">
                <input type="text" id="chat-input" placeholder="Mesajınızı yazın..." class="flex-grow bg-slate-800/80 border border-blue-500/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500">
                <button onclick="sendChatMessage()" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-semibold transition"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </div>
    </div>

    <!-- Bakiye Yükleme Modalı (Düzenli Görünüm) -->
    <div id="deposit-modal" class="fixed inset-0 z-50 hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-2xl p-6 border border-blue-500/30 relative">
            <button onclick="closeModal('deposit-modal')" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
            <h3 class="text-lg font-bold text-white mb-2 flex items-center space-x-2">
                <i class="fa-solid fa-wallet text-blue-500"></i>
                <span>Bakiye Yükleme (Ödeme Bildirimi)</span>
            </h3>
            <p class="text-xs text-slate-400 mb-6">Lütfen aşağıdaki IBAN adresine ödemenizi yapıp formu eksiksiz doldurun.</p>
            
            <div class="bg-slate-900/80 p-4 rounded-xl border border-blue-500/20 mb-4 space-y-2">
                <div class="flex justify-between text-xs"><span class="text-slate-400">Banka:</span> <span class="font-semibold text-white">PAPARA / ZİRAAT</span></div>
                <div class="flex justify-between text-xs items-center"><span class="text-slate-400">IBAN / Hesap:</span> <span class="font-mono text-blue-300 font-bold">TR36 0001 0020 3040 5060 7080 90</span></div>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Gönderen Ad Soyad</label>
                    <input type="text" id="deposit-name" placeholder="Adınız Soyadınız" class="w-full bg-slate-900/80 border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Yatırılan Tutar (TL)</label>
                    <input type="number" id="deposit-amount" placeholder="Örn: 150" class="w-full bg-slate-900/80 border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500">
                </div>
                <button onclick="submitDeposit()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-blue-600/30">Ödeme Bildirimi Gönder</button>
            </div>
        </div>
    </div>

    <!-- Admin Paneli Giriş / Kontrol Modalı (Şifre: aklomanti) -->
    <div id="admin-modal" class="fixed inset-0 z-50 hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-2xl p-6 border border-blue-500/30 relative">
            <button onclick="closeModal('admin-modal')" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
            
            <div id="admin-login-screen">
                <h3 class="text-lg font-bold text-white mb-2 flex items-center space-x-2">
                    <i class="fa-solid fa-lock text-blue-500"></i>
                    <span>Yönetici Paneli Girişi</span>
                </h3>
                <p class="text-xs text-slate-400 mb-6">Devam etmek için yönetici şifresini girin.</p>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Yönetici Şifresi</label>
                        <input type="password" id="admin-pass-input" placeholder="Şifrenizi girin..." class="w-full bg-slate-900/80 border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500">
                    </div>
                    <button onclick="checkAdminLogin()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-blue-600/30">Giriş Yap</button>
                </div>
            </div>

            <div id="admin-panel-content" class="hidden">
                <h3 class="text-lg font-bold text-white mb-2 flex items-center space-x-2">
                    <i class="fa-solid fa-shield-halved text-emerald-400"></i>
                    <span>Yönetici Kontrol Paneli</span>
                </h3>
                <p class="text-xs text-slate-400 mb-6">Sistem durumunu ve bekleyen bildirimleri yönetin.</p>
                <div class="space-y-3">
                    <div class="bg-slate-900/80 p-3 rounded-xl border border-blue-500/20 flex justify-between items-center text-xs">
                        <span class="text-slate-300">Bekleyen Ödeme Bildirimi:</span>
                        <span class="font-bold text-emerald-400">1 Adet</span>
                    </div>
                    <div class="bg-slate-900/80 p-3 rounded-xl border border-blue-500/20 flex justify-between items-center text-xs">
                        <span class="text-slate-300">Aktif Servis Durumu:</span>
                        <span class="font-bold text-blue-400">Çevrim içi (%100)</span>
                    </div>
                    <button onclick="alert('Tüm sistem ayarları güncel ve aktif.')" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition">Sistemi Optimize Et</button>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript Kodları -->
    <script>
        // Ürün Listesi (İstediğin Fiyat ve İsim Düzenlemeleriyle)
        const products = [
            { id: 1, name: '🇬🇧 İngiltere WhatsApp', price: 200, category: 'WhatsApp', stock: 142 },
            { id: 2, name: '🇵🇭 Filipinler WhatsApp', price: 230, category: 'WhatsApp', stock: 89 },
            { id: 3, name: '🇺🇸 ABD Telegram', price: 200, category: 'Telegram', stock: 310 },
            { id: 4, name: '🇹🇷 Letgo TR SMS', price: 80, category: 'SMS Onay', stock: 520 }
        ];

        let userBalance = 150.00;
        let currentUserName = "Ziyaretçi_" + Math.floor(Math.random() * 1000);

        // Sayfa Yüklenme ve Splash Animasyonu
        window.addEventListener('DOMContentLoaded', () => {
            const progress = document.getElementById('splash-progress');
            progress.style.width = '100%';
            
            document.getElementById('chat-username').innerText = currentUserName;
            renderProducts();
            updateBalanceDisplay();

            setTimeout(() => {
                const splash = document.getElementById('splash-screen');
                splash.style.opacity = '0';
                setTimeout(() => splash.remove(), 700);
            }, 1000);

            initThreeJS();
        });

        // Ürünleri Ekrana Basma
        function renderProducts() {
            const grid = document.getElementById('product-grid');
            grid.innerHTML = '';
            products.forEach(p => {
                grid.innerHTML += `
                    <div class="glass-card rounded-2xl p-5 flex flex-col justify-between">
                        <div>
                            <div class="flex justify-between items-start mb-3">
                                <span class="bg-blue-600/20 text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-blue-500/30">${p.category}</span>
                                <span class="text-xs text-slate-400"><i class="fa-solid fa-box-archive mr-1"></i>${p.stock} adet</span>
                            </div>
                            <h3 class="font-bold text-white text-sm mb-2">${p.name}</h3>
                        </div>
                        <div>
                            <div class="flex items-baseline justify-between mb-4">
                                <span class="text-xs text-slate-400">Fiyat:</span>
                                <span class="text-lg font-extrabold text-blue-400">${p.price} TL</span>
                            </div>
                            <button onclick="buyProduct(${p.id})" class="w-full bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 font-semibold py-2 rounded-xl text-xs transition duration-300">
                                Satın Al
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        function updateBalanceDisplay() {
            document.getElementById('user-balance').innerText = userBalance.toFixed(2) + ' TL';
        }

        // Satın Alma Mantığı
        function buyProduct(id) {
            const product = products.find(p => p.id === id);
            if (userBalance >= product.price) {
                userBalance -= product.price;
                updateBalanceDisplay();
                alert(`Başarıyla ${product.name} satın alındı! Kodunuz panelinize tanımlandı.`);
            } else {
                alert('Bakiyeniz yetersiz! Lütfen bakiye yükleyin.');
            }
        }

        // Modal Kontrolleri
        function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
        function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

        // Bakiye Bildirim Gönderimi
        function submitDeposit() {
            const name = document.getElementById('deposit-name').value;
            const amount = document.getElementById('deposit-amount').value;
            if(!name || !amount) {
                alert('Lütfen tüm alanları doldurun.');
                return;
            }
            alert(`Sayın ${name}, ${amount} TL tutarındaki ödeme bildiriminiz alınmıştır. Kontrol sonrası bakiyeniz yüklenecektir.`);
            closeModal('deposit-modal');
        }

        // Admin Giriş Kontrolü (Şifre: aklomanti)
        function checkAdminLogin() {
            const pass = document.getElementById('admin-pass-input').value;
            if (pass === 'aklomanti') {
                document.getElementById('admin-login-screen').classList.add('hidden');
                document.getElementById('admin-panel-content').classList.remove('hidden');
            } else {
                alert('Hatalı şifre! (İpucu: aklomanti)');
            }
        }

        // Canlı Destek Widget Fonksiyonları
        function toggleSupportChat() {
            const box = document.getElementById('support-chat-box');
            box.classList.toggle('hidden');
        }

        function sendChatMessage() {
            const input = document.getElementById('chat-input');
            const msg = input.value.trim();
            if(!msg) return;

            const chatMessages = document.getElementById('chat-messages');
            chatMessages.innerHTML += `
                <div class="bg-blue-600 text-white p-3 rounded-xl rounded-tr-none ml-auto max-w-[85%]">
                    ${msg}
                </div>
            `;
            input.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;

            setTimeout(() => {
                chatMessages.innerHTML += `
                    <div class="bg-slate-800/80 p-3 rounded-xl rounded-tl-none border border-blue-500/10 text-slate-300 max-w-[85%]">
                        Talebiniz alınmıştır ${currentUserName}, müşteri temsilcimiz birazdan sizinle ilgilenecektir.
                    </div>
                `;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1000);
        }

        // Three.js 4K/720fps Akıcı Mavi Parçacık Animasyonu
        function initThreeJS() {
            const container = document.getElementById('canvas-container');
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.appendChild(renderer.domElement);

            const particlesGeometry = new THREE.BufferGeometry();
            const particlesCount = 1200;
            const posArray = new Float32Array(particlesCount * 3);

            for(let i = 0; i < particlesCount * 3; i++) {
                posArray[i] = (Math.random() - 0.5) * 15;
            }

            particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

            const particlesMaterial = new THREE.PointsMaterial({
                size: 0.025,
                color: 0x3b82f6,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });

            const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
            scene.add(particlesMesh);

            camera.position.z = 5;

            let mouseX = 0;
            let mouseY = 0;

            window.addEventListener('mousemove', (event) => {
                mouseX = event.clientX / window.innerWidth - 0.5;
                mouseY = event.clientY / window.innerHeight - 0.5;
            });

            const clock = new THREE.Clock();

            function animate() {
                requestAnimationFrame(animate);
                const elapsedTime = clock.getElapsedTime();

                particlesMesh.rotation.y = elapsedTime * 0.05 + mouseX * 0.3;
                particlesMesh.rotation.x = elapsedTime * 0.03 + mouseY * 0.3;

                renderer.render(scene, camera);
            }
            animate();

            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });
        }
    </script>
</body>
</html>
