import { QueryInput, ScanInput } from "aws-sdk/clients/dynamodb";
import { isArray, isNil, isObject, isString } from "lodash";
import { DatabaseSettingsHelper, DatabaseType, } from "../configuration";
import {
    Criteria,
    CriteriaComparison,
    CriteriaEvaluation,
    CriteriaJoinParameter,
    CriteriaOrder,
    CriteriaWhere,
    CriteriaWhereGroup,
    CriteriaWhereValue,
} from "../criteria";
import { EntityColumnDescriptor, EntityDescriptor } from "../entity";
import { Guid } from "@elevated/objects/lib/guid";
import { Constructable } from "@elevated/objects/lib/types";
import { StringCase, convertCase } from "@elevated/objects/lib/string/casing";

interface DynamoExpressionAttribute {
    keyName: string;
    keyPlaceholder: string;
    valueName: string;
    columnName: string;
}

interface ExpressionResult {
    filterExpression: string;
    keyExpression: string;
}

export class DynamoQuery {
    protected criteria: Criteria;
    protected table: string;
    protected descriptor: EntityDescriptor;
    protected settings: DatabaseSettingsHelper;

    protected query: QueryInput;
    protected attributeCounter = 0;

    protected generateQuery = false;

    protected constructor(criteria: Criteria, settings: DatabaseSettingsHelper) {
        this.criteria = criteria;
        this.settings = settings;

        this.descriptor = EntityDescriptor.get(criteria.classType);
        this.table = this.tableName(this.descriptor.schema, this.descriptor.tableName);

        this.query = {
            TableName: this.table
        };
    }

    public static generate(criteria: Criteria, settings: DatabaseSettingsHelper): QueryInput & ScanInput {
        return new DynamoQuery(criteria, settings).make();
    }

    private static getEvaluationExpression(evaluation: CriteriaEvaluation): string {
        return evaluation === CriteriaEvaluation.And ? "AND" : "OR";
    }

    private static getComparisonExpression(comparison: CriteriaComparison): string {
        switch (comparison) {
            case CriteriaComparison.Between:
            case CriteriaComparison.NotBetween:
                return "BETWEEN";
            case CriteriaComparison.GreaterThan:
                return ">";
            case CriteriaComparison.GreaterThanEqualTo:
                return ">=";
            case CriteriaComparison.In:
            case CriteriaComparison.NotIn:
                return "IN";
            case CriteriaComparison.LessThan:
                return "<";
            case CriteriaComparison.LessThanEqualTo:
                return "<=";
            case CriteriaComparison.NotEqual:
                return "<>";
            default:
                return "=";
        }
    }

    private static createExpression(parameter: CriteriaWhereValue, attribute: DynamoExpressionAttribute): string {
        let expression: string;

        if (parameter.comparison === CriteriaComparison.Like || parameter.comparison === CriteriaComparison.NotLike) {
            let count = 0;
            const expressionItems: string[] = [];
            for (const item of parameter.value.split("%")) {
                if (isString(item) && item.length > 0) {
                    count++;
                    let contains = `contains(${attribute.keyPlaceholder}CF${count}, ${attribute.valueName}CF${count})`;

                    if (parameter.comparison === CriteriaComparison.NotLike) {
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
                case CriteriaComparison.Between:
                case CriteriaComparison.NotBetween:
                    expression += `${attribute.valueName}BT1 AND ${attribute.valueName}BT2`;
                    break;
                case CriteriaComparison.In:
                case CriteriaComparison.NotIn:
                    const expressionItems: string[] = [];
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
                case CriteriaComparison.NotBetween:
                case CriteriaComparison.NotIn:
                    expression = `NOT ${expression}`;
                    break;
            }
        }

        return expression;
    }

    public make(): QueryInput & ScanInput {
        this.applyParameters(this.criteria.whereParameters, this.descriptor);
        this.applyJoins(this.descriptor, this.criteria.joinParameters, this.criteria.classType);
        this.applyLimit();
        this.applyOrder();

        return this.query;
    }

    protected qualify(prefix: string, name: string): string {
        const casedNamed = convertCase(name, this.settings.columnCasing);
        return isNil(prefix) ? casedNamed : `${prefix}.${casedNamed}`;
    }

    private tableName(schema: string, tableName: string): string {
        const casedSchema = convertCase(schema, this.settings.schemaCasing);
        const casedTableName = convertCase(tableName, this.settings.tableCasing);

        return this.settings.useSchema ? `${casedSchema}.${casedTableName}` : casedTableName;
    }

    private columnPath(name: string, prefix: string): string {
        const segments: string[] = isString(prefix) ? prefix.split(".") : [];

        segments.push(name);

        for (let index = 0; index < segments.length; index++) {
            segments[index] = convertCase(segments[index], this.settings.columnCasing);

            if (this.settings.flattenObjects) {
                segments[index] = convertCase(segments[index], this.settings.flattenKeyStyle);
            }
        }

        return segments.join(".");
    }

    private qualifyAttribute(column: string): DynamoExpressionAttribute {
        this.attributeCounter++;

        const segments = column.split(".");
        const valueName = convertCase(`${column}${this.attributeCounter}`, StringCase.Camel);
        let keyName = convertCase(segments[0], StringCase.Camel);
        let columnName = convertCase(keyName, this.settings.columnCasing);
        let keyPlaceholder: string;

        if (this.settings.flattenObjects) {
            keyName = convertCase(column, StringCase.Camel);
            columnName = column.replace(/\./g, this.settings.flattenSeparator);
            keyPlaceholder = keyName;
        }
        else {
            if (this.settings.relationDepth > 0) {
                const suffix = segments.slice(1, this.settings.relationDepth);

                if (segments.length - suffix.length > 1) {
                    const postSuffix = segments.slice(suffix.length + 1);

                    for (let index = 0; index < postSuffix.length; index++) {
                        postSuffix[index] = convertCase(postSuffix[index], StringCase.Pascal);
                    }

                    suffix.push(convertCase(postSuffix.join(""), this.settings.columnCasing));
                }

                keyPlaceholder = suffix.length === 0 ? keyName : `${keyName}.${suffix.join(".")}`;
            }
            else {
                const suffix = segments.slice();
                for (let index = 0; index < suffix.length; index++) {
                    suffix[index] = convertCase(suffix[index], StringCase.Pascal);
                }

                columnName = keyPlaceholder = keyName = convertCase(suffix.join(""), this.settings.columnCasing);
            }
        }

        return {
            keyName: `#${keyName}`,
            keyPlaceholder: `#${keyPlaceholder}`,
            valueName: `:${valueName}`,
            columnName
        };
    }

    private applyLimit(): void {
        if (this.criteria.maxResultCount > 0) {
            this.query.Limit = this.criteria.maxResultCount;
        }
    }

    private applyOrder(): void {
        if (this.criteria.orderParameters.length > 0) {
            this.query.ScanIndexForward = this.criteria.orderParameters[0].order === CriteriaOrder.Ascending;
        }
    }

    private applyParameters(parameters: CriteriaWhere[], descriptor: EntityDescriptor, prefix?: string): void {
        const expressionResult = this.buildWhereParameters(parameters, descriptor, prefix);

        if (isString(expressionResult.filterExpression)) {
            if (!isString(this.query.FilterExpression)) {
                this.query.FilterExpression = expressionResult.filterExpression;
            }
            else {
                this.query.FilterExpression += ` AND (${expressionResult.filterExpression})`;
            }
        }

        if (isString(expressionResult.keyExpression)) {
            if (!isString(this.query.KeyConditionExpression)) {
                this.query.KeyConditionExpression = expressionResult.keyExpression;
            }
            else {
                this.query.KeyConditionExpression += ` AND (${expressionResult.keyExpression})`;
            }
        }
    }

    private buildWhereParameters(whereParameters: CriteriaWhere[], descriptor: EntityDescriptor, prefix: string): ExpressionResult {
        let filterExpression = "";
        let keyExpression = "";

        whereParameters.forEach(item => {
            let result: ExpressionResult;

            if (item instanceof CriteriaWhereValue) {
                result = this.applyWhereValue(item, descriptor, prefix);

            }
            else if (item instanceof CriteriaWhereGroup) {
                result = this.applyWhereGroup(item, descriptor, prefix);
            }

            if (!isNil(result)) {
                if (isString(result.filterExpression)) {
                    if (filterExpression.length > 0) {
                        filterExpression += ` ${DynamoQuery.getEvaluationExpression(item.evaluation)} `;
                    }

                    filterExpression += result.filterExpression;
                }

                if (isString(result.keyExpression)) {
                    if (keyExpression.length > 0) {
                        keyExpression += ` ${DynamoQuery.getEvaluationExpression(CriteriaEvaluation.Or)} `;
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

    private isPrimaryKey(parameter: CriteriaWhereValue): boolean {
        return this.descriptor.primaryKey.name === parameter.key;
    }

    private applyIndex(key: string, descriptor: EntityDescriptor): void {
        const column = descriptor.fromMap(key);

        if (column instanceof EntityColumnDescriptor && !isNil(column.indexName) && isNil(this.query.IndexName)) {
            this.query.IndexName = column.indexName;
        }
    }

    private applyWhereValue(parameter: CriteriaWhereValue, descriptor: EntityDescriptor, prefix: string): ExpressionResult {
        if (descriptor.fromMap(parameter.key).isExcluded(DatabaseType.DynamoDB)) {
            return;
        }

        let isPrimaryKey: boolean = this.isPrimaryKey(parameter);

        if (isString(prefix)) {
            try {
                this.applyIndex(prefix, this.descriptor);
                const prefixDescriptor = this.descriptor.fromMap(prefix);
                isPrimaryKey = prefixDescriptor.indexName === this.query.IndexName;
                this.generateQuery = true;
            }
            catch {
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

    private buildExpression(parameter: CriteriaWhereValue, prefix: string): string {
        if (!isObject(this.query.ExpressionAttributeNames)) {
            this.query.ExpressionAttributeNames = {};
        }

        if (!isObject(this.query.ExpressionAttributeValues)) {
            this.query.ExpressionAttributeValues = {};
        }

        const path = this.columnPath(parameter.key, prefix);
        const attribute = this.qualifyAttribute(path);

        if (isArray(parameter.value)) {
            for (let index = 0; index < parameter.value.length; index++) {
                if (parameter.value[index] instanceof Guid) {
                    parameter.value[index] = parameter.value[index].valueOf();
                }
            }
        }
        else if (parameter.value instanceof Guid) {
            parameter.value = parameter.value.valueOf();
        }

        switch (parameter.comparison) {
            case CriteriaComparison.Between:
            case CriteriaComparison.NotBetween:
                this.query.ExpressionAttributeNames[attribute.keyName] = attribute.columnName;

                this.query.ExpressionAttributeValues[`${attribute.valueName}BT1`] = parameter.value[0];
                this.query.ExpressionAttributeValues[`${attribute.valueName}BT2`] = parameter.value[1];
                break;
            case CriteriaComparison.Like:
            case CriteriaComparison.NotLike:
                let count = 0;
                for (const item of parameter.value.split("%")) {
                    if (isString(item) && item.length > 0) {
                        count++;
                        this.query.ExpressionAttributeNames[`${attribute.keyName}CF${count}`] = attribute.columnName;
                        this.query.ExpressionAttributeValues[`${attribute.valueName}CF${count}`] = item as any;
                    }
                }
                break;
            case CriteriaComparison.In:
            case CriteriaComparison.NotIn:
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

    private applyWhereGroup(parameter: CriteriaWhereGroup, descriptor: EntityDescriptor, prefix: string): ExpressionResult {
        const result = this.buildWhereParameters(parameter.whereParameters, descriptor, prefix);

        return {
            filterExpression: isString(result.filterExpression) ? `(${result.filterExpression})` : undefined,
            keyExpression: isString(result.keyExpression) ? result.keyExpression : undefined
        };
    }

    private applyJoins(parentDescriptor: EntityDescriptor, joinParameters: CriteriaJoinParameter[], classType: Constructable, prefix?: string) {
        joinParameters.forEach(join => {
            const relatedDescriptor = EntityDescriptor.get(join.criteria.classType);
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
