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

/*global document */

var setupGraphics, makeThingGraphics, getColors, PIXI, assert;

PIXI = require('pixi.js');
assert = require('assert');

setupGraphics = function (things, unparsedColors, options) {

    "use strict";

    var renderOptions, renderer, colors,
        stage, graphics, renderFunc,
        width, height, scale, lineWidth, targetDiv;

    assert(typeof options === "object" || options === undefined,
            "phyzzie: error: graphics options must be an object or undefined");

    options         = options               || {};
    width           = options.width         || 800;
    height          = options.height        || 600;
    scale           = options.scale         || 300;     // 300 pixels / meter
    lineWidth       = options.lineWidth     || 1;       // pixels
    targetDiv       = options.targetDiv     || "draw";
    renderOptions   = options.renderOptions || {"transparent": true};

    unparsedColors  = unparsedColors        || "{\"colors\": {}}";

    assert(typeof width === "number" && !isNaN(width),
            "phyzzie: error: width must be a number or undefined.");
    assert(typeof height === "number" && !isNaN(height),
            "phyzzie: error: height must be a number or undefined.");
    assert(typeof scale === "number" && !isNaN(scale),
            "phyzzie: error: scale must be a number or undefined.");
    assert(typeof lineWidth === "number" && !isNaN(lineWidth),
            "phyzzie: error: lineWidth must be a number or undefined.");
    assert(typeof targetDiv === "string",
            "phyzzie: error: targetDiv must be a string or undefined.");
    assert(typeof renderOptions === "object",
            "phyzzie: error: renderOptions must be an object or undefined.");

    renderer = PIXI.autoDetectRenderer(width, height, renderOptions);
    document.getElementById(targetDiv).appendChild(renderer.view);

    colors = JSON.parse(unparsedColors).colors;

    assert(typeof unparsedColors === "string",
            "phyzzie: error: colors must be a JSON string or undefined.");
    assert(colors !== undefined,
            "phyzzie: error: there must be a \"colors\" member of colors settings JSON.");
    assert(typeof colors === "object",
            "phyzzie: error: \"colors\" member of colors settings JSON must be an object.");

    stage = new PIXI.Container();

    // flip the Y axis so zero is at the bottom
    stage.scale = new PIXI.Point(1, -1);
    stage.position = new PIXI.Point(Math.floor(width / 2), height);

    graphics = new PIXI.Graphics();
    stage.addChild(graphics);

    Object.keys(things).forEach(function (thingName) {

        var thing;

        thing = things[thingName];

        thing.graphics = makeThingGraphics(thing.getShape(), colors[thingName], scale, lineWidth);
        graphics.addChild(thing.graphics);
    });

    renderFunc = function (doRenderBool) {

        // clean up
        if (doRenderBool === false) {
            document.getElementById(targetDiv).removeChild(renderer.view);
            renderer.destroy();
            return;
        }

        Object.keys(things).forEach(function (thingName) {

            var thing, position;

            thing = things[thingName];

            position = thing.getPosition();
            thing.graphics.position = new PIXI.Point(position[0] * scale, position[1] * scale);
            thing.graphics.rotation = thing.getAngle();
        });

        renderer.render(stage);
    };

    return renderFunc;
};

makeThingGraphics = function (shape, thingColor, scale, lineWidth) {

    "use strict";

    var pixiThing, pixiShape,
        width, height, shapeRadius,
        shapeColors;

    pixiThing = new PIXI.Graphics();
    pixiShape = new PIXI.Graphics();

    shapeColors = getColors(thingColor);

    pixiShape.lineStyle(lineWidth, shapeColors.line, 1);
    pixiShape.beginFill(shapeColors.fill);

    if (shape.type === "box") {

        width = shape.width * scale;
        height = shape.height * scale;

        pixiShape.drawRect(-width / 2, -height / 2, width, height);

    } else if (shape.type === "circle") {

        shapeRadius = shape.radius * scale;

        pixiShape.drawCircle(0, 0, shapeRadius);
    }

    pixiShape.position = new PIXI.Point(0, 0);
    pixiShape.rotation = 0;

    pixiShape.endFill();

    pixiThing.addChild(pixiShape);

    return pixiThing;
};

getColors = function (thingColor) {

    "use strict";

    var lineColor, fillColor;

    lineColor = 0x000000;
    fillColor = 0xFFFFFF;

    if (thingColor !== undefined) {

        assert(typeof thingColor.line === "string",
                "phyzzie: error: line color setting must be a string containing a number.");
        assert(typeof thingColor.fill === "string",
                "phyzzie: error: fill color setting must be a string containing a number.");

        lineColor = parseInt(thingColor.line, 16);
        fillColor = parseInt(thingColor.fill, 16);

        assert(typeof lineColor === "number" && !isNaN(lineColor),
                "phyzzie: error: line color setting must be a string containing a number.");
        assert(typeof fillColor === "number" && !isNaN(fillColor),
                "phyzzie: error: fill color setting must be a string containing a number.");
    }

    return {"line": lineColor, "fill": fillColor};
};

module.exports = setupGraphics;

