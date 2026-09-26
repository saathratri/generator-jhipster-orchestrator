/**
 * Saathratri's AI stack lives in ONE place: com.saathratri:saathratri-ai-bom (the saathratri repo's saathratri-ai/).
 * The base blueprints (generator-jhipster-ai-postgresql, generator-jhipster-cassandra) are generic and keep emitting a
 * plain org.springframework.ai:spring-ai-bom import with a version; this orchestrator-only step turns that into the
 * Saathratri BOM import, so a generated service takes its Spring AI, MCP, Anthropic and OpenAI versions from the same
 * place as the hand-written ones.
 *
 * Pure and idempotent: the saathratri repo's checked-in poms are produced by this same function.
 */

export const SAATHRATRI_AI_BOM_VERSION = '3.0.0'; // = the platform version (ADR-068); usePlatformVersion sets the real one at regen

const SAATHRATRI_AI_BOM_IMPORT = [
  '<dependency>',
  '                <groupId>com.saathratri</groupId>',
  '                <artifactId>saathratri-ai-bom</artifactId>',
  `                <version>${SAATHRATRI_AI_BOM_VERSION}</version>`,
  '                <type>pom</type>',
  '                <scope>import</scope>',
  '            </dependency>',
].join('\n');

/** A spring-ai-bom import, whatever its version and whitespace. */
const SPRING_AI_BOM_IMPORT =
  /<dependency>\s*<groupId>org\.springframework\.ai<\/groupId>\s*<artifactId>spring-ai-bom<\/artifactId>\s*<version>[^<]*<\/version>\s*<type>pom<\/type>\s*<scope>import<\/scope>\s*<\/dependency>/;

/** The spring-ai.version property line (only the spring-ai-bom import used it). */
const SPRING_AI_VERSION_PROPERTY = /\n[ \t]*<spring-ai\.version>[^<]*<\/spring-ai\.version>[ \t]*(?=\r?\n)/;

/** The openai-java-client-okhttp dependency's explicit version - the BOM manages it. */
const OKHTTP_CLIENT_VERSION = /(<artifactId>openai-java-client-okhttp<\/artifactId>)\s*<version>[^<]*<\/version>/;

/**
 * @param {string} pom a pom.xml
 * @returns {string} the pom importing saathratri-ai-bom instead of spring-ai-bom; unchanged if it imports neither
 */
export function useSaathratriAiBom(pom) {
  if (!SPRING_AI_BOM_IMPORT.test(pom)) {
    return pom;
  }
  return pom
    .replace(SPRING_AI_BOM_IMPORT, SAATHRATRI_AI_BOM_IMPORT)
    .replace(SPRING_AI_VERSION_PROPERTY, '')
    .replace(OKHTTP_CLIENT_VERSION, '$1');
}
