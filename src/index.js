
var isInBrowser, makeWorld, setupGraphics;


makeWorld = require('./makeWorld.js');

isInBrowser = require('is-in-browser').default;
if (isInBrowser === false) {
    setupGraphics = function () {
        "use strict";
        console.assert(isInBrowser !== false,
                "phyzzie: the setupGraphics function can only be used in the browser.");
    };
} else {
    setupGraphics = require('./setupGraphics.js');
}


module.exports.makeWorld = makeWorld;
module.exports.setupGraphics = setupGraphics;

