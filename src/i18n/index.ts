import en from './en.json';
import he from './he.json';
import ru from './ru.json';

const translations: Record<string, Record<string, string>> = { en, he, ru };

export type Language = 'en' | 'he' | 'ru';

export function t(key: string, lang: Language = 'en'): string {
  return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
}

export function isRtl(lang: Language): boolean {
  return lang === 'he';
}
