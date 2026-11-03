import { useMemo, useState } from 'react';
import { LanguageContext } from './i18n/LanguageContext';
import { translations } from './i18n/translations';

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(() => localStorage.getItem('hydroos-language') || 'en');
    const value = useMemo(() => ({
        language,
        setLanguage: (next) => {
            localStorage.setItem('hydroos-language', next);
            setLanguage(next);
        },
        t: translations[language]
    }), [language]);
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
