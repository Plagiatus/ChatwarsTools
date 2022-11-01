interface CWNode {
    distance: number,
    position: Vector2,
    type: TileType,
    visited: boolean,
    previous?: Vector2,
    pathToPrevious?: Vector2[],
}

interface CWConnection {
    position: Vector2,
    weight: number,
    path: Vector2[],
}

interface Vector2 {
    x: number,
    y: number,
}

const tileToWeight: Map<TileType, number> = new Map<TileType, number>([
    [TileType.FOUNTAIN, 1],
    [TileType.BOSS, 1],
    [TileType.BONFIRE, 5],
    [TileType.MONSTER, 3],
])

let allCWNodes: Map<string, CWNode> = new Map<string, CWNode>();
let allCWNodesWithPath: Map<string, CWNode> = new Map<string, CWNode>();
let allCWConnections: Map<string, CWConnection[]> = new Map<string, CWConnection[]>();
let previousStepLength: number = 0;
let needsRecalculation: boolean = false;
let bossApproachOnlyThroughBonfires = true;

function initCWNodes() {
    if (maze.length <= 0) throw new Error("Maze isn't loaded yet.");
    allCWConnections = new Map<string, CWConnection[]>();

    // init all nodes
    allCWNodes = new Map<string, CWNode>();
    for (let y: number = 0; y < maze.length; y++) {
        for (let x: number = 0; x < maze[y].length; x++) {
            let type = maze[y][x].type;
            if (type == TileType.BONFIRE || type == TileType.BOSS || type == TileType.FOUNTAIN) {
                let position: Vector2 = { x, y };
                let node: CWNode = { distance: Infinity, position, type, visited: false };
                allCWNodes.set(vectorToString(position), node);

                //init all connections
                allCWConnections.set(vectorToString(node.position), findAllConnections(node, maxSteps));
            }
        }
    }
    previousStepLength = maxSteps;
    calculateDistanceToBoss();
    console.log(allCWConnections);
}

function calculatePathWithNodes() {
    maxSteps = +(<HTMLInputElement>document.getElementById("maxSteps")).value;
    if (previousStepLength != maxSteps || needsRecalculation) {
        allCWConnections = new Map<string, CWConnection[]>();
        for (let node of allCWNodes.values()) {
            allCWConnections.set(vectorToString(node.position), findAllConnections(node, maxSteps));
        }
        previousStepLength = maxSteps;
        calculateDistanceToBoss();
        needsRecalculation = false;
    }
    findPathFromNodes();
}

function findAllConnections(node: CWNode, maxSteps: number): CWConnection[] {
    let newConnections: CWConnection[] = findConnectionsRecursive(node.position, maxSteps, [], 0);

    //remove first one because it connects to itself.
    if (newConnections[0].position.x === node.position.x && newConnections[0].position.y === node.position.y) {
        newConnections.splice(0, 1);
    }

    if (bossApproachOnlyThroughBonfires && node.type === TileType.BOSS) {
        for (let i: number = 0; i < newConnections.length; i++) {
            if (maze[newConnections[i].position.y][newConnections[i].position.x].type === TileType.FOUNTAIN) {
                newConnections.splice(i, 1);
                i--;
            }
        }
    }

    return newConnections;
}

function findConnectionsRecursive(position: Vector2, remainingSteps: number, path: Vector2[], currentPathCost: number): CWConnection[] {
    if (remainingSteps < 0) return [];
    if (wasHereAlready(position, path)) return [];
    if (maze[position.y][position.x].type === TileType.WALL) return [];

    let newPath: Vector2[] = structuredClone(path);
    newPath.push(position);

    let newConnections: CWConnection[] = [];

    if (maze[position.y][position.x].type === TileType.MONSTER) currentPathCost += tileToWeight.get(TileType.MONSTER) ?? 0;
    if (maze[position.y][position.x].type === TileType.FOUNTAIN) {
        let weight: number = currentPathCost + (tileToWeight.get(TileType.FOUNTAIN) ?? 0);
        newConnections.push({ path: newPath, position, weight });
    }
    if (maze[position.y][position.x].type === TileType.BONFIRE) {
        let weight: number = currentPathCost + (tileToWeight.get(TileType.BONFIRE) ?? 0);
        newConnections.push({ path: newPath, position, weight });
    }

    newConnections.push(...findConnectionsRecursive({ x: position.x - 1, y: position.y }, remainingSteps - 1, newPath, currentPathCost));
    newConnections.push(...findConnectionsRecursive({ x: position.x + 1, y: position.y }, remainingSteps - 1, newPath, currentPathCost));
    newConnections.push(...findConnectionsRecursive({ x: position.x, y: position.y - 1 }, remainingSteps - 1, newPath, currentPathCost));
    newConnections.push(...findConnectionsRecursive({ x: position.x, y: position.y + 1 }, remainingSteps - 1, newPath, currentPathCost));

    return newConnections;
}

function wasHereAlready(position: Vector2, path: Vector2[]): boolean {
    let found = path.find((v) => { return v.x === position.x && v.y === position.y });
    return !!found;
}

function calculateDistanceToBoss() {
    allCWNodesWithPath = structuredClone(allCWNodes);
    let bossNode: CWNode = <CWNode>allCWNodesWithPath.get(vectorToString({ x: bossPosition[0], y: bossPosition[1] }));
    bossNode.distance = 0;
    allCWNodesWithPath.set(vectorToString(bossNode.position), bossNode);
    let remainingNodes: CWNode[] = Array.from(structuredClone(allCWNodesWithPath).values());

    while (remainingNodes.length > 0) {
        remainingNodes.sort(sortNodesByDistance);
        let lowestNode: CWNode = <CWNode>remainingNodes.shift();
        let connections: CWConnection[] = <CWConnection[]>allCWConnections.get(vectorToString(lowestNode.position));
        for (let connection of connections) {
            let targetNode = <CWNode>allCWNodesWithPath.get(vectorToString(connection.position));
            let newDistance: number = lowestNode.distance + connection.weight;
            let remainingNodePosition = remainingNodes.findIndex(value => vectorToString(value.position) === vectorToString(targetNode.position));
            if (remainingNodePosition >= 0 && targetNode.distance > newDistance) {
                targetNode.distance = newDistance;
                targetNode.pathToPrevious = connection.path;
                targetNode.pathToPrevious.reverse();
                targetNode.previous = lowestNode.position;
                allCWNodesWithPath.set(vectorToString(targetNode.position), targetNode);
                remainingNodes[remainingNodePosition] = targetNode;
            }
        }
    }

}

function findPathFromNodes() {
    hideError();
    if (startPosition[0] < 0 || startPosition[1] < 0) throw new Error("Invalid Start Position");
    let type = maze[startPosition[1]][startPosition[0]].type;
    let position: Vector2;
    let node: CWNode;
    if (type !== TileType.BONFIRE && type !== TileType.FOUNTAIN && type !== TileType.BOSS) {
        let closestConnections = findAndHighlightClosestFountainsAndBonfires();
        if (closestConnections.length == 0) throw new Error("No Fountains or Bonfires in reach.")
        closestConnections.sort(sortConnectionsByDistanceAndBonfire);
        position = closestConnections[0].position;
        node = <CWNode>allCWNodesWithPath.get(vectorToString(position));
    } else {
        position = { x: startPosition[0], y: startPosition[1] };
        node = <CWNode>allCWNodesWithPath.get(vectorToString(position));
    }
    if (node.distance === Infinity) throw new Error("No Path exists from here");

    let fullPath: Vector2[] = [];
    let atBossPosition: boolean = false;
    let dashed: boolean = false;
    while (!atBossPosition) {
        let node: CWNode = <CWNode>allCWNodesWithPath.get(vectorToString(position));
        fullPath.push(...(node.pathToPrevious ?? []));
        if (node.type === TileType.BOSS) {
            atBossPosition = true;
            break;
        } else if (node.type === TileType.BONFIRE) {
            currentPathColor = randomHSLA();
            dashed = !dashed;
        }
        position = <Vector2>node.previous;
        highlightStop(position);
        drawPath(vectorArrayToTupleArray(node.pathToPrevious ?? []), true, currentPathColor, dashed);
    }
    // drawPath(vectorArrayToTupleArray(fullPath), true, currentPathColor);
}

function vectorArrayToTupleArray(arr: Vector2[]): [number, number][] {
    let newArr: [number, number][] = [];
    for (let vector of arr) {
        newArr.push([vector.y, vector.x]);
    }
    return newArr;
}

function vectorToString(v: Vector2) {
    return `(${v.x},${v.y})`;
}

function sortNodesByDistance(a: CWNode, b: CWNode) {
    return a.distance - b.distance;
}
function sortConnectionsByDistanceAndBonfire(a: CWConnection, b: CWConnection) {
    if (maze[a.position.y][a.position.x].type === TileType.FOUNTAIN && maze[b.position.y][b.position.x].type !== TileType.FOUNTAIN) return -1;
    if (maze[a.position.y][a.position.x].type !== TileType.FOUNTAIN && maze[b.position.y][b.position.x].type === TileType.FOUNTAIN) return 1;
    return a.path.length - b.path.length;
}


let previousColorAngle = Math.floor(Math.random() * 360);
let currentPathColor: string = randomHSLA();
function randomHSLA(alpha: number = 0.8) {
    return `hsla(${previousColorAngle += 60}, 70%, 50%, ${alpha})`;
}

function highlightStop(position: Vector2, color: string = currentPathColor) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.setLineDash([]);
    ctx.lineWidth = 3;
    let p = new Path2D();
    p.arc(position.x * rasterSize + rasterSize / 2, position.y * rasterSize + rasterSize / 2, rasterSize, 0, Math.PI * 2);
    ctx.stroke(p);
}

function weightChange(this: HTMLInputElement, event: Event) {
    switch (this.id) {
        case "pathWeight":
            tileToWeight.set(TileType.FOUNTAIN, +this.value);
            break;
        case "monsterWeight":
            tileToWeight.set(TileType.MONSTER, +this.value);
            break;
        case "bonfireWeight":
            tileToWeight.set(TileType.BONFIRE, +this.value);
            break;
    }

    needsRecalculation = true;
}

function approachBoss(this: HTMLInputElement, e: Event) {
    bossApproachOnlyThroughBonfires = this.checked;
    needsRecalculation = true;
}

function findAndHighlightClosestFountainsAndBonfires(): CWConnection[] {
    if (maze[startPosition[1]][startPosition[0]].type === TileType.WALL) throw new Error("Start Position cannot be on a wall.");
    let connections = findAllConnections({ position: { x: startPosition[0], y: startPosition[1] }, distance: Infinity, type: TileType.WALL, visited: false }, maxSteps);
    currentPathColor = randomHSLA(0.4);
    for (let connection of connections) {
        drawPath(vectorArrayToTupleArray(connection.path), false, currentPathColor);
    }
    currentPathColor = randomHSLA();
    return connections;
}

document.getElementById("calculatePathWithNodes")?.addEventListener("click", calculatePathWithNodes);
document.getElementById("pathWeight")?.addEventListener("change", weightChange);
document.getElementById("monsterWeight")?.addEventListener("change", weightChange);
document.getElementById("bonfireWeight")?.addEventListener("change", weightChange);
document.getElementById("approachBossOnlyThroughBonfire")?.addEventListener("change", approachBoss);

tileToWeight.set(TileType.FOUNTAIN, +(<HTMLInputElement>document.getElementById("fountainWeight")).value ?? 1);
tileToWeight.set(TileType.MONSTER, +(<HTMLInputElement>document.getElementById("monsterWeight")).value ?? 3);
tileToWeight.set(TileType.BONFIRE, +(<HTMLInputElement>document.getElementById("bonfireWeight")).value ?? 5);

bossApproachOnlyThroughBonfires = (<HTMLInputElement>document.getElementById("approachBossOnlyThroughBonfire")).checked;