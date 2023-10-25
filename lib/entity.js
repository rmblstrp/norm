"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const guid_1 = require("@elevated/objects/lib/guid");
const casing_1 = require("@elevated/objects/lib/string/casing");
const lodash_1 = require("lodash");
require("reflect-metadata");
const configuration_1 = require("./configuration");
const object_1 = require("./utility/object");
var TimestampEvent;
(function (TimestampEvent) {
    TimestampEvent[TimestampEvent["OnCreate"] = 0] = "OnCreate";
    TimestampEvent[TimestampEvent["OnUpdate"] = 1] = "OnUpdate";
    TimestampEvent[TimestampEvent["OnDelete"] = 2] = "OnDelete";
})(TimestampEvent = exports.TimestampEvent || (exports.TimestampEvent = {}));
class EntityDescriptor {
    constructor() {
        this.isEntity = false;
        this.columns = [];
        this.map = {};
        this.timestamps = [];
        this.source = configuration_1.DatabaseType.Unspecified;
        this.cache = [];
        this.casing = casing_1.StringCase.Camel;
        this.connectionNameMap = [];
        this.timestamps[TimestampEvent.OnCreate] = [];
        this.timestamps[TimestampEvent.OnUpdate] = [];
        this.timestamps[TimestampEvent.OnDelete] = [];
    }
    static get(target) {
        return Reflect.getOwnMetadata(EntityDescriptor.metadataKey, object_1.ObjectUtility.getPrototype(target));
    }
    static ensure(target) {
        const targetPrototype = object_1.ObjectUtility.getPrototype(target);
        let descriptor = EntityDescriptor.get(targetPrototype);
        if (!(descriptor instanceof EntityDescriptor)) {
            descriptor = new EntityDescriptor();
            descriptor.classType = targetPrototype.constructor;
            const parentDescriptor = Reflect.getMetadata(EntityDescriptor.metadataKey, targetPrototype);
            if (parentDescriptor instanceof EntityDescriptor) {
                if (!parentDescriptor.isEntity) {
                    throw new Error("Parent entity has not been marked with @entity or it has not finished building");
                }
                descriptor.parent = parentDescriptor;
                descriptor.schema = parentDescriptor.schema;
                descriptor.primaryKey = Object.assign(new EntityColumnDescriptor(), parentDescriptor.primaryKey);
                descriptor.addToMap(descriptor.primaryKey);
                descriptor.casing = parentDescriptor.casing;
                descriptor.connectionNameMap = parentDescriptor.connectionNameMap.slice();
                for (const parentColumn of parentDescriptor.columns) {
                    const column = Object.assign(new EntityColumnDescriptor(), parentColumn);
                    descriptor.columns.push(column);
                    descriptor.addToMap(column);
                }
                for (const parentColumn of parentDescriptor.timestamps[TimestampEvent.OnCreate]) {
                    const column = Object.assign(new EntityColumnDescriptor(), parentColumn);
                    descriptor.timestamps[TimestampEvent.OnCreate].push(column);
                    descriptor.addToMap(column);
                }
                for (const parentColumn of parentDescriptor.timestamps[TimestampEvent.OnUpdate]) {
                    const column = Object.assign(new EntityColumnDescriptor(), parentColumn);
                    descriptor.timestamps[TimestampEvent.OnUpdate].push(column);
                    descriptor.addToMap(column);
                }
                for (const parentColumn of parentDescriptor.timestamps[TimestampEvent.OnDelete]) {
                    const column = Object.assign(new EntityColumnDescriptor(), parentColumn);
                    descriptor.timestamps[TimestampEvent.OnDelete].push(column);
                    descriptor.addToMap(column);
                }
            }
            Reflect.defineMetadata(EntityDescriptor.metadataKey, descriptor, targetPrototype);
        }
        return descriptor;
    }
    static hasDescriptor(target) {
        return EntityDescriptor.get(target) instanceof EntityDescriptor;
    }
    static isEntity(target) {
        return EntityDescriptor.hasDescriptor(target) && EntityDescriptor.get(target).isEntity;
    }
    addToMap(column) {
        this.map[column.name.toLowerCase()] = column;
    }
    getConnectionName(database) {
        let name;
        if (lodash_1.isNil(this.connectionNameMap[database])) {
            name = lodash_1.isNil(this.connectionNameMap[configuration_1.DatabaseType.Unspecified])
                ? undefined
                : this.connectionNameMap[configuration_1.DatabaseType.Unspecified];
        }
        else {
            name = this.connectionNameMap[database];
        }
        return name;
    }
    setConnectionName(name, database) {
        this.connectionNameMap[database] = name;
    }
    fromMap(name) {
        name = name.toLowerCase();
        if (!this.map.hasOwnProperty(name)) {
            throw new Error(`Missing descriptor for column: ${name}`);
        }
        return this.map[name];
    }
    getColumnNames(casing, ...exclude) {
        const names = [];
        for (const column of this.columns) {
            if (exclude.indexOf(column.type) < 0) {
                names.push(casing_1.convertCase(column.name, casing));
            }
        }
        return names;
    }
    apply(target, source, targetCasing, sourceCasing, database = configuration_1.DatabaseType.Unspecified, relationDepth) {
        if (this.primaryKey) {
            this.applyValue(this.primaryKey.name, target, source, targetCasing, sourceCasing, database, relationDepth);
        }
        for (const item of this.columns) {
            this.applyValue(item.name, target, source, targetCasing, sourceCasing, database, relationDepth);
        }
        return target;
    }
    getPrimaryKeyName(casing) {
        return casing_1.convertCase(this.primaryKey.name, casing);
    }
    getPrimaryKeyObject(entity, casing = casing_1.StringCase.Same, generateKey = false) {
        if (!lodash_1.isObject(entity) || entity instanceof guid_1.Guid) {
            const temp = {};
            temp[this.primaryKey.name] = entity;
            entity = temp;
        }
        if (generateKey && this.primaryKey.generator === EntityKeyGenerator.Guid && !(entity[this.primaryKey.name] instanceof guid_1.Guid)) {
            entity[this.primaryKey.name] = guid_1.Guid.newGuid();
        }
        return this.applyValue(this.primaryKey.name, {}, entity, casing_1.StringCase.Camel, casing);
    }
    getTransferObject(entity, relationDepth, casing = casing_1.StringCase.Same) {
        let output = this.getPrimaryKeyObject(entity, casing);
        for (const item of this.columns) {
            output = this.applyValue(item.name, output, entity, casing, casing_1.StringCase.Same, relationDepth);
        }
        return output;
    }
    getDatabaseObject(entity, casing, database, includeKey = true, generateKey = false, relationDepth) {
        let output = includeKey ? this.getPrimaryKeyObject(entity, casing, generateKey) : {};
        for (const item of this.columns) {
            if (!item.isExcluded(database)) {
                output = this.applyValue(item.name, output, entity, casing, this.casing, database, relationDepth);
            }
        }
        return output;
    }
    updateTimestamps(entity, event, timestamp) {
        const list = this.timestamps[event];
        for (const item of list) {
            entity[item.name] = timestamp;
        }
    }
    applyValue(name, target, source, targetCasing, sourceCasing, database = configuration_1.DatabaseType.Unspecified, relationDepth) {
        const columnDescriptor = this.fromMap(name);
        const sourceName = casing_1.convertCase(name, sourceCasing);
        if (!source.hasOwnProperty(sourceName) && columnDescriptor.type !== EntityColumnDataType.Entity) {
            return target;
        }
        let targetName = casing_1.convertCase(name, targetCasing);
        let value = source[sourceName];
        switch (columnDescriptor.type) {
            case EntityColumnDataType.Number:
                if (lodash_1.isString(value)) {
                    value = parseInt(value, 10);
                }
                break;
            case EntityColumnDataType.Float:
                if (lodash_1.isString(value)) {
                    value = parseFloat(value);
                }
                break;
            case EntityColumnDataType.String:
                if (!lodash_1.isString(value) && !lodash_1.isNil(value)) {
                    value = value.toString();
                }
                break;
            case EntityColumnDataType.Date:
                if (lodash_1.isString(value)) {
                    value = new Date(value);
                }
                if (value instanceof Date) {
                    value.setMilliseconds(0);
                }
                break;
            case EntityColumnDataType.Guid:
                if (value instanceof guid_1.Guid) {
                    value = value.toString();
                }
                else {
                    value = guid_1.Guid.parse(value);
                }
                break;
            case EntityColumnDataType.Entity:
                const relatedDescriptor = EntityDescriptor.get(columnDescriptor.relatesTo);
                if (lodash_1.isObject(value)) {
                    if (!lodash_1.isUndefined(relationDepth) && relationDepth > 0 && value instanceof columnDescriptor.relatesTo) {
                        value = relatedDescriptor.getDatabaseObject(value, targetCasing, database, true, lodash_1.isNil(value[relatedDescriptor.getPrimaryKeyName()]), --relationDepth);
                    }
                    else {
                        if (lodash_1.isObject(target) && target instanceof this.classType) {
                            value = relatedDescriptor.apply(new columnDescriptor.relatesTo(), value, relatedDescriptor.casing, sourceCasing, database);
                        }
                        else {
                            value = relatedDescriptor.getPrimaryKeyObject(value, casing_1.StringCase.Same, lodash_1.isNil(value[relatedDescriptor.getPrimaryKeyName()]));
                            value = value[relatedDescriptor.getPrimaryKeyName()];
                            const relationName = casing_1.convertCase(name, casing_1.StringCase.Kebab);
                            targetName = casing_1.convertCase(`${relationName}-${relatedDescriptor.getPrimaryKeyName()}`, targetCasing);
                        }
                    }
                }
                else {
                    if (lodash_1.isUndefined(value)) {
                        const relationName = casing_1.convertCase(name, casing_1.StringCase.Kebab);
                        const sourceKeyName = casing_1.convertCase(`${relationName}-${relatedDescriptor.getPrimaryKeyName()}`, sourceCasing);
                        if (source.hasOwnProperty(sourceKeyName)) {
                            const relationSource = {};
                            const relationKeyName = `${casing_1.convertCase(relationName, sourceCasing)}_${relatedDescriptor.getPrimaryKeyName()}`;
                            relationSource[relationKeyName] = source[sourceKeyName];
                            value = object_1.ObjectUtility.normalize(relationSource)[sourceName];
                        }
                    }
                    if (!lodash_1.isUndefined(value)) {
                        const targetValue = target[targetName] instanceof columnDescriptor.relatesTo
                            ? target[targetName]
                            : new columnDescriptor.relatesTo();
                        value = relatedDescriptor.apply(targetValue, value, relatedDescriptor.casing, sourceCasing, database);
                    }
                }
        }
        if (!lodash_1.isUndefined(value)) {
            target[targetName] = value;
        }
        return target;
    }
}
EntityDescriptor.metadataKey = "entity";
exports.EntityDescriptor = EntityDescriptor;
var EntityColumnDataType;
(function (EntityColumnDataType) {
    EntityColumnDataType[EntityColumnDataType["Boolean"] = 0] = "Boolean";
    EntityColumnDataType[EntityColumnDataType["Date"] = 1] = "Date";
    EntityColumnDataType[EntityColumnDataType["Entity"] = 2] = "Entity";
    EntityColumnDataType[EntityColumnDataType["Float"] = 3] = "Float";
    EntityColumnDataType[EntityColumnDataType["Guid"] = 4] = "Guid";
    EntityColumnDataType[EntityColumnDataType["Number"] = 5] = "Number";
    EntityColumnDataType[EntityColumnDataType["String"] = 6] = "String";
    EntityColumnDataType[EntityColumnDataType["Undetermined"] = 7] = "Undetermined";
})(EntityColumnDataType = exports.EntityColumnDataType || (exports.EntityColumnDataType = {}));
var EntityKeyGenerator;
(function (EntityKeyGenerator) {
    EntityKeyGenerator[EntityKeyGenerator["None"] = 0] = "None";
    EntityKeyGenerator[EntityKeyGenerator["Guid"] = 1] = "Guid";
    EntityKeyGenerator[EntityKeyGenerator["Identity"] = 2] = "Identity";
})(EntityKeyGenerator = exports.EntityKeyGenerator || (exports.EntityKeyGenerator = {}));
class EntityColumnDescriptor {
    constructor() {
        this.generator = EntityKeyGenerator.None;
    }
    isExcluded(database) {
        return (database !== configuration_1.DatabaseType.Unspecified) && ((this.exclusions & database) === database);
    }
}
exports.EntityColumnDescriptor = EntityColumnDescriptor;
class EntityDescriptorBuilder {
    static cacheOrder(target, databases) {
        EntityDescriptorBuilder.ensureDescriptor(target).cache = databases;
    }
    static casing(target, casing) {
        EntityDescriptorBuilder.ensureDescriptor(target).casing = casing;
    }
    static column(target, properties, isPrimaryKey) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        const column = Object.assign(new EntityColumnDescriptor(), properties);
        if (isPrimaryKey) {
            descriptor.primaryKey = column;
        }
        else {
            descriptor.columns.push(column);
        }
        descriptor.addToMap(column);
    }
    static connection(target, name, database) {
        EntityDescriptorBuilder.ensureDescriptor(target).setConnectionName(name, database);
    }
    static entity(target, tableName) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        descriptor.tableName = tableName;
        descriptor.isEntity = true;
    }
    static exclusions(target, name, databases) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        const column = descriptor.fromMap(name);
        let exclusions = configuration_1.DatabaseType.Unspecified;
        for (const item of databases) {
            exclusions |= item;
        }
        column.exclusions = exclusions;
    }
    static generator(target, name, type) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        descriptor.fromMap(name).generator = type;
    }
    static index(target, name, indexName) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        descriptor.fromMap(name).indexName = indexName;
    }
    static inherit(target) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        if (!(descriptor.parent instanceof EntityDescriptor)) {
            throw new Error(`${target.constructor.name} Entity must extend from another defined entity`);
        }
        descriptor.source = descriptor.parent.source;
        descriptor.cache = descriptor.parent.cache.slice();
        descriptor.connectionNameMap = descriptor.parent.connectionNameMap.slice();
        EntityDescriptorBuilder.entity(target, descriptor.parent.tableName);
    }
    static only(target, name, databases) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        const column = descriptor.fromMap(name);
        let exclusions = configuration_1.DatabaseType.Supported;
        for (const item of databases) {
            exclusions ^= item;
        }
        column.exclusions = exclusions;
    }
    static order(target, name, order) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        descriptor.fromMap(name).order = order;
    }
    static relatesTo(target, name, entityClass) {
        if (!EntityDescriptor.hasDescriptor(entityClass)) {
            throw new Error(`Desired relation class is not an entity: ${target.constructor.name} => ${name} => ${entityClass}`);
        }
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        const column = descriptor.fromMap(name);
        column.relatesTo = entityClass;
        if (column.type === EntityColumnDataType.Undetermined) {
            column.type = EntityColumnDataType.Entity;
        }
    }
    static schema(target, name) {
        EntityDescriptorBuilder.ensureDescriptor(target).schema = name;
    }
    static source(target, database) {
        EntityDescriptorBuilder.ensureDescriptor(target).source = database;
    }
    static timestamp(target, name, event) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        const column = descriptor.fromMap(name);
        descriptor.timestamps[event].push(column);
    }
    static type(target, name, columnType) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        descriptor.fromMap(name).type = columnType;
    }
    static ensureDescriptor(target) {
        if (EntityDescriptor.isEntity(target)) {
            throw new Error(`Class ${target.constructor.name} has already been specified as an entity`);
        }
        return EntityDescriptor.ensure(target);
    }
}
exports.EntityDescriptorBuilder = EntityDescriptorBuilder;
