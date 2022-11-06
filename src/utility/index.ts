export function isObject(data: any): boolean {
    try {
        Object.getPrototypeOf(data);
        return true;
    } catch (reason) {
        return false;
    }


}

export function delay(time = 1000) {
    return new Promise((resolve) => {
        setTimeout(() => {
            return resolve(true);
        }, time)
    });
}