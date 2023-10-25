import { randomBytes } from "crypto";

export class Random {
    public static generateInt(unsigned = true): number {
        const bytes = randomBytes(8);
        const value: number = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];

        return (value < 0 && unsigned) ? -value : value;
    }

    public static between(min: number, max: number): number {
        return (Random.generateInt() % (max - min + 1)) + min;

    }

    public static int(max: number): number {
        return Random.between(0, max);
    }
}
