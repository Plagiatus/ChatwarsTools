/*
To add new settings, do the following:
1. add it to the interface
2. add the HTML elements to the html, add it to the list of html elements to be searched in the dom
3. set up listeners on the change of the html element and the corresponding function
4. set up html changer for the settings loader in syncUIToValues()
5. add to loadSettingsFromStorage()
6. add to resetSettings()
*/


interface Settings {
    maxSteps: number,
    startResetsPath: boolean,
    bossHighlighted: boolean,
    startHighlighted: boolean,
    scribbleLines: boolean,
    boss: {
        onlyThroughBonfires: boolean,
        weights: { fountain: number, bonfire: number, monster: number },
    },
    treasure: {
        fountainsOnly: boolean,
        multipliers: { monster: number, treasure: number },
    },
    colors: string[],
}

// get relevant HTML Elements
const maxStepsElement = <HTMLInputElement>document.getElementById("maxSteps");
const startResetsPathElement = <HTMLInputElement>document.getElementById("startResetsPaths");
const highlightBossElement = <HTMLInputElement>document.getElementById("highlightBossCheck");
const highlightStartElement = <HTMLInputElement>document.getElementById("highlightStartCheck");
const scribbleLinesElement = <HTMLInputElement>document.getElementById("scribbleLinesCheck");

const approachBossOnlyThroughBonfireElement = <HTMLInputElement>document.getElementById("approachBossOnlyThroughBonfire");
const fountainWeightElement = <HTMLInputElement>document.getElementById("fountainWeight");
const bonfireWeightElement = <HTMLInputElement>document.getElementById("bonfireWeight");
const monsterWeightElement = <HTMLInputElement>document.getElementById("monsterWeight");


// setup relevant listeners
maxStepsElement.addEventListener("change", maxStepsChange);
startResetsPathElement.addEventListener("change", startResetsPathChange);
highlightBossElement.addEventListener("change", highlightBossChange);
highlightStartElement.addEventListener("change", highlightStartChange);
approachBossOnlyThroughBonfireElement.addEventListener("change", approachBossOnlyThroughBonfireChange);
fountainWeightElement.addEventListener("change", fountainWeightChange);
bonfireWeightElement.addEventListener("change", bonfireWeightChange);
monsterWeightElement.addEventListener("change", monsterWeightChange);
scribbleLinesElement.addEventListener("change", scribbleLinesChange);

document.getElementById("resetSettings")?.addEventListener("click", resetSettings);

//#region values changed in the UI -> update in storage
function maxStepsChange(this: HTMLInputElement, e: Event) {
    settings.maxSteps = +this.value;
    if (isNaN(settings.maxSteps) || settings.maxSteps <= 0) settings.maxSteps = 30;
    this.value = settings.maxSteps.toString();
    saveSettingsToStorage();
    needsRecalculation = true;
}
function startResetsPathChange(this: HTMLInputElement, e: Event) {
    settings.startResetsPath = this.checked;
    if (settings.startResetsPath === undefined) settings.startResetsPath = false;
    this.checked = settings.startResetsPath;
    saveSettingsToStorage();
}
function highlightBossChange(this: HTMLInputElement, e: Event) {
    settings.bossHighlighted = this.checked;
    if (settings.bossHighlighted === undefined) settings.bossHighlighted = false;
    this.checked = settings.bossHighlighted;
    saveSettingsToStorage();
    resetHighlights();
}
function highlightStartChange(this: HTMLInputElement, e: Event) {
    settings.startHighlighted = this.checked;
    if (settings.startHighlighted === undefined) settings.startHighlighted = false;
    this.checked = settings.startHighlighted;
    saveSettingsToStorage();
    resetHighlights();
}
function approachBossOnlyThroughBonfireChange(this: HTMLInputElement, e: Event) {
    settings.boss.onlyThroughBonfires = this.checked;
    if (settings.boss.onlyThroughBonfires === undefined) settings.boss.onlyThroughBonfires = false;
    this.checked = settings.boss.onlyThroughBonfires;
    saveSettingsToStorage();
    needsRecalculation = true;
}
function fountainWeightChange(this: HTMLInputElement, e: Event) {
    settings.boss.weights.fountain = +this.value;
    if (isNaN(settings.boss.weights.fountain) || settings.boss.weights.fountain <= 0) settings.boss.weights.fountain = 30;
    this.value = settings.boss.weights.fountain.toString();
    saveSettingsToStorage();
    needsRecalculation = true;
}
function bonfireWeightChange(this: HTMLInputElement, e: Event) {
    settings.boss.weights.bonfire = +this.value;
    if (isNaN(settings.boss.weights.bonfire) || settings.boss.weights.bonfire <= 0) settings.boss.weights.bonfire = 30;
    this.value = settings.boss.weights.bonfire.toString();
    saveSettingsToStorage();
    needsRecalculation = true;
}
function monsterWeightChange(this: HTMLInputElement, e: Event) {
    settings.boss.weights.monster = +this.value;
    if (isNaN(settings.boss.weights.monster) || settings.boss.weights.monster <= 0) settings.boss.weights.monster = 30;
    this.value = settings.boss.weights.monster.toString();
    saveSettingsToStorage();
    needsRecalculation = true;
}
function scribbleLinesChange(this: HTMLInputElement, e: Event) {
    settings.scribbleLines = this.checked;
    if (settings.scribbleLines === undefined) settings.scribbleLines = false;
    this.checked = settings.scribbleLines;
    saveSettingsToStorage();
}
//#endregion


// 
const settings = loadSettingsFromStorage();
syncUIToValues();

function loadSettingsFromStorage(): Settings {
    let loadedSettings: Settings = JSON.parse(localStorage.getItem("settings") ?? "{}");

    //check for missing attributes and will with defaults
    if (!loadedSettings.maxSteps) loadedSettings.maxSteps = 30;
    if (loadedSettings.startResetsPath === undefined) loadedSettings.startResetsPath = false;
    if (loadedSettings.bossHighlighted === undefined) loadedSettings.bossHighlighted = false;
    if (loadedSettings.startHighlighted === undefined) loadedSettings.startHighlighted = false;
    if (loadedSettings.scribbleLines === undefined) loadedSettings.scribbleLines = false;

    if (loadedSettings.boss === undefined) loadedSettings.boss = { onlyThroughBonfires: true, weights: { bonfire: 5, fountain: 1, monster: 3 } };
    if (loadedSettings.boss.onlyThroughBonfires === undefined) loadedSettings.boss.onlyThroughBonfires = true;
    if (loadedSettings.boss.weights === undefined) loadedSettings.boss.weights = { bonfire: 5, fountain: 1, monster: 3 };
    if (loadedSettings.boss.weights.fountain === undefined) loadedSettings.boss.weights.fountain = 1;
    if (loadedSettings.boss.weights.bonfire === undefined) loadedSettings.boss.weights.bonfire = 5;
    if (loadedSettings.boss.weights.monster === undefined) loadedSettings.boss.weights.monster = 3;

    if (!loadedSettings.treasure) loadedSettings.treasure = { fountainsOnly: true, multipliers: { monster: 1, treasure: 1 } };
    if (loadedSettings.treasure.fountainsOnly === undefined) loadedSettings.treasure.fountainsOnly = true;
    if (!loadedSettings.treasure.multipliers) loadedSettings.treasure.multipliers = { monster: 1, treasure: 1 };
    if (loadedSettings.treasure.multipliers.monster === undefined) loadedSettings.treasure.multipliers.monster = 1;
    if (loadedSettings.treasure.multipliers.treasure === undefined) loadedSettings.treasure.multipliers.treasure = 1;

    if (loadedSettings.colors === undefined) loadedSettings.colors = ["#d92626", "#d9d926", "#26d926", "#26d9d9", "#2626d9", "#d926d9"];

    saveSettingsToStorage(loadedSettings);
    return loadedSettings;
}

function saveSettingsToStorage(s: Settings = settings) {
    localStorage.setItem("settings", JSON.stringify(s));
}

function syncUIToValues() {
    //apply loaded settings to the page elements
    maxStepsElement.value = settings.maxSteps.toString();
    startResetsPathElement.checked = settings.startResetsPath;
    highlightBossElement.checked = settings.bossHighlighted;
    highlightStartElement.checked = settings.startHighlighted;
    approachBossOnlyThroughBonfireElement.checked = settings.boss.onlyThroughBonfires;
    fountainWeightElement.value = settings.boss.weights.fountain.toString();
    bonfireWeightElement.value = settings.boss.weights.bonfire.toString();
    monsterWeightElement.value = settings.boss.weights.monster.toString();
    scribbleLinesElement.checked = settings.scribbleLines;
    setupColors();
}

function resetSettings() {
    settings.maxSteps = 30;
    settings.bossHighlighted = false;
    settings.startHighlighted = false;
    settings.startResetsPath = false;
    settings.scribbleLines = false;
    settings.boss = { onlyThroughBonfires: true, weights: { bonfire: 5, fountain: 1, monster: 3 } };
    settings.colors = ["#d92626", "#d9d926", "#26d926", "#26d9d9", "#2626d9", "#d926d9"];
    saveSettingsToStorage();
    syncUIToValues();
}

//#region utility functions to get values 

function getTileWeight(tile: TileType): number {
    if (tile === TileType.FOUNTAIN) return settings.boss.weights.fountain;
    if (tile === TileType.BONFIRE) return settings.boss.weights.bonfire;
    if (tile === TileType.MONSTER) return settings.boss.weights.monster;
    return 0;
}

//#endregion

//#region colors
function setupColors(){
    let colorWrapperElement = document.getElementById("color-settings-wrapper")!;
    colorWrapperElement.innerHTML = "";
    for(let i= 0; i< settings.colors.length; i++) {
        let color = settings.colors[i];
        appendColorElement(color, i);
    }
    let addButton = document.createElement("button");
    addButton.classList.add("btn", "btn-success")
    addButton.innerText = "Add";
    addButton.addEventListener("click", addColor);
    colorWrapperElement.append(addButton);

    function appendColorElement(color: string, index: number) {
        let colorElement = document.createElement("input");
        colorElement.type = "color";
        colorElement.value = color;
        colorElement.classList.add("color-selector","form-control", "form-control-color");
        let colorWrapper = document.createElement("span");
        colorWrapper.classList.add("input-group");
        let colorRemover = document.createElement("button");
        colorRemover.classList.add("color-remover", "btn", "btn-danger");
        colorRemover.addEventListener("click", removeColor);


        colorWrapper.append(colorElement);
        colorWrapper.append(colorRemover);
        colorWrapperElement.append(colorWrapper);
        colorElement.addEventListener("change", updateColor);

        function updateColor(){
            settings.colors[index] = colorElement.value;
            saveSettingsToStorage();
        }

        function removeColor(){
            settings.colors.splice(index, 1);
            saveSettingsToStorage();
            setupColors();
        }
    }

    function addColor(){
        let newColor = "#000000";
        settings.colors.push(newColor);
        setupColors();
    }
}
//#endregion