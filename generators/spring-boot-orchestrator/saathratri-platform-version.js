/**
 * Saathratri versions every one of its own artifacts in lockstep with ONE platform version (the saathratri repo's
 * ADR-068): the version of com.saathratri:saathratri-parent. The hand-written artifacts are set by the repo's
 * scripts/set-platform-version.mjs; a generated service takes it here, at regen time, instead of JHipster's
 * 0.0.1-SNAPSHOT - its own <version> and its saathratri-ai-bom import alike.
 *
 * Pure and idempotent.
 */

/**
 * The project's own <version>: the first one left once the <parent> block is blanked out - whichever order the pom
 * declares them in (the real saathratri-parent names itself BEFORE its <parent>; JHipster's poms after it).
 */
function ownVersionRange(pom) {
  const masked = pom.replace(/<parent>[\s\S]*?<\/parent>/, block => ' '.repeat(block.length));
  const match = /<version>([^<]*)<\/version>/.exec(masked);
  return match ? { start: match.index + '<version>'.length, value: match[1] } : undefined;
}

/** The saathratri-parent project's own version (never its Spring Boot parent's), or undefined when this is not that pom. */
export function platformVersionOf(parentPom) {
  const masked = parentPom.replace(/<parent>[\s\S]*?<\/parent>/, block => ' '.repeat(block.length));
  if (!/<artifactId>saathratri-parent<\/artifactId>/.test(masked)) {
    return undefined;
  }
  return ownVersionRange(parentPom)?.value.trim();
}

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
  const own = ownVersionRange(pom);
  const withOwn = own ? pom.slice(0, own.start) + version + pom.slice(own.start + own.value.length) : pom;
  return withOwn.replace(AI_BOM_VERSION, `$1${version}$2`);
}
