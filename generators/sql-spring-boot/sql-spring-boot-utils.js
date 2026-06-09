import fs from 'fs';
import path from 'path';

import { saathratriConstants } from './saathratri-constants.js';

const LAST_USED_PORT_FILE = 'last-used-port.json';

export const sqlSpringBootUtils = {
  /**************************************
   * sql-spring-boot-utils Helper Functions
   **************************************/

  /**
   * Get the otherEntity DisplayInGuiLink field.
   * Use @customAnnotation("DISPLAY_IN_GUI_RELATIONSHIP_LINK")
   * This method is necessary because of lazy loading of the get API's. So when the
   * REST API is called, the foreign key fields apart from the ID field are not loaded.
   *
   * @param fields
   *   The fields of the entity.
   *
   * @return
   *  The mapping to display in the mapper.
   * @Mapping(target = "fieldName", source = "fieldName")
   */
  getMappingsToDisplayInMapper(fields) {
    if (!fields) {
      return;
    }

    /*
     * Get the otherEntity DisplayInGuiLink field.
     * Use @customAnnotation("DISPLAY_IN_GUI_RELATIONSHIP_LINK")
     */
    let mappingToDisplayInMapper = '';

    for (const field of fields.filter(field => !field.hidden)) {
      if (field.options) {
        if (field.options.customAnnotation[0] === 'DISPLAY_IN_GUI_RELATIONSHIP_LINK') {
          /*
           * Display customization - human readable names.
           * entityInstance + "." + relationshipFieldName + "." + otherEntityField
           */
          mappingToDisplayInMapper += `@Mapping(target = "${field.fieldName}", source = "${field.fieldName}")\n`;
        }
      }
    }

    return mappingToDisplayInMapper;
  },

  isOptionToDisplayInGuiEnabled() {
    return saathratriConstants.USE_OPTION_TO_DISPLAY_IN_GUI;
  },

  /**************************************
   * server-utils Helper Functions
   **************************************/

  getLastUsedPortsFile(destinationPath) {
    return path.join(destinationPath, '..', LAST_USED_PORT_FILE);
  },

  getApplicationPortData(destinationPath, _appName) {
    // Path to the last-used-port.json file
    const portFilePath = this.getLastUsedPortsFile(destinationPath);

    // Read the last used port
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(portFilePath, 'utf8'));
    } catch {
      portData = {};
    }

    // Ensure the appName key exists
    if (!portData.lastUsedPort) {
      /*
       * Set the last used port to 5433, since 5432 is the default port and is
       * used by the gateway for PostgreSQL
       */
      portData.lastUsedPort = 5433;
    }

    // Write the last used port
    fs.writeFileSync(portFilePath, JSON.stringify(portData, null, 2));

    return portData;
  },

  incrementAndSetLastUsedPort(destinationPath, appName) {
    // Path to the last-used-port.json file
    const portFilePath = this.getLastUsedPortsFile(destinationPath);

    // Read the last used port
    try {
      const portData = JSON.parse(fs.readFileSync(portFilePath, 'utf8'));

      // Check if the appName exists in portData
      if (!portData[appName]) {
        portData[appName] = {
          port: portData.lastUsedPort,
        };

        // Increment the last used port for the next microservice
        portData.lastUsedPort += 1;
      }

      // Write the updated port data to the file
      fs.writeFileSync(portFilePath, JSON.stringify(portData, null, 2));

      return portData;
    } catch (error) {
      console.error(`Failed to update port data: ${error.message}`);
      throw error;
    }
  },
};
