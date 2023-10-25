import { TypedConstructable } from "@elevated/objects/lib/types";
import { ConnectionConfiguration, DatabaseSettingsHelper, DatabaseType } from "./configuration";
import { Criteria } from "./criteria";
import { EntityDescriptor } from "./entity";
import { DynamicObject } from "./types";
export declare class QueryOptions {
    ignoreGenerator?: boolean;
    useMaster?: boolean;
    protected static hasOptions(options?: QueryOptions): boolean;
    static ignoreGenerator(options?: QueryOptions): boolean;
    static useMaster(options?: QueryOptions): boolean;
}
export declare enum SaveOperation {
    Upsert = 0,
    Insert = 1,
    Update = 2,
}
export declare namespace SaveOperation {
    function isValid(value: SaveOperation): boolean;
}
export declare class SaveOptions {
    overwrite?: boolean;
    operation?: SaveOperation;
    suppressException?: boolean;
    protected static hasOptions(options?: SaveOptions): boolean;
    static overwrite(options?: SaveOptions): boolean;
    static operation(operation: SaveOperation, options?: SaveOptions): boolean;
    static suppressException(options?: SaveOptions): boolean;
}
export interface SaveResult<E> {
    entity: E;
    operation: SaveOperation;
    successful: boolean;
    exception?: any;
}
export interface Repository {
    delete(entity: any, options?: SaveOptions): Promise<void>;
    exists(entity: any, options?: QueryOptions): Promise<boolean>;
    get(id: any, options?: QueryOptions): Promise<any>;
    query(criteria: Criteria, options?: QueryOptions): Promise<any[]>;
    save(entity: any, options?: SaveOptions): Promise<SaveResult<any>>;
    updateQuery(entity: any, criteria: Criteria, options?: SaveOptions): Promise<void>;
}
export interface GenericRepository<E, PK> extends Repository {
    delete(entity: E | PK, options?: SaveOptions): Promise<void>;
    exists(entity: E | PK, options?: QueryOptions): Promise<boolean>;
    get(id: E | PK, options?: QueryOptions): Promise<E>;
    query(criteria: Criteria, options?: QueryOptions): Promise<E[]>;
    save(entity: E, options?: SaveOptions): Promise<SaveResult<E>>;
    updateQuery(entity: E, criteria: Criteria, options?: SaveOptions): Promise<void>;
}
export declare abstract class DatabaseRepository<E, PK> implements GenericRepository<E, PK> {
    protected type: DatabaseType;
    protected descriptor: EntityDescriptor;
    protected configuration: ConnectionConfiguration;
    protected settings: DatabaseSettingsHelper;
    constructor(type: DatabaseType, classType: TypedConstructable<E>, connectionName?: string);
    readonly table: string;
    readonly primaryKey: string;
    primaryKeyHasValue(entity: E | PK): boolean;
    abstract exists(entity: E | PK, options?: QueryOptions): Promise<boolean>;
    abstract get(id: E | PK, options?: QueryOptions): Promise<E>;
    abstract query(criteria: Criteria, options?: QueryOptions): Promise<E[]>;
    delete(entity: E | PK, options?: SaveOptions): Promise<void>;
    save(entity: E, options?: SaveOptions): Promise<SaveResult<E>>;
    updateQuery(entity: E, criteria: Criteria, options?: SaveOptions): Promise<void>;
    protected convert(source: object): E;
    protected getPrimaryKeyObject(entity: E | PK): object;
    protected getPrimaryKeyValue(entity: E | PK): PK;
    protected getValues(entity: E, withPrimaryKey?: boolean): DynamicObject;
    protected abstract update(entity: E, options?: SaveOptions): Promise<void>;
    protected abstract insert(entity: E, options?: SaveOptions): Promise<void>;
}
