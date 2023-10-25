import { StringCase } from "@elevated/objects/lib/string/casing";
import { Constructable } from "@elevated/objects/lib/types";
import "reflect-metadata";
import { DatabaseType } from "./configuration";
export declare enum TimestampEvent {
    OnCreate = 0,
    OnUpdate = 1,
    OnDelete = 2,
}
export declare class EntityDescriptor {
    static readonly metadataKey: string;
    parent: EntityDescriptor;
    classType: Constructable;
    schema: string;
    tableName: string;
    isEntity: boolean;
    primaryKey: EntityColumnDescriptor;
    columns: EntityColumnDescriptor[];
    map: object;
    timestamps: EntityColumnDescriptor[][];
    source: DatabaseType;
    cache: DatabaseType[];
    casing: StringCase;
    connectionNameMap: string[];
    constructor();
    static get(target: any): EntityDescriptor;
    static ensure(target: any): EntityDescriptor;
    static hasDescriptor(target: any): boolean;
    static isEntity(target: any): boolean;
    addToMap(column: EntityColumnDescriptor): void;
    getConnectionName(database: DatabaseType): string;
    setConnectionName(name: string, database: DatabaseType): void;
    fromMap(name: string): EntityColumnDescriptor;
    getColumnNames(casing?: StringCase, ...exclude: EntityColumnDataType[]): string[];
    apply<T, S>(target: T, source: S, targetCasing?: StringCase, sourceCasing?: StringCase, database?: DatabaseType, relationDepth?: number): T;
    getPrimaryKeyName(casing?: StringCase): string;
    getPrimaryKeyObject<T>(entity: any, casing?: StringCase, generateKey?: boolean): object;
    getTransferObject(entity: any, relationDepth?: number, casing?: StringCase): object;
    getDatabaseObject<T>(entity: any, casing: StringCase, database: DatabaseType, includeKey?: boolean, generateKey?: boolean, relationDepth?: number): object;
    updateTimestamps(entity: any, event: TimestampEvent, timestamp: Date): void;
    private applyValue<T, S>(name, target, source, targetCasing?, sourceCasing?, database?, relationDepth?);
}
export declare enum EntityColumnDataType {
    Boolean = 0,
    Date = 1,
    Entity = 2,
    Float = 3,
    Guid = 4,
    Number = 5,
    String = 6,
    Undetermined = 7,
}
export declare enum EntityKeyGenerator {
    None = 0,
    Guid = 1,
    Identity = 2,
}
export interface EntityColumn {
    name: string;
    type: EntityColumnDataType;
    order: number;
    exclusions: DatabaseType;
}
export declare class EntityColumnDescriptor implements EntityColumn {
    name: string;
    type: EntityColumnDataType;
    order: number;
    exclusions: DatabaseType;
    relatesTo: Constructable;
    indexName: string;
    generator: EntityKeyGenerator;
    isExcluded(database: DatabaseType): boolean;
}
export declare class EntityDescriptorBuilder {
    static cacheOrder(target: any, databases: DatabaseType[]): void;
    static casing(target: any, casing: StringCase): void;
    static column(target: any, properties: EntityColumn, isPrimaryKey: boolean): void;
    static connection(target: any, name: string, database: DatabaseType): void;
    static entity(target: any, tableName: string): void;
    static exclusions(target: any, name: string, databases: DatabaseType[]): void;
    static generator(target: any, name: string, type: EntityKeyGenerator): void;
    static index(target: any, name: string, indexName: string): void;
    static inherit(target: any): void;
    static only(target: any, name: string, databases: DatabaseType[]): void;
    static order(target: any, name: string, order: number): void;
    static relatesTo(target: any, name: string, entityClass: Constructable): void;
    static schema(target: any, name: string): void;
    static source(target: any, database: DatabaseType): void;
    static timestamp(target: any, name: string, event: TimestampEvent): void;
    static type(target: any, name: string, columnType: EntityColumnDataType): void;
    private static ensureDescriptor(target);
}
