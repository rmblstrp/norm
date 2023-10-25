"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utility_1 = require("@elevated/objects/lib/enum/utility");
const casing_1 = require("@elevated/objects/lib/string/casing");
const lodash_1 = require("lodash");
var DatabaseType;
(function (DatabaseType) {
    DatabaseType[DatabaseType["Unspecified"] = 0] = "Unspecified";
    DatabaseType[DatabaseType["Algolia"] = 1] = "Algolia";
    DatabaseType[DatabaseType["DynamoDB"] = 2] = "DynamoDB";
    DatabaseType[DatabaseType["Firebase"] = 4] = "Firebase";
    DatabaseType[DatabaseType["Mysql"] = 8] = "Mysql";
    DatabaseType[DatabaseType["Postgres"] = 16] = "Postgres";
    DatabaseType[DatabaseType["Supported"] = 31] = "Supported";
})(DatabaseType = exports.DatabaseType || (exports.DatabaseType = {}));
class DatabaseSettingsHelper {
    constructor(source) {
        this.settings = source instanceof DatabaseSettingsHelper
            ? source.settings
            : source;
        if (lodash_1.isNil(this.settings)) {
            this.settings = {};
        }
    }
    getValue(value, defaultValue) {
        return lodash_1.isNil(value) ? defaultValue : value;
    }
    get flattenObjects() {
        return !lodash_1.isNil(this.settings.flatten);
    }
    get flattenSeparator() {
        return this.settings.flatten.separator;
    }
    get flattenKeyStyle() {
        return this.settings.flatten.keyStyle;
    }
    get relationDepth() {
        return this.settings.relationDepth;
    }
    get columnCasing() {
        return this.getValue(this.settings.columnCasing, casing_1.StringCase.Snake);
    }
    get schemaCasing() {
        return this.getValue(this.settings.schemaCasing, casing_1.StringCase.Snake);
    }
    get tableCasing() {
        return this.getValue(this.settings.tableCasing, casing_1.StringCase.Snake);
    }
    get useSchema() {
        return this.getValue(this.settings.useSchema, false);
    }
}
exports.DatabaseSettingsHelper = DatabaseSettingsHelper;
var DatabaseConfiguration;
(function (DatabaseConfiguration) {
    const databaseConfigurations = {};
    function clearConfigurations() {
        databaseConfigurations[DatabaseType.Algolia] = {};
        databaseConfigurations[DatabaseType.DynamoDB] = {};
        databaseConfigurations[DatabaseType.Firebase] = {};
        databaseConfigurations[DatabaseType.Mysql] = {};
        databaseConfigurations[DatabaseType.Postgres] = {};
    }
    DatabaseConfiguration.clearConfigurations = clearConfigurations;
    clearConfigurations();
    function validateConfiguration(config) {
        const settings = new DatabaseSettingsHelper(config.settings);
        switch (config.type) {
            case DatabaseType.Mysql:
            case DatabaseType.Postgres:
                if (settings.relationDepth > 1 && !settings.flattenObjects) {
                    throw new Error(`Flatten objects must be enabled to have a relation depth greater than 0 for ${utility_1.EnumUtility.getName(config.type, DatabaseType)}`);
                }
                break;
        }
        return config;
    }
    function connectionName(name) {
        return lodash_1.isNil(name) ? "default" : name;
    }
    function addConfiguration(...configurations) {
        for (const config of configurations) {
            databaseConfigurations[config.type][connectionName(config.name)] = validateConfiguration(config);
        }
    }
    DatabaseConfiguration.addConfiguration = addConfiguration;
    function getConfiguration(database, name) {
        const configuration = databaseConfigurations[database][connectionName(name)];
        if (lodash_1.isNil(configuration)) {
            const databaseName = utility_1.EnumUtility.getName(DatabaseType, database);
            const error = `Configuration "${connectionName}" was not found for database type (${databaseName})"`;
            throw new Error(error);
        }
        return configuration;
    }
    DatabaseConfiguration.getConfiguration = getConfiguration;
})(DatabaseConfiguration = exports.DatabaseConfiguration || (exports.DatabaseConfiguration = {}));
