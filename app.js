// Variables globales
let currentCalculation = null;
let currentChart = 'profit';
let chartInstance = null;

// Cargar librería de gráficos (Chart.js)
const loadChartJS = () => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

// Función principal de cálculo actualizada
async function calculateProfit() {
    try {
        // Mostrar loading
        const btn = document.querySelector('.calculate-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Calculando...';
        btn.disabled = true;

        // Obtener valores
        const productName = document.getElementById('productName').value || 'Producto sin nombre';
        const salePrice = parseFloat(document.getElementById('salePrice').value) || 0;
        const productCost = parseFloat(document.getElementById('productCost').value) || 0;
        const fulfillmentType = document.getElementById('fulfillmentType').value;
        const productWeight = parseFloat(document.getElementById('productWeight').value) || 0;
        const productSize = document.getElementById('productSize').value;
        const category = document.getElementById('category').value;
        const advertisingCost = parseFloat(document.getElementById('advertisingCost').value) || 0;
        const shippingCost = fulfillmentType === 'FBM' ? 
            (parseFloat(document.getElementById('shippingCost').value) || 0) : 0;

        // Validaciones
        if (salePrice <= 0) {
            alert('Por favor ingresa un precio de venta válido');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }

        // Obtener tarifas de la API
        const [categoryFees, fbaFees] = await Promise.all([
            window.amazonAPI.getCategoryFees(category),
            fulfillmentType === 'FBA' ? 
                window.amazonAPI.calculateFBAFees(productWeight, null, productSize) : 
                null
        ]);

        // Calcular tarifas
        const referralFee = Math.max(
            salePrice * categoryFees.referral,
            categoryFees.minReferral || 0
        );
        
        const fulfillmentFee = fulfillmentType === 'FBA' ? 
            fbaFees.fulfillmentFee : 
            shippingCost;

        const closingFee = categoryFees.closing || 0;
        const totalFees = referralFee + fulfillmentFee + closingFee + productCost + advertisingCost;
        const netProfit = salePrice - totalFees;
        const profitMargin = (netProfit / salePrice) * 100;
        const roi = productCost > 0 ? 
            ((netProfit - advertisingCost) / (productCost + advertisingCost)) * 100 : 
            0;

        // Guardar cálculo actual
        currentCalculation = {
            productName,
            salePrice,
            productCost,
            fulfillmentType,
            referralFee,
            fulfillmentFee,
            closingFee,
            advertisingCost,
            totalFees,
            netProfit,
            profitMargin,
            roi,
            category,
            productWeight,
            productSize
        };

        // Actualizar UI
        displayResults(currentCalculation);
        addToHistory(currentCalculation);

        // Restaurar botón
        btn.innerHTML = originalText;
        btn.disabled = false;

        // Scroll a resultados
        document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error en el cálculo:', error);
        alert('Error al calcular. Por favor intenta de nuevo.');
        document.querySelector('.calculate-btn').disabled = false;
    }
}

// Función para agregar a comparación
function addCurrentToComparison() {
    if (!currentCalculation) {
        alert('Primero realiza un cálculo de producto');
        return;
    }

    try {
        const added = window.productComparison.addProduct(currentCalculation);
        updateComparisonUI();
        
        // Notificación visual
        showNotification('Producto agregado a comparación', 'success');
    } catch (error) {
        alert(error.message);
    }
}

// Actualizar UI de comparación
function updateComparisonUI() {
    const products = window.productComparison.getAllProducts();
    const comparisonContent = document.getElementById('comparisonContent');
    const comparisonSummary = document.getElementById('comparisonSummary');
    const chartPanel = document.getElementById('chartPanel');
    const productCount = document.getElementById('productCount');

    productCount.textContent = `${products.length}/5 productos`;

    if (products.length === 0) {
        comparisonContent.innerHTML = `
            <div class="comparison-placeholder">
                <p>Agrega productos para comparar su rentabilidad</p>
                <p class="hint">Calcula un producto y haz clic en "Agregar actual"</p>
            </div>
        `;
        comparisonSummary.style.display = 'none';
        chartPanel.style.display = 'none';
        return;
    }

    // Crear tabla de comparación
    comparisonContent.innerHTML = `
        <div class="comparison-table">
            <table>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Tipo</th>
                        <th>Precio</th>
                        <th>Costo Total</th>
                        <th>Ganancia</th>
                        <th>Margen</th>
                        <th>ROI</th>
                        <th>Score</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td class="product-cell">${p.productName}</td>
                            <td><span class="badge">${p.fulfillmentType}</span></td>
                            <td>$${p.salePrice.toFixed(2)}</td>
                            <td>$${p.totalFees.toFixed(2)}</td>
                            <td class="${p.metrics.netProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
                                $${p.metrics.netProfit.toFixed(2)}
                            </td>
                            <td>${p.metrics.profitMargin.toFixed(1)}%</td>
                            <td>${p.metrics.roi.toFixed(1)}%</td>
                            <td>
                                <span class="score-badge ${getScoreClass(p.metrics.score)}">
                                    ${p.metrics.score}
                                </span>
                            </td>
                            <td>
                                <button class="remove-btn" onclick="removeFromComparison('${p.id}')">
                                    ×
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Mostrar resumen
    comparisonSummary.style.display = 'block';
    chartPanel.style.display = 'block';

    // Actualizar resúmenes
    const best = window.productComparison.getBestProduct();
    const avg = window.productComparison.getAverageMetrics();

    document.getElementById('bestProduct').innerHTML = best ? `
        <p style="font-weight: 600; color: #2d3748;">${best.productName}</p>
        <p style="color: #38a169; font-size: 1.25rem; font-weight: 700;">
            $${best.metrics.netProfit.toFixed(2)}
        </p>
        <p style="color: #718096; font-size: 0.875rem;">
            Score: ${best.metrics.score}/100
        </p>
    ` : '';

    document.getElementById('averageMetrics').innerHTML = avg ? `
        <p>Ganancia promedio:</p>
        <p style="color: #2d3748; font-size: 1.25rem; font-weight: 700;">
            $${avg.netProfit.toFixed(2)}
        </p>
        <p>Margen promedio: ${avg.profitMargin.toFixed(1)}%</p>
        <p>ROI promedio: ${avg.roi.toFixed(1)}%</p>
    ` : '';

    document.getElementById('recommendation').innerHTML = generateRecommendation(products);

    // Actualizar gráfico
    updateChart(products);
}

function getScoreClass(score) {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-average';
    return 'score-poor';
}

function removeFromComparison(id) {
    window.productComparison.removeProduct(id);
    updateComparisonUI();
}

function clearComparison() {
    if (confirm('¿Limpiar toda la comparación?')) {
        window.productComparison.clear();
        updateComparisonUI();
    }
}

function generateRecommendation(products) {
    const best = window.productComparison.getBestProduct();
    const worst = window.productComparison.getWorstProduct();
    
    if (!best || !worst) return '';

    let recommendation = '';
    
    if (best.metrics.netProfit > 10 && best.metrics.profitMargin > 30) {
        recommendation = `<strong>${best.productName}</strong> es tu producto estrella. `;
        recommendation += 'Considera aumentar el inventario y la inversión publicitaria.';
    } else if (best.metrics.netProfit > 0) {
        recommendation = `<strong>${best.productName}</strong> tiene el mejor rendimiento. `;
        recommendation += 'Busca optimizar costos para mejorar márgenes.';
    } else {
        recommendation = 'Todos los productos tienen pérdidas. Revisa tus costos y precios.';
    }

    return `<p class="recommendation-text">${recommendation}</p>`;
}

// Actualizar gráfico de comparación
function updateChart(products) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js no está cargado aún');
        return;
    }

    const ctx = document.getElementById('chartCanvas').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = products.map(p => p.productName.substring(0, 20));
    const colors = products.map((_, i) => {
        const hue = (i * 360 / products.length) % 360;
        return `hsl(${hue}, 70%, 60%)`;
    });

    let data, title;
    
    switch(currentChart) {
        case 'profit':
            data = products.map(p => p.metrics.netProfit);
            title = 'Ganancia Neta por Producto ($)';
            break;
        case 'margin':
            data = products.map(p => p.metrics.profitMargin);
            title = 'Margen de Ganancia por Producto (%)';
            break;
        case 'roi':
            data = products.map(p => p.metrics.roi);
            title = 'ROI por Producto (%)';
            break;
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('60%', '50%')),
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return currentChart === 'profit' ? 
                                `$${context.parsed.y.toFixed(2)}` : 
                                `${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return currentChart === 'profit' ? `$${value}` : `${value}%`;
                        }
                    }
                }
            }
        }
    });
}

function switchChart(type) {
    currentChart = type;
    
    // Actualizar tabs
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.toLowerCase().includes(type)) {
            tab.classList.add('active');
        }
    });

    // Actualizar gráfico
    const products = window.productComparison.getAllProducts();
    if (products.length > 0) {
        updateChart(products);
    }
}

// Notificaciones
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#38a169' : type === 'error' ? '#e53e3e' : '#667eea'};
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Agregar animaciones CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid white;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadChartJS();
        console.log('Chart.js cargado exitosamente');
    } catch (error) {
        console.warn('No se pudo cargar Chart.js:', error);
    }

    // Cargar historial del localStorage
    const savedHistory = localStorage.getItem('amazonCalcHistory');
    if (savedHistory) {
        calculationHistory = JSON.parse(savedHistory);
        renderHistory();
    }

    console.log('Calculadora Amazon inicializada');
    console.log('API Stats:', window.amazonAPI.getStats());
});