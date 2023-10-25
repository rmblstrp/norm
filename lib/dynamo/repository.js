"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const DynamoDB = require("aws-sdk/clients/dynamodb");
const lodash_1 = require("lodash");
const configuration_1 = require("../configuration");
const entity_1 = require("../entity");
const repository_1 = require("../repository");
const client_1 = require("./client");
const query_1 = require("./query");
class DynamoRepository extends repository_1.DatabaseRepository {
    constructor(classType, connectionName) {
        super(configuration_1.DatabaseType.DynamoDB, classType, connectionName);
        this.client = client_1.factory({ name: connectionName });
    }
    delete(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const parameters = this.getPrimaryKeyQuery(entity);
            yield this.client.delete(parameters).promise();
        });
    }
    exists(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.primaryKeyHasValue(entity)) {
                return false;
            }
            const query = this.getPrimaryKeyQuery(entity);
            query.ProjectionExpression = this.primaryKey;
            const result = yield this.executeGetItem(query);
            return !lodash_1.isNil(result);
        });
    }
    get(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.primaryKeyHasValue(id)) {
                return undefined;
            }
            const query = this.getPrimaryKeyQuery(id);
            return this.convert(yield this.executeGetItem(query));
        });
    }
    query(criteria, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = query_1.DynamoQuery.generate(criteria, this.settings);
            const executeQuery = lodash_1.isString(query.KeyConditionExpression) && query.KeyConditionExpression.length > 0;
            const result = yield (executeQuery ? this.client.query(query) : this.client.scan(query)).promise();
            const items = [];
            if (result.Count > 0) {
                for (const document of result.Items) {
                    items.push(this.convert(document));
                }
            }
            return items;
        });
    }
    convert(source) {
        if (lodash_1.isObject(source)) {
            for (const property of Object.getOwnPropertyNames(source)) {
                const converted = DynamoDB.Converter.output(source[property]);
                source[property] = lodash_1.isUndefined(converted) ? source[property] : converted;
            }
        }
        return super.convert(source);
    }
    getPrimaryKeyQuery(entity) {
        return {
            TableName: this.table,
            Key: this.getPrimaryKeyObject(entity)
        };
    }
    getValues(entity, withPrimaryKey = true) {
        const values = super.getValues(entity, withPrimaryKey);
        if (this.descriptor.primaryKey.generator !== entity_1.EntityKeyGenerator.Guid && Object.keys(this.getPrimaryKeyObject(entity)).length === 0) {
            throw new Error("DynamoDB requires a primary key value to have already been set so it can be saved");
        }
        for (const key of Object.keys(values)) {
            if (values[key] instanceof Date) {
                values[key] = values[key].toISOString();
            }
        }
        return values;
    }
    executeGetItem(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = (yield this.client.get(query).promise());
            return result.Item;
        });
    }
    save(entity, options) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            options = Object.assign({}, options);
            return _super("save").call(this, entity, options);
        });
    }
    update(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const parameters = this.getPrimaryKeyQuery(entity);
            parameters.ExpressionAttributeNames = {};
            parameters.ExpressionAttributeValues = {};
            const item = this.getValues(entity, false);
            const statement = [];
            for (const key of Object.keys(item)) {
                const namedKey = `#${key}`;
                const namedValue = `:${key}`;
                statement.push(`${namedKey} = ${namedValue}`);
                parameters.ExpressionAttributeNames[namedKey] = key;
                parameters.ExpressionAttributeValues[namedValue] = item[key];
            }
            parameters.UpdateExpression = `SET ${statement.join(", ")}`;
            yield this.client.update(parameters).promise();
        });
    }
    insert(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const parameters = {
                TableName: this.table,
                Item: this.getValues(entity)
            };
            yield this.client.put(parameters).promise();
        });
    }
}
exports.DynamoRepository = DynamoRepository;
