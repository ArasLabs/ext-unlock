/*
Used by MainGridFactory.js
*/

function ItemGrid() {
	ItemGrid.superclass.constructor();
}

inherit(ItemGrid, BaseItemTypeGrid);

ItemGrid.prototype.renamingMenuItems = undefined;

ItemGrid.prototype.onInitialize = function ItemGrid_onInitialize() {
	var isInitialized = ItemGrid.superclass.onInitialize(),
		menuItem, i;

	if (this.renamingMenuItems !== undefined) {
		for (i = 0; i < this.renamingMenuItems.length; i++) {
			menuItem = menuFrm.menuApplet.findItem(this.renamingMenuItems[i].oldKey);

			if (menuItem !== undefined) {
				menuItem.setLabel(aras.getResource('', 'common.' + this.renamingMenuItems[i].oldKey));
			}
		}
		this.renamingMenuItems = undefined;
		menuFrm.showDefaultToolbar();
	}
	return isInitialized;
};

ItemGrid.prototype.setMenuState = function ItemGrid_setMenuState(rowId, col) {
	var popupMenu = grid.getMenu();
	popupMenu.removeAll();

	if (currQryItem) {
		var queryItem = currQryItem.getResult(),
			itemNd = queryItem.selectSingleNode('Item[@id="' + rowId + '"]') || aras.getFromCache(rowId),
			brokenFlg = !Boolean(itemNd),
			itemIDs, itemIdsCount;

		popupMenuState['com.aras.innovator.cui_default.pmig_New'] = (can_addFlg); //0
		popupMenuState['com.aras.innovator.cui_default.pmig_separator0'] = true;
		popupMenuState['com.aras.innovator.cui_default.pmig_Save'] = false; //2
		popupMenuState['com.aras.innovator.cui_default.pmig_Save As'] = false;
		popupMenuState['com.aras.innovator.cui_default.pmig_Edit'] = false; //3
		popupMenuState['com.aras.innovator.cui_default.pmig_View'] = false; //4
		popupMenuState['com.aras.innovator.cui_default.pmig_Print'] = false; //5
		popupMenuState['com.aras.innovator.cui_default.pmig_separator1'] = true;
		popupMenuState['com.aras.innovator.cui_default.pmig_Purge'] = false; //7
		popupMenuState['com.aras.innovator.cui_default.pmig_Delete'] = false; //8
		popupMenuState['com.aras.innovator.cui_default.pmig_separator1.5'] = true;
		popupMenuState['com.aras.innovator.cui_default.pmig_Export To Excel'] = true;
		popupMenuState['com.aras.innovator.cui_default.pmig_Export To Word'] = true;
		popupMenuState['com.aras.innovator.cui_default.pmig_separator2'] = true;
		popupMenuState['com.aras.innovator.cui_default.pmig_Lock'] = false; //10
		popupMenuState['com.aras.innovator.cui_default.pmig_Unlock'] = false; //11
		popupMenuState['com.aras.innovator.cui_default.pmig_Undo'] = false; //12
		popupMenuState['com.aras.innovator.cui_default.pmig_separator3'] = true;
		popupMenuState['com.aras.innovator.cui_default.pmig_separator4'] = true;
		popupMenuState['com.aras.innovator.cui_default.pmig_Version'] = false;
		popupMenuState['com.aras.innovator.cui_default.pmig_Revisions'] = false;
		popupMenuState['com.aras.innovator.cui_default.pmig_separator5'] = true;
		popupMenuState['com.aras.innovator.cui_default.pmig_Promote'] = false;
		popupMenuState['com.aras.innovator.cui_default.pmig_separator6'] = true;
		popupMenuState['com.aras.innovator.cui_default.pmig_Where Used'] = false;
		popupMenuState['com.aras.innovator.cui_default.pmig_Structure Browser'] = false;
		popupMenuState['com.aras.innovator.cui_default.pmig_separator7'] = true;
		popupMenuState['com.aras.innovator.cui_default.pmig_Properties'] = false;
		popupMenuState['com.aras.innovator.cui_default.pmig_separator8'] = true;
		popupMenuState['com.aras.innovator.cui_default.pmig_Add to Desktop'] = false;

		if (!brokenFlg && currItemType) {
			itemIDs = grid.getSelectedItemIds();
			itemIdsCount = itemIDs.length;

			var itemID = rowId;
			var locked_by = aras.getItemProperty(itemNd, 'locked_by_id');
			var isTemp = aras.isTempEx(itemNd);
			var isDirty = aras.isDirtyEx(itemNd);
			var ItemIsLocked = aras.isLocked(itemNd);

			var discoverOnlyFlg = (itemNd && itemNd.getAttribute('discover_only') == '1');
			var editFlg = ((isTemp || locked_by == userID) && !discoverOnlyFlg);
			var saveFlg = (editFlg && (aras.getFromCache(itemID) != null));
			var viewFlg = (locked_by != userID && itemIdsCount == 1 && !discoverOnlyFlg);
			var purgeFlg = (isTemp || (locked_by == ''));
			var lockFlg = aras.uiItemCanBeLockedByUser(itemNd, isRelationshipIT, use_src_accessIT);
			// Neosystem Modification
			//var unlockFlg = (locked_by == userID || (!isTemp && locked_by != '' && aras.isAdminUser()));
			var unlockFlg = false;
			if (aras.isAdminUser(itemTypeName)) {
				unlockFlg = (!isTemp && locked_by != "");
			} else {
				unlockFlg = (locked_by == userID);
			}
			var copyFlg = (itemIdsCount == 1 && !isTemp && can_addFlg);
			var undoFlg = (!isTemp && isDirty);
			var promoteFlg = (locked_by == '' && !isTemp);
			var add2desktopFlg = !isTemp;

			var copy2clipboardFlg = aras.getItemProperty(currItemType, 'is_relationship') == '1' && aras.getItemProperty(currItemType, 'is_dependent') != '1' && (!isFunctionDisabled(itemTypeName, 'Copy'));
			var pasteFlg = !aras.clipboard.isEmpty() && (isTemp || (locked_by == userID)) && (!isFunctionDisabled(itemTypeName, 'Paste'));
			var pasteSpecialFlg = !aras.clipboard.isEmpty() && (isTemp || (locked_by == userID)) && (!isFunctionDisabled(itemTypeName, 'Paste Special'));
			var showClipboardFlg = !aras.clipboard.isEmpty();
			var addItem2PackageFlg = ((itemID == '' || isTemp) ? false : true);

			if (itemIdsCount > 1) {
				var idsArray = [],
					itemNds, tmpItemNd,
					i;

				for (i = 0; i < itemIdsCount; i++) {
					idsArray.push('@id=\'' + itemIDs[i] + '\'');
				}

				itemNds = queryItem.selectNodes('Item[' + idsArray.join(' or ') + ']');
				for (i = 0; i < itemNds.length; i++) {
					tmpItemNd = itemNds[i];
					itemID = aras.getItemProperty(tmpItemNd, 'id');

					if (!tmpItemNd) {
						brokenFlg = true;
						break;
					}

					locked_by = aras.getItemProperty(tmpItemNd, 'locked_by_id');
					isTemp = aras.isTempEx(tmpItemNd);
					isDirty = aras.isDirtyEx(tmpItemNd);

					editFlg = editFlg && (isTemp || (locked_by == userID));
					saveFlg = saveFlg && (editFlg && aras.getFromCache(itemID));
					purgeFlg = purgeFlg && (isTemp || (locked_by == ''));
					lockFlg = lockFlg && aras.uiItemCanBeLockedByUser(tmpItemNd, isRelationshipIT, use_src_accessIT);
					undoFlg = undoFlg && (!isTemp && isDirty);

					// Neosystem Modification
					//unlockFlg = unlockFlg && (locked_by == userID || (!isTemp && locked_by != '' && aras.isAdminUser()));
					if (aras.isAdminUser(itemTypeName)) {
						unlockFlg = unlockFlg && (!isTemp && locked_by != "");
					} else {
						unlockFlg = unlockFlg && (locked_by == userID);
					}
					add2desktopFlg = add2desktopFlg & !isTemp;
					pasteFlg = pasteFlg && !aras.clipboard.isEmpty() && (isTemp || (locked_by == userID));
					pasteSpecialFlg = pasteSpecialFlg && !aras.clipboard.isEmpty() && (isTemp || (locked_by == userID));
					addItem2PackageFlg = ((itemID == '' || isTemp) ? false : true);
				}

				if (pasteFlg) {
					pasteFlg = aras.isLCNCompatibleWithIT(itemTypeID);
				}
			}
		}

		if (!brokenFlg) {
			var newSeparatorId = false,
				commandId, isSeparator;

			popupMenuState['com.aras.innovator.cui_default.pmig_Save'] = saveFlg && !isFunctionDisabled(itemTypeName, 'Save');
			popupMenuState['com.aras.innovator.cui_default.pmig_Save As'] = (!(isFunctionDisabled(itemTypeName, 'Save As')) && copyFlg);
			popupMenuState['com.aras.innovator.cui_default.pmig_Edit'] = ((lockFlg || editFlg) && itemIDs && itemIdsCount == 1 && !discoverOnlyFlg) &&  !isFunctionDisabled(itemTypeName, 'Edit');
			popupMenuState['com.aras.innovator.cui_default.pmig_View'] = (viewFlg && itemIDs && itemIdsCount == 1) &&  !isFunctionDisabled(itemTypeName, 'View');
			popupMenuState['com.aras.innovator.cui_default.pmig_Print'] = (itemIDs && itemIdsCount == 1);
			popupMenuState['com.aras.innovator.cui_default.pmig_Purge'] = (purgeFlg && isVersionableIT);
			popupMenuState['com.aras.innovator.cui_default.pmig_Delete'] = purgeFlg &&  !isFunctionDisabled(itemTypeName, 'Delete'); //delete is always available, but purge is only for versioanble
			popupMenuState['com.aras.innovator.cui_default.pmig_Lock'] = lockFlg && !isFunctionDisabled(itemTypeName, 'Lock');
			popupMenuState['com.aras.innovator.cui_default.pmig_Unlock'] = unlockFlg && !isFunctionDisabled(itemTypeName, 'Unlock');
			popupMenuState['com.aras.innovator.cui_default.pmig_Undo'] = undoFlg;
			popupMenuState['com.aras.innovator.cui_default.pmig_Version'] = (!(isFunctionDisabled(itemTypeName, 'Version')) && isManualyVersionableIT && itemIDs && itemIdsCount == 1 && !isTemp && (locked_by == userID || locked_by == ''));
			popupMenuState['com.aras.innovator.cui_default.pmig_Revisions'] = (isVersionableIT && !isTemp && itemIDs && itemIdsCount == 1);
			popupMenuState['com.aras.innovator.cui_default.pmig_Promote'] = (promoteFlg && itemIDs && itemIdsCount == 1 && !(isFunctionDisabled(itemTypeName, 'Promote')));
			popupMenuState['com.aras.innovator.cui_default.pmig_Where Used'] = (itemIDs && itemIdsCount == 1);
			popupMenuState['com.aras.innovator.cui_default.pmig_Structure Browser'] = (itemIDs && itemIdsCount == 1);
			popupMenuState['com.aras.innovator.cui_default.pmig_Properties'] = (itemIDs && itemIdsCount == 1);
			popupMenuState['com.aras.innovator.cui_default.pmig_Add to Desktop'] = add2desktopFlg;

			// MainMenu.aspx function call with toolbarId and isEnabled
			menuFrm.setControlEnabled('new', can_addFlg);
			menuFrm.setControlEnabled('view', popupMenuState['com.aras.innovator.cui_default.pmig_View']);
			menuFrm.setControlEnabled('edit', popupMenuState['com.aras.innovator.cui_default.pmig_Edit']);
			menuFrm.setControlEnabled('save', popupMenuState['com.aras.innovator.cui_default.pmig_Save']);
			menuFrm.setControlEnabled('purge', popupMenuState['com.aras.innovator.cui_default.pmig_Purge']);
			menuFrm.setControlEnabled('delete', popupMenuState['com.aras.innovator.cui_default.pmig_Delete']);
			menuFrm.setControlEnabled('print', popupMenuState['com.aras.innovator.cui_default.pmig_Print']);
			menuFrm.setControlEnabled('saveAs', popupMenuState['com.aras.innovator.cui_default.pmig_Save As']);
			menuFrm.setControlEnabled('export2Excel', popupMenuState['com.aras.innovator.cui_default.pmig_Export To Excel']);
			menuFrm.setControlEnabled('export2Word', popupMenuState['com.aras.innovator.cui_default.pmig_Export To Word']);
			menuFrm.setControlEnabled('lock', popupMenuState['com.aras.innovator.cui_default.pmig_Lock']);
			menuFrm.setControlEnabled('unlock', popupMenuState['com.aras.innovator.cui_default.pmig_Unlock']);
			menuFrm.setControlEnabled('undo', popupMenuState['com.aras.innovator.cui_default.pmig_Undo']);
			menuFrm.setControlEnabled('promote', popupMenuState['com.aras.innovator.cui_default.pmig_Promote']);
			menuFrm.setControlEnabled('revisions', popupMenuState['com.aras.innovator.cui_default.pmig_Revisions']);
			menuFrm.setControlEnabled('copy2clipboard', copy2clipboardFlg);
			menuFrm.setControlEnabled('paste', pasteFlg);
			menuFrm.setControlEnabled('paste_special', pasteSpecialFlg);
			menuFrm.setControlEnabled('show_clipboard', showClipboardFlg);
			menuFrm.setControlEnabled('addItem2Package', addItem2PackageFlg);

			this.cui.fillPopupMenu("PopupMenuItemGrid", popupMenu, this.getMenuContext(null, rowId, col), popupMenuState);
		} else {
			// MainMenu.aspx function call with toolbarId and isEnabled
			menuFrm.setControlEnabled('new', can_addFlg);
			menuFrm.setControlEnabled('view', false);
			menuFrm.setControlEnabled('edit', false);
			menuFrm.setControlEnabled('save', false);
			menuFrm.setControlEnabled('purge', false);
			menuFrm.setControlEnabled('delete', false);
			menuFrm.setControlEnabled('print', true);
			menuFrm.setControlEnabled('export2Excel', true);
			menuFrm.setControlEnabled('export2Word', true);
			menuFrm.setControlEnabled('saveAs', false);
			menuFrm.setControlEnabled('lock', false);
			menuFrm.setControlEnabled('unlock', false);
			menuFrm.setControlEnabled('undo', false);
			menuFrm.setControlEnabled('promote', false);
			menuFrm.setControlEnabled('revisions', false);
			menuFrm.setControlEnabled('copy2clipboard', false);
			menuFrm.setControlEnabled('paste', false);
			menuFrm.setControlEnabled('paste_special', false);
			menuFrm.setControlEnabled('show_clipboard', false);
			menuFrm.setControlEnabled('addItem2Package', false);
		}
	}
};

ItemGrid.prototype.onLockCommand = function ItemGrid_onLockCommand(ignorePolymophicWarning, itemIDs) {
	if (!ignorePolymophicWarning && aras.isPolymorphic(currItemType)) {
		aras.AlertError(aras.getResource('', 'itemsgrid.poly_item_cannot_be_locked_from_location'));
		return false;
	}
	return ItemGrid.superclass.onLockCommand();
};

ItemGrid.prototype.onUnlockCommand = function ItemGrid_onUnlockCommand(ignorePolymophicWarning, itemIDs) {
	if (!ignorePolymophicWarning && aras.isPolymorphic(currItemType)) {
		aras.AlertError(aras.getResource('', 'itemsgrid.poly_item_cannot_be_unlocked_from_location'));
		return false;
	}
	return ItemGrid.superclass.onUnlockCommand();
};

ItemGrid.prototype.onEditCommand = function ItemGrid_onEditCommand(itemId) {
	if (aras.isPolymorphic(currItemType)) {
		aras.AlertError(aras.getResource('', 'itemsgrid.polyitem_cannot_be_edited_from_the_location'));
		return false;
	}

	if (!itemId) {
		aras.AlertError(aras.getResource('', 'itemsgrid.select_item_type_first', itemTypeLabel));
		return false;
	}

	if (execInTearOffWin(itemId, 'edit')) {
		return true;
	}

	if (itemTypeName === 'SelfServiceReport') {
		var existingWnd = aras.uiFindAndSetFocusWindowEx(aras.SsrEditorWindowId);
		if (existingWnd) {
			return existingWnd.showMultipleReportsError(itemId);
		}
	}

	var itemNode = aras.getItemById(itemTypeName, itemId, 0, undefined, '*'),
		notLocked;

	if (!itemNode) {
		if (itemTypeName == 'Form') {
			itemNode = aras.getItemFromServer(itemTypeName, itemId, 'locked_by_id').node;
		}

		if (!itemNode) {
			aras.AlertError(aras.getResource('', 'itemsgrid.failed2get_itemtype', itemTypeLabel));
			return false;
		}
	}

	notLocked = (!aras.isTempEx(itemNode) && aras.getItemProperty(itemNode, 'locked_by_id') == '');
	if (notLocked) {
		if (!aras.lockItemEx(itemNode)) {
			return false;
		}

		itemNode = aras.getItemById(itemTypeName, itemId, 0);
		if (updateRow(itemNode) !== false) {
			onSelectItem(itemId);
		}
	}

	aras.uiShowItemEx(itemNode, aras.getPreferenceItemProperty('Core_GlobalLayout', null, 'core_view_mode'));
};

ItemGrid.prototype.onDoubleClick = function ItemGrid_onDoubleClick(itemId) {
	if (popupMenuState['com.aras.innovator.cui_default.pmig_View'] || popupMenuState['com.aras.innovator.cui_default.pmig_Edit'] || !isFunctionDisabled(itemTypeName, 'DoubleClick')) {
		aras.uiShowItem(itemTypeName, itemId);
	}
};

ItemGrid.prototype.onMenuClicked = function ItemGrid_onMenuClicked(commandId, rowId, col) {
	switch (commandId) {
		case 'locked_criteria:clear':
			grid.setCellValue('input_row', 0, '<img src=\'\'>');
			break;
		case 'locked_criteria:by_me':
			grid.setCellValue('input_row', 0, '<img src=\'../images/LockedByMe.svg\'>');
			break;
		case 'locked_criteria:by_others':
			grid.setCellValue('input_row', 0, '<img src=\'../images/LockedByOthers.svg\'>');
			break;
		case 'locked_criteria:by_anyone':
			grid.setCellValue('input_row', 0, '<img src=\'../images/LockedByAnyone.svg\'>');
			break;
		default:
			commandId = ItemGrid.superclass.onMenuClicked(commandId, rowId, col);
			break;
	}

	return commandId;
};
