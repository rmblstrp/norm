import * as Knex from "knex";
import { ClientOptions, DatabaseType } from "../configuration";
export interface SqlClientOptions extends ClientOptions {
    master?: boolean;
}
export declare function factory(database: DatabaseType, options?: SqlClientOptions): Knex;
