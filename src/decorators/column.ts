import { isNil, isString } from "lodash";
import { DatabaseType } from "../configuration";
import {
    EntityColumn, EntityColumnDataType, EntityDescriptorBuilder, EntityKeyGenerator,
    TimestampEvent
} from "../entity";
import { Constructable } from "@elevated/objects/lib/types";

function executeDescriptor(descriptor: any): any {
    if (descriptor) {
        return descriptor;
    }
}

function doColumnDecorator(target: any, descriptor: any, column: EntityColumn, isPrimaryKey: boolean): any {
    EntityDescriptorBuilder.column(target, column, isPrimaryKey);

    return executeDescriptor(descriptor);
}

function createColumnDescriptor(target: any, name: string, descriptor: any, order?: number): EntityColumn {
    if (!isNil(descriptor) && isNil(descriptor.get)) {
        throw new Error(`Only property accessor methods are allowed: ${name}`);
    }

    const typeMap = {
        Boolean: EntityColumnDataType.Boolean,
        Date: EntityColumnDataType.Date,
        Guid: EntityColumnDataType.Guid,
        Number: EntityColumnDataType.Number,
        String: EntityColumnDataType.String
    };

    const reflectedType = Reflect.getMetadata("design:type", target, name);
    const columnType = typeMap[reflectedType.name];

    return {
        name,
        type: isNil(columnType) ? EntityColumnDataType.Undetermined : columnType,
        order,
        exclusions: DatabaseType.Unspecified
    };
}

/**
 * Decorator to mark a property or method as a data column
 *
 * @returns {any}
 */
export function column(target: any, name: string, descriptor?: any): any {
    const column = createColumnDescriptor(target, name, descriptor);
    return doColumnDecorator(target, descriptor, column, false);
}

/**
 * Decorator to mark a property or method as a data column with a specific order
 *
 * @returns {any}
 */
export function columnOrder(order: number): any {
    return (target: any, name: string, descriptor?: any) => {
        EntityDescriptorBuilder.order(target, name, order);
        return executeDescriptor(descriptor);
    };
}

/**
 * Decorator to exclude a column from certain database systems
 *
 * @returns {any}
 */
export function exclude(...databases: DatabaseType[]): any {
    return (target: any, name: string, descriptor?: any) => {
        EntityDescriptorBuilder.exclusions(target, name, databases);
        return executeDescriptor(descriptor);
    };
}

/**
 * Decorator to define which primary key generator to use
 *
 * @returns {any}
 */
export function generator(type: EntityKeyGenerator): any {
    return (target: any, name: string, descriptor?: any) => {
        EntityDescriptorBuilder.generator(target, name, type);
        return executeDescriptor(descriptor);
    };
}

/**
 * Decorator to specify an index name that this column belongs to
 *
 * @returns {any}
 */
export function index(indexName: string = undefined): any {
    return (target: any, name: string, descriptor?: any) => {
        EntityDescriptorBuilder.index(target, name, isString(indexName) ? indexName : name);
        return executeDescriptor(descriptor);
    };
}

/**
 * Decorator to specify a column to only be used on specific database systems
 *
 * @returns {any}
 */
export function only(...databases: DatabaseType[]): any {
    return (target: any, name: string, descriptor?: any) => {
        EntityDescriptorBuilder.only(target, name, databases);
        return executeDescriptor(descriptor);
    };
}

/**
 * Decorator to mark a property or method as the primary key
 *
 * @returns {any}
 */
export function primaryKey(target: any, name: string, descriptor?: any): any {
    const column = createColumnDescriptor(target, name, descriptor);
    return doColumnDecorator(target, descriptor, column, true);
}

/**
 * Decorator to override the reflected data type
 *
 * @returns {any}
 */
export function type(columnType: EntityColumnDataType): any {
    return (target: any, name: string, descriptor?: any) => {
        EntityDescriptorBuilder.type(target, name, columnType);
        return executeDescriptor(descriptor);
    };
}


/**
 * Decorator to specify the entity a column that relates to the entity"s primary key
 *
 * @returns {any}
 */
export function relatesTo(entityClass: Constructable): any {
    return (target: any, name: string, descriptor?: any) => {
        EntityDescriptorBuilder.relatesTo(target, name, entityClass);
        return executeDescriptor(descriptor);
    };
}

/**
 * Decorator to mark a property or method as the primary key
 *
 * @returns {any}
 */
export function timestamp(event: TimestampEvent): any {
    return (target: any, name: string, descriptor?: any) => {
        EntityDescriptorBuilder.timestamp(target, name, event);
        return executeDescriptor(descriptor);
    };
}
