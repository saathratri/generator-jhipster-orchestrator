/*
 * Copyright (c) 2023-2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

const SUB_GENERATOR = 'sql-angular';
const BLUEPRINT_NAMESPACE = `jhipster-orchestrator:${SUB_GENERATOR}`;

describe('SubGenerator sql-angular of ai-postgresql JHipster blueprint', () => {
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

    it('entity-navbar-items.ts exports the items as default - the native-federation gateway loads `.default`', () => {
      result.assertFileContent('src/main/webapp/app/entities/entity-navbar-items.ts', /^export default EntityNavbarItems;$/m);
    });
  });

  describe('run as a microfrontend microservice', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({ applicationType: 'microservice', microfrontend: true, clientFramework: 'angular' })
        .withOptions({
          ignoreNeedlesError: true,
        })
        .withJHipsterGenerators()
        .withConfiguredBlueprint()
        .withBlueprintConfig();
    });

    it('entity-navbar-items.ts keeps the needle and exports the items as default', () => {
      const file = 'src/main/webapp/app/entities/entity-navbar-items.ts';
      result.assertFileContent(file, 'jhipster-needle-add-entity-navbar');
      result.assertFileContent(file, /^export default EntityNavbarItems;$/m);
    });
  });
});
