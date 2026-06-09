import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

// spring-boot-orchestrator carries the heaviest Saathratri customizations. They are
// applied either by WRITING template overrides or by POST_WRITING editFile() patches
// against files the base spring-boot generator produces. To exercise the editFile
// patches against real upstream content we run the full `jhipster:server` stack with
// the blueprint configured. Everything is gated on microservice|gateway.
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

describe('SubGenerator spring-boot-orchestrator of orchestrator JHipster blueprint', () => {
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

    it('writes the orchestrator Spring Boot infrastructure files', () => {
      result.assertFile([
        'src/main/resources/config/application.yml',
        'src/main/resources/config/application-prod.yml',
        'src/main/resources/config/bootstrap.yml',
        'src/main/resources/config/bootstrap-prod.yml',
        'src/main/java/com/saathratri/org/OrgsvcApp.java',
        'src/main/java/com/saathratri/org/config/ApplicationProperties.java',
      ]);
    });

    it('enables CORS in application-dev.yml for the Angular dev clients', () => {
      result.assertFileContent('src/main/resources/config/application-dev.yml', /SAATHRATRI CHANGE: Enable CORS in dev/);
      result.assertFileContent('src/main/resources/config/application-dev.yml', /http:\/\/localhost:4200/);
    });

    it('enables CORS in Spring Security for the microservice', () => {
      result.assertFileContent('src/main/java/com/saathratri/org/config/SecurityConfiguration.java', /\.cors\(withDefaults\(\)\)/);
    });

    it('enables dev file logging in logback-spring.xml', () => {
      result.assertFileContent('src/main/resources/logback-spring.xml', /SAATHRATRI CHANGE: dev file logging/);
      result.assertFileContent('src/main/resources/logback-spring.xml', /<file>logs\/orgsvc\.log<\/file>/);
      result.assertFileContent('src/main/resources/logback-spring.xml', /<appender name="ASYNC"/);
    });

    it('does NOT add the AWS S3 SDK to a SQL service pom.xml', () => {
      result.assertNoFileContent('pom.xml', /aws-java-sdk-s3/);
    });

    it('scaffolds the sibling DTO Maven module', () => {
      // The .gitignore path is derived from application.baseName (deterministic);
      // the pom/mvnw are written under this.appname which is a temp-dir hash in tests.
      result.assertFile('../orgsvcdto/.gitignore');
      result.assertFileContent('../orgsvcdto/.gitignore', /\/target\//);
      const dtoPom = Object.keys(result.getSnapshot()).find(k => /dto\/pom\.xml$/.test(k));
      expect(dtoPom).toBeTruthy();
    });

    it('writes .mvn/jvm.config with the enlarged Maven heap for the SQL service', () => {
      result.assertFile('.mvn/jvm.config');
      result.assertFileContent('.mvn/jvm.config', /-Xmx8g/);
      result.assertFileContent('.mvn/jvm.config', /-XX:\+UseParallelGC/);
    });
  });

  describe('microservice (cassandra)', () => {
    beforeAll(async () => {
      await runServer({
        applicationType: 'microservice',
        databaseType: 'cassandra',
        authenticationType: 'oauth2',
        baseName: 'cassandrablogsvc',
        packageName: 'com.saathratri.cassandrablog',
      });
    });

    it('adds the AWS S3 SDK to a Cassandra service pom.xml (Astra secure bundle)', () => {
      result.assertFileContent('pom.xml', /<artifactId>aws-java-sdk-s3<\/artifactId>/);
    });

    it('does NOT write the enlarged jvm.config for a Cassandra service', () => {
      result.assertNoFileContent('.mvn/jvm.config', /-Xmx8g/);
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

    it('does NOT apply the microservice-only dev CORS patch to the gateway', () => {
      result.assertNoFileContent('src/main/resources/config/application-dev.yml', /SAATHRATRI CHANGE: Enable CORS in dev/);
    });

    it('still enables dev file logging on the gateway', () => {
      result.assertFileContent('src/main/resources/logback-spring.xml', /SAATHRATRI CHANGE: dev file logging/);
    });

    it('writes the enlarged jvm.config for the SQL gateway too', () => {
      result.assertFileContent('.mvn/jvm.config', /-Xmx8g/);
    });
  });
});
