import { firestore } from "firebase-admin";
import { DateTime } from "luxon";

export function isObject(data: any): boolean {
    try {
        Object.getPrototypeOf(data);
        return true;
    } catch (reason) {
        return false;
    }


}
export function getTimestamp() {
    return DateTime.fromISO(new Date().toISOString()).toSeconds()
    // return firestore.FieldValue.serverTimestamp();
}
export function getRandomNumber(digit: number): string {
    let chars = "0123456789";
    let number = [...Array(digit)].map(
        (i) => chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    return number;
}
export function delay(time = 1000) {
    return new Promise((resolve) => {
        setTimeout(() => {
            return resolve(true);
        }, time)
    });
}