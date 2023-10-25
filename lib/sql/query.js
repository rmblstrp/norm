"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const criteria_1 = require("../criteria");
const entity_1 = require("../entity");
const guid_1 = require("@elevated/objects/lib/guid");
const casing_1 = require("@elevated/objects/lib/string/casing");
class SqlQuery {
    constructor(builder, criteria, settings) {
        this.orderParameters = [];
        this.builder = builder;
        this.criteria = criteria;
        this.descriptor = entity_1.EntityDescriptor.get(criteria.classType);
        this.settings = settings;
        this.table = this.tableName(this.descriptor.schema, this.descriptor.tableName);
        this.addOrderParameters();
    }
    static generate(builder, criteria, settings) {
        return new SqlQuery(builder, criteria, settings).make();
    }
    static applyParameters(generator, builder, whereParameters) {
        for (const parameter of whereParameters) {
            SqlQuery.buildParameter(generator, builder, parameter);
        }
    }
    static buildParameter(generator, builder, parameter) {
        if (parameter instanceof criteria_1.CriteriaWhereValue) {
            SqlQuery.buildParameterValue(generator, builder, parameter);
        }
        else if (parameter instanceof criteria_1.CriteriaWhereGroup) {
            SqlQuery.buildParameterGroup(generator, builder, parameter);
        }
    }
    static buildParameterValue(generator, builder, parameter) {
        if (parameter.value instanceof guid_1.Guid) {
            parameter.value = parameter.value.valueOf();
        }
        switch (parameter.comparison) {
            case criteria_1.CriteriaComparison.Between:
            case criteria_1.CriteriaComparison.NotBetween:
            case criteria_1.CriteriaComparison.In:
            case criteria_1.CriteriaComparison.NotIn:
                SqlQuery.buildNonStandardComparison(generator, builder, parameter);
                break;
            default:
                SqlQuery.buildStandardComparison(generator, builder, parameter);
        }
    }
    static buildStandardComparison(generator, builder, parameter) {
        let operator;
        switch (parameter.comparison) {
            case criteria_1.CriteriaComparison.Equal:
                operator = "=";
                break;
            case criteria_1.CriteriaComparison.NotEqual:
                operator = "<>";
                break;
            case criteria_1.CriteriaComparison.GreaterThan:
                operator = ">";
                break;
            case criteria_1.CriteriaComparison.GreaterThanEqualTo:
                operator = ">=";
                break;
            case criteria_1.CriteriaComparison.LessThan:
                operator = "<";
                break;
            case criteria_1.CriteriaComparison.LessThanEqualTo:
                operator = "<=";
                break;
            case criteria_1.CriteriaComparison.Like:
                operator = "like";
                break;
            case criteria_1.CriteriaComparison.NotLike:
                operator = "not like";
                break;
        }
        builder.where(generator.qualify(generator.table, parameter.key), operator, parameter.value);
    }
    static buildNonStandardComparison(generator, builder, parameter) {
        const key = generator.qualify(generator.table, parameter.key);
        switch (parameter.comparison) {
            case criteria_1.CriteriaComparison.Between:
                parameter.evaluation === criteria_1.CriteriaEvaluation.And
                    ? builder.whereBetween(key, parameter.value)
                    : builder.orWhereBetween(key, parameter.value);
                break;
            case criteria_1.CriteriaComparison.NotBetween:
                parameter.evaluation === criteria_1.CriteriaEvaluation.And
                    ? builder.whereNotBetween(key, parameter.value)
                    : builder.orWhereNotBetween(key, parameter.value);
                break;
            case criteria_1.CriteriaComparison.In:
                parameter.evaluation === criteria_1.CriteriaEvaluation.And
                    ? builder.whereIn(key, parameter.value)
                    : builder.orWhereIn(key, parameter.value);
                break;
            case criteria_1.CriteriaComparison.NotIn:
                parameter.evaluation === criteria_1.CriteriaEvaluation.And
                    ? builder.whereNotIn(key, parameter.value)
                    : builder.orWhereNotIn(key, parameter.value);
                break;
            default:
                throw new Error(`Unsupported parameter comparison: ${parameter.comparison}`);
        }
    }
    static buildParameterGroup(generator, builder, parameter) {
        const parameterGroup = function () {
            SqlQuery.applyParameters(generator, this, parameter.whereParameters);
        };
        parameter.evaluation === criteria_1.CriteriaEvaluation.And
            ? builder.where(parameterGroup)
            : builder.orWhere(parameterGroup);
    }
    make(root = true) {
        SqlQuery.applyParameters(this, this.builder, this.criteria.whereParameters);
        this.applyJoins();
        if (root) {
            this.applyOrdering();
            this.applyResultSet();
        }
        if (root) {
            this.builder.select(this.qualify(this.table, "*"));
        }
        return this.builder;
    }
    tableName(schema, tableName) {
        schema = casing_1.convertCase(schema, this.settings.schemaCasing);
        tableName = casing_1.convertCase(tableName, this.settings.tableCasing);
        return this.settings.useSchema ? `${schema}.${tableName}` : tableName;
    }
    qualify(table, name) {
        name = name === "*" ? name : casing_1.convertCase(name, this.settings.columnCasing);
        return `${table}.${name}`;
    }
    applyJoins() {
        for (const join of this.criteria.joinParameters) {
            const generator = new SqlQuery(this.builder, join.criteria, this.settings);
            const descriptor = entity_1.EntityDescriptor.get(join.criteria.classType);
            let primaryKey = "", foreignKey = "";
            let matched = false;
            const joinTable = this.tableName(descriptor.schema, descriptor.tableName);
            const matchClassName = descriptor.classType.name.toLowerCase();
            for (const column of this.descriptor.columns) {
                const matchColumnName = column.name.toLowerCase();
                if (column.relatesTo === join.criteria.classType && matchColumnName === matchClassName) {
                    const columnName = casing_1.convertCase(column.name, casing_1.StringCase.Kebab);
                    foreignKey = this.qualify(this.table, `${columnName}-${descriptor.primaryKey.name}`);
                    primaryKey = this.qualify(joinTable, descriptor.primaryKey.name);
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                for (const column of descriptor.columns) {
                    const matchColumnName = column.name.toLowerCase();
                    if (column.relatesTo === this.criteria.classType && matchColumnName === matchClassName) {
                        const columnName = casing_1.convertCase(column.name, casing_1.StringCase.Kebab);
                        primaryKey = this.qualify(this.table, this.descriptor.primaryKey.name);
                        foreignKey = this.qualify(joinTable, `${columnName}-${this.descriptor.primaryKey.name}`);
                        matched = true;
                        break;
                    }
                }
            }
            if (!matched) {
                throw new Error("The entity classes for this join do not have a specified relation");
            }
            switch (join.type) {
                case criteria_1.CriteriaJoin.Inner:
                    this.builder.innerJoin(joinTable, primaryKey, foreignKey);
                    break;
                case criteria_1.CriteriaJoin.Outer:
                    this.builder.outerJoin(joinTable, primaryKey, foreignKey);
                    break;
                case criteria_1.CriteriaJoin.Left:
                    this.builder.leftJoin(joinTable, primaryKey, foreignKey);
                    break;
                case criteria_1.CriteriaJoin.LeftOuter:
                    this.builder.leftOuterJoin(joinTable, primaryKey, foreignKey);
                    break;
                case criteria_1.CriteriaJoin.Right:
                    this.builder.rightJoin(joinTable, primaryKey, foreignKey);
                    break;
                case criteria_1.CriteriaJoin.RightOuter:
                    this.builder.rightOuterJoin(joinTable, primaryKey, foreignKey);
                    break;
                case criteria_1.CriteriaJoin.FullOuter:
                    this.builder.fullOuterJoin(joinTable, primaryKey, foreignKey);
                    break;
                case criteria_1.CriteriaJoin.Cross:
                    this.builder.crossJoin(joinTable, primaryKey, foreignKey);
                    break;
            }
            generator.make(false);
            this.orderParameters = this.orderParameters.concat(generator.orderParameters);
        }
    }
    addOrderParameters() {
        this.criteria.orderParameters.forEach(item => {
            this.orderParameters.push({
                key: this.qualify(this.table, item.key),
                order: item.order,
                precedence: item.precedence
            });
        });
    }
    applyOrdering() {
        this.orderParameters.sort((a, b) => {
            return a.precedence - b.precedence;
        });
        this.orderParameters.forEach(item => {
            this.builder.orderBy(item.key, item.order === criteria_1.CriteriaOrder.Ascending ? "ASC" : "DESC");
        });
    }
    applyResultSet() {
        if (lodash_1.isNumber(this.criteria.maxResultCount) && this.criteria.maxResultCount > 0) {
            this.builder = this.builder.limit(this.criteria.maxResultCount);
        }
        if (lodash_1.isNumber(this.criteria.resultOffset) && this.criteria.resultOffset >= 0) {
            this.builder = this.builder.offset(this.criteria.resultOffset);
        }
    }
}
exports.SqlQuery = SqlQuery;
