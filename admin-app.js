/**
 * Modern CMS - Core Logic
 * Fully browser-based with secure hashing and LocalStorage
 */

const app = {
    // Initial State
    state: {
        currentUser: JSON.parse(localStorage.getItem('cms_session')) || null,
        articles: JSON.parse(localStorage.getItem('cms_articles')) || [],
        products: JSON.parse(localStorage.getItem('cms_products')) || [],
        media: JSON.parse(localStorage.getItem('cms_media')) || [],
        users: JSON.parse(localStorage.getItem('cms_users')) || [
            {
                id: 1,
                username: 'saifallah08',
                password: '6813fc0c57c45688b77626941865261895a9829e0836511a56658097f5117f7b', // saif08/saifallah08
                role: 'Admin'
            },
            { id: 2, username: 'editor_user', password: '...', role: 'Editor' },
            { id: 3, username: 'author_user', password: '...', role: 'Author' }
        ],
        activeView: 'dashboard',
        editingId: null,
        tempFiles: [],
        tempOrderFiles: [],
        hasAutoEdited: false,
        hardcodedProducts: {}
    },

    // Initialization
    async init() {
        // --- FIREBASE CONFIGURATION ---
        const firebaseConfig = {
            apiKey: "AIzaSyD-7y_ISkDUaTi2guJQcweBC_dID1LkvFM",
            authDomain: "phone-bba.firebaseapp.com",
            projectId: "phone-bba",
            storageBucket: "phone-bba.firebasestorage.app",
            messagingSenderId: "183935757816",
            appId: "1:183935757816:web:c694c25a9913bf3a7d3a0d",
            measurementId: "G-0227S4C60W"
        };

        // Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        const db = firebase.firestore();
        app.db = db;

        // Force update saifallah08 in case of old localStorage data
        const newAdmin = {
            id: 1,
            username: 'saifallah08',
            password: '6813fc0c57c45688b77626941865261895a9829e0836511a56658097f5117f7b', // saif08/saifallah08
            role: 'Admin'
        };

        if (!this.state.users.find(u => u.username === 'saifallah08')) {
            this.state.users.push(newAdmin);
            localStorage.setItem('cms_users', JSON.stringify(this.state.users));
        }

        // --- REALTIME SYNC FROM CLOUD ---
        db.collection('products').onSnapshot(snap => {
            app.state.products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            if (app.state.activeView === 'products' || app.state.activeView === 'dashboard') app.router(app.state.activeView);
        });

        db.collection('articles').onSnapshot(snap => {
            app.state.articles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (app.state.activeView === 'content' || app.state.activeView === 'dashboard') app.router(app.state.activeView);
        });

        // --- DEEP LINK HANDLING ---
        const handleDeepLink = () => {
            const params = new URLSearchParams(window.location.search);
            const productIdToEdit = params.get('editProduct');
            if (productIdToEdit && this.state.currentUser && !this.state.hasAutoEdited) {
                if (this.state.products.length > 0) {
                    this.state.hasAutoEdited = true;
                    this.handlers.editProduct(productIdToEdit);
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    setTimeout(handleDeepLink, 500);
                }
            }
        };
        handleDeepLink();

        if (this.state.currentUser) {
            this.showDashboard();
        } else {
            this.showAuth();
        }
    },

    // UI Switching
    showAuth() {
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('dashboard-section').style.display = 'none';
    },

    showDashboard() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'flex';
        this.router('dashboard');
    },

    router(view) {
        this.state.activeView = view;
        const container = document.getElementById('content-view');

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.innerText.includes(this.getViewName(view))) link.classList.add('active');
        });

        switch (view) {
            case 'dashboard': this.renderDashboard(container); break;
            case 'content': this.renderContent(container); break;
            case 'products': this.renderProducts(container); break;
            case 'media': this.renderMedia(container); break;
            case 'users': this.renderUsers(container); break;
        }
    },

    getViewName(view) {
        const names = { 'dashboard': 'الرئيسية', 'content': 'المقالات', 'products': 'الهواتف', 'media': 'الوسائط', 'users': 'المستخدمين' };
        return names[view];
    },

    // Rendering Logic
    renderDashboard(container) {
        container.innerHTML = `
            <div class="header-bar fade-in">
                <h1>مرحباً، ${this.state.currentUser.username}</h1>
                <div style="display: flex; gap: 1rem;">
                    <button class="btn-primary" onclick="app.handlers.openModal()" style="width: auto; padding: 0.75rem 1.5rem;">+ مقال جديد</button>
                    <button class="btn-primary" onclick="app.handlers.openProdModal()" style="width: auto; padding: 0.75rem 1.5rem; background: var(--accent);">+ هاتف جديد</button>
                </div>
            </div>
            
            <div class="stats-grid fade-in">
                <div class="stat-card">
                    <div class="label">إجمالي المقالات</div>
                    <div class="value">${this.state.articles.length}</div>
                </div>
                <div class="stat-card">
                    <div class="label">الهواتف</div>
                    <div class="value">${this.state.products.length}</div>
                </div>
                <div class="stat-card">
                    <div class="label">الوسائط</div>
                    <div class="value">${this.state.media.length}</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
                <div>
                    <h2 style="margin-bottom: 1rem;">أحدث الهواتف</h2>
                    <div class="content-card fade-in">
                        ${this.renderProductTable(this.state.products.slice(0, 3))}
                    </div>
                </div>
                <div>
                    <h2 style="margin-bottom: 1rem;">أحدث المقالات</h2>
                    <div class="content-card fade-in">
                        ${this.renderArticleTable(this.state.articles.slice(0, 3))}
                    </div>
                </div>
            </div>
        `;
    },

    renderProducts(container) {
        container.innerHTML = `
            <div class="header-bar fade-in">
                <h1>إدارة الهواتف</h1>
                <button class="btn-primary" onclick="app.handlers.openProdModal()" style="width: auto; padding: 0.75rem 1.5rem;">+ هاتف جديد</button>
            </div>
            <div class="content-card fade-in">
                ${this.renderProductTable(this.state.products)}
            </div>
        `;
    },

    renderProductTable(products) {
        if (products.length === 0) return '<p style="padding: 2rem; text-align: center; color: var(--text-muted)">لا توجد هواتف حالياً</p>';

        return `
            <table>
                <thead>
                    <tr>
                        <th>الهاتف</th>
                        <th>السعر</th>
                        <th>البطارية</th>
                        <th>الكمية / الحالة</th>
                        <th>إجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr class="${p.sold ? 'sold-row' : ''}">
                            <td>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    ${p.media && p.media[0] ? `<img src="${p.media[0].url.startsWith('./assets') ? p.media[0].url.replace('./assets', '../assets') : p.media[0].url}" style="width: 30px; height: 30px; border-radius: 4px; object-fit: cover;">` : ''}
                                    <div style="${p.sold ? 'opacity: 0.6;' : ''}">
                                        <div style="font-weight: 600;">${p.name}</div>
                                        <div style="font-size: 0.7rem; color: var(--text-muted)">${p.brand} | ${p.storage} | ${p.color}</div>
                                    </div>
                                </div>
                            </td>
                             <td>${p.price} دج</td>
                            <td>${p.battery}%</td>
                            <td>
                                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                    ${p.sold ?
                '<span class="badge" style="background: var(--danger); color: white; border: 1px solid rgba(255,255,255,0.2);">تم البيع (Sold)</span>' :
                `<span class="badge ${p.stock <= 2 ? 'badge-published' : ''}" style="background: ${p.stock <= 2 ? 'rgba(239, 68, 68, 0.1)' : ''}; color: ${p.stock <= 2 ? 'var(--danger)' : ''}">${p.stock} قطعة</span>`
            }
                                </div>
                            </td>
                            <td>
                                <button class="actions-btn" onclick="app.handlers.editProduct('${p.id}')">✎</button>
                                <button class="actions-btn" onclick="app.handlers.deleteProduct('${p.id}')" style="color: var(--danger)">🗑</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderContent(container) {
        container.innerHTML = `
            <div class="header-bar fade-in">
                <h1>إدارة المقالات</h1>
                <button class="btn-primary" onclick="app.handlers.openModal()" style="width: auto; padding: 0.75rem 1.5rem;">+ مقال جديد</button>
            </div>
            <div class="content-card fade-in">
                ${this.renderArticleTable(this.state.articles)}
            </div>
        `;
    },

    renderArticleTable(articles) {
        if (articles.length === 0) return '<p style="padding: 2rem; text-align: center; color: var(--text-muted)">لا توجد مقالات حالياً</p>';

        return `
            <table>
                <thead>
                    <tr>
                        <th>العنوان</th>
                        <th>التصنيف</th>
                        <th>الحالة</th>
                        <th>التاريخ</th>
                        <th>إجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${articles.map(art => `
                        <tr>
                            <td>${art.title}</td>
                            <td>${art.category}</td>
                            <td><span class="badge ${art.status === 'نشر فوري' ? 'badge-published' : 'badge-draft'}">${art.status}</span></td>
                            <td>${new Date(art.date).toLocaleDateString('ar-EG')}</td>
                            <td>
                                <button class="actions-btn" onclick="app.handlers.editArticle('${art.id}')">✎</button>
                                <button class="actions-btn" onclick="app.handlers.deleteArticle('${art.id}')" style="color: var(--danger)">🗑</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderMedia(container) {
        container.innerHTML = `
            <div class="header-bar fade-in">
                <h1>مكتبة الوسائط</h1>
            </div>
            <div class="stats-grid fade-in">
                ${this.state.media.map(m => `
                    <div class="stat-card" style="padding: 0.5rem; position: relative;">
                        <img src="${m.url}" class="preview-img" style="height: 150px;">
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.5rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${m.name}</div>
                        <button onclick="app.handlers.deleteMedia('${m.id}')" style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.5); border: none; color: white; border-radius: 50%; width: 20px; height: 20px; cursor: pointer;">×</button>
                    </div>
                `).join('')}
                ${this.state.media.length === 0 ? '<p>لا توجد وسائط مرفوعة</p>' : ''}
            </div>
        `;
    },

    renderUsers(container) {
        container.innerHTML = `
            <div class="header-bar fade-in">
                <h1>إدارة المستخدمين</h1>
            </div>
            <div class="content-card fade-in">
                <table>
                    <thead>
                        <tr><th>اسم المستخدم</th><th>الصلاحية</th><th>الإجراء</th></tr>
                    </thead>
                    <tbody>
                        ${this.state.users.map(u => `
                            <tr>
                                <td>${u.username}</td>
                                <td>${u.role}</td>
                                <td><button class="actions-btn" style="color: grey">تغيير الصلاحية</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // Handlers
    handlers: {
        openProdModal() {
            app.state.editingId = null;
            app.state.tempFiles = [];
            app.state.tempOrderFiles = [];
            document.getElementById('prod-modal-title').innerText = 'إضافة هاتف جديد';
            document.getElementById('prod-name').value = '';
            document.getElementById('prod-brand').value = 'Apple';
            document.getElementById('prod-price').value = '';
            document.getElementById('prod-storage').value = '';
            document.getElementById('prod-color').value = '';
            document.getElementById('prod-battery').value = '';
            document.getElementById('prod-stock').value = '1';
            document.getElementById('prod-condition').value = 'New';
            document.getElementById('prod-sold').checked = false;
            document.getElementById('prod-media-previews').innerHTML = '';
            document.getElementById('order-media-previews').innerHTML = '';
            document.getElementById('product-modal').style.display = 'flex';
        },

        closeProdModal() {
            document.getElementById('product-modal').style.display = 'none';
        },

        async handleProdFiles(event) {
            const files = event.target.files;
            app.state.tempFiles = app.state.tempFiles || [];

            for (let file of files) {
                try {
                    const fileSizeMB = app.utils.getFileSizeMB(file);
                    console.log(`📁 حجم الملف الأصلي: ${fileSizeMB.toFixed(2)} MB`);

                    // رفض الملفات الأكبر من 10MB
                    if (fileSizeMB > 10) {
                        alert(`الملف "${file.name}" كبير جداً (${fileSizeMB.toFixed(2)} MB). الحد الأقصى هو 10 MB.`);
                        continue;
                    }

                    let url;
                    // ضغط الصور الأكبر من 1MB
                    if (fileSizeMB > 1) {
                        console.log(`🔄 جاري ضغط الصورة...`);
                        url = await app.utils.compressImage(file, 3, 0.85, 2048);
                        const compressedSizeMB = url.length / (1024 * 1024);
                        console.log(`✅ تم الضغط! الحجم الجديد: ${compressedSizeMB.toFixed(2)} MB`);

                        // إظهار رسالة للمستخدم
                        const reduction = ((1 - compressedSizeMB / fileSizeMB) * 100).toFixed(0);
                        if (reduction > 10) {
                            console.log(`💾 تم توفير ${reduction}% من المساحة`);
                        }
                    } else {
                        // قراءة الصورة مباشرة إذا كانت أصغر من 1MB
                        const reader = new FileReader();
                        url = await new Promise((resolve) => {
                            reader.onload = (e) => resolve(e.target.result);
                            reader.readAsDataURL(file);
                        });
                    }

                    const id = Date.now() + Math.random();
                    app.state.tempFiles.push({ name: file.name, url: url, id: id });
                    app.handlers.renderMediaPreviews('prod-media-previews', app.state.tempFiles, 'tempFiles');
                } catch (error) {
                    console.error('خطأ في معالجة الملف:', error);
                    alert(`فشل رفع الملف "${file.name}": ${error.message}`);
                }
            }
        },

        async handleOrderFiles(event) {
            const files = event.target.files;
            app.state.tempOrderFiles = app.state.tempOrderFiles || [];

            for (let file of files) {
                try {
                    const fileSizeMB = app.utils.getFileSizeMB(file);
                    const isVideo = file.type.startsWith('video');

                    console.log(`📁 ${isVideo ? 'فيديو' : 'صورة'} - حجم الملف الأصلي: ${fileSizeMB.toFixed(2)} MB`);

                    // حدود مختلفة للفيديو والصور
                    const maxSize = isVideo ? 20 : 10;
                    if (fileSizeMB > maxSize) {
                        alert(`الملف "${file.name}" كبير جداً (${fileSizeMB.toFixed(2)} MB). الحد الأقصى ${isVideo ? 'للفيديو' : 'للصور'} هو ${maxSize} MB.`);
                        continue;
                    }

                    let url;
                    // ضغط الصور فقط (ليس الفيديوهات)
                    if (!isVideo && fileSizeMB > 1) {
                        console.log(`🔄 جاري ضغط الصورة...`);
                        url = await app.utils.compressImage(file, 3, 0.85, 2048);
                        const compressedSizeMB = url.length / (1024 * 1024);
                        console.log(`✅ تم الضغط! الحجم الجديد: ${compressedSizeMB.toFixed(2)} MB`);
                    } else {
                        // قراءة الملف مباشرة (صور صغيرة أو فيديوهات)
                        const reader = new FileReader();
                        url = await new Promise((resolve) => {
                            reader.onload = (e) => resolve(e.target.result);
                            reader.readAsDataURL(file);
                        });
                    }

                    const id = 'order_' + Date.now() + Math.random();
                    const type = isVideo ? 'video' : 'image';
                    app.state.tempOrderFiles.push({ name: file.name, url: url, id: id, type: type });
                    app.handlers.renderMediaPreviews('order-media-previews', app.state.tempOrderFiles, 'tempOrderFiles');
                } catch (error) {
                    console.error('خطأ في معالجة الملف:', error);
                    alert(`فشل رفع الملف "${file.name}": ${error.message}`);
                }
            }
        },

        renderMediaPreviews(containerId, mediaArray, stateKey) {
            const container = document.getElementById(containerId);
            container.innerHTML = mediaArray.map(m => `
                <div class="preview-item">
                    ${m.type === 'video' ?
                    `<div class="video-preview-placeholder"><span style="font-size: 2rem;">🎥</span></div>` :
                    `<img src="${m.url}" class="preview-img">`}
                    <div class="remove-btn" onclick="app.handlers.removeMedia('${m.id}', '${stateKey}', '${containerId}')">×</div>
                </div>
            `).join('');
        },

        removeMedia(id, stateKey, containerId) {
            app.state[stateKey] = app.state[stateKey].filter(m => m.id !== id && String(m.id) !== String(id));
            app.handlers.renderMediaPreviews(containerId, app.state[stateKey], stateKey);
        },

        async saveProduct() {
            try {
                const name = document.getElementById('prod-name').value;
                const brand = document.getElementById('prod-brand').value;
                const price = document.getElementById('prod-price').value;
                const storage = document.getElementById('prod-storage').value;
                const color = document.getElementById('prod-color').value;
                const battery = document.getElementById('prod-battery').value;
                const stock = document.getElementById('prod-stock').value;
                const condition = document.getElementById('prod-condition').value;
                const sold = document.getElementById('prod-sold').checked;

                if (!name || !price) return alert('الرجاء إدخال الاسم والسعر');

                const normalizeMedia = (m) => {
                    const cleanUrl = m.url.startsWith('../assets') ? m.url.replace('../assets', './assets') : m.url;
                    return {
                        id: m.id && String(m.id).length > 5 ? m.id : (Math.random().toString(36).substr(2, 9)),
                        url: cleanUrl,
                        type: m.type || (cleanUrl.match(/\.(mp4|webm|ogg|mov)$|video/i) ? 'video' : 'image')
                    };
                };

                const product = {
                    name: name.trim(),
                    brand,
                    price: price.trim(),
                    storage: storage.trim(),
                    color: color.trim(),
                    battery: battery.trim(),
                    stock: parseInt(stock) || 0,
                    condition,
                    sold: Boolean(sold),
                    media: app.state.tempFiles.map(normalizeMedia),
                    orderMedia: app.state.tempOrderFiles.map(normalizeMedia),
                    date: app.state.editingId ? (app.state.products.find(p => p.id === app.state.editingId) || app.state.hardcodedProducts[app.state.editingId] || {}).date || new Date().toISOString() : new Date().toISOString()
                };

                if (app.state.editingId) {
                    await app.db.collection('products').doc(app.state.editingId).set(product);
                } else {
                    await app.db.collection('products').add(product);
                }

                this.closeProdModal();
                app.router('products');
            } catch (error) {
                console.error("Error saving product:", error);
                alert("حدث خطأ أثناء الحفظ. قد يكون حجم الصور كبيراً جداً.");
            }
        },

        editProduct(id) {
            let p = app.state.products.find(prod => prod.id === id);
            if (!p) p = app.state.hardcodedProducts[id];
            if (!p) return;

            app.state.editingId = id;
            const isSold = p.sold === true || p.sold === "true";
            document.getElementById('prod-sold').checked = isSold;

            const ensureIds = (m, prefix) => {
                const url = m.url.startsWith('./assets') ? m.url.replace('./assets', '../assets') : m.url;
                return {
                    id: m.id || (prefix + Math.random().toString(36).substr(2, 5)),
                    url: url,
                    type: m.type || (url.match(/\.(mp4|webm|ogg|mov)$|video/i) ? 'video' : 'image')
                };
            };

            app.state.tempFiles = [...(p.media || [])].map(m => ensureIds(m, 'm'));
            app.state.tempOrderFiles = [...(p.orderMedia || [])].map(m => ensureIds(m, 'o'));

            document.getElementById('prod-modal-title').innerText = 'تعديل بيانات الهاتف';
            document.getElementById('prod-name').value = p.name;
            document.getElementById('prod-brand').value = p.brand;
            document.getElementById('prod-price').value = p.price;
            document.getElementById('prod-storage').value = p.storage;
            document.getElementById('prod-color').value = p.color;
            document.getElementById('prod-battery').value = String(p.battery || '').replace('%', '');
            document.getElementById('prod-stock').value = p.stock || 0;
            document.getElementById('prod-condition').value = p.condition;

            app.handlers.renderMediaPreviews('prod-media-previews', app.state.tempFiles, 'tempFiles');
            app.handlers.renderMediaPreviews('order-media-previews', app.state.tempOrderFiles, 'tempOrderFiles');

            document.getElementById('product-modal').style.display = 'flex';
        },

        async deleteProduct(id) {
            if (confirm('هل أنت متأكد من حذف هذا الهاتف من القائمة؟')) {
                await app.db.collection('products').doc(id).delete();
                app.router('products');
            }
        },

        async login() {
            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value.trim();
            const errorEl = document.getElementById('login-error');

            const hash = await app.utils.hashPassword(pass);
            let found = app.state.users.find(u => u.username === user && u.password === hash);

            if (!found && user === 'saifallah08' && pass === 'saif08/saifallah08') {
                found = { id: 1, username: 'saifallah08', role: 'Admin' };
                const newUser = { ...found, password: hash };
                app.state.users = [newUser];
                localStorage.setItem('cms_users', JSON.stringify(app.state.users));
            }

            if (found) {
                app.state.currentUser = found;
                localStorage.setItem('cms_session', JSON.stringify(found));
                app.showDashboard();
                errorEl.style.display = 'none';
            } else {
                errorEl.style.display = 'block';
            }
        },

        logout() {
            app.state.currentUser = null;
            localStorage.removeItem('cms_session');
            app.showAuth();
        },

        openModal() {
            app.state.editingId = null;
            app.state.tempFiles = [];
            document.getElementById('modal-title').innerText = 'إنشاء مقال جديد';
            document.getElementById('art-title').value = '';
            document.getElementById('art-content').innerHTML = '';
            document.getElementById('art-publish-date').value = '';
            document.getElementById('media-previews').innerHTML = '';
            document.getElementById('editor-modal').style.display = 'flex';
        },

        closeModal() {
            document.getElementById('editor-modal').style.display = 'none';
        },

        async handleFiles(event) {
            const files = event.target.files;
            app.state.tempFiles = app.state.tempFiles || [];

            for (let file of files) {
                try {
                    const fileSizeMB = app.utils.getFileSizeMB(file);
                    console.log(`📁 حجم الملف الأصلي: ${fileSizeMB.toFixed(2)} MB`);

                    // رفض الملفات الأكبر من 10MB
                    if (fileSizeMB > 10) {
                        alert(`الملف "${file.name}" كبير جداً (${fileSizeMB.toFixed(2)} MB). الحد الأقصى هو 10 MB.`);
                        continue;
                    }

                    let url;
                    // ضغط الصور الأكبر من 1MB
                    if (fileSizeMB > 1) {
                        console.log(`🔄 جاري ضغط الصورة...`);
                        url = await app.utils.compressImage(file, 3, 0.85, 2048);
                        const compressedSizeMB = url.length / (1024 * 1024);
                        console.log(`✅ تم الضغط! الحجم الجديد: ${compressedSizeMB.toFixed(2)} MB`);
                    } else {
                        // قراءة الصورة مباشرة إذا كانت أصغر من 1MB
                        const reader = new FileReader();
                        url = await new Promise((resolve) => {
                            reader.onload = (e) => resolve(e.target.result);
                            reader.readAsDataURL(file);
                        });
                    }

                    const id = Date.now() + Math.random();
                    app.state.tempFiles.push({ name: file.name, url: url, id: id });
                    app.handlers.renderMediaPreviews('media-previews', app.state.tempFiles, 'tempFiles');
                } catch (error) {
                    console.error('خطأ في معالجة الملف:', error);
                    alert(`فشل رفع الملف "${file.name}": ${error.message}`);
                }
            }
        },

        async saveArticle() {
            try {
                const title = document.getElementById('art-title').value;
                const category = document.getElementById('art-category').value;
                const content = document.getElementById('art-content').innerHTML;
                const publishDate = document.getElementById('art-publish-date').value;

                if (!title) return alert('الرجاء إدخال عنوان');

                const article = {
                    title,
                    category,
                    content,
                    status: publishDate ? 'مجدول' : 'نشر فوري',
                    date: publishDate || new Date().toISOString(),
                    media: [...app.state.tempFiles]
                };

                if (app.state.editingId) {
                    await app.db.collection('articles').doc(app.state.editingId).set(article);
                } else {
                    await app.db.collection('articles').add(article);
                }

                this.closeModal();
                app.router(app.state.activeView);
            } catch (error) {
                console.error("Error saving article:", error);
                alert("حدث خطأ أثناء حفظ المقال. قد يكون حجم الصور المرفقة كبيراً جداً.");
            }
        },

        editArticle(id) {
            const art = app.state.articles.find(a => a.id === id);
            if (!art) return;

            app.state.editingId = id;
            app.state.tempFiles = art.media || [];

            document.getElementById('modal-title').innerText = 'تعديل المقال';
            document.getElementById('art-title').value = art.title;
            document.getElementById('art-category').value = art.category;
            document.getElementById('art-content').innerHTML = art.content;
            document.getElementById('art-publish-date').value = art.status === 'مجدول' ? art.date : '';

            app.handlers.renderMediaPreviews('media-previews', app.state.tempFiles, 'tempFiles');
            document.getElementById('editor-modal').style.display = 'flex';
        },

        async deleteArticle(id) {
            if (confirm('هل أنت متأكد من حذف هذا المقال؟')) {
                try {
                    await app.db.collection('articles').doc(id).delete();
                    app.router(app.state.activeView);
                } catch (error) {
                    console.error("Error deleting article:", error);
                    alert("حدث خطأ أثناء حذف المقال.");
                }
            }
        },

        deleteMedia(id) {
            app.state.media = app.state.media.filter(m => m.id.toString() !== id.toString());
            localStorage.setItem('cms_media', JSON.stringify(app.state.media));
            app.router('media');
        }
    },

    // Utils
    utils: {
        async hashPassword(password) {
            const msgUint8 = new TextEncoder().encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        },

        /**
         * ضغط الصورة إذا كان حجمها أكبر من الحد المسموح
         * @param {File} file - ملف الصورة
         * @param {number} maxSizeMB - الحجم الأقصى بالميجابايت (افتراضي: 5MB)
         * @param {number} quality - جودة الضغط من 0 إلى 1 (افتراضي: 0.8)
         * @param {number} maxWidth - العرض الأقصى بالبكسل (افتراضي: 2048)
         * @returns {Promise<string>} - Base64 string للصورة المضغوطة
         */
        async compressImage(file, maxSizeMB = 5, quality = 0.8, maxWidth = 2048) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = (e) => {
                    const img = new Image();

                    img.onload = () => {
                        // حساب الأبعاد الجديدة مع الحفاظ على نسبة العرض إلى الارتفاع
                        let width = img.width;
                        let height = img.height;

                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }

                        // إنشاء canvas لضغط الصورة
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;

                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // تحويل إلى Base64 مع الضغط
                        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

                        // التحقق من الحجم وتقليل الجودة إذا لزم الأمر
                        let currentQuality = quality;
                        const maxSizeBytes = maxSizeMB * 1024 * 1024;

                        while (compressedDataUrl.length > maxSizeBytes && currentQuality > 0.1) {
                            currentQuality -= 0.1;
                            compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
                        }

                        resolve(compressedDataUrl);
                    };

                    img.onerror = () => reject(new Error('فشل تحميل الصورة'));
                    img.src = e.target.result;
                };

                reader.onerror = () => reject(new Error('فشل قراءة الملف'));
                reader.readAsDataURL(file);
            });
        },

        /**
         * التحقق من حجم الملف
         * @param {File} file - الملف المراد التحقق منه
         * @returns {number} - حجم الملف بالميجابايت
         */
        getFileSizeMB(file) {
            return file.size / (1024 * 1024);
        }
    }
};

// Initialize App
app.init();
