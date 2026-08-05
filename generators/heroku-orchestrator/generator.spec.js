import { beforeAll, describe, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

// heroku-orchestrator owns every Heroku artifact: the WRITING phase templates
// (Procfile, system.properties, .slugignore, application-heroku.yml,
// bootstrap-heroku.yml) and the POST_WRITING `heroku` Maven profile injected into
// pom.xml. All of it is gated on applicationType microservice|gateway, so the only
// way to exercise it is to run the full `jhipster:server` stack with the blueprint
// configured (which also produces the base pom.xml the profile edit depends on).
const BLUEPRINT_NAMESPACE = 'jhipster:server';

async function runServer(config) {
  await helpers
    .run(BLUEPRINT_NAMESPACE)
    .withJHipsterConfig(config)
    .withOptions({ ignoreNeedlesError: true })
    .withJHipsterGenerators()
    .withConfiguredBlueprint()
    .withBlueprintConfig();
}

describe('SubGenerator heroku-orchestrator of orchestrator JHipster blueprint', () => {
  describe('microservice (sql)', () => {
    beforeAll(async () => {
      await runServer({
        applicationType: 'microservice',
        databaseType: 'sql',
        authenticationType: 'oauth2',
        baseName: 'orgsvc',
        packageName: 'com.saathratri.org',
      });
    });

    it('writes the Heroku deployment artifacts', () => {
      result.assertFile([
        'Procfile',
        'system.properties',
        '.slugignore',
        'src/main/resources/config/application-heroku.yml',
        'src/main/resources/config/bootstrap-heroku.yml',
      ]);
    });

    it('activates the prod,heroku profiles in the Procfile', () => {
      result.assertFileContent('Procfile', /--spring\.profiles\.active=prod,heroku/);
    });

    it('points application-heroku.yml at a herokuapp.com host', () => {
      result.assertFileContent('src/main/resources/config/application-heroku.yml', /herokuapp\.com/);
    });

    it('injects the additive `heroku` Maven profile into pom.xml', () => {
      result.assertFileContent('pom.xml', /<profile\.heroku\/>/);
      result.assertFileContent('pom.xml', /<id>heroku<\/id>/);
      result.assertFileContent('pom.xml', /<profile\.heroku>,heroku<\/profile\.heroku>/);
    });

    it('appends ${profile.heroku} to the prod spring.profiles.active', () => {
      result.assertFileContent('pom.xml', /<spring\.profiles\.active>prod[^<]*\$\{profile\.heroku\}<\/spring\.profiles\.active>/);
    });
  });

  describe('gateway (sql)', () => {
    beforeAll(async () => {
      await runServer({
        applicationType: 'gateway',
        databaseType: 'sql',
        authenticationType: 'oauth2',
        baseName: 'gw',
        packageName: 'com.saathratri.gw',
      });
    });

    it('also writes Heroku artifacts for the gateway', () => {
      result.assertFile(['Procfile', 'src/main/resources/config/application-heroku.yml']);
      result.assertFileContent('pom.xml', /<id>heroku<\/id>/);
    });
  });

  describe('monolith (gated off)', () => {
    beforeAll(async () => {
      await runServer({
        applicationType: 'monolith',
        databaseType: 'sql',
        baseName: 'mono',
        packageName: 'com.saathratri.mono',
      });
    });

    it('does NOT write Heroku artifacts for a monolith', () => {
      result.assertNoFile(['Procfile', 'system.properties', '.slugignore', 'src/main/resources/config/application-heroku.yml']);
    });

    it('does NOT add a heroku Maven profile for a monolith', () => {
      result.assertNoFileContent('pom.xml', /<id>heroku<\/id>/);
    });
  });
});
