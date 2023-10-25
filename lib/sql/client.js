"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Knex = require("knex");
const lodash_1 = require("lodash");
const configuration_1 = require("../configuration");
const exceptions_1 = require("../exceptions");
const math_1 = require("../utility/math");
const connections = {
    mysql: {},
    postgres: {}
};
function getHost(config, master) {
    return (lodash_1.isNil(config.readonly) || config.readonly.length < 0 || master)
        ? config.master
        : config.readonly[math_1.Random.int(config.readonly.length - 1)];
}
function createConfiguration(client, config, server) {
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
    if (lodash_1.isNumber(server.port)) {
        configuration.connection.port = server.port;
    }
    return configuration;
}
function getKnexClient(database, name, master) {
    const config = configuration_1.DatabaseConfiguration.getConfiguration(database, name);
    const server = getHost(config, master);
    const key = `${server.host}-${server.port}`;
    switch (database) {
        case configuration_1.DatabaseType.Mysql:
            if (!connections.mysql.hasOwnProperty(key)) {
                connections.mysql[key] = Knex(createConfiguration("mysql", config, server));
            }
            return connections.mysql[key];
        case configuration_1.DatabaseType.Postgres:
            if (!connections.postgres.hasOwnProperty(key)) {
                connections.postgres[key] = Knex(createConfiguration("pg", config, server));
            }
            return connections.postgres[key];
    }
    throw new exceptions_1.NotSupportedException(`Database type (${database}) is not currently supported`);
}
function factory(database, options = {}) {
    return getKnexClient(database, options.name, options.master);
}
exports.factory = factory;
