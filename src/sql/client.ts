import * as Knex from "knex";
import { isNil, isNumber } from "lodash";
import { ClientOptions, ConnectionConfiguration, DatabaseConfiguration, DatabaseType, Host } from "../configuration";
import { NotSupportedException } from "../exceptions";
import { Random } from "../utility/math";

export interface SqlClientOptions extends ClientOptions {
    master?: boolean;
}

const connections = {
    mysql: {},
    postgres: {}
};

function getHost(config: ConnectionConfiguration, master?: boolean): Host {
    return (isNil(config.readonly) || config.readonly.length < 0 || master)
        ? config.master
        : config.readonly[Random.int(config.readonly.length - 1)];
}

function createConfiguration(client: string, config: ConnectionConfiguration, server: Host): object {
    const configuration = {
        client,
        connection: {
            host: server.host,
            port: undefined,
            user: config.username,
            password: config.password,
            database: config.database
        }
    };

    if (isNumber(server.port)) {
        configuration.connection.port = server.port;
    }

    return configuration;
}

function getKnexClient(database: DatabaseType, name?: string, master?: boolean): Knex {
    const config = DatabaseConfiguration.getConfiguration(database, name);
    const server = getHost(config, master);
    const key = `${server.host}-${server.port}`;

    switch (database) {
        case DatabaseType.Mysql:
            if (!connections.mysql.hasOwnProperty(key)) {
                connections.mysql[key] = Knex(createConfiguration("mysql", config, server));
            }

            return connections.mysql[key];
        case DatabaseType.Postgres:
            if (!connections.postgres.hasOwnProperty(key)) {
                connections.postgres[key] = Knex(createConfiguration("pg", config, server));
            }
            return connections.postgres[key];
    }

    throw new NotSupportedException(`Database type (${database}) is not currently supported`);
}

export function factory(database: DatabaseType, options: SqlClientOptions = {}): Knex {
    return getKnexClient(database, options.name, options.master);
}
