import { EnumUtility } from "@elevated/objects/lib/enum/utility";
import { Guid } from "@elevated/objects/lib/guid";
import { convertCase } from "@elevated/objects/lib/string/casing";
import { TypedConstructable } from "@elevated/objects/lib/types";
import { isBoolean, isNil, isObject, isString } from "lodash";
import { ConnectionConfiguration, DatabaseConfiguration, DatabaseSettingsHelper, DatabaseType } from "./configuration";
import { Criteria } from "./criteria";
import { EntityColumnDataType, EntityDescriptor, TimestampEvent } from "./entity";
import { NotImplementedException } from "./exceptions";
import { DynamicObject } from "./types";
import { ObjectUtility } from "./utility/object";

export class QueryOptions {
    ignoreGenerator?: boolean;
    useMaster?: boolean;

    protected static hasOptions(options?: QueryOptions): boolean {
        return !isNil(options);
    }

    public static ignoreGenerator(options?: QueryOptions): boolean {
        return QueryOptions.hasOptions(options) && isBoolean(options.ignoreGenerator) && options.ignoreGenerator;
    }

    public static useMaster(options?: QueryOptions): boolean {
        return QueryOptions.hasOptions(options) && isBoolean(options.useMaster) && options.useMaster;
    }
}

export enum SaveOperation {
    Upsert,
    Insert,
    Update
}

export namespace SaveOperation {
    export function isValid(value: SaveOperation): boolean {
        return EnumUtility.isValid(value, SaveOperation);
    }
}

export class SaveOptions {
    overwrite?: boolean;
    operation?: SaveOperation;
    suppressException?: boolean;

    protected static hasOptions(options?: SaveOptions): boolean {
        return !isNil(options);
    }

    public static overwrite(options?: SaveOptions): boolean {
        return SaveOptions.hasOptions(options) && isBoolean(options.overwrite) && options.overwrite;
    }

    public static operation(operation: SaveOperation, options?: SaveOptions): boolean {
        return SaveOptions.hasOptions(options) && options.operation === operation;
    }

    public static suppressException(options?: SaveOptions): boolean {
        return SaveOptions.hasOptions(options) && options.suppressException === true;
    }
}

export interface SaveResult<E> {
    entity: E;
    operation: SaveOperation;
    successful: boolean;
    exception?: any;
}

export interface Repository {
    delete(entity, options?: SaveOptions): Promise<void>;
    exists(entity, options?: QueryOptions): Promise<boolean>;
    get(id, options?: QueryOptions): Promise<any>;
    query(criteria: Criteria, options?: QueryOptions): Promise<any[]>;
    save(entity, options?: SaveOptions): Promise<SaveResult<any>>;
    updateQuery(entity, criteria: Criteria, options?: SaveOptions): Promise<void>;
}

export interface GenericRepository<E, PK> extends Repository {
    delete(entity: E | PK, options?: SaveOptions): Promise<void>;
    exists(entity: E | PK, options?: QueryOptions): Promise<boolean>;
    get(id: E | PK, options?: QueryOptions): Promise<E>;
    query(criteria: Criteria, options?: QueryOptions): Promise<E[]>;
    save(entity: E, options?: SaveOptions): Promise<SaveResult<E>>;
    updateQuery(entity: E, criteria: Criteria, options?: SaveOptions): Promise<void>;
}

export abstract class DatabaseRepository<E, PK> implements GenericRepository<E, PK> {
    protected type: DatabaseType;
    protected descriptor: EntityDescriptor;
    protected configuration: ConnectionConfiguration;
    protected settings: DatabaseSettingsHelper;

    constructor(type: DatabaseType, classType: TypedConstructable<E>, connectionName?: string) {
        this.type = type;
        this.descriptor = EntityDescriptor.get(classType);

        connectionName = isString(connectionName)
            ? connectionName
            : this.descriptor.getConnectionName(this.type);

        this.configuration = DatabaseConfiguration.getConfiguration(this.type, connectionName);
        this.settings = new DatabaseSettingsHelper(this.configuration.settings);
    }

    public get table(): string {
        const schema = convertCase(this.descriptor.schema, this.settings.schemaCasing);
        const tableName = convertCase(this.descriptor.tableName, this.settings.tableCasing);

        return this.settings.useSchema ? `${schema}.${tableName}` : tableName;
    }

    public get primaryKey(): string {
        return this.descriptor.getPrimaryKeyName(this.settings.columnCasing);
    }

    public primaryKeyHasValue(entity: E | PK): boolean {
        return !isObject(entity) || entity instanceof Guid || !isNil(entity[this.primaryKey]);
    }

    public abstract async exists(entity: E | PK, options?: QueryOptions): Promise<boolean>;

    public abstract async get(id: E | PK, options?: QueryOptions): Promise<E>;

    public abstract async query(criteria: Criteria, options?: QueryOptions): Promise<E[]>;

    public async delete(entity: E | PK, options?: SaveOptions): Promise<void> {
        this.descriptor.updateTimestamps(entity, TimestampEvent.OnDelete, new Date());
    }

    public async save(entity: E, options?: SaveOptions): Promise<SaveResult<E>> {
        const now: Date = new Date();
        this.descriptor.updateTimestamps(entity, TimestampEvent.OnUpdate, now);

        const exists = SaveOptions.operation(SaveOperation.Update, options)
            || (!SaveOptions.operation(SaveOperation.Insert, options) && await this.exists(entity, { useMaster: true, ignoreGenerator: true }));

        const operation = exists ? SaveOperation.Update : SaveOperation.Insert;
        const result: SaveResult<E> = { entity, operation, successful: true };

        try {
            if (exists) {
                await this.update(entity, options);
            }
            else {
                this.descriptor.updateTimestamps(entity, TimestampEvent.OnCreate, now);
                await this.insert(entity, options);
            }
        }
        catch (ex) {
            if (!SaveOptions.suppressException(options)) {
                throw ex;
            }

            result.successful = false;
            result.exception = ex;
        }

        return result;
    }

    public async updateQuery(entity: E, criteria: Criteria, options?: SaveOptions): Promise<void> {
        const name = EnumUtility.getName(DatabaseType, this.type);
        throw new NotImplementedException(`Update query has not been implemented for database type (${name})`);
    }

    protected convert(source: object): E {
        if (isObject(source)) {
            if (this.settings.flattenObjects) {
                source = ObjectUtility.normalize(
                    source,
                    this.settings.flattenSeparator,
                    this.settings.flattenKeyStyle,
                    this.descriptor.getColumnNames(this.settings.columnCasing, EntityColumnDataType.Entity)
                );
            }

            return this.descriptor.apply<E, object>(
                new this.descriptor.classType(),
                source,
                this.descriptor.casing,
                this.settings.columnCasing,
                this.type
            );
        }

        return undefined;
    }

    protected getPrimaryKeyObject(entity: E | PK): object {
        return this.descriptor.getPrimaryKeyObject<E>(entity, this.settings.columnCasing);
    }

    protected getPrimaryKeyValue(entity: E | PK): PK {
        return entity instanceof this.descriptor.classType ? entity[this.primaryKey] : entity;
    }

    protected getValues(entity: E, withPrimaryKey = true): DynamicObject {
        let values = this.descriptor.getDatabaseObject(
            entity,
            this.settings.columnCasing,
            this.type,
            withPrimaryKey,
            !this.primaryKeyHasValue(entity),
            this.settings.relationDepth
        );

        if (this.settings.flattenObjects) {
            values = ObjectUtility.flatten(values, this.settings.flattenSeparator, this.settings.flattenKeyStyle);
        }

        return values;
    }

    protected abstract async update(entity: E, options?: SaveOptions): Promise<void>;

    protected abstract async insert(entity: E, options?: SaveOptions): Promise<void>;
}
