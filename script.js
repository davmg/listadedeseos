 //Read CSV guests
        document.addEventListener("DOMContentLoaded", function () {

            const API_URL = "https://script.google.com/macros/s/AKfycbzpW9qNHgYW4LKEBpGFkoMqJDFJLm6TPUfBfTWruEKLuECmqjEWHx6lOtjqmHCKT0QE6g/exec";
            let products = [];
            let filteredProducts = [];
            let activeFilters = {
                sort: 'name',
                stores: [],
                categories: []
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
                    const response = await fetch(API_URL);

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

                    card.className = 'product-card';
                    console.log(price);
                    card.innerHTML = `
                        <div class="img-container">
                            <p class="store-tag">${product.store}</p>
                            <img src="${imagePath}" alt="${product.name}">
                        </div>
                        <h2>${product.name}</h2>
                        <p class="price-tag"><span class="currency">$${price}</span></p>
                        <p class="reserved-tag">Reservados: ${product.reserved}/${product.quantity}</p>
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
                    categories: []
                };
                
                document.querySelectorAll('.chip').forEach(chip => {
                    chip.classList.remove('active');
                });
                
                const nameChip = document.querySelector('[data-sort="name"]');
                if (nameChip) nameChip.classList.add('active');
                
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

            function openModal(product) {
                const modal = document.getElementById('product-modal');
                const imagePath = `imgs/${product.id}.png`;
                const price = Number(product.price).toLocaleString();

                document.getElementById('modal-image').src = imagePath;
                document.getElementById('modal-image').alt = product.name;
                document.getElementById('modal-name').textContent = product.name;
                document.getElementById('modal-store').textContent = `Tienda: ${product.store}`;
                document.getElementById('modal-category').textContent = `Categoría: ${product.category}`;
                document.getElementById('modal-price').textContent = `Precio: $${price}`;
                document.getElementById('modal-quantity').textContent = `Disponibles: ${product.quantity}`;
                document.getElementById('modal-link').href = product.link;

                modal.style.display = 'block';
            }

            function closeModal() {
                const modal = document.getElementById('product-modal');
                modal.style.display = 'none';
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
            }

            init();
        });