import { describe, expect, it } from 'vitest';

import { addExtraDependencies, extraDependenciesFor } from './extra-dependencies.js';

// A dependency block in dependencyManagement, one in a plugin and one in a profile - none of them is the project's own.
const POM = `<project>
    <version>1.2.3</version>
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.example</groupId>
                <artifactId>managed-bom</artifactId>
            </dependency>
        </dependencies>
    </dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.example</groupId>
            <artifactId>first</artifactId>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <artifactId>some-plugin</artifactId>
                <dependencies>
                    <dependency>
                        <artifactId>plugin-dep</artifactId>
                    </dependency>
                </dependencies>
            </plugin>
        </plugins>
    </build>
    <profiles>
        <profile>
            <dependencies>
                <dependency>
                    <artifactId>profile-dep</artifactId>
                </dependency>
            </dependencies>
        </profile>
    </profiles>
</project>
`;

const projectDependencies = pom => {
  const start = pom.indexOf('</dependencyManagement>');
  return pom.slice(pom.indexOf('<dependencies>', start), pom.indexOf('<build>'));
};

describe('extra dependencies', () => {
  it('adds each dependency to the project dependencies - never dependencyManagement, a plugin or a profile', () => {
    const out = addExtraDependencies(POM, [{ groupId: 'com.acme', artifactId: 'acme-security', version: '4.5.6' }]);
    expect(projectDependencies(out)).toContain('<artifactId>acme-security</artifactId>');
    expect(projectDependencies(out)).toContain('<version>4.5.6</version>');
    expect(out.split('acme-security').length).toBe(2);
  });

  it("uses the project's own version when a dependency names none (artifacts versioned in lockstep)", () => {
    const out = addExtraDependencies(POM, [{ groupId: 'com.acme', artifactId: 'acme-security' }]);
    expect(projectDependencies(out)).toMatch(/<artifactId>acme-security<\/artifactId>\s*<version>\$\{project\.version\}<\/version>/);
  });

  it('writes the scope when one is given', () => {
    const out = addExtraDependencies(POM, [{ groupId: 'com.acme', artifactId: 'acme-test', version: '1', scope: 'test' }]);
    expect(projectDependencies(out)).toMatch(/<artifactId>acme-test<\/artifactId>\s*<version>1<\/version>\s*<scope>test<\/scope>/);
  });

  it('is idempotent and leaves a dependency the pom already declares alone', () => {
    const once = addExtraDependencies(POM, [{ groupId: 'com.acme', artifactId: 'acme-security', version: '1' }]);
    expect(addExtraDependencies(once, [{ groupId: 'com.acme', artifactId: 'acme-security', version: '1' }])).toBe(once);
    expect(addExtraDependencies(POM, [{ groupId: 'org.example', artifactId: 'first' }])).toBe(POM);
  });

  it('changes nothing for no dependencies', () => {
    expect(addExtraDependencies(POM, [])).toBe(POM);
    expect(addExtraDependencies(POM, undefined)).toBe(POM);
  });

  it("picks the app's own list from the file, by baseName", () => {
    const file = JSON.stringify({ gateway: [{ groupId: 'a', artifactId: 'b' }], orders: [{ groupId: 'c', artifactId: 'd' }] });
    expect(extraDependenciesFor(file, 'orders')).toEqual([{ groupId: 'c', artifactId: 'd' }]);
    expect(extraDependenciesFor(file, 'billing')).toEqual([]);
    expect(extraDependenciesFor(undefined, 'orders')).toEqual([]);
  });

  it('refuses an entry without groupId or artifactId', () => {
    expect(() => extraDependenciesFor(JSON.stringify({ orders: [{ artifactId: 'd' }] }), 'orders')).toThrow(/groupId/);
  });
});
