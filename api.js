// Simulación de API de Amazon Fees
class AmazonAPI {
    constructor() {
        this.baseURL = 'https://api.amazon-fees-simulator.com/v1';
        this.cache = new Map();
        this.requestCount = 0;
    }

    // Simular delay de red
    async simulateNetworkDelay() {
        const delay = Math.random() * 500 + 200; // 200-700ms
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    // Obtener tarifas actualizadas por categoría
    async getCategoryFees(category, marketplace = 'US') {
        const cacheKey = `${category}-${marketplace}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        await this.simulateNetworkDelay();
        this.requestCount++;

        const fees = {
            'US': {
                electronics: { referral: 0.15, closing: 0, minReferral: 0.30 },
                home: { referral: 0.15, closing: 0, minReferral: 0.30 },
                books: { referral: 0.15, closing: 1.80, minReferral: 0 },
                clothing: { referral: 0.17, closing: 0, minReferral: 0.30 },
                sports: { referral: 0.15, closing: 0, minReferral: 0.30 },
                toys: { referral: 0.15, closing: 0, minReferral: 0.30 },
                beauty: { referral: 0.15, closing: 0, minReferral: 0.30 },
                health: { referral: 0.15, closing: 0, minReferral: 0.30 },
                automotive: { referral: 0.12, closing: 0, minReferral: 0.30 },
                baby: { referral: 0.15, closing: 0, minReferral: 0.30 },
                grocery: { referral: 0.15, closing: 0, minReferral: 0 },
                jewelry: { referral: 0.20, closing: 0, minReferral: 0.30 },
                shoes: { referral: 0.15, closing: 0, minReferral: 0.30 },
                watches: { referral: 0.16, closing: 0, minReferral: 0.30 },
                other: { referral: 0.15, closing: 0, minReferral: 0.30 }
            },
            'MX': {
                electronics: { referral: 0.15, closing: 0, minReferral: 10 },
                home: { referral: 0.15, closing: 0, minReferral: 10 },
                books: { referral: 0.15, closing: 8, minReferral: 0 },
                clothing: { referral: 0.17, closing: 0, minReferral: 10 },
                sports: { referral: 0.15, closing: 0, minReferral: 10 },
                toys: { referral: 0.15, closing: 0, minReferral: 10 },
                beauty: { referral: 0.15, closing: 0, minReferral: 10 },
                other: { referral: 0.15, closing: 0, minReferral: 10 }
            }
        };

        const result = fees[marketplace]?.[category] || fees[marketplace]?.other;
        this.cache.set(cacheKey, result);
        
        return result;
    }

    // Calcular tarifas FBA detalladas
    async calculateFBAFees(weight, dimensions, sizeCategory) {
        await this.simulateNetworkDelay();
        this.requestCount++;

        const sizeTiers = {
            'small-standard': {
                maxWeight: 0.75,
                maxDimensions: { length: 15, width: 12, height: 0.75 },
                baseRate: 2.50,
                perLbRate: 0.25,
                volumetricFactor: 139
            },
            'large-standard': {
                maxWeight: 20,
                maxDimensions: { length: 18, width: 14, height: 8 },
                baseRate: 3.50,
                perLbRate: 0.35,
                volumetricFactor: 139
            },
            'small-oversize': {
                maxWeight: 70,
                maxDimensions: { length: 60, width: 30, height: 130 },
                baseRate: 8.00,
                perLbRate: 0.45,
                volumetricFactor: 139
            },
            'large-oversize': {
                maxWeight: 150,
                maxDimensions: { length: 108, width: 165, height: 165 },
                baseRate: 12.00,
                perLbRate: 0.55,
                volumetricFactor: 139
            }
        };

        const tier = sizeTiers[sizeCategory] || sizeTiers['large-standard'];
        
        // Calcular peso volumétrico
        const dimWeight = dimensions ? 
            (dimensions.length * dimensions.width * dimensions.height) / tier.volumetricFactor : 
            weight;
        
        const billableWeight = Math.max(weight, dimWeight);
        const fulfillmentFee = tier.baseRate + (billableWeight * tier.perLbRate);

        return {
            fulfillmentFee,
            billableWeight,
            dimWeight,
            sizeTier: sizeCategory,
            breakdown: {
                baseRate: tier.baseRate,
                weightCharge: billableWeight * tier.perLbRate,
                total: fulfillmentFee
            }
        };
    }

    // Obtener estimación de almacenamiento mensual
    async getStorageFee(dimensions, month = new Date().getMonth()) {
        await this.simulateNetworkDelay();
        
        const cubicFeet = dimensions ? 
            (dimensions.length * dimensions.width * dimensions.height) / 1728 : 
            0.5;

        // Tarifas varían por temporada
        const isPeakSeason = month >= 9 && month <= 11; // Oct-Dic
        const ratePerCubicFoot = isPeakSeason ? 2.40 : 0.87;

        return {
            monthlyStorageFee: cubicFeet * ratePerCubicFoot,
            cubicFeet,
            isPeakSeason,
            ratePerCubicFoot
        };
    }

    // Obtener tipos de cambio (simulado)
    async getExchangeRate(from = 'USD', to = 'MXN') {
        await this.simulateNetworkDelay();
        
        const rates = {
            'USD-MXN': 17.50 + (Math.random() - 0.5) * 0.5,
            'USD-EUR': 0.92 + (Math.random() - 0.5) * 0.02,
            'USD-GBP': 0.79 + (Math.random() - 0.5) * 0.02
        };

        return {
            rate: rates[`${from}-${to}`] || 1,
            timestamp: new Date().toISOString(),
            from,
            to
        };
    }

    // Limpiar caché
    clearCache() {
        this.cache.clear();
        console.log('API Cache cleared');
    }

    // Obtener estadísticas de uso
    getStats() {
        return {
            requestCount: this.requestCount,
            cacheSize: this.cache.size,
            timestamp: new Date().toISOString()
        };
    }
}

// Exportar instancia global
window.amazonAPI = new AmazonAPI();