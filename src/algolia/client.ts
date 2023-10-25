import * as AlgoliaSearch from "algoliasearch";
import { ClientOptions, DatabaseConfiguration, DatabaseType } from "../configuration";

export function factory(options: ClientOptions = {}) {
    const config = DatabaseConfiguration.getConfiguration(DatabaseType.Algolia, options.name);
    return AlgoliaSearch(config.username, config.password, config.options);
}
