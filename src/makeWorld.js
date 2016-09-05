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


var Box2D, util, worldInit,
    worldEncapsulator, thingEncapsulator, multiStepWorld,
    makeWorldEditor, addThingsToWorld, makeWorld;

// 2d physics simulator
Box2D = require('./lib/Box2D-node.js');
util = require('./lib/util.js');


// creates an encapsulated physical simulation based on json world description
// simStepsPerSecond: simulation steps per second
makeWorld = function (worldDescriptionJSON, simOptions) {

    "use strict";

    var worldEditor;

    worldEditor = makeWorldEditor(util.copy(simOptions));

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
            console.assert(false, "error: unsupported object shape: " + thingDescription.options.shape.type);
        }

        bodyObj = world.CreateBody(body);
        bodyObj.CreateFixture(fixture);

        thingsByName[thingDescription.id] = [bodyObj, thingDescription.options.shape];
        encapsulatedThingsByName[thingDescription.id] = thingEncapsulator(thingsByName[thingDescription.id]);
    };

    // creates joints (constraints)
    createJoint = function (jointDescription) {

        var joint, bodyA, bodyB, anchorLocation;

        bodyA = thingsByName[jointDescription.bodyA][0];
        bodyB = thingsByName[jointDescription.bodyB][0];

        anchorLocation = new Box2D.b2Vec2(jointDescription.anchor[0], jointDescription.anchor[1]);

        if (jointDescription.type === "revolute") {
            joint = new Box2D.b2RevoluteJointDef();
            joint.Initialize(bodyA, bodyB, anchorLocation);
        } else {
            console.assert(false, "error, unsupported constraint type: " + jointDescription.type);
        }

        world.CreateJoint(joint);
    };

    // adds things to world accoring to world description
    addThingsToWorld = function (worldDescriptionJSON) {

        var worldDescription;

        worldDescription = JSON.parse(worldDescriptionJSON);

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

    var that, step, getThings, newTicks, prevTime,
        simStepsPerSecond, simStepsPerInteraction,
        maxStepMilliseconds, interactionsPerSecond,
        ticksUntilInteract;

    interactionsPerSecond   = simOptions.interactionsPerSecond;
    simStepsPerInteraction  = simOptions.simStepsPerInteraction;
    maxStepMilliseconds     = simOptions.maxStepMilliseconds;


    simStepsPerSecond = simStepsPerInteraction * interactionsPerSecond;

    newTicks = 0;
    ticksUntilInteract = 0;

    step = function (currentTime, interactionCallback, resolve, reject) {

        var timeDiff, continueSim;

        // first call to .step()
        if (prevTime === undefined) {
            prevTime = currentTime;
            return true;
        }

        timeDiff = currentTime - prevTime;

        console.assert(timeDiff >= 0, "phyzzie error: reverse time travel not allowed.");

        if (timeDiff > maxStepMilliseconds) {
            timeDiff = maxStepMilliseconds;
        }

        newTicks += timeDiff / 1000 * simStepsPerSecond;

        while (Math.floor(newTicks) > 0) {

            if (ticksUntilInteract === 0) {
                continueSim = interactionCallback(getThings(), 1 / interactionsPerSecond, resolve, reject);

                console.assert(continueSim === true || continueSim === false,
                        "phyzzie: interaction callback must return true or false. This determines whether to continue the simulation.");

                if (continueSim === false) {
                    return false;
                }

                ticksUntilInteract += simStepsPerInteraction;
            }

            // the Box2D function, not this function being defined
            world.Step(1 / simStepsPerSecond, 10, 10);

            newTicks -= 1;
            ticksUntilInteract -= 1;
        }

        prevTime = currentTime;

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
        getVelocity, push;

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
        angle = angle + (2 * Math.PI) % (2 * Math.PI);

        return angle;
    };
    getShape = function () {
        return util.copy(shape);
    };
    push = function (impulse) {
        var impulseVector, impulseLocation;

        console.assert(Array.isArray(impulse), "phyzzie: " + impulse + " is not a valid coordinate array.");

        console.assert(typeof impulse[0] === "number" && !isNaN(impulse[0]), "phyzzie: " + impulse + " is not a valid coordinate array.");
        console.assert(typeof impulse[1] === "number" && !isNaN(impulse[1]), "phyzzie: " + impulse + " is not a valid coordinate array.");

        impulseVector = new Box2D.b2Vec2(impulse[0], impulse[1]);
        impulseLocation = body.GetWorldPoint(new Box2D.b2Vec2(0, 0));

        body.ApplyImpulse(impulseVector, impulseLocation);
    };

    that = {};
    that.getPosition = getPosition;
    that.getVelocity = getVelocity;
    that.getAngle = getAngle;
    that.getShape = getShape;
    that.push = push;

    return that;
};

module.exports = makeWorld;

