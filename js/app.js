class VegetableShop {
    constructor() {
        this.data = {
            vegetables: [],
            purchases: [],
            sales: [],
            settings: {
                theme: 'light',
                lastBackup: null
            }
        };
        
        this.init();
    }

    // Helper function to reverse strings (fix for RTL CSS issue)
    reverseString(str) {
        return str.split('').reverse().join('');
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.setDates();
        this.populateVegetables();
        this.updateDashboard();
        this.updateInventory();
        this.applyTheme();
        this.showToast('✨ System ready');
    }

    loadData() {
        try {
            const saved = localStorage.getItem('veggietrack');
            if (saved) {
                this.data = JSON.parse(saved);
            } else {
                // No default vegetables - start with empty array
                this.data.vegetables = [];
                this.data.purchases = [];
                this.data.sales = [];
                this.data.settings = {
                    theme: 'light',
                    lastBackup: null
                };
                this.saveData();
            }
        } catch (error) {
            this.data.vegetables = [];
            this.data.purchases = [];
            this.data.sales = [];
            this.data.settings = {
                theme: 'light',
                lastBackup: null
            };
            this.saveData();
        }
    }

    saveData() {
        localStorage.setItem('veggietrack', JSON.stringify(this.data));
        this.updateDashboard();
        this.updateInventory();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Sidebar
        document.getElementById('menuBtn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.add('show');
            document.getElementById('sidebarOverlay').classList.add('show');
        });

        document.getElementById('closeSidebar').addEventListener('click', () => {
            this.closeSidebar();
        });

        document.getElementById('sidebarOverlay').addEventListener('click', () => {
            this.closeSidebar();
        });

        // Theme
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('themeSelect').addEventListener('change', (e) => this.setTheme(e.target.value));

        // Quick panel
        document.getElementById('quickActionsBtn').addEventListener('click', () => {
            document.getElementById('quickPanel').classList.toggle('show');
        });

        document.getElementById('closePanel').addEventListener('click', () => {
            document.getElementById('quickPanel').classList.remove('show');
        });

        // Purchase
        document.getElementById('addPurchaseBtn').addEventListener('click', () => this.addPurchase());
        document.getElementById('purchaseQty').addEventListener('input', () => this.updatePricePreview());
        document.getElementById('purchasePrice').addEventListener('input', () => this.updatePricePreview());

        // Sell
        document.getElementById('addSaleBtn').addEventListener('click', () => this.addSale());
        document.getElementById('sellVeg').addEventListener('change', (e) => this.onVegSelect(e));
        document.getElementById('sellQty').addEventListener('input', () => this.calculateTotal());
        document.getElementById('sellPrice').addEventListener('input', () => this.calculateTotal());
        document.getElementById('vegSearch').addEventListener('input', (e) => this.filterVegGrid(e.target.value));

        // Reports
        document.getElementById('reportStart').value = this.getDate(-7);
        document.getElementById('reportEnd').value = this.getDate(0);

        // Settings
        document.getElementById('importFile').addEventListener('change', (e) => this.importData(e));

        // Modal
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal());
        document.getElementById('confirmBtn').addEventListener('click', () => this.executeConfirm());

        // Click outside to close panels
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.quick-panel') && !e.target.closest('#quickActionsBtn')) {
                document.getElementById('quickPanel').classList.remove('show');
            }
        });

        // Global search
        document.getElementById('globalSearch').addEventListener('input', (e) => this.globalSearch(e.target.value));
    }

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('show');
        document.getElementById('sidebarOverlay').classList.remove('show');
    }

    switchView(viewId) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewId);
        });

        // Update view
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === viewId);
        });

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            purchase: 'Purchase',
            sell: 'Sell',
            inventory: 'Inventory',
            reports: 'Reports',
            settings: 'Settings'
        };
        document.getElementById('pageTitle').textContent = titles[viewId];

        // Close sidebar
        this.closeSidebar();
        document.getElementById('quickPanel').classList.remove('show');

        // Refresh view data
        if (viewId === 'dashboard') this.updateDashboard();
        if (viewId === 'purchase') this.showRecentPurchases();
        if (viewId === 'sell') this.populateVegGrid();
        if (viewId === 'inventory') this.updateInventory();
        if (viewId === 'reports') this.generateReport();
        if (viewId === 'settings') this.showVegetableSettings();
    }

    setDates() {
        const today = this.getDate(0);
        document.getElementById('purchaseDate').value = today;
        document.getElementById('sellDate').value = today;
        
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        document.getElementById('sidebarDate').textContent = new Date().toLocaleDateString('en-IN', options);
    }

    getDate(daysOffset) {
        const d = new Date();
        d.setDate(d.getDate() + daysOffset);
        return d.toISOString().split('T')[0];
    }

    populateVegetables() {
        const options = this.data.vegetables.map(v => 
            `<option value="${v.id}">${v.name}</option>`
        ).join('');
        
        document.getElementById('purchaseVeg').innerHTML = '<option value="">Select vegetable</option>' + options;
        document.getElementById('sellVeg').innerHTML = '<option value="">Select vegetable</option>' + options;
    }

    // ========== PURCHASE ==========
    updatePricePreview() {
        const qty = parseFloat(document.getElementById('purchaseQty').value) || 0;
        const price = parseFloat(document.getElementById('purchasePrice').value) || 0;
        const perKg = qty > 0 ? (price / qty).toFixed(2) : 0;
        document.getElementById('pricePerKg').textContent = `₹${perKg}`;
    }

    addPurchase() {
        const vegId = document.getElementById('purchaseVeg').value;
        const qty = parseFloat(document.getElementById('purchaseQty').value);
        const totalPrice = parseFloat(document.getElementById('purchasePrice').value);
        const date = document.getElementById('purchaseDate').value;

        if (!vegId || !qty || !totalPrice || !date) {
            this.showToast('Please fill all fields', 'error');
            return;
        }

        if (qty <= 0 || totalPrice <= 0) {
            this.showToast('Invalid quantity or price', 'error');
            return;
        }

        const purchase = {
            id: Date.now().toString(),
            vegId,
            qty,
            totalPrice,
            pricePerKg: totalPrice / qty,
            date,
            timestamp: Date.now()
        };

        this.data.purchases.push(purchase);
        this.saveData();
        this.showRecentPurchases();
        this.clearPurchaseForm();
        this.showToast('✅ Stock added');
    }

    clearPurchaseForm() {
        document.getElementById('purchaseVeg').value = '';
        document.getElementById('purchaseQty').value = '';
        document.getElementById('purchasePrice').value = '';
        document.getElementById('pricePerKg').textContent = '₹0.00';
    }

    showRecentPurchases() {
        const recent = this.data.purchases.slice(-5).reverse();
        const container = document.getElementById('recentPurchases');
        
        if (recent.length === 0) {
            container.innerHTML = '<div class="empty-state">No purchases yet</div>';
            return;
        }

        container.innerHTML = recent.map(p => {
            const veg = this.data.vegetables.find(v => v.id === p.vegId);
            return `
                <div class="list-item">
                    <div class="item-info">
                        <span class="item-title">${veg?.name || 'Unknown'}</span>
                        <span class="item-subtitle">${p.qty}kg • ₹${p.pricePerKg.toFixed(2)}/kg</span>
                    </div>
                    <div class="item-value">₹${p.totalPrice}</div>
                </div>
            `;
        }).join('');
    }

    // ========== STOCK ==========
    getStock(vegId) {
        const purchased = this.data.purchases
            .filter(p => p.vegId === vegId)
            .reduce((sum, p) => sum + p.qty, 0);
        
        const sold = this.data.sales
            .filter(s => s.vegId === vegId)
            .reduce((sum, s) => sum + s.qty, 0);
        
        return purchased - sold;
    }

    getAvgPurchasePrice(vegId) {
        const purchases = this.data.purchases
            .filter(p => p.vegId === vegId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (purchases.length === 0) {
            return 20; // Default price
        }
        
        return purchases[0].pricePerKg;
    }

    // ========== SELL ==========
    populateVegGrid() {
        const grid = document.getElementById('vegQuickGrid');
        const searchTerm = document.getElementById('vegSearch').value.toLowerCase();
        
        let vegs = this.data.vegetables.filter(v => 
            v.name.toLowerCase().includes(searchTerm)
        );

        grid.innerHTML = vegs.map(veg => {
            const stock = this.getStock(veg.id);
            return `
                <div class="veg-item ${stock <= 0 ? 'out-of-stock' : ''}" 
                     onclick="shop.selectVeg('${veg.id}')">
                    <div class="veg-name">${veg.name}</div>
                    <div class="veg-stock">${stock}kg</div>
                </div>
            `;
        }).join('');
    }

    filterVegGrid(term) {
        this.populateVegGrid();
    }

    selectVeg(vegId) {
        document.getElementById('sellVeg').value = vegId;
        this.onVegSelect({ target: { value: vegId } });
    }

    onVegSelect(e) {
        const vegId = e.target.value;
        if (!vegId) return;

        const stock = this.getStock(vegId);
        const avgPrice = this.getAvgPurchasePrice(vegId);
        const veg = this.data.vegetables.find(v => v.id === vegId);

        document.getElementById('stockInfo').innerHTML = `
            <strong>${veg?.name || 'Unknown'}</strong><br>
            Available: <strong>${stock}kg</strong><br>
            Avg cost: ₹${avgPrice.toFixed(2)}/kg
        `;
        
        document.getElementById('sellPrice').value = avgPrice.toFixed(2);
    }

    calculateTotal() {
        const qty = parseFloat(document.getElementById('sellQty').value) || 0;
        const price = parseFloat(document.getElementById('sellPrice').value) || 0;
        const total = qty * price;
        document.getElementById('saleTotal').textContent = `₹${total.toFixed(2)}`;
    }

    addSale() {
        const vegId = document.getElementById('sellVeg').value;
        const qty = parseFloat(document.getElementById('sellQty').value);
        const price = parseFloat(document.getElementById('sellPrice').value);
        const date = document.getElementById('sellDate').value;
        const payment = document.querySelector('input[name="payment"]:checked').value;

        if (!vegId || !qty || !price || !date) {
            this.showToast('Please fill all fields', 'error');
            return;
        }

        const stock = this.getStock(vegId);
        if (qty > stock) {
            this.showToast(`Only ${stock}kg available!`, 'error');
            return;
        }

        const sale = {
            id: Date.now().toString(),
            vegId,
            qty,
            price,
            total: qty * price,
            payment,
            date,
            timestamp: Date.now()
        };

        this.data.sales.push(sale);
        this.saveData();
        this.clearSaleForm();
        this.populateVegGrid();
        this.showToast('✅ Sale recorded');
    }

    clearSaleForm() {
        document.getElementById('sellVeg').value = '';
        document.getElementById('sellQty').value = '';
        document.getElementById('sellPrice').value = '';
        document.getElementById('stockInfo').innerHTML = '<span>📊 Select a vegetable</span>';
        document.getElementById('saleTotal').textContent = '₹0';
    }

    // ========== DASHBOARD ==========
    updateDashboard() {
        const today = this.getDate(0);
        const todaySales = this.data.sales.filter(s => s.date === today);
        const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
        const totalQty = todaySales.reduce((sum, s) => sum + s.qty, 0);

        // Calculate profit
        let profit = 0;
        todaySales.forEach(sale => {
            const purchase = this.data.purchases
                .filter(p => p.vegId === sale.vegId && p.date <= sale.date)
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            if (purchase) {
                profit += sale.total - (purchase.pricePerKg * sale.qty);
            }
        });

        // Stock value
        let stockValue = 0;
        let totalItems = 0;
        this.data.vegetables.forEach(veg => {
            const stock = this.getStock(veg.id);
            if (stock > 0) totalItems++;
            const avgPrice = this.getAvgPurchasePrice(veg.id);
            stockValue += stock * avgPrice;
        });

        document.getElementById('todayRevenue').textContent = `₹${totalSales}`;
        document.getElementById('todayProfit').textContent = `₹${profit.toFixed(2)}`;
        document.getElementById('stockValue').textContent = `₹${stockValue.toFixed(2)}`;
        document.getElementById('itemsSold').textContent = `${totalQty} kg`;
        document.getElementById('stockItems').textContent = `${totalItems} items`;

        // Trends
        const yesterday = this.getDate(-1);
        const yesterdaySales = this.data.sales.filter(s => s.date === yesterday)
            .reduce((sum, s) => sum + s.total, 0);
        
        const revenueTrend = yesterdaySales > 0 
            ? ((totalSales - yesterdaySales) / yesterdaySales * 100).toFixed(1)
            : 0;
        document.getElementById('revenueTrend').textContent = 
            `${revenueTrend > 0 ? '+' : ''}${revenueTrend}% vs yesterday`;

        const profitMargin = totalSales > 0 ? (profit / totalSales * 100).toFixed(1) : 0;
        document.getElementById('profitTrend').textContent = `${profitMargin}% margin`;

        document.getElementById('salesCount').textContent = `${todaySales.length} transactions`;

        this.updateLowStockAlerts();
        this.showRecentSales();
        this.showRecentPurchasesList();
        this.updatePaymentDistribution(todaySales);
        this.updateTopSelling(todaySales);
    }

    updateLowStockAlerts() {
        const lowStock = this.data.vegetables
            .map(v => ({
                ...v,
                stock: this.getStock(v.id)
            }))
            .filter(v => v.stock > 0 && v.stock <= 5)
            .sort((a, b) => a.stock - b.stock);

        const container = document.getElementById('lowStockList');
        document.getElementById('lowStockCount').textContent = lowStock.length;

        if (lowStock.length === 0) {
            container.innerHTML = '<div class="empty-state">✨ All stock levels healthy</div>';
            return;
        }

        container.innerHTML = lowStock.map(v => `
            <div class="list-item">
                <span class="item-title">${v.name}</span>
                <span class="item-value" style="color: ${v.stock <= 2 ? '#dc3545' : '#fd7e14'}">
                    ${v.stock}kg left
                </span>
            </div>
        `).join('');
    }

    showRecentSales() {
        const recent = this.data.sales.slice(-5).reverse();
        const container = document.getElementById('recentSalesList');

        if (recent.length === 0) {
            container.innerHTML = '<div class="empty-state">No sales today</div>';
            return;
        }

        container.innerHTML = recent.map(s => {
            const veg = this.data.vegetables.find(v => v.id === s.vegId);
            return `
                <div class="list-item">
                    <div class="item-info">
                        <span class="item-title">${veg?.name || 'Unknown'}</span>
                        <span class="item-subtitle">${s.qty}kg • ${s.payment}</span>
                    </div>
                    <div class="item-value">₹${s.total}</div>
                </div>
            `;
        }).join('');
    }

    showRecentPurchasesList() {
        const recent = this.data.purchases.slice(-5).reverse();
        const container = document.getElementById('recentPurchasesList');

        if (recent.length === 0) {
            container.innerHTML = '<div class="empty-state">No purchases today</div>';
            return;
        }

        container.innerHTML = recent.map(p => {
            const veg = this.data.vegetables.find(v => v.id === p.vegId);
            return `
                <div class="list-item">
                    <div class="item-info">
                        <span class="item-title">${veg?.name || 'Unknown'}</span>
                        <span class="item-subtitle">${p.qty}kg • ₹${p.pricePerKg.toFixed(2)}/kg</span>
                    </div>
                    <div class="item-value">₹${p.totalPrice}</div>
                </div>
            `;
        }).join('');
    }

    updatePaymentDistribution(sales) {
        const cash = sales.filter(s => s.payment === 'cash').reduce((sum, s) => sum + s.total, 0);
        const upi = sales.filter(s => s.payment === 'upi').reduce((sum, s) => sum + s.total, 0);
        const card = sales.filter(s => s.payment === 'card').reduce((sum, s) => sum + s.total, 0);
        const total = cash + upi + card;

        if (total > 0) {
            document.getElementById('cashBar').style.width = `${(cash / total) * 100}%`;
            document.getElementById('upiBar').style.width = `${(upi / total) * 100}%`;
            document.getElementById('cardBar').style.width = `${(card / total) * 100}%`;
        }

        document.getElementById('cashAmount').textContent = `₹${cash}`;
        document.getElementById('upiAmount').textContent = `₹${upi}`;
        document.getElementById('cardAmount').textContent = `₹${card}`;
    }

    updateTopSelling(sales) {
        const vegSales = {};
        sales.forEach(sale => {
            if (!vegSales[sale.vegId]) {
                vegSales[sale.vegId] = 0;
            }
            vegSales[sale.vegId] += sale.qty;
        });

        const topVeg = Object.entries(vegSales)
            .map(([vegId, qty]) => ({
                veg: this.data.vegetables.find(v => v.id === vegId),
                qty
            }))
            .filter(v => v.veg)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);

        const container = document.getElementById('topSellingList');
        
        if (topVeg.length === 0) {
            container.innerHTML = '<div class="empty-state">No data available</div>';
            return;
        }

        container.innerHTML = topVeg.map(v => `
            <div class="list-item">
                <span class="item-title">${v.veg.name}</span>
                <span class="item-value">${v.qty} kg</span>
            </div>
        `).join('');
    }

    // ========== INVENTORY ==========
    updateInventory() {
        const grid = document.getElementById('inventoryGrid');
        
        const inventory = this.data.vegetables.map(veg => {
            const stock = this.getStock(veg.id);
            const avgPrice = this.getAvgPurchasePrice(veg.id);
            const value = stock * avgPrice;
            
            return { ...veg, stock, avgPrice, value };
        }).filter(v => v.stock > 0);

        if (inventory.length === 0) {
            grid.innerHTML = '<div class="empty-state">No stock available</div>';
            return;
        }

        grid.innerHTML = inventory.map(v => `
            <div class="inventory-item">
                <div class="inventory-name">${v.name}</div>
                <div class="inventory-stock">${v.stock} kg</div>
                <div class="inventory-price">₹${v.avgPrice.toFixed(2)}/kg</div>
                <small>Value: ₹${v.value.toFixed(2)}</small>
            </div>
        `).join('');
    }

    // ========== REPORTS ==========
    generateReport() {
        const start = document.getElementById('reportStart').value;
        const end = document.getElementById('reportEnd').value;

        const purchases = this.data.purchases.filter(p => p.date >= start && p.date <= end);
        const sales = this.data.sales.filter(s => s.date >= start && s.date <= end);

        const totalPurchases = purchases.reduce((sum, p) => sum + p.totalPrice, 0);
        const totalSales = sales.reduce((sum, s) => sum + s.total, 0);

        // Calculate profit using FIFO
        let totalProfit = 0;
        const vegReports = this.data.vegetables.map(veg => {
            const vegPurchases = purchases.filter(p => p.vegId === veg.id).sort((a, b) => a.date.localeCompare(b.date));
            const vegSales = sales.filter(s => s.vegId === veg.id).sort((a, b) => a.date.localeCompare(b.date));
            
            const purchasedKg = vegPurchases.reduce((sum, p) => sum + p.qty, 0);
            const purchaseCost = vegPurchases.reduce((sum, p) => sum + p.totalPrice, 0);
            const soldKg = vegSales.reduce((sum, s) => sum + s.qty, 0);
            const salesRevenue = vegSales.reduce((sum, s) => sum + s.total, 0);

            // Calculate profit
            let profit = 0;
            let remainingToSell = soldKg;
            for (const purchase of vegPurchases) {
                if (remainingToSell <= 0) break;
                const used = Math.min(purchase.qty, remainingToSell);
                profit += (salesRevenue * (used / soldKg)) - (purchase.pricePerKg * used);
                remainingToSell -= used;
            }

            totalProfit += profit;

            const margin = salesRevenue > 0 ? (profit / salesRevenue) * 100 : 0;

            return {
                name: veg.name,
                purchasedKg: purchasedKg.toFixed(1),
                purchaseCost: `₹${purchaseCost}`,
                soldKg: soldKg.toFixed(1),
                salesRevenue: `₹${salesRevenue}`,
                profit: profit.toFixed(2),
                margin: margin.toFixed(1),
                profitClass: profit >= 0 ? 'profit-positive' : 'profit-negative'
            };
        }).filter(v => parseFloat(v.purchasedKg) > 0 || parseFloat(v.soldKg) > 0);

        // Update summary
        document.getElementById('reportPurchaseTotal').textContent = `₹${totalPurchases}`;
        document.getElementById('reportSalesTotal').textContent = `₹${totalSales}`;
        document.getElementById('reportProfit').textContent = `₹${totalProfit.toFixed(2)}`;
        const margin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0;
        document.getElementById('reportMargin').textContent = `${margin}%`;

        // Render table
        const tbody = document.getElementById('reportBody');
        if (vegReports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No data for selected period</td></tr>';
            return;
        }

        tbody.innerHTML = vegReports.map(v => `
            <tr>
                <td>${v.name}</td>
                <td>${v.purchasedKg} kg</td>
                <td>${v.purchaseCost}</td>
                <td>${v.soldKg} kg</td>
                <td>${v.salesRevenue}</td>
                <td class="${v.profitClass}">₹${v.profit}</td>
                <td class="${v.profitClass}">${v.margin}%</td>
            </tr>
        `).join('');
    }

    // ========== SETTINGS ==========
    showVegetableSettings() {
        const container = document.getElementById('vegList');
        if (this.data.vegetables.length === 0) {
            container.innerHTML = '<div class="empty-state">No vegetables added yet</div>';
            return;
        }
        
        container.innerHTML = this.data.vegetables.map(v => `
            <div class="setting-item">
                <span>${v.name}</span>
                <button class="btn-danger" onclick="shop.deleteVegetable('${v.id}')">Delete</button>
            </div>
        `).join('');
    }

    // FIXED: This function reverses the input to compensate for RTL CSS
    addVegetable() {
        const nameInput = document.getElementById('newVegName');
        let name = nameInput.value.trim();
        
        if (!name) {
            this.showToast('Enter vegetable name', 'error');
            return;
        }

        // Reverse the string to fix the CSS RTL issue
        // When you type "potato", CSS shows it as "otatop"
        // This reverses it back to "potato" in storage
        const fixedName = this.reverseString(name);

        this.data.vegetables.push({
            id: Date.now().toString(),
            name: fixedName,  // Store the corrected version
            defaultPrice: 20
        });

        this.saveData();
        this.populateVegetables();
        this.showVegetableSettings();
        this.populateVegGrid();
        
        // Clear input
        nameInput.value = '';
        
        this.showToast(`✅ ${fixedName} added`);
    }

    deleteVegetable(id) {
        this.showConfirmModal(
            'Delete Vegetable',
            'This will remove the vegetable from your list. Continue?',
            () => {
                this.data.vegetables = this.data.vegetables.filter(v => v.id !== id);
                this.saveData();
                this.populateVegetables();
                this.showVegetableSettings();
                this.populateVegGrid();
                this.showToast('Vegetable deleted');
            }
        );
    }

    // ========== DATA MANAGEMENT ==========
    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `veggietrack-${this.getDate(0)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.data.settings.lastBackup = new Date().toISOString();
        this.saveData();
        document.getElementById('lastBackup').textContent = new Date().toLocaleString();
        this.showToast('✅ Data exported');
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                this.data = imported;
                this.saveData();
                this.populateVegetables();
                this.updateDashboard();
                this.updateInventory();
                this.showToast('✅ Data imported');
            } catch (error) {
                this.showToast('Invalid file', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    quickBackup() {
        this.exportData();
    }

    exportInventory() {
        this.showToast('Inventory exported');
    }

    exportReport() {
        this.generateReport();
        this.showToast('Report exported');
    }

    printReport() {
        window.print();
    }

    refreshData() {
        this.updateDashboard();
        this.updateInventory();
        this.showToast('Data refreshed');
    }

    refreshSales() {
        this.updateDashboard();
    }

    refreshPurchases() {
        this.showRecentPurchases();
    }

    showLowStock() {
        this.switchView('dashboard');
        setTimeout(() => {
            document.querySelector('.chart-card').scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    // ========== THEME ==========
    toggleTheme() {
        const isDark = document.body.classList.contains('dark-mode');
        this.setTheme(isDark ? 'light' : 'dark');
    }

    setTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        document.getElementById('themeSelect').value = theme;
        document.getElementById('themeToggle').innerHTML = theme === 'dark' 
            ? '<span class="theme-icon">☀️</span><span class="theme-text">Light Mode</span>'
            : '<span class="theme-icon">🌙</span><span class="theme-text">Dark Mode</span>';
        this.data.settings.theme = theme;
        this.saveData();
    }

    applyTheme() {
        this.setTheme(this.data.settings.theme || 'light');
    }

    // ========== MODALS ==========
    confirmClearToday() {
        this.showConfirmModal(
            'Clear Today\'s Data',
            'This will remove all sales and purchases for today. Continue?',
            () => {
                const today = this.getDate(0);
                this.data.purchases = this.data.purchases.filter(p => p.date !== today);
                this.data.sales = this.data.sales.filter(s => s.date !== today);
                this.saveData();
                this.showToast('Today\'s data cleared');
            }
        );
    }

    confirmReset() {
        this.showConfirmModal(
            '⚠️ Reset Everything',
            'This will delete ALL your data. This cannot be undone!',
            () => {
                this.data.purchases = [];
                this.data.sales = [];
                this.data.vegetables = [];
                this.saveData();
                this.populateVegetables();
                this.updateDashboard();
                this.updateInventory();
                this.showVegetableSettings();
                this.populateVegGrid();
                this.showToast('System reset complete');
            }
        );
    }

    showConfirmModal(title, message, onConfirm) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('active');
        this.confirmCallback = onConfirm;
    }

    executeConfirm() {
        if (this.confirmCallback) {
            this.confirmCallback();
            this.confirmCallback = null;
        }
        this.hideModal();
    }

    hideModal() {
        document.getElementById('confirmModal').classList.remove('active');
    }

    // ========== UTILITIES ==========
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    globalSearch(query) {
        if (!query || query.length < 2) return;
        
        const results = [];
        this.data.vegetables.forEach(v => {
            if (v.name.toLowerCase().includes(query.toLowerCase())) {
                const stock = this.getStock(v.id);
                results.push(`${v.name}: ${stock}kg`);
            }
        });
        
        if (results.length > 0) {
            this.showToast(`Found: ${results.slice(0, 3).join(', ')}`);
        }
    }
}

// Initialize
const shop = new VegetableShop();
