
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

function objTreeSetProp(obj, prop, val) {
    if (typeof obj === 'object') {
        if (prop in obj) {
            obj[prop] = val;
        }
        for (var k in obj) {
            if (k != prop) {
                objTreeSetProp(obj[k], prop, val);
            }
        }
    }
};

function objTreeGetProp(obj, prop) {
    var obj2 = {};
    if (prop in obj) {
        obj2[prop] = obj[prop];
    }
    for (var k in obj) {
        if (typeof obj[k] === 'object') {
            obj2[k] = objTreeGetProp(obj[k], prop);
        }
    }
    return obj2;
};

function objTreeHasValue(obj, prop, val) {
    if (typeof obj === 'object') {
        if ((prop in obj) && obj[prop] === val) {
            return true;
        }
        for (var k in obj) {
            if (objTreeHasValue(obj[k], prop, val)) {
                return true;
            }
        }
    }
    return false;
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

function objMerge(obj, target, callback) {
    if (typeof obj === 'object' && typeof target === 'object') {
        for (var k in obj) {
            callback(obj, target, k);
            objMerge(obj[k], target[k], callback);
        }
    }
};

function parseHtmlData(html, sep) {
    return html.split(sep || '<br />').reduce(
        function (obj, line) {
            var pair = line.split(':');
            var k = pair.shift().trim().toLowerCase();
            obj[k] = pair.join(':').trim();
            return obj;
        },
        {}
    );
}

function parseTasDescription(s) {
    var re = '<th.*?>(.*?)<\/th><td.*?>(.*?)<\/td>';
    return s.match(new RegExp(re, 'g')).reduce(
        function (obj, m) {
            var e = m.match(new RegExp(re));
            if (e) {
                obj[e[1]] = e[2];
            }
            return obj
        },
        {}
    );
}

storageVersion = '2'

function localSet(key, val) {
    return localStorage.setItem(key + '_v' + storageVersion, JSON.stringify(val));
}

function localGet(key, _val) {
    var val = localStorage.getItem(key + '_v' + storageVersion);
    if (val !== null) {
        return JSON.parse(val);
    } else {
        return _val;
    }
}

function localRemove(key) {
    return localStorage.removeItem(key + '_v' + storageVersion);
}
