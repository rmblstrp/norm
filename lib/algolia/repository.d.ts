import { TypedConstructable } from "@elevated/objects/lib/types";
import { AlgoliaClient, AlgoliaIndex } from "algoliasearch";
import { Criteria } from "../criteria";
import { DatabaseRepository, QueryOptions, SaveOptions } from "../repository";
export declare class AlgoliaRepository<E, PK> extends DatabaseRepository<E, PK> {
    protected client: AlgoliaClient;
    protected index: AlgoliaIndex;
    constructor(classType: TypedConstructable<E>, connectionName?: string);
    exists(entity: E | PK, options?: QueryOptions): Promise<boolean>;
    get(id: E | PK, options?: QueryOptions): Promise<E>;
    query(criteria: Criteria, options?: QueryOptions): Promise<E[]>;
    protected getPrimaryKeyObject(entity: E | PK): object;
    protected getValues(entity: E): object;
    protected update(entity: E, options?: SaveOptions): Promise<void>;
    protected insert(entity: E, options?: SaveOptions): Promise<void>;
}
