import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import ejs from 'ejs';

// The REAL template this blueprint writes for every generated service's config/application-prod.yml - only its Auth0
// audience block, rendered as the generator renders it, for a gateway and for a microservice.
const TEMPLATE = readFileSync(
  fileURLToPath(new URL('./templates/src/main/resources/config/application-prod.yml.ejs', import.meta.url)),
  'utf8',
);
const START = '# --- SAATHRATRI CHANGE: Auth0 OAuth2 audience';
const END = '# --- END SAATHRATRI CHANGE ---';

function audiences(applicationTypeGateway) {
  const from = TEMPLATE.indexOf(START);
  const block = TEMPLATE.slice(from, TEMPLATE.indexOf(END, from) + END.length);
  const rendered = ejs.render(block, { applicationTypeGateway, authenticationTypeOauth2: true });
  return rendered
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- '))
    .map(line => line.slice(2));
}

describe('the audiences a generated service accepts in production (Auth0)', () => {
  // 2026-09-27: service-to-service tokens were Auth0 MANAGEMENT API tokens (read:users read:roles update:users) because
  // the tenant's default audience is /api/v2/ and the gateway accepted nothing else. They move to Saathratri's own API,
  // https://api.example.com - release 1 accepts it BESIDE the old two, so nothing breaks while callers switch;
  // release 2 drops the Azure identifier and /api/v2/.
  for (const [what, gateway] of [
    ['the gateway', true],
    ['a microservice', false],
  ]) {
    it(`${what} accepts Saathratri's own API`, () => {
      expect(audiences(gateway)).toContain('https://api.example.com');
    });

    it(`${what} still accepts the old two during the switch`, () => {
      expect(audiences(gateway)).toEqual(
        expect.arrayContaining(['https://${AUTH0_DOMAIN}/api/v2/', 'https://saathratriapimanagementservcie.azure-api.net']),
      );
    });
  }

  it('lists Saathratri API first - the audience every caller now asks for', () => {
    expect(audiences(true)[0]).toBe('https://api.example.com');
    expect(audiences(false)[0]).toBe('https://api.example.com');
  });
});
