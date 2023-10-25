import { StringCase } from "@elevated/objects/lib/string/casing";
export declare class ObjectUtility {
    static getPrototype(target: any): any;
    static flatten(source: object, separator?: string, keyStyle?: StringCase, prefix?: string): object;
    static normalize(source: object, separator?: string, keyStyle?: StringCase, exclude?: string[]): object;
}
