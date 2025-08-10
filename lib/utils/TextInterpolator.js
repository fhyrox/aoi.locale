class TextInterpolator {
    /**
     * Replaces parameters in text
     * @param {string} text - Raw text
     * @param {Array|Object} params - Parameter list or named parameters object
     * @returns {string} Processed text
     */
    static interpolate(text, params) {
        if (!params) return text;

        if (typeof params === 'object' && !Array.isArray(params)) {
            return this.interpolateNamedParams(text, params);
        }

        return this.interpolateArrayParams(text, params);
    }

    /**
     * Interpolates named parameters
     * @param {string} text - Raw text
     * @param {Object} params - Named parameters object
     * @returns {string} Processed text
     */
    static interpolateNamedParams(text, params) {
        text = text.replace(/\{(\w+)\}/g, (match, name) => {
            const lowerName = name.toLowerCase();
            
            if (params.hasOwnProperty(lowerName)) {
                return params[lowerName];
            }
            
            for (const [key, value] of Object.entries(params)) {
                if (key.toLowerCase() === lowerName) {
                    return value;
                }
            }
            
            return match;
        });
        return text;
    }

    /**
     * Interpolates array-based parameters
     * @param {string} text - Raw text
     * @param {Array} params - Parameter array
     * @returns {string} Processed text
     */
    static interpolateArrayParams(text, params) {
        if (Array.isArray(params) && params.length === 0) return text;

        text = text.replace(/\{(\d+)\}/g, (match, index) => {
            const i = parseInt(index);
            return params[i] !== undefined ? params[i] : match;
        });

        const namedMappings = {
            'user': 0,
            'username': 0,
            'name': 0,
            'server': 1,
            'servername': 1,
            'guild': 1,
            'channel': 2,
            'level': 3,
            'value': 4
        };

        text = text.replace(/\{(\w+)\}/g, (match, name) => {
            const lowerName = name.toLowerCase();
            
            if (namedMappings.hasOwnProperty(lowerName)) {
                const index = namedMappings[lowerName];
                return params[index] !== undefined ? params[index] : match;
            }
            
            for (const param of params) {
                if (typeof param === 'string' && param.includes('=')) {
                    const [key, value] = param.split('=', 2);
                    if (key.toLowerCase() === lowerName) {
                        return value;
                    }
                }
            }
            
            return match;
        });

        return text;
    }

    /**
     * Parses semicolon-separated arguments
     * @param {Array} args - Raw arguments array
     * @returns {Object} Parsed parameters and locale info
     */
    static parseArguments(args) {
        let locale = null;
        let params = {};
        let forceLocale = false;
        
        for (const arg of args) {
            if (!arg) continue;
            
            const trimmedArg = arg.trim();
            
            if (trimmedArg.includes(':')) {
                const [paramKey, paramValue] = trimmedArg.split(':', 2);
                if (paramKey && paramValue) {
                    params[paramKey.trim()] = paramValue.trim();
                }
            } 
            else if (trimmedArg.includes('|')) {
                const [langParam, defaultLang] = trimmedArg.split('|', 2);
                locale = langParam.replace('?', '').trim() || defaultLang.trim();
                forceLocale = true;
            }
            else if (/^[a-z]{2,3}$/i.test(trimmedArg)) {
                locale = trimmedArg;
                forceLocale = true;
            }
            else {
                const paramIndex = Object.keys(params).length;
                params[paramIndex] = trimmedArg;
            }
        }

        return { locale, params, forceLocale };
    }
}

module.exports = TextInterpolator;
