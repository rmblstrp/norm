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
const lodash_1 = require("lodash");
const configuration_1 = require("../configuration");
const entity_1 = require("../entity");
const repository_1 = require("../repository");
const client_1 = require("./client");
const query_1 = require("./query");
class SqlRepository extends repository_1.DatabaseRepository {
    constructor(database, classType, connectionName) {
        super(database, classType, connectionName);
        this.writeBuilder = client_1.factory(this.type, { name: connectionName, master: true });
        this.readBuilder = client_1.factory(this.type, { name: connectionName });
    }
    exists(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const hasPrimaryKeyValue = this.primaryKeyHasValue(entity);
            if (hasPrimaryKeyValue) {
                const generator = this.descriptor.primaryKey.generator;
                if (generator !== entity_1.EntityKeyGenerator.None && !repository_1.QueryOptions.ignoreGenerator(options)) {
                    return true;
                }
                return this.getPrimaryKeyQuery(this.getBuilder(options), entity)
                    .select()
                    .count(`${this.primaryKey} as cnt`)
                    .then(rows => (parseInt(rows[0].cnt) === 1));
            }
            return false;
        });
    }
    delete(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getPrimaryKeyQuery(this.writeBuilder, entity).delete();
        });
    }
    get(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.primaryKeyHasValue(id)) {
                return undefined;
            }
            const row = yield this.getPrimaryKeyQuery(this.getBuilder(options), id)
                .select()
                .then(rows => (rows.length === 1 ? rows[0] : undefined));
            return this.convert(row);
        });
    }
    query(criteria, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = query_1.SqlQuery.generate(this.getBuilder(options)(this.table), criteria, this.settings);
            const entities = [];
            const rows = yield query.then(rows => rows);
            for (const item of rows) {
                entities.push(this.convert(item));
            }
            return entities;
        });
    }
    updateQuery(entity, criteria, options) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    insert(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.writeBuilder(this.table)
                .insert(this.getValues(entity))
                .returning(this.primaryKey)
                .then(id => {
                if (lodash_1.isNil(entity[this.descriptor.primaryKey.name])) {
                    const insertId = {};
                    insertId[this.descriptor.primaryKey.name] = id[0];
                    this.descriptor.apply(entity, insertId, this.descriptor.casing, this.descriptor.casing);
                }
            });
        });
    }
    update(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getPrimaryKeyQuery(this.writeBuilder, entity).update(this.getValues(entity, false));
        });
    }
    getBuilder(options) {
        if (repository_1.QueryOptions.useMaster(options)) {
            return this.writeBuilder;
        }
        return this.readBuilder;
    }
    getPrimaryKeyQuery(builder, entity) {
        return builder(this.table).where(this.getPrimaryKeyObject(entity)).limit(1);
    }
}
exports.SqlRepository = SqlRepository;
class MysqlRepository extends SqlRepository {
    constructor(classType, connectionName) {
        super(configuration_1.DatabaseType.Mysql, classType, connectionName);
    }
}
exports.MysqlRepository = MysqlRepository;
class PostgresRepository extends SqlRepository {
    constructor(classType, connectionName) {
        super(configuration_1.DatabaseType.Postgres, classType, connectionName);
    }
}
exports.PostgresRepository = PostgresRepository;
