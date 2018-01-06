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


var cp, clone, assert,
    worldEncapsulator, thingEncapsulator,
    makeWorldEditor, makeWorld;

// 2d physics simulator
cp = require('chipmunk');
clone = require('clone');
assert = require('assert');


// creates an encapsulated physical simulation based on json world description
// simStepsPerSecond: simulation steps per second
makeWorld = function (worldDescriptionJSON, simOptions) {

    "use strict";

    var worldEditor;

    assert(typeof worldDescriptionJSON === "string",
            "phyzzie: error: world description must be a string.");
    assert(typeof simOptions === "object",
            "phyzzie: error: sim options must be an object.");

    worldEditor = makeWorldEditor(clone(simOptions));

    worldEditor.addThingsToWorld(worldDescriptionJSON);

    return worldEditor.getEncapsulatedWorld();
};

// adds things to world accoring to JSON things description
makeWorldEditor = function (simOptions) {

    "use strict";

    var that, thingsByName, encapsulatedThingsByName,
        addThing, createJoint,
        addThingsToWorld, world, enableSleep, getEncapsulatedWorld,
        mass, moment,
        bodyPosition, shapePosition, verts, shape, shapeData;

    enableSleep = false;

    world = new cp.Space();
    world.gravity = cp.v(0, -9.8);


    thingsByName = {};
    encapsulatedThingsByName = {};

    // create bodies and shapes
    addThing = function (thingDescription) {

        var body, bodyObj, width, height, radius, xCoordinate, yCoordinate;

        assert(typeof thingDescription === "object",
                "phyzzie: error: invalid description: thing must be an object.");
        assert(typeof thingDescription.id === "string",
                "phyzzie: error: invalid description: thing id must be a string.");
        assert(typeof thingDescription.options === "object",
                "phyzzie: error: invalid description: thing options must be an object.");
        assert(typeof thingDescription.options.body === "object",
                "phyzzie: error: invalid description: thing body must be an object.");

        assert(Array.isArray(thingDescription.options.body.position),
                "phyzzie: error: invalid description: thing body position must be an array.");
        assert(typeof thingDescription.options.body.position[0] === "number" && !isNaN(thingDescription.options.body.position[0]),
                "phyzzie: error: invalid description: thing body position must contain two numbers.");
        assert(typeof thingDescription.options.body.position[1] === "number" && !isNaN(thingDescription.options.body.position[1]),
                "phyzzie: error: invalid description: thing body position must contain two numbers.");
        assert(typeof thingDescription.options.body.angle === "number" && !isNaN(thingDescription.options.body.angle),
                "phyzzie: error: invalid description: thing body angle must be a number.");

        assert(typeof thingDescription.options.body.isStatic === "boolean" || thingDescription.options.body.isStatic === undefined,
                "phyzzie: error: invalid description: thing body isStatic setting must be a boolean or undefined.");

        assert(thingDescription.options.body.velocity === undefined,
                "phyzzie: error: invalid description: thing body velocity setting must be undefined.");
        assert(thingDescription.options.body.angularVelocity === undefined,
                "phyzzie: error: invalid description: thing body angularVelocity setting must be undefined.");

        ["density", "friction", "elasticity", "groupIndex", "layers"].map(function (setting) {
            assert((typeof thingDescription.options.shape[setting] === "number" && !isNaN(thingDescription.options.shape[setting])) || thingDescription.options.shape[setting] === undefined,
                    "phyzzie: error: invalid description: thing body shape " + setting + " setting must be a number or undefined.");
        });

        assert(thingDescription.options.shape.type === "box" || thingDescription.options.shape.type === "circle",
                "phyzzie: error: invalid description: thing shape type setting must be \"box\" or \"circle\".");

        if (thingDescription.options.shape.type === "box") {
            assert(typeof thingDescription.options.shape.height === "number" && !isNaN(thingDescription.options.shape.height),
                    "phyzzie: error: invalid description: thing shape height must be a number.");
            assert(typeof thingDescription.options.shape.width === "number" && !isNaN(thingDescription.options.shape.width),
                    "phyzzie: error: invalid description: thing shape width must be a number.");
        } else {
            assert(typeof thingDescription.options.shape.radius === "number" && !isNaN(thingDescription.options.shape.radius),
                    "phyzzie: error: invalid description: thing shape radius must be a number.");
        }

        assert(typeof thingDescription.options.shape.resize === "boolean" || thingDescription.options.shape.resize === undefined,
                "phyzzie: error: invalid description: thing shape resize setting must be a boolean or not included.");


        if (thingDescription.options.shape.density === undefined) {
            thingDescription.options.shape.density = 1.0;
        }
        if (thingDescription.options.shape.friction === undefined) {
            thingDescription.options.shape.friction = 0.5;
        }
        if (thingDescription.options.shape.elasticity === undefined) {
            thingDescription.options.shape.elasticity = 0.2;
        }
        if (thingDescription.options.shape.groupIndex === undefined) {
            thingDescription.options.shape.groupIndex = 0;
        }
        if (thingDescription.options.shape.layers === undefined) {
            thingDescription.options.shape.layers = cp.ALL_LAYERS;
        }


        if (thingDescription.options.shape.type === "circle") {

            mass = cpAreaForCircle(0, thingDescription.options.shape.radius) * thingDescription.options.shape.density;
            moment = cp.momentForCircle(mass, 0, thingDescription.options.shape.radius, cp.vzero);

        } else if (thingDescription.options.shape.type === "box") {

            mass =  thingDescription.options.shape.width * thingDescription.options.shape.height * thingDescription.options.shape.density;
            moment = cp.momentForBox(mass, thingDescription.options.shape.width, thingDescription.options.shape.height)

        } else {
            assert(false, "phyzzie: error: unsupported object shape: " + thingDescription.options.shape.type);
        }

        xCoordinate = thingDescription.options.body.position[0];
        yCoordinate = thingDescription.options.body.position[1];

        if (thingDescription.options.body.isStatic === true) {
            bodyPosition = cp.vzero
            shapePosition = cp.v(xCoordinate, yCoordinate);

            body = world.staticBody;

            shapeData = {"x": xCoordinate, "y": yCoordinate};

        } else {
            bodyPosition = cp.v(xCoordinate, yCoordinate);
            shapePosition = cp.vzero;

            body = new cp.Body(mass, moment);
            world.addBody(body);

            body.setPos(bodyPosition);
            body.setAngle(thingDescription.options.body.angle);

            shapeData = {};
        }


        if (thingDescription.options.shape.type === "circle") {
            shape = cpCircleShapeNew(body, thingDescription.options.shape.radius, shapePosition);

        } else if (thingDescription.options.shape.type === "box") {

            width = thingDescription.options.shape.width;
            height = thingDescription.options.shape.height;

            verts = [
                 width / 2,  height / 2,
                 width / 2, -height / 2,
                -width / 2, -height / 2,
                -width / 2,  height / 2
            ]

            // needd to allow for the case of a shape attached to global static body away from origin
            shape = new cp.PolyShape(body, verts, shapePosition);
        }

        shape.setFriction(thingDescription.options.shape.friction);
        shape.setElasticity(thingDescription.options.shape.elasticity);

        shape.setLayers(thingDescription.options.shape.layers);
        shape.group = thingDescription.options.shape.groupIndex;

        thingDescription.options.shape.__shapeData = shapeData;

        world.addShape(shape);


        thingsByName[thingDescription.id] = [body, thingDescription.options.shape];
        encapsulatedThingsByName[thingDescription.id] = thingEncapsulator(thingsByName[thingDescription.id]);
    };

    // creates joints (constraints)
    createJoint = function (jointDescription) {

        var joint, bodyA, bodyB, anchorLocation;

        assert(jointDescription.type === "revolute",
                "phyzzie: error: joint type must be \"revolute\".");
        assert(typeof jointDescription.bodyA === "string" && thingsByName[jointDescription.bodyA] !== undefined,
                "phyzzie: error: bodyA option must be the name of an existing object.");
        assert(typeof jointDescription.bodyB === "string" && thingsByName[jointDescription.bodyB] !== undefined,
                "phyzzie: error: bodyB option must be the name of an existing object.");

        assert(Array.isArray(jointDescription.anchor),
                "phyzzie: error: joint anchor must be an array.");
        assert(typeof jointDescription.anchor[0] === "number" && !isNaN(jointDescription.anchor[0]),
                "phyzzie: error: joint anchor array must contain two numbers.");
        assert(typeof jointDescription.anchor[1] === "number" && !isNaN(jointDescription.anchor[1]),
                "phyzzie: error: joint anchor array must contain two numbers.");

        bodyA = thingsByName[jointDescription.bodyA][0];
        bodyB = thingsByName[jointDescription.bodyB][0];

        if (jointDescription.type === "revolute") {

            anchorLocation = new cp.v(jointDescription.anchor[0], jointDescription.anchor[1]);
            joint = new cp.PivotJoint(bodyA, bodyB, anchorLocation);

        } else {
            assert(false, "phyzzie: error: unsupported constraint type: " + jointDescription.type);
        }

        world.addConstraint(joint);
    };

    // adds things to world accoring to world description
    addThingsToWorld = function (worldDescriptionJSON) {

        var worldDescription;

        worldDescription = JSON.parse(worldDescriptionJSON);

        assert(typeof worldDescription === "object",
                "phyzzie: error: invalid world description: JSON must define an object.");
        assert(Array.isArray(worldDescription.things),
                "phyzzie: error: invalid world description: JSON must define a things array.");
        assert(Array.isArray(worldDescription.joints) || worldDescription.joints === undefined,
                "phyzzie: error: invalid world description: if including joints, the joints member must be an array.");

        worldDescription.things.forEach(addThing);
        if (worldDescription.joints !== undefined) {
            worldDescription.joints.forEach(createJoint);
        }
    };

    // returns encapsulated world
    getEncapsulatedWorld = function () {
        return worldEncapsulator(world, encapsulatedThingsByName, simOptions);
    };

    that = {};
    that.addThingsToWorld = addThingsToWorld;
    that.getEncapsulatedWorld = getEncapsulatedWorld;

    return that;
};

// protects the world object from change
worldEncapsulator = function (world, encapsulatedThingsByName, simOptions) {

    "use strict";

    var that, step, getThings, newTicks,
        simStepsPerSecond, simStepsPerInteraction,
        interactionsPerSecond, iterationsPerSimStep,
        ticksUntilInteract;

    interactionsPerSecond   = simOptions.interactionsPerSecond;
    simStepsPerInteraction  = simOptions.simStepsPerInteraction;
    iterationsPerSimStep    = simOptions.iterationsPerSimStep;

    assert(typeof interactionsPerSecond === "number" && !isNaN(interactionsPerSecond) && interactionsPerSecond % 1 === 0,
            "phyzzie: error: invalid options: interactionsPerSecond must be an integer.");
    assert(typeof simStepsPerInteraction === "number" && !isNaN(simStepsPerInteraction) && simStepsPerInteraction % 1 === 0,
            "phyzzie: error: invalid options: simStepsPerInteraction must be an integer.");
    assert(typeof iterationsPerSimStep === "number" && !isNaN(iterationsPerSimStep) && iterationsPerSimStep % 1 === 0,
            "phyzzie: error: invalid options: iterationsPerSimStep must be an integer.");


    simStepsPerSecond = simStepsPerInteraction * interactionsPerSecond;

    world.setIterations(simOptions.iterationsPerSimStep);

    newTicks = 0;
    ticksUntilInteract = 0;

    step = function (timeDiff, interactionCallback, resolve, reject) {

        var continueSim;

        assert(typeof timeDiff === "number",
                "phyzzie: error: invalid timeDiff: " + timeDiff);

        assert(timeDiff >= 0, "phyzzie: error: reverse time travel not allowed.");

        newTicks += timeDiff / 1000 * simStepsPerSecond;

        while (Math.floor(newTicks) > 0) {

            if (ticksUntilInteract === 0) {
                continueSim = interactionCallback(getThings(), 1 / interactionsPerSecond, resolve, reject);

                assert(continueSim === true || continueSim === false,
                        "phyzzie: error: interaction callback must return true or false. This determines whether to continue the simulation.");

                if (continueSim === false) {
                    return false;
                }

                ticksUntilInteract += simStepsPerInteraction;
            }

            world.step(1 / simStepsPerSecond);

            newTicks -= 1;
            ticksUntilInteract -= 1;
        }

        return true;
    };

    // makes copy of things array
    // removing encapsulated things from copied array will not affect original array
    getThings = function () {

        var encapsulatedThingsByNameCopy;

        encapsulatedThingsByNameCopy = {};

        Object.keys(encapsulatedThingsByName).forEach(function (thingName) {
            encapsulatedThingsByNameCopy[thingName] = encapsulatedThingsByName[thingName];
        });

        return encapsulatedThingsByNameCopy;
    };

    that = {};
    that.step = step;
    that.getThings = getThings;

    return that;
};

// protects the body objects from change
thingEncapsulator = function (thing) {

    "use strict";

    var that, body, shape,
        getPosition, getAngle, getShape,
        getVelocity, getAngularVelocity, push;

    body = thing[0];
    shape = thing[1];

    getPosition = function () {
        var position;
        if (body.isStatic()) {
            position = shape.__shapeData;
        } else {
            position = body.getPos();
        }
        return [position.x, position.y];
    };
    getVelocity = function () {
        var velocity;
        velocity = body.getVel();
        return [velocity.x, velocity.y];
    };
    getAngle = function () {
        var angle;
        angle = body.getAngle();

        angle = angle % (2 * Math.PI);
        angle = (angle + (2 * Math.PI)) % (2 * Math.PI);

        return angle;
    };
    getAngularVelocity = function () {
        var angularVelocity;
        angularVelocity = body.getAngVel();
        return angularVelocity;
    };
    getShape = function () {
        return clone(shape);
    };
    push = function (impulse, impulseRadius) {
        var impulseVector, impulseLocationVector;

        assert(Array.isArray(impulse), "phyzzie: impulse: (" + impulse + ") must be a valid coordinate array.");
        assert(typeof impulse[0] === "number" && !isNaN(impulse[0]), "phyzzie: impulse: (" + impulse + ") is not a valid coordinate array.");
        assert(typeof impulse[1] === "number" && !isNaN(impulse[1]), "phyzzie: impulse: (" + impulse + ") is not a valid coordinate array.");

        if (impulseRadius !== undefined) {

            assert(Array.isArray(impulseRadius), "phyzzie: impulseRadius: (" + impulseRadius + ") must be a valid coordinate array or undefined.");
            assert(typeof impulseRadius[0] === "number" && !isNaN(impulseRadius[0]), "phyzzie: impulseRadius: (" + impulseRadius + ") is not a valid coordinate array.");
            assert(typeof impulseRadius[1] === "number" && !isNaN(impulseRadius[1]), "phyzzie: impulseRadius: (" + impulseRadius + ") is not a valid coordinate array.");

            impulseRadius = cp.v(impulseRadius[0], impulseRadius[1]);

        } else {
            impulseRadius = cp.v(0, 0);
        }

        impulseVector = new cp.v(impulse[0], impulse[1]);

        body.applyImpulse(impulseVector, impulseRadius);
    };

    that = {};
    that.getPosition = getPosition;
    that.getVelocity = getVelocity;
    that.getAngle = getAngle;
    that.getAngularVelocity = getAngularVelocity;
    that.getShape = getShape;
    that.push = push;

    return that;
};

module.exports = makeWorld;

