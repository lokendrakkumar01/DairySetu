import React, { createContext, useContext, useState, useEffect } from 'react'
import en from '@/i18n/en'
import hi from '@/i18n/hi'

type Language = 'en' | 'hi'
type Translations = typeof en

interface LanguageContextType {
  language: Language
  t: Translations
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextType | null>(null)

const translations: Record<Language, Translations> = { en, hi }

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem('language') as Language) || 'hi',
  )

  const setLanguage = (lang: Language) => {
    localStorage.setItem('language', lang)
    setLanguageState(lang)
  }

  const toggleLanguage = () => setLanguage(language === 'en' ? 'hi' : 'en')

  const t = translations[language]

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
