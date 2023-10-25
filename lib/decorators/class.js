"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const configuration_1 = require("../configuration");
const entity_1 = require("../entity");
function entity(table) {
    return target => {
        if (!lodash_1.isString(table) || table.length === 0) {
            table = target.name;
        }
        entity_1.EntityDescriptorBuilder.entity(target, table);
    };
}
exports.entity = entity;
function casing(casing) {
    return target => {
        entity_1.EntityDescriptorBuilder.casing(target, casing);
    };
}
exports.casing = casing;
function inherit(target) {
    entity_1.EntityDescriptorBuilder.inherit(target);
}
exports.inherit = inherit;
function schema(name) {
    return target => {
        entity_1.EntityDescriptorBuilder.schema(target, name);
    };
}
exports.schema = schema;
function connection(name, database = configuration_1.DatabaseType.Unspecified) {
    return target => {
        entity_1.EntityDescriptorBuilder.connection(target, name, database);
    };
}
exports.connection = connection;
function source(type) {
    return target => {
        entity_1.EntityDescriptorBuilder.source(target, type);
    };
}
exports.source = source;
function cache(...databases) {
    return target => {
        entity_1.EntityDescriptorBuilder.cacheOrder(target, databases);
    };
}
exports.cache = cache;
