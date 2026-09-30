import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The generated services accept JHipster's stock OAuth2 audiences. The blueprint names no downstream API: an
// application that issues tokens for its own API sets jhipster.security.oauth2.audience itself (in its own config,
// an environment variable, or a post-generation step) - the blueprint never does it for one application.
const template = name => readFileSync(fileURLToPath(new URL(`./templates/src/main/resources/config/${name}`, import.meta.url)), 'utf8');

describe('the OAuth2 audiences of a generated service', () => {
  it("application.yml keeps JHipster's stock audiences", () => {
    expect(template('application.yml.ejs')).toMatch(/audience:\s*\r?\n\s*- account\s*\r?\n\s*- api:\/\/default/);
  });

  it('application-prod.yml does not override them', () => {
    expect(template('application-prod.yml.ejs')).not.toMatch(/audience:/);
  });
});
