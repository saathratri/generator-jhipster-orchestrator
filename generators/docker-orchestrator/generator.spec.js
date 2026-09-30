/*
 * Copyright (c) 2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

// docker-orchestrator writes a custom Keycloak realm-config (jhipster-realm.json) that
// includes the `internal` service-account client used for service-to-service OAuth2.
// It is gated on microservice|gateway and needs the base docker generator's keycloak
// preparation (only computed under authenticationType oauth2), so run the full server.
const BLUEPRINT_NAMESPACE = 'jhipster:server';
const REALM = 'src/main/docker/realm-config/jhipster-realm.json';

async function runServer(config) {
  await helpers
    .run(BLUEPRINT_NAMESPACE)
    .withJHipsterConfig(config)
    .withOptions({ ignoreNeedlesError: true })
    .withJHipsterGenerators()
    .withConfiguredBlueprint()
    .withBlueprintConfig();
}

describe('SubGenerator docker-orchestrator of orchestrator JHipster blueprint', () => {
  describe('microservice (oauth2)', () => {
    beforeAll(async () => {
      await runServer({
        applicationType: 'microservice',
        databaseType: 'sql',
        authenticationType: 'oauth2',
        baseName: 'orgsvc',
        packageName: 'com.saathratri.org',
      });
    });

    it('writes the Keycloak realm-config', () => {
      result.assertFile(REALM);
    });

    it('adds the orchestrator service-account client for service-to-service auth', () => {
      result.assertFileContent(REALM, /"clientId":\s*"orchestrator-client-id"/);
      result.assertFileContent(REALM, /"secret":\s*"orchestrator-client-secret"/);
    });

    it("is generic: JHipster's own roles only, and no user attributes of any one application", () => {
      const realm = JSON.parse(result.getSnapshot()[REALM].contents);
      const roles = realm.roles.realm.map(role => role.name).sort();
      expect(roles).toEqual(['ROLE_ADMIN', 'ROLE_USER', 'default-roles-jhipster', 'offline_access', 'uma_authorization']);
      for (const user of realm.users) {
        expect(user.attributes).toBeUndefined();
      }
    });
  });

  describe('monolith (gated off)', () => {
    beforeAll(async () => {
      await runServer({
        applicationType: 'monolith',
        databaseType: 'sql',
        authenticationType: 'oauth2',
        baseName: 'mono',
        packageName: 'com.saathratri.mono',
      });
    });

    it('does NOT write the orchestrator realm-config for a monolith', () => {
      const realm = result.getSnapshot()[REALM];
      // Either no realm at all, or (if the base generator wrote one) without the
      // orchestrator-specific service-account client.
      if (realm && realm.contents) {
        expect(/orchestrator-client-id/.test(realm.contents)).toBe(false);
      } else {
        expect(realm).toBeFalsy();
      }
    });
  });
});
