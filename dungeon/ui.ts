const canvasOverlay: HTMLDivElement = <HTMLDivElement>document.getElementById("canvas-hover-info");
const canvasWrapper: HTMLDivElement = <HTMLDivElement>document.getElementById("canvas-wrapper");

const canvases = document.getElementsByTagName("canvas");
const bgCanvas = canvases[0];
const bgCtx: CanvasRenderingContext2D = <CanvasRenderingContext2D>bgCanvas.getContext("2d");
const highlightCanvas = canvases[1];
const highlightCtx: CanvasRenderingContext2D = <CanvasRenderingContext2D>highlightCanvas.getContext("2d");
const pathCanvas = canvases[2];
const pathCtx: CanvasRenderingContext2D = <CanvasRenderingContext2D>pathCanvas.getContext("2d");
const surroundingInfoCanvas = canvases[3];
const surroundingInfoCtx: CanvasRenderingContext2D = <CanvasRenderingContext2D>surroundingInfoCanvas.getContext("2d");
const interactableCanvas = canvases[4];
const interactableCtx: CanvasRenderingContext2D = <CanvasRenderingContext2D>interactableCanvas.getContext("2d");

canvasWrapper.addEventListener("mousemove", showHoverInfo);
canvasWrapper.addEventListener("mouseleave", hideHoverInfo);
canvasWrapper.addEventListener("click", handleMouseClick);
canvasWrapper.addEventListener("dblclick", handleMouseDblClick);

document.getElementById("highlightBossCheck")?.addEventListener("change", highlightBossCheck);
document.getElementById("highlightStartCheck")?.addEventListener("change", highlightStartCheck);
document.getElementById("findPosition")?.addEventListener("click", findPosition);
document.getElementById("resetMaze")?.addEventListener("click", resetMaze);

let bossHighlighted: boolean = (<HTMLInputElement>document.getElementById("highlightBossCheck"))?.checked ?? false;
let startHighlighted: boolean = (<HTMLInputElement>document.getElementById("highlightStartCheck"))?.checked ?? false;


(<HTMLInputElement>document.getElementById("maxSteps")).addEventListener("change", updateMaxSteps);


let currentSelectedPosition: Vector2 = { x: -1, y: -1 };

function showHoverInfo(e: MouseEvent) {
    canvasOverlay.classList.remove("hidden");
    let { x, y } = getCanvasPosition(e);

    canvasOverlay.style.top = (y - 2) * rasterSize + "px";
    canvasOverlay.style.left = (x + 2) * rasterSize + "px";

    let xPos = <HTMLSpanElement>canvasOverlay.querySelector("#xPos");
    let yPos = <HTMLSpanElement>canvasOverlay.querySelector("#yPos");
    xPos.innerText = x.toString();
    yPos.innerText = y.toString();
    // let tile = <HTMLSpanElement>canvasOverlay.querySelector("#tileType");
    // tile.innerText = "";
}

function hideHoverInfo() {
    canvasOverlay?.classList.add("hidden");
}

function handleMouseClick(e: MouseEvent) {
    currentSelectedPosition = getCanvasPosition(e);
    hideError();
    resetInfo();
    showSurroundingInfo();
}

function getCanvasPosition(e: MouseEvent): Vector2 {
    let rect = interactableCanvas.getBoundingClientRect();

    let x: number = Math.floor((e.clientX - rect.left) / rasterSize);
    let y: number = Math.floor((e.clientY - rect.top) / rasterSize);

    return { x, y };
}

function handleMouseDblClick(e: MouseEvent) {
    let { x, y } = getCanvasPosition(e);
    hideError();
    resetInfo();
    startPosition = [x, y];
    resetPath();
}

/**
 * Hides the Error output. Should be called when a new calculation is started.
 */
function hideError() {
    errorDisplay.hidden = true;
}

/**
 * Draws a circle on the map to make it easier to spot the boss position.
 */
function highlightBoss() {
    if (bossPosition[0] < 0 || bossPosition[1] < 0) throw new Error("Invalid Boss Position");
    let p: Path2D = new Path2D();
    p.arc(bossPosition[0] * rasterSize, bossPosition[1] * rasterSize, rasterSize * 10, 0, 2 * Math.PI);
    highlightCtx.fillStyle = "rgba(255, 0, 0, 0.2)";
    highlightCtx.fill(p);
}

/**
 * Draws a circle on the map to make it easier to spot the selected starting position.
 */
function highlightStart(big: boolean = startHighlighted) {
    if (startPosition[0] < 0 || startPosition[1] < 0) throw new Error("Invalid Start Position");
    highlightCtx.fillStyle = "rgba(0, 0, 255, 0.2)";
    highlightCtx.strokeStyle = "rgba(0, 0, 255, 0.8)";
    let p: Path2D = new Path2D();
    p.rect(startPosition[0] * rasterSize, startPosition[1] * rasterSize, rasterSize, rasterSize);
    highlightCtx.stroke(p)
    if (big) p.arc(startPosition[0] * rasterSize, startPosition[1] * rasterSize, rasterSize * 10, 0, Math.PI * 2);
    highlightCtx.fill(p);
}

function highlightBossCheck(e: Event) {
    bossHighlighted = (<HTMLInputElement>e.target).checked;
    resetHighlights();
}
function highlightStartCheck(e: Event) {
    startHighlighted = (<HTMLInputElement>e.target).checked;
    resetHighlights();
}

function updateMaxSteps(this: HTMLInputElement, e: Event){
    maxSteps = +this.value;
}

function resetMaze() {
    hideError();
    for (let canvas of canvases) {
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }
    bgCtx.putImageData(imgData, 0, 0);
    resetHighlights();
}


function resetCanvas(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
}

function resetPath() {
    resetCanvas(pathCtx);
    resetHighlights();
}

function resetHighlights() {
    resetCanvas(highlightCtx);
    if (startPosition[0] >= 0 && startPosition[1] >= 0) highlightStart();
    if (bossHighlighted) highlightBoss();
}

function resetInfo() {
    resetCanvas(surroundingInfoCtx);

    if (currentSelectedPosition.x < 0 || currentSelectedPosition.y < 0) throw new Error("Invalid Selected Position");
    surroundingInfoCtx.fillStyle = "rgba(0, 255, 0, 0.2)";
    surroundingInfoCtx.strokeStyle = "rgba(0, 255, 0, 0.8)";
    let p: Path2D = new Path2D();
    p.rect(currentSelectedPosition.x * rasterSize, currentSelectedPosition.y * rasterSize, rasterSize, rasterSize);
    surroundingInfoCtx.stroke(p);
    surroundingInfoCtx.fill(p);
}


/**
 * draws a circle around the tiles that should be interacted with
 */
function highlightStop(position: Vector2, color: string = currentPathColor) {
    pathCtx.fillStyle = color;
    pathCtx.strokeStyle = color;
    pathCtx.setLineDash([]);
    pathCtx.lineWidth = 3;
    let p = new Path2D();
    p.arc(position.x * rasterSize + rasterSize / 2, position.y * rasterSize + rasterSize / 2, rasterSize, 0, Math.PI * 2);
    pathCtx.stroke(p);
}


/**
 * Draws a path (segment) onto the map
 */
function drawPath(path: [number, number][], fat: boolean = false, color?: string, dashed: boolean = false, directional: boolean = false) {
    let p: Path2D = new Path2D();
    let position = path[0] ?? [-1, -1];
    let offsetX = 0, offsetY = 0;
    p.moveTo(position[1] * rasterSize + rasterSize / 2, position[0] * rasterSize + rasterSize / 2);
    for (let i: number = 1; i < path.length; i++) {
        if (directional) {
            if (path.length - 1 == i || i == 0) {
                offsetX = offsetY = 0;
            } else {
                offsetY = Math.sign(path[i - 1][1] - path[i + 1][1]) * rasterSize / -4;
                offsetX = Math.sign(path[i - 1][0] - path[i + 1][0]) * rasterSize / 4;
            }
        }
        p.lineTo(path[i][1] * rasterSize + rasterSize / 2 + offsetX, path[i][0] * rasterSize + rasterSize / 2 + offsetY);
    }
    pathCtx.strokeStyle = color ?? `hsl(${Math.floor(Math.random() * 360)}, 70%, 40%)`;
    if (showProgress) pathCtx.strokeStyle = "black";
    if (fat) pathCtx.lineWidth = inputMazeType == "cw" ? 3 : 5;
    if (dashed) pathCtx.setLineDash([rasterSize / 2, rasterSize / 4]);
    pathCtx.stroke(p);
    pathCtx.lineWidth = 1;
    pathCtx.setLineDash([]);
}

function showSurroundingInfo() {
    let tile = maze[currentSelectedPosition.y][currentSelectedPosition.x];
    if (!tile) throw new Error("Not a valid tile");
    if (tile.type === TileType.WALL) throw new Error("Cannot calculate distances from a wall");

    let distances: Map<string, number> = new Map();
    let path: Vector2[] = [];
    surroundingInfoRecursive(currentSelectedPosition, path, distances, maxSteps);

    surroundingInfoCtx.strokeStyle = "rgba(0,0,0,0.5)";
    for (let pair of distances) {
        let pos = stringToVector(pair[0]);
        surroundingInfoCtx.strokeText(pair[1].toString(), pos.x * rasterSize + 2, (pos.y + 1) * rasterSize - 2, rasterSize);
    }
}

function surroundingInfoRecursive(position: Vector2, currentPath: Vector2[], distances: Map<string, number>, remainingSteps: number, currentSteps: number = 0) {
    if (remainingSteps < 0) return;
    let tile = maze[position.y][position.x];
    if (!tile) return;
    if (tile.type === TileType.WALL) return;
    if (currentPath.find(stop => stop.x === position.x && stop.y === position.y)) return;

    let newPath: Vector2[] = structuredClone(currentPath);
    newPath.push(position);

    let formerDistance = distances.get(vectorToString(position));
    if (formerDistance === undefined || formerDistance > currentSteps) {
        distances.set(vectorToString(position), currentSteps);
    } else {
        return;
    }

    surroundingInfoRecursive({ x: position.x - 1, y: position.y }, newPath, distances, remainingSteps - 1, currentSteps + 1);
    surroundingInfoRecursive({ x: position.x + 1, y: position.y }, newPath, distances, remainingSteps - 1, currentSteps + 1);
    surroundingInfoRecursive({ x: position.x, y: position.y - 1 }, newPath, distances, remainingSteps - 1, currentSteps + 1);
    surroundingInfoRecursive({ x: position.x, y: position.y + 1 }, newPath, distances, remainingSteps - 1, currentSteps + 1);
}