// https://stackoverflow.com/questions/29046635/javascript-es6-cross-browser-detection#29046739

function test() {
    "use strict";

    if (typeof Symbol == "undefined") return false;
    try {
        eval("class Foo {}");
        eval("var bar = (x) => x+1");
    } catch (e) { return false; }

    return true;
}

if (test()) {
    // console.log('ES6 ok');
} else {
    alert('This app requires ES6 support to function properly.');
}
