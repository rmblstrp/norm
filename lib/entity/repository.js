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
const factory_1 = require("../factory");
const repository_1 = require("../repository");
class EntityQueryOptions extends repository_1.QueryOptions {
    static cacheOnly(options) {
        return EntityQueryOptions.hasOptions(options) && lodash_1.isBoolean(options.cacheOnly) && options.cacheOnly;
    }
    static sourceOnly(options) {
        return EntityQueryOptions.hasOptions(options) && lodash_1.isBoolean(options.sourceOnly) && options.sourceOnly;
    }
}
exports.EntityQueryOptions = EntityQueryOptions;
class EntitySaveOptions extends repository_1.SaveOptions {
    static cacheOnly(options) {
        return EntitySaveOptions.hasOptions(options) && lodash_1.isBoolean(options.cacheOnly) && options.cacheOnly;
    }
    static sourceOnly(options) {
        return EntitySaveOptions.hasOptions(options) && lodash_1.isBoolean(options.sourceOnly) && options.sourceOnly;
    }
}
exports.EntitySaveOptions = EntitySaveOptions;
class EntityRepository {
    constructor(classType) {
        this.classType = classType;
        this.descriptor = entity_1.EntityDescriptor.get(this.classType);
        if ((configuration_1.DatabaseType.Supported & this.descriptor.source) === 0) {
            throw new Error("A supported database type must be specified before EntityRepository can be used");
        }
        this.source = factory_1.RepositoryFactory.get(this.descriptor.source, classType);
        this.cache = [];
        for (const database of this.descriptor.cache) {
            this.cache.push(factory_1.RepositoryFactory.get(database, classType));
        }
    }
    queryRepositories(options) {
        let repositories = [];
        if (!EntitySaveOptions.sourceOnly(options)) {
            repositories = repositories.concat(this.cache);
        }
        if (!EntitySaveOptions.cacheOnly(options)) {
            repositories.push(this.source);
        }
        return repositories;
    }
    writeRepositories(options) {
        let repositories = [];
        if (!EntitySaveOptions.cacheOnly(options)) {
            repositories.push(this.source);
        }
        if (!EntitySaveOptions.sourceOnly(options)) {
            repositories = repositories.concat(this.cache);
        }
        return repositories;
    }
    delete(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const repository of this.writeRepositories(options)) {
                yield repository.delete(entity);
            }
        });
    }
    exists(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const repository of this.queryRepositories(options)) {
                if (yield repository.exists(entity, options)) {
                    return true;
                }
            }
            return false;
        });
    }
    get(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const repository of this.queryRepositories(options)) {
                const entity = yield repository.get(id, options);
                if (entity !== null) {
                    return entity;
                }
            }
            return undefined;
        });
    }
    query(criteria, options) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const repository of this.queryRepositories(options)) {
                const results = yield repository.query(criteria, options);
                if (results.length > 0) {
                    return results;
                }
            }
            return [];
        });
    }
    save(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const sourceOptions = Object.assign({}, options);
            if (!repository_1.SaveOperation.isValid(sourceOptions.operation)) {
                sourceOptions.operation = repository_1.SaveOperation.Upsert;
            }
            let result = EntitySaveOptions.cacheOnly(sourceOptions)
                ? { entity, operation: sourceOptions.operation, successful: false }
                : yield this.source.save(entity, options);
            if (!EntitySaveOptions.sourceOnly(options)) {
                const cacheOptions = Object.assign({}, options);
                if (!lodash_1.isBoolean(cacheOptions.suppressException)) {
                    cacheOptions.suppressException = true;
                }
                cacheOptions.operation = result.operation;
                for (const repository of this.cache) {
                    result = yield repository.save(entity, cacheOptions);
                    if (!result.successful && sourceOptions.operation === repository_1.SaveOperation.Upsert) {
                        const operation = result.operation === repository_1.SaveOperation.Insert
                            ? repository_1.SaveOperation.Update
                            : repository_1.SaveOperation.Insert;
                        const recoveryOptions = Object.assign({}, options, { operation });
                        result = yield repository.save(entity, recoveryOptions);
                    }
                }
            }
            return result;
        });
    }
    updateQuery(entity, criteria, options) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const repository of this.writeRepositories(options)) {
                yield repository.updateQuery(entity, criteria, options);
            }
        });
    }
}
exports.EntityRepository = EntityRepository;
