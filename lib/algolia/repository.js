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
const repository_1 = require("../repository");
const client_1 = require("./client");
class AlgoliaRepository extends repository_1.DatabaseRepository {
    constructor(classType, connectionName) {
        super(configuration_1.DatabaseType.Algolia, classType, connectionName);
        this.client = client_1.factory({ name: connectionName });
        this.index = this.client.initIndex(this.table);
    }
    exists(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.get(entity) instanceof this.descriptor.classType;
        });
    }
    get(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.primaryKeyHasValue(id)) {
                return undefined;
            }
            let document = undefined;
            this.index.getObject(String(this.getPrimaryKeyValue(id)), (error, content) => {
                if (lodash_1.isError(error)) {
                    throw error;
                }
                document = content;
            });
            return this.convert(document);
        });
    }
    query(criteria, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return [];
        });
    }
    getPrimaryKeyObject(entity) {
        return { objectID: this.getPrimaryKeyValue(entity) };
    }
    getValues(entity) {
        const values = super.getValues(entity, false);
        values.objectID = this.getPrimaryKeyValue(entity);
        return values;
    }
    update(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (repository_1.SaveOptions.overwrite(options)) {
                yield this.index.saveObject(this.getValues(entity));
            }
            else {
                yield this.index.partialUpdateObject(this.getValues(entity));
            }
        });
    }
    insert(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.index.addObject(this.getValues(entity));
        });
    }
}
exports.AlgoliaRepository = AlgoliaRepository;
