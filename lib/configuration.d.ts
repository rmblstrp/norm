import { StringCase } from "@elevated/objects/lib/string/casing";
export interface ClientOptions {
    name?: string;
}
export declare enum DatabaseType {
    Unspecified = 0,
    Algolia = 1,
    DynamoDB = 2,
    Firebase = 4,
    Mysql = 8,
    Postgres = 16,
    Supported = 31,
}
export interface Host {
    host: string;
    port?: number;
}
export interface DatabaseSettings {
    flatten?: {
        separator: string;
        keyStyle?: StringCase;
    };
    relationDepth?: number;
    columnCasing?: StringCase;
    schemaCasing?: StringCase;
    tableCasing?: StringCase;
    useSchema?: boolean;
}
export declare class DatabaseSettingsHelper {
    private settings;
    constructor(source: DatabaseSettings);
    protected getValue<T>(value: any, defaultValue?: T): T;
    readonly flattenObjects: boolean;
    readonly flattenSeparator: string;
    readonly flattenKeyStyle: StringCase;
    readonly relationDepth: number;
    readonly columnCasing: StringCase;
    readonly schemaCasing: StringCase;
    readonly tableCasing: StringCase;
    readonly useSchema: boolean;
}
export interface ConnectionConfiguration {
    name?: string;
    type: DatabaseType;
    master: Host;
    readonly?: Host[];
    database?: string;
    username?: string;
    password?: string;
    options?: object;
    settings?: DatabaseSettings;
}
export declare namespace DatabaseConfiguration {
    function clearConfigurations(): void;
    function addConfiguration(...configurations: ConnectionConfiguration[]): void;
    function getConfiguration(database: DatabaseType, name?: string): ConnectionConfiguration;
}
