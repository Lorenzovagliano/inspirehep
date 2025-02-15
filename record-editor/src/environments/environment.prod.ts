import { version } from './version';

export const environment = {
  production: true,
  baseUrl: '',
  sentryPublicDSN:
    'https://ac471ee3b1ef4d1f884bfeaebaf6d007@sentry.siscern.org/7',
  version,
  schemaUrl: 'https://inspirehep.net/schemas/records/authors.json',
  backofficeApiUrl: 'https://backoffice.inspirehep.net/api',
};
