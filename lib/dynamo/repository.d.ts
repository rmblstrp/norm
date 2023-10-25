import { TypedConstructable } from "@elevated/objects/lib/types";
import * as DynamoDB from "aws-sdk/clients/dynamodb";
import { Criteria } from "../criteria";
import { DatabaseRepository, QueryOptions, SaveOptions, SaveResult } from "../repository";
export declare class DynamoRepository<E, PK> extends DatabaseRepository<E, PK> {
    protected client: DynamoDB.DocumentClient;
    constructor(classType: TypedConstructable<E>, connectionName?: string);
    delete(entity: E | PK, options?: SaveOptions): Promise<void>;
    exists(entity: E | PK, options?: QueryOptions): Promise<boolean>;
    get(id: E | PK, options?: QueryOptions): Promise<E>;
    query(criteria: Criteria, options?: QueryOptions): Promise<E[]>;
    protected convert(source: object): E;
    protected getPrimaryKeyQuery(entity: E | PK): object;
    protected getValues(entity: E, withPrimaryKey?: boolean): object;
    protected executeGetItem(query: DynamoDB.GetItemInput): Promise<object>;
    save(entity: E, options?: SaveOptions): Promise<SaveResult<E>>;
    protected update(entity: E, options?: SaveOptions): Promise<void>;
    protected insert(entity: E, options?: SaveOptions): Promise<void>;
}
