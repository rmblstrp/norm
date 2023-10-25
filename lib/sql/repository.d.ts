import { TypedConstructable } from "@elevated/objects/lib/types";
import * as Knex from "knex";
import { DatabaseType } from "../configuration";
import { Criteria } from "../criteria";
import { DatabaseRepository, QueryOptions, SaveOptions } from "../repository";
export declare abstract class SqlRepository<E, PK> extends DatabaseRepository<E, PK> {
    protected writeBuilder: Knex;
    protected readBuilder: Knex;
    constructor(database: DatabaseType, classType: TypedConstructable<E>, connectionName?: string);
    exists(entity: E | PK, options?: QueryOptions): Promise<boolean>;
    delete(entity: E | PK, options?: SaveOptions): Promise<void>;
    get(id: E | PK, options?: QueryOptions): Promise<E>;
    query(criteria: Criteria, options?: QueryOptions): Promise<E[]>;
    updateQuery(entity: E, criteria: Criteria, options?: SaveOptions): Promise<void>;
    protected insert(entity: E, options?: SaveOptions): Promise<void>;
    protected update(entity: E, options?: SaveOptions): Promise<void>;
    protected getBuilder(options?: QueryOptions): Knex;
    protected getPrimaryKeyQuery(builder: Knex, entity: E | PK): Knex.QueryBuilder;
}
export declare class MysqlRepository<E, PK> extends SqlRepository<E, PK> {
    constructor(classType: TypedConstructable<E>, connectionName?: string);
}
export declare class PostgresRepository<E, PK> extends SqlRepository<E, PK> {
    constructor(classType: TypedConstructable<E>, connectionName?: string);
}
