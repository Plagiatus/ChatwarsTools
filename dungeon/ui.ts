const canvasOverlay: HTMLDivElement = <HTMLDivElement>document.getElementById("canvas-hover-info");
const canvasWrapper: HTMLDivElement = <HTMLDivElement>document.getElementById("canvas-wrapper");

const canvasRenderingContexts: Map<string, CanvasRenderingContext2D> = new Map();
initCanvases();

canvasWrapper.addEventListener("mousemove", showHoverInfo);
canvasWrapper.addEventListener("mouseleave", hideHoverInfo);
canvasWrapper.addEventListener("mousedown", handleMouseClick);
canvasWrapper.addEventListener("dblclick", handleMouseDblClick);
canvasWrapper.addEventListener("contextmenu", (e) => { e.preventDefault(); });

document.getElementById("findPosition")?.addEventListener("click", findPosition);
document.getElementById("resetMaze")?.addEventListener("click", resetMaze);
document.getElementById("disabledSave")?.addEventListener("click", saveDisabledToStorage);
document.getElementById("disabledLoad")?.addEventListener("click", loadDisabledFromStorage);
document.getElementById("exportImage")?.addEventListener("click", exportImage);

let currentSelectedPosition: Vector2 = { x: -1, y: -1 };

let currentlyDisplayedPaths: PathWithColor[] = [];
let currentlyDisplayedPathNodes: CWNode[] = [];

interface PathWithColor {
    path: Vector2[],
    color: string,
    id: number,
}

function initCanvases() {
    canvasRenderingContexts.set("bg", document.createElement("canvas").getContext("2d")!);
    canvasRenderingContexts.set("disabled", document.createElement("canvas").getContext("2d")!);
    canvasRenderingContexts.set("highlight", document.createElement("canvas").getContext("2d")!);
    canvasRenderingContexts.set("positionFinder", document.createElement("canvas").getContext("2d")!);
    canvasRenderingContexts.set("path", document.createElement("canvas").getContext("2d")!);
    canvasRenderingContexts.set("surroundingInfo", document.createElement("canvas").getContext("2d")!);
    canvasRenderingContexts.set("interactable", document.createElement("canvas").getContext("2d")!);

    for (let ctx of canvasRenderingContexts.values()) {
        canvasWrapper.appendChild(ctx.canvas);
        ctx.canvas.width = ctx.canvas.height = 0;
        ctx.canvas.hidden = true;
    }
}

function showHoverInfo(e: MouseEvent) {
    canvasOverlay.classList.remove("hidden");
    let { x, y } = getCanvasPosition(e);
    if (y > maze.length - 1 || x > maze[y].length - 1) return hideHoverInfo();

    let wrapperRect = canvasWrapper.getBoundingClientRect();
    let orientation: number = Math.sign((wrapperRect.width / 2) - e.clientX);

    canvasOverlay.style.top = Math.min(wrapperRect.height - canvasOverlay.getBoundingClientRect().height - 20, Math.max(0, (y - 2) * rasterSize)) + "px";
    if (orientation > 0) {
        canvasOverlay.style.left = (x + 2) * rasterSize + "px";
    } else {
        canvasOverlay.style.left = (x - 1) * rasterSize - 100 + "px";
    }

    let xPos = <HTMLSpanElement>canvasOverlay.querySelector("#xPos");
    let yPos = <HTMLSpanElement>canvasOverlay.querySelector("#yPos");
    xPos.innerText = x.toString();
    yPos.innerText = y.toString();
    let tile = <HTMLSpanElement>canvasOverlay.querySelector("#tileType");
    tile.innerText = tileTypeToString(maze[y][x].type);

    let { paths, nodes } = findActivePathsAtThisPosition({ x, y });
    // showHoveredPathInfo(paths, nodes);
    const pathWrapper = <HTMLDivElement>canvasOverlay.querySelector("#paths");
    pathWrapper.innerHTML = "";
    for(let path of paths){
        pathWrapper.innerHTML += `<span class="path-color" style="background: ${path.color};"></span> <span class="path-number">${path.id}</span><br>`
    }
}

function hideHoverInfo() {
    canvasOverlay?.classList.add("hidden");
}

function handleMouseClick(e: MouseEvent) {
    e.preventDefault();
    switch (e.button) {
        case 0:
            let newPosition = getCanvasPosition(e);
            if (vectorEquals(newPosition, currentSelectedPosition)) {
                resetInfo(false);
                currentSelectedPosition.x = -1;
            } else {
                currentSelectedPosition = newPosition;
                resetInfo();
                showSurroundingInfo();
            }
            break;
        case 2:
            toggleVisited(e);
            break;
    }
}

function getCanvasPosition(e: MouseEvent): Vector2 {
    let rect = canvasRenderingContexts.get("interactable")!.canvas.getBoundingClientRect();

    let x: number = Math.floor((e.clientX - rect.left) / rasterSize);
    let y: number = Math.floor((e.clientY - rect.top) / rasterSize);

    return { x, y };
}

function handleMouseDblClick(e: MouseEvent) {
    let { x, y } = getCanvasPosition(e);
    resetInfo(false);
    startPosition = [x, y];
    if (settings.startResetsPath) resetPath();
    else resetHighlights();
}

/**
 * Draws a circle on the map to make it easier to spot the boss position.
 */
function highlightBoss() {
    if (bossPosition[0] < 0 || bossPosition[1] < 0) throw new Error("Invalid Boss Position");
    let p: Path2D = new Path2D();
    p.arc(bossPosition[0] * rasterSize, bossPosition[1] * rasterSize, rasterSize * 10, 0, 2 * Math.PI);
    let highlightCtx = canvasRenderingContexts.get("highlight")!;
    highlightCtx.fillStyle = "rgba(255, 0, 0, 0.2)";
    highlightCtx.fill(p);
}

/**
 * Draws a circle on the map to make it easier to spot the selected starting position.
 */
function highlightStart(big: boolean = settings.startHighlighted) {
    if (startPosition[0] < 0 || startPosition[1] < 0) throw new Error("Invalid Start Position");
    let highlightCtx = canvasRenderingContexts.get("highlight")!;
    highlightCtx.fillStyle = "rgba(0, 0, 255, 0.2)";
    highlightCtx.strokeStyle = "rgba(0, 0, 255, 0.8)";
    let p: Path2D = new Path2D();
    p.rect(startPosition[0] * rasterSize, startPosition[1] * rasterSize, rasterSize, rasterSize);
    highlightCtx.stroke(p)
    if (big) p.arc(startPosition[0] * rasterSize, startPosition[1] * rasterSize, rasterSize * 10, 0, Math.PI * 2);
    highlightCtx.fill(p);
}

function resetMaze() {
    for (let ctx of canvasRenderingContexts.values()) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    disabledTiles = new Set();

    canvasRenderingContexts.get("bg")!.putImageData(imgData, 0, 0);
    resetHighlights();
}


function resetCanvas(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function resetPath() {
    resetCanvas(canvasRenderingContexts.get("path")!);
    // resetHighlights();
}

function resetHighlights() {
    resetCanvas(canvasRenderingContexts.get("highlight")!);
    if (startPosition[0] >= 0 && startPosition[1] >= 0) highlightStart();
    if (settings.bossHighlighted && bossPosition[0] >= 0 && bossPosition[1] >= 0) highlightBoss();
}

function resetInfo(showCurrentPosition: boolean = true) {
    let surroundingInfoCtx = canvasRenderingContexts.get("surroundingInfo")!;
    resetCanvas(surroundingInfoCtx);

    if (!showCurrentPosition) return;
    if (currentSelectedPosition.x < 0 || currentSelectedPosition.y < 0) throw new Error("Invalid Selected Position");
    surroundingInfoCtx.fillStyle = "rgba(0, 255, 0, 0.2)";
    surroundingInfoCtx.strokeStyle = "rgba(0, 255, 0, 0.8)";
    let p: Path2D = new Path2D();
    if (currentSelectedPosition.x === startPosition[0] && currentSelectedPosition.y === startPosition[1]) {
        //draw only halve the box, because start Position is in the same place
        p.moveTo(currentSelectedPosition.x * rasterSize, currentSelectedPosition.y * rasterSize);
        p.lineTo((currentSelectedPosition.x + 1) * rasterSize, currentSelectedPosition.y * rasterSize);
        p.lineTo((currentSelectedPosition.x + 1) * rasterSize, (currentSelectedPosition.y + 1) * rasterSize);
        p.lineTo(currentSelectedPosition.x * rasterSize, currentSelectedPosition.y * rasterSize);
    } else {
        p.rect(currentSelectedPosition.x * rasterSize, currentSelectedPosition.y * rasterSize, rasterSize, rasterSize);
    }
    surroundingInfoCtx.stroke(p);
    surroundingInfoCtx.fill(p);
}

let disabledTiles: Set<string> = new Set();
function resetDisabled() {
    let ctx = canvasRenderingContexts.get("disabled")!;
    resetCanvas(ctx);

    let path: Path2D = new Path2D();
    for (let pos of disabledTiles) {
        let { x, y } = stringToVector(pos);
        path.moveTo(x * rasterSize, y * rasterSize);
        path.lineTo((x + 1) * rasterSize, (y + 1) * rasterSize);
        path.moveTo((x + 1) * rasterSize, y * rasterSize);
        path.lineTo(x * rasterSize, (y + 1) * rasterSize);
    }
    ctx.strokeStyle = "rgba(255,0,0,0.7)";
    ctx.lineWidth = 3;
    ctx.stroke(path);
}


/**
 * draws a circle around the tiles that should be interacted with
 */
function highlightStop(position: Vector2, color: string = currentPathColor) {
    let pathCtx = canvasRenderingContexts.get("path")!;
    pathCtx.fillStyle = color;
    pathCtx.strokeStyle = color;
    pathCtx.setLineDash([]);
    pathCtx.lineWidth = 3;
    let p = new Path2D();
    p.arc(position.x * rasterSize + rasterSize / 2, position.y * rasterSize + rasterSize / 2, rasterSize, 0, Math.PI * 2);
    pathCtx.stroke(p);
}

interface PathDrawingOptions {
    fat?: boolean,
    color?: string,
    dashed?: boolean,
    directional?: boolean,
    randomOffset?: boolean,
}
/**
 * Draws a path (segment) onto the map
 */
function drawPath(path: [number, number][], options?: PathDrawingOptions) {
    options = { ...{ fat: false, dashed: false, directional: false, randomOffset: settings.scribbleLines, }, ...options };
    let p: Path2D = new Path2D();
    let position = path[0] ?? [-1, -1];
    let offsetX = 0, offsetY = 0;
    p.moveTo(position[1] * rasterSize + rasterSize / 2, position[0] * rasterSize + rasterSize / 2);
    for (let i: number = 1; i < path.length; i++) {
        offsetX = offsetY = 0;
        if (options.directional) {
            if (path.length - 1 == i || i == 0) {
                offsetX = offsetY = 0;
            } else {
                offsetY = Math.sign(path[i - 1][1] - path[i + 1][1]) * rasterSize / -4;
                offsetX = Math.sign(path[i - 1][0] - path[i + 1][0]) * rasterSize / 4;
            }
        }
        if (options.randomOffset) {
            let maxOffset: number = rasterSize / (options.directional ? 4 : 2);
            offsetX += Math.floor(Math.random() * maxOffset * 2) - maxOffset;
            offsetY += Math.floor(Math.random() * maxOffset * 2) - maxOffset;
        }
        p.lineTo(path[i][1] * rasterSize + rasterSize / 2 + offsetX, path[i][0] * rasterSize + rasterSize / 2 + offsetY);
    }
    let pathCtx = canvasRenderingContexts.get("path")!;
    pathCtx.strokeStyle = options.color ?? `hsl(${Math.floor(Math.random() * 360)}, 70%, 40%)`;
    if (showProgress) pathCtx.strokeStyle = "black";
    if (options.fat) pathCtx.lineWidth = inputMazeType == "cw" ? 3 : 5;
    if (options.dashed) pathCtx.setLineDash([rasterSize / 2, rasterSize / 4]);
    pathCtx.stroke(p);
    pathCtx.lineWidth = 1;
    pathCtx.setLineDash([]);
}

function showSurroundingInfo() {
    if (!maze || !maze.length) throw new Error("Maze isn't loaded yet.");
    if (!maze[currentSelectedPosition.y] || !maze[currentSelectedPosition.x]) return;
    let tile = maze[currentSelectedPosition.y][currentSelectedPosition.x];
    if (!tile) throw new Error("Not a valid tile");
    if (tile.type === TileType.WALL) throw new Error("Cannot calculate distances from a wall");

    let distances: Map<string, number> = new Map();
    let path: Vector2[] = [];
    surroundingInfoRecursive(currentSelectedPosition, path, distances, settings.maxSteps);

    let surroundingInfoCtx = canvasRenderingContexts.get("surroundingInfo")!;
    surroundingInfoCtx.fillStyle = "rgba(0,0,0,0.9)";
    surroundingInfoCtx.strokeStyle = "rgba(255,255,255,0.7)";
    surroundingInfoCtx.lineWidth = 2;
    for (let pair of distances) {
        let pos = stringToVector(pair[0]);
        surroundingInfoCtx.strokeText(pair[1].toString(), pos.x * rasterSize + 2, (pos.y + 1) * rasterSize - 2, rasterSize);
        surroundingInfoCtx.fillText(pair[1].toString(), pos.x * rasterSize + 2, (pos.y + 1) * rasterSize - 2, rasterSize);
    }
}

function surroundingInfoRecursive(position: Vector2, currentPath: Vector2[], distances: Map<string, number>, remainingSteps: number, currentSteps: number = 0) {
    if (remainingSteps < 0) return;
    let tile = maze[position.y][position.x];
    if (!tile) return;
    if (tile.type === TileType.WALL) return;
    if (currentPath.find(stop => vectorEquals(stop, position))) return;

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

function toggleVisited(e: MouseEvent) {
    let position = getCanvasPosition(e);
    let stringPos = vectorToString(position);
    if (disabledTiles.has(stringPos)) {
        disabledTiles.delete(stringPos);
    } else {
        disabledTiles.add(stringPos);
    }
    needsRecalculation = true;
    resetDisabled();
}

let disabledStorageInfoTimeout: number;
const disabledSaveOutput: HTMLSpanElement = document.getElementById("disabledSaveOutput")!;
function saveDisabledToStorage() {
    localStorage.setItem("disabled", Array.from(disabledTiles).join(";"));
    showDisabledOutput("Saved.")
}

function loadDisabledFromStorage() {
    let newDisabled: string[] = (localStorage.getItem("disabled") ?? "").split(";");
    for (let d of newDisabled) {
        disabledTiles.add(d);
    }
    resetDisabled();
    showDisabledOutput("Loaded.")
}

function showDisabledOutput(message: string) {
    disabledSaveOutput.innerText = message;
    if (disabledStorageInfoTimeout) {
        clearTimeout(disabledStorageInfoTimeout);
    }
    disabledStorageInfoTimeout = setTimeout(() => { disabledSaveOutput.innerText = "" }, 1000);
}

function tileTypeToString(type: TileType): string {
    if (type === TileType.BONFIRE) return "Bonfire";
    if (type === TileType.BOSS) return "Boss";
    if (type === TileType.FAMOUSPLACE) return "Famous Place";
    if (type === TileType.FOUNTAIN) return "Fountain";
    if (type === TileType.MONSTER) return "Monster";
    if (type === TileType.PATH) return "Path";
    if (type === TileType.TREASURE) return "Treasure";
    if (type === TileType.WALL) return "Wall";
    return "unknown";
}

function exportImage() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const bgCtx = canvasRenderingContexts.get("bg")!;
    canvas.width = bgCtx.canvas.width;
    canvas.height = bgCtx.canvas.height;

    for (let c of canvasRenderingContexts.values()) {
        ctx.drawImage(c.canvas, 0, 0, canvas.height, canvas.width);
    }

    const link = document.createElement("a");
    link.target = "_blank";
    link.href = canvas.toDataURL();
    link.click();

    link.remove();
    canvas.remove();
}

function findActivePathsAtThisPosition(position: Vector2): { paths: PathWithColor[], nodes: CWNode[] } {
    let paths: PathWithColor[] = [];
    let nodes: CWNode[] = [];

    for (let i = 0; i < currentlyDisplayedPaths.length; i++) {
        let path = currentlyDisplayedPaths[i];
        for (let pos of path.path) {
            if (vectorEquals(pos, position)) {
                paths.push(path);
                nodes.push(currentlyDisplayedPathNodes[i]);
            }
        }
    }

    return { paths, nodes };
}

function showHoveredPathInfo(paths: PathWithColor[], nodes: CWNode[]) {
    let ctx = canvasRenderingContexts.get("interactable");
    if (!ctx) return;
    resetCanvas(ctx);
    ctx.fillStyle = "black";
    for (let path of paths) {
        for (let tile of path.path) {
            ctx.fillRect(tile.x * rasterSize, tile.y * rasterSize, rasterSize, rasterSize);
        }
    }
}