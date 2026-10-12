import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import ejs from 'ejs';

// The REAL template the regen writes to ../<service>dto/pom.xml - rendered here, not a copy of it.
const TEMPLATE = readFileSync(fileURLToPath(new URL('./templates/maven/pom.xml.ejs', import.meta.url)), 'utf8');

describe('the DTO jar pom template', () => {
  it('names the DTO jar after its service and versions it like a generated service', () => {
    const pom = ejs.render(TEMPLATE, {
      packageName: 'com.mycompany.blog',
      dtoFolderName: 'blogservicedto',
    });
    expect(pom).toMatch(
      /<groupId>com\.mycompany\.blog\.dto<\/groupId>\s*<artifactId>blogservicedto<\/artifactId>\s*<version>0\.0\.1-SNAPSHOT<\/version>/,
    );
  });

  it('carries jackson-annotations: a write-only (@sensitive(writeOnly)) DTO field is @JsonProperty(access = WRITE_ONLY)', () => {
    const pom = ejs.render(TEMPLATE, { packageName: 'com.mycompany.blog', dtoFolderName: 'blogservicedto' });
    expect(pom).toMatch(
      /<groupId>com\.fasterxml\.jackson\.core<\/groupId>\s*<artifactId>jackson-annotations<\/artifactId>\s*<version>\$\{jackson-annotations\.version\}<\/version>/,
    );
    expect(pom).toMatch(/<jackson-annotations\.version>2\.21<\/jackson-annotations\.version>/);
  });
});
