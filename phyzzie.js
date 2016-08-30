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


var p2, util, worldInit,
    worldEncapsulator, thingEncapsulator, multiStepWorld,
    makeWorldEditor, addThingsToWorld, makeWorld;

// 2d physics simulator
p2 = require('p2');
util = require('./lib/util.js');


// creates an encapsulated physical simulation based on json world description
// simStepsPerSecond: simulation steps per second
makeWorld = function (worldDescriptionJSON, simStepsPerSecond) {

    "use strict";

    var that, relaxation, world, worldEditor,
        encapsulatedWorld, encapsulatedThings;

    // https://github.com/schteppe/p2.js/issues/203
    relaxation = simStepsPerSecond / 15;
    p2.Equation.DEFAULT_RELAXATION = relaxation;

    world = new p2.World();

    worldEditor = makeWorldEditor(world);
    worldEditor.addThingsToWorld(worldDescriptionJSON);

    encapsulatedWorld = worldEncapsulator(world, simStepsPerSecond);
    encapsulatedThings = worldEditor.getEncapsulatedThingsByName();


    that = {};
    that.step = encapsulatedWorld.step;
    that.getThings = function () { return encapsulatedThings; };

    return that;
};

// adds things to world accoring to JSON things description
makeWorldEditor = function (world) {

    "use strict";

    var that, thingsByName, encapsulatedThingsByName, materials,
        addMaterial, addContactMaterial, addThing, createConstraint,
        addThingsToWorld, getEncapsulatedThingsByName;

    materials = {};
    thingsByName = {};
    encapsulatedThingsByName = {};

    // creates materials
    addMaterial = function (materialID) {

        console.assert(typeof materialID === "number" && !isNaN(materialID) && materialID % 1 === 0 && materialID > 0,
                "invalid material id (must be integer > 0): " + materialID);

        materials[materialID] = new p2.Material(materialID);
    };

    // creates materials contacts
    addContactMaterial = function (contactMaterialDescription) {

        var contactMaterial;

        console.assert(materials[contactMaterialDescription.materialA] !== undefined,
                "invalid contact material ID: " + contactMaterialDescription.materialA);
        console.assert(materials[contactMaterialDescription.materialB] !== undefined,
                "invalid contact material ID: " + contactMaterialDescription.materialB);

        contactMaterial = new p2.ContactMaterial(
            materials[contactMaterialDescription.materialA],
            materials[contactMaterialDescription.materialB],
            contactMaterialDescription.options
        );

        world.addContactMaterial(contactMaterial);
    };

    // create bodies and shapes
    addThing = function (thingDescription) {

        var body;

        body = new p2.Body(thingDescription.bodyOptions);

        thingDescription.shapes.forEach(function (shapeDescription) {

            var shape, ShapeConstructor, offset, angle;

            if (shapeDescription.type === "circle") {
                ShapeConstructor = p2.Circle;
            } else if (shapeDescription.type === "box") {
                ShapeConstructor = p2.Box;
            } else if (shapeDescription.type === "plane") {
                ShapeConstructor = p2.Plane;
            } else {
                console.assert(false, "error: unsupported object shape: " + shapeDescription.type);
            }

            shape = new ShapeConstructor(util.copy(shapeDescription.options));

            if (shapeDescription.materialID !== undefined) {
                shape.material = materials[shapeDescription.materialID];
            }

            offset = (shapeDescription.offset !== undefined) ? util.copy(shapeDescription.offset) : [0, 0];
            angle = (shapeDescription.angle !== undefined) ? shapeDescription.angle : 0;

            body.addShape(shape, offset, angle);
        });

        world.addBody(body);

        thingsByName[thingDescription.id] = [body, thingDescription.shapes];
        encapsulatedThingsByName[thingDescription.id] = thingEncapsulator(thingsByName[thingDescription.id]);
    };

    // creates constraints
    createConstraint = function (constraintDescription) {

        var constraint, ConstraintConstructor, bodyA, bodyB;

        if (constraintDescription.type === "distance") {
            ConstraintConstructor = p2.DistanceConstraint;
        } else if (constraintDescription.type === "prismatic") {
            ConstraintConstructor = p2.PrismaticConstraint;
        } else {
            console.assert(false, "error, unsupported constraint type: " + constraintDescription.type);
        }

        bodyA = thingsByName[constraintDescription.bodyA][0];
        bodyB = thingsByName[constraintDescription.bodyB][0];

        constraint = new ConstraintConstructor(bodyA, bodyB, constraintDescription.options);

        world.addConstraint(constraint);
    };

    // adds things to world accoring to world description
    addThingsToWorld = function (worldDescriptionJSON) {

        var worldDescription;

        worldDescription = JSON.parse(worldDescriptionJSON);

        worldDescription.materials.forEach(addMaterial);
        worldDescription.contactMaterials.forEach(addContactMaterial);
        worldDescription.things.forEach(addThing);
        worldDescription.constraints.forEach(createConstraint);
    };

    // returns encapsulated things by name
    getEncapsulatedThingsByName = function () {
        return encapsulatedThingsByName;
    };

    that = {};
    that.addMaterial = addMaterial;
    that.addContactMaterial = addContactMaterial;
    that.addThing = addThing;
    that.createConstraint = createConstraint;
    that.addThingsToWorld = addThingsToWorld;
    that.getEncapsulatedThingsByName = getEncapsulatedThingsByName;

    return that;
};

// protects the world object from change
worldEncapsulator = function (world, simStepsPerSecond) {

    "use strict";

    var that, step,
        prevElapsedTime, doneTicks;

    prevElapsedTime = 0;
    doneTicks = 0;

    step = function (elapsedTime) {

        var i, newTicks;

        console.assert(prevElapsedTime < elapsedTime, "worldPlatform error: backwards time travel not allowed.");

        newTicks = Math.abs(elapsedTime * (simStepsPerSecond / 1000) - doneTicks);

        for (i = 0; i < newTicks; i += 1) {
            world.step(1 / simStepsPerSecond);
        }

        doneTicks += newTicks;
        prevElapsedTime = elapsedTime;
    };

    that = {};
    that.step = step;

    return that;
};

// protects the body objects from change
thingEncapsulator = function (thing) {

    "use strict";

    var that, body, shapes,
        getPosition, getAngle, getShapes,
        pushRelative;

    body = thing[0];
    shapes = thing[1];

    getPosition = function () {
        return util.copy(body.position);
    };
    getAngle = function () {
        return util.copy(body.angle % (Math.PI * 2));
    };
    getShapes = function () {
        return util.copy(shapes);
    };
    pushRelative = function (x, y) {
        var forceVector;
        forceVector = p2.vec2.set(p2.vec2.create(), x, y);

        body.applyImpulseLocal(forceVector);
    };

    that = {};
    that.getPosition = getPosition;
    that.getAngle = getAngle;
    that.getShapes = getShapes;
    that.pushRelative = pushRelative;

    return that;
};

module.exports = makeWorld;

