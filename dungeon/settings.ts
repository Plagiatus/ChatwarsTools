interface Settings {
    maxSteps: number,
    startResetsPath: boolean,
    bossHighlighted: boolean,
    startHighlighted: boolean,
    boss: {
        onlyThroughBonfires: boolean,
        weights: { fountain: number, bonfire: number, monster: number },
    }
}

// get relevant HTML Elements
const maxStepsElement = <HTMLInputElement>document.getElementById("maxSteps");
const startResetsPathElement = <HTMLInputElement>document.getElementById("startResetsPaths");
const highlightBossElement = <HTMLInputElement>document.getElementById("highlightBossCheck");
const highlightStartElement = <HTMLInputElement>document.getElementById("highlightStartCheck");

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

document.getElementById("resetSettings")!.addEventListener("click", resetSettings);

//#region values changed in the UI -> update in storage
function maxStepsChange(this: HTMLInputElement, e: Event) {
    settings.maxSteps = +this.value;
    if (isNaN(settings.maxSteps) || settings.maxSteps <= 0) settings.maxSteps = 30;
    this.value = settings.maxSteps.toString();
    saveSettingsToStorage();
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
}
function highlightStartChange(this: HTMLInputElement, e: Event) {
    settings.startHighlighted = this.checked;
    if (settings.startHighlighted === undefined) settings.startHighlighted = false;
    this.checked = settings.startHighlighted;
    saveSettingsToStorage();
}
function approachBossOnlyThroughBonfireChange(this: HTMLInputElement, e: Event) {
    settings.boss.onlyThroughBonfires = this.checked;
    if (settings.boss.onlyThroughBonfires === undefined) settings.boss.onlyThroughBonfires = false;
    this.checked = settings.boss.onlyThroughBonfires;
    saveSettingsToStorage();
}
function fountainWeightChange(this: HTMLInputElement, e: Event) {
    settings.boss.weights.fountain = +this.value;
    if (isNaN(settings.boss.weights.fountain) || settings.boss.weights.fountain <= 0) settings.boss.weights.fountain = 30;
    this.value = settings.boss.weights.fountain.toString();
    saveSettingsToStorage();
}
function bonfireWeightChange(this: HTMLInputElement, e: Event) {
    settings.boss.weights.bonfire = +this.value;
    if (isNaN(settings.boss.weights.bonfire) || settings.boss.weights.bonfire <= 0) settings.boss.weights.bonfire = 30;
    this.value = settings.boss.weights.bonfire.toString();
    saveSettingsToStorage();
}
function monsterWeightChange(this: HTMLInputElement, e: Event) {
    settings.boss.weights.monster = +this.value;
    if (isNaN(settings.boss.weights.monster) || settings.boss.weights.monster <= 0) settings.boss.weights.monster = 30;
    this.value = settings.boss.weights.monster.toString();
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
    if (loadedSettings.boss === undefined) loadedSettings.boss = { onlyThroughBonfires: true, weights: { bonfire: 5, fountain: 1, monster: 3 } };
    if (loadedSettings.boss.onlyThroughBonfires === undefined) loadedSettings.boss.onlyThroughBonfires = true;
    if (loadedSettings.boss.weights === undefined) loadedSettings.boss.weights = { bonfire: 5, fountain: 1, monster: 3 };
    if (!loadedSettings.boss.weights.fountain) loadedSettings.boss.weights.fountain = 1;
    if (!loadedSettings.boss.weights.bonfire) loadedSettings.boss.weights.bonfire = 5;
    if (!loadedSettings.boss.weights.monster) loadedSettings.boss.weights.monster = 3;

    saveSettingsToStorage(loadedSettings);
    return loadedSettings;
}

function saveSettingsToStorage(s: Settings = settings) {
    localStorage.setItem("settings", JSON.stringify(s));
}

function syncUIToValues(){
    //apply loaded settings to the page elements
    maxStepsElement.value = settings.maxSteps.toString();
    startResetsPathElement.checked = settings.startResetsPath;
    highlightBossElement.checked = settings.bossHighlighted;
    highlightStartElement.checked = settings.startHighlighted;
    approachBossOnlyThroughBonfireElement.checked = settings.boss.onlyThroughBonfires;
    fountainWeightElement.value = settings.boss.weights.fountain.toString();
    bonfireWeightElement.value = settings.boss.weights.bonfire.toString();
    monsterWeightElement.value = settings.boss.weights.monster.toString();
}

function resetSettings() {
    settings.maxSteps = 30;
    settings.bossHighlighted = false;
    settings.startHighlighted = false;
    settings.startResetsPath = false;
    settings.boss = {onlyThroughBonfires: true, weights: { bonfire: 5, fountain: 1, monster: 3 }};
    saveSettingsToStorage();
    syncUIToValues();
}