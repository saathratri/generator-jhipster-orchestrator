import { beforeAll, describe, expect, it } from "vitest";

import { defaultHelpers as helpers, result } from "generator-jhipster/testing";

const SUB_GENERATOR = "cassandra-client";
const BLUEPRINT_NAMESPACE = `jhipster-orchestrator:${SUB_GENERATOR}`;

describe("SubGenerator cassandra-client of cassandra JHipster blueprint", () => {
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
