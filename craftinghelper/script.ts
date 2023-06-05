interface Item {
	id: number,
	name: string,
	recipe: Ingredient[],
	manacost: number
}

interface Ingredient {
	id: string,
	amount: number,
}

interface StockItem extends Ingredient {
	active: boolean;
}

interface CalculateItem extends OfficialItem {
	amount: number,
	toGuild: boolean,
}

interface OfficialItem {
	id: string,
	name: string,
	craftMana: number,
	recipe: OfficialCraftItem[],
}

interface OfficialCraftItem {
	name: string,
	qty: string,
}


let items: OfficialItem[] = [];
let guildItems: StockItem[] = [];
let stockItems: StockItem[] = [];
let calculatedOnce: boolean = false;
let itemsToCraftStorage: CalculateItem[] = [];
let itemsToCraftCombinedStorage: CalculateItem[] = [];

async function loadItems(): Promise<void> {
	try {
		let response: Response = await fetch("https://raw.githubusercontent.com/AVee/cw_wiki_sync/master/data/resources_v2.json");
		let json: OfficialItem[] = (<any>await response.json()).items.sort(sortByDate);
		items = json;
	} catch (error) {
		alert("Sorry, something went wrong. Is your internet working?\n\n" + error);
	}

	Array.from(document.getElementsByTagName("textarea")).forEach(el => { el.dispatchEvent(new Event("input")) });
}

function sortByDate(a: any, b: any): number {
	const aDate = new Date(a.lastModified);
	const bDate = new Date(b.lastModified);
	return bDate.getTime() - aDate.getTime();
}

loadItems();

function analyseStock() {
	stockItems = [];
	let text: string = (<HTMLTextAreaElement>document.getElementById("playerstock")).value;
	let splitLines: string[] = text.split("\n");
	for (let l of splitLines) {
		l = l.trim();
		let splits: string[] = l.split(" ");
		if (splits[0].startsWith("/sg_")) {
			let itemid: string = splits[0].substr(4);
			let itemAmount: number = parseInt(l.split("(")[1].slice(0, -1));

			stockItems.push({ id: itemid, amount: itemAmount, active: true })
		} else if (l.endsWith(")")) {
			let itemname: string = l.replace(splits[splits.length - 1], "").trim();
			let itemAmount: number = parseInt(l.split("(")[1].slice(0, -1));
			let itemid: string | undefined = getItemInformation(itemname)?.id;
			if (!itemid) continue;
			stockItems.push({ id: itemid, amount: itemAmount, active: true })
		}
	}
	stockItems = stockItems.sort(sortIngredients);
	displayStock(<HTMLUListElement>document.getElementById("playerstock_processed"), stockItems, "player")
}

function analyseGuildStock() {
	guildItems = [];
	let text: string = (<HTMLTextAreaElement>document.getElementById("guildstock")).value;
	let splitLines: string[] = text.split("\n");
	for (let l of splitLines) {
		l = l.trim();
		let itemid: string = l.split(" ")[0];
		if (!getItemInformation(itemid)) continue;
		let lsplit: string[] = l.split("x");
		let itemAmount: number = parseInt(lsplit[lsplit.length - 1].trim());

		guildItems.push({ id: itemid, amount: itemAmount, active: true })
	}
	guildItems = guildItems.sort(sortIngredients);
	// console.log(guildItems);
	displayStock(<HTMLUListElement>document.getElementById("guildstock_processed"), guildItems, "guild")
}

function displayStock(parent: HTMLUListElement, stock: StockItem[], type: string) {
	parent.innerHTML = "";
	if (stock.length <= 0) return;
	let span: HTMLSpanElement = document.createElement("span");
	span.classList.add("alert"); span.classList.add("alert-info");
	span.innerText = "De-select the items you don't want to be factored into the calculations."
	parent.appendChild(span);
	for (let s of stock) {
		let li: HTMLLIElement = document.createElement("li");
		li.classList.add("list-group-item");
		let input: HTMLInputElement = document.createElement("input");
		input.type = "checkbox"; input.id = `${type}-${s.id}`; input.name = `${type}-${s.id}`; input.checked = s.active; input.classList.add("stock-checkbox"); input.classList.add("form-check-input");
		input.addEventListener("change", toggleStock);
		li.appendChild(input);
		let label: HTMLLabelElement = document.createElement("label"); label.setAttribute("for", `${type}-${s.id}`);
		let span: HTMLSpanElement = document.createElement("span");
		span.innerHTML = `<code class="item-id">${s.id}</code> <span class="item-name">${getItemInformation(s.id)?.name}</span> <span class="item-amount">x ${s.amount}</span>`;
		li.appendChild(span);
		label.appendChild(li);

		parent.appendChild(label);

		function toggleStock(this: HTMLInputElement) {
			s.active = this.checked;
			this.checked ? this.parentElement?.classList.remove("text-muted") : this.parentElement?.classList.add("text-muted");
		}
	}
}

function toggleStock(this: HTMLInputElement) {
	let relevantItems: StockItem[] = [];
	if (this.id.startsWith("player")) {
		relevantItems = stockItems;
	} else {
		relevantItems = guildItems;
	}
	relevantItems.find(el => el.id == this.id.split("-")[1]);
}

function getItemInformation(id: string): OfficialItem | undefined {
	let result = items.find(element => element.id == id);
	if (!result)
		result = items.find(element => element.name.toLowerCase() == id.toLowerCase());
	return result
}

function sortIngredients(a: Ingredient, b: Ingredient): number {
	let anum: number = parseInt(a.id);
	let bnum: number = parseInt(b.id);
	if (!isNaN(anum) && !isNaN(bnum))
		return anum - bnum;
	if (!isNaN(anum) && isNaN(bnum))
		return 1
	if (isNaN(anum) && !isNaN(bnum))
		return -1
	return ('' + a.id).localeCompare(b.id);
}

function calculate() {
	calculatedOnce = true;
	document.getElementById("result")?.classList.add("hidden");
	updateErrorDisplay();
	let items: CalculateItem[] = readNeededItems();
	if (items.length <= 0) return;

	let bsWonders: number = parseInt((<HTMLInputElement>document.getElementById("bs-wonders-value"))?.value) || 0;
	try {
		calculateNeededItems(items, bsWonders);
	} catch (error) {
		updateErrorDisplay("An Error occured during calculations:\n" + error);
	}
}

function updateErrorDisplay(error?: string, warning: boolean = false) {
	let errorElement: HTMLParagraphElement = (<HTMLParagraphElement>document.getElementById("error-output"));
	empty(errorElement);
	if (warning) {
		errorElement.classList.remove("alert-danger");
		errorElement.classList.add("alert-warning");
	} else {
		errorElement.classList.add("alert-danger");
		errorElement.classList.remove("alert-warning");
	}
	if (!error) {
		errorElement.classList.add("hidden");
		return;
	}
	errorElement.appendChild(new Text(error));
	errorElement.classList.remove("hidden");
}

function readNeededItems(): CalculateItem[] {
	let ids: HTMLCollectionOf<HTMLInputElement> = <HTMLCollectionOf<HTMLInputElement>>document.getElementsByClassName("crafting-item");
	let amounts: HTMLCollectionOf<HTMLInputElement> = <HTMLCollectionOf<HTMLInputElement>>document.getElementsByClassName("crafting-amount");
	let toGuilds: HTMLCollectionOf<HTMLInputElement> = <HTMLCollectionOf<HTMLInputElement>>document.getElementsByClassName("crafting-to-guild");
	if (ids.length != amounts.length) {
		updateErrorDisplay("Amount of items doesn't match the amount of amounts.");
		return [];
	}
	if (ids.length <= 0) {
		updateErrorDisplay("There needs to be at least one item.");
		return [];
	}
	let result: CalculateItem[] = [];
	let errored: boolean = false;
	for (let i: number = 0; i < ids.length; i++) {
		ids[i].setCustomValidity("");
		amounts[i].setCustomValidity("");
		let idToCraft: string = ids[i].value.trim();
		let amountToCraft: number = parseInt(amounts[i].value.trim());
		let depositToGuild: boolean = toGuilds[i].checked;
		if (!idToCraft) {
			errored = true;
			ids[i].setCustomValidity("Item field empty.");
			continue;
		}
		let item: OfficialItem | undefined = getItemInformation(idToCraft);
		if (!item) {
			errored = true;
			ids[i].setCustomValidity("Item not found. Might be missing in my database or just not exist.");
			continue;
		}
		if (Object.keys(item.recipe).length <= 0) {
			errored = true;
			ids[i].setCustomValidity("Item is not craftable.");
			continue;
		}
		if (isNaN(amountToCraft) || amountToCraft <= 0) {
			errored = true;
			amounts[i].setCustomValidity("Not a valid item amount.")
			continue;
		}
		result.push(itemToCalcItem(item, amountToCraft, depositToGuild));
	}

	if (result.length <= 0) {
		updateErrorDisplay("No valid entires found.");
	} else if (errored) {
		updateErrorDisplay("Input partially failed. Only using the valid items.", true);
	}

	return result;
}

function calculateNeededItems(neededItems: CalculateItem[], bsWonders: number) {
	let availablePlayerItems: StockItem[] = JSON.parse(JSON.stringify(stockItems));
	let availableGuildItems: StockItem[] = JSON.parse(JSON.stringify(guildItems));
	let neededFromPlayer: Ingredient[] = [];
	let neededFromGuild: Ingredient[] = [];
	let notAvailable: Ingredient[] = [];
	let depositToGuild: Ingredient[] = [];
	let itemsToCraft: CalculateItem[] = [];
	let amountWithBSWDeducted: number = 1 / (1 + (bsWonders * 0.02));

	for (let item of neededItems) {
		if (!item.toGuild) {
			item.amount = Math.ceil(item.amount * amountWithBSWDeducted);
		}
	}


	do {
		let currentItem: CalculateItem = <CalculateItem>neededItems.pop();
		if (currentItem.toGuild) {
			for (let ingredient of currentItem.recipe) {
				let amountNeeded = Math.ceil(parseInt(ingredient.qty) * currentItem.amount);
				let item: OfficialItem = <OfficialItem>getItemInformation(ingredient.name);
				if (!item) {
					throw Error(`Item not found: ${ingredient.name}`);
				};

				let guilditem: StockItem | undefined = availableGuildItems.find(el => el.id == item.id && el.active);
				if (guilditem) {
					guilditem.amount -= amountNeeded;
					if (guilditem.amount < 0) {
						amountNeeded = guilditem.amount * -1;
						guilditem.amount = 0;
					} else {
						continue;
					}
				}

				let playeritem: StockItem | undefined = availablePlayerItems.find(el => el.id == item.id && el.active);
				if (playeritem) {
					let amount: number = playeritem.amount;
					playeritem.amount -= amountNeeded;
					if (playeritem.amount < 0) {
						amountNeeded = playeritem.amount * -1;
						neededFromPlayer.push({ id: item.id, amount: amount })
						depositToGuild.push({ id: item.id, amount: amount })
						playeritem.amount = 0;
					} else {
						neededFromPlayer.push({ id: item.id, amount: amountNeeded })
						depositToGuild.push({ id: item.id, amount: amountNeeded })
						continue;
					}
				}

				if (amountNeeded > 0) {
					if (item && Object.keys(item.recipe).length > 0) {
						neededItems.push(itemToCalcItem(item, amountNeeded));
						depositToGuild.push({ id: item.id, amount: amountNeeded });
					} else if (item) {
						notAvailable.push({ amount: amountNeeded, id: item.id });
					}
				}
			}
			continue;
		}
		for (let ingredient of currentItem.recipe) {
			let amountNeeded = Math.ceil(parseInt(ingredient.qty) * currentItem.amount * amountWithBSWDeducted);
			let item: OfficialItem = <OfficialItem>getItemInformation(ingredient.name);
			if (!item) {
				throw Error(`Item not found: ${ingredient.name}`);
			};
			let playeritem: StockItem | undefined = availablePlayerItems.find(el => el.id == item.id && el.active);
			if (playeritem) {
				let amount: number = playeritem.amount;
				playeritem.amount -= amountNeeded;
				if (playeritem.amount < 0) {
					amountNeeded = playeritem.amount * -1;
					neededFromPlayer.push({ id: item.id, amount: amount })
					playeritem.amount = 0;
				} else {
					neededFromPlayer.push({ id: item.id, amount: amountNeeded })
					continue;
				}
			}
			let guilditem: StockItem | undefined = availableGuildItems.find(el => el.id == item.id && el.active);
			if (guilditem && guilditem.amount > 0) {
				let amount: number = guilditem.amount;
				guilditem.amount -= amountNeeded;
				if (guilditem.amount < 0) {
					amountNeeded = guilditem.amount * -1;
					neededFromGuild.push({ id: item.id, amount: amount })
					guilditem.amount = 0;
				} else {
					neededFromGuild.push({ id: item.id, amount: amountNeeded })
					continue;
				}
			}
			if (amountNeeded > 0) {
				if (item && Object.keys(item.recipe).length > 0) {
					neededItems.push(itemToCalcItem(item, amountNeeded));
				} else if (item) {
					notAvailable.push({ amount: amountNeeded, id: item.id });
				}
			}
		}
		itemsToCraft.push(currentItem);
	} while (neededItems.length > 0);

	neededFromGuild = combine(neededFromGuild).sort(sortIngredients);
	neededFromPlayer = combine(neededFromPlayer).sort(sortIngredients);
	notAvailable = combine(notAvailable).sort(sortIngredients);
	depositToGuild = combine(depositToGuild).sort(sortIngredients);
	itemsToCraft = itemsToCraft.reverse();

	console.group("results");
	console.log("Needed from Guild:", neededFromGuild);
	console.log("Not Available:", notAvailable);
	console.log("Crafting Steps:", itemsToCraft);
	console.log("Taken from Player:", neededFromPlayer);
	console.log("Deposit to guild:", depositToGuild);
	console.groupEnd();

	empty(document.getElementById("unavailable")!).appendChild(formatUnavailable(notAvailable));
	empty(document.getElementById("withdraws")!).appendChild(formatWithdraws(neededFromGuild));
	// empty(document.getElementById("crafting")!).appendChild(formatCrafting(itemsToCraft));
	empty(document.getElementById("playerused")!).appendChild(formatPlayerUsed(neededFromPlayer));
	empty(document.getElementById("deposit")!).appendChild(formatDeposit(depositToGuild));
	document.getElementById("result")?.classList.remove("hidden");

	itemsToCraftStorage = JSON.parse(JSON.stringify(itemsToCraft));
	itemsToCraftCombinedStorage = JSON.parse(JSON.stringify(combineCalcitem(itemsToCraft)));
	document.getElementById("crafting-toggle")?.dispatchEvent(new Event("change"));
}


function itemToCalcItem(item: OfficialItem, amount: number, depositToGuild: boolean = false): CalculateItem {
	return { amount: amount, id: item.id, name: item.name, craftMana: item.craftMana, recipe: item.recipe, toGuild: depositToGuild }
}

function combine(igarr: Ingredient[]): Ingredient[] {
	let newig: Ingredient[] = [];
	for (let i of igarr) {
		let elem = newig.find(el => el.id == i.id)
		if (elem) {
			elem.amount += i.amount;
		} else {
			newig.push({ id: i.id, amount: i.amount });
		}
	}
	return newig;
}

function combineCalcitem(igarr: CalculateItem[]): CalculateItem[] {
	let newig: CalculateItem[] = [];
	for (let i of igarr) {
		let elem = newig.find(el => el.id == i.id)
		if (elem) {
			elem.amount += i.amount;
		} else {
			newig.push({ id: i.id, amount: i.amount, craftMana: i.craftMana, name: i.name, recipe: JSON.parse(JSON.stringify(i.recipe)), toGuild: false });
		}
	}
	return newig;

}

function empty(elem: HTMLElement): HTMLElement {
	for (let c of elem.childNodes) {
		c.remove();
	}
	return elem;
}

function formatUnavailable(arr: Ingredient[]): HTMLElement {
	if (arr.length <= 0) return returnNone();
	let div: HTMLDivElement = document.createElement("div");
	let span: HTMLSpanElement = document.createElement("span");
	span.appendChild(document.createTextNode("You need more of the following: "))
	div.appendChild(span);

	let ul: HTMLUListElement = document.createElement("ul");
	for (let u of arr) {
		let li: HTMLLIElement = document.createElement("li");
		li.innerHTML = `<code class="item-id">${u.id}</code> <span class="item-name">${getItemInformation(u.id)?.name}</span> <span class="item-amount">x ${u.amount}</span>`;
		ul.appendChild(li);
	}

	div.appendChild(ul);
	return div;
}

function formatWithdraws(arr: Ingredient[]): HTMLElement {
	if (arr.length <= 0) return returnNone();
	let itemsToWithdraw: Ingredient[] = [...arr];
	let ul: HTMLUListElement = document.createElement("ul");

	let totalWithdrawsText = "";
	while (itemsToWithdraw.length > 0) {
		let li: HTMLLIElement = document.createElement("li");
		let code: HTMLElement = document.createElement("code");
		code.innerText = "/g_withdraw "
		for (let i: number = 0; i < 9 && itemsToWithdraw.length > 0; i++) {
			let item = <Ingredient>itemsToWithdraw.pop();
			code.innerText += `${item.id} ${item.amount} `
		}

		li.appendChild(code);
		addCopyButton(li, code.innerText);
		ul.appendChild(li);
		totalWithdrawsText += "`" + code.innerText + "`\n";
	}
	ul.appendChild(document.createElement("br"));
	ul.appendChild(document.createTextNode(`Copy all `));
	addCopyButton(ul, totalWithdrawsText);

	return ul;
}

function formatCrafting(arr: CalculateItem[]): HTMLElement {
	if (arr.length <= 0) return returnNone();
	let ol: HTMLOListElement = document.createElement("ol");
	let totalMana: number = 0;
	let totalCraftingText = "";
	for (let i of arr) {
		let li: HTMLLIElement = document.createElement("li");
		let manacost: number = i.craftMana * i.amount;
		totalMana += manacost;
		let craftingText = `/c_${i.id} ${i.amount < 10 ? "0" : ""}${i.amount}`;
		li.innerHTML = `<code class="crafting-step">${craftingText}</code><span class="crafting-mana text-muted">${manacost} 💧</span>`;
		ol.appendChild(li);
		addCopyButton(li, craftingText);
		totalCraftingText += `\`${craftingText}\`\n`;
	}
	
	ol.appendChild(document.createTextNode(`Total: ${totalMana} 💧`));
	ol.appendChild(document.createElement("br"));
	ol.appendChild(document.createTextNode(`Copy all `));
	addCopyButton(ol, totalCraftingText);
	return ol;
}

function formatPlayerUsed(arr: Ingredient[]): HTMLElement {
	if (arr.length <= 0) return returnNone();
	let ul: HTMLUListElement = document.createElement("ul");

	for (let u of arr) {
		let li: HTMLLIElement = document.createElement("li");
		li.innerHTML = `<code class="item-id">${u.id}</code> <span class="item-name">${getItemInformation(u.id)?.name}</span> <span class="item-amount">x ${u.amount}</span>`;
		ul.appendChild(li);
	}
	return ul;
}

function formatDeposit(arr: Ingredient[]): HTMLElement {
	if (arr.length <= 0) return returnNone();
	let ol: HTMLOListElement = document.createElement("ol");
	let totalDepositText = "";
	for (let i of arr) {
		let li: HTMLLIElement = document.createElement("li");
		let copyText = `/gd_${i.id}_${i.amount}`;
		li.innerHTML = `<code class="crafting-step">${copyText}</code>`;
		ol.appendChild(li);
		addCopyButton(li, copyText);
		
		totalDepositText += `\`${copyText}\`\n`;
	}

	
	ol.appendChild(document.createElement("br"));
	ol.appendChild(document.createTextNode(`Copy all `));
	addCopyButton(ol, totalDepositText);

	return ol;
}

function returnNone(): HTMLElement {
	let elem: HTMLSpanElement = document.createElement("span");
	elem.innerText = "none";
	return elem;
}

function toggleCrafting(this: HTMLInputElement) {
	if (calculatedOnce) {
		if (this.checked)
			empty(document.getElementById("crafting")!).appendChild(formatCrafting(itemsToCraftCombinedStorage));
		else
			empty(document.getElementById("crafting")!).appendChild(formatCrafting(itemsToCraftStorage));
	}
}

function findID(this: HTMLInputElement, _e: Event): void {
	let search: string = this.value.toLowerCase().trim();
	let possibleResults: OfficialItem[] = JSON.parse(JSON.stringify(items));
	let actualResults: OfficialItem[] = [];
	for (let oi of possibleResults) {
		if (oi.name.toLowerCase().includes(search) || oi.id.toLowerCase().includes(search)) {
			actualResults.push(oi);
		}
	}
	updateIDOptions(actualResults);
}

function updateIDOptions(options: OfficialItem[]) {
	let selector: HTMLSelectElement = <HTMLSelectElement>document.getElementById("item-id-select");
	// empty(selector);
	selector.innerHTML = "";
	for (let o of options) {
		let option: HTMLOptionElement = document.createElement("option");
		option.value = o.id;
		option.appendChild(new Text(o.name));
		selector.appendChild(option);
	}
	selector.dispatchEvent(new Event("change"));
}

function displayFoundID(this: HTMLSelectElement, _e?: Event) {
	let id: string = this.value;
	let item: OfficialItem | undefined = getItemInformation(id);
	let output: HTMLOutputElement = <HTMLOutputElement>document.getElementById("item-id-output");
	output.innerHTML = "";
	if (!item) return;
	output.appendChild(new Text(item.id))
}

function additem(): HTMLElement | null {
	let template: HTMLTemplateElement = <HTMLTemplateElement>document.getElementById("template-items");
	let newNode: HTMLElement = <HTMLElement>template.content.cloneNode(true);
	let tr: HTMLTableRowElement = <HTMLTableRowElement>newNode.querySelector("tr")
	let craftingItemsElement = document.getElementById("crafting-items");
	craftingItemsElement?.appendChild(tr);
	for (let minus of <NodeListOf<HTMLElement>>tr?.querySelectorAll(".bi-dash-square-fill")) {
		// minus.removeEventListener("click", removeItem);
		minus.addEventListener("click", removeItem);
	}
	for (let input of <NodeListOf<HTMLElement>>tr?.querySelectorAll(".crafting-input")) {
		// input.removeEventListener("input", removeInvalidity);
		input.addEventListener("input", removeInvalidity);
	}
	return tr;
}

function removeItem(this: Element, _e: Event) {
	this.parentElement?.parentElement?.remove();
}

function removeInvalidity(this: HTMLInputElement, _e: Event) {
	this.setCustomValidity("");
}

let copyButtonTemplate: HTMLTemplateElement = <HTMLTemplateElement>document.getElementById("template-copy");

function addCopyButton(parentElement: HTMLElement, textToCopy: string) {
	let newButton = <HTMLButtonElement>copyButtonTemplate.content.cloneNode(true).childNodes[1];
	parentElement.appendChild(newButton);
	newButton.addEventListener("click", copyPreviousElementsText);

	function copyPreviousElementsText(this: HTMLButtonElement, _e: Event): void {
		let copyTextArea: HTMLTextAreaElement = document.createElement("textarea");
		//prevent scrolling down
		copyTextArea.style.top = "0";
		copyTextArea.style.left = "0";
		copyTextArea.style.position = "fixed";

		document.body.appendChild(copyTextArea);
		copyTextArea.value = textToCopy;
		copyTextArea.focus();
		copyTextArea.select();
		document.execCommand("copy");
		copyTextArea.remove();

		newButton.innerHTML = `<svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-clipboard-check" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
    <path fill-rule="evenodd" d="M9.5 1h-3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3zm4.354 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
    </svg>`;

		setTimeout(() => {
			newButton.innerHTML = `<svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-clipboard" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
      <path fill-rule="evenodd" d="M9.5 1h-3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
    </svg>`
		}, 1000);
	}
}

function clearStock() {
	let el: HTMLTextAreaElement = <HTMLTextAreaElement>document.getElementById("playerstock");
	el.value = "";
	el.dispatchEvent(new Event("input"));
}

function clearGuildStock() {
	let el: HTMLTextAreaElement = <HTMLTextAreaElement>document.getElementById("guildstock");
	el.value = "";
	el.dispatchEvent(new Event("input"));
}


document.getElementById("crafting-toggle")?.addEventListener("change", toggleCrafting);
document.getElementById("crafting-toggle")?.dispatchEvent(new Event("change"));

document.getElementById("search-item-id")?.addEventListener("input", findID);
document.getElementById("item-id-select")?.addEventListener("change", displayFoundID);

(<HTMLInputElement>document.getElementById("search-item-id")).value = "";

if (!loadFromUrl()) {
	additem();
}

function loadFromUrl(): boolean {
	let params = new URLSearchParams(window.location.search.substring(1));
	let craftstring: string | null = params.get("c");
	if (!craftstring) return false;
	let crafts: string[] = craftstring.split(/[ ,]/);
	if (crafts.length == 0 || crafts.length % 2 != 0) return false;
	let craftPairs: [string, string][] = [];
	for (let i: number = 0; i < crafts.length; i += 2) {
		craftPairs.push([crafts[i], crafts[i + 1]]);
	}

	for (let pair of craftPairs) {
		let newRow: HTMLElement | null = additem();
		let inputs: NodeListOf<HTMLInputElement> = <NodeListOf<HTMLInputElement>>newRow?.querySelectorAll(".crafting-input");
		if (!inputs) continue;
		inputs[0].value = pair[0];
		inputs[1].value = pair[1];
	}

	return true;
}