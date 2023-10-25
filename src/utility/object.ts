import { isFunction, isNil, isObject } from "lodash";
import { StringCase, convertCase } from "@elevated/objects/lib/string/casing";

export class ObjectUtility {
    public static getPrototype(target: any): any {
        if (isFunction(target)) {
            return target.prototype;
        }
        else if (isObject(target)) {
            if (isNil(target.constructor)) {
                return Object.getPrototypeOf(target);
            }
        }

        return target;
    }

    public static flatten(source: object, separator = "_", keyStyle?: StringCase, prefix?: string): object {
        const result = {};

        function applyPrefix(name: string): string {
            return isNil(prefix) ? name : `${prefix}${separator}${name}`;
        }

        for (const key of Object.keys(source)) {
            const name = applyPrefix(convertCase(key, keyStyle));

            if (isObject(source[key]) && !(source[key] instanceof Date)) {
                Object.assign(result, ObjectUtility.flatten(source[key], separator, keyStyle, name));
            }
            else {
                result[name] = source[key];
            }
        }

        return result;
    }

    public static normalize(source: object, separator = "_", keyStyle?: StringCase, exclude: string[] = []): object {
        const result = {};

        for (const key of Object.keys(source)) {
            if (exclude.indexOf(key) >= 0) {
                result[key] = source[key];
                continue;
            }

            const segments = key.split(separator);
            let target = result;
            for (let index = 0; index < segments.length - 1; index++) {
                const segmentName = convertCase(segments[index], keyStyle);
                if (!isObject(target[segmentName])) {
                    target[segmentName] = {};
                }

                target = target[segmentName];
            }

            const segmentName = convertCase(segments[segments.length - 1], keyStyle);
            target[segmentName] = source[key];
        }

        return result;
    }
}
