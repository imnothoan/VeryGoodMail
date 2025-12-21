export { vi, type Translations } from './vi';
export { en } from './en';

export type Language = 'vi' | 'en';

export const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'en', name: 'English', nativeName: 'English' },
];
