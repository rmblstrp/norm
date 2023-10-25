import { DatabaseType } from "./configuration";
import { DatabaseRepository } from "./repository";
import { TypedConstructable } from "@elevated/objects/lib/types";
export declare class RepositoryFactory {
    static get<E, PK>(type: DatabaseType, classType: TypedConstructable<E>, connectionName?: string): DatabaseRepository<E, PK>;
}
