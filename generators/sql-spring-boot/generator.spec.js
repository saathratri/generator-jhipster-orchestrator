/*
 * Copyright (c) 2023-2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

const SUB_GENERATOR = 'sql-spring-boot';
const BLUEPRINT_NAMESPACE = `jhipster-orchestrator:${SUB_GENERATOR}`;

describe('SubGenerator sql-spring-boot of ai-postgresql JHipster blueprint', () => {
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

  describe('run through jhipster:server with an entity that references itself and has a unique field', () => {
    beforeAll(async function () {
      // The full server generator prepares each entity (the derived service / dto flags the templates read) and
      // runs spring-boot; this blueprint (or a blueprint that vendors it) composes sql-spring-boot - the same path a real run takes.
      await helpers
        .runJHipster('server')
        .withJHipsterConfig({}, [
          {
            name: 'Ledger',
            changelogDate: '20200101000100',
            jpaMetamodelFiltering: true,
            dto: 'mapstruct',
            service: 'serviceClass',
            pagination: 'pagination',
            fields: [{ fieldName: 'reference', fieldType: 'String', fieldValidateRules: ['required', 'unique'] }],
            relationships: [
              { relationshipName: 'reverses', otherEntityName: 'ledger', relationshipSide: 'left', relationshipType: 'many-to-one' },
            ],
          },
        ])
        .withOptions({
          ignoreNeedlesError: true,
        })
        .withJHipsterGenerators()
        .withConfiguredBlueprint()
        .withBlueprintConfig();
    });

    it('the filter-by-relationship test builds the self-referenced target from the UPDATED values, so a unique field cannot collide with the entity under test', () => {
      const file = 'src/test/java/com/mycompany/myapp/web/rest/LedgerResourceIT.java';
      result.assertFileContent(file, 'Ledger reversesRelationshipTarget = LedgerResourceIT.createUpdatedEntity();');
      result.assertNoFileContent(file, 'reversesRelationshipTarget = LedgerResourceIT.createEntity(');
    });
  });
});
