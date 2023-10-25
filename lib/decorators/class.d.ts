import { DatabaseType } from "../configuration";
import { StringCase } from "@elevated/objects/lib/string/casing";
export declare function entity(table?: string): any;
export declare function casing(casing: StringCase): any;
export declare function inherit(target: any): any;
export declare function schema(name: string): any;
export declare function connection(name: string, database?: DatabaseType): any;
export declare function source(type: DatabaseType): any;
export declare function cache(...databases: DatabaseType[]): any;
