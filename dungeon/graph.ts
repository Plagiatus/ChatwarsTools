/*
Using graph theory to find the shortest path from the boss to anywhere on the map.
Using Dijkstras Algorithm, where Fountains, Campfires and the Boss are CWNodes and the paths between them are CWConnections.
Type of node (Campfire/Fountain) as well as monsters on the path determine the weight of the paths.
*/

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
    contents: ConnectionContents,
}

interface ConnectionContents {
    treasures: number,
    monsters: number,
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

/*
To speed up calculation times, using maps to store nodes and connections of those nodes.
Indexed by a string in the format "(<x>,<y>)", describing the tile position inside the maze
*/ 
/** All relevant (Fountain, Boss, Campfire) nodes in the graph */
let allCWNodes: Map<string, CWNode> = new Map<string, CWNode>();
/** All relevant nodes including the path to the previous node (ultimately leading to the boss), filled by calculateDistanceToBoss */
let allCWNodesWithPath: Map<string, CWNode> = new Map<string, CWNode>();
/** All connections of a node */
let allCWConnections: Map<string, CWConnection[]> = new Map<string, CWConnection[]>();

let previousStepLength: number = 0;
let needsRecalculation: boolean = false;
let bossApproachOnlyThroughBonfires = true;

/**
 * Traverse maze tiles and calculate 
 */
function initCWNodes() {
    if (maze.length <= 0) throw new Error("Maze isn't loaded yet.");
    allCWConnections = new Map<string, CWConnection[]>();

    // init all nodes by traversing through the maze and if it's a node of interest, calculate its connections
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

/** Calculates the shortest paths based on the node graph. */
function calculatePathWithNodes(this: HTMLInputElement, event: Event) {
    let treasureRun: boolean = this.id === "calculateTreasureRun";
    maxSteps = +(<HTMLInputElement>document.getElementById("maxSteps")).value;
    // are recalculations needed?
    if (previousStepLength != maxSteps || needsRecalculation) {
        allCWConnections = new Map<string, CWConnection[]>();
        for (let node of allCWNodes.values()) {
            allCWConnections.set(vectorToString(node.position), findAllConnections(node, maxSteps));
        }
        previousStepLength = maxSteps;
        if(!treasureRun) {
            calculateDistanceToBoss();
        }
        needsRecalculation = false;
    }
    // find the actual path
    if(treasureRun) {
        findHighestTreasureRoute();
        findTreasureRoute();
    } else {
        findPathFromNodes();
    }
}

/** Find all nodes that are in range of the given node */
function findAllConnections(node: CWNode, maxSteps: number): CWConnection[] {
    let newConnections: CWConnection[] = findConnectionsRecursive(node.position, maxSteps, [], 0, {monsters: 0, treasures: 0});

    //remove first one because it connects to itself.
    if (newConnections[0].position.x === node.position.x && newConnections[0].position.y === node.position.y) {
        newConnections.splice(0, 1);
    }

    // if this is the boss node and the boss should only be approached through campfires (for coordinated attacks), throw out all non-campfire nodes from the found connections
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

/** A helper function that traverses the maze recursively to find all reachable nodes and their paths to them. */
function findConnectionsRecursive(position: Vector2, remainingSteps: number, path: Vector2[], currentPathCost: number, contents: ConnectionContents): CWConnection[] {
    if (remainingSteps < 0) return [];
    if (wasHereAlready(position, path)) return [];
    if (maze[position.y][position.x].type === TileType.WALL) return [];

    let newPath: Vector2[] = structuredClone(path);
    newPath.push(position);

    let newConnections: CWConnection[] = [];

    let newContents: ConnectionContents = structuredClone(contents);

    if (maze[position.y][position.x].type === TileType.MONSTER) {
        currentPathCost += tileToWeight.get(TileType.MONSTER) ?? 0;
        newContents.monsters++;
    }
    if (maze[position.y][position.x].type === TileType.TREASURE) {
        newContents.treasures++;
    }
    if (maze[position.y][position.x].type === TileType.FOUNTAIN) {
        let weight: number = currentPathCost + (tileToWeight.get(TileType.FOUNTAIN) ?? 0);
        newConnections.push({ path: newPath, position, weight, contents: newContents });
    }
    if (maze[position.y][position.x].type === TileType.BONFIRE) {
        let weight: number = currentPathCost + (tileToWeight.get(TileType.BONFIRE) ?? 0);
        newConnections.push({ path: newPath, position, weight, contents: newContents });
    }

    newConnections.push(...findConnectionsRecursive({ x: position.x - 1, y: position.y }, remainingSteps - 1, newPath, currentPathCost, newContents));
    newConnections.push(...findConnectionsRecursive({ x: position.x + 1, y: position.y }, remainingSteps - 1, newPath, currentPathCost, newContents));
    newConnections.push(...findConnectionsRecursive({ x: position.x, y: position.y - 1 }, remainingSteps - 1, newPath, currentPathCost, newContents));
    newConnections.push(...findConnectionsRecursive({ x: position.x, y: position.y + 1 }, remainingSteps - 1, newPath, currentPathCost, newContents));

    return newConnections;
}

/** helper function that checks whether a given position is already in an array of path steps */
function wasHereAlready(position: Vector2, path: Vector2[]): boolean {
    let found = path.find((v) => { return v.x === position.x && v.y === position.y });
    return !!found;
}

/** 
 * After the graph has been created, this is the actual dijkstra to fill the nodes with distance 
 * values and store the path to the boss in the nodes themselves (or rather, the path to the previous node, ultimately leading back to the boss) 
 */
function calculateDistanceToBoss() {
    allCWNodesWithPath = structuredClone(allCWNodes);
    // boss node is the starting point
    let bossNode: CWNode = <CWNode>allCWNodesWithPath.get(vectorToString({ x: bossPosition[0], y: bossPosition[1] }));
    bossNode.distance = 0;
    allCWNodesWithPath.set(vectorToString(bossNode.position), bossNode);
    let remainingNodes: CWNode[] = Array.from(structuredClone(allCWNodesWithPath).values());

    while (remainingNodes.length > 0) {
        remainingNodes.sort(sortNodesByDistance);
        let lowestNode: CWNode = <CWNode>remainingNodes.shift();
        // all the connections of the current lowest distance node
        let connections: CWConnection[] = <CWConnection[]>allCWConnections.get(vectorToString(lowestNode.position));
        for (let connection of connections) {
            // calculate the new distance of all the connections
            let targetNode = <CWNode>allCWNodesWithPath.get(vectorToString(connection.position));
            let newDistance: number = lowestNode.distance + connection.weight;
            let remainingNodePosition = remainingNodes.findIndex(value => vectorToString(value.position) === vectorToString(targetNode.position));
            // the connected to node is still part of the remaining nodes, the new distance is smaller than the currently stored distance or if the distance is equal, still overwrite it if the pathlength is shorter.
            if (remainingNodePosition >= 0 && (targetNode.distance > newDistance || (targetNode.distance == newDistance && targetNode.pathToPrevious && targetNode.pathToPrevious.length > connection.path.length))) {
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
/**
 * Calculates the path from the currently selected starting point
 */
function findPathFromNodes() {
    hideError();
    let position = fixStartingPosition(startPosition)
    let node = <CWNode>allCWNodesWithPath.get(vectorToString(position));
    if (node.distance === Infinity) throw new Error("No Path exists from here");

    // find the path from the existing graph, by traversing backwards until boss position is reached
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
}

/** Finds and returns the closest Fountain, assuming the selected starting point is not a Fountain or Campfire, highlighting all the reachable fountains in the process. */
function fixStartingPosition(startPosition: [number, number]): Vector2 {
    if (startPosition[0] < 0 || startPosition[1] < 0) throw new Error("Invalid Start Position");
    let type = maze[startPosition[1]][startPosition[0]].type;
    let position: Vector2;
    // is the starting point NOT a campfire or fountain? Then find the closest one of those first.
    if (type !== TileType.BONFIRE && type !== TileType.FOUNTAIN && type !== TileType.BOSS) {
        let closestConnections = findAndHighlightClosestFountainsAndBonfires();
        if (closestConnections.length == 0) throw new Error("No Fountains or Bonfires in reach.")
        closestConnections.sort(sortConnectionsByDistanceAndBonfire);
        position = closestConnections[0].position;
        highlightStop(position);
    } else {
        position = { x: startPosition[0], y: startPosition[1] };
    }
    return position;
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

/** An eventlistener that sets the calculation relevant weights if they are changed by the user to prompt a recalculation */
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

/** An eventlistener that updates internal values as needed when the user toggles a checkbox. */
function approachBoss(this: HTMLInputElement, e: Event) {
    bossApproachOnlyThroughBonfires = this.checked;
    needsRecalculation = true;
}

/** Called if the selected starting position is not already a bonfire or fountain. Returns all connections reachable from the position assuming a full step distance. */
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