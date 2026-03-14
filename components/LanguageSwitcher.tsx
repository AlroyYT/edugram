import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'hi', label: 'हिन्दी' },
        { code: 'kn', label: 'ಕನ್ನಡ' },
    ];

    const handleChange = (langCode: string) => {
        i18n.changeLanguage(langCode);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 10,
            right: 10,
            zIndex: 9999,
            display: 'flex',
            gap: '6px',
        }}>
            {languages.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => handleChange(lang.code)}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: i18n.language === lang.code ? '2px solid #6366f1' : '1px solid #ccc',
                        background: i18n.language === lang.code ? '#6366f1' : '#fff',
                        color: i18n.language === lang.code ? '#fff' : '#333',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                    }}
                >
                    {lang.label}
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
