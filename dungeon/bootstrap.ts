/*
    Tabs 
*/
function setupTabs(){
    let tabGroups: NodeListOf<HTMLElement> = document.querySelectorAll(".nav-tabs");
    for(let group of tabGroups){
        // find all tabs and give them click detections to switch between contents
        let tabs: NodeListOf<HTMLButtonElement> = group.querySelectorAll("button[role=tab]");
        for (let tab of tabs) {
            tab.addEventListener("click", activateTab);
            if (tab.classList.contains("active")) {
                tab.dispatchEvent(new MouseEvent("click", { relatedTarget: tab }));
            }
        }
        
        function activateTab(event: MouseEvent) {
            let activeTab: HTMLElement = <HTMLElement>event.target;
            if (!activeTab) return;
            for (let tab of tabs) {
                tab.classList.remove("active");
                let target: HTMLElement | null = document.querySelector(tab.dataset.tabTarget ?? "");
                if (!target) continue;
                target.classList.add("hidden");
                if (activeTab.id != tab.id) continue;
                target.classList.remove("hidden");
                tab.classList.add("active");
            }
        }
    }

};
setupTabs();
    
/*
    Notifications
*/
const notificationWrapper: HTMLDivElement = <HTMLDivElement>document.getElementById("notifications");
const notificationTemplate: HTMLTemplateElement = <HTMLTemplateElement>document.getElementById("toast-template");

function showNotification(title: string, content: string, classes: string[] = [], vanishAfter: number = 7) {
    let timeout: number = 0;

    let newNotificationElement: HTMLElement = <HTMLElement>notificationTemplate.content.firstElementChild!.cloneNode(true);
    newNotificationElement.querySelector("#toast-title")!.innerHTML = title;
    newNotificationElement.querySelector("#toast-header")!.classList.add(...classes);
    newNotificationElement.querySelector("#toast-body")!.innerHTML = content;
    notificationWrapper.appendChild(newNotificationElement);
    newNotificationElement.querySelector("#close-button")!.addEventListener("click", removeNotification);
    newNotificationElement.addEventListener("mouseenter", abortRemoval);
    newNotificationElement.addEventListener("mouseleave", startRemoval);

    let timerBar: HTMLElement = newNotificationElement.querySelector("#toast-timer-bar")!;
    timerBar.style.animationDuration = vanishAfter + "s";
    startRemoval();

    function startRemoval() {
        if (timeout) abortRemoval();
        if (vanishAfter > 0) {
            timeout = setTimeout(removeNotification, vanishAfter * 1000);
            timerBar.style.animationName = "timer-bar";
        }
    }
    function abortRemoval() {
        if (timeout) {
            clearTimeout(timeout);
            timerBar.style.animationName = "none";
        }
    }
    function removeNotification() {
        newNotificationElement.remove();
    }
}