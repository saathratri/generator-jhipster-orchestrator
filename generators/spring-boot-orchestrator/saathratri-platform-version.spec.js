import { describe, expect, it } from 'vitest';

import { platformVersionOf, usePlatformVersion } from './saathratri-platform-version.js';

const PARENT_POM = `<?xml version="1.0" encoding="UTF-8"?>
<project>
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>4.1.1</version>
        <relativePath/>
    </parent>
    <groupId>com.saathratri</groupId>
    <artifactId>saathratri-parent</artifactId>
    <version>3.0.0</version>
    <packaging>pom</packaging>
    <properties>
        <spring-boot.version>4.1.1</spring-boot.version>
        <saathratri-ai.version>3.0.0</saathratri-ai.version>
    </properties>
</project>
`;

const GENERATED_POM = `<?xml version="1.0" encoding="UTF-8"?>
<project>
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>4.1.1</version>
        <relativePath />
    </parent>
    <groupId>com.saathratri.sienna</groupId>
    <artifactId>siennaservice</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <packaging>jar</packaging>
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>com.saathratri</groupId>
                <artifactId>saathratri-ai-bom</artifactId>
                <version>1.0.0</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            <dependency>
                <groupId>tech.jhipster</groupId>
                <artifactId>jhipster-dependencies</artifactId>
                <version>9.4.0</version>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
`;

describe('platformVersionOf', () => {
  it("reads saathratri-parent's OWN version, not its Spring Boot parent's", () => {
    expect(platformVersionOf(PARENT_POM)).toBe('3.0.0');
  });

  it('is undefined for anything that is not the saathratri-parent pom', () => {
    expect(platformVersionOf(GENERATED_POM)).toBeUndefined();
    expect(platformVersionOf('')).toBeUndefined();
  });
});

describe('usePlatformVersion', () => {
  const out = usePlatformVersion(GENERATED_POM, '3.0.0');

  it("sets the service's own version", () => {
    expect(out).toContain('<artifactId>siennaservice</artifactId>\n    <version>3.0.0</version>');
    expect(out).not.toContain('0.0.1-SNAPSHOT');
  });

  it('sets the saathratri-ai-bom import to the same version', () => {
    expect(out).toMatch(/<artifactId>saathratri-ai-bom<\/artifactId>\s*<version>3\.0\.0<\/version>/);
  });

  it("leaves the Spring Boot parent and every other library's version alone", () => {
    expect(out).toContain('<artifactId>spring-boot-starter-parent</artifactId>\n        <version>4.1.1</version>');
    expect(out).toContain('<artifactId>jhipster-dependencies</artifactId>\n                <version>9.4.0</version>');
  });

  it('is idempotent, and a no-op without a version', () => {
    expect(usePlatformVersion(out, '3.0.0')).toBe(out);
    expect(usePlatformVersion(GENERATED_POM, undefined)).toBe(GENERATED_POM);
  });
});
