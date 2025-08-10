const fs = require('fs');
const path = require('path');

class LocaleLoader {
    constructor(localeDir = './locales') {
        this.localeDir = localeDir;
        this.locales = new Map();
    }

    /**
     * Loads all language files from the locale directory
     */
    loadLocales() {
        try {
            if (!fs.existsSync(this.localeDir)) {
                fs.mkdirSync(this.localeDir, { recursive: true });
                console.log(`[aoi.locale] Locale directory created: ${this.localeDir}`);
            }

            const files = fs.readdirSync(this.localeDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            for (const file of jsonFiles) {
                const locale = path.basename(file, '.json');
                const filePath = path.join(this.localeDir, file);
                
                try {
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    this.locales.set(locale, data);
                } catch (error) {
                    console.error(`[aoi.locale] Error loading ${file}: ${error.message}`);
                }
            }

            if (this.locales.size === 0) {
                console.warn('[aoi.locale] No locale files found. Creating example files...');
                this.createExampleLocales();
            }
        } catch (error) {
            console.error(`[aoi.locale] Error loading locale files: ${error.message}`);
        }
    }

    /**
     * Creates example locale files from examples directory
     */
    createExampleLocales() {
        try {
            const examplesDir = path.join(__dirname, '..', 'examples');
            
            if (!fs.existsSync(examplesDir)) {
                console.warn('[aoi.locale] Examples directory not found, creating basic examples...');
                this.createBasicExamples();
                return;
            }

            const exampleFiles = fs.readdirSync(examplesDir).filter(file => file.endsWith('.json'));
            
            if (exampleFiles.length === 0) {
                console.warn('[aoi.locale] No example files found, creating basic examples...');
                this.createBasicExamples();
                return;
            }

            for (const file of exampleFiles) {
                const examplePath = path.join(examplesDir, file);
                const targetPath = path.join(this.localeDir, file);
                
                try {
                    const content = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
                    
                    fs.writeFileSync(targetPath, JSON.stringify(content, null, 4));
                    
                    const locale = path.basename(file, '.json');
                    this.locales.set(locale, content);
                } catch (error) {
                    console.error(`[aoi.locale] Error copying example file ${file}: ${error.message}`);
                }
            }
        } catch (error) {
            console.error(`[aoi.locale] Error creating example locales: ${error.message}`);
            this.createBasicExamples();
        }
    }

    /**
     * Creates basic example files if examples directory is not available
     */
    createBasicExamples() {
        const basicExamples = {
            'en.json': {
                "welcome": "Welcome to our server!",
                "goodbye": "Goodbye, see you later!",
                "hello": "Hello {user}!",
                "error": "An error occurred!",
                "success": "Operation completed successfully!"
            },
            'tr.json': {
                "welcome": "Sunucumuza hoş geldiniz!",
                "goodbye": "Hoşçakal, sonra görüşürüz!",
                "hello": "Merhaba {user}!",
                "error": "Bir hata oluştu!",
                "success": "İşlem başarıyla tamamlandı!"
            }
        };

        for (const [filename, content] of Object.entries(basicExamples)) {
            const filePath = path.join(this.localeDir, filename);
            fs.writeFileSync(filePath, JSON.stringify(content, null, 4));
            
            const locale = path.basename(filename, '.json');
            this.locales.set(locale, content);
            console.log(`[aoi.locale] Basic ${locale} file created`);
        }
    }

    /**
     * Gets text for key from specified locale
     * @param {string} key - Translation key
     * @param {string} locale - Language code
     * @returns {string|null} Text or null
     */
    getFromLocale(key, locale) {
        const localeData = this.locales.get(locale);
        if (!localeData) return null;

        const keys = key.split('.');
        let current = localeData;

        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return null;
            }
        }

        return typeof current === 'string' ? current : null;
    }

    /**
     * Gets the first available locale from loaded locales
     * @returns {string|null} First locale or null
     */
    getFirstAvailableLocale() {
        const locales = Array.from(this.locales.keys());
        return locales.length > 0 ? locales[0] : null;
    }

    /**
     * Returns all loaded locales
     * @returns {Array} Locale list
     */
    getAvailableLocales() {
        return Array.from(this.locales.keys());
    }

    /**
     * Adds a new locale
     * @param {string} locale - Language code
     * @param {Object} data - Translation data
     */
    addLocale(locale, data) {
        this.locales.set(locale, data);
        console.log(`[aoi.locale] ${locale} language added`);
    }

    /**
     * Checks if a locale exists
     * @param {string} locale - Language code
     * @returns {boolean} Whether locale exists
     */
    hasLocale(locale) {
        return this.locales.has(locale);
    }
}

module.exports = LocaleLoader;
