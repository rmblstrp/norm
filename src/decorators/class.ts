import { isString } from "lodash";
import { DatabaseType } from "../configuration";
import { EntityDescriptorBuilder } from "../entity";
import { StringCase } from "@elevated/objects/lib/string/casing";


/**
 * Class decorators to mark a class as an entity
 */
export function entity(table?: string): any {
    return target => {
        if (!isString(table) || table.length === 0) {
            table = target.name;
        }

        EntityDescriptorBuilder.entity(target, table);
    };
}

/**
 * Class decorators to denote which casing style the class properties are in
 */
export function casing(casing: StringCase): any {
    return target => {
        EntityDescriptorBuilder.casing(target, casing);
    };
}

/**
 * Class decorators to mark a class as an entity and inherit everything from parent
 */
export function inherit(target: any): any {
    EntityDescriptorBuilder.inherit(target);
}

/**
 * Class decorators to denote the schema to use for a class entity
 */
export function schema(name: string): any {
    return target => {
        EntityDescriptorBuilder.schema(target, name);
    };
}

/**
 * Class decorators to denote the connection name for a particular database
 */
export function connection(name: string, database: DatabaseType = DatabaseType.Unspecified): any {
    return target => {
        EntityDescriptorBuilder.connection(target, name, database);
    };
}

/**
 * Class decorators to denote the schema to use for a class entity
 */
export function source(type: DatabaseType): any {
    return target => {
        EntityDescriptorBuilder.source(target, type);
    };
}

/**
 * Decorator to exclude a column from certain database systems
 *
 * @returns {any}
 */
export function cache(...databases: DatabaseType[]): any {
    return target => {
        EntityDescriptorBuilder.cacheOrder(target, databases);
    };
}
