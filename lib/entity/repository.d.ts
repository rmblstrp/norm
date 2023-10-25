import { Criteria } from "../criteria";
import { EntityDescriptor } from "../entity";
import { DatabaseRepository, QueryOptions, GenericRepository, SaveOptions, SaveResult } from "../repository";
import { TypedConstructable } from "@elevated/objects/lib/types";
export declare class EntityQueryOptions extends QueryOptions {
    cacheOnly?: boolean;
    sourceOnly?: boolean;
    static cacheOnly(options?: EntityQueryOptions): boolean;
    static sourceOnly(options?: EntityQueryOptions): boolean;
}
export declare class EntitySaveOptions extends SaveOptions {
    cacheOnly?: boolean;
    sourceOnly?: boolean;
    static cacheOnly(options?: EntitySaveOptions): boolean;
    static sourceOnly(options?: EntitySaveOptions): boolean;
}
export declare class EntityRepository<E, PK> implements GenericRepository<E, PK> {
    protected readonly classType: TypedConstructable<E>;
    protected readonly descriptor: EntityDescriptor;
    protected readonly source: DatabaseRepository<E, PK>;
    protected readonly cache: DatabaseRepository<E, PK>[];
    constructor(classType: TypedConstructable<E>);
    protected queryRepositories(options?: EntityQueryOptions): DatabaseRepository<E, PK>[];
    protected writeRepositories(options?: EntitySaveOptions): DatabaseRepository<E, PK>[];
    delete(entity: PK | E, options?: EntitySaveOptions): Promise<void>;
    exists(entity: PK | E, options?: EntityQueryOptions): Promise<boolean>;
    get(id: PK | E, options?: EntityQueryOptions): Promise<E>;
    query(criteria: Criteria, options?: EntityQueryOptions): Promise<E[]>;
    save(entity: E, options?: EntitySaveOptions): Promise<SaveResult<E>>;
    updateQuery(entity: E, criteria: Criteria, options?: EntitySaveOptions): Promise<void>;
}
