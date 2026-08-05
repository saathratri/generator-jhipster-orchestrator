/*
 * Copyright (c) 2026 Saathratri, LLC. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Saathratri-Proprietary
 * Proprietary and confidential - see LICENSE in the repository root.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

const SUB_GENERATOR = 'server';
const BLUEPRINT_NAMESPACE = `jhipster:${SUB_GENERATOR}`;

async function runServer(config) {
  await helpers
    .run(BLUEPRINT_NAMESPACE)
    .withJHipsterConfig(config)
    .withOptions({ ignoreNeedlesError: true })
    .withJHipsterGenerators()
    .withConfiguredBlueprint()
    .withBlueprintConfig();
}

const templateFiles = () => Object.keys(result.getSnapshot()).filter(k => k.startsWith('template-file'));

describe('SubGenerator server of orchestrator JHipster blueprint', () => {
  describe('run', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig()
        .withOptions({
          ignoreNeedlesError: true,
        })
        .withJHipsterGenerators()
        .withConfiguredBlueprint()
        .withBlueprintConfig();
    });

    it('should succeed', () => {
      expect(result.getStateSnapshot()).toMatchSnapshot();
    });
  });

  // The server generator is a dispatcher: COMPOSING routes to sql-spring-boot or
  // cassandra-spring-boot by databaseType, and composes heroku-orchestrator for
  // microservice|gateway apps. These cases assert the routing produces the right
  // server stack.
  describe('dispatch: microservice (sql)', () => {
    beforeAll(async () => {
      await runServer({
        applicationType: 'microservice',
        databaseType: 'sql',
        authenticationType: 'oauth2',
        baseName: 'orgsvc',
        packageName: 'com.saathratri.org',
      });
    });

    it('routes to the SQL Spring Boot generator (not Cassandra)', () => {
      const files = templateFiles();
      expect(files).toContain('template-file-sql-spring-boot');
      expect(files).not.toContain('template-file-cassandra-spring-boot');
    });

    it('composes heroku-orchestrator for the microservice', () => {
      result.assertFile('Procfile');
    });
  });

  describe('dispatch: microservice (cassandra)', () => {
    beforeAll(async () => {
      await runServer({
        applicationType: 'microservice',
        databaseType: 'cassandra',
        authenticationType: 'oauth2',
        baseName: 'cassandrablogsvc',
        packageName: 'com.saathratri.cassandrablog',
      });
    });

    it('routes to the Cassandra Spring Boot generator (not SQL)', () => {
      const files = templateFiles();
      expect(files).toContain('template-file-cassandra-spring-boot');
      expect(files).not.toContain('template-file-sql-spring-boot');
    });
  });
});
