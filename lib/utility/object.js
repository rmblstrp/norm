"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const casing_1 = require("@elevated/objects/lib/string/casing");
class ObjectUtility {
    static getPrototype(target) {
        if (lodash_1.isFunction(target)) {
            return target.prototype;
        }
        else if (lodash_1.isObject(target)) {
            if (lodash_1.isNil(target.constructor)) {
                return Object.getPrototypeOf(target);
            }
        }
        return target;
    }
    static flatten(source, separator = "_", keyStyle, prefix) {
        const result = {};
        function applyPrefix(name) {
            return lodash_1.isNil(prefix) ? name : `${prefix}${separator}${name}`;
        }
        for (const key of Object.keys(source)) {
            const name = applyPrefix(casing_1.convertCase(key, keyStyle));
            if (lodash_1.isObject(source[key]) && !(source[key] instanceof Date)) {
                Object.assign(result, ObjectUtility.flatten(source[key], separator, keyStyle, name));
            }
            else {
                result[name] = source[key];
            }
        }
        return result;
    }
    static normalize(source, separator = "_", keyStyle, exclude = []) {
        const result = {};
        for (const key of Object.keys(source)) {
            if (exclude.indexOf(key) >= 0) {
                result[key] = source[key];
                continue;
            }
            const segments = key.split(separator);
            let target = result;
            for (let index = 0; index < segments.length - 1; index++) {
                const segmentName = casing_1.convertCase(segments[index], keyStyle);
                if (!lodash_1.isObject(target[segmentName])) {
                    target[segmentName] = {};
                }
                target = target[segmentName];
            }
            const segmentName = casing_1.convertCase(segments[segments.length - 1], keyStyle);
            target[segmentName] = source[key];
        }
        return result;
    }
}
exports.ObjectUtility = ObjectUtility;
