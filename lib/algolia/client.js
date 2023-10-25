"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AlgoliaSearch = require("algoliasearch");
const configuration_1 = require("../configuration");
function factory(options = {}) {
    const config = configuration_1.DatabaseConfiguration.getConfiguration(configuration_1.DatabaseType.Algolia, options.name);
    return AlgoliaSearch(config.username, config.password, config.options);
}
exports.factory = factory;
