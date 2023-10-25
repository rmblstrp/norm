import { EnumUtility } from "@elevated/objects/lib/enum/utility";
import { StringCase } from "@elevated/objects/lib/string/casing";
import { isNil } from "lodash";

export interface ClientOptions {
    name?: string;
}

export enum DatabaseType {
    Unspecified     = 0x0000,
    Algolia         = 0x0001,
    DynamoDB        = 0x0002,
    Firebase        = 0x0004,
    Mysql           = 0x0008,
    Postgres        = 0x0010,

    Supported = Algolia | DynamoDB | Firebase | Mysql | Postgres
}

export interface Host {
    host: string;
    port?: number;
}

export interface DatabaseSettings {
    flatten?: { separator: string, keyStyle?: StringCase };
    relationDepth?: number;

    columnCasing?: StringCase;
    schemaCasing?: StringCase;
    tableCasing?: StringCase;
    useSchema?: boolean;
}

export class DatabaseSettingsHelper {
    private settings: DatabaseSettings;

    public constructor(source: DatabaseSettings) {
        this.settings = source instanceof DatabaseSettingsHelper
            ? source.settings
            : source;

        if (isNil(this.settings)) {
            this.settings = {};
        }
    }

    protected getValue<T>(value: any, defaultValue?: T): T {
        return isNil(value) ? defaultValue : value;
    }

    public get flattenObjects(): boolean {
        return !isNil(this.settings.flatten);
    }

    public get flattenSeparator(): string {
        return this.settings.flatten.separator;
    }

    public get flattenKeyStyle(): StringCase {
        return this.settings.flatten.keyStyle;
    }

    public get relationDepth(): number {
        return this.settings.relationDepth;
    }

    public get columnCasing(): StringCase {
        return this.getValue(this.settings.columnCasing, StringCase.Snake);
    }

    public get schemaCasing(): StringCase {
        return this.getValue(this.settings.schemaCasing, StringCase.Snake);
    }

    public get tableCasing(): StringCase {
        return this.getValue(this.settings.tableCasing, StringCase.Snake);
    }

    public get useSchema(): boolean {
        return this.getValue(this.settings.useSchema, false);
    }
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

export namespace DatabaseConfiguration {
    const databaseConfigurations: object = {};

    export function clearConfigurations() {
        databaseConfigurations[DatabaseType.Algolia] = {};
        databaseConfigurations[DatabaseType.DynamoDB] = {};
        databaseConfigurations[DatabaseType.Firebase] = {};
        databaseConfigurations[DatabaseType.Mysql] = {};
        databaseConfigurations[DatabaseType.Postgres] = {};
    }

    clearConfigurations();

    function validateConfiguration(config: ConnectionConfiguration): ConnectionConfiguration {
        const settings = new DatabaseSettingsHelper(config.settings);

        switch (config.type) {
            case DatabaseType.Mysql:
            case DatabaseType.Postgres:
                if (settings.relationDepth > 1 && !settings.flattenObjects) {
                    throw new Error(`Flatten objects must be enabled to have a relation depth greater than 0 for ${EnumUtility.getName(config.type, DatabaseType)}`);
                }
                break;
        }

        return config;
    }

    function connectionName(name?: string): string {
        return isNil(name) ? "default" : name;
    }

    export function addConfiguration(...configurations: ConnectionConfiguration[]) {
        for (const config of configurations) {
            databaseConfigurations[config.type][connectionName(config.name)] = validateConfiguration(config);
        }
    }

    export function getConfiguration(database: DatabaseType, name?: string): ConnectionConfiguration {
        const configuration = databaseConfigurations[database][connectionName(name)];

        if (isNil(configuration)) {
            const databaseName = EnumUtility.getName(DatabaseType, database);
            const error = `Configuration "${connectionName}" was not found for database type (${databaseName})"`;
            throw new Error(error);
        }

        return configuration;
    }
}
