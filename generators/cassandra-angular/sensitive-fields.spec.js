/*
 * Copyright (c) 2025-2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

import { beforeAll, describe, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

// A field marked @sensitive in the JDL arrives as options.sensitive === true; @sensitive(writeOnly) as 'writeOnly'.
// Every field of this blueprint carries its four @customAnnotation values (key type, Cassandra type, date format, order).
const TEXT = ['', 'CassandraType.Name.TEXT', '', ''];
const VAULT = {
  name: 'Vault',
  changelogDate: '20200101000100',
  dto: 'mapstruct',
  service: 'serviceImpl',
  pagination: 'pagination',
  fields: [
    {
      fieldName: 'id',
      fieldType: 'UUID',
      options: { id: true, customAnnotation: ['PrimaryKeyType.PARTITIONED', 'CassandraType.Name.UUID', '', ''] },
    },
    { fieldName: 'label', fieldType: 'String', options: { customAnnotation: TEXT } },
    { fieldName: 'apiKey', fieldType: 'String', options: { customAnnotation: TEXT, sensitive: true } },
    { fieldName: 'secretHash', fieldType: 'String', options: { customAnnotation: TEXT, sensitive: 'writeOnly' } },
  ],
  relationships: [],
};

const APP = 'src/main/webapp/app';
const ENTITY = `${APP}/entities/vault`;

describe('@sensitive fields (cassandra-angular)', () => {
  beforeAll(async () => {
    await helpers
      .runJHipster('jhipster:angular')
      .withJHipsterConfig(
        {
          applicationType: 'microservice',
          microfrontend: true,
          clientFramework: 'angular',
          databaseType: 'cassandra',
          prodDatabaseType: 'cassandra',
          devDatabaseType: 'cassandra',
        },
        [VAULT],
      )
      .withOptions({ ignoreNeedlesError: true })
      .withJHipsterGenerators()
      .withConfiguredBlueprint()
      .withBlueprintConfig();
  });

  it('writes the shared masked display and masked input, each with its spec', () => {
    result.assertFile([
      `${APP}/shared/sensitive-value/sensitive-value.ts`,
      `${APP}/shared/sensitive-value/sensitive-value.html`,
      `${APP}/shared/sensitive-value/sensitive-value.spec.ts`,
      `${APP}/shared/sensitive-value/sensitive-input.ts`,
      `${APP}/shared/sensitive-value/sensitive-input.html`,
      `${APP}/shared/sensitive-value/sensitive-input.spec.ts`,
    ]);
  });

  it('the list masks a sensitive value, shows only Set / Not set for a write-only one, and sorts by neither', () => {
    const file = `${ENTITY}/list/vault.html`;
    result.assertFileContent(file, '<jhi-sensitive-value [value]="vault.apiKey" label="Api Key" />');
    result.assertFileContent(file, `{{ vault.secretHashIsSet ? 'Set' : 'Not set' }}`);
    result.assertNoFileContent(file, '{{ vault.apiKey }}');
    result.assertNoFileContent(file, '{{ vault.secretHash }}');
    result.assertNoFileContent(file, 'SortBy="apiKey"');
    result.assertNoFileContent(file, 'SortBy="secretHash"');
    result.assertFileContent(`${ENTITY}/list/vault.ts`, "import { SensitiveValue } from 'app/shared/sensitive-value/sensitive-value';");
    result.assertFileContent(`${ENTITY}/list/vault.ts`, /imports: \[[\s\S]*SensitiveValue,/);
  });

  it('the detail masks a sensitive value and shows only Set / Not set for a write-only one', () => {
    const file = `${ENTITY}/detail/vault-detail.html`;
    result.assertFileContent(file, '<jhi-sensitive-value [value]="vaultRef.apiKey" label="Api Key" />');
    result.assertFileContent(file, `{{ vaultRef.secretHashIsSet ? 'Set' : 'Not set' }}`);
    result.assertNoFileContent(file, '{{ vaultRef.apiKey }}');
    result.assertFileContent(
      `${ENTITY}/detail/vault-detail.ts`,
      "import { SensitiveValue } from 'app/shared/sensitive-value/sensitive-value';",
    );
  });

  it('the form edits a sensitive value in a masked input; a write-only input says whether a value is stored', () => {
    const file = `${ENTITY}/update/vault-update.html`;
    result.assertFileContent(
      file,
      /<jhi-sensitive-input formControlName="apiKey" inputId="field_apiKey" name="apiKey" dataCy="apiKey" label="Api Key"\s*\/>/,
    );
    result.assertFileContent(
      file,
      /<jhi-sensitive-input formControlName="secretHash" inputId="field_secretHash" name="secretHash" dataCy="secretHash" label="Secret Hash" \[writeOnly\]="true" \[isSet\]="vault\?\.secretHashIsSet"\s*\/>/,
    );
    result.assertFileContent(
      `${ENTITY}/update/vault-update.ts`,
      "import { SensitiveInput } from 'app/shared/sensitive-value/sensitive-input';",
    );
  });

  it('the model carries <field>IsSet for a write-only field', () => {
    result.assertFileContent(`${ENTITY}/vault.model.ts`, /secretHashIsSet\?: boolean \| null/);
  });
});
