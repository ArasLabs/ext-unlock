/*
Used by MainGridFactory.js
*/

function ItemGrid() {}

inherit(ItemGrid, BaseItemTypeGrid);

ItemGrid.prototype.onInitialize = function ItemGrid_onInitialize() {
	var isInitialized = ItemGrid.superclass.onInitialize(),
		menuItem, i;

	if (renamingMenuItems !== undefined) {
		for (i = 0; i < renamingMenuItems.length; i++) {
			menuItem = menuFrm.menuApplet.findItem(renamingMenuItems[i].oldKey);

			if (menuItem !== undefined) {
				menuItem.setLabel(aras.getResource("", "common." + renamingMenuItems[i].oldKey));
			}
		}
		renamingMenuItems = undefined;
		menuFrm.showDefaultToolbar();
	}
	return isInitialized;
}

ItemGrid.prototype.setMenuState = function ItemGrid_setMenuState(rowId, col) {
	var popupMenu = grid.getMenu();
	popupMenu.removeAll();

	if (currQryItem) {
		var queryItem = currQryItem.getResult(),
			itemNd = queryItem.selectSingleNode("Item[@id=\"" + rowId + "\"]") || aras.getFromCache(rowId),
			brokenFlg = !Boolean(itemNd),
			itemIDs, itemIdsCount;

		popupMenuSate["New"] = (can_addFlg); //0
		popupMenuSate["separator0"] = true;
		popupMenuSate["Save"] = false; //2
		popupMenuSate["Save As"] = false;
		popupMenuSate["Edit"] = false; //3
		popupMenuSate["View"] = false; //4
		popupMenuSate["Print"] = false; //5
		popupMenuSate["separator1"] = true;
		popupMenuSate["Purge"] = false; //7
		popupMenuSate["Delete"] = false; //8
		popupMenuSate["separator1.5"] = true;
		popupMenuSate["Export To Excel"] = true;
		popupMenuSate["Export To Word"] = true;
		popupMenuSate["separator2"] = true;
		popupMenuSate["Lock"] = false; //10
		popupMenuSate["Unlock"] = false; //11
		popupMenuSate["Undo"] = false; //12
		popupMenuSate["separator3"] = true;
		popupMenuSate["separator4"] = true;
		popupMenuSate["Version"] = false;
		popupMenuSate["Revisions"] = false;
		popupMenuSate["separator5"] = true;
		popupMenuSate["Promote"] = false;
		popupMenuSate["separator6"] = true;
		popupMenuSate["Where Used"] = false;
		popupMenuSate["Structure Browser"] = false;
		popupMenuSate["separator7"] = true;
		popupMenuSate["Properties"] = false;
		popupMenuSate["separator8"] = true;
		popupMenuSate["Add to Desktop"] = false;

		if (!brokenFlg && currItemType) {
			itemIDs = grid.getSelectedItemIds();
			itemIdsCount = itemIDs.length;

			var itemID = rowId;
			var locked_by = aras.getItemProperty(itemNd, "locked_by_id");
			var isTemp = aras.isTempEx(itemNd);
			var isDirty = aras.isDirtyEx(itemNd);
			var ItemIsLocked = aras.isLocked(itemNd);

			var discoverOnlyFlg = (itemNd && itemNd.getAttribute("discover_only") == "1");
			var editFlg = ((isTemp || locked_by == userID) && !discoverOnlyFlg);
			var saveFlg = (editFlg && (aras.getFromCache(itemID) != null));
			var viewFlg = (locked_by != userID && itemIdsCount == 1 && !discoverOnlyFlg);
			var purgeFlg = (isTemp || (locked_by == ""));
			var lockFlg = aras.uiItemCanBeLockedByUser(itemNd, isRelationshipIT, use_src_accessIT);
			
			var unlockFlg = false;
			if (aras.isAdminUser(itemTypeName)) {
				unlockFlg = (!isTemp && locked_by != "");
			} else {
				unlockFlg = (locked_by == userID);
			}
			
			var copyFlg = (itemIdsCount == 1 && !isTemp && can_addFlg);
			var undoFlg = (!isTemp && isDirty);
			var promoteFlg = (locked_by == "" && !isTemp);
			var add2desktopFlg = !isTemp;

			var copy2clipboardFlg = aras.getItemProperty(currItemType, "is_relationship") == "1" && aras.getItemProperty(currItemType, "is_dependent") != "1" && (!isFunctionDisabled(itemTypeName, "Copy"));
			var pasteFlg = !aras.clipboard.isEmpty() && (isTemp || (locked_by == userID)) && (!isFunctionDisabled(itemTypeName, "Paste"));
			var pasteSpecialFlg = !aras.clipboard.isEmpty() && (isTemp || (locked_by == userID)) && (!isFunctionDisabled(itemTypeName, "Paste Special"));
			var showClipboardFlg = !aras.clipboard.isEmpty();
			var addItem2PackageFlg = ((itemID == "" || isTemp) ? false : true);

			if (itemIdsCount > 1) {
				var idsArray = [],
					itemNds, tmpItemNd,
					i;

				for (i = 0; i < itemIdsCount; i++) {
					idsArray.push("@id='" + itemIDs[i] + "'");
				}

				itemNds = queryItem.selectNodes("Item[" + idsArray.join(" or ") + "]");
				for (i = 0; i < itemNds.length; i++) {
					tmpItemNd = itemNds[i];
					itemID = aras.getItemProperty(tmpItemNd, "id");

					if (!tmpItemNd) {
						brokenFlg = true;
						break;
					}

					locked_by = aras.getItemProperty(tmpItemNd, "locked_by_id");
					isTemp = aras.isTempEx(tmpItemNd);
					isDirty = aras.isDirtyEx(tmpItemNd);

					editFlg = editFlg && (isTemp || (locked_by == userID));
					saveFlg = saveFlg && (editFlg && aras.getFromCache(itemID));
					purgeFlg = purgeFlg && (isTemp || (locked_by == ""));
					lockFlg = lockFlg && aras.uiItemCanBeLockedByUser(tmpItemNd, isRelationshipIT, use_src_accessIT);
					undoFlg = undoFlg && (!isTemp && isDirty);

					if (aras.isAdminUser(itemTypeName)) {
						unlockFlg = unlockFlg && (!isTemp && locked_by != "");
					} else {
						unlockFlg = unlockFlg && (locked_by == userID);
					}

					add2desktopFlg = add2desktopFlg & !isTemp;
					pasteFlg = pasteFlg && !aras.clipboard.isEmpty() && (isTemp || (locked_by == userID));
					pasteSpecialFlg = pasteSpecialFlg && !aras.clipboard.isEmpty() && (isTemp || (locked_by == userID));
					addItem2PackageFlg = ((itemID == "" || isTemp) ? false : true);
				}

				if (pasteFlg) {
					pasteFlg = aras.isLCNCompatibleWithIT(itemTypeID);
				}
			}
		}

		if (!brokenFlg) {
			var newSeparatorId = false,
				commandId, isSeparator;

			popupMenuSate["Save"] = saveFlg && !isFunctionDisabled(itemTypeName, "Save");
			popupMenuSate["Save As"] = (!(isFunctionDisabled(itemTypeName, "Save As")) && copyFlg);
			popupMenuSate["Edit"] = ((lockFlg || editFlg) && itemIDs && itemIdsCount == 1 && !discoverOnlyFlg) &&  !isFunctionDisabled(itemTypeName, "Edit");
			popupMenuSate["View"] = (viewFlg && itemIDs && itemIdsCount == 1) &&  !isFunctionDisabled(itemTypeName, "View");
			popupMenuSate["Print"] = (itemIDs && itemIdsCount == 1);
			popupMenuSate["Purge"] = (purgeFlg && isVersionableIT);
			popupMenuSate["Delete"] = purgeFlg &&  !isFunctionDisabled(itemTypeName, "Delete"); //delete is always available, but purge is only for versioanble
			popupMenuSate["Lock"] = lockFlg && !isFunctionDisabled(itemTypeName, "Lock");
			popupMenuSate["Unlock"] = unlockFlg && !isFunctionDisabled(itemTypeName, "Unlock");
			popupMenuSate["Undo"] = undoFlg;
			popupMenuSate["Version"] = (!(isFunctionDisabled(itemTypeName, "Version")) && isManualyVersionableIT && itemIDs && itemIdsCount == 1 && !isTemp && (locked_by == userID || locked_by == ""));
			popupMenuSate["Revisions"] = (isVersionableIT && !isTemp && itemIDs && itemIdsCount == 1);
			popupMenuSate["Promote"] = (promoteFlg && itemIDs && itemIdsCount == 1 && !(isFunctionDisabled(itemTypeName, "Promote")));
			popupMenuSate["Where Used"] = (itemIDs && itemIdsCount == 1);
			popupMenuSate["Structure Browser"] = (itemIDs && itemIdsCount == 1);
			popupMenuSate["Properties"] = (itemIDs && itemIdsCount == 1);
			popupMenuSate["Add to Desktop"] = add2desktopFlg;

			with (menuFrm) {
				setControlEnabled("new", can_addFlg);
				setControlEnabled("view", popupMenuSate["View"]);
				setControlEnabled("edit", popupMenuSate["Edit"]);
				setControlEnabled("save", popupMenuSate["Save"]);
				setControlEnabled("purge", popupMenuSate["Purge"]);
				setControlEnabled("delete", popupMenuSate["Delete"]);
				setControlEnabled("print", popupMenuSate["Print"]);
				setControlEnabled("saveAs", popupMenuSate["Save As"]);
				setControlEnabled("export2Excel", popupMenuSate["Export To Excel"]);
				setControlEnabled("export2Word", popupMenuSate["Export To Word"]);
				setControlEnabled("lock", popupMenuSate["Lock"]);
				setControlEnabled("unlock", popupMenuSate["Unlock"]);
				setControlEnabled("undo", popupMenuSate["Undo"]);
				setControlEnabled("promote", popupMenuSate["Promote"]);
				setControlEnabled("revisions", popupMenuSate["Revisions"]);
				setControlEnabled("copy2clipboard", copy2clipboardFlg);
				setControlEnabled("paste", pasteFlg);
				setControlEnabled("paste_special", pasteSpecialFlg);
				setControlEnabled("show_clipboard", showClipboardFlg);
				setControlEnabled("addItem2Package", addItem2PackageFlg);
			}

			for (commandId in popupMenuSate) {
				isSeparator = (commandId.search(/^separator/) == 0);

				if ((popupMenuSate[commandId] || popupMenuSate[commandId] === undefined) && !isSeparator) {
					if (newSeparatorId) {
						popupMenu.addSeparator(false, newSeparatorId);
						newSeparatorId = false;
					}
					popupMenu.add(commandId, popupMenuLabel[commandId]);

					if (popupMenuSate[commandId] === undefined) {
						popupMenu.setDisable(commandId, true);
					}
				}
				else if (isSeparator) {
					newSeparatorId = commandId;
				}
			}
		}
		else {
			with (menuFrm) {
				setControlEnabled("new", can_addFlg);
				setControlEnabled("view", false);
				setControlEnabled("edit", false);
				setControlEnabled("save", false);
				setControlEnabled("purge", false);
				setControlEnabled("delete", false);
				setControlEnabled("print", true);
				setControlEnabled("export2Excel", true);
				setControlEnabled("export2Word", true);
				setControlEnabled("saveAs", false);
				setControlEnabled("lock", false);
				setControlEnabled("unlock", false);
				setControlEnabled("undo", false);
				setControlEnabled("promote", false);
				setControlEnabled("revisions", false);
				setControlEnabled("copy2clipboard", false);
				setControlEnabled("paste", false);
				setControlEnabled("paste_special", false);
				setControlEnabled("show_clipboard", false);
				setControlEnabled("addItem2Package", false);
			}
		}

		initItemMenu(rowId);
	}
}

ItemGrid.prototype.onLockCommand = function ItemGrid_onLockCommand(ignorePolymophicWarning, itemIDs) {
	if (!ignorePolymophicWarning && aras.isPolymorphic(currItemType)) {
		aras.AlertError(aras.getResource("", "itemsgrid.poly_item_cannot_be_locked_from_location"));
		return false;
	}
	return ItemGrid.superclass.onLockCommand();
}

ItemGrid.prototype.onUnlockCommand = function ItemGrid_onUnlockCommand(ignorePolymophicWarning, itemIDs) {
	if (!ignorePolymophicWarning && aras.isPolymorphic(currItemType)) {
		aras.AlertError(aras.getResource("", "itemsgrid.poly_item_cannot_be_unlocked_from_location"));
		return false;
	}
	return ItemGrid.superclass.onUnlockCommand();
}

ItemGrid.prototype.onEditCommand = function ItemGrid_onEditCommand(itemId) {
	if (aras.isPolymorphic(currItemType)) {
		aras.AlertError(aras.getResource("", "itemsgrid.polyitem_cannot_be_edited_from_the_location"));
		return false;
	}

	if (!itemId) {
		aras.AlertError(aras.getResource("", "itemsgrid.select_item_type_first", itemTypeLabel));
		return false;
	}

	if (execInTearOffWin(itemId, "edit")) {
		return true;
	}

	if (itemTypeName === "SelfServiceReport") {
		var existingWnd = aras.uiFindAndSetFocusWindowEx(aras.SsrEditorWindowId);
		if (existingWnd) {
			return existingWnd.showMultipleReportsError(itemId);
		}
	}

	var itemNode = aras.getItemById(itemTypeName, itemId, 0, undefined, "*"),
		notLocked;

	if (!itemNode) {
		if (itemTypeName == "Form") {
			itemNode = aras.getItemFromServer(itemTypeName, itemId, "locked_by_id").node;
		}

		if (!itemNode) {
			aras.AlertError(aras.getResource("", "itemsgrid.failed2get_itemtype", itemTypeLabel));
			return false;
		}
	}

	notLocked = (!aras.isTempEx(itemNode) && aras.getItemProperty(itemNode, "locked_by_id") == "");
	if (notLocked) {
		if (!aras.lockItemEx(itemNode)) {
			return false;
		}

		itemNode = aras.getItemById(itemTypeName, itemId, 0);
		if (updateRow(itemNode) !== false) {
			onSelectItem(itemId);
		}
	}

	aras.uiShowItemEx(itemNode, aras.getPreferenceItemProperty("Core_GlobalLayout", null, "core_view_mode"));
}

ItemGrid.prototype.onDoubleClick = function ItemGrid_onDoubleClick(itemId) {
	if (popupMenuSate["View"] || popupMenuSate["Edit"] || !isFunctionDisabled(itemTypeName, "DoubleClick")) {
		aras.uiShowItem(itemTypeName, itemId);
	}
}

ItemGrid.prototype.onMenuClicked = function ItemGrid_onMenuClicked(commandId, rowId, col) {
	switch (commandId) {
		case "locked_criteria:clear":
			grid.setCellValue("input_row", 0, "<img src=''>");
			break;
		case "locked_criteria:by_me":
			grid.setCellValue("input_row", 0, "<img src='../images/LockedByMe.svg'>");
			break;
		case "locked_criteria:by_others":
			grid.setCellValue("input_row", 0, "<img src='../images/LockedByOthers.svg'>");
			break;
		case "locked_criteria:by_anyone":
			grid.setCellValue("input_row", 0, "<img src='../images/LockedByAnyone.svg'>");
			break;
		default:
			commandId = ItemGrid.superclass.onMenuClicked(commandId, rowId, col);
			break;
	}

	return commandId;
}
