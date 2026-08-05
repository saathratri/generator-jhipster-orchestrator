import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

// maven-orchestrator overrides `jhipster:maven`, but JHipster 8 runs `java-simple-application:maven`
// instead, so the `maven` router and this generator never execute during real generation (generated
// services contain no `template-file-maven-orchestrator` stub). It is therefore a no-op in practice;
// the SQL Maven-heap `.mvn/jvm.config` it was meant to write now lives in `spring-boot-orchestrator`
// (see that generator's spec). This spec just pins that the generator still loads/composes cleanly.
const LEAF_NAMESPACE = 'jhipster-orchestrator:maven-orchestrator';

describe('SubGenerator maven-orchestrator of orchestrator JHipster blueprint', () => {
  describe('composition', () => {
    beforeAll(async () => {
      await helpers
        .run(LEAF_NAMESPACE)
        .withJHipsterConfig({
          applicationType: 'microservice',
          databaseType: 'sql',
          authenticationType: 'oauth2',
          baseName: 'orgsvc',
          packageName: 'com.saathratri.org',
        })
        .withOptions({ ignoreNeedlesError: true })
        .withJHipsterGenerators()
        .withConfiguredBlueprint()
        .withBlueprintConfig();
    });

    it('loads and runs at its own namespace, emitting its WRITING stub', () => {
      expect(Object.keys(result.getSnapshot())).toContain('template-file-maven-orchestrator');
    });

    it('does not itself write .mvn/jvm.config (moved to spring-boot-orchestrator)', () => {
      result.assertNoFile('.mvn/jvm.config');
    });
  });
});
