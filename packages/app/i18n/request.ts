import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const locale = 'da'; // Default locale — will be dynamic later
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
