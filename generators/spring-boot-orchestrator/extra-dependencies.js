/*
 * Copyright (c) 2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

/**
 * Extra Maven dependencies per application, for code a project SHARES between several generated services (a library
 * jar) instead of copying it into each one. The list lives in `jhipster-extra-dependencies.json` beside the apps (the
 * directory the JDL is imported from), keyed by baseName:
 *
 *   { "orders": [ { "groupId": "com.acme", "artifactId": "acme-security", "version": "1.0.0", "scope": "test" } ] }
 *
 * `version` omitted = `${project.version}` (for artifacts versioned in lockstep with the app); `scope` optional.
 *
 * Pure and idempotent.
 */

export const EXTRA_DEPENDENCIES_FILE = 'jhipster-extra-dependencies.json';

/**
 * @param {string | undefined} fileContent the JSON file's text, or undefined when there is no file
 * @param {string} baseName the application
 * @returns {{ groupId: string, artifactId: string, version?: string, scope?: string }[]}
 */
export function extraDependenciesFor(fileContent, baseName) {
  if (!fileContent) {
    return [];
  }
  const list = JSON.parse(fileContent)[baseName] ?? [];
  for (const dependency of list) {
    if (!dependency?.groupId || !dependency?.artifactId) {
      throw new Error(`${EXTRA_DEPENDENCIES_FILE}: every dependency of ${baseName} needs a groupId and an artifactId`);
    }
  }
  return list;
}

/** The pom with every block whose <dependencies> are NOT the project's own blanked out (same length, same offsets). */
function maskForeignBlocks(pom) {
  const blank = block => ' '.repeat(block.length);
  return pom
    .replace(/<dependencyManagement>[\s\S]*?<\/dependencyManagement>/g, blank)
    .replace(/<build>[\s\S]*?<\/build>/g, blank)
    .replace(/<profiles>[\s\S]*?<\/profiles>/g, blank);
}

/**
 * @param {string} pom a generated pom.xml
 * @param {{ groupId: string, artifactId: string, version?: string, scope?: string }[] | undefined} dependencies
 * @returns {string} the pom with each dependency it does not already declare added to the project dependencies
 */
export function addExtraDependencies(pom, dependencies) {
  const missing = (dependencies ?? []).filter(d => !new RegExp(`<artifactId>${d.artifactId}</artifactId>`).test(pom));
  if (missing.length === 0) {
    return pom;
  }
  const close = maskForeignBlocks(pom).indexOf('</dependencies>');
  if (close < 0) {
    throw new Error('pom.xml has no project <dependencies> block to add the extra dependencies to');
  }
  const xml = missing
    .map(d =>
      [
        '    <dependency>',
        `            <groupId>${d.groupId}</groupId>`,
        `            <artifactId>${d.artifactId}</artifactId>`,
        `            <version>${d.version ?? '${project.version}'}</version>`,
        ...(d.scope ? [`            <scope>${d.scope}</scope>`] : []),
        '        </dependency>',
        '    ',
      ].join('\n'),
    )
    .join('    ');
  return pom.slice(0, close) + xml + pom.slice(close);
}
