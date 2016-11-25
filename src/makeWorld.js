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


var Box2D, clone, assert,
    worldEncapsulator, thingEncapsulator,
    makeWorldEditor, makeWorld;

// 2d physics simulator
Box2D = require('./lib/Box2D-node.js');
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
            "phyzzie: error: options must be an object.");

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
        box2dSkinWidth, gravity;

    enableSleep = false;
    box2dSkinWidth = 0.005;

    gravity = new Box2D.b2Vec2(0, -9.8);
    world = new Box2D.b2World(gravity, enableSleep);


    thingsByName = {};
    encapsulatedThingsByName = {};

    // create bodies and shapes
    addThing = function (thingDescription) {

        var body, fixture, bodyObj, width, height, radius;

        body = new Box2D.b2BodyDef();

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

        ["density", "friction", "restitution", "groupIndex", "categoryBits", "maskBits"].map(function (setting) {
            assert((typeof thingDescription.options.fixture[setting] === "number" && !isNaN(thingDescription.options.fixture[setting])) || thingDescription.options.fixture[setting] === undefined,
                    "phyzzie: error: invalid description: thing body fixture " + setting + " setting must be a number or undefined.");
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


        if (thingDescription.options.body.isStatic === true) {
            body.type = Box2D.b2Body.b2_staticBody;
        } else {
            body.type = Box2D.b2Body.b2_dynamicBody;
        }

        body.position.x = thingDescription.options.body.position[0];
        body.position.y = thingDescription.options.body.position[1];
        body.angle      = thingDescription.options.body.angle;

        fixture = new Box2D.b2FixtureDef();
        fixture.density = thingDescription.options.fixture.density;
        fixture.friction = thingDescription.options.fixture.friction;
        fixture.restitution = thingDescription.options.fixture.restitution;
        fixture.filter.groupIndex = thingDescription.options.fixture.groupIndex;
        fixture.filter.categoryBits = thingDescription.options.fixture.categoryBits;
        fixture.filter.maskBits = thingDescription.options.fixture.maskBits;

        if (fixture.density === undefined) {
            fixture.density = 1.0;
        }
        if (fixture.friction === undefined) {
            fixture.friction = 0.5;
        }
        if (fixture.restitution === undefined) {
            fixture.restitution = 0.2;
        }
        if (fixture.filter.groupIndex === undefined) {
            fixture.filter.groupIndex = 0;
        }
        if (fixture.filter.categoryBits === undefined) {
            fixture.filter.categoryBits = 0x1;
        }
        if (fixture.filter.maskBits === undefined) {
            fixture.filter.maskBits = 0xFFFF;
        }

        if (thingDescription.options.shape.type === "circle") {
            radius = thingDescription.options.shape.radius;
            fixture.shape = new Box2D.b2CircleShape(radius);
        } else if (thingDescription.options.shape.type === "box") {
            width = thingDescription.options.shape.width;
            height = thingDescription.options.shape.height;
            if (thingDescription.options.shape.resize !== false) {
                width -= 2 * box2dSkinWidth;
                height -= 2 * box2dSkinWidth;
            }
            fixture.shape = new Box2D.b2PolygonShape();
            fixture.shape.SetAsBox(width / 2, height / 2);
        } else {
            assert(false, "phyzzie: error: unsupported object shape: " + thingDescription.options.shape.type);
        }

        bodyObj = world.CreateBody(body);
        bodyObj.CreateFixture(fixture);

        thingsByName[thingDescription.id] = [bodyObj, thingDescription.options.shape];
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

        anchorLocation = new Box2D.b2Vec2(jointDescription.anchor[0], jointDescription.anchor[1]);

        if (jointDescription.type === "revolute") {
            joint = new Box2D.b2RevoluteJointDef();
            joint.Initialize(bodyA, bodyB, anchorLocation);
        } else {
            assert(false, "phyzzie: error: unsupported constraint type: " + jointDescription.type);
        }

        world.CreateJoint(joint);
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
        worldDescription.joints.forEach(createJoint);
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

    assert(typeof interactionsPerSecond === "number" && !isNaN(interactionsPerSecond),
            "phyzzie: error: invalid options: interactionsPerSecond must be a number.");
    assert(typeof simStepsPerInteraction === "number" && !isNaN(simStepsPerInteraction),
            "phyzzie: error: invalid options: simStepsPerInteraction must be a number.");
    assert(typeof iterationsPerSimStep === "number" && !isNaN(iterationsPerSimStep),
            "phyzzie: error: invalid options: iterationsPerSimStep must be a number.");


    simStepsPerSecond = simStepsPerInteraction * interactionsPerSecond;

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

            // the Box2D function, not this function being defined
            world.Step(1 / simStepsPerSecond, iterationsPerSimStep, iterationsPerSimStep);

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
        position = body.GetPosition();
        return [position.x, position.y];
    };
    getVelocity = function () {
        var velocity;
        velocity = body.GetLinearVelocity();
        return [velocity.x, velocity.y];
    };
    getAngle = function () {
        var angle;
        angle = body.GetAngle();

        angle = angle % (2 * Math.PI);
        angle = (angle + (2 * Math.PI)) % (2 * Math.PI);

        return angle;
    };
    getAngularVelocity = function () {
        var angularVelocity;
        angularVelocity = body.GetAngularVelocity();
        return angularVelocity;
    };
    getShape = function () {
        return clone(shape);
    };
    push = function (impulse) {
        var impulseVector, impulseLocation;

        assert(Array.isArray(impulse), "phyzzie: " + impulse + " is not a valid coordinate array.");

        assert(typeof impulse[0] === "number" && !isNaN(impulse[0]), "phyzzie: " + impulse + " is not a valid coordinate array.");
        assert(typeof impulse[1] === "number" && !isNaN(impulse[1]), "phyzzie: " + impulse + " is not a valid coordinate array.");

        impulseVector = new Box2D.b2Vec2(impulse[0], impulse[1]);
        impulseLocation = body.GetWorldPoint(new Box2D.b2Vec2(0, 0));

        body.ApplyImpulse(impulseVector, impulseLocation);
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

