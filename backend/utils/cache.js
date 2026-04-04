const logger = require('./logger');

class CacheManager {
    constructor(ttlMinutes = 60) {
        this.cache = new Map();
        this.ttl = ttlMinutes * 60 * 1000;
    }

    set(key, value) {
        const expiry = Date.now() + this.ttl;
        this.cache.set(key, { value, expiry });
        logger.info(`[ai_cache_set] Key: ${key}`);
    }

    get(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() > cached.expiry) {
            this.cache.delete(key);
            logger.info(`[ai_cache_expired] Key: ${key}`);
            return null;
        }

        logger.info(`[ai_cache_hit] Key: ${key}`);
        return cached.value;
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }
}

module.exports = new CacheManager();
