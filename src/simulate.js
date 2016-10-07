// Copyright 2016 Andrew Engelbrecht
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/*global window,Promise */

var simulate, isInBrowser, makeWorld, setupGraphics;

isInBrowser = require('is-in-browser').default;
makeWorld = require('./makeWorld.js');

if (isInBrowser === false) {
    setupGraphics = function () {
        "use strict";
        console.assert(isInBrowser !== false,
                "phyzzie: the setupGraphics function can only be used in the browser.");
    };
} else {
    setupGraphics = require('./setupGraphics.js');
}


simulate = function (thingsDescription, colorsDescription, interactionCallback, options) {

    "use strict";

    var world, things, renderFunc, simTime, iterate, promise;

    world = makeWorld(thingsDescription, options.sim);
    things = world.getThings();

    options.graphics = options.graphics || {};
    if (options.graphics.display === true) {
        console.assert(isInBrowser !== false, "phyzzie: display mode can only be used within the browser.");
        renderFunc = setupGraphics(things, colorsDescription, options.graphics);
    }


    // virtual time for non-rendering mode only
    simTime = 0;

    iterate = function (resolve, reject) {

        var continueSim, now;

        if (options.graphics.display === true) {

            now = new Date();
            try {
                continueSim = world.step(now, interactionCallback, resolve, reject);
            } catch (e) {
                reject(e);
            }

            if (continueSim === true) {

                renderFunc(true);

                window.requestAnimationFrame(function () { iterate(resolve, reject); });
            } else {
                // clean up
                renderFunc(false);
            }

        } else {

            // faster than real time simulation
            simTime += options.sim.maxStepMilliseconds;

            try {
                continueSim = world.step(simTime, interactionCallback, resolve, reject);
            } catch (e) {
                reject(e);
            }

            if (continueSim === true) {
                if (typeof setImmediate === 'function') {
                    setImmediate(function () { iterate(resolve, reject); });
                } else {
                    // the 0ms is actually ignored and set to about 4ms or 10ms,
                    // depending on the browser
                    setTimeout(function () { iterate(resolve, reject); }, 0);
                }
            }
        }
    };

    promise = new Promise(iterate);

    return promise;
};

module.exports = simulate;

