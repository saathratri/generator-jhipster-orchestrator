/**
 * Utilities for the "lazy-load excluded relationships" feature.
 *
 * Entities annotated with `entityGraphExcludeCustomAnnotation` mark certain
 * relationships as too heavy to load eagerly with the rest of the entity
 * (the JDL annotation lists them after the entity-graph method name, e.g.
 *   `getOrganizationWithFullDetails: [ customers, people, employees, hiredContractors ]`
 * means those four collections are NOT included in the full-details graph).
 *
 * The lazy-load feature exposes each excluded relationship via a small set
 * of dedicated REST endpoints so the admin UI can fetch them on demand from
 * a popup, instead of paying the eager-load cost for every detail-page hit.
 *
 * This helper parses the annotation and returns the resolved relationship
 * objects together with the per-relationship metadata the postWriting hooks
 * need to emit endpoints, service methods, and (later) Angular components.
 */

const RELATIONSHIP_NAME_KEYS = [
  'propertyName',
  'relationshipFieldNamePlural',
  'relationshipFieldName',
  'relationshipNamePlural',
  'relationshipName',
];

export function getExcludedRelationshipNames(entity) {
  const ann = entity?.annotations?.entityGraphExcludeCustomAnnotation;
  if (typeof ann !== 'string' || !ann.trim()) return [];
  // First directive looks like "<methodName>: [ name1, name2, ... ]"; later
  // directives (separated by `|`) are reserved for additional graphs and
  // have no effect on the lazy-load endpoints, which always operate on the
  // first (canonical full-details) graph's exclusion list.
  const firstDirective = ann.split('|')[0].trim();
  const m = firstDirective.match(/\[\s*([^\]]+?)\s*\]/);
  if (!m) return [];
  return m[1]
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function findRelationshipByName(entity, name) {
  const rels = entity?.relationships || [];
  return rels.find(r => RELATIONSHIP_NAME_KEYS.some(k => r[k] === name));
}

/**
 * Returns the resolved relationship objects for an entity's excluded fields.
 * Order matches the JDL annotation. Names that don't resolve are silently
 * dropped (they would already have failed earlier strip/patch passes loudly).
 */
export function getExcludedRelationships(entity) {
  return getExcludedRelationshipNames(entity)
    .map(name => findRelationshipByName(entity, name))
    .filter(Boolean);
}

/**
 * Returns the parsed display-label PATH from an entity-level
 * `@displayInGuiRelationshipLinkPathCustomAnnotation("rel.field rel.field2 ...")`.
 *
 * The annotation lets an entity declare its display label as one or more
 * fields reached through a relationship, which is the only sensible source
 * for entities like Employee/Customer (their own fields are mostly FKs/IDs;
 * the human-readable label lives on a related entity such as Person).
 *
 * Returns:
 *   - `[ ['person','firstName'], ['person','lastName'] ]` for the example above
 *   - `null` when the annotation is absent or unparseable
 *
 * Each path is dot-separated; multiple paths are space- or comma-separated and
 * concatenated with a single space when rendered in the UI. We deliberately
 * limit to depth-1 (relationship.field) for now: deeper traversal would need
 * additional JOIN logic in the backend and is unnecessary for the current
 * Saathratri data model.
 */
export function getDisplayLabelPath(entity) {
  const ann = entity?.annotations?.displayInGuiRelationshipLinkPathCustomAnnotation;
  if (typeof ann !== 'string' || !ann.trim()) return null;
  const paths = ann
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(p => p.split('.'))
    .filter(parts => parts.length === 2 && parts[0] && parts[1]);
  return paths.length ? paths : null;
}

/**
 * Returns the field name on `otherEntity` that carries the
 * DISPLAY_IN_GUI_RELATIONSHIP_LINK custom annotation, or `null` if none.
 * Callers should fall back to the primary key when this returns null.
 */
export function getDisplayLabelField(otherEntity) {
  const fields = otherEntity?.fields;
  if (!Array.isArray(fields)) return null;
  for (const f of fields) {
    const ca = f.options?.customAnnotation || f.customAnnotation;
    if (Array.isArray(ca) && ca[0] === 'DISPLAY_IN_GUI_RELATIONSHIP_LINK') {
      return f.fieldName;
    }
  }
  return null;
}

/**
 * Resolves the owning-side field name on `otherEntity` that points back to
 * `entity` for the given `relationship`.
 *
 * Used to derive Spring Data JPA query method names like
 * `findByOrganizationsId(...)` on the other-side repository.
 *
 * For the inverse side of a ManyToMany the relevant field on the owning side
 * is a collection (plural), so we prefer the plural form when both are
 * available. For OneToMany the owning side is a singular ManyToOne field.
 */
export function getOwningSideFieldName(entity, otherEntity, relationship) {
  const otherRels = otherEntity?.relationships || [];
  // Two-pair entity relationships are common (e.g. Contractor has both
  // `organization` (OneToOne) and `workedForOrganizations` (ManyToMany
  // inverse to TajOrganization.hiredContractor)). Pick the right inverse by
  // matching the relationship NAME we already know about — every JHipster
  // relationship records its peer's role name in `otherEntityRelationshipName`
  // — and only fall back to a same-peer search if that anchor is missing.
  const wantedName = relationship?.otherEntityRelationshipName;
  let inverse = wantedName
    ? otherRels.find(r => r.relationshipName === wantedName || r.propertyName === wantedName || r.relationshipFieldName === wantedName)
    : null;
  if (!inverse) {
    inverse = otherRels.find(
      r =>
        r.otherEntityName === entity.entityInstance ||
        r.otherEntityName === entity.name ||
        r.otherEntityName === entity.entityNameCapitalized,
    );
  }
  if (!inverse) return null;
  return inverse.relationshipFieldNamePlural || inverse.relationshipFieldName || inverse.propertyName || inverse.relationshipName;
}

/**
 * Looks up an entity object in the `entities` array by its (case-insensitive)
 * entity name. Used to resolve `relationship.otherEntityName` to the
 * full peer-entity model so we can read its fields and relationships.
 */
export function findEntityByName(entities, name) {
  if (!Array.isArray(entities) || !name) return null;
  const wanted = String(name).toLowerCase();
  return entities.find(e => {
    const candidates = [e.name, e.entityClass, e.entityInstance, e.entityNameCapitalized].filter(Boolean).map(s => String(s).toLowerCase());
    return candidates.includes(wanted);
  });
}

/**
 * Composes the per-relationship metadata used by the postWriting endpoint
 * generators. Returns null when the peer entity can't be resolved (e.g. an
 * orphaned relationship name) so callers can skip rather than emit broken
 * Java.
 *
 * Shape:
 *   {
 *     fieldName,                // e.g. 'customers' (plural; the URL/path segment)
 *     fieldNameSingular,        // e.g. 'customer'
 *     methodSuffix,             // PascalCase; appended to verbs (e.g. 'Customers')
 *     otherEntity,              // resolved peer entity object
 *     otherEntityClass,         // e.g. 'Customer'
 *     otherEntityDtoClass,      // e.g. 'CustomerDTO'
 *     otherEntityFieldOnOwner,  // owning-side field name on the peer (e.g. 'organizations')
 *     displayLabelField,        // peer field with DISPLAY_IN_GUI_RELATIONSHIP_LINK, or null
 *     relationshipType,         // raw JDL value: 'many-to-many' | 'one-to-many' | etc.
 *     isInverseSide,            // true iff the join column lives on the peer
 *   }
 */
export function describeExcludedRelationship(entity, relationship, entities) {
  const otherEntity = findEntityByName(entities, relationship.otherEntityName);
  if (!otherEntity) return null;

  const fieldName =
    relationship.relationshipFieldNamePlural ||
    relationship.propertyName ||
    relationship.relationshipNamePlural ||
    relationship.relationshipName;
  const fieldNameSingular = relationship.relationshipFieldName || relationship.relationshipName || fieldName;
  const methodSuffix = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

  const otherEntityClass = otherEntity.entityClass || otherEntity.entityNameCapitalized || otherEntity.name;
  // Prefer JHipster's pre-computed plural so English irregulars (Person -> People)
  // come out right; only fall back to a naive `+ "s"` when the entity model
  // doesn't carry one (older JHipster, custom blueprints).
  const otherEntityClassPlural = otherEntity.entityClassPlural || otherEntity.entityNameCapitalizedPlural || `${otherEntityClass}s`;
  const otherEntityDtoClass = `${otherEntityClass}DTO`;
  const otherEntityFieldOnOwner = getOwningSideFieldName(entity, otherEntity, relationship);
  // Two display-label sources: a path through a relationship on the peer
  // (entity-level annotation, takes priority) and a single field on the peer
  // (field-level annotation, the legacy form). One, both, or neither may be set.
  const displayLabelField = getDisplayLabelField(otherEntity);
  const displayLabelPath = getDisplayLabelPath(otherEntity);

  const isInverseSide = relationship.relationshipSide === 'right' || relationship.ownerSide === false;

  return {
    fieldName,
    fieldNameSingular,
    methodSuffix,
    otherEntity,
    otherEntityClass,
    otherEntityClassPlural,
    otherEntityDtoClass,
    otherEntityFieldOnOwner,
    displayLabelField,
    displayLabelPath,
    relationshipType: relationship.relationshipType,
    isInverseSide,
  };
}
