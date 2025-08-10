const TextInterpolator = require('../utils/TextInterpolator');

class FunctionManager {
    constructor(client, aoiLocale) {
        this.client = client;
        this.aoiLocale = aoiLocale;
    }

    /**
     * Adds the $locale function to aoi.js
     */
    addLocaleFunction() {
        this.client.functionManager.createFunction({
            name: '$locale',
            type: 'djs',
            code: async (d) => {
                const data = d.util.aoiFunc(d);
                
                if (data.err) return d.error(data.err);

                const [key, ...args] = data.inside.splits;

                if (!key || key.trim() === '') {
                    return d.aoiError.fnError(d, 'custom', {}, 'Key not specified in $locale function');
                }

                const trimmedKey = key.trim();
                const { locale: forcedLocale, params, forceLocale } = TextInterpolator.parseArguments(args);
                
                let locale = forcedLocale;
                
                if (!forceLocale) {
                    locale = await this.aoiLocale.detectUserLanguage(d);
                }
                
                if (!locale) {
                    locale = this.aoiLocale.getFirstAvailableLocale();
                }
                
                const text = this.aoiLocale.getText(trimmedKey, locale, params);
                
                data.result = text;
                return {
                    code: d.util.setCode(data)
                };
            }
        });
    }
}

module.exports = FunctionManager;
