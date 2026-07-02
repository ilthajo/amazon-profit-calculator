class ProductComparison {
    constructor() {
        this.products = [];
        this.maxProducts = 5;
    }

    addProduct(product) {
        if (this.products.length >= this.maxProducts) {
            throw new Error(`Máximo ${this.maxProducts} productos para comparar`);
        }

        const productWithId = {
            ...product,
            id: Date.now().toString(),
            timestamp: new Date(),
            metrics: this.calculateMetrics(product)
        };

        this.products.push(productWithId);
        return productWithId;
    }

    removeProduct(id) {
        this.products = this.products.filter(p => p.id !== id);
    }

    updateProduct(id, updates) {
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.products[index] = {
                ...this.products[index],
                ...updates,
                metrics: this.calculateMetrics({ ...this.products[index], ...updates })
            };
        }
    }

    calculateMetrics(product) {
        const netProfit = product.salePrice - product.totalFees;
        const profitMargin = (netProfit / product.salePrice) * 100;
        const roi = product.productCost > 0 ? 
            ((netProfit - (product.advertisingCost || 0)) / (product.productCost + (product.advertisingCost || 0))) * 100 : 
            0;
        const breakEvenUnits = product.productCost > 0 ? 
            Math.ceil(product.totalFees / netProfit) : 
            Infinity;

        return {
            netProfit,
            profitMargin,
            roi,
            breakEvenUnits,
            score: this.calculateScore(netProfit, profitMargin, roi)
        };
    }

    calculateScore(netProfit, margin, roi) {
        // Score de 0 a 100
        const profitScore = Math.min(netProfit / 20 * 40, 40); // 40% del score
        const marginScore = Math.min(margin / 50 * 40, 40); // 40% del score
        const roiScore = Math.min(roi / 200 * 20, 20); // 20% del score
        
        return Math.round(profitScore + marginScore + roiScore);
    }

    getBestProduct() {
        if (this.products.length === 0) return null;
        
        return this.products.reduce((best, current) => 
            current.metrics.score > best.metrics.score ? current : best
        );
    }

    getWorstProduct() {
        if (this.products.length === 0) return null;
        
        return this.products.reduce((worst, current) => 
            current.metrics.score < worst.metrics.score ? current : worst
        );
    }

    getAverageMetrics() {
        if (this.products.length === 0) return null;

        const sum = this.products.reduce((acc, product) => ({
            netProfit: acc.netProfit + product.metrics.netProfit,
            profitMargin: acc.profitMargin + product.metrics.profitMargin,
            roi: acc.roi + product.metrics.roi
        }), { netProfit: 0, profitMargin: 0, roi: 0 });

        return {
            netProfit: sum.netProfit / this.products.length,
            profitMargin: sum.profitMargin / this.products.length,
            roi: sum.roi / this.products.length
        };
    }

    getAllProducts() {
        return this.products;
    }

    clear() {
        this.products = [];
    }
}

window.productComparison = new ProductComparison();