import { TypedConstructable } from "@elevated/objects/lib/types";
import { AlgoliaClient, AlgoliaIndex } from "algoliasearch";
import { isError } from "lodash";
import { DatabaseType } from "../configuration";
import { Criteria } from "../criteria";
import { DatabaseRepository, QueryOptions, SaveOptions } from "../repository";
import { factory } from "./client";

export class AlgoliaRepository<E, PK> extends DatabaseRepository<E, PK> {
    protected client: AlgoliaClient;
    protected index: AlgoliaIndex;

    constructor(classType: TypedConstructable<E>, connectionName?: string) {
        super(DatabaseType.Algolia, classType, connectionName);
        this.client = factory({ name: connectionName });
        this.index = this.client.initIndex(this.table);
    }

    public async exists(entity: E | PK, options?: QueryOptions): Promise<boolean> {
        return this.get(entity) instanceof this.descriptor.classType;
    }

    public async get(id: E | PK, options?: QueryOptions): Promise<E> {
        if (!this.primaryKeyHasValue(id)) {
            return undefined;
        }

        let document = undefined;

        this.index.getObject(String(this.getPrimaryKeyValue(id)), (error, content) => {
            if (isError(error)) {
                throw error;
            }

            document = content;
        });

        return this.convert(document);
    }

    public async query(criteria: Criteria, options?: QueryOptions): Promise<E[]> {
        return [];
    }

    protected getPrimaryKeyObject(entity: E | PK): object {
        return { objectID: this.getPrimaryKeyValue(entity) };
    }

    protected getValues(entity: E): object {
        const values = super.getValues(entity, false);
        values.objectID = this.getPrimaryKeyValue(entity);

        return values;
    }

    protected async update(entity: E, options?: SaveOptions): Promise<void> {
        if (SaveOptions.overwrite(options)) {
            await this.index.saveObject(this.getValues(entity));
        }
        else {
            await this.index.partialUpdateObject(this.getValues(entity));
        }
    }

    protected async insert(entity: E, options?: SaveOptions): Promise<void> {
        await this.index.addObject(this.getValues(entity));
    }
}
