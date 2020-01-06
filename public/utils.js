
// https://stackoverflow.com/a/523293
function getSearchParam(paramName) {
    paramName = encodeURIComponent(paramName);
    var searchString = window.location.search.substring(1), i, val, params = searchString.split("&");
    for (i=0;i<params.length;i++) {
        val = params[i].split("=");
        if (val[0] == paramName) {
            return decodeURIComponent(val[1]);
        }
    }
    return null;
}

function objTreeSetProp(obj, prop, val, force) {
    if (typeof obj === 'object') {
        if (force || (prop in obj)) {
            obj[prop] = val;
        }
        for (var k in obj) {
            if (k != prop) {
                objTreeSetProp(obj[k], prop, val, force);
            }
        }
    }
};

function objPack(obj, prop, val) {
    var obj2 = {};
    for (var k in obj) {
        if (typeof obj[k] === 'object' && (!(prop in obj[k]) || obj[k][prop] === val)) {
            obj2[k] = objPack(obj[k], prop, val);
        }
    }
    return obj2;
};

function objUnpack(obj, target, callback) {
    if (typeof obj === 'object' && typeof target === 'object') {
        for (var k in obj) {
            if (!(k in target)) callback(target, k);
            if (typeof target[k] === 'object') {
                objUnpack(obj[k], target[k], callback);
            }
        }
    }
};
