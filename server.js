<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profesyonel SMS Onay Paneli</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col">

    <!-- Top Navigation Bar -->
    <header class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <div class="bg-indigo-600 p-2 rounded-lg text-white font-bold text-xl shadow-lg shadow-indigo-500/30">
                    <i class="fa-solid fa-shield-halved"></i>
                </div>
                <div>
                    <h1 class="font-bold text-lg tracking-tight text-white">SMSOnay <span class="text-indigo-400 text-xs px-2 py-0.5 bg-indigo-950 border border-indigo-800 rounded-full">PRO v2.5</span></h1>
                </div>
            </div>
            
            <div class="flex items-center space-x-4">
                <div class="hidden md:flex items-center space-x-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700">
                    <span class="text-xs text-slate-400">Bakiye:</span>
                    <span id="headerBalance" class="font-bold text-emerald-400">₺1,450.00</span>
                    <button onclick="openModal('depositModal')" class="ml-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1 rounded transition">Yükle</button>
                </div>
                
                <div class="relative">
                    <button onclick="toggleUserMenu()" class="flex items-center space-x-2 focus:outline-none">
                        <div class="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center font-semibold text-white shadow">
                            A
                        </div>
                        <span class="hidden sm:inline text-sm font-medium">Admin User</span>
                        <i class="fa-solid fa-chevron-down text-xs text-slate-400"></i>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Main App Wrapper -->
    <div class="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 gap-6">
        
        <!-- Sidebar Navigation -->
        <aside class="w-full md:w-64 space-y-2">
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
                <button onclick="switchTab('dashboard')" id="nav-dashboard" class="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                    <i class="fa-solid fa-chart-pie w-5"></i>
                    <span>Genel Bakış</span>
                </button>
                <button onclick="switchTab('services')" id="nav-services" class="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-slate-400 hover:bg-slate-800 hover:text-white">
                    <i class="fa-solid fa-globe w-5"></i>
                    <span>Numara Satın Al</span>
                </button>
                <button onclick="switchTab('active')" id="nav-active" class="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-slate-400 hover:bg-slate-800 hover:text-white">
                    <i class="fa-solid fa-clock-rotate-left w-5"></i>
                    <span>Aktif İşlemler</span>
                    <span id="activeCountBadge" class="ml-auto bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">0</span>
                </button>
                <button onclick="switchTab('history')" id="nav-history" class="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-slate-400 hover:bg-slate-800 hover:text-white">
                    <i class="fa-solid fa-receipt w-5"></i>
                    <span>Geçmiş Kodlar</span>
                </button>
                <button onclick="switchTab('api')" id="nav-api" class="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-slate-400 hover:bg-slate-800 hover:text-white">
                    <i class="fa-solid fa-code w-5"></i>
                    <span>API & Entegrasyon</span>
                </button>
            </div>

            <!-- Quick Stats Card -->
            <div class="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-900/40 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between">
                    <span class="text-xs text-indigo-300 font-medium">Hızlı Destek</span>
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <p class="text-xs text-slate-300">7/24 Canlı destek ve API yardımı için ekibimiz hazır.</p>
                <button onclick="openSupportModal()" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded-lg transition font-medium">Destek Talebi Aç</button>
            </div>
        </aside>

        <!-- Main Content Area -->
        <main class="flex-1 space-y-6">

            <!-- TAB 1: DASHBOARD -->
            <div id="tab-dashboard" class="space-y-6">
                <!-- Metrics Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-slate-400">Toplam Harcama</span>
                            <div class="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><i class="fa-solid fa-wallet"></i></div>
                        </div>
                        <div class="mt-4 flex items-baseline">
                            <span class="text-2xl font-bold text-white">₺3,840.50</span>
                            <span class="ml-2 text-xs text-emerald-400 font-medium">+%12 bu ay</span>
                        </div>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-slate-400">Alınan SMS Sayısı</span>
                            <div class="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><i class="fa-solid fa-envelope-circle-check"></i></div>
                        </div>
                        <div class="mt-4 flex items-baseline">
                            <span class="text-2xl font-bold text-white" id="totalSmsCount">142</span>
                            <span class="ml-2 text-xs text-emerald-400 font-medium">+8 bugün</span>
                        </div>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-slate-400">Başarı Oranı</span>
                            <div class="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><i class="fa-solid fa-chart-line"></i></div>
                        </div>
                        <div class="mt-4 flex items-baseline">
                            <span class="text-2xl font-bold text-white">%98.4</span>
                            <span class="ml-2 text-xs text-emerald-400 font-medium">Stabil</span>
                        </div>
                    </div>
                </div>

                <!-- Chart & Activity Section -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
                        <h2 class="text-sm font-semibold text-white mb-4">Harcama Grafiği (Son 7 Gün)</h2>
                        <div class="flex-1 relative min-h-[240px]">
                            <canvas id="spendingChart"></canvas>
                        </div>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
                        <h2 class="text-sm font-semibold text-white mb-4">Son Bildirimler</h2>
                        <div class="space-y-3 flex-1 overflow-y-auto max-h-[260px] text-xs">
                            <div class="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                <span class="text-indigo-400 font-medium">Sistem Güncellemesi</span>
                                <p class="text-slate-300 mt-1">ABD operatör altyapısı yenilendi, başarı oranı artırıldı.</p>
                                <span class="text-[10px] text-slate-500 mt-2 block">2 saat önce</span>
                            </div>
                            <div class="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                <span class="text-emerald-400 font-medium">Bakiye Eklendi</span>
                                <p class="text-slate-300 mt-1">Hesabınıza ₺500.00 başarıyla tanımlandı.</p>
                                <span class="text-[10px] text-slate-500 mt-2 block">1 gün önce</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB 2: SERVICES / BUY NUMBER -->
            <div id="tab-services" class="hidden space-y-6">
                <!-- Search & Filters -->
                <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div class="relative w-full sm:w-80">
                        <i class="fa-solid fa-search absolute left-3 top-3 text-slate-500"></i>
                        <input type="text" id="serviceSearch" onkeyup="filterServices()" placeholder="Servis ara (örn: WhatsApp, Telegram)..." class="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                    </div>
                    <div class="flex items-center space-x-3 w-full sm:w-auto">
                        <select id="countryFilter" onchange="filterServices()" class="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-full sm:w-auto">
                            <option value="all">Tüm Ülkeler</option>
                            <option value="tr">Türkiye (+90)</option>
                            <option value="us">Amerika (+1)</option>
                            <option value="gb">İngiltere (+44)</option>
                            <option value="de">Almanya (+49)</option>
                        </select>
                    </div>
                </div>

                <!-- Services Grid -->
                <div id="servicesGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Populated via JavaScript -->
                </div>
            </div>

            <!-- TAB 3: ACTIVE OPERATIONS -->
            <div id="tab-active" class="hidden space-y-6">
                <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h2 class="text-sm font-semibold text-white mb-4">Aktif Bekleyen Numaralar</h2>
                    <div id="activeNumbersList" class="space-y-4">
                        <div class="text-center py-12 text-slate-500 text-sm">
                            <i class="fa-solid fa-inbox text-3xl mb-2"></i>
                            <p>Aktif bekleyen numaranız bulunmuyor.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB 4: HISTORY -->
            <div id="tab-history" class="hidden space-y-6">
                <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h2 class="text-sm font-semibold text-white mb-4">Geçmiş SMS İşlemleri</h2>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm text-slate-300">
                            <thead class="bg-slate-800/50 text-xs text-slate-400 uppercase border-b border-slate-800">
                                <tr>
                                    <th class="p-3">Servis</th>
                                    <th class="p-3">Numara</th>
                                    <th class="p-3">Kod</th>
                                    <th class="p-3">Tutar</th>
                                    <th class="p-3">Durum</th>
                                    <th class="p-3">Tarih</th>
                                </tr>
                            </thead>
                            <tbody id="historyTableBody" class="divide-y divide-slate-800">
                                <!-- Populated dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- TAB 5: API -->
            <div id="tab-api" class="hidden space-y-6">
                <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <h2 class="text-lg font-semibold text-white">API Entegrasyon Bilgileri</h2>
                    <p class="text-sm text-slate-400">Otomatik numara çekmek ve onay kodu almak için aşağıdaki API anahtarınızı kullanabilirsiniz.</p>
                    
                    <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-medium">API Token</label>
                        <div class="flex items-center space-x-2">
                            <input type="password" value="sms_live_9983a71bc99482753a" readonly class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-indigo-400 font-mono">
                            <button onclick="alert('API Anahtarı kopyalandı!')" class="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition">Kopyala</button>
                        </div>
                    </div>

                    <div class="pt-4 border-t border-slate-800 space-y-2">
                        <h3 class="text-sm font-semibold text-white">Örnek cURL İstegi</h3>
                        <pre class="bg-slate-950 p-4 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800">curl -X GET "https://api.smsonaypro.com/v1/getNumber?service=whatsapp&country=tr" \
-H "Authorization: Bearer sms_live_9983a71bc99482753a"</pre>
                    </div>
                </div>
            </div>

        </main>
    </div>

    <!-- Deposit Modal -->
    <div id="depositModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm hidden items-center justify-center z-50 p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div class="flex justify-between items-center">
                <h3 class="text-base font-semibold text-white">Bakiye Yükle</h3>
                <button onclick="closeModal('depositModal')" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="text-xs text-slate-400">Yüklenecek Tutar (TL)</label>
                    <input type="number" id="depositAmount" value="200" class="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <button onclick="setDeposit(100)" class="bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded-lg border border-slate-700">₺100</button>
                    <button onclick="setDeposit(500)" class="bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded-lg border border-slate-700">₺500</button>
                    <button onclick="setDeposit(1000)" class="bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded-lg border border-slate-700">₺1000</button>
                </div>
            </div>
            <div class="pt-4 flex justify-end space-x-3">
                <button onclick="closeModal('depositModal')" class="bg-slate-800 hover:bg-slate-700 text-xs px-4 py-2 rounded-lg">İptal</button>
                <button onclick="processDeposit()" class="bg-indigo-600 hover:bg-indigo-500 text-xs px-4 py-2 rounded-lg font-medium text-white">Ödeme Yap</button>
            </div>
        </div>
    </div>

    <!-- Support Modal -->
    <div id="supportModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm hidden items-center justify-center z-50 p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div class="flex justify-between items-center">
                <h3 class="text-base font-semibold text-white">Destek Talebi Oluştur</h3>
                <button onclick="closeModal('supportModal')" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="text-xs text-slate-400">Konu</label>
                    <input type="text" placeholder="Örn: Kod gelmedi iade talebi" class="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                </div>
                <div>
                    <label class="text-xs text-slate-400">Mesajınız</label>
                    <textarea rows="3" placeholder="Detayları açıklayın..." class="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"></textarea>
                </div>
            </div>
            <div class="pt-4 flex justify-end space-x-3">
                <button onclick="closeModal('supportModal')" class="bg-slate-800 hover:bg-slate-700 text-xs px-4 py-2 rounded-lg">İptal</button>
                <button onclick="submitSupport()" class="bg-indigo-600 hover:bg-indigo-500 text-xs px-4 py-2 rounded-lg font-medium text-white">Gönder</button>
            </div>
        </div>
    </div>

    <!-- JavaScript Application Logic -->
    <script>
        let balance = 1450.00;
        let activeOperations = [];
        let historyRecords = [
            { service: 'WhatsApp', country: 'TR', number: '+90 555 123 45 67', code: '482910', price: '₺12.50', status: 'Tamamlandı', date: '29.09.2026 14:20' },
            { service: 'Telegram', country: 'US', number: '+1 202 555 0192', code: '9921', price: '₺8.00', status: 'Tamamlandı', date: '29.09.2026 12:10' }
        ];

        const servicesData = [
            { id: 1, name: 'WhatsApp', category: 'Mesajlaşma', price: 12.50, country: 'tr', flag: '🇹🇷', stock: 1420 },
            { id: 2, name: 'Telegram', category: 'Mesajlaşma', price: 8.00, country: 'us', flag: '🇺🇸', stock: 850 },
            { id: 3, name: 'Google / Gmail', category: 'Doğrulama', price: 6.50, country: 'tr', flag: '🇹🇷', stock: 3200 },
            { id: 4, name: 'Instagram', category: 'Sosyal Medya', price: 10.00, country: 'gb', flag: '🇬🇧', stock: 610 },
            { id: 5, name: 'TikTok', category: 'Sosyal Medya', price: 7.50, country: 'de', flag: '🇩🇪', stock: 430 },
            { id: 6, name: 'Twitter / X', category: 'Sosyal Medya', price: 9.00, country: 'us', flag: '🇺🇸', stock: 920 },
            { id: 7, name: 'Discord', category: 'Oyun & Sohbet', price: 5.00, country: 'tr', flag: '🇹🇷', stock: 1150 },
            { id: 8, name: 'Netflix', category: 'Eğlence', price: 15.00, country: 'us', flag: '🇺🇸', stock: 120 }
        ];

        function switchTab(tabId) {
            ['dashboard', 'services', 'active', 'history', 'api'].forEach(t => {
                document.getElementById(`tab-${t}`).classList.add('hidden');
                document.getElementById(`nav-${t}`).className = "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-slate-400 hover:bg-slate-800 hover:text-white";
            });
            document.getElementById(`tab-${tabId}`).classList.remove('hidden');
            document.getElementById(`nav-${tabId}`).className = "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition bg-indigo-600 text-white shadow-md shadow-indigo-600/20";
        }

        function renderServices(items) {
            const grid = document.getElementById('servicesGrid');
            grid.innerHTML = items.map(s => `
                <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center space-x-2">
                            <span class="text-xl">${s.flag}</span>
                            <div>
                                <h3 class="text-sm font-semibold text-white">${s.name}</h3>
                                <span class="text-[10px] text-slate-400">${s.category}</span>
                            </div>
                        </div>
                        <span class="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded-full">${s.stock} stok</span>
                    </div>
                    <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80">
                        <div>
                            <span class="text-[10px] text-slate-400 block">Fiyat</span>
                            <span class="text-sm font-bold text-emerald-400">₺${s.price.toFixed(2)}</span>
                        </div>
                        <button onclick="buyNumber('${s.name}', ${s.price}, '${s.flag}')" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-2 rounded-lg transition font-medium">Numara Al</button>
                    </div>
                </div>
            `).join('');
        }

        function filterServices() {
            const query = document.getElementById('serviceSearch').value.toLowerCase();
            const country = document.getElementById('countryFilter').value;
            const filtered = servicesData.filter(s => {
                const matchQuery = s.name.toLowerCase().includes(query) || s.category.toLowerCase().includes(query);
                const matchCountry = country === 'all' || s.country === country;
                return matchQuery && matchCountry;
            });
            renderServices(filtered);
        }

        function buyNumber(serviceName, price, flag) {
            if (balance < price) {
                alert('Yetersiz bakiye! Lütfen bakiye yükleyin.');
                openModal('depositModal');
                return;
            }
            balance -= price;
            updateBalanceDisplay();

            const randomNum = `${flag} +90 5${Math.floor(Math.random()*90+10)} ${Math.floor(Math.random()*900+100)} ${Math.floor(Math.random()*90+10)} ${Math.floor(Math.random()*90+10)}`;
            const newOp = {
                id: Date.now(),
                service: serviceName,
                number: randomNum,
                price: `₺${price.toFixed(2)}`,
                code: 'Bekleniyor...',
                timeRemaining: 120,
                status: 'Bekliyor'
            };

            activeOperations.push(newOp);
            updateActiveBadge();
            renderActiveOperations();
            switchTab('active');
        }

        function renderActiveOperations() {
            const container = document.getElementById('activeNumbersList');
            if (activeOperations.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12 text-slate-500 text-sm">
                        <i class="fa-solid fa-inbox text-3xl mb-2"></i>
                        <p>Aktif bekleyen numaranız bulunmuyor.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = activeOperations.map(op => `
                <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div class="space-y-1">
                        <div class="flex items-center space-x-2">
                            <span class="text-sm font-semibold text-white">${op.service}</span>
                            <span class="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-medium">Kod Bekleniyor</span>
                        </div>
                        <div class="font-mono text-indigo-400 text-sm">${op.number}</div>
                    </div>
                    <div class="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div class="text-right">
                            <span class="text-xs text-slate-400 block">Gelen Kod</span>
                            <span class="text-sm font-mono font-bold text-emerald-400 bg-slate-900 px-3 py-1 rounded border border-slate-800">${op.code}</span>
                        </div>
                        <button onclick="cancelOperation(${op.id})" class="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs px-3 py-2 rounded-lg transition border border-rose-800/40">İptal Et</button>
                    </div>
                </div>
            `).join('');
        }

        function cancelOperation(id) {
            activeOperations = activeOperations.filter(op => op.id !== id);
            updateActiveBadge();
            renderActiveOperations();
        }

        function updateActiveBadge() {
            document.getElementById('activeCountBadge').innerText = activeOperations.length;
        }

        function updateBalanceDisplay() {
            document.getElementById('headerBalance').innerText = `₺${balance.toFixed(2)}`;
        }

        function openModal(id) { document.getElementById(id).classList.remove('hidden'); document.getElementById(id).classList.add('flex'); }
        function closeModal(id) { document.getElementById(id).classList.add('hidden'); document.getElementById(id).classList.remove('flex'); }
        function setDeposit(amount) { document.getElementById('depositAmount').value = amount; }
        function processDeposit() {
            const amt = parseFloat(document.getElementById('depositAmount').value);
            if (amt > 0) {
                balance += amt;
                updateBalanceDisplay();
                closeModal('depositModal');
                alert(`₺${amt.toFixed(2)} başarıyla eklendi!`);
            }
        }
        function submitSupport() {
            closeModal('supportModal');
            alert('Destek talebiniz alındı. En kısa sürede dönüş yapılacaktır.');
        }

        function renderHistory() {
            const tbody = document.getElementById('historyTableBody');
            tbody.innerHTML = historyRecords.map(h => `
                <tr class="border-b border-slate-800 hover:bg-slate-800/30">
                    <td class="p-3 font-medium text-white">${h.service} (${h.country})</td>
                    <td class="p-3 font-mono text-slate-300">${h.number}</td>
                    <td class="p-3 font-mono text-emerald-400">${h.code}</td>
                    <td class="p-3 text-slate-300">${h.price}</td>
                    <td class="p-3"><span class="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full">${h.status}</span></td>
                    <td class="p-3 text-slate-500 text-xs">${h.date}</td>
                </tr>
            `).join('');
        }

        // Initialize Chart
        window.addEventListener('DOMContentLoaded', () => {
            renderServices(servicesData);
            renderHistory();

            const ctx = document.getElementById('spendingChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
                    datasets: [{
                        label: 'Harcama (TL)',
                        data: [240, 450, 310, 520, 680, 410, 830],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b' } },
                        y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b' } }
                    }
                }
            });
        });
    </script>
</body>
</html>
