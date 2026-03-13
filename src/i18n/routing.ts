import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ja', 'en', 'zh-CN', 'zh-TW', 'ko', 'de', 'fr', 'es', 'pt-BR', 'ru', 'it', 'hi', 'tr', 'ar', 'id', 'pl', 'fa'],
  defaultLocale: 'ja',
  localePrefix: 'as-needed'
});
