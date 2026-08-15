import { ar } from './ar.js';
import { en } from './en.js';
import { Language } from '../types.js';

export const translations = {
  ar,
  en,
};

export function getTranslation(lang: Language) {
  return translations[lang] || translations.ar;
}
