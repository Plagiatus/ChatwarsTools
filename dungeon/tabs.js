"use strict";
let tabs = document.querySelectorAll("button[role=tab]");
for (let tab of tabs) {
    tab.addEventListener("click", activateTab);
    if (tab.classList.contains("active")) {
        tab.dispatchEvent(new MouseEvent("click", { relatedTarget: tab }));
    }
}
function activateTab(event) {
    let activeTab = event.target;
    if (!activeTab)
        return;
    for (let tab of tabs) {
        tab.classList.remove("active");
        let target = document.querySelector(tab.dataset.tabTarget ?? "");
        if (!target)
            continue;
        target.classList.add("hidden");
        if (activeTab.id != tab.id)
            continue;
        target.classList.remove("hidden");
        tab.classList.add("active");
    }
}
//# sourceMappingURL=tabs.js.map