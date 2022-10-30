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
                findAllConnections(node, maxSteps);
            }
        }
    }
    previousStepLength = maxSteps;
    calculateDistanceToBoss();
    console.log(allCWConnections);
}

function calculatePathWithNodes() {
    maxSteps = +(<HTMLInputElement>document.getElementById("maxSteps")).value;
    if (previousStepLength != maxSteps) {
        allCWConnections = new Map<string, CWConnection[]>();
        for(let node of allCWNodes.values()){
            findAllConnections(node, maxSteps);
        }
        previousStepLength = maxSteps;
        calculateDistanceToBoss();
    }
    findPathFromNodes();
}

function findAllConnections(node: CWNode, maxSteps: number) {
    let newConnections: CWConnection[] = findConnectionsRecursive(node.position, maxSteps, [], 0);

    //remove first one because it's the same.
    if (newConnections[0].position.x === node.position.x && newConnections[0].position.y === node.position.y) {
        newConnections.splice(0, 1);
    }

    allCWConnections.set(vectorToString(node.position), newConnections);
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
                targetNode.previous = lowestNode.position;
                allCWNodesWithPath.set(vectorToString(targetNode.position), targetNode);
                remainingNodes[remainingNodePosition] = targetNode;
            }
        }
    }

}

function findPathFromNodes() {
    if (startPosition[0] < 0 || startPosition[1] < 0) throw new Error("Invalid Start Position");
    let type = maze[startPosition[1]][startPosition[0]].type;
    if (type !== TileType.BONFIRE && type !== TileType.FOUNTAIN && type !== TileType.BOSS) throw new Error("Start Position needs to be a fountain or bonfire");
    let position: Vector2 = { x: startPosition[0], y: startPosition[1] };
    let node: CWNode = <CWNode>allCWNodesWithPath.get(vectorToString(position));
    if (node.distance === Infinity) throw new Error("No Path exists from here");

    let fullPath: Vector2[] = [];
    let atBossPosition: boolean = false;
    while (!atBossPosition) {
        let node: CWNode = <CWNode>allCWNodesWithPath.get(vectorToString(position));
        fullPath.push(...(node.pathToPrevious?.reverse() ?? []));
        if (node.type === TileType.BOSS) {
            atBossPosition = true;
            break;
        }
        position = <Vector2>node.previous;
        highlightStop(position);
    }
    drawPath(vectorArrayToTupleArray(fullPath), true, "#1fad2d");
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

function highlightStop(position: Vector2){
    ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
    ctx.strokeStyle = "#1fad2d";
    ctx.lineWidth = 3;
    let p = new Path2D();
    p.arc(position.x * rasterSize +rasterSize / 2, position.y * rasterSize +rasterSize / 2, rasterSize, 0, Math.PI * 2);
    ctx.stroke(p);
}
document.getElementById("calculatePathWithNodes")?.addEventListener("click", calculatePathWithNodes);