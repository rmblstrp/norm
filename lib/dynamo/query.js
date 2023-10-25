"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const configuration_1 = require("../configuration");
const criteria_1 = require("../criteria");
const entity_1 = require("../entity");
const guid_1 = require("@elevated/objects/lib/guid");
const casing_1 = require("@elevated/objects/lib/string/casing");
class DynamoQuery {
    constructor(criteria, settings) {
        this.attributeCounter = 0;
        this.generateQuery = false;
        this.criteria = criteria;
        this.settings = settings;
        this.descriptor = entity_1.EntityDescriptor.get(criteria.classType);
        this.table = this.tableName(this.descriptor.schema, this.descriptor.tableName);
        this.query = {
            TableName: this.table
        };
    }
    static generate(criteria, settings) {
        return new DynamoQuery(criteria, settings).make();
    }
    static getEvaluationExpression(evaluation) {
        return evaluation === criteria_1.CriteriaEvaluation.And ? "AND" : "OR";
    }
    static getComparisonExpression(comparison) {
        switch (comparison) {
            case criteria_1.CriteriaComparison.Between:
            case criteria_1.CriteriaComparison.NotBetween:
                return "BETWEEN";
            case criteria_1.CriteriaComparison.GreaterThan:
                return ">";
            case criteria_1.CriteriaComparison.GreaterThanEqualTo:
                return ">=";
            case criteria_1.CriteriaComparison.In:
            case criteria_1.CriteriaComparison.NotIn:
                return "IN";
            case criteria_1.CriteriaComparison.LessThan:
                return "<";
            case criteria_1.CriteriaComparison.LessThanEqualTo:
                return "<=";
            case criteria_1.CriteriaComparison.NotEqual:
                return "<>";
            default:
                return "=";
        }
    }
    static createExpression(parameter, attribute) {
        let expression;
        if (parameter.comparison === criteria_1.CriteriaComparison.Like || parameter.comparison === criteria_1.CriteriaComparison.NotLike) {
            let count = 0;
            const expressionItems = [];
            for (const item of parameter.value.split("%")) {
                if (lodash_1.isString(item) && item.length > 0) {
                    count++;
                    let contains = `contains(${attribute.keyPlaceholder}CF${count}, ${attribute.valueName}CF${count})`;
                    if (parameter.comparison === criteria_1.CriteriaComparison.NotLike) {
                        contains = `NOT ${contains}`;
                    }
                    expressionItems.push(contains);
                }
                expression = `(${expressionItems.join(" AND ")})`;
            }
        }
        else {
            expression = `${attribute.keyPlaceholder} ${DynamoQuery.getComparisonExpression(parameter.comparison)} `;
            switch (parameter.comparison) {
                case criteria_1.CriteriaComparison.Between:
                case criteria_1.CriteriaComparison.NotBetween:
                    expression += `${attribute.valueName}BT1 AND ${attribute.valueName}BT2`;
                    break;
                case criteria_1.CriteriaComparison.In:
                case criteria_1.CriteriaComparison.NotIn:
                    const expressionItems = [];
                    for (let index = 0; index < parameter.value.length; index++) {
                        expressionItems.push(`${attribute.valueName}IN${index + 1}`);
                    }
                    expression += `(${expressionItems.join(",")})`;
                    break;
                default:
                    expression += attribute.valueName;
                    break;
            }
            switch (parameter.comparison) {
                case criteria_1.CriteriaComparison.NotBetween:
                case criteria_1.CriteriaComparison.NotIn:
                    expression = `NOT ${expression}`;
                    break;
            }
        }
        return expression;
    }
    make() {
        this.applyParameters(this.criteria.whereParameters, this.descriptor);
        this.applyJoins(this.descriptor, this.criteria.joinParameters, this.criteria.classType);
        this.applyLimit();
        this.applyOrder();
        return this.query;
    }
    qualify(prefix, name) {
        const casedNamed = casing_1.convertCase(name, this.settings.columnCasing);
        return lodash_1.isNil(prefix) ? casedNamed : `${prefix}.${casedNamed}`;
    }
    tableName(schema, tableName) {
        const casedSchema = casing_1.convertCase(schema, this.settings.schemaCasing);
        const casedTableName = casing_1.convertCase(tableName, this.settings.tableCasing);
        return this.settings.useSchema ? `${casedSchema}.${casedTableName}` : casedTableName;
    }
    columnPath(name, prefix) {
        const segments = lodash_1.isString(prefix) ? prefix.split(".") : [];
        segments.push(name);
        for (let index = 0; index < segments.length; index++) {
            segments[index] = casing_1.convertCase(segments[index], this.settings.columnCasing);
            if (this.settings.flattenObjects) {
                segments[index] = casing_1.convertCase(segments[index], this.settings.flattenKeyStyle);
            }
        }
        return segments.join(".");
    }
    qualifyAttribute(column) {
        this.attributeCounter++;
        const segments = column.split(".");
        const valueName = casing_1.convertCase(`${column}${this.attributeCounter}`, casing_1.StringCase.Camel);
        let keyName = casing_1.convertCase(segments[0], casing_1.StringCase.Camel);
        let columnName = casing_1.convertCase(keyName, this.settings.columnCasing);
        let keyPlaceholder;
        if (this.settings.flattenObjects) {
            keyName = casing_1.convertCase(column, casing_1.StringCase.Camel);
            columnName = column.replace(/\./g, this.settings.flattenSeparator);
            keyPlaceholder = keyName;
        }
        else {
            if (this.settings.relationDepth > 0) {
                const suffix = segments.slice(1, this.settings.relationDepth);
                if (segments.length - suffix.length > 1) {
                    const postSuffix = segments.slice(suffix.length + 1);
                    for (let index = 0; index < postSuffix.length; index++) {
                        postSuffix[index] = casing_1.convertCase(postSuffix[index], casing_1.StringCase.Pascal);
                    }
                    suffix.push(casing_1.convertCase(postSuffix.join(""), this.settings.columnCasing));
                }
                keyPlaceholder = suffix.length === 0 ? keyName : `${keyName}.${suffix.join(".")}`;
            }
            else {
                const suffix = segments.slice();
                for (let index = 0; index < suffix.length; index++) {
                    suffix[index] = casing_1.convertCase(suffix[index], casing_1.StringCase.Pascal);
                }
                columnName = keyPlaceholder = keyName = casing_1.convertCase(suffix.join(""), this.settings.columnCasing);
            }
        }
        return {
            keyName: `#${keyName}`,
            keyPlaceholder: `#${keyPlaceholder}`,
            valueName: `:${valueName}`,
            columnName
        };
    }
    applyLimit() {
        if (this.criteria.maxResultCount > 0) {
            this.query.Limit = this.criteria.maxResultCount;
        }
    }
    applyOrder() {
        if (this.criteria.orderParameters.length > 0) {
            this.query.ScanIndexForward = this.criteria.orderParameters[0].order === criteria_1.CriteriaOrder.Ascending;
        }
    }
    applyParameters(parameters, descriptor, prefix) {
        const expressionResult = this.buildWhereParameters(parameters, descriptor, prefix);
        if (lodash_1.isString(expressionResult.filterExpression)) {
            if (!lodash_1.isString(this.query.FilterExpression)) {
                this.query.FilterExpression = expressionResult.filterExpression;
            }
            else {
                this.query.FilterExpression += ` AND (${expressionResult.filterExpression})`;
            }
        }
        if (lodash_1.isString(expressionResult.keyExpression)) {
            if (!lodash_1.isString(this.query.KeyConditionExpression)) {
                this.query.KeyConditionExpression = expressionResult.keyExpression;
            }
            else {
                this.query.KeyConditionExpression += ` AND (${expressionResult.keyExpression})`;
            }
        }
    }
    buildWhereParameters(whereParameters, descriptor, prefix) {
        let filterExpression = "";
        let keyExpression = "";
        whereParameters.forEach(item => {
            let result;
            if (item instanceof criteria_1.CriteriaWhereValue) {
                result = this.applyWhereValue(item, descriptor, prefix);
            }
            else if (item instanceof criteria_1.CriteriaWhereGroup) {
                result = this.applyWhereGroup(item, descriptor, prefix);
            }
            if (!lodash_1.isNil(result)) {
                if (lodash_1.isString(result.filterExpression)) {
                    if (filterExpression.length > 0) {
                        filterExpression += ` ${DynamoQuery.getEvaluationExpression(item.evaluation)} `;
                    }
                    filterExpression += result.filterExpression;
                }
                if (lodash_1.isString(result.keyExpression)) {
                    if (keyExpression.length > 0) {
                        keyExpression += ` ${DynamoQuery.getEvaluationExpression(criteria_1.CriteriaEvaluation.Or)} `;
                    }
                    keyExpression += result.keyExpression;
                }
            }
        });
        return {
            filterExpression: filterExpression.length > 0 ? filterExpression : undefined,
            keyExpression: keyExpression.length > 0 ? keyExpression : undefined
        };
    }
    isPrimaryKey(parameter) {
        return this.descriptor.primaryKey.name === parameter.key;
    }
    applyIndex(key, descriptor) {
        const column = descriptor.fromMap(key);
        if (column instanceof entity_1.EntityColumnDescriptor && !lodash_1.isNil(column.indexName) && lodash_1.isNil(this.query.IndexName)) {
            this.query.IndexName = column.indexName;
        }
    }
    applyWhereValue(parameter, descriptor, prefix) {
        if (descriptor.fromMap(parameter.key).isExcluded(configuration_1.DatabaseType.DynamoDB)) {
            return;
        }
        let isPrimaryKey = this.isPrimaryKey(parameter);
        if (lodash_1.isString(prefix)) {
            try {
                this.applyIndex(prefix, this.descriptor);
                const prefixDescriptor = this.descriptor.fromMap(prefix);
                isPrimaryKey = prefixDescriptor.indexName === this.query.IndexName;
                this.generateQuery = true;
            }
            catch (_a) {
            }
        }
        else {
            this.applyIndex(parameter.key, descriptor);
        }
        return {
            filterExpression: this.generateQuery && isPrimaryKey ? undefined : this.buildExpression(parameter, prefix),
            keyExpression: this.generateQuery && isPrimaryKey ? this.buildExpression(parameter, prefix) : undefined
        };
    }
    buildExpression(parameter, prefix) {
        if (!lodash_1.isObject(this.query.ExpressionAttributeNames)) {
            this.query.ExpressionAttributeNames = {};
        }
        if (!lodash_1.isObject(this.query.ExpressionAttributeValues)) {
            this.query.ExpressionAttributeValues = {};
        }
        const path = this.columnPath(parameter.key, prefix);
        const attribute = this.qualifyAttribute(path);
        if (lodash_1.isArray(parameter.value)) {
            for (let index = 0; index < parameter.value.length; index++) {
                if (parameter.value[index] instanceof guid_1.Guid) {
                    parameter.value[index] = parameter.value[index].valueOf();
                }
            }
        }
        else if (parameter.value instanceof guid_1.Guid) {
            parameter.value = parameter.value.valueOf();
        }
        switch (parameter.comparison) {
            case criteria_1.CriteriaComparison.Between:
            case criteria_1.CriteriaComparison.NotBetween:
                this.query.ExpressionAttributeNames[attribute.keyName] = attribute.columnName;
                this.query.ExpressionAttributeValues[`${attribute.valueName}BT1`] = parameter.value[0];
                this.query.ExpressionAttributeValues[`${attribute.valueName}BT2`] = parameter.value[1];
                break;
            case criteria_1.CriteriaComparison.Like:
            case criteria_1.CriteriaComparison.NotLike:
                let count = 0;
                for (const item of parameter.value.split("%")) {
                    if (lodash_1.isString(item) && item.length > 0) {
                        count++;
                        this.query.ExpressionAttributeNames[`${attribute.keyName}CF${count}`] = attribute.columnName;
                        this.query.ExpressionAttributeValues[`${attribute.valueName}CF${count}`] = item;
                    }
                }
                break;
            case criteria_1.CriteriaComparison.In:
            case criteria_1.CriteriaComparison.NotIn:
                this.query.ExpressionAttributeNames[attribute.keyName] = attribute.columnName;
                for (let index = 0; index < parameter.value.length; index++) {
                    this.query.ExpressionAttributeValues[`${attribute.valueName}IN${index + 1}`] = parameter.value[index];
                }
                break;
            default:
                this.query.ExpressionAttributeNames[attribute.keyName] = attribute.columnName;
                this.query.ExpressionAttributeValues[attribute.valueName] = parameter.value;
                break;
        }
        return DynamoQuery.createExpression(parameter, attribute);
    }
    applyWhereGroup(parameter, descriptor, prefix) {
        const result = this.buildWhereParameters(parameter.whereParameters, descriptor, prefix);
        return {
            filterExpression: lodash_1.isString(result.filterExpression) ? `(${result.filterExpression})` : undefined,
            keyExpression: lodash_1.isString(result.keyExpression) ? result.keyExpression : undefined
        };
    }
    applyJoins(parentDescriptor, joinParameters, classType, prefix) {
        joinParameters.forEach(join => {
            const relatedDescriptor = entity_1.EntityDescriptor.get(join.criteria.classType);
            let foreignKey = "";
            let matched = false;
            parentDescriptor.columns.forEach(column => {
                if (column.relatesTo === join.criteria.classType) {
                    matched = true;
                    foreignKey = column.name;
                }
            });
            if (!matched) {
                relatedDescriptor.columns.forEach(column => {
                    if (column.relatesTo === classType) {
                        matched = true;
                        foreignKey = column.name;
                    }
                });
            }
            if (!matched) {
                throw new Error(`The entity classes (${parentDescriptor.classType.name}, ${relatedDescriptor.classType.name}) for this join do not have a specified relation`);
            }
            prefix = this.qualify(prefix, foreignKey);
            this.applyParameters(join.criteria.whereParameters, relatedDescriptor, prefix);
            this.applyJoins(relatedDescriptor, join.criteria.joinParameters, join.criteria.classType, prefix);
        });
    }
}
exports.DynamoQuery = DynamoQuery;
