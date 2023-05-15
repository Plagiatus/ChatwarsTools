
document.getElementById("calculateTreasureRun")?.addEventListener("click", calculatePathWithNodes);
document.getElementById("disableCurrentRoute")?.addEventListener("click", disableCurrentRoute);

// interface TreasureRoute {
//     nodes: CWNode[],
//     connections: CWConnection[],
//     cumulativeContents: ConnectionContents,
// }

// let maxAmountOfTreasureRouteStops: number = 10;

// /** Calculates the path with the most treasure / monsters on it you can take before running out of fountains */
// async function findTreasureRouteOld() {
//     let position = fixStartingPosition(startPosition);
//     let startNode = <CWNode>allCWNodesWithPath.get(vectorToString(position));

//     let allRoutes: TreasureRoute[] = [];
//     await findTreasureRouteRecursive(startNode, { connections: [], nodes: [startNode], cumulativeContents: { monsters: 0, treasures: 0 } }, allRoutes, maxAmountOfTreasureRouteStops);
//     let bestRoute = allRoutes.sort(sortForMostTreasurePath).shift();

//     if (!bestRoute) throw new Error("No Treasure Route found.");
//     for (let connection of bestRoute.connections) {
//         drawPath(vectorArrayToTupleArray(connection.path));
//         highlightStop(connection.position);
//     }
// }

// async function findTreasureRouteRecursive(node: CWNode, currentRoute: TreasureRoute, allRoutes: TreasureRoute[] = [], stepsLeft: number = Infinity) {
//     currentRoute = structuredClone(currentRoute);
//     if (stepsLeft === 0) return allRoutes.push(currentRoute);
//     let nodeConnections = allCWConnections.get(vectorToString(node.position));
//     if (!nodeConnections) return;
//     let connectionFound = false;
//     for (let connection of nodeConnections) {
//         let nextNode: CWNode | undefined = allCWNodes.get(vectorToString(connection.position));
//         if (!nextNode) continue;
//         if (isNodeAlreadyInRoute(nextNode.position, currentRoute)) continue;
//         if (fountainsInTreasureRouteOnly && nextNode.type !== TileType.FOUNTAIN) continue;
//         let newRoute: TreasureRoute = structuredClone(currentRoute);
//         newRoute.cumulativeContents.monsters += connection.contents.monsters;
//         newRoute.cumulativeContents.treasures += connection.contents.treasures;
//         newRoute.nodes.push(nextNode);
//         newRoute.connections.push(connection);
//         await findTreasureRouteRecursive(nextNode, newRoute, allRoutes, stepsLeft - 1);
//         connectionFound = true;
//     }
//     if (!connectionFound) allRoutes.push(currentRoute);
//     await delay(1);
// }

// function isNodeAlreadyInRoute(position: Vector2, route: TreasureRoute): boolean {
//     return !!route.nodes.find((node => node.position.x === position.x && node.position.y === position.y));
// }

// function sortForMostTreasurePath(a: TreasureRoute, b: TreasureRoute) {
//     let aValue = a.cumulativeContents.monsters * treasureMultipliers.monsters + a.cumulativeContents.treasures * treasureMultipliers.treasures;
//     let bValue = b.cumulativeContents.monsters * treasureMultipliers.monsters + b.cumulativeContents.treasures * treasureMultipliers.treasures;
//     let result = bValue - aValue
//     if (result !== 0) return result;
//     return a.nodes.length - b.nodes.length;
// }


/** All relevant nodes including the path to the previous node (ultimately leading to the start)*/
let allCWNodesWithTreasurePath: Map<string, CWNode> = new Map<string, CWNode>();

function findHighestTreasureRoute() {
    allCWNodesWithTreasurePath = structuredClone(allCWNodes);
    allCWNodesWithTreasurePath.forEach(node => {
        node.distance = -Infinity;
    })

    let position = fixStartingPosition(startPosition);
    let startNode = <CWNode>allCWNodesWithTreasurePath.get(vectorToString(position));
    startNode.distance = 0;
    allCWNodesWithTreasurePath.set(vectorToString(position), startNode);

    let remainingNodes: CWNode[] = Array.from(structuredClone(allCWNodesWithTreasurePath).values());

    while (remainingNodes.length > 0) {
        remainingNodes.sort(sortNodesByDistance);
        let highestNode: CWNode = <CWNode>remainingNodes.pop();
        if (highestNode.type === TileType.BOSS) continue;
        if (highestNode.type !== TileType.FOUNTAIN && settings.treasure.fountainsOnly) continue;
        // all the connections of the current lowest distance node
        let connections: CWConnection[] = <CWConnection[]>allCWConnections.get(vectorToString(highestNode.position));
        for (let connection of connections) {
            // calculate the new distance of all the connections
            let targetNode = <CWNode>allCWNodesWithTreasurePath.get(vectorToString(connection.position));
            let newWeight: number = highestNode.distance + getConnectionTreasureWeight(connection);
            let remainingNodePosition = remainingNodes.findIndex(value => vectorToString(value.position) === vectorToString(targetNode.position));
            // the connected to node is still part of the remaining nodes, the new distance is smaller than the currently stored distance or if the distance is equal, still overwrite it if the pathlength is shorter.
            if (remainingNodePosition >= 0 && (targetNode.distance < newWeight || (targetNode.distance == newWeight && targetNode.pathToPrevious && targetNode.pathToPrevious.length > connection.path.length))) {
                targetNode.distance = newWeight;
                targetNode.pathToPrevious = connection.path;
                targetNode.pathToPrevious.reverse();
                targetNode.previous = highestNode.position;
                allCWNodesWithTreasurePath.set(vectorToString(targetNode.position), targetNode);
                remainingNodes[remainingNodePosition] = targetNode;
            }
        }
    }
}

function getConnectionTreasureWeight(node: CWConnection): number {
    return node.contents.monsters * settings.treasure.multipliers.monster +
        node.contents.treasures * settings.treasure.multipliers.treasure;
}

let currentTreasurePath: Vector2[];
let currentTreasurePathNodes: CWNode[];
function findTreasureRoute() {
    currentTreasurePathNodes = [];
    currentTreasurePath = [];
    currentlyDisplayedPaths = [];
    currentlyDisplayedPathNodes = [];

    let startPositionVector = fixStartingPosition(startPosition)
    let startNode = <CWNode>allCWNodesWithPath.get(vectorToString(startPositionVector));

    // find the node with the highest distance, show that one.
    let max = -Infinity;
    let position = startNode.position;
    allCWNodesWithTreasurePath.forEach(node => {
        if (node.distance > max) {
            max = node.distance;
            position = node.position;
        }
    });

    let fullPath: Vector2[] = [];
    let atStartPosition: boolean = false;
    let pathId: number = 0;
    while (!atStartPosition) {
        let node: CWNode = <CWNode>allCWNodesWithTreasurePath.get(vectorToString(position));
        currentTreasurePathNodes.push(node);
        currentlyDisplayedPathNodes.push(node);
        fullPath.push(...(node.pathToPrevious ?? []));
        currentlyDisplayedPaths.push({path: node.pathToPrevious ?? [], color: currentPathColor, id: ++pathId});
        if (vectorEquals(node.position, startPositionVector)) {
            atStartPosition = true;
            break;
        }
        position = <Vector2>node.previous;
        highlightStop(position);
        drawPath(vectorArrayToTupleArray(node.pathToPrevious ?? []), { color: currentPathColor, directional: true });
        currentPathColor = randomHSLA();
    }
    currentTreasurePath = fullPath;
    currentlyDisplayedPathNodes.reverse();
    currentlyDisplayedPaths.reverse();
    for(let path of currentlyDisplayedPaths) {
        path.id = currentlyDisplayedPaths.length - path.id;
    }
}

function disableCurrentRoute() {
    if (!currentTreasurePath || !currentTreasurePath.length) return;
    for (let pos of currentTreasurePath) {
        let tile = maze[pos.y][pos.x];
        if (tile.type === TileType.MONSTER || tile.type === TileType.TREASURE) {
            disabledTiles.add(vectorToString(pos));
        }
    }
    for (let node of currentTreasurePathNodes) {
        if (node.type === TileType.FOUNTAIN) {
            disabledTiles.add(vectorToString(node.position));
        }
    }
    resetDisabled();
    needsRecalculation = true;
}