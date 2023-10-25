"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DynamoDB = require("aws-sdk/clients/dynamodb");
const lodash_1 = require("lodash");
const configuration_1 = require("../configuration");
function getDynamoService(name) {
    const config = configuration_1.DatabaseConfiguration.getConfiguration(configuration_1.DatabaseType.DynamoDB, name);
    const aws = {
        region: config.database,
        credentials: {
            accessKeyId: config.username,
            secretAccessKey: config.password,
        }
    };
    if (!lodash_1.isNil(config.master) && lodash_1.isString(config.master.host) && config.master.host.length > 0) {
        aws.endpoint = config.master.host;
    }
    return new DynamoDB(aws);
}
function getDynamoClient(name) {
    const config = configuration_1.DatabaseConfiguration.getConfiguration(configuration_1.DatabaseType.DynamoDB, name);
    const options = { service: getDynamoService(name) };
    if (!lodash_1.isNil(config.options)) {
        Object.assign(options, config.options);
    }
    return new DynamoDB.DocumentClient(options);
}
function factory(options = {}) {
    return getDynamoClient(options.name);
}
exports.factory = factory;
