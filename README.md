# phyzzie

This library simulates simple physical 2D worlds defined by json files.

Simulations may be run programatically using nodejs at accelerated speed or
rendered in the browser in real time. Use of this library in the browser
requires transpiling with browserify.

Phyzzie uses javascript promises and callbacks to complement its asynchronous
nature.

## Use

You may be interested in my [double inverted pendulum
demos](https://gitlab.com/sudoman/swirlnet-demos), which use phyzzie.

    doSimulation = function () {

        things = JSON.stringify(require('./examples/things.json'));
        colors = JSON.stringify(require('./examples/colors.json'));

        phyzzieOptions = {};
        phyzzieOptions.sim = {};
        phyzzieOptions.sim.interactionsPerSecond   = 60;
        phyzzieOptions.sim.simStepsPerInteraction  = 1;
        phyzzieOptions.sim.iterationsPerSimStep    = 10;
        phyzzieOptions.sim.maxStepMilliseconds     = 100;
        phyzzieOptions.graphics = {};

        phyzzieOptions.graphics.display            = false;

        //phyzzieOptions.graphics.height             = 600;
        //phyzzieOptions.graphics.width              = 800;
        //phyzzieOptions.graphics.scale              = 300;
        //phyzzieOptions.graphics.lineWidth          = 1;
        //phyzzieOptions.graphics.targetDiv          = "draw";
        //phyzzieOptions.graphics.renderOptions      = {"transparent": true};

        interactionCallback = function (things, deltaSimTime, resolve, reject) {

            p0  = things.thingName.getPosition();
            v0  = things.thingName.getVelocity();

            a0  = things.thingName.getAngle();
            av0 = things.thingName.getAngularVelocity();

            s0  = things.thingName.getShape();

            fx0 = Math.sqrt(p0);

            things.thingName.push([fx0, 0]);

            if (done) {

                // continue execution along the promise chain
                // (see further below)
                resolve(result);

                // then tell phyzzie to discontinue simulation loop
                return false;
            }

            if (error) {

                // tell the promise chain that something went wrong
                reject(error);

                return false;
            }

            // tell phyzzie to continue simulation loop
            return true;
        };

        resultsPromise = phyzzie(things, colors, interactionCallback, phyzzieOptions);

        return resultsPromise;
    };

    doSimulation().then(function (result) {
        console.log(result);
    }).catch(function (error) {
        console.log(error);
    });

## Licenses

This library is licensed under the Apache License, Version 2.0.

The chipmunk physics library is under the Expat / MIT License.

