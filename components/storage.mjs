export const storageVersion = '2';

export function localSet(key, val) {
    try {
        if (window && window.localStorage && window.localStorage.setItem) {
            return window.localStorage.setItem(key + '_v' + storageVersion, JSON.stringify(val));
        }
    } catch (e) {}
    return false;
}

export function localGet(key, _val) {
    try {
        if (window.localStorage && window.localStorage.getItem) {
            const val = window.localStorage.getItem(key + '_v' + storageVersion);
            if (val !== null) {
                return JSON.parse(val);
            }
        }
    } catch (e) {}
    return _val;
}

export function localRemove(key) {
    try {
        if (window && window.localStorage && window.localStorage.removeItem) {
            return window.localStorage.removeItem(key + '_v' + storageVersion);
        }
    } catch (e) {}
    return false;
}
