import { isBoolean } from "lodash";
import { DatabaseType } from "../configuration";
import { Criteria } from "../criteria";
import { EntityDescriptor } from "../entity";
import { RepositoryFactory } from "../factory";
import { DatabaseRepository, QueryOptions, GenericRepository, SaveOperation, SaveOptions, SaveResult } from "../repository";
import { TypedConstructable } from "@elevated/objects/lib/types";

export class EntityQueryOptions extends QueryOptions {
    cacheOnly?: boolean;
    sourceOnly?: boolean;

    public static cacheOnly(options?: EntityQueryOptions): boolean {
        return EntityQueryOptions.hasOptions(options) && isBoolean(options.cacheOnly) && options.cacheOnly;
    }

    public static sourceOnly(options?: EntityQueryOptions): boolean {
        return EntityQueryOptions.hasOptions(options) && isBoolean(options.sourceOnly) && options.sourceOnly;
    }
}

export class EntitySaveOptions extends SaveOptions {
    cacheOnly?: boolean;
    sourceOnly?: boolean;

    public static cacheOnly(options?: EntitySaveOptions): boolean {
        return EntitySaveOptions.hasOptions(options) && isBoolean(options.cacheOnly) && options.cacheOnly;
    }

    public static sourceOnly(options?: EntitySaveOptions): boolean {
        return EntitySaveOptions.hasOptions(options) && isBoolean(options.sourceOnly) && options.sourceOnly;
    }
}

export class EntityRepository<E, PK> implements GenericRepository<E, PK> {
    protected readonly classType: TypedConstructable<E>;
    protected readonly descriptor: EntityDescriptor;
    protected readonly source: DatabaseRepository<E, PK>;
    protected readonly cache: DatabaseRepository<E, PK>[];

    constructor(classType: TypedConstructable<E>) {
        this.classType = classType;
        this.descriptor = EntityDescriptor.get(this.classType);

        if ((DatabaseType.Supported & this.descriptor.source) === 0) {
            throw new Error("A supported database type must be specified before EntityRepository can be used");
        }

        this.source = RepositoryFactory.get<E, PK>(this.descriptor.source, classType);

        this.cache = [];
        for (const database of this.descriptor.cache) {
            this.cache.push(RepositoryFactory.get<E, PK>(database, classType));
        }
    }

    protected queryRepositories(options?: EntityQueryOptions): DatabaseRepository<E, PK>[] {
        let repositories: DatabaseRepository<E, PK>[] = [];

        if (!EntitySaveOptions.sourceOnly(options)) {
            repositories = repositories.concat(this.cache);
        }

        if (!EntitySaveOptions.cacheOnly(options)) {
            repositories.push(this.source);
        }

        return repositories;
    }

    protected writeRepositories(options?: EntitySaveOptions): DatabaseRepository<E, PK>[] {
        let repositories: DatabaseRepository<E, PK>[] = [];

        if (!EntitySaveOptions.cacheOnly(options)) {
            repositories.push(this.source);
        }

        if (!EntitySaveOptions.sourceOnly(options)) {
            repositories = repositories.concat(this.cache);
        }

        return repositories;
    }

    public async delete(entity: PK | E, options?: EntitySaveOptions): Promise<void> {
        for (const repository of this.writeRepositories(options)) {
            await repository.delete(entity);
        }
    }

    public async exists(entity: PK | E, options?: EntityQueryOptions): Promise<boolean> {
        for (const repository of this.queryRepositories(options)) {
            if (await repository.exists(entity, options)) {
                return true;
            }
        }

        return false;
    }

    public async get(id: PK | E, options?: EntityQueryOptions): Promise<E> {
        for (const repository of this.queryRepositories(options)) {
            const entity = await repository.get(id, options);

            if (entity !== null) {
                return entity;
            }
        }

        return undefined;
    }

    public async query(criteria: Criteria, options?: EntityQueryOptions): Promise<E[]> {
        for (const repository of this.queryRepositories(options)) {
            const results = await repository.query(criteria, options);

            if (results.length > 0) {
                return results;
            }
        }

        return [];
    }

    public async save(entity: E, options?: EntitySaveOptions): Promise<SaveResult<E>> {
        const sourceOptions: SaveOptions = { ...options } as SaveOptions;
        if (!SaveOperation.isValid(sourceOptions.operation)) {
            sourceOptions.operation = SaveOperation.Upsert;
        }

        let result: SaveResult<E> = EntitySaveOptions.cacheOnly(sourceOptions)
            ? { entity, operation: sourceOptions.operation, successful: false }
            : await this.source.save(entity, options);

        if (!EntitySaveOptions.sourceOnly(options)) {
            const cacheOptions: SaveOptions = { ...options } as SaveOptions;
            if (!isBoolean(cacheOptions.suppressException)) {
                cacheOptions.suppressException = true;
            }

            cacheOptions.operation = result.operation;

            for (const repository of this.cache) {
                result = await repository.save(entity, cacheOptions);

                if (!result.successful && sourceOptions.operation === SaveOperation.Upsert) {
                    const operation = result.operation === SaveOperation.Insert
                        ? SaveOperation.Update
                        : SaveOperation.Insert;

                    const recoveryOptions: SaveOptions = { ...options, ...{ operation } } as SaveOptions;
                    result = await repository.save(entity, recoveryOptions);
                }
            }
        }

        return result;
    }

    public async updateQuery(entity: E, criteria: Criteria, options?: EntitySaveOptions): Promise<void> {
        for (const repository of this.writeRepositories(options)) {
            await repository.updateQuery(entity, criteria, options);
        }
    }
}
