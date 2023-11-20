export function getSearchParam(paramName) {
    // https://stackoverflow.com/a/523293
    paramName = encodeURIComponent(paramName);
    const searchString = window.location.search.substring(1);
    let i;
    let val;
    const params = searchString.split('&');
    for (i = 0; i < params.length; i++) {
        val = params[i].split('=');
        if (val[0] === paramName) {
            return decodeURIComponent(val[1]);
        }
    }
    return null;
}

export function objTreeSetProp(obj, prop, val) {
    if (obj && typeof obj === 'object') {
        if (prop in obj) {
            obj[prop] = val;
        }
        for (const k in obj) {
            if (k !== prop) {
                objTreeSetProp(obj[k], prop, val);
            }
        }
    }
}

export function objTreeGetProp(obj, prop) {
    const obj2 = {};
    if (prop in obj) {
        obj2[prop] = obj[prop];
    }
    for (const k in obj) {
        if (typeof obj[k] === 'object') {
            obj2[k] = objTreeGetProp(obj[k], prop);
        }
    }
    return obj2;
}

export function objTreeHasValue(obj, prop, val) {
    if (typeof obj === 'object') {
        if (prop in obj && obj[prop] === val) {
            return true;
        }
        for (const k in obj) {
            if (objTreeHasValue(obj[k], prop, val)) {
                return true;
            }
        }
    }
    return false;
}

export function objPack(obj, prop, val) {
    const obj2 = {};
    for (const k in obj) {
        if (obj[k] && typeof obj[k] === 'object' && (!(prop in obj[k]) || obj[k][prop] === val)) {
            obj2[k] = objPack(obj[k], prop, val);
        }
    }
    return obj2;
}

export function objMerge(obj, target, callback) {
    if (typeof obj === 'object' && typeof target === 'object') {
        for (const k in obj) {
            callback(obj, target, k);
            objMerge(obj[k], target[k], callback);
        }
    }
}
