import { QueryBuilder } from "knex";
import { isNumber } from "lodash";
import { DatabaseSettingsHelper } from "../configuration";
import {
    Criteria,
    CriteriaComparison,
    CriteriaEvaluation,
    CriteriaJoin,
    CriteriaOrder,
    CriteriaOrderParameter,
    CriteriaWhere,
    CriteriaWhereGroup,
    CriteriaWhereValue
} from "../criteria";
import { EntityDescriptor } from "../entity";
import { Guid } from "@elevated/objects/lib/guid";
import { StringCase, convertCase } from "@elevated/objects/lib/string/casing";

export class SqlQuery {
    protected builder: QueryBuilder;
    protected criteria: Criteria;
    protected table: string;
    protected descriptor: EntityDescriptor;
    protected settings: DatabaseSettingsHelper;
    protected orderParameters: CriteriaOrderParameter[] = [];


    protected constructor(builder: QueryBuilder, criteria: Criteria, settings: DatabaseSettingsHelper) {
        this.builder = builder;
        this.criteria = criteria;
        this.descriptor = EntityDescriptor.get(criteria.classType);
        this.settings = settings;
        this.table = this.tableName(this.descriptor.schema, this.descriptor.tableName);

        this.addOrderParameters();
    }

    public static generate(builder: QueryBuilder, criteria: Criteria, settings: DatabaseSettingsHelper): QueryBuilder {
        return new SqlQuery(builder, criteria, settings).make();
    }

    protected static applyParameters(generator: SqlQuery, builder: QueryBuilder, whereParameters: CriteriaWhere[]): void {
        for (const parameter of whereParameters) {
            SqlQuery.buildParameter(generator, builder, parameter);
        }
    }

    protected static buildParameter(generator: SqlQuery, builder: QueryBuilder, parameter: CriteriaWhere): void {
        if (parameter instanceof CriteriaWhereValue) {
            SqlQuery.buildParameterValue(generator, builder, parameter);
        }
        else if (parameter instanceof CriteriaWhereGroup) {
            SqlQuery.buildParameterGroup(generator, builder, parameter);
        }
    }

    // -----------------------------------------------------------------------------------------------------------------

    protected static buildParameterValue(generator: SqlQuery, builder: QueryBuilder, parameter: CriteriaWhereValue): void {
        if (parameter.value instanceof Guid) {
            parameter.value = parameter.value.valueOf();
        }

        switch (parameter.comparison) {
            case CriteriaComparison.Between:
            case CriteriaComparison.NotBetween:
            case CriteriaComparison.In:
            case CriteriaComparison.NotIn:
                SqlQuery.buildNonStandardComparison(generator, builder, parameter);
                break;
            default:
                SqlQuery.buildStandardComparison(generator, builder, parameter);
        }
    }

    protected static buildStandardComparison(generator: SqlQuery, builder: QueryBuilder, parameter: CriteriaWhereValue): void {
        let operator: string;

        switch (parameter.comparison) {
            case CriteriaComparison.Equal:
                operator = "=";
                break;
            case CriteriaComparison.NotEqual:
                operator = "<>";
                break;
            case CriteriaComparison.GreaterThan:
                operator = ">";
                break;
            case CriteriaComparison.GreaterThanEqualTo:
                operator = ">=";
                break;
            case CriteriaComparison.LessThan:
                operator = "<";
                break;
            case CriteriaComparison.LessThanEqualTo:
                operator = "<=";
                break;
            case CriteriaComparison.Like:
                operator = "like";
                break;
            case CriteriaComparison.NotLike:
                operator = "not like";
                break;
        }

        builder.where(generator.qualify(generator.table, parameter.key), operator, parameter.value);
    }

    protected static buildNonStandardComparison(generator: SqlQuery, builder: QueryBuilder, parameter: CriteriaWhereValue): void {
        const key = generator.qualify(generator.table, parameter.key);

        switch (parameter.comparison) {
            case CriteriaComparison.Between:
                parameter.evaluation === CriteriaEvaluation.And
                    ? builder.whereBetween(key, parameter.value)
                    : builder.orWhereBetween(key, parameter.value);
                break;
            case CriteriaComparison.NotBetween:
                parameter.evaluation === CriteriaEvaluation.And
                    ? builder.whereNotBetween(key, parameter.value)
                    : builder.orWhereNotBetween(key, parameter.value);
                break;
            case CriteriaComparison.In:
                parameter.evaluation === CriteriaEvaluation.And
                    ? builder.whereIn(key, parameter.value)
                    : builder.orWhereIn(key, parameter.value);
                break;
            case CriteriaComparison.NotIn:
                parameter.evaluation === CriteriaEvaluation.And
                    ? builder.whereNotIn(key, parameter.value)
                    : builder.orWhereNotIn(key, parameter.value);
                break;
            default:
                throw new Error(`Unsupported parameter comparison: ${parameter.comparison}`);
        }
    }

    protected static buildParameterGroup(generator: SqlQuery, builder: QueryBuilder, parameter: CriteriaWhereGroup): void {
        const parameterGroup = function () {
            SqlQuery.applyParameters(generator, this, parameter.whereParameters);
        };

        parameter.evaluation === CriteriaEvaluation.And
            ? builder.where(parameterGroup)
            : builder.orWhere(parameterGroup);
    }

    // -----------------------------------------------------------------------------------------------------------------

    public make(root = true): QueryBuilder {
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

    protected tableName(schema: string, tableName: string): string {
        schema = convertCase(schema, this.settings.schemaCasing);
        tableName = convertCase(tableName, this.settings.tableCasing);

        return this.settings.useSchema ? `${schema}.${tableName}` : tableName;
    }

    protected qualify(table: string, name: string): string {
        name = name === "*" ? name : convertCase(name, this.settings.columnCasing);
        return `${table}.${name}`;
    }

    protected applyJoins(): void {
        for (const join of this.criteria.joinParameters) {
            const generator = new SqlQuery(this.builder, join.criteria, this.settings);

            const descriptor = EntityDescriptor.get(join.criteria.classType);
            let primaryKey = "", foreignKey = "";
            let matched = false;
            const joinTable: string = this.tableName(descriptor.schema, descriptor.tableName);

            const matchClassName = descriptor.classType.name.toLowerCase();

            for (const column of this.descriptor.columns) {
                const matchColumnName = column.name.toLowerCase();
                if (column.relatesTo === join.criteria.classType && matchColumnName === matchClassName) {
                    const columnName = convertCase(column.name, StringCase.Kebab);
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
                        const columnName = convertCase(column.name, StringCase.Kebab);
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
                case CriteriaJoin.Inner:
                    this.builder.innerJoin(joinTable, primaryKey, foreignKey);
                    break;
                case CriteriaJoin.Outer:
                    this.builder.outerJoin(joinTable, primaryKey, foreignKey);
                    break;
                case CriteriaJoin.Left:
                    this.builder.leftJoin(joinTable, primaryKey, foreignKey);
                    break;
                case CriteriaJoin.LeftOuter:
                    this.builder.leftOuterJoin(joinTable, primaryKey, foreignKey);
                    break;
                case CriteriaJoin.Right:
                    this.builder.rightJoin(joinTable, primaryKey, foreignKey);
                    break;
                case CriteriaJoin.RightOuter:
                    this.builder.rightOuterJoin(joinTable, primaryKey, foreignKey);
                    break;
                case CriteriaJoin.FullOuter:
                    this.builder.fullOuterJoin(joinTable, primaryKey, foreignKey);
                    break;
                case CriteriaJoin.Cross:
                    this.builder.crossJoin(joinTable, primaryKey, foreignKey);
                    break;
            }

            generator.make(false);
            this.orderParameters = this.orderParameters.concat(generator.orderParameters);
        }
    }

    protected addOrderParameters(): void {
        this.criteria.orderParameters.forEach(item => {
            this.orderParameters.push({
                key: this.qualify(this.table, item.key),
                order: item.order,
                precedence: item.precedence
            });
        });
    }

    protected applyOrdering(): void {
        this.orderParameters.sort((a, b) => {
            return a.precedence - b.precedence;
        });

        this.orderParameters.forEach(item => {
            this.builder.orderBy(item.key, item.order === CriteriaOrder.Ascending ? "ASC" : "DESC");
        });
    }

    // -----------------------------------------------------------------------------------------------------------------

    protected applyResultSet(): void {
        if (isNumber(this.criteria.maxResultCount) && this.criteria.maxResultCount > 0) {
            this.builder = this.builder.limit(this.criteria.maxResultCount);
        }

        if (isNumber(this.criteria.resultOffset) && this.criteria.resultOffset >= 0) {
            this.builder = this.builder.offset(this.criteria.resultOffset);
        }
    }
}
