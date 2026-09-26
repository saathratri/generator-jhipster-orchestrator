/**
 * Saathratri versions every one of its own artifacts in lockstep with ONE platform version (the saathratri repo's
 * ADR-068): the version of com.saathratri:saathratri-parent. The hand-written artifacts are set by the repo's
 * scripts/set-platform-version.mjs; a generated service takes it here, at regen time, instead of JHipster's
 * 0.0.1-SNAPSHOT - its own <version> and its saathratri-ai-bom import alike.
 *
 * Pure and idempotent.
 */

/** The saathratri-parent project's own version (never its Spring Boot parent's), or undefined when this is not that pom. */
export function platformVersionOf(parentPom) {
  const afterParent = parentPom.includes('</parent>') ? parentPom.slice(parentPom.indexOf('</parent>')) : parentPom;
  const match = /<artifactId>saathratri-parent<\/artifactId>\s*<version>([^<]+)<\/version>/.exec(afterParent);
  return match ? match[1].trim() : undefined;
}

/** The first <version> after </parent> is the project's own. */
const OWN_VERSION = /(<\/parent>[\s\S]*?<version>)[^<]*(<\/version>)/;
const AI_BOM_VERSION = /(<artifactId>saathratri-ai-bom<\/artifactId>\s*<version>)[^<]*(<\/version>)/;

/**
 * @param {string} pom a generated service's pom.xml
 * @param {string | undefined} version the platform version; undefined = leave the pom as it is
 * @returns {string} the pom at the platform version
 */
export function usePlatformVersion(pom, version) {
  if (!version) {
    return pom;
  }
  return pom.replace(OWN_VERSION, `$1${version}$2`).replace(AI_BOM_VERSION, `$1${version}$2`);
}
