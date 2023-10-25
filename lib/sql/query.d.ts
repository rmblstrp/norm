import { QueryBuilder } from "knex";
import { DatabaseSettingsHelper } from "../configuration";
import { Criteria, CriteriaOrderParameter, CriteriaWhere, CriteriaWhereGroup, CriteriaWhereValue } from "../criteria";
import { EntityDescriptor } from "../entity";
export declare class SqlQuery {
    protected builder: QueryBuilder;
    protected criteria: Criteria;
    protected table: string;
    protected descriptor: EntityDescriptor;
    protected settings: DatabaseSettingsHelper;
    protected orderParameters: CriteriaOrderParameter[];
    protected constructor(builder: QueryBuilder, criteria: Criteria, settings: DatabaseSettingsHelper);
    static generate(builder: QueryBuilder, criteria: Criteria, settings: DatabaseSettingsHelper): QueryBuilder;
    protected static applyParameters(generator: SqlQuery, builder: QueryBuilder, whereParameters: CriteriaWhere[]): void;
    protected static buildParameter(generator: SqlQuery, builder: QueryBuilder, parameter: CriteriaWhere): void;
    protected static buildParameterValue(generator: SqlQuery, builder: QueryBuilder, parameter: CriteriaWhereValue): void;
    protected static buildStandardComparison(generator: SqlQuery, builder: QueryBuilder, parameter: CriteriaWhereValue): void;
    protected static buildNonStandardComparison(generator: SqlQuery, builder: QueryBuilder, parameter: CriteriaWhereValue): void;
    protected static buildParameterGroup(generator: SqlQuery, builder: QueryBuilder, parameter: CriteriaWhereGroup): void;
    make(root?: boolean): QueryBuilder;
    protected tableName(schema: string, tableName: string): string;
    protected qualify(table: string, name: string): string;
    protected applyJoins(): void;
    protected addOrderParameters(): void;
    protected applyOrdering(): void;
    protected applyResultSet(): void;
}
