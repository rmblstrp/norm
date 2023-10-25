"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const configuration_1 = require("../configuration");
const entity_1 = require("../entity");
function executeDescriptor(descriptor) {
    if (descriptor) {
        return descriptor;
    }
}
function doColumnDecorator(target, descriptor, column, isPrimaryKey) {
    entity_1.EntityDescriptorBuilder.column(target, column, isPrimaryKey);
    return executeDescriptor(descriptor);
}
function createColumnDescriptor(target, name, descriptor, order) {
    if (!lodash_1.isNil(descriptor) && lodash_1.isNil(descriptor.get)) {
        throw new Error(`Only property accessor methods are allowed: ${name}`);
    }
    const typeMap = {
        Boolean: entity_1.EntityColumnDataType.Boolean,
        Date: entity_1.EntityColumnDataType.Date,
        Guid: entity_1.EntityColumnDataType.Guid,
        Number: entity_1.EntityColumnDataType.Number,
        String: entity_1.EntityColumnDataType.String
    };
    const reflectedType = Reflect.getMetadata("design:type", target, name);
    const columnType = typeMap[reflectedType.name];
    return {
        name,
        type: lodash_1.isNil(columnType) ? entity_1.EntityColumnDataType.Undetermined : columnType,
        order,
        exclusions: configuration_1.DatabaseType.Unspecified
    };
}
function column(target, name, descriptor) {
    const column = createColumnDescriptor(target, name, descriptor);
    return doColumnDecorator(target, descriptor, column, false);
}
exports.column = column;
function columnOrder(order) {
    return (target, name, descriptor) => {
        entity_1.EntityDescriptorBuilder.order(target, name, order);
        return executeDescriptor(descriptor);
    };
}
exports.columnOrder = columnOrder;
function exclude(...databases) {
    return (target, name, descriptor) => {
        entity_1.EntityDescriptorBuilder.exclusions(target, name, databases);
        return executeDescriptor(descriptor);
    };
}
exports.exclude = exclude;
function generator(type) {
    return (target, name, descriptor) => {
        entity_1.EntityDescriptorBuilder.generator(target, name, type);
        return executeDescriptor(descriptor);
    };
}
exports.generator = generator;
function index(indexName = undefined) {
    return (target, name, descriptor) => {
        entity_1.EntityDescriptorBuilder.index(target, name, lodash_1.isString(indexName) ? indexName : name);
        return executeDescriptor(descriptor);
    };
}
exports.index = index;
function only(...databases) {
    return (target, name, descriptor) => {
        entity_1.EntityDescriptorBuilder.only(target, name, databases);
        return executeDescriptor(descriptor);
    };
}
exports.only = only;
function primaryKey(target, name, descriptor) {
    const column = createColumnDescriptor(target, name, descriptor);
    return doColumnDecorator(target, descriptor, column, true);
}
exports.primaryKey = primaryKey;
function type(columnType) {
    return (target, name, descriptor) => {
        entity_1.EntityDescriptorBuilder.type(target, name, columnType);
        return executeDescriptor(descriptor);
    };
}
exports.type = type;
function relatesTo(entityClass) {
    return (target, name, descriptor) => {
        entity_1.EntityDescriptorBuilder.relatesTo(target, name, entityClass);
        return executeDescriptor(descriptor);
    };
}
exports.relatesTo = relatesTo;
function timestamp(event) {
    return (target, name, descriptor) => {
        entity_1.EntityDescriptorBuilder.timestamp(target, name, event);
        return executeDescriptor(descriptor);
    };
}
exports.timestamp = timestamp;
