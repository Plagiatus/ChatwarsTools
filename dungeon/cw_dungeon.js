"use strict";
var TileType;
(function (TileType) {
    TileType[TileType["PATH"] = 0] = "PATH";
    TileType[TileType["WALL"] = 1] = "WALL";
    TileType[TileType["BONFIRE"] = 2] = "BONFIRE";
    TileType[TileType["FOUNTAIN"] = 3] = "FOUNTAIN";
    TileType[TileType["TREASURE"] = 4] = "TREASURE";
    TileType[TileType["MONSTER"] = 5] = "MONSTER";
    TileType[TileType["FAMOUSPLACE"] = 6] = "FAMOUSPLACE";
    TileType[TileType["BOSS"] = 7] = "BOSS";
    TileType[TileType["UNKNOWN"] = 8] = "UNKNOWN";
    TileType[TileType["FOUNTAINORTREASURE"] = 9] = "FOUNTAINORTREASURE";
    TileType[TileType["NOTWALL"] = 10] = "NOTWALL";
})(TileType || (TileType = {}));
let maze = [];
let bossPosition = [-1, -1];
let startPosition = [-1, -1];
let bossHighlighted = document.getElementById("highlightBossCheck").checked ?? false;
let startHighlighted = document.getElementById("highlightStartCheck").checked ?? false;
let rasterSize = 16;
let inputMazeType = "cw";
let imgData = new ImageData(1, 1);
let overrideStopSearch = false;
const canvas = document.getElementsByTagName("canvas")[0];
const ctx = canvas.getContext("2d");
document.getElementById("loadImage")?.addEventListener("click", loadImage);
document.getElementById("findPosition")?.addEventListener("click", findPosition);
document.getElementById("resetMaze")?.addEventListener("click", resetMaze);
document.getElementById("calculatePath")?.addEventListener("click", (e) => { calculatePath(e).catch(error => handleError(error)); });
document.getElementById("stopSearch")?.addEventListener("click", stopSearch);
// document.getElementById("highlightBoss")?.addEventListener("click", highlightBoss);
// document.getElementById("highlightStart")?.addEventListener("click", ()=>{highlightStart(true)});
document.getElementById("highlightBossCheck")?.addEventListener("change", highlightBossCheck);
document.getElementById("highlightStartCheck")?.addEventListener("change", highlightStartCheck);
canvas.addEventListener("click", getCanvasPosition);
function loadImage() {
    hideError();
    let fd = new FormData(document.forms[0]);
    let mazeLayout = fd.get("mazeLayout");
    console.log(mazeLayout);
    switch (mazeLayout) {
        case "cw":
            rasterSize = 5;
            inputMazeType = "cw";
            break;
        case "jorg":
        default:
            rasterSize = 16;
            inputMazeType = "jorg";
            break;
    }
    let img = new Image();
    img.addEventListener("load", () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        loadMaze(img.width, img.height);
        resetMaze();
    });
    //@ts-ignore
    let file = document.getElementById("imageInput").files[0];
    if (!file)
        throw new Error("No File Selected");
    img.src = URL.createObjectURL(file);
}
let emptyMaze = [];
const loadingAlgorithms = {
    "cw": loadCWMaze,
    "jorg": loadJorgMaze,
};
function loadMaze(width, height) {
    imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.save();
    maze = [];
    emptyMaze = [];
    loadingAlgorithms[inputMazeType](width, height);
    console.log(maze);
    initCWNodes();
}
function loadJorgMaze(width, height) {
    let offsetX = 7;
    let offsetY = 9;
    for (let y = 0; y < height; y += rasterSize) {
        let row = [];
        emptyMaze.push([]);
        for (let x = 0; x < width; x += rasterSize) {
            let colors = getColorValuesForCoordinate(x + offsetX, y + offsetY, width);
            let type = colorToTileTypeJorg(colors);
            row.push({ type, activated: false, visitCount: 0 });
            if (type === TileType.BOSS)
                bossPosition = [x / rasterSize, y / rasterSize];
        }
        maze.push(row);
    }
}
function loadCWMaze(width, height) {
    for (let y = 0; y < height; y += rasterSize) {
        let row = [];
        emptyMaze.push([]);
        for (let x = 0; x < width; x += rasterSize) {
            let average = [];
            for (let subY = 0; subY < rasterSize; subY++) {
                for (let subX = 0; subX < rasterSize; subX++) {
                    let colors = getColorValuesForCoordinate(x + subX, y + subY, width);
                    for (let i = 0; i < colors.length; i++) {
                        average[i] = (average[i] ?? 0) + colors[i];
                    }
                }
            }
            for (let i = 0; i < average.length; i++) {
                average[i] /= rasterSize * rasterSize;
            }
            let type = colorToTileTypeCW(average);
            row.push({ type, activated: false, visitCount: 0 });
            if (type === TileType.BOSS)
                bossPosition = [x / rasterSize, y / rasterSize];
        }
        maze.push(row);
    }
}
function getColorValuesForCoordinate(x, y, width) {
    const red = y * (width * 4) + x * 4;
    return [imgData.data[red], imgData.data[red + 1], imgData.data[red + 2], imgData.data[red + 3]];
}
const colorsToTypesJorg = {
    "139,155,180,255": TileType.WALL,
    "255,255,255,255": TileType.PATH,
    "188,130,14,255": TileType.TREASURE,
    "255,210,78,255": TileType.BONFIRE,
    "161,242,255,255": TileType.FOUNTAIN,
    "247,83,150,255": TileType.MONSTER,
    "255,248,177,255": TileType.FAMOUSPLACE,
    "255,84,73,255": TileType.BOSS,
};
const colorsToTypesCW = new Map([
    [TileType.WALL, [0, 0, 0, 255]],
    [TileType.PATH, [255, 255, 255, 255]],
    [TileType.FOUNTAIN, [90, 173, 78, 255]],
    [TileType.BONFIRE, [223, 169, 48, 255]],
    [TileType.TREASURE, [79, 196, 127, 255]],
    [TileType.MONSTER, [140, 127, 204, 255]],
    [TileType.FAMOUSPLACE, [65, 69, 204, 255]],
    [TileType.BOSS, [199, 76, 50, 255]],
]);
function colorToTileTypeJorg(colors) {
    let type = colorsToTypesJorg[colors.toString()];
    if (type !== undefined)
        return type;
    throw Error(`Tile could not be identified: ${colors.toString()}`);
}
function colorToTileTypeCW(colors) {
    let differencesToColors = [];
    for (let tileType of colorsToTypesCW.keys()) {
        let compare = colorsToTypesCW.get(tileType);
        let distance = 0;
        for (let i = 0; i < colors.length; i++) {
            distance += Math.abs(colors[i] - compare[i]);
        }
        differencesToColors.push([tileType, distance]);
    }
    differencesToColors.sort((a, b) => { return a[1] - b[1]; });
    let type = differencesToColors[0][0];
    if (type !== undefined)
        return type;
    throw Error(`Tile could not be identified: ${colors.toString()}`);
}
function findPosition() {
    hideError();
    let pattern = parsePattern();
    if (pattern.length < 3 || pattern[0].length < 3) {
        throw new Error("Not enough input to calculate a position.");
    }
    if (maze.length < 1) {
        throw new Error("Maze not loaded yet.");
    }
    let foundAnything = false;
    for (let mazeY = 0; mazeY < maze.length; mazeY++) {
        for (let mazeX = 0; mazeX < maze[mazeY].length; mazeX++) {
            let found = true;
            for (let patternY = 0; patternY < pattern.length && found; patternY++) {
                for (let patternX = 0; patternX < pattern[patternY].length && found; patternX++) {
                    if (mazeY + patternY >= maze.length || mazeX + patternX >= maze[mazeY].length) {
                        found = false;
                        continue;
                    }
                    let mazeType = maze[mazeY + patternY][mazeX + patternX].type;
                    let patternType = pattern[patternY][patternX].type;
                    if (patternType === TileType.UNKNOWN)
                        continue;
                    if (patternType === TileType.FOUNTAINORTREASURE) {
                        if (mazeType !== TileType.FOUNTAIN && mazeType !== TileType.TREASURE) {
                            found = false;
                        }
                    }
                    else if (patternType === TileType.NOTWALL) {
                        if (mazeType === TileType.WALL)
                            found = false;
                    }
                    else if (patternType !== mazeType)
                        found = false;
                }
            }
            if (found) {
                outputFoundPosition(mazeX, mazeY, pattern);
                foundAnything = true;
            }
        }
    }
    if (!foundAnything) {
        throw new Error("Couldn't find the position on the map.");
    }
}
function outputFoundPosition(mazeX, mazeY, pattern) {
    console.log("found position", mazeX, mazeY);
    ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
    ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
    ctx.fillRect(mazeX * rasterSize, mazeY * rasterSize, pattern[0].length * rasterSize, pattern.length * rasterSize);
    ctx.strokeRect(mazeX * rasterSize, mazeY * rasterSize, pattern[0].length * rasterSize, pattern.length * rasterSize);
}
const inputToTypes = {
    "?": TileType.UNKNOWN,
    "X": TileType.WALL,
    "+": TileType.WALL,
    ".": TileType.PATH,
    " ": TileType.PATH,
    "B": TileType.BONFIRE,
    "F": TileType.FOUNTAIN,
    "T": TileType.TREASURE,
    "P": TileType.FAMOUSPLACE,
    "Z": TileType.BOSS,
    "U": TileType.FOUNTAINORTREASURE,
    "M": TileType.MONSTER,
    "N": TileType.NOTWALL,
};
function parsePattern() {
    let textInput = document.getElementById("patternInput").value;
    textInput = textInput.replace("You stopped and tried to mark your way on paper. You got a map like this:", "")
        .replace("Unfortunately, you ran out of space on a piece of paper. There's nowhere to draw some of the places you have visited", "")
        .replaceAll("🔲", "?").replaceAll("⬛️", "X").replaceAll("⬜️", ".").replaceAll("🟩", "U").replaceAll("🟦", "P").replaceAll("🟪", "M").replaceAll("🟥", "Z").replaceAll("🟧", "B").replaceAll("🟨", "N")
        .toUpperCase().trim();
    let textInputSplit = textInput.split("\n");
    let textInputFullySplit = [];
    for (let i = 0; i < textInputSplit.length; i++) {
        textInputFullySplit.push(Array.from(textInputSplit[i]));
    }
    let length = textInputFullySplit[0].length;
    for (let i = 0; i < textInputFullySplit.length; i++) {
        if (textInputFullySplit[i].length != length) {
            throw new Error("Input is not the same distance everywhere.");
        }
    }
    let result = [];
    for (let i = 0; i < textInputFullySplit.length; i++) {
        let row = [];
        for (let k = 0; k < length; k++) {
            let type = inputToTypes[textInputFullySplit[i][k]];
            if (type === undefined)
                throw new Error("unrecognized input token");
            row.push({ activated: false, visitCount: 0, type });
        }
        result.push(row);
    }
    return result;
}
function resetMaze() {
    hideError();
    ctx.putImageData(imgData, 0, 0);
    if (startPosition[0] >= 0 && startPosition[1] >= 0)
        highlightStart();
    if (bossHighlighted)
        highlightBoss();
}
function getCanvasPosition(e) {
    let rect = canvas.getBoundingClientRect();
    hideError();
    let x = Math.floor((e.clientX - rect.left) / rasterSize);
    let y = Math.floor((e.clientY - rect.top) / rasterSize);
    startPosition = [x, y];
    resetMaze();
}
let foundPaths = [];
let progress = 0;
let shortestPathLegth = Infinity;
let maxSteps = 30;
let showProgress = false;
let doTheFastWay = false;
async function calculatePath(e) {
    hideError();
    resetMaze();
    highlightBoss();
    highlightStart(false);
    overrideStopSearch = false;
    progress = 0;
    shortestPathLegth = Infinity;
    foundPaths = [];
    showProgress = document.getElementById("showProgress").checked;
    doTheFastWay = document.getElementById("doTheFastWay").checked;
    maxSteps = +document.getElementById("maxSteps").value;
    if (maze.length <= 0)
        throw new Error("Maze not loaded yet.");
    if (startPosition[0] < 0 || startPosition[1] < 0)
        throw new Error("Invalid Start Position");
    if (bossPosition[0] < 0 || bossPosition[1] < 0)
        throw new Error("Invalid Boss Position");
    if (maze[startPosition[1]][startPosition[0]].type === TileType.WALL)
        throw new Error("Start Position cannot be on a wall.");
    console.log("Start Calculating");
    e.target.disabled = true;
    let newMaze = structuredClone(emptyMaze);
    let fullyExplored = structuredClone(emptyMaze);
    newMaze[startPosition[1]][startPosition[0]] = tileToTileWithSteps(maze[startPosition[1]][startPosition[0]], maxSteps);
    await calculatePathRecursive(startPosition[0], startPosition[1], maxSteps, newMaze, [], fullyExplored);
    console.log("found", foundPaths.length);
    overrideStopSearch = false;
    updateProgress(true);
    if (showProgress)
        drawPaths();
    //show shortest path, but fatter
    foundPaths.sort((a, b) => { return a.length - b.length; });
    if (foundPaths.length > 0)
        drawPath(foundPaths[0], true);
    e.target.disabled = false;
}
let antiBlockingCounter = 0;
async function calculatePathRecursive(x, y, stepsLeft, stateOfMaze, path, shortestPathToHere) {
    if (overrideStopSearch)
        return;
    // if (doTheFastWay && shortestPathToHere[y][x] > stepsLeft) return;
    if (!stateOfMaze[y][x])
        stateOfMaze[y][x] = tileToTileWithSteps(maze[y][x], stepsLeft);
    if (stepsLeft < 0)
        return;
    if (stateOfMaze[y][x].type === TileType.WALL)
        return;
    if (stateOfMaze[y][x].steps > stepsLeft)
        return;
    if (stateOfMaze[y][x].visitCount >= 2)
        return;
    if (path.length > shortestPathLegth)
        return;
    // if (shortestPathToHere[y][x] < path.length) return;
    // else shortestPathToHere[y][x] = path.length;
    if (doTheFastWay) {
        if (shortestPathToHere[y][x] > stepsLeft)
            return;
        else
            shortestPathToHere[y][x] = stepsLeft;
    }
    if (antiBlockingCounter++ > 1000) {
        await delay(1);
        antiBlockingCounter = 0;
    }
    let newPath = structuredClone(path);
    newPath.push([y, x]);
    if (stateOfMaze[y][x].type === TileType.BOSS) {
        foundPaths.push(newPath);
        if (newPath.length < shortestPathLegth)
            shortestPathLegth = newPath.length;
        console.log("found path");
        if (!showProgress)
            drawPath(path);
        return;
    }
    if (showProgress) {
        // visualise path
        resetMaze();
        drawPath(newPath);
        await delay(0);
    }
    let newMaze = structuredClone(stateOfMaze);
    newMaze[y][x].visitCount = newMaze[y][x].visitCount + 1;
    if ((newMaze[y][x].type === TileType.BONFIRE || newMaze[y][x].type === TileType.FOUNTAIN) && !newMaze[y][x].activated) {
        stepsLeft = maxSteps;
        newMaze[y][x].activated = true;
    }
    updateProgress();
    //attempt to make it move in the correct direction first.
    let deltaX = bossPosition[0] - x;
    let deltaY = bossPosition[1] - y;
    let xDirection = Math.sign(deltaX) || 1;
    let yDirection = Math.sign(deltaY) || 1;
    // let promisesToAwait: Promise<void>[] = [];
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        await calculatePathRecursive(x + xDirection, y, stepsLeft - 1, newMaze, newPath, shortestPathToHere);
        await calculatePathRecursive(x, y + yDirection, stepsLeft - 1, newMaze, newPath, shortestPathToHere);
        await calculatePathRecursive(x, y - yDirection, stepsLeft - 1, newMaze, newPath, shortestPathToHere);
        await calculatePathRecursive(x - xDirection, y, stepsLeft - 1, newMaze, newPath, shortestPathToHere);
    }
    else {
        await calculatePathRecursive(x, y + yDirection, stepsLeft - 1, newMaze, newPath, shortestPathToHere);
        await calculatePathRecursive(x + xDirection, y, stepsLeft - 1, newMaze, newPath, shortestPathToHere);
        await calculatePathRecursive(x - xDirection, y, stepsLeft - 1, newMaze, newPath, shortestPathToHere);
        await calculatePathRecursive(x, y - yDirection, stepsLeft - 1, newMaze, newPath, shortestPathToHere);
    }
    // shortestPathToHere[y][x] = true;
    // await Promise.all(promisesToAwait);
    // old attempt
    // await calculatePathRecursive(x + 1, y, stepsLeft - 1, newMaze, newPath);
    // await calculatePathRecursive(x - 1, y, stepsLeft - 1, newMaze, newPath);
    // await calculatePathRecursive(x, y + 1, stepsLeft - 1, newMaze, newPath);
    // await calculatePathRecursive(x, y - 1, stepsLeft - 1, newMaze, newPath);
}
function drawPaths() {
    resetMaze();
    for (let path of foundPaths) {
        drawPath(path);
    }
}
function drawPath(path, fat = false, color, dashed = false) {
    let p = new Path2D();
    let position = path[0] ?? [-1, -1];
    p.moveTo(position[1] * rasterSize + rasterSize / 2, position[0] * rasterSize + rasterSize / 2);
    for (let i = 1; i < path.length; i++) {
        p.lineTo(path[i][1] * rasterSize + rasterSize / 2, path[i][0] * rasterSize + rasterSize / 2);
    }
    ctx.strokeStyle = color ?? `hsl(${Math.floor(Math.random() * 360)}, 70%, 40%)`;
    if (showProgress)
        ctx.strokeStyle = "black";
    if (fat)
        ctx.lineWidth = inputMazeType == "cw" ? 3 : 5;
    if (dashed)
        ctx.setLineDash([rasterSize / 2, rasterSize / 4]);
    ctx.stroke(p);
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
}
async function delay(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => { resolve(); }, ms);
    });
}
let progressOutput = document.getElementById("progressOutput");
function updateProgress(done = false) {
    progressOutput.innerText = `found paths: ${foundPaths.length} - took ${progress++} steps`;
    if (done)
        progressOutput.innerText += " - done";
}
function tileToTileWithSteps(tile, steps) {
    return { activated: tile.activated, steps, type: tile.type, visitCount: tile.visitCount };
}
function stopSearch() {
    hideError();
    overrideStopSearch = true;
}
let errorDisplay = document.getElementById("error-message");
window.addEventListener("error", handleError);
window.addEventListener("unhandledrejection", handleError);
function handleError(ev) {
    errorDisplay.hidden = false;
    if (ev.message) {
        errorDisplay.innerText = ev.message;
    }
    if (ev.reason) {
        errorDisplay.innerText = ev.reason;
    }
}
function hideError() {
    errorDisplay.hidden = true;
}
function highlightBoss() {
    if (bossPosition[0] < 0 || bossPosition[1] < 0)
        throw new Error("Invalid Boss Position");
    let p = new Path2D();
    p.arc(bossPosition[0] * rasterSize, bossPosition[1] * rasterSize, rasterSize * 10, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
    ctx.fill(p);
}
function highlightStart(big = startHighlighted) {
    if (startPosition[0] < 0 || startPosition[1] < 0)
        throw new Error("Invalid Start Position");
    ctx.fillStyle = "rgba(0, 0, 255, 0.2)";
    ctx.strokeStyle = "rgba(0, 0, 255, 0.8)";
    let p = new Path2D();
    p.rect(startPosition[0] * rasterSize, startPosition[1] * rasterSize, rasterSize, rasterSize);
    ctx.stroke(p);
    if (big)
        p.arc(startPosition[0] * rasterSize, startPosition[1] * rasterSize, rasterSize * 10, 0, Math.PI * 2);
    ctx.fill(p);
}
function highlightBossCheck(e) {
    bossHighlighted = e.target.checked;
    resetMaze();
}
function highlightStartCheck(e) {
    startHighlighted = e.target.checked;
    resetMaze();
}
//# sourceMappingURL=cw_dungeon.js.map