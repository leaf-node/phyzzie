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


var setupGraphics, makeThingGraphics, getColors,
    $, PIXI, isInBrowser;

isInBrowser = require('is-in-browser').default;

if (isInBrowser === false) {
    module.exports = function () {

        "use strict";

        console.assert(isInBrowser !== false,
                "phyzzie: setupGraphics function can only be used in the browser.");
    };

    return;
}

PIXI = require('pixi.js');
$ = require('jquery');

setupGraphics = function (things, unparsedColors, options) {

    "use strict";

    var renderOptions, renderer, colors,
        stage, graphics, renderFunc,
        width, height, scale, lineWidth, targetDiv;

    options         = options               || {};
    width           = options.width         || 800;
    height          = options.height        || 600;
    scale           = options.scale         || 300;     // 300 pixels / meter
    lineWidth       = options.lineWidth     || 1;       // pixels
    targetDiv       = options.targetDiv     || "#draw";
    renderOptions   = options.renderOptions || {"transparent": true};

    renderer = PIXI.autoDetectRenderer(width, height, renderOptions);
    $(targetDiv).append(renderer.view);

    colors = JSON.parse(unparsedColors).colors;

    stage = new PIXI.Container();

    // flip the Y axis so zero is at the bottom
    stage.scale = new PIXI.Point(1, -1);
    stage.position = new PIXI.Point(0, height);

    graphics = new PIXI.Graphics();
    stage.addChild(graphics);

    Object.keys(things).forEach(function (thingName) {

        var thing;

        thing = things[thingName];

        thing.graphics = makeThingGraphics(thing.getShapes(), colors[thingName], scale, lineWidth);
        graphics.addChild(thing.graphics);
    });

    renderFunc = function () {

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

makeThingGraphics = function (shapes, thingColors, scale, lineWidth) {

    "use strict";

    var pixiThing;

    pixiThing = new PIXI.Graphics();

    Object.keys(shapes).forEach(function (shapeIndex) {

        var shape, pixiShape,
            shapeOffset, shapeX, shapeY,
            shapeAngle, width, height, shapeRadius,
            shapeColors;

        shape = shapes[shapeIndex];

        shapeOffset = shape.offset || [0, 0];
        shapeX = shapeOffset[0] * scale;
        shapeY = shapeOffset[1] * scale;

        shapeAngle = shape.angle || 0;


        shapeColors = getColors(thingColors, shapeIndex);

        pixiShape = new PIXI.Graphics();

        pixiShape.lineStyle(lineWidth, shapeColors.line, 1);
        pixiShape.beginFill(shapeColors.fill);

        if (shape.type === "box") {

            width = shape.options.width * scale;
            height = shape.options.height * scale;

            pixiShape.drawRect(-width / 2, -height / 2, width, height);

        } else if (shape.type === "circle") {

            shapeRadius = shape.options.radius * scale;

            pixiShape.drawCircle(0, 0, shapeRadius);

        } else if (shape.type === "plane") {

            pixiShape.moveTo(-1000, 0);
            pixiShape.lineTo(1000, 0);
        }

        pixiShape.position = new PIXI.Point(shapeX, shapeY);
        pixiShape.rotation = shapeAngle;

        pixiShape.endFill();

        pixiThing.addChild(pixiShape);
    });

    return pixiThing;
};

getColors = function (thingColors, shapeIndex) {

    "use strict";

    var lineColor, fillColor;

    lineColor = 0x000000;
    fillColor = 0xFFFFFF;

    if (thingColors !== undefined) {

        if (thingColors.defaults !== undefined) {

            lineColor = parseInt(thingColors.defaults.line, 16);
            fillColor = parseInt(thingColors.defaults.fill, 16);
        }

        if (thingColors.perShape !== undefined
                && thingColors.perShape[shapeIndex] !== undefined) {

            lineColor = parseInt(thingColors.perShape[shapeIndex].line, 16);
            fillColor = parseInt(thingColors.perShape[shapeIndex].fill, 16);
        }
    }

    return {"line": lineColor, "fill": fillColor};
};

module.exports = setupGraphics;

