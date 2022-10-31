"use strict";
const tileToWeight = new Map([
    [TileType.FOUNTAIN, 1],
    [TileType.BOSS, 1],
    [TileType.BONFIRE, 5],
    [TileType.MONSTER, 3],
]);
let allCWNodes = new Map();
let allCWNodesWithPath = new Map();
let allCWConnections = new Map();
let previousStepLength = 0;
let needsRecalculation = false;
let bossApproachOnlyThroughBonfires = true;
function initCWNodes() {
    if (maze.length <= 0)
        throw new Error("Maze isn't loaded yet.");
    allCWConnections = new Map();
    // init all nodes
    allCWNodes = new Map();
    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            let type = maze[y][x].type;
            if (type == TileType.BONFIRE || type == TileType.BOSS || type == TileType.FOUNTAIN) {
                let position = { x, y };
                let node = { distance: Infinity, position, type, visited: false };
                allCWNodes.set(vectorToString(position), node);
                //init all connections
                findAllConnections(node, maxSteps);
            }
        }
    }
    previousStepLength = maxSteps;
    calculateDistanceToBoss();
    console.log(allCWConnections);
}
function calculatePathWithNodes() {
    maxSteps = +document.getElementById("maxSteps").value;
    if (previousStepLength != maxSteps || needsRecalculation) {
        allCWConnections = new Map();
        for (let node of allCWNodes.values()) {
            findAllConnections(node, maxSteps);
        }
        previousStepLength = maxSteps;
        calculateDistanceToBoss();
        needsRecalculation = false;
    }
    findPathFromNodes();
}
function findAllConnections(node, maxSteps) {
    let newConnections = findConnectionsRecursive(node.position, maxSteps, [], 0);
    //remove first one because it connects to itself.
    if (newConnections[0].position.x === node.position.x && newConnections[0].position.y === node.position.y) {
        newConnections.splice(0, 1);
    }
    if (bossApproachOnlyThroughBonfires && node.type === TileType.BOSS) {
        for (let i = 0; i < newConnections.length; i++) {
            if (maze[newConnections[i].position.y][newConnections[i].position.x].type === TileType.FOUNTAIN) {
                newConnections.splice(i, 1);
                i--;
            }
        }
    }
    allCWConnections.set(vectorToString(node.position), newConnections);
}
function findConnectionsRecursive(position, remainingSteps, path, currentPathCost) {
    if (remainingSteps < 0)
        return [];
    if (wasHereAlready(position, path))
        return [];
    if (maze[position.y][position.x].type === TileType.WALL)
        return [];
    let newPath = structuredClone(path);
    newPath.push(position);
    let newConnections = [];
    if (maze[position.y][position.x].type === TileType.MONSTER)
        currentPathCost += tileToWeight.get(TileType.MONSTER) ?? 0;
    if (maze[position.y][position.x].type === TileType.FOUNTAIN) {
        let weight = currentPathCost + (tileToWeight.get(TileType.FOUNTAIN) ?? 0);
        newConnections.push({ path: newPath, position, weight });
    }
    if (maze[position.y][position.x].type === TileType.BONFIRE) {
        let weight = currentPathCost + (tileToWeight.get(TileType.BONFIRE) ?? 0);
        newConnections.push({ path: newPath, position, weight });
    }
    newConnections.push(...findConnectionsRecursive({ x: position.x - 1, y: position.y }, remainingSteps - 1, newPath, currentPathCost));
    newConnections.push(...findConnectionsRecursive({ x: position.x + 1, y: position.y }, remainingSteps - 1, newPath, currentPathCost));
    newConnections.push(...findConnectionsRecursive({ x: position.x, y: position.y - 1 }, remainingSteps - 1, newPath, currentPathCost));
    newConnections.push(...findConnectionsRecursive({ x: position.x, y: position.y + 1 }, remainingSteps - 1, newPath, currentPathCost));
    return newConnections;
}
function wasHereAlready(position, path) {
    let found = path.find((v) => { return v.x === position.x && v.y === position.y; });
    return !!found;
}
function calculateDistanceToBoss() {
    allCWNodesWithPath = structuredClone(allCWNodes);
    let bossNode = allCWNodesWithPath.get(vectorToString({ x: bossPosition[0], y: bossPosition[1] }));
    bossNode.distance = 0;
    allCWNodesWithPath.set(vectorToString(bossNode.position), bossNode);
    let remainingNodes = Array.from(structuredClone(allCWNodesWithPath).values());
    while (remainingNodes.length > 0) {
        remainingNodes.sort(sortNodesByDistance);
        let lowestNode = remainingNodes.shift();
        let connections = allCWConnections.get(vectorToString(lowestNode.position));
        for (let connection of connections) {
            let targetNode = allCWNodesWithPath.get(vectorToString(connection.position));
            let newDistance = lowestNode.distance + connection.weight;
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
    if (startPosition[0] < 0 || startPosition[1] < 0)
        throw new Error("Invalid Start Position");
    let type = maze[startPosition[1]][startPosition[0]].type;
    if (type !== TileType.BONFIRE && type !== TileType.FOUNTAIN && type !== TileType.BOSS)
        throw new Error("Start Position needs to be a fountain or bonfire");
    let position = { x: startPosition[0], y: startPosition[1] };
    let node = allCWNodesWithPath.get(vectorToString(position));
    if (node.distance === Infinity)
        throw new Error("No Path exists from here");
    let fullPath = [];
    let atBossPosition = false;
    while (!atBossPosition) {
        let node = allCWNodesWithPath.get(vectorToString(position));
        fullPath.push(...(node.pathToPrevious ?? []));
        if (node.type === TileType.BOSS) {
            atBossPosition = true;
            break;
        }
        position = node.previous;
        highlightStop(position);
    }
    drawPath(vectorArrayToTupleArray(fullPath), true, "#1fad2d");
}
function vectorArrayToTupleArray(arr) {
    let newArr = [];
    for (let vector of arr) {
        newArr.push([vector.y, vector.x]);
    }
    return newArr;
}
function vectorToString(v) {
    return `(${v.x},${v.y})`;
}
function sortNodesByDistance(a, b) {
    return a.distance - b.distance;
}
function highlightStop(position) {
    ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
    ctx.strokeStyle = "#1fad2d";
    ctx.lineWidth = 3;
    let p = new Path2D();
    p.arc(position.x * rasterSize + rasterSize / 2, position.y * rasterSize + rasterSize / 2, rasterSize, 0, Math.PI * 2);
    ctx.stroke(p);
}
function weightChange(event) {
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
function approachBoss(e) {
    bossApproachOnlyThroughBonfires = this.checked;
    needsRecalculation = true;
}
document.getElementById("calculatePathWithNodes")?.addEventListener("click", calculatePathWithNodes);
document.getElementById("pathWeight")?.addEventListener("change", weightChange);
document.getElementById("monsterWeight")?.addEventListener("change", weightChange);
document.getElementById("bonfireWeight")?.addEventListener("change", weightChange);
document.getElementById("approachBossOnlyThroughBonfire")?.addEventListener("change", approachBoss);
tileToWeight.set(TileType.FOUNTAIN, +document.getElementById("fountainWeight").value ?? 1);
tileToWeight.set(TileType.MONSTER, +document.getElementById("monsterWeight").value ?? 3);
tileToWeight.set(TileType.BONFIRE, +document.getElementById("bonfireWeight").value ?? 5);
bossApproachOnlyThroughBonfires = document.getElementById("approachBossOnlyThroughBonfire").checked;
//# sourceMappingURL=graph.js.map