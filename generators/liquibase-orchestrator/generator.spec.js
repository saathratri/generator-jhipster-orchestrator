import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

// liquibase-orchestrator owns the SQL master.xml and generates extra changelogs for
// pgvector columns (@customAnnotation("VECTOR")) and for custom-query / entity-graph
// indexes, then needles them into master.xml. Run at the `jhipster:liquibase` entry
// (lighter than the full server) with the blueprint configured.
const BLUEPRINT_NAMESPACE = 'jhipster:liquibase';

// A SQL entity with a pgvector field: two stacked @customAnnotation values become
// field.options.customAnnotation = ['VECTOR', '1536'].
const VECTOR_ENTITY = {
  name: 'DocEmbedding',
  fields: [
    { fieldName: 'content', fieldType: 'String' },
    { fieldName: 'embedding', fieldType: 'String', options: { customAnnotation: ['VECTOR', '1536'] } },
  ],
  relationships: [],
};

async function runLiquibase(config, entities) {
  await helpers
    .run(BLUEPRINT_NAMESPACE)
    .withJHipsterConfig(config, entities)
    .withOptions({ ignoreNeedlesError: true })
    .withJHipsterGenerators()
    .withConfiguredBlueprint()
    .withBlueprintConfig();
}

const SQL_CONFIG = {
  applicationType: 'microservice',
  databaseType: 'sql',
  authenticationType: 'oauth2',
  baseName: 'orgsvc',
  packageName: 'com.saathratri.org',
};

describe('SubGenerator liquibase-orchestrator of orchestrator JHipster blueprint', () => {
  describe('sql with a pgvector entity', () => {
    beforeAll(async () => {
      await runLiquibase(SQL_CONFIG, [VECTOR_ENTITY]);
    });

    it('writes the SQL master.xml', () => {
      result.assertFile('src/main/resources/config/liquibase/master.xml');
    });

    it('generates a vector-column changelog for the entity', () => {
      const vectorChangelog = Object.keys(result.getSnapshot()).find(k =>
        /config\/liquibase\/changelog\/\d+_added_vector_DocEmbedding\.xml$/.test(k),
      );
      expect(vectorChangelog).toBeTruthy();
      result.assertFileContent(vectorChangelog, /vector\(1536\)/);
    });

    it('needles the vector changelog into master.xml', () => {
      result.assertFileContent('src/main/resources/config/liquibase/master.xml', /_added_vector_DocEmbedding\.xml/);
    });
  });

  describe('sql without pgvector fields', () => {
    beforeAll(async () => {
      await runLiquibase(SQL_CONFIG, [
        {
          name: 'PlainThing',
          fields: [{ fieldName: 'label', fieldType: 'String' }],
          relationships: [],
        },
      ]);
    });

    it('writes master.xml with no vector changelog include', () => {
      result.assertFile('src/main/resources/config/liquibase/master.xml');
      result.assertNoFileContent('src/main/resources/config/liquibase/master.xml', /_added_vector_/);
    });

    it('adds no custom-query index changelog when there are no index annotations', () => {
      result.assertNoFileContent('src/main/resources/config/liquibase/master.xml', /_added_custom_query_indexes_/);
    });
  });

  describe('sql with @customQueryAnnotation index directives', () => {
    beforeAll(async () => {
      await runLiquibase(SQL_CONFIG, [
        {
          name: 'Property',
          fields: [
            { fieldName: 'propertyCode', fieldType: 'String' },
            { fieldName: 'name', fieldType: 'String' },
            { fieldName: 'shortName', fieldType: 'String' },
          ],
          relationships: [],
          // pipe-separated directives; `index` flags which params become a DB index
          annotations: {
            customQueryAnnotation:
              'findByPropertyCode: params[ propertyCode ] index | findByNameAndShortName: params[ name, shortName ] index',
          },
        },
      ]);
    });

    it('generates a custom-query index changelog for the entity', () => {
      const indexChangelog = Object.keys(result.getSnapshot()).find(k =>
        /config\/liquibase\/changelog\/\d+_added_custom_query_indexes_Property\.xml$/.test(k),
      );
      expect(indexChangelog).toBeTruthy();
      // single-param index
      result.assertFileContent(indexChangelog, /<createIndex indexName="idx_property_property_code" tableName="property">/);
      result.assertFileContent(indexChangelog, /<column name="property_code"\/>/);
      // multi-param composite index
      result.assertFileContent(indexChangelog, /<createIndex indexName="idx_property_name_short_name" tableName="property">/);
      result.assertFileContent(indexChangelog, /<column name="name"\/>/);
      result.assertFileContent(indexChangelog, /<column name="short_name"\/>/);
    });

    it('needles the index changelog into master.xml', () => {
      result.assertFileContent('src/main/resources/config/liquibase/master.xml', /_added_custom_query_indexes_Property\.xml/);
    });
  });

  describe('sql with eager-relationship index directives', () => {
    beforeAll(async () => {
      await runLiquibase(SQL_CONFIG, [
        { name: 'Blog', fields: [{ fieldName: 'title', fieldType: 'String' }], relationships: [] },
        {
          name: 'Post',
          fields: [{ fieldName: 'content', fieldType: 'String' }],
          relationships: [{ relationshipName: 'blog', otherEntityName: 'Blog', relationshipType: 'many-to-one' }],
          // `eager[ blog ]` makes the FK column to Blog get an index
          annotations: { customQueryAnnotation: 'findWithBlog: params[ content ] eager[ blog ]' },
        },
      ]);
    });

    it('indexes the foreign-key column for an eager many-to-one relationship', () => {
      const indexChangelog = Object.keys(result.getSnapshot()).find(k =>
        /config\/liquibase\/changelog\/\d+_added_custom_query_indexes_Post\.xml$/.test(k),
      );
      expect(indexChangelog).toBeTruthy();
      result.assertFileContent(indexChangelog, /<createIndex indexName="idx_post_blog_id" tableName="post">/);
      result.assertFileContent(indexChangelog, /<column name="blog_id"\/>/);
    });
  });
});
