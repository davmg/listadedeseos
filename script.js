//Read CSV guests
document.addEventListener("DOMContentLoaded", function () {

    const API_URL = "https://script.google.com/macros/s/AKfycbzgesg0mZQ3lakeZUkhMkszWvGrIiWSt1ymjvrDrpBmePvOxJahXMabWzqa92YmshwYbw/exec";
    let products = [];
    let filteredProducts = [];
    let activeFilters = {
        sort: 'name',
        stores: [],
        categories: [],
        availableOnly: false
    };


    // Robust CSV parser (handles quoted commas)
    function parseCSV(text) {
        const rows = [];
        const lines = text.trim().split("\n");

        for (let i = 1; i < lines.length; i++) { // skip header
            const row = [];
            let current = "";
            let insideQuotes = false;

            for (let char of lines[i]) {
                if (char === '"') {
                    insideQuotes = !insideQuotes;
                } else if (char === "," && !insideQuotes) {
                    row.push(current.trim());
                    current = "";
                } else {
                    current += char;
                }
            }

            row.push(current.trim());

            // Remove surrounding quotes if present
            rows.push(
                row.map(field =>
                    field.replace(/^"|"$/g, "").replace(/""/g, '"')
                )
            );
        }

        return rows;
    }

    async function loadProductsCSV() {
        try {
            const responseG = await fetch("docs/list.csv");
            const csvTextG = await responseG.text();
            const parsedRowsG = parseCSV(csvTextG);

            const products = parsedRowsG.map(row => ({
                id: row[0],
                name: row[1],
                quantity: row[2],
                category: row[3],
                store: row[4],
                price: row[5],
                img: row[6],
                link: row[7],
            }));

            return products;

        } catch (error) {
            console.error("Error loading CSV:", error);
            return [];
        }
    }

    async function loadProductsEx() {

        const loader = document.getElementById("loader");

        loader.style.display = "block";

        try {
            const response = await fetch(
                `${API_URL}?action=products`
            );

            products = await response.json();

            products.sort((a, b) => a.name.localeCompare(b.name));

            filteredProducts = [...products];

            populateFilterChips();
            renderProducts();

        } catch (error) {

            console.error(error);

        } finally {

            loader.style.display = "none";
        }

    }

    function renderProducts() {
        const container = document.getElementById('product-list');

        container.innerHTML = "";

        //Build each card
        filteredProducts.forEach(product => {
            const card = document.createElement('div');
            const imagePath = `imgs/${product.id}.png`; // Assuming images are named by product ID
            const price = Number(product.price).toLocaleString();
            const storeNull = product.store == "Sin tienda" ? "display:none; " : "";
            const imgAvailable = product.available == 'true' ? "" : "filter: grayscale(100%); ";
            const textDecoration = product.available == 'true' ? "" : "text-decoration: line-through; ";
            const colorNotAvailable = product.available == 'true' ? "" : "color: #7a8782; ";
            const bgColorNotAvailable = product.available == 'true' ? "" : "background-color: #7a8782; ";
            const checkmarkDisplay = product.available == 'true' ? "display:none;" : "";

            card.className = 'product-card';
            card.innerHTML = `
                        <div class="img-container">
                            <img src="${imagePath}" style="${imgAvailable}" alt="${product.name}">
                            <p style="${storeNull} ${bgColorNotAvailable}" class="store-tag">${product.store}</p>
                            </div>
                            <h2 style="${textDecoration} ${colorNotAvailable}">${product.name}</h2>
                            <p style="${colorNotAvailable}" class="price-tag"><span class="currency">$${price}</span></p>
                            <div class="reservation-info">
                                <p style="${colorNotAvailable}" class="reserved-tag">Reservados: ${product.reserved} de ${product.quantity}</p>
                                <div class="checkmark-overlay" style="${checkmarkDisplay}">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                            </div>
                    `;

            // Add click handler to open modal
            card.addEventListener('click', () => openModal(product));

            container.appendChild(card);
        });

        if (filteredProducts.length === 0) {
            const noResults = document.createElement('p');
            noResults.className = 'no-results';
            noResults.textContent = 'No hay productos que coincidan con los filtros';
            container.appendChild(noResults);
        }
    }

    function applyFiltersAndSort() {
        // Start with all products
        let result = [...products];

        // Apply availability filter
        if (activeFilters.availableOnly) {
            result = result.filter(p => p.available === 'true');
        }

        // Apply store filter
        if (activeFilters.stores.length > 0) {
            result = result.filter(p => activeFilters.stores.includes(p.store));
        }

        // Apply category filter
        if (activeFilters.categories.length > 0) {
            result = result.filter(p => activeFilters.categories.includes(p.category));
        }

        // Apply sorting
        switch (activeFilters.sort) {
            case 'name':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'price-asc':
                result.sort((a, b) => Number(a.price) - Number(b.price));
                break;
            case 'price-desc':
                result.sort((a, b) => Number(b.price) - Number(a.price));
                break;
        }

        filteredProducts = result;
        renderProducts();
    }

    function populateFilterChips() {
        // Get unique stores
        const stores = [...new Set(products.map(p => p.store))].sort();
        const storeChipsContainer = document.getElementById('store-chips');
        storeChipsContainer.innerHTML = '';
        stores.forEach(store => {
            const chip = document.createElement('button');
            chip.className = 'chip';
            chip.textContent = store;
            chip.dataset.store = store;
            chip.addEventListener('click', () => toggleStoreFilter(store, chip));
            storeChipsContainer.appendChild(chip);
        });

        // Get unique categories
        const categories = [...new Set(products.map(p => p.category))].sort();
        const categoryChipsContainer = document.getElementById('category-chips');
        categoryChipsContainer.innerHTML = '';
        categories.forEach(category => {
            const chip = document.createElement('button');
            chip.className = 'chip';
            chip.textContent = category;
            chip.dataset.category = category;
            chip.addEventListener('click', () => toggleCategoryFilter(category, chip));
            categoryChipsContainer.appendChild(chip);
        });
    }

    function toggleStoreFilter(store, chipElement) {
        const index = activeFilters.stores.indexOf(store);
        if (index > -1) {
            activeFilters.stores.splice(index, 1);
            chipElement.classList.remove('active');
        } else {
            activeFilters.stores.push(store);
            chipElement.classList.add('active');
        }
        applyFiltersAndSort();
    }

    function toggleCategoryFilter(category, chipElement) {
        const index = activeFilters.categories.indexOf(category);
        if (index > -1) {
            activeFilters.categories.splice(index, 1);
            chipElement.classList.remove('active');
        } else {
            activeFilters.categories.push(category);
            chipElement.classList.add('active');
        }
        applyFiltersAndSort();
    }

    function setupSortChips() {
        const sortChips = document.querySelectorAll('#sort-chips .chip');
        sortChips.forEach(chip => {
            if (chip.dataset.sort === 'name') {
                chip.classList.add('active');
            }
            chip.addEventListener('click', () => {
                sortChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                activeFilters.sort = chip.dataset.sort;
                applyFiltersAndSort();
            });
        });
    }

    function resetFilters() {
        activeFilters = {
            sort: 'name',
            stores: [],
            categories: [],
            availableOnly: false
        };

        document.querySelectorAll('.chip').forEach(chip => {
            chip.classList.remove('active');
        });

        const nameChip = document.querySelector('[data-sort="name"]');
        if (nameChip) nameChip.classList.add('active');

        document.getElementById('available-only-filter').checked = false;

        applyFiltersAndSort();
    }

    function showSkeletons(
        count = 10,
        maxOpacity = 1,
        minOpacity = 0.1
    ) {
        const container = document.getElementById("product-list");

        container.innerHTML = "";

        for (let i = 0; i < count; i++) {

            const skeleton = document.createElement("div");

            skeleton.className = "skeleton-card";

            const opacity =
                maxOpacity -
                (i * ((maxOpacity - minOpacity) / (count - 1)));

            skeleton.style.opacity = opacity;

            container.appendChild(skeleton);
        }
    }

    async function openModal(product) {

        const modal = document.getElementById('product-modal');
        const imagePath = `imgs/${product.id}.png`;
        const price = Number(product.price).toLocaleString();
        const priceTag = document.getElementById('modal-price');
        const reserveButton = document.getElementById('modal-gift-button');
        const storeButton = document.getElementById('modal-link');

        document.getElementById('modal-image').src = imagePath;
        document.getElementById('modal-image').alt = product.name;
        document.getElementById('modal-name').textContent = product.name;


        if (price !== "0") {
            priceTag.textContent = `$${price}`;
            priceTag.style.display = 'block';
        } else {
            priceTag.style.display = 'none';
        }

        // Update progress bar
        const reservedCount = product.reserved || 0;
        const totalCount = product.quantity || 0;
        const progressPercentage = totalCount > 0 ? (reservedCount / totalCount) * 100 : 0;

        document.getElementById('progress-reserved').textContent = reservedCount;
        document.getElementById('progress-total').textContent = totalCount;
        document.getElementById('progress-fill').style.width = progressPercentage<=0 ? '2%' : progressPercentage + '%';
        reserveButton.dataset.productId = product.id;

        reserveButton.addEventListener('click', async function () {

            const productId =
                this.dataset.productId;

            await reserveProduct(productId);

        });

        if (product.link != "") {
            storeButton.style.display = 'block';
            storeButton.href = product.link;
            storeButton.innerHTML = `Ver en ${product.store} <svg class="external-link-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>`;
        } else {
            storeButton.style.display = 'none';
        }

        if (progressPercentage < 100) {
            reserveButton.style.display = 'block';
        } else {
            reserveButton.style.display = 'none';
        }

        modal.style.display = 'block';
    }

    function closeModal() {
        const modal = document.getElementById('product-modal');
        modal.style.display = 'none';
    }

    async function reserveProduct(productId) {


        const button = event.currentTarget;
        if (button.disabled) return;

        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = "Reservando...";

        try {

            const response = await fetch(`${API_URL}?action=reserve&productId=${productId}`
            );

            const result = await response.json();

            if (!result.success) {
                alert(result.error || "No pudimos reservar este producto, intenta otra vez");
            }

            await loadProductsEx();

        } catch (error) {

            console.error(error);

            alert(
                "No pudimos conectar con el sistema de inventario, intenta otra vez"
            );
        } finally {
            button.disabled = false;
            button.textContent = originalText;
            closeModal();
        }
    }

    async function init() {
        showSkeletons();
        await loadProductsEx();

        // Modal close handlers
        const modal = document.getElementById('product-modal');
        const closeBtn = document.querySelector('.modal-close');

        closeBtn.addEventListener('click', closeModal);

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        // Setup filter chips
        setupSortChips();
        document.getElementById('reset-filters').addEventListener('click', resetFilters);

        // Setup availability filter
        document.getElementById('available-only-filter').addEventListener('change', (e) => {
            activeFilters.availableOnly = e.target.checked;
            applyFiltersAndSort();
        });

        openModal(filteredProducts[1]);
    }

    init();
});