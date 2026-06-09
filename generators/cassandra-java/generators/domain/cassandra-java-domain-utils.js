export const javaSaathratriUtils = {
  /*****************************************
   * cassandra-java-utils Helper Functions
   *****************************************/

  getCompositePrimaryKeyComputeValue(entityClass, primaryKey) {
    if (primaryKey.composite) {
      return `new ${entityClass}Id(${primaryKey.ids.map((pk) => this.getCompositePrimaryKeyValue(pk.fieldType)).join(", ")})`;
    }
    return "UUID.randomUUID()";
  },

  getCompositePrimaryKeyValue(primaryKeyType) {
    switch (primaryKeyType) {
      case "String":
        return "UUID.randomUUID().toString()";

      case "UUID":
        return "UUID.randomUUID()";

      case "Instant":
        return "Instant.now()";

      case "Boolean":
        return "Boolean.TRUE";

      case "Long":
        return "new java.util.Random().nextLong()";

      case "Integer":
        return "new java.util.Random().nextInt()";

      case "Double":
        return "new java.util.Random().nextDouble()";

      case "Float":
        return "new java.util.Random().nextFloat()";
    }
  },
};
