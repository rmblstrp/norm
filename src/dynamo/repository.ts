import { TypedConstructable } from "@elevated/objects/lib/types";
import * as DynamoDB from "aws-sdk/clients/dynamodb";
import { isNil, isObject, isString, isUndefined } from "lodash";
import { DatabaseType } from "../configuration";
import { Criteria } from "../criteria";
import { EntityKeyGenerator } from "../entity";
import { DatabaseRepository, QueryOptions, SaveOptions, SaveResult } from "../repository";
import { factory } from "./client";
import { DynamoQuery } from "./query";

export class DynamoRepository<E, PK> extends DatabaseRepository<E, PK> {
    protected client: DynamoDB.DocumentClient;

    constructor(classType: TypedConstructable<E>, connectionName?: string) {
        super(DatabaseType.DynamoDB, classType, connectionName);
        this.client = factory({ name: connectionName });
    }

    public async delete(entity: E | PK, options?: SaveOptions): Promise<void> {
        const parameters = this.getPrimaryKeyQuery(entity) as DynamoDB.DeleteItemInput;
        await this.client.delete(parameters).promise();
    }

    public async exists(entity: E | PK, options?: QueryOptions): Promise<boolean> {
        if (!this.primaryKeyHasValue(entity)) {
            return false;
        }

        const query = this.getPrimaryKeyQuery(entity) as DynamoDB.GetItemInput;
        query.ProjectionExpression = this.primaryKey;

        const result = await this.executeGetItem(query);
        return !isNil(result);
    }

    public async get(id: E | PK, options?: QueryOptions): Promise<E> {
        if (!this.primaryKeyHasValue(id)) {
            return undefined;
        }

        const query = this.getPrimaryKeyQuery(id) as DynamoDB.GetItemInput;
        return this.convert(await this.executeGetItem(query));
    }

    public async query(criteria: Criteria, options?: QueryOptions): Promise<E[]> {
        const query = DynamoQuery.generate(criteria, this.settings);
        const executeQuery = isString(query.KeyConditionExpression) && query.KeyConditionExpression.length > 0;
        const result = await (executeQuery ? this.client.query(query) : this.client.scan(query)).promise();
        const items: E[] = [];

        if (result.Count > 0) {
            for (const document of result.Items) {
                items.push(this.convert(document));
            }
        }

        return items;
    }

    protected convert(source: object): E {
        if (isObject(source)) {
            for (const property of Object.getOwnPropertyNames(source)) {
                const converted = DynamoDB.Converter.output(source[property]);
                source[property] = isUndefined(converted) ? source[property] : converted;
            }
        }

        return super.convert(source);
    }

    protected getPrimaryKeyQuery(entity: E | PK): object {
        return {
            TableName: this.table,
            Key: this.getPrimaryKeyObject(entity)
        };
    }

    protected getValues(entity: E, withPrimaryKey = true): object {
        const values = super.getValues(entity, withPrimaryKey);

        if (this.descriptor.primaryKey.generator !== EntityKeyGenerator.Guid && Object.keys(this.getPrimaryKeyObject(entity)).length === 0) {
            throw new Error("DynamoDB requires a primary key value to have already been set so it can be saved");
        }

        for (const key of Object.keys(values)) {
            if (values[key] instanceof Date) {
                values[key] = values[key].toISOString();
            }
        }

        return values;
    }

    protected async executeGetItem(query: DynamoDB.GetItemInput): Promise<object> {
        const result = (await this.client.get(query).promise()) as DynamoDB.GetItemOutput;
        return result.Item;
    }

    public async save(entity: E, options?: SaveOptions): Promise<SaveResult<E>> {
        options = { ...options };

        return super.save(entity, options);
    }

    protected async update(entity: E, options?: SaveOptions): Promise<void> {
        const parameters = this.getPrimaryKeyQuery(entity) as DynamoDB.UpdateItemInput;
        parameters.ExpressionAttributeNames = {};
        parameters.ExpressionAttributeValues = {};

        const item = this.getValues(entity, false);
        const statement: string[] = [];

        for (const key of Object.keys(item)) {
            const namedKey = `#${key}`;
            const namedValue = `:${key}`;
            statement.push(`${namedKey} = ${namedValue}`);
            parameters.ExpressionAttributeNames[namedKey] = key;
            parameters.ExpressionAttributeValues[namedValue] = item[key];
        }

        parameters.UpdateExpression = `SET ${statement.join(", ")}`;
        await this.client.update(parameters).promise();
    }

    protected async insert(entity: E, options?: SaveOptions): Promise<void> {
        const parameters = {
            TableName: this.table,
            Item: this.getValues(entity)
        } as DynamoDB.PutItemInput;

        await this.client.put(parameters).promise();
    }
}
