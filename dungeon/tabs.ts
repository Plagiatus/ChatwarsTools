// find all tabs and give them click detections to switch between contents
let tabs: NodeListOf<HTMLButtonElement> = document.querySelectorAll("button[role=tab]");
for(let tab of tabs) {
    tab.addEventListener("click", activateTab);
    if(tab.classList.contains("active")) {
        tab.dispatchEvent(new MouseEvent("click", {relatedTarget: tab}));
    }
}

function activateTab(event: MouseEvent) {
    let activeTab: HTMLElement = <HTMLElement>event.target;
    if(!activeTab) return;
    for(let tab of tabs) {
        tab.classList.remove("active");
        let target: HTMLElement | null = document.querySelector(tab.dataset.tabTarget ?? "");
        if(!target) continue;
        target.classList.add("hidden");
        if(activeTab.id != tab.id) continue;
        target.classList.remove("hidden");
        tab.classList.add("active");
    }
}