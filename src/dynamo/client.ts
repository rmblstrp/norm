import * as DynamoDB from "aws-sdk/clients/dynamodb";
import { isNil, isString } from "lodash";
import { ClientOptions, DatabaseConfiguration, DatabaseType } from "../configuration";

function getDynamoService(name?: string): DynamoDB {
    const config = DatabaseConfiguration.getConfiguration(DatabaseType.DynamoDB, name);
    const aws: DynamoDB.Types.ClientConfiguration = {
        region: config.database,
        credentials: {
            accessKeyId: config.username,
            secretAccessKey: config.password,
        }
    };

    if (!isNil(config.master) && isString(config.master.host) && config.master.host.length > 0) {
        aws.endpoint = config.master.host;
    }

    return new DynamoDB(aws);
}

function getDynamoClient(name?: string): DynamoDB.DocumentClient {
    const config = DatabaseConfiguration.getConfiguration(DatabaseType.DynamoDB, name);
    const options = { service: getDynamoService(name) };

    if (!isNil(config.options)) {
        Object.assign(options, config.options);
    }

    return new DynamoDB.DocumentClient(options);
}

export function factory(options: ClientOptions = {}): DynamoDB.DocumentClient {
    return getDynamoClient(options.name);
}
