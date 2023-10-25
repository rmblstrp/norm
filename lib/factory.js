"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repository_1 = require("./algolia/repository");
const configuration_1 = require("./configuration");
const repository_2 = require("./dynamo/repository");
const exceptions_1 = require("./exceptions");
const repository_3 = require("./sql/repository");
const utility_1 = require("@elevated/objects/lib/enum/utility");
class RepositoryFactory {
    static get(type, classType, connectionName) {
        switch (type) {
            case configuration_1.DatabaseType.Algolia:
                return new repository_1.AlgoliaRepository(classType, connectionName);
            case configuration_1.DatabaseType.DynamoDB:
                return new repository_2.DynamoRepository(classType, connectionName);
            case configuration_1.DatabaseType.Firebase:
                break;
            case configuration_1.DatabaseType.Mysql:
                return new repository_3.MysqlRepository(classType, connectionName);
            case configuration_1.DatabaseType.Postgres:
                return new repository_3.PostgresRepository(classType, connectionName);
        }
        throw new exceptions_1.NotSupportedException(`Repository for database type is not currently supported: ${utility_1.EnumUtility.getName(configuration_1.DatabaseType, type)}`);
    }
}
exports.RepositoryFactory = RepositoryFactory;
