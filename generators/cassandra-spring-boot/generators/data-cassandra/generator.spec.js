import { beforeAll, describe, expect, it } from "vitest";

import { defaultHelpers as helpers, result } from "generator-jhipster/testing";

const SUB_GENERATOR = "cassandra-spring-boot:data-cassandra";
const BLUEPRINT_NAMESPACE = `jhipster-orchestrator:${SUB_GENERATOR}`;

describe("SubGenerator cassandra-spring-boot:data-cassandra of cassandra JHipster blueprint", () => {
  describe("run", () => {
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

    it("should succeed", () => {
      expect(result.getStateSnapshot()).toMatchSnapshot();
    });
  });
});
