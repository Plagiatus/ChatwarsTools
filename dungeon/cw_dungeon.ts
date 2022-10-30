enum TileType {
    PATH,
    WALL,
    BONFIRE,
    FOUNTAIN,
    TREASURE,
    MONSTER,
    FAMOUSPLACE,
    BOSS,
    UNKNOWN,
    FOUNTAINORTREASURE,
}

interface Tile {
    type: TileType,
    activated: boolean,
    visitCount: number,
}

interface TileWithSteps extends Tile {
    steps: number,
}

type InputType = "cw" | "jorg";

type LoadingAlgorithm = {
    [name in InputType]: Function;
};

let maze: Tile[][] = [];
let bossPosition: [number, number] = [-1, -1];
let startPosition: [number, number] = [-1, -1];

let rasterSize: number = 16;
let inputMazeType: InputType = "cw";

let imgData: ImageData = new ImageData(1, 1);

let overrideStopSearch: boolean = false;

const canvas = document.getElementsByTagName("canvas")[0];
const ctx: CanvasRenderingContext2D = <CanvasRenderingContext2D>canvas.getContext("2d");
document.getElementById("loadImage")?.addEventListener("click", loadImage);
document.getElementById("findPosition")?.addEventListener("click", findPosition);
document.getElementById("resetMaze")?.addEventListener("click", resetMaze);
document.getElementById("calculatePath")?.addEventListener("click", (e) => { calculatePath(e).catch(error => handleError(error)) });
document.getElementById("stopSearch")?.addEventListener("click", stopSearch);
document.getElementById("highlightBoss")?.addEventListener("click", highlightBoss);
document.getElementById("highlightStart")?.addEventListener("click", ()=>{highlightStart(true)});
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
    })
    //@ts-ignore
    let file = (<HTMLInputElement>document.getElementById("imageInput")).files[0];
    img.src = URL.createObjectURL(file);

}


let emptyMaze: Tile[][] = [];

const loadingAlgorithms: LoadingAlgorithm = {
    "cw": loadCWMaze,
    "jorg": loadJorgMaze,
}

function loadMaze(width: number, height: number) {
    imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.save();
    maze = [];
    emptyMaze = [];
    loadingAlgorithms[inputMazeType](width, height);
    console.log(maze);
    initCWNodes();
}

function loadJorgMaze(width: number, height: number) {
    let offsetX = 7;
    let offsetY = 9;
    for (let y: number = 0; y < height; y += rasterSize) {
        let row: Tile[] = [];
        emptyMaze.push([]);
        for (let x: number = 0; x < width; x += rasterSize) {
            let colors = getColorValuesForCoordinate(x + offsetX, y + offsetY, width);
            let type = colorToTileTypeJorg(colors);
            row.push({ type, activated: false, visitCount: 0 });

            if (type === TileType.BOSS) bossPosition = [x / rasterSize, y / rasterSize];
        }
        maze.push(row);
    }
}
function loadCWMaze(width: number, height: number) {
    for (let y: number = 0; y < height; y += rasterSize) {
        let row: Tile[] = [];
        emptyMaze.push([]);
        for (let x: number = 0; x < width; x += rasterSize) {
            let average: number[] = [];
            for (let subY: number = 0; subY < rasterSize; subY++) {
                for (let subX: number = 0; subX < rasterSize; subX++) {
                    let colors = getColorValuesForCoordinate(x + subX, y + subY, width);
                    for (let i: number = 0; i < colors.length; i++) {
                        average[i] = (average[i] ?? 0) + colors[i];
                    }
                }
            }
            for (let i: number = 0; i < average.length; i++) {
                average[i] /= rasterSize * rasterSize;
            }
            let type = colorToTileTypeCW(average);
            row.push({ type, activated: false, visitCount: 0 });

            if (type === TileType.BOSS) bossPosition = [x / rasterSize, y / rasterSize];
        }
        maze.push(row);
    }
}

function getColorValuesForCoordinate(x: number, y: number, width: number): number[] {
    const red = y * (width * 4) + x * 4;
    return [imgData.data[red], imgData.data[red + 1], imgData.data[red + 2], imgData.data[red + 3]];
}


interface AssArrTT {
    [key: string]: TileType;
}
const colorsToTypesJorg: AssArrTT = {
    "139,155,180,255": TileType.WALL,
    "255,255,255,255": TileType.PATH,
    "188,130,14,255": TileType.TREASURE,
    "255,210,78,255": TileType.BONFIRE,
    "161,242,255,255": TileType.FOUNTAIN,
    "247,83,150,255": TileType.MONSTER,
    "255,248,177,255": TileType.FAMOUSPLACE,
    "255,84,73,255": TileType.BOSS,
}

const colorsToTypesCW: Map<TileType, number[]> = new Map<TileType, number[]>([
    [TileType.WALL, [0, 0, 0, 255]],
    [TileType.PATH, [255, 255, 255, 255]],
    [TileType.TREASURE, [90, 173, 78, 255]],
    [TileType.BONFIRE, [223, 169, 48, 255]],
    [TileType.FOUNTAIN, [79, 196, 127, 255]],
    [TileType.MONSTER, [140, 127, 204, 255]],
    [TileType.FAMOUSPLACE, [65, 69, 204, 255]],
    [TileType.BOSS, [199, 76, 50, 255]],
])

function colorToTileTypeJorg(colors: number[]): TileType {
    let type = colorsToTypesJorg[colors.toString()];
    if (type !== undefined) return type;
    throw Error(`Tile could not be identified: ${colors.toString()}`);
}
function colorToTileTypeCW(colors: number[]): TileType {
    let differencesToColors: [TileType, number][] = [];
    for (let tileType of colorsToTypesCW.keys()) {
        let compare: number[] = <number[]>colorsToTypesCW.get(tileType);
        let distance = 0;
        for (let i: number = 0; i < colors.length; i++) {
            distance += Math.abs(colors[i] - compare[i]);
        }
        differencesToColors.push([tileType, distance]);
    }
    differencesToColors.sort((a, b) => { return a[1] - b[1] });
    let type = differencesToColors[0][0];

    if (type !== undefined) return type;
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
    for (let mazeY: number = 0; mazeY < maze.length; mazeY++) {
        for (let mazeX: number = 0; mazeX < maze[mazeY].length; mazeX++) {
            let found: boolean = true;
            for (let patternY: number = 0; patternY < pattern.length && found; patternY++) {
                for (let patternX: number = 0; patternX < pattern[patternY].length && found; patternX++) {
                    if (mazeY + patternY >= maze.length || mazeX + patternX >= maze[mazeY].length) {
                        found = false;
                        continue;
                    }
                    let mazeType = maze[mazeY + patternY][mazeX + patternX].type;
                    let patternType = pattern[patternY][patternX].type;
                    if (patternType === TileType.UNKNOWN) continue;
                    if (patternType === TileType.FOUNTAINORTREASURE) {
                        if (mazeType !== TileType.FOUNTAIN && mazeType !== TileType.TREASURE) {
                            found = false;
                        }
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
        throw new Error("Couldn't find the position on the map.")
    }
}

function outputFoundPosition(mazeX: number, mazeY: number, pattern: Tile[][]) {
    console.log("found position", mazeX, mazeY);

    ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
    ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
    ctx.fillRect(mazeX * rasterSize, mazeY * rasterSize, pattern[0].length * rasterSize, pattern.length * rasterSize);
    ctx.strokeRect(mazeX * rasterSize, mazeY * rasterSize, pattern[0].length * rasterSize, pattern.length * rasterSize);
}


const inputToTypes: AssArrTT = {
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
}
function parsePattern(): Tile[][] {
    let textInput: string = (<HTMLInputElement>document.getElementById("patternInput")).value;
    textInput = textInput.replace("You stopped and tried to mark your way on paper. You got a map like this:", "")
        .replace("Unfortunately, you ran out of space on a piece of paper. There's nowhere to draw some of the places you have visited", "")
        .replaceAll("🔲", "?").replaceAll("⬛️", "X").replaceAll("⬜️", ".").replaceAll("🟩", "U").replaceAll("🟦", "P").replaceAll("🟪", "M").replaceAll("🟥", "Z").replaceAll("🟧", "B").replaceAll("🟨", "?")
        .toUpperCase().trim();
    let textInputSplit: string[] = textInput.split("\n");
    let textInputFullySplit: string[][] = [];
    for (let i: number = 0; i < textInputSplit.length; i++) {
        textInputFullySplit.push(Array.from(textInputSplit[i]));
    }
    let length = textInputFullySplit[0].length;
    for (let i: number = 0; i < textInputFullySplit.length; i++) {
        if (textInputFullySplit[i].length != length) {
            throw new Error("Input is not the same distance everywhere.")
        }
    }
    let result: Tile[][] = [];

    for (let i: number = 0; i < textInputFullySplit.length; i++) {
        let row: Tile[] = [];
        for (let k: number = 0; k < length; k++) {
            let type: TileType = inputToTypes[textInputFullySplit[i][k]];
            if (type === undefined) throw new Error("unrecognized input token");
            row.push({ activated: false, visitCount: 0, type })
        }
        result.push(row);
    }

    return result;
}

function resetMaze() {
    hideError();
    ctx.putImageData(imgData, 0, 0);
}

function getCanvasPosition(e: MouseEvent) {
    let rect = canvas.getBoundingClientRect();
    hideError();
    let x: number = Math.floor((e.clientX - rect.left) / rasterSize);
    let y: number = Math.floor((e.clientY - rect.top) / rasterSize);

    startPosition = [x, y];
    highlightStart(false);
}


let foundPaths: [number, number][][] = [];
let progress = 0;
let shortestPathLegth = Infinity;
let maxSteps: number = 30;
let showProgress: boolean = false;
let doTheFastWay: boolean = false;
async function calculatePath(e: MouseEvent) {
    hideError();
    resetMaze();
    highlightBoss();
    highlightStart(false);
    overrideStopSearch = false;
    progress = 0;
    shortestPathLegth = Infinity;
    foundPaths = [];
    showProgress = (<HTMLInputElement>document.getElementById("showProgress")).checked;
    doTheFastWay = (<HTMLInputElement>document.getElementById("doTheFastWay")).checked;
    maxSteps = +(<HTMLInputElement>document.getElementById("maxSteps")).value;
    if (maze.length <= 0) throw new Error("Maze not loaded yet.")
    if (startPosition[0] < 0 || startPosition[1] < 0) throw new Error("Invalid Start Position");
    if (bossPosition[0] < 0 || bossPosition[1] < 0) throw new Error("Invalid Boss Position");
    if (maze[startPosition[1]][startPosition[0]].type === TileType.WALL) throw new Error("Start Position cannot be on a wall.");
    console.log("Start Calculating");
    (<HTMLButtonElement>e.target).disabled = true;


    let newMaze: TileWithSteps[][] = structuredClone(emptyMaze);
    let fullyExplored: any[][] = structuredClone(emptyMaze);

    newMaze[startPosition[1]][startPosition[0]] = tileToTileWithSteps(maze[startPosition[1]][startPosition[0]], maxSteps);
    await calculatePathRecursive(startPosition[0], startPosition[1], maxSteps, newMaze, [], fullyExplored);
    console.log("found", foundPaths.length);
    overrideStopSearch = false;
    updateProgress(true);
    if (showProgress)
        drawPaths();

    //show shortest path, but fatter
    foundPaths.sort((a, b) => { return a.length - b.length });
    if (foundPaths.length > 0) drawPath(foundPaths[0], true);

    (<HTMLButtonElement>e.target).disabled = false;
}

let antiBlockingCounter = 0;
async function calculatePathRecursive(x: number, y: number, stepsLeft: number, stateOfMaze: TileWithSteps[][], path: [number, number][], shortestPathToHere: number[][]) {
    if (overrideStopSearch) return;
    // if (doTheFastWay && shortestPathToHere[y][x] > stepsLeft) return;
    if (!stateOfMaze[y][x]) stateOfMaze[y][x] = tileToTileWithSteps(maze[y][x], stepsLeft);
    if (stepsLeft < 0) return;
    if (stateOfMaze[y][x].type === TileType.WALL) return;
    if (stateOfMaze[y][x].steps > stepsLeft) return;
    if (stateOfMaze[y][x].visitCount >= 2) return;
    if (path.length > shortestPathLegth) return;
    // if (shortestPathToHere[y][x] < path.length) return;
    // else shortestPathToHere[y][x] = path.length;
    if (doTheFastWay) {
        if (shortestPathToHere[y][x] > stepsLeft) return;
        else shortestPathToHere[y][x] = stepsLeft;
    }

    if (antiBlockingCounter++ > 1000) {
        await delay(1);
        antiBlockingCounter = 0;
    }

    let newPath: [number, number][] = structuredClone(path);
    newPath.push([y, x]);

    if (stateOfMaze[y][x].type === TileType.BOSS) {
        foundPaths.push(newPath);
        if (newPath.length < shortestPathLegth) shortestPathLegth = newPath.length;
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


    let newMaze: TileWithSteps[][] = structuredClone(stateOfMaze);
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
    } else {
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
        drawPath(path)
    }
}

function drawPath(path: [number, number][], fat: boolean = false, color?: string) {
    let p: Path2D = new Path2D();
    let position = path[0] ?? [-1, -1];
    p.moveTo(position[1] * rasterSize + rasterSize / 2, position[0] * rasterSize + rasterSize / 2);
    for (let i: number = 1; i < path.length; i++) {
        p.lineTo(path[i][1] * rasterSize + rasterSize / 2, path[i][0] * rasterSize + rasterSize / 2);
    }
    ctx.strokeStyle = color ?? `hsl(${Math.floor(Math.random() * 360)}, 70%, 40%)`;
    if (showProgress) ctx.strokeStyle = "black";
    if (fat) ctx.lineWidth = inputMazeType == "cw" ? 3 : 5;
    ctx.stroke(p);
    ctx.lineWidth = 1;
}

async function delay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => { resolve() }, ms)
    })
}

let progressOutput = <HTMLOutputElement>document.getElementById("progressOutput");
function updateProgress(done: boolean = false) {
    progressOutput.innerText = `found paths: ${foundPaths.length} - took ${progress++} steps`;
    if (done) progressOutput.innerText += " - done";
}

function tileToTileWithSteps(tile: Tile, steps: number): TileWithSteps {
    return { activated: tile.activated, steps, type: tile.type, visitCount: tile.visitCount }
}

function stopSearch() {
    hideError();
    overrideStopSearch = true;
}


let errorDisplay: HTMLParagraphElement = <HTMLParagraphElement>document.getElementById("error-message");

window.addEventListener("error", handleError);
window.addEventListener("unhandledrejection", handleError);

function handleError(ev: Event) {
    errorDisplay.hidden = false;
    if ((<ErrorEvent>ev).message) {
        errorDisplay.innerText = (<ErrorEvent>ev).message;
    }
    if ((<PromiseRejectionEvent>ev).reason) {
        errorDisplay.innerText = (<PromiseRejectionEvent>ev).reason;
    }
}

function hideError() {
    errorDisplay.hidden = true;
}

function highlightBoss() {
    if (bossPosition[0] < 0 || bossPosition[1] < 0) throw new Error("Invalid Boss Position");
    let p: Path2D = new Path2D();
    p.arc(bossPosition[0] * rasterSize, bossPosition[1] * rasterSize, rasterSize * 10, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
    ctx.fill(p);
}

function highlightStart(big: boolean = false) {
    if (startPosition[0] < 0 || startPosition[1] < 0) throw new Error("Invalid Start Position");
    ctx.fillStyle = "rgba(0, 0, 255, 0.2)";
    ctx.strokeStyle = "rgba(0, 0, 255, 0.8)";
    let p: Path2D = new Path2D();
    p.rect(startPosition[0] * rasterSize, startPosition[1] * rasterSize, rasterSize, rasterSize);
    ctx.stroke(p)
    if(big) p.arc(startPosition[0] * rasterSize, startPosition[1] * rasterSize, rasterSize * 10, 0, Math.PI * 2);
    ctx.fill(p);
}