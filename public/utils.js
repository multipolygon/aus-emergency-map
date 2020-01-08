
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

cookieVersion = '2'

function cookieSet(key, val) {
    // https://github.com/ScottHamper/Cookies
    return Cookies.set(key + '_v' + cookieVersion, JSON.stringify(val), { expires: 30 * 24 * 60 * 60 });
}

function cookieGet(key, _val) {
    var val = Cookies.get(key + '_v' + cookieVersion);
    if (val) {
        return JSON.parse(val);
    } else {
        return _val;
    }
}

function cookieDelete(key) {
    return Cookies.set(key + '_v' + cookieVersion, undefined);
}
