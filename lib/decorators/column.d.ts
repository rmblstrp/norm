import { DatabaseType } from "../configuration";
import { EntityColumnDataType, EntityKeyGenerator, TimestampEvent } from "../entity";
import { Constructable } from "@elevated/objects/lib/types";
export declare function column(target: any, name: string, descriptor?: any): any;
export declare function columnOrder(order: number): any;
export declare function exclude(...databases: DatabaseType[]): any;
export declare function generator(type: EntityKeyGenerator): any;
export declare function index(indexName?: string): any;
export declare function only(...databases: DatabaseType[]): any;
export declare function primaryKey(target: any, name: string, descriptor?: any): any;
export declare function type(columnType: EntityColumnDataType): any;
export declare function relatesTo(entityClass: Constructable): any;
export declare function timestamp(event: TimestampEvent): any;
