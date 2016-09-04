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


var setupGraphics, makeThingGraphics, getColors, PIXI;

PIXI = require('pixi.js');

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
    targetDiv       = options.targetDiv     || "draw";
    renderOptions   = options.renderOptions || {"transparent": true};

    renderer = PIXI.autoDetectRenderer(width, height, renderOptions);
    document.getElementById(targetDiv).appendChild(renderer.view);

    colors = JSON.parse(unparsedColors).colors;

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

        lineColor = parseInt(thingColor.line, 16);
        fillColor = parseInt(thingColor.fill, 16);

    }

    return {"line": lineColor, "fill": fillColor};
};

module.exports = setupGraphics;

