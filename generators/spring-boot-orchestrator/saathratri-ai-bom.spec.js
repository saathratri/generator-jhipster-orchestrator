import { describe, expect, it } from 'vitest';

import { SAATHRATRI_AI_BOM_VERSION, useSaathratriAiBom } from './saathratri-ai-bom.js';

// Shaped like what the base blueprints emit today: the SQL one (property + ${spring-ai.version} + okhttp pin) and the
// Cassandra one (a literal version).
const SQL_POM = `<project>
    <properties>
        <sonar-maven-plugin.version>5.7.0.6970</sonar-maven-plugin.version>
        <spring-ai.version>2.0.1</spring-ai.version>
        <spring-cloud-dependencies.version>2025.1.2</spring-cloud-dependencies.version>
    </properties>
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.ai</groupId>
                <artifactId>spring-ai-bom</artifactId>
                <version>\${spring-ai.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
            </dependency>
        </dependencies>
    </dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.openai</groupId>
            <artifactId>openai-java-client-okhttp</artifactId>
            <version>4.49.0</version>
            <exclusions/>
        </dependency>
    </dependencies>
</project>
`;

const CASSANDRA_POM = `<project>
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.ai</groupId>
                <artifactId>spring-ai-bom</artifactId>
                <version>2.0.1</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
`;

describe('useSaathratriAiBom', () => {
  it('replaces the Spring AI BOM import with the Saathratri AI BOM, and drops what only it used', () => {
    const out = useSaathratriAiBom(SQL_POM);

    expect(out).not.toContain('spring-ai-bom');
    expect(out).toContain('<artifactId>saathratri-ai-bom</artifactId>');
    expect(out).toContain(`<version>${SAATHRATRI_AI_BOM_VERSION}</version>`);
    expect(out).not.toContain('<spring-ai.version>');
    expect(out).toContain('<spring-cloud-dependencies.version>2025.1.2</spring-cloud-dependencies.version>');
    expect(out).toMatch(/<artifactId>openai-java-client-okhttp<\/artifactId>\s*<exclusions\/>/);
  });

  it('handles the Cassandra shape (a literal version)', () => {
    const out = useSaathratriAiBom(CASSANDRA_POM);
    expect(out).not.toContain('spring-ai-bom');
    expect(out).toContain('<artifactId>saathratri-ai-bom</artifactId>');
  });

  it('is idempotent, and leaves a pom without Spring AI alone', () => {
    const once = useSaathratriAiBom(SQL_POM);
    expect(useSaathratriAiBom(once)).toBe(once);
    const plain = '<project><dependencies/></project>';
    expect(useSaathratriAiBom(plain)).toBe(plain);
  });
});
