import { Guid } from "@elevated/objects/lib/guid";
import { convertCase, StringCase } from "@elevated/objects/lib/string/casing";
import { Constructable } from "@elevated/objects/lib/types";
import { isNil, isObject, isString, isUndefined } from "lodash";
import "reflect-metadata";
import { DatabaseType } from "./configuration";
import { ObjectUtility } from "./utility/object";

export enum TimestampEvent {
    OnCreate,
    OnUpdate,
    OnDelete,
}

export class EntityDescriptor {
    public static readonly metadataKey = "entity";

    public parent: EntityDescriptor;
    public classType: Constructable;
    public schema: string;
    public tableName: string;
    public isEntity = false;
    public primaryKey: EntityColumnDescriptor;
    public columns: EntityColumnDescriptor[] = [];
    public map: object = {};
    public timestamps: EntityColumnDescriptor[][] = [];
    public source: DatabaseType = DatabaseType.Unspecified;
    public cache: DatabaseType[] = [];
    public casing: StringCase = StringCase.Camel;
    public connectionNameMap: string[] = [];

    constructor() {
        this.timestamps[TimestampEvent.OnCreate] = [];
        this.timestamps[TimestampEvent.OnUpdate] = [];
        this.timestamps[TimestampEvent.OnDelete] = [];
    }

    /**
     * Gets the descriptor information for an entity class
     *
     * @param target
     * @returns {EntityDescriptor}
     */
    public static get(target: any): EntityDescriptor {
        return Reflect.getOwnMetadata(EntityDescriptor.metadataKey, ObjectUtility.getPrototype(target));
    }

    public static ensure(target: any): EntityDescriptor {
        const targetPrototype = ObjectUtility.getPrototype(target);
        let descriptor = EntityDescriptor.get(targetPrototype);

        if (!(descriptor instanceof EntityDescriptor)) {
            descriptor = new EntityDescriptor();
            descriptor.classType = targetPrototype.constructor;

            const parentDescriptor = Reflect.getMetadata(EntityDescriptor.metadataKey, targetPrototype);
            if (parentDescriptor instanceof EntityDescriptor) {
                if (!parentDescriptor.isEntity) {
                    throw new Error("Parent entity has not been marked with @entity or it has not finished building");
                }

                descriptor.parent = parentDescriptor;
                descriptor.schema = parentDescriptor.schema;
                descriptor.primaryKey = Object.assign(new EntityColumnDescriptor(), parentDescriptor.primaryKey);
                descriptor.addToMap(descriptor.primaryKey);
                descriptor.casing = parentDescriptor.casing;
                descriptor.connectionNameMap = parentDescriptor.connectionNameMap.slice();

                for (const parentColumn of parentDescriptor.columns) {
                    const column = Object.assign(new EntityColumnDescriptor(), parentColumn);
                    descriptor.columns.push(column);
                    descriptor.addToMap(column);
                }

                for (const parentColumn of parentDescriptor.timestamps[TimestampEvent.OnCreate]) {
                    const column = Object.assign(new EntityColumnDescriptor(), parentColumn);
                    descriptor.timestamps[TimestampEvent.OnCreate].push(column);
                    descriptor.addToMap(column);
                }

                for (const parentColumn of parentDescriptor.timestamps[TimestampEvent.OnUpdate]) {
                    const column = Object.assign(new EntityColumnDescriptor(), parentColumn);
                    descriptor.timestamps[TimestampEvent.OnUpdate].push(column);
                    descriptor.addToMap(column);
                }

                for (const parentColumn of parentDescriptor.timestamps[TimestampEvent.OnDelete]) {
                    const column = Object.assign(new EntityColumnDescriptor(), parentColumn);
                    descriptor.timestamps[TimestampEvent.OnDelete].push(column);
                    descriptor.addToMap(column);
                }
            }

            Reflect.defineMetadata(EntityDescriptor.metadataKey, descriptor, targetPrototype);
        }

        return descriptor;
    }

    public static hasDescriptor(target: any): boolean {
        return EntityDescriptor.get(target) instanceof EntityDescriptor;
    }

    public static isEntity(target: any): boolean {
        return EntityDescriptor.hasDescriptor(target) && EntityDescriptor.get(target).isEntity;
    }

    public addToMap(column: EntityColumnDescriptor): void {
        this.map[column.name.toLowerCase()] = column;
    }

    public getConnectionName(database: DatabaseType): string {
        let name: string;

        if (isNil(this.connectionNameMap[database])) {
            name = isNil(this.connectionNameMap[DatabaseType.Unspecified])
                ? undefined
                : this.connectionNameMap[DatabaseType.Unspecified];
        }
        else {
            name = this.connectionNameMap[database];
        }

        return name;
    }

    public setConnectionName(name: string, database: DatabaseType): void {
        this.connectionNameMap[database] = name;
    }

    public fromMap(name: string): EntityColumnDescriptor {
        name = name.toLowerCase();

        if (!this.map.hasOwnProperty(name)) {
            throw new Error(`Missing descriptor for column: ${name}`);
        }

        return this.map[name] as EntityColumnDescriptor;
    }

    public getColumnNames(casing?: StringCase, ...exclude: EntityColumnDataType[]): string[] {
        const names: string[] = [];

        for (const column of this.columns) {
            if (exclude.indexOf(column.type) < 0) {
                names.push(convertCase(column.name, casing));
            }
        }

        return names;
    }

    /**
     * Apply the source object values to an entity instance
     *
     * @param {Object} target
     * @param {Object} source
     * @param {StringCase} targetCasing
     * @param {StringCase} sourceCasing
     * @param {DatabaseType} database
     * @param {number} relationDepth
     */
    public apply<T, S>(target: T, source: S, targetCasing?: StringCase, sourceCasing?: StringCase,
                       database: DatabaseType = DatabaseType.Unspecified, relationDepth?: number): T {
        if (this.primaryKey) {
            this.applyValue(this.primaryKey.name, target, source, targetCasing, sourceCasing, database, relationDepth);
        }

        for (const item of this.columns) {
            this.applyValue(item.name, target, source, targetCasing, sourceCasing, database, relationDepth);
        }

        return target;
    }

    public getPrimaryKeyName(casing?: StringCase): string {
        return convertCase(this.primaryKey.name, casing);
    }

    // -----------------------------------------------------------------------------------------------------------------

    /**
     * Outputs an object that only contains the primary key and value
     *
     * @param entity
     * @param {StringCase} casing
     * @param {boolean} generateKey
     * @returns {Object}
     */
    public getPrimaryKeyObject<T>(entity: any, casing: StringCase = StringCase.Same, generateKey = false): object {
        if (!isObject(entity) || entity instanceof Guid) {
            const temp = {};
            temp[this.primaryKey.name] = entity;
            entity = temp;
        }

        if (generateKey && this.primaryKey.generator === EntityKeyGenerator.Guid && !(entity[this.primaryKey.name] instanceof Guid)) {
            entity[this.primaryKey.name] = Guid.newGuid();
        }

        return this.applyValue<object, T>
        (
            this.primaryKey.name,
            {}, entity,
            StringCase.Camel, casing
        );
    }

    /**
     * Outputs a plain object suitable for API transfers
     *
     * @param entity
     * @param {StringCase} casing
     * @param {number} relationDepth
     * @returns {Object}
     */
    public getTransferObject(entity: any, relationDepth?: number, casing: StringCase = StringCase.Same): object {
        let output = this.getPrimaryKeyObject(entity, casing);

        for (const item of this.columns) {
            output = this.applyValue
            (
                item.name,
                output,
                entity,
                casing,
                StringCase.Same,
                relationDepth
            );
        }

        return output;
    }

    /**
     * Outputs a plain object suitable for database operations
     *
     * @param {any} entity
     * @param {StringCase} casing
     * @param {DatabaseType} database
     * @param {boolean} includeKey
     * @param {boolean} generateKey
     * @param {number} relationDepth
     * @returns {Object}
     */
    public getDatabaseObject<T>(entity: any, casing: StringCase, database: DatabaseType,
                                includeKey = true, generateKey = false, relationDepth?: number): object {

        let output = includeKey ? this.getPrimaryKeyObject<T>(entity, casing, generateKey) : {};

        for (const item of this.columns) {
            if (!item.isExcluded(database)) {
                output = this.applyValue<object, T>
                (
                    item.name,
                    output,
                    entity,
                    casing,
                    this.casing,
                    database,
                    relationDepth
                );
            }
        }

        return output;
    }

    /**
     *
     * @param {Object} entity
     * @param {TimestampEvent} event
     * @param {Date} timestamp
     */
    public updateTimestamps(entity: any, event: TimestampEvent, timestamp: Date): void {
        const list = this.timestamps[event];

        for (const item of list) {
            entity[item.name] = timestamp;
        }
    }

    /**
     *
     * @param {string} name
     * @param {Object} target
     * @param {Object} source
     * @param {StringCase} targetCasing
     * @param {StringCase} sourceCasing
     * @param {DatabaseType} database
     * @param {number} relationDepth
     * @returns {Object}
     */
    private applyValue<T, S>(name: string, target: T, source: S, targetCasing?: StringCase, sourceCasing?: StringCase,
                             database: DatabaseType = DatabaseType.Unspecified, relationDepth?: number): T {

        const columnDescriptor = this.fromMap(name);

        const sourceName = convertCase(name, sourceCasing);
        if (!source.hasOwnProperty(sourceName) && columnDescriptor.type !== EntityColumnDataType.Entity) {
            return target;
        }

        let targetName = convertCase(name, targetCasing);
        let value = source[sourceName];

        switch (columnDescriptor.type) {
            case EntityColumnDataType.Number:
                if (isString(value)) {
                    value = parseInt(value, 10);
                }
                break;
            case EntityColumnDataType.Float:
                if (isString(value)) {
                    value = parseFloat(value);
                }
                break;
            case EntityColumnDataType.String:
                if (!isString(value) && !isNil(value)) {
                    value = value.toString();
                }
                break;
            case EntityColumnDataType.Date:
                if (isString(value)) {
                    value = new Date(value);
                }

                if (value instanceof Date) {
                    value.setMilliseconds(0);
                }
                break;
            case EntityColumnDataType.Guid:
                if (value instanceof Guid) {
                    value = (value as Guid).toString();
                }
                else {
                    value = Guid.parse(value);
                }
                break;
            case EntityColumnDataType.Entity:
                const relatedDescriptor = EntityDescriptor.get(columnDescriptor.relatesTo);

                if (isObject(value)) {
                    if (!isUndefined(relationDepth) && relationDepth > 0 && value instanceof columnDescriptor.relatesTo) {
                        value = relatedDescriptor.getDatabaseObject(
                            value,
                            targetCasing,
                            database,
                            true,
                            isNil(value[relatedDescriptor.getPrimaryKeyName()]),
                            --relationDepth
                        );
                    }
                    else {
                        if (isObject(target) && target instanceof this.classType) {
                            value = relatedDescriptor.apply<T, object>(
                                new columnDescriptor.relatesTo(),
                                value,
                                relatedDescriptor.casing,
                                sourceCasing,
                                database
                            );
                        }
                        else {
                            value = relatedDescriptor.getPrimaryKeyObject(
                                value,
                                StringCase.Same,
                                isNil(value[relatedDescriptor.getPrimaryKeyName()])
                            );
                            value = value[relatedDescriptor.getPrimaryKeyName()];
                            const relationName = convertCase(name, StringCase.Kebab);
                            targetName = convertCase(`${relationName}-${relatedDescriptor.getPrimaryKeyName()}`, targetCasing);
                        }
                    }
                }
                else {
                    if (isUndefined(value)) {
                        const relationName = convertCase(name, StringCase.Kebab);
                        const sourceKeyName = convertCase(`${relationName}-${relatedDescriptor.getPrimaryKeyName()}`, sourceCasing);

                        if (source.hasOwnProperty(sourceKeyName)) {
                            const relationSource: object = {};
                            const relationKeyName = `${convertCase(relationName, sourceCasing)}_${relatedDescriptor.getPrimaryKeyName()}`;

                            relationSource[relationKeyName] = source[sourceKeyName];

                            value = ObjectUtility.normalize(relationSource)[sourceName];
                        }
                    }

                    if (!isUndefined(value)) {
                        const targetValue = target[targetName] instanceof columnDescriptor.relatesTo
                            ? target[targetName]
                            : new columnDescriptor.relatesTo();

                        value = relatedDescriptor.apply<T, object>(
                            targetValue,
                            value,
                            relatedDescriptor.casing,
                            sourceCasing,
                            database
                        );
                    }
                }
        }

        if (!isUndefined(value)) {
            target[targetName] = value;
        }

        return target;
    }
}

export enum EntityColumnDataType {
    Boolean,
    Date,
    Entity,
    Float,
    Guid,
    Number,
    String,
    Undetermined,
}

export enum EntityKeyGenerator {
    None,
    Guid,
    Identity
}

export interface EntityColumn {
    name: string;
    type: EntityColumnDataType;
    order: number;
    exclusions: DatabaseType;
}

export class EntityColumnDescriptor implements EntityColumn {
    public name: string;
    public type: EntityColumnDataType;
    public order: number;
    public exclusions: DatabaseType;
    public relatesTo: Constructable;
    public indexName: string;
    public generator: EntityKeyGenerator = EntityKeyGenerator.None;

    public isExcluded(database: DatabaseType): boolean {
        return (database !== DatabaseType.Unspecified) && ((this.exclusions & database) === database);
    }
}

/**
 * Builds up the descriptor object for an entity
 */
export class EntityDescriptorBuilder {
    public static cacheOrder(target: any, databases: DatabaseType[]): void {
        EntityDescriptorBuilder.ensureDescriptor(target).cache = databases;
    }

    public static casing(target: any, casing: StringCase): void {
        EntityDescriptorBuilder.ensureDescriptor(target).casing = casing;
    }

    public static column(target: any, properties: EntityColumn, isPrimaryKey: boolean) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        const column = Object.assign(new EntityColumnDescriptor(), properties as EntityColumn);

        if (isPrimaryKey) {
            descriptor.primaryKey = column;
        }
        else {
            descriptor.columns.push(column);
        }

        descriptor.addToMap(column);
    }

    public static connection(target: any, name: string, database: DatabaseType): void {
        EntityDescriptorBuilder.ensureDescriptor(target).setConnectionName(name, database);
    }

    public static entity(target: any, tableName: string): void {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);

        descriptor.tableName = tableName;
        descriptor.isEntity = true;
    }

    public static exclusions(target: any, name: string, databases: DatabaseType[]) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        const column = descriptor.fromMap(name);
        let exclusions: DatabaseType = DatabaseType.Unspecified;

        for (const item of databases) {
            exclusions |= item;
        }

        column.exclusions = exclusions;
    }

    public static generator(target: any, name: string, type: EntityKeyGenerator) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        descriptor.fromMap(name).generator = type;
    }

    public static index(target: any, name: string, indexName: string) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        descriptor.fromMap(name).indexName = indexName;
    }

    public static inherit(target: any): void {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);

        if (!(descriptor.parent instanceof EntityDescriptor)) {
            throw new Error(`${target.constructor.name} Entity must extend from another defined entity`);
        }

        descriptor.source = descriptor.parent.source;
        descriptor.cache = descriptor.parent.cache.slice();
        descriptor.connectionNameMap = descriptor.parent.connectionNameMap.slice();

        EntityDescriptorBuilder.entity(target, descriptor.parent.tableName);
    }

    public static only(target: any, name: string, databases: DatabaseType[]) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        const column = descriptor.fromMap(name);
        let exclusions: DatabaseType = DatabaseType.Supported;

        for (const item of databases) {
            exclusions ^= item;
        }

        column.exclusions = exclusions;
    }

    public static order(target: any, name: string, order: number) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        descriptor.fromMap(name).order = order;
    }

    public static relatesTo(target: any, name: string, entityClass: Constructable) {
        if (!EntityDescriptor.hasDescriptor(entityClass)) {
            throw new Error(`Desired relation class is not an entity: ${target.constructor.name} => ${name} => ${entityClass}`);
        }

        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        const column = descriptor.fromMap(name);

        column.relatesTo = entityClass;

        if (column.type === EntityColumnDataType.Undetermined) {
            column.type = EntityColumnDataType.Entity;
        }
    }

    public static schema(target: any, name: string): void {
        EntityDescriptorBuilder.ensureDescriptor(target).schema = name;
    }

    public static source(target: any, database: DatabaseType): void {
        EntityDescriptorBuilder.ensureDescriptor(target).source = database;
    }

    public static timestamp(target: any, name: string, event: TimestampEvent) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        const column = descriptor.fromMap(name);

        descriptor.timestamps[event].push(column);
    }

    public static type(target: any, name: string, columnType: EntityColumnDataType) {
        const descriptor = EntityDescriptorBuilder.ensureDescriptor(target);
        descriptor.fromMap(name).type = columnType;
    }


    private static ensureDescriptor(target: any): EntityDescriptor {
        if (EntityDescriptor.isEntity(target)) {
            throw new Error(`Class ${target.constructor.name} has already been specified as an entity`);
        }

        return EntityDescriptor.ensure(target);
    }
}
