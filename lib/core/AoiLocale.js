const LocaleLoader = require('../loaders/LocaleLoader');
const LanguageDetector = require('../detectors/LanguageDetector');
const TextInterpolator = require('../utils/TextInterpolator');
const FunctionManager = require('../managers/FunctionManager');

class AoiLocale {
    constructor() {
        this.loader = null;
        this.detector = null;
        this.functionManager = null;
        this.client = null;
        this.localeDir = './locales';
    }

    /**
     * Integrates the module with aoi.js bot
     * @param {AoiClient} client - aoi.js bot client
     * @param {Object} options - Configuration options
     */
    init(client, options = {}) {
        this.client = client;
        this.localeDir = options.localeDir || './locales';
        this.debug = options.debug || false;
        
        this.loader = new LocaleLoader(this.localeDir, this.debug);
        this.detector = new LanguageDetector(client, options, this.debug);
        this.functionManager = new FunctionManager(client, this);

        this.loader.loadLocales();

        this.functionManager.addLocaleFunction();

        return this;
    }

    /**
     * Gets text for the specified key
     * @param {string} key - Translation key
     * @param {string} locale - Target language
     * @param {Array|Object} params - Text parameters
     * @returns {string} Translated text
     */
    getText(key, locale, params = []) {
        let text = this.loader.getFromLocale(key, locale);
        
        if (!text) {
            const firstLocale = this.loader.getFirstAvailableLocale();
            if (firstLocale && firstLocale !== locale) {
                text = this.loader.getFromLocale(key, firstLocale);
            }
        }
        
        if (!text) {
            console.warn(`[aoi.locale] Key '${key}' not found in any locale`);
            return key;
        }

        return TextInterpolator.interpolate(text, params);
    }

    /**
     * Detects user's preferred language
     * @param {Object} d - aoi.js data object
     * @returns {Promise<string|null>} Detected language or null
     */
    async detectUserLanguage(d) {
        return await this.detector.detectUserLanguage(d, this.loader);
    }

    /**
     * Returns the first available locale
     * @returns {string} First available locale
     */
    getLocale() {
        return this.loader.getFirstAvailableLocale();
    }

    /**
     * Gets the first available locale from loaded locales
     * @returns {string|null} First locale or null
     */
    getFirstAvailableLocale() {
        return this.loader.getFirstAvailableLocale();
    }

    /**
     * Returns all loaded locales
     * @returns {Array} Locale list
     */
    getAvailableLocales() {
        return this.loader.getAvailableLocales();
    }

    /**
     * Adds a new locale file
     * @param {string} locale - Language code
     * @param {Object} data - Translation data
     */
    addLocale(locale, data) {
        this.loader.addLocale(locale, data);
    }

    /**
     * Changes the current locale (legacy method)
     * @param {string} locale - New locale
     */
    setLocale(locale) {
        if (this.loader.hasLocale(locale)) {
            console.log(`[aoi.locale] Language changed to ${locale}`);
        } else {
            console.warn(`[aoi.locale] Language '${locale}' not found`);
        }
    }

    /**
     * Checks if a locale exists
     * @param {string} locale - Language code
     * @returns {boolean} Whether locale exists
     */
    hasLocale(locale) {
        return this.loader.hasLocale(locale);
    }
}

module.exports = AoiLocale;
