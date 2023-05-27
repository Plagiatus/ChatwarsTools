
interface StorageData {
    [hash: string]: PersistentStorageData,
}
interface PersistentStorageData {
    campfireCodes: { [location: string]: string },
    disabledTiles: string[],
    lastModified: number,
}
interface PersistentData {
    campfireCodes: Map<string, string>,
    disabledTiles: Set<string>,
}

let currentMapHash = "";
let persistent: PersistentData = { campfireCodes: new Map(), disabledTiles: new Set() };
/**
 * Tries to find the saved data for this maze in the local storage.
 */
async function loadPersistentDataFromStorage(img: File) {
    currentMapHash = await hashFile(img);
    let rawStorageData = localStorage.getItem("persistent") ?? "{}";
    const storageData: StorageData = JSON.parse(rawStorageData);
    let mapStorageData = storageData[currentMapHash.substring(0, 10)];
    if (!mapStorageData) {
        mapStorageData = {campfireCodes: {}, disabledTiles: [], lastModified: Date.now()};
        persistent = { campfireCodes: new Map(), disabledTiles: new Set() };
    }

    loadDisabledFromStorage(mapStorageData.disabledTiles);
    loadCampfireFromStorage(mapStorageData.campfireCodes);

    savePersistentDataToStorage();

    removeOldMapData(storageData);

    function loadDisabledFromStorage(newDisabled: string[]) {
        for (let d of newDisabled) {
            persistent.disabledTiles.add(d);
        }
        resetDisabled();
    }
    function loadCampfireFromStorage(newCampfire: { [location: string]: string }) {
        for (let loc in newCampfire) {
            persistent.campfireCodes.set(loc, newCampfire[loc]);
        }
    }
}

function savePersistentDataToStorage() {
    if(!currentMapHash) return;
    let rawStorageData = localStorage.getItem("persistent");
    if(!rawStorageData) rawStorageData = "{}";
    const storageData: StorageData = JSON.parse(rawStorageData);

    let newData: PersistentStorageData = { campfireCodes: {}, disabledTiles: [], lastModified: Date.now() };

    newData.disabledTiles = Array.from(persistent.disabledTiles);
    for (let pair of persistent.campfireCodes) {
        newData.campfireCodes[pair[0]] = pair[1];
    }

    storageData[currentMapHash.substring(0, 10)] = newData;
    localStorage.setItem("persistent", JSON.stringify(storageData));
}

async function hashFile(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
}

function removeOldMapData(storageData: StorageData) {
    const maxAmountOfStoredMaps = 5;
    let overflow = Object.keys(storageData).length - maxAmountOfStoredMaps;

    while(overflow > 0) {
        let oldestTimestamp = Infinity;
        let oldestHash = "";
        for(let hash in storageData) {
            let data = storageData[hash];
            if(data.lastModified < oldestTimestamp){
                oldestHash = hash;
                oldestTimestamp = data.lastModified;
            }
        }
        delete storageData[oldestHash];
        overflow--;
    }
    localStorage.setItem("persistent", JSON.stringify(storageData));
}