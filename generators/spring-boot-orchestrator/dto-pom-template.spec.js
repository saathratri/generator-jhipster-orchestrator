import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import ejs from 'ejs';

// The REAL template the regen writes to ../<service>dto/pom.xml - rendered here, not a copy of it.
const TEMPLATE = readFileSync(fileURLToPath(new URL('./templates/maven/pom.xml.ejs', import.meta.url)), 'utf8');

describe('the DTO jar pom template', () => {
  it('takes the ONE Saathratri platform version (saathratri ADR-068), not a hard-coded one', () => {
    const pom = ejs.render(TEMPLATE, {
      packageName: 'com.saathratri.sienna',
      dtoFolderName: 'siennaservicedto',
      saathratriPlatformVersion: '3.0.0',
    });
    expect(pom).toMatch(/<artifactId>siennaservicedto<\/artifactId>\s*<version>3\.0\.0<\/version>/);
    expect(pom).not.toContain('<version>2.0.0</version>');
  });
});
