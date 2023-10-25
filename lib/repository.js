"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const utility_1 = require("@elevated/objects/lib/enum/utility");
const guid_1 = require("@elevated/objects/lib/guid");
const casing_1 = require("@elevated/objects/lib/string/casing");
const lodash_1 = require("lodash");
const configuration_1 = require("./configuration");
const entity_1 = require("./entity");
const exceptions_1 = require("./exceptions");
const object_1 = require("./utility/object");
class QueryOptions {
    static hasOptions(options) {
        return !lodash_1.isNil(options);
    }
    static ignoreGenerator(options) {
        return QueryOptions.hasOptions(options) && lodash_1.isBoolean(options.ignoreGenerator) && options.ignoreGenerator;
    }
    static useMaster(options) {
        return QueryOptions.hasOptions(options) && lodash_1.isBoolean(options.useMaster) && options.useMaster;
    }
}
exports.QueryOptions = QueryOptions;
var SaveOperation;
(function (SaveOperation) {
    SaveOperation[SaveOperation["Upsert"] = 0] = "Upsert";
    SaveOperation[SaveOperation["Insert"] = 1] = "Insert";
    SaveOperation[SaveOperation["Update"] = 2] = "Update";
})(SaveOperation = exports.SaveOperation || (exports.SaveOperation = {}));
(function (SaveOperation) {
    function isValid(value) {
        return utility_1.EnumUtility.isValid(value, SaveOperation);
    }
    SaveOperation.isValid = isValid;
})(SaveOperation = exports.SaveOperation || (exports.SaveOperation = {}));
class SaveOptions {
    static hasOptions(options) {
        return !lodash_1.isNil(options);
    }
    static overwrite(options) {
        return SaveOptions.hasOptions(options) && lodash_1.isBoolean(options.overwrite) && options.overwrite;
    }
    static operation(operation, options) {
        return SaveOptions.hasOptions(options) && options.operation === operation;
    }
    static suppressException(options) {
        return SaveOptions.hasOptions(options) && options.suppressException === true;
    }
}
exports.SaveOptions = SaveOptions;
class DatabaseRepository {
    constructor(type, classType, connectionName) {
        this.type = type;
        this.descriptor = entity_1.EntityDescriptor.get(classType);
        connectionName = lodash_1.isString(connectionName)
            ? connectionName
            : this.descriptor.getConnectionName(this.type);
        this.configuration = configuration_1.DatabaseConfiguration.getConfiguration(this.type, connectionName);
        this.settings = new configuration_1.DatabaseSettingsHelper(this.configuration.settings);
    }
    get table() {
        const schema = casing_1.convertCase(this.descriptor.schema, this.settings.schemaCasing);
        const tableName = casing_1.convertCase(this.descriptor.tableName, this.settings.tableCasing);
        return this.settings.useSchema ? `${schema}.${tableName}` : tableName;
    }
    get primaryKey() {
        return this.descriptor.getPrimaryKeyName(this.settings.columnCasing);
    }
    primaryKeyHasValue(entity) {
        return !lodash_1.isObject(entity) || entity instanceof guid_1.Guid || !lodash_1.isNil(entity[this.primaryKey]);
    }
    delete(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            this.descriptor.updateTimestamps(entity, entity_1.TimestampEvent.OnDelete, new Date());
        });
    }
    save(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            this.descriptor.updateTimestamps(entity, entity_1.TimestampEvent.OnUpdate, now);
            const exists = SaveOptions.operation(SaveOperation.Update, options)
                || (!SaveOptions.operation(SaveOperation.Insert, options) && (yield this.exists(entity, { useMaster: true, ignoreGenerator: true })));
            const operation = exists ? SaveOperation.Update : SaveOperation.Insert;
            const result = { entity, operation, successful: true };
            try {
                if (exists) {
                    yield this.update(entity, options);
                }
                else {
                    this.descriptor.updateTimestamps(entity, entity_1.TimestampEvent.OnCreate, now);
                    yield this.insert(entity, options);
                }
            }
            catch (ex) {
                if (!SaveOptions.suppressException(options)) {
                    throw ex;
                }
                result.successful = false;
                result.exception = ex;
            }
            return result;
        });
    }
    updateQuery(entity, criteria, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const name = utility_1.EnumUtility.getName(configuration_1.DatabaseType, this.type);
            throw new exceptions_1.NotImplementedException(`Update query has not been implemented for database type (${name})`);
        });
    }
    convert(source) {
        if (lodash_1.isObject(source)) {
            if (this.settings.flattenObjects) {
                source = object_1.ObjectUtility.normalize(source, this.settings.flattenSeparator, this.settings.flattenKeyStyle, this.descriptor.getColumnNames(this.settings.columnCasing, entity_1.EntityColumnDataType.Entity));
            }
            return this.descriptor.apply(new this.descriptor.classType(), source, this.descriptor.casing, this.settings.columnCasing, this.type);
        }
        return undefined;
    }
    getPrimaryKeyObject(entity) {
        return this.descriptor.getPrimaryKeyObject(entity, this.settings.columnCasing);
    }
    getPrimaryKeyValue(entity) {
        return entity instanceof this.descriptor.classType ? entity[this.primaryKey] : entity;
    }
    getValues(entity, withPrimaryKey = true) {
        let values = this.descriptor.getDatabaseObject(entity, this.settings.columnCasing, this.type, withPrimaryKey, !this.primaryKeyHasValue(entity), this.settings.relationDepth);
        if (this.settings.flattenObjects) {
            values = object_1.ObjectUtility.flatten(values, this.settings.flattenSeparator, this.settings.flattenKeyStyle);
        }
        return values;
    }
}
exports.DatabaseRepository = DatabaseRepository;
