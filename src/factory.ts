import { AlgoliaRepository } from "./algolia/repository";
import { DatabaseType } from "./configuration";
import { DynamoRepository } from "./dynamo/repository";
import { NotSupportedException } from "./exceptions";
import { DatabaseRepository } from "./repository";
import { MysqlRepository, PostgresRepository } from "./sql/repository";
import { EnumUtility } from "@elevated/objects/lib/enum/utility";
import { TypedConstructable } from "@elevated/objects/lib/types";

export class RepositoryFactory {
    public static get<E, PK>(type: DatabaseType, classType: TypedConstructable<E>, connectionName?: string): DatabaseRepository<E, PK> {
        switch (type) {
            case DatabaseType.Algolia:
                return new AlgoliaRepository<E, PK>(classType, connectionName);
            case DatabaseType.DynamoDB:
                return new DynamoRepository<E, PK>(classType, connectionName);
            case DatabaseType.Firebase:
                break;
            case DatabaseType.Mysql:
                return new MysqlRepository<E, PK>(classType, connectionName);
            case DatabaseType.Postgres:
                return new PostgresRepository<E, PK>(classType, connectionName);
        }

        throw new NotSupportedException(`Repository for database type is not currently supported: ${EnumUtility.getName(DatabaseType, type)}`);
    }
}
