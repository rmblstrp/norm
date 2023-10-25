"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
class Random {
    static generateInt(unsigned = true) {
        const bytes = crypto_1.randomBytes(8);
        const value = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
        return (value < 0 && unsigned) ? -value : value;
    }
    static between(min, max) {
        return (Random.generateInt() % (max - min + 1)) + min;
    }
    static int(max) {
        return Random.between(0, max);
    }
}
exports.Random = Random;
