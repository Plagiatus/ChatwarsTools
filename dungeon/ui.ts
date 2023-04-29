const canvasOverlay: HTMLDivElement = <HTMLDivElement>document.getElementById("canvas-hover-info");

interactableCanvas.addEventListener("mousemove", showMapInfo);
interactableCanvas.addEventListener("mouseleave", hideMapInfo);
interactableCanvas.addEventListener("click", handleMouseClick);

function showMapInfo(e: MouseEvent){
    canvasOverlay.classList.remove("hidden");
    let {x, y} = getCanvasPosition(e);

    canvasOverlay.style.top = (y - 2) * rasterSize + "px";
    canvasOverlay.style.left = (x + 2) * rasterSize + "px";

    let xPos = <HTMLSpanElement>canvasOverlay.querySelector("#xPos");
    let yPos = <HTMLSpanElement>canvasOverlay.querySelector("#yPos");
    xPos.innerText = x.toString();
    yPos.innerText = y.toString();
    // let tile = <HTMLSpanElement>canvasOverlay.querySelector("#tileType");
    // tile.innerText = "";
}

function hideMapInfo(){
    canvasOverlay?.classList.add("hidden");
}

function handleMouseClick(e: MouseEvent) {
    hideError();
    let {x, y} = getCanvasPosition(e);
    startPosition = [x, y];
    resetMaze();
}

function getCanvasPosition(e: MouseEvent): Vector2{
    let rect = interactableCanvas.getBoundingClientRect();

    let x: number = Math.floor((e.clientX - rect.left) / rasterSize);
    let y: number = Math.floor((e.clientY - rect.top) / rasterSize);

    return {x, y};
}