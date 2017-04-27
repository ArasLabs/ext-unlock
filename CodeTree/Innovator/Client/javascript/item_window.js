// (c) Copyright by Aras Corporation, 2004-2013.
var isItemWindow = true;
var menuFrame;
var windowReady = false;
var isVersionableIT = (aras.getItemProperty(itemType, 'is_versionable') == '1');
var isDependentIT = (aras.getItemProperty(itemType, 'is_dependent') == '1');
var isRelationshipIT = (aras.getItemProperty(itemType, 'is_relationship') == '1');
var use_src_accessIT = (aras.getItemProperty(itemType, 'use_src_access') == '1');
var itemTypeID = aras.getItemTypeId(itemTypeName);
var can_addFlg = !isDependentIT && aras.getPermissions('can_add', itemTypeID);
var commandEventHandlers = {};
var relsDivHeight = '30%';
var openerMainWnd = aras.getMostTopWindowWithAras(opener);
var mainWnd = aras.getMostTopWindowWithAras(window);

function findInstanceFrame() {
	for (var i = 0; i < frames.length; i++) {
		if (frames[i].frameElement.id == 'instance') {
			return frames[i];
		}
	}
	return null;
}

function findCurrentRelationshipsTab() {
	if (viewMode == 'tab view' && !window.hideTabs) {
		var relationshipsFrame = document.frames['relationships'];
		var currentTabFrame = relationshipsFrame ? relationshipsFrame.iframesCollection[relationshipsFrame.currTabID] : null;

		return currentTabFrame ? currentTabFrame.contentWindow : null;
	}

	return null;
}

function isPasteCommandAvailable(itemNode, allowedTypeName) {
	var isTemp = aras.isTempEx(itemNode),
		isLockedByUser = aras.isLockedByUser(itemNode),
		proceedCheck = !aras.clipboard.isEmpty() && (isTemp || isLockedByUser) && (!isFunctionDisabled(itemTypeName, 'Paste'));

	if (proceedCheck) {
		proceedCheck = aras.isLCNCompatibleWithIT(itemTypeID);

		if (proceedCheck) {
			if (allowedTypeName) {
				var clipboardData = aras.clipboard.paste(),
					isMatchFound = false,
					clipboardItem, i;

				for (i = 0; i < clipboardData.length; i++) {
					clipboardItem = clipboardData[i];

					if (clipboardItem.relationship_itemtype === allowedTypeName) {
						isMatchFound = true;
						break;
					}
				}

				return isMatchFound;
			} else {
				return true;
			}
		}
	}

	return false;
}

function updateInstanceFrame() {
	var instance = document.frames['instance'];
	if (!document.frames['instance']) {
		return false;
	}
	var form = instance.document.forms.MainDataForm;
	if (!form) {
		return false;
	}

	aras.uiPopulateFormWithItemEx(form, item, itemType, isEditMode);
	return true;
}

function getItemsGridContainer() {
	try {
		if (!opener.main.work.isItemsGrid) {
			return null;
		}
	} catch (excep) {
		return null;
	}

	if (!window.isTearOff) {
		return null;
	}

	return opener.main.work;
}
/*
addRowToItemsGrid is used in User defined Methods
*/
function addRowToItemsGrid(item) {
	var itemsGrid = getItemsGridContainer();
	if (!itemsGrid || !item) {
		return false;
	}

	if (itemsGrid.itemTypeName != itemTypeName) {
		return false;
	}
	itemsGrid.updateRow(item);
	return true;
}

function updateItemsGrid(updatedItem, deleteRowWithChangedId) {
	var itemsGrid = getItemsGridContainer();

	if (itemsGrid && updatedItem) {
		if (itemTypeName === 'ItemType' && itemID === itemsGrid.itemTypeID) {
			aras.makeItemsGridBlank();
			return true;
		} else {
			var grid = itemsGrid.grid,
				updatedID = updatedItem.getAttribute('id');

			deleteRowWithChangedId = (deleteRowWithChangedId === undefined) ? true : Boolean(deleteRowWithChangedId);

			if (!deleteRowWithChangedId && grid.getRowIndex(updatedID) === -1) {
				return true;
			} else {
				var wasSelected = (grid.getSelectedItemIds().indexOf(itemID) > -1);

				if (deleteRowWithChangedId && updatedID !== itemID) {
					itemsGrid.deleteRow(item);
				}

				if (itemsGrid.ItemTypeGrid) {
					itemsGrid.ItemTypeGrid.updateItem(item, updatedItem);
				}
				itemsGrid.updateRow(updatedItem);

				if (wasSelected) {
					if (updatedID === itemID) {
						itemsGrid.onSelectItem(itemID);
					} else {
						var currSel = grid.getSelectedId();
						//if (currSel)
						itemsGrid.onSelectItem(currSel);
					}
				}

				return true;
			}
		}
	}

	return false;
}

function deleteRowFromItemsGrid(rowID) {
	var itemsGrid = getItemsGridContainer();
	if (itemsGrid) {
		var grid = itemsGrid.grid;
		var selID = grid.getSelectedItemIds(';');
		if (selID == rowID) {
			var prevSelRow = grid.getRowIndex(selID);
			grid.deleteRow(selID);
			var rowsInGrid = grid.getRowCount();
			if (rowsInGrid > 0 && prevSelRow > -1) {
				if (prevSelRow < rowsInGrid) {
					selID = grid.getRowId(prevSelRow);
				} else {
					selID = grid.getRowId(rowsInGrid - 1);
				}

				grid.setSelectedRow(selID, false, true);
				itemsGrid.onSelectItem(selID);
			} else {//if(rowsInGrid>0)
				itemsGrid.setupGrid(false);
			}

		} else if (grid.getRowIndex(rowID) != -1) {
			grid.deleteRow(rowID);
			var selID = grid.getSelectedItemIds(';').split(';')[0];
			if (selID) {
				itemsGrid.onSelectItem(selID);
			}
		}
	}
}

var updateMenuState_tmt = 0;
function updateMenuState() {
	clearTimeout(updateMenuState_tmt);
	menuFrame = (isTearOff ?
					(window.tearOffMenuController ? window.tearOffMenuController : null)
					: mainWnd.main.menu);

	if (!menuFrame || !menuFrame.menuFrameReady) {
		updateMenuState_tmt = setTimeout('updateMenuState()', 100);
		return;
	}
	var val = (aras.getPreferenceItemProperty('Core_GlobalLayout', null, 'core_show_labels') == 'true');
	menuFrame.setControlState('show_text', val);
	menuFrame.toolbarApplet.showLabels(val);

	var isTemp = aras.isTempEx(item);
	var isDirty = aras.isDirtyEx(item);
	var isNew = aras.isNew(item);
	var locked_by = aras.getItemProperty(item, 'locked_by_id');
	var ItemCanBeLockedByUser = aras.uiItemCanBeLockedByUser(item, isRelationshipIT, use_src_accessIT);
	var ItemIsLockedByUser = aras.isLockedByUser(item);

	var newFlg = can_addFlg;
	var openFlg = (!isTemp && itemTypeName == 'File');
	var saveFlg = ((isTemp && !isDependentIT) || (locked_by == aras.getCurrentUserID())) && !isFunctionDisabled(itemTypeName, 'Save');
	var saveAsFlg = !isTemp && !isFunctionDisabled(itemTypeName, 'Save As');
	var purgeFlg = (locked_by == '') && !isFunctionDisabled(itemTypeName, 'Delete');
	var lockFlg = ItemCanBeLockedByUser;
	var unlockFlg = ItemIsLockedByUser;
	var undoFlg = (!isTemp && isDirty);
	var revisionFlg = (!isTemp && isVersionableIT);
	var discussionFlg = !!(window.isSSVCEnabled && !isNew);

	var copy2clipboardFlg = aras.getItemProperty(itemType, 'is_relationship') == '1' && aras.getItemProperty(itemType, 'is_dependent') != '1' && (!isFunctionDisabled(itemTypeName, 'Copy'));
	var relationshipsTab = findCurrentRelationshipsTab();
	var pasteFlg = isPasteCommandAvailable(item, relationshipsTab ? relationshipsTab.relationshipTypeName : '');
	var pasteSpecialFlg = !aras.clipboard.isEmpty() && (isTemp || ItemIsLockedByUser) && (!isFunctionDisabled(itemTypeName, 'Paste Special'));
	var showClipboardFlg = !aras.clipboard.isEmpty();
	var promoteFlg = lockFlg && !(isFunctionDisabled(itemTypeName, 'Promote'));

	with (menuFrame) {
		setControlEnabled('new', newFlg);
		setControlEnabled('open', openFlg);
		setControlEnabled('download', openFlg);
		setControlEnabled('view', false);
		setControlEnabled('edit', false);
		setControlEnabled('save', saveFlg);
		setControlEnabled('saveAs', saveAsFlg);
		setControlEnabled('save_unlock_close', saveFlg);
		setControlEnabled('purge', purgeFlg && isVersionableIT);
		setControlEnabled('delete', purgeFlg);
		setControlEnabled('print', true);
		setControlEnabled('lock', lockFlg);
		setControlEnabled('unlock', unlockFlg);
		setControlEnabled('undo', undoFlg);
		setControlEnabled('promote', promoteFlg);
		setControlEnabled('revisions', revisionFlg);
		setControlEnabled('copy2clipboard', copy2clipboardFlg);
		setControlEnabled('paste', pasteFlg);
		setControlEnabled('paste_special', pasteSpecialFlg);
		setControlEnabled('show_clipboard', showClipboardFlg);
		setControlEnabled('ssvc_discussion_button', discussionFlg);
	}

	if (isTearOff) {
		menuFrame.setControlEnabled('saveANDexit', saveFlg);
		menuFrame.setControlEnabled('close', true);
		menuFrame.setEnableAccessMenu(isEditMode);
	}
}

function registerCommandEventHandler(handlerOwnerWindow, handlerF, BeforeOrAfter, commandName, options) {
	if (!handlerOwnerWindow || !handlerF || !BeforeOrAfter || !commandName) {
		return;
	}
	if (BeforeOrAfter != 'before' && BeforeOrAfter != 'after') {
		return;
	}

	var key = BeforeOrAfter + commandName;
	var handlersInfoArr = commandEventHandlers[key];
	if (!handlersInfoArr) {
		handlersInfoArr = new Array();
		commandEventHandlers[key] = handlersInfoArr;
	}

	var len = handlersInfoArr.push({
		window: handlerOwnerWindow,
		handler: handlerF,
		options: options
	});

	key += ':' + String(len - 1);

	return key;
}

function unregisterCommandEventHandler(key) {
	if (!key) {
		return;
	}

	var re = /^(.+):(\d+)$/;
	if (!re.test(key)) {
		return;
	}

	var k1 = RegExp.$1;
	var k2 = RegExp.$2;

	var handlersInfoArr = commandEventHandlers[k1];
	if (!handlersInfoArr) {
		return;
	}

	aras.deletePropertyFromObject(handlersInfoArr, k2);
}

if (!isTearOff) {
	//special code to set (un)registerCommandEventHandler
	function f(fNm) {
		fNm = fNm + 'registerCommandEventHandler';
		if (mainWnd[fNm]) {
			return;
		}

		mainWnd[fNm] = window[fNm];
		function g() {
			mainWnd[fNm] = undefined;
		}

		window.addEventListener('unload', g);
	}

	f('');
	f('un');
}

var ExecuteUserCommandHandlerOptions = {Default: 0, EvalWinHandler: 1};

function executeUserCommandHandler(hId) {
	var retValue = false; //indicates: no faults exist
	var handlersInfoArr = commandEventHandlers[hId];
	if (!handlersInfoArr) {
		return retValue;
	}

	for (var i = 0; i < handlersInfoArr.length; i++) {
		var handlerInfo = handlersInfoArr[i];
		if (!handlerInfo) {
			continue;
		}

		var win = handlerInfo.window;
		var h = handlerInfo.handler;
		if (!win || aras.isWindowClosed(win)) {
			handlersInfoArr[i] = null;
			continue;
		}

		try {
			if (handlerInfo.options && (handlerInfo.options & ExecuteUserCommandHandlerOptions.EvalWinHandler) != 0) {
				retValue = eval('win.' + h + '()'); // IR-031317 h.apply(win) & direct call failed with 'Cannot execute freed script'
			} else {
				retValue = h();
			}
		} catch (excep) {
			retValue = 'Exception in handler ' + hId + ', number ' + i + '.';
		}

		if (retValue && typeof (retValue) == 'string') {
			break;
		}
	}
	return retValue;
}

function onBeforeCommandRun(commandName) {
	return executeUserCommandHandler('before' + commandName);
}

function onAfterCommandRun(commandName) {
	return executeUserCommandHandler('after' + commandName);
}

function onNewCommand() {
	// Calling uiNewItemEx for Project itemtype creates dialog in main window.
	// aras.utils.setFocus not working in chrome for parent window.
	// We need use window.open with empty url as 1-st argument and name of exits window as 2-nd argument. If window name is empty we need set temporary name.
	// window.open change opener property of opened window. After window.open calling we set old params to target window.
	// window.open must be called with context of the current window.
	if (itemTypeName === 'Project' && aras.Browser.isCh()) {
		var aWindow = aras.getMostTopWindowWithAras(window).opener;
		var lastOpener = aWindow.opener,
			lastName = aWindow.name;
		if (!aWindow.name) {
			aWindow.name = aras.generateNewGUID()
		}
		window.open('', aWindow.name);
		aWindow.opener = lastOpener;
		aWindow.name = lastName;
	}
	var newItm = aras.uiNewItemEx(itemTypeName);
	var itemsGrid = getItemsGridContainer();
	if (itemsGrid && itemsGrid.itemTypeName == itemTypeName) {
		itemsGrid.insertRow(newItm);
	}
	return true;
}

function onViewCommand() {
	return true;
}

function onEditCommand() {
	return true;
}

function onPurgeCommand(silentMode) {
	return onPurgeDeleteCommand('purge', silentMode);
}

function onDeleteCommand(silentMode) {
	return onPurgeDeleteCommand('delete', silentMode);
}

function onPurgeDeleteCommand(command, silentMode) {
	var delRes = false;
	var statusId;
	if (command == 'purge') {
		statusId = aras.showStatusMessage('status', aras.getResource('', 'item_window.purging'), '../images/Progress.gif');
		delRes = aras.purgeItemEx(item, silentMode);
	} else {
		statusId = aras.showStatusMessage('status', aras.getResource('', 'item_window.deleting'), '../images/Progress.gif');
		delRes = aras.deleteItemEx(item, silentMode);
	}
	aras.clearStatusMessage(statusId);

	var openerMainWindow = openerMainWnd;
	if (delRes && openerMainWindow.main) {
		deleteRowFromItemsGrid(itemID);

		if (itemTypeName == 'ItemType') {
			if (window.isTearOff) {
				if (openerMainWindow.main && openerMainWindow.main.tree.updateTree) {
					openerMainWindow.main.tree.updateTree(itemID.split(';'));
				}
			} else if (mainWnd.main) {
				mainWnd.main.tree.updateTree(itemID.split(';'));
			}

		} else if (itemTypeName == 'Action') {
			if (window.isTearOff) {
				if (openerMainWindow.main) {
					openerMainWindow.main.menu.updateGenericActions();
				}
			} else if (mainWnd.main) {
				mainWnd.main.menu.updateGenericActions();
			}

		} else if (itemTypeName == 'Report') {
			if (window.isTearOff) {
				if (openerMainWindow.main) {
					openerMainWindow.main.menu.updateGenericReports(true);
				}
			} else if (mainWnd.main) {
				mainWnd.main.menu.updateGenericReports(true);
			}
		}

		if (window.isTearOff) {
			window.close();
		} else {
			mainWnd.main.work.location.replace('itemsGrid.html?itemtypeID=' + window.itemType.getAttribute('id'));
		}
	}

	return {result: delRes ? 'Deleted' : 'Canceled'};
}

function onLockCommand() {
	var statusId = aras.showStatusMessage('status', aras.getResource('', 'item_window.locking'), '../images/Progress.gif');
	var res = aras.lockItemEx(item);
	aras.clearStatusMessage(statusId);
	if (!res) {
		return true;
	}
	updateItemsGrid(res);

	isEditMode = true;
	aras.uiReShowItemEx(itemID, res, viewMode);
	return true;
}

function onUnlockCommand(saveChanges) {
	var msg = onBeforeCommandRun('unlock');
	if (msg && typeof (msg) == 'string') {
		aras.AlertError(msg);
		return false;
	}

	var statusId = aras.showStatusMessage('status', aras.getResource('', 'item_window.unlocking'), '../images/Progress.gif');

	// Add Neosystem Start
	var res;
	if ((aras.getCanUnlockItem(itemTypeName)) && (aras.getUserType() !== "admin")) {
		var _method = new Item("Method");
		_method.setProperty("item_id", itemID);
		_method.setProperty("name", itemTypeName);
		var ret = _method.apply("z_unlockItem");
		res = ret.dom.getElementsByTagName("Item")[0];
	} else {
	// Add Neosystem End
		res = aras.unlockItemEx(item, saveChanges);
	}
	aras.clearStatusMessage(statusId);
	if (!res) {
		return false;
	}
	onAfterCommandRun('unlock');

	updateItemsGrid(res);

	isEditMode = false;

	if (typeof doNotReshowItem == 'undefined' || !doNotReshowItem()) {
		aras.uiReShowItemEx(itemID, res, viewMode);
	}

	return true;
}

function onUndoCommand() {
	if (!aras.isDirtyEx(item)) {
		aras.AlertError(aras.getResource('', 'item_window.nothing_to_undo'));
		return true;
	}

	if (!aras.confirm(aras.getResource('', 'common.undo_discard_changes'))) {
		return true;
	}
	if (!aras.isTempEx(item)) {
		aras.removeFromCache(itemID);
		var res = aras.getItemById(itemTypeName, itemID, 0);
		if (!res) {
			return true;
		}
	}

	updateItemsGrid(res);
	aras.uiReShowItemEx(itemID, res, viewMode);
	return true;
}

function onSaveCommand() {
	if (itemTypeName == 'Report') {
		clearJavascriptInReport(item);
	}

	var msg = onBeforeCommandRun('save');
	if (msg && typeof (msg) == 'string') {
		aras.AlertError(msg);
		return false;
	}

	var statusId = aras.showStatusMessage('status', aras.getResource('', 'common.saving'), '../images/Progress.gif');
	aras.setItemProperty(item, 'fed_css', '');

	/* TODO: remove isSpinnerNecessary flag after implementation of asynch save operation */
	var isSpinnerNecessary = item.selectNodes('descendant-or-self::Item[@type="File" and (@action="add" or @action="update")]').length > 0;
	var spinner, res;
	try {
		if (isSpinnerNecessary) {
			spinner = document.getElementById('dimmer_spinner');
			spinner.classList.remove('disabled-spinner');
		}

		res = aras.saveItemEx(item);

		aras.clearStatusMessage(statusId);
		if (!res) {
			return true;
		}
	} finally {
		if (isSpinnerNecessary) {
			spinner.classList.add('disabled-spinner');
		}
	}

	onAfterCommandRun('save');
	if (typeof doNotReshowItem == 'undefined' || !doNotReshowItem()) {
		aras.uiReShowItemEx(itemID, res, viewMode);
	} else {
		window.item = res;
	}
	return true;
}

function onSaveUnlockAndExitCommand() {
	// IR-003016 Run Report method fails
	if (itemTypeName == 'Report') {
		clearJavascriptInReport(item);
	}

	var msg = onBeforeCommandRun('save');
	if (msg && typeof (msg) == 'string') { aras.AlertError(msg); return false; }

	var SavedAttributes = new Object;
	function SaveItemAttributes(ItemNd) {
		//for now save only doGetItem attribute
		var attrNm = 'doGetItem';
		SavedAttributes[attrNm] = ItemNd.getAttribute(attrNm);
	}

	function RestoreItemAttributes(ItemNd) {
		for (var attrNm in SavedAttributes) {
			var attrVal = SavedAttributes[attrNm];
			if (attrVal == null) {
				ItemNd.removeAttribute(attrNm);
			} else {
				ItemNd.setAttribute(attrNm, attrVal);
			}
		}
	}

	var statusId;
	statusId = aras.showStatusMessage('status', aras.getResource('', 'common.saving'), '../images/Progress.gif');

	/* TODO: remove isSpinnerNecessary flag after implementation of asynch save operation */
	var isSpinnerNecessary = item.selectNodes('descendant-or-self::Item[@type="File" and (@action="add" or @action="update")]').length > 0;
	var spinner, res;
	try {
		if (isSpinnerNecessary) {
			spinner = document.getElementById('dimmer_spinner');
			spinner.classList.remove('disabled-spinner');
		}

		SaveItemAttributes(item);
		//to improve perfomance of save operation, because results of "get" will be discarded by "unlock" below.
		item.setAttribute('doGetItem', '1');
		res = aras.saveItemEx(item, false);
		aras.clearStatusMessage(statusId);
		if (!res) {
			RestoreItemAttributes(item);
			return true;
		}
	} finally {
		if (isSpinnerNecessary) {
			spinner.classList.add('disabled-spinner');
		}
	}

	res.setAttribute('levels', '-1'); //invalidates cached item because there was no "get"

	onAfterCommandRun('save');

	var resItemId = res.getAttribute('id');
	res = aras.getItemById$skipServerCache(itemTypeName, resItemId, 0, 'locked_by_id');
	if (!res) {
		return true;
	}
	res.setAttribute('levels', '-1'); //invalidates cached item because there was no "get"

	statusId = aras.showStatusMessage('status', aras.getResource('', 'common.unlocking'), '../images/Progress.gif');
	res = aras.unlockItemEx(res, false);
	aras.clearStatusMessage(statusId);
	if (!res) {
		return true;
	}

	updateItemsGrid(res);
	if (itemTypeName == 'ItemType') {
		if (window.isTearOff) {
			openerMainWnd.main.tree.updateTree(itemID.split(';'));
		} else {
			mainWnd.main.tree.updateTree(itemID.split(';'));
		}
	} else if (itemTypeName == 'Action') {
		if (window.isTearOff) {
			openerMainWnd.main.menu.updateGenericActions();
		} else {
			mainWnd.main.menu.updateGenericActions();
		}
	} else if (itemTypeName == 'Report') {
		if (window.isTearOff) {
			openerMainWnd.main.menu.updateGenericReports(true);
		} else {
			mainWnd.main.menu.updateGenericReports(true);
		}
	}

	if (window.isTearOff) {
		window.close();
	}
	return true;
}

// IR-003016 Run Report method fails
function clearJavascriptInReport(item) {
	var tmpDOM = aras.createXMLDocument();
	var xsl_stylesheet = aras.getItemProperty(item, 'xsl_stylesheet');
	if (xsl_stylesheet != '') {
		tmpDOM.loadXML(xsl_stylesheet);
		var node = tmpDOM.selectSingleNode('//*[@implements-prefix="aras"]');
		var isModify = false;
		node = tmpDOM.selectSingleNode('//script[@userData=\'Tool Logic\']');
		if (node) {
			node.parentNode.removeChild(node);
			isModify = true;
		}
		if (isModify) {
			aras.setItemProperty(item, 'xsl_stylesheet', tmpDOM.xml);
		}
	}
}

function onRevisionsCommand() {
	var param = new Object();
	param.aras = aras;
	param.itemID = itemID;
	param.itemTypeName = itemTypeName;

	var dlgWidth = 500;
	var itemTypeID = aras.getItemTypeId(itemTypeName);
	var colWidths = aras.getPreferenceItemProperty('Core_ItemGridLayout', itemTypeID, 'col_widths', null);
	if (colWidths) {
		dlgWidth = 0;
		var colWidthsArr = colWidths.split(';');
		for (var i = 0; i < colWidthsArr.length; i++) {
			dlgWidth += parseInt(colWidthsArr[i]);
		}
	}

	param.dialogWidth = dlgWidth;
	param.resizable = true;
	param.type = 'RevisionsDialog';
	param.title = aras.getResource('', 'revisiondlg.item_versions');

	window.ArasModules.Dialog.show('iframe', param);
	return true;
}

function onPromoteCommand() {
	var param = {
		item: item,
		aras: aras,
		title: aras.getResource('', 'promotedlg.propmote', aras.getKeyedNameEx(item)),
		dialogWidth: 400,
		dialogHeight: 300,
		resizable: true,
		content: 'promoteDialog.html'
	};
	var oldID = itemID;

	(mainWnd.main || mainWnd).ArasModules.Dialog.show('iframe', param).promise.then(
		function(res) {
			if (typeof (res) == 'string' && res == 'null') {
				deleteRowFromItemsGrid(itemID);

				if (window.isTearOff) {
					window.close();
				} else {
					mainWnd.main.work.location.replace('itemsGrid.html?itemtypeID=' + window.itemType.getAttribute('id'));
				}
				return;
			}

			if (!res) {
				return;
			}

			if (isVersionableIT) {
				itemID = res.getAttribute('id');
				if (oldID != itemID) {
					deleteRowFromItemsGrid(oldID);
					addRowToItemsGrid(res);
					if (window.isTearOff) {
						window.close();
					}
				}
			}
			if (window.isTearOff) {
				updateItemsGrid(res);
			}
			isEditMode = false;
		}
	);
}

function onPrintCommand() {
	function GetFormPrintPreviewNode(formNode) {
		function f() {
			// delete window border
			var topWindow = aras.getMostTopWindowWithAras(window);
			var mainDiv = topWindow.document.getElementsByClassName('dijitDialogTitleBar')[0];
			if (mainDiv) {
				mainDiv.parentElement.style.setProperty('border', 'none');
			}

			mainDiv = topWindow.document.getElementsByClassName('dijitDialogPaneContent')[0];
			if (mainDiv) {
				mainDiv.style.setProperty('border-top', 'none');
				mainDiv.style.setProperty('margin-top', '3px');
			}

			setTimeout(function() {
				if (typeof onbeforeprint$user$handler == 'function') {
					onbeforeprint$user$handler();
				}

				// printing
				topWindow.ModulesManager.using(['aras.innovator.Printing/PrintingToPdf']).then(function(pdf) {
					pdf.printToPdf(window, 'print_result.pdf');

					if (typeof onafterprint$user$handler == 'function') {
						onafterprint$user$handler();
					}
				});
			}, 300);
		}

		var fakeFormEvent = new Item('Form Event', '');
		fakeFormEvent.setID('fakeFormEvent_45A45476CCFE4836AC1F2A5AC94D75E1');
		fakeFormEvent.setProperty('form_event', 'onformpopulated');
		fakeFormEvent.setProperty('source_id', fakeFormEvent);
		var fakeFormEventMethod = new Item('Method', '');
		fakeFormEventMethod.setID('fakeFormEventMethod_45A45476CCFE4836AC1F2A5AC94D75E2');
		fakeFormEventMethod.setProperty('method_type', 'JavaScript');
		fakeFormEventMethod.setProperty('name', 'fakeFormEventMethod_45A45476CCFE4836AC1F2A5AC94D75E2');
		fakeFormEventMethod.setProperty('method_code', f.toString() + ' f();');
		fakeFormEvent.setPropertyItem('related_id', fakeFormEventMethod);

		formNode = formNode.cloneNode(true);
		var rels = formNode.selectSingleNode('Relationships');
		rels.appendChild(rels.ownerDocument.importNode(fakeFormEvent.node, true));
		return formNode;
	}

	function showPrintForm(formNode, newItem) {
		var param = {};
		param.title = 'PrintForm';
		param.formType = 'printForm';
		param.aras = this.aras;
		param.isEditMode = false;
		param.item = new Item('tmp', 'tmp');
		param.item.loadAML(newItem.xml);
		param.formNd = GetFormPrintPreviewNode(formNode);
		param.dialogHeight = 400;
		param.dialogWidth = 800;
		param.content = 'ShowFormAsADialog.html';
		mainWnd.ArasModules.Dialog.show('iframe', param);
	}

	var fileMenu = window.document.getElementById('file_menu_dropdown');
	if (fileMenu) {
		fileMenu.style.display = 'none';
	}

	var frame = findInstanceFrame();
	var printId = aras.uiGetFormID4ItemEx(item, 'print');
	var defaultId = aras.uiGetFormID4ItemEx(item, 'default');
	var formNode = aras.uiGetForm4ItemEx(item, 'print');
	var itemTypeName = item.getAttribute('type');
	aras.saveUICommandHistoryIfNeed(itemTypeName, item, 'print', new Array(aras.getItemProperty(formNode, 'name')));

	if (!printId || printId === defaultId) {
		if (frame && frame.document.body.onbeforeprint) {
			var f = frame.document.body.onbeforeprint;
			f();
		}

		ModulesManager.using(['aras.innovator.Printing/PrintingToPdf']).then(function(pdf) {
			var itLabel = aras.getItemProperty(itemType, 'label');
			if (!itLabel) {
				itLabel = aras.getItemProperty(itemType, 'name');
			}
			var itemLabel = aras.getItemProperty(item, 'keyed_name');
			if (!itemLabel) {
				itemLabel = aras.getItemProperty(item, 'id');
			}

			pdf.printToPdf(frame, itLabel + '-' + itemLabel + '.pdf');

			if (frame && frame.document.body.onafterprint) {
				var onAfterPrintEvent = frame.document.body.onafterprint;
				onAfterPrintEvent();
			}
		});
	} else {
		showPrintForm(formNode, item);
	}
	return true;
}

function onExport2OfficeCommand(targetAppType) {
	if (item) {
		var frm = document.frames['relationships'] ? document.frames['relationships'].frameElement : null,
			gridXmlCallback = '',
			tabName;
		if (frm) {
			frm = frm.contentWindow.iframesCollection[frm.contentWindow.currTabID];
			if (frm && frm.contentWindow.onExport2OfficeCommand) {
				frm.contentWindow.onExport2OfficeCommand(targetAppType);
				return;
			} else if (frm && frm.contentWindow.grid) {
				var isExport2Excel = targetAppType === 'export2Excel';
				if (isExport2Excel && document.frames['relationships'].currTabID) {
					tabName = aras.getRelationshipTypeName(document.frames['relationships'].currTabID);
				}
				gridXmlCallback = function() {
					if (frm.contentWindow.grid.getXML) {
						return frm.contentWindow.grid.getXML(isExport2Excel);
					}
					return '';
				};
			}
		}
		aras.export2Office(gridXmlCallback, targetAppType, item, itemTypeName, tabName);
	}
}

function onOpenCommand() {
	aras.uiShowItemEx(item, 'openFile');
	return true;
}

function onDownloadCommand() {
	if (itemTypeName != 'File') {
		return true;
	}

	var workDir = aras.getWorkingDir(false, window);
	if (workDir == '') {
		return true;
	}

	with (aras) {
		var filename = getItemProperty(item, 'filename');
		var fileURL = getFileURLEx(item);
		if (fileURL == '') {
			aras.AlertError(aras.getResource('', 'item_methods_ex.failed_download_file_url_empty'));
			return false;
		}

		vault.clearClientData();
		vault.clearFileList();

		vault.setClientData('SOAPACTION', 'GetFile');
		vault.setClientData('DATABASE', aras.getDatabase());
		vault.setClientData('AUTHUSER', aras.getLoginName());
		vault.setClientData('AUTHPASSWORD', aras.getPassword());

		vault.setLocalFileName(filename);
		if (!vault.downloadFile(fileURL)) {
			aras.AlertError(aras.getResource('', 'item_window.failed_download_file'), 'item_window: ' + vault.getLastError(), aras.getResource('', 'common.client_side_err'));
		} else {
			aras.AlertSuccess(aras.getResource('', 'itemsgrid.file_succesfully_downloaded', filename, workDir));
		}
	}

	return true;
}

function onWhereusedViewCommand() {
}

var __mediatorTop;
var __instanceHeight;
function showRelationshipsFrame(b) {
	window.hideTabs = !b;

	if (viewMode == 'tab view' && frames['relationships']) {
		if (b) {
			// Show relationships grid
			document.querySelector('#mediator').style.top = __mediatorTop;
			document.querySelector('#mediator').style.height = '';
			document.querySelector('#Splitter').style.display = '';
			document.querySelector('#instance_div').style.bottom = '';
			document.querySelector('#instance_div').style.height = __instanceHeight;
		} else {
			var key = 'top';//to explicitly allow "top" usage
			__mediatorTop = document.querySelector('#mediator').style[key];
			document.querySelector('#mediator').style.height = '0';
			document.querySelector('#Splitter').style.display = 'none';
			__instanceHeight = document.querySelector('#instance_div').style.height;
			document.querySelector('#instance_div').style.height = '';
			var bottom = document.querySelector('#mediator').style.bottom;
			document.querySelector('#instance_div').style.bottom = bottom;
		}
		UpdateLayout();

		if (!menuFrame.menuFrameReady) {
			setTimeout('showRelationshipsFrame(' + b + ')', 100);

		}

		updateMenuState();
	}
}

function onRefresh() {
	onBeforeCommandRun('refresh');
	aras.uiReShowItemEx(itemID, item, viewMode);
	onAfterCommandRun('refresh');
}

function updateMenu() {
	if (menuFrame.populateAccessMenuLazyStart) {
		menuFrame.populateAccessMenuLazyStart();
	}
}

function onCopy2clipboardCommand() {
	if (this.menu && this.menu.copyTreeNode) {
		this.menu.copyTreeNode();
		return;
	}
	var itemArr = new Array();
	var itemID = item.getAttribute('id');
	var itemTypeName = item.getAttribute('type');
	var clItem = aras.copyRelationship(itemTypeName, itemID);
	itemArr.push(clItem);

	aras.clipboard.copy(itemArr);
	updateMenuState();
}

function onPasteCommand() {
	var relationshipFrame = findCurrentRelationshipsTab();

	if (relationshipFrame && relationshipFrame.onPaste) {
		relationshipFrame.onPaste();
	} else {
		var itemArr = aras.clipboard.paste(),
			i;

		if (itemArr.length) {
			for (i = 0; i < itemArr.length; i++) {
				var clipboardItem = itemArr[i],
					RelType_Nm = clipboardItem.relationship_itemtype,
					RelType_Nd = aras.getItemFromServerByName('RelationshipType', RelType_Nm, 'copy_permissions,create_related').node,
					as_is = aras.getItemProperty(RelType_Nd, 'copy_permissions') == '1',
					as_new = aras.getItemProperty(RelType_Nd, 'create_related') == '1',
					relNd = aras.pasteRelationship(item, clipboardItem, as_is, as_new, RelType_Nm);

				if (!relNd) {
					aras.AlertError(aras.getResource('', 'itemsgrid.pasting_failed'));
					return;
				}
			}

			aras.AlertSuccess(aras.getResource('', 'itemsgrid.pasting_success'));
			onRefresh();
			updateItemsGrid(item);
		}
	}
}

function onPaste_specialCommand(targetRelationshipTN, targetRelatedTN) {
	var arguments = {
		aras: aras,
		title: aras.getResource('', 'clipboardmanager.clipboard_manager'),
		itemsArr: [window.item],
		srcItemTypeId: itemTypeID,
		targetRelationshipTN: targetRelationshipTN,
		targetRelatedTN: targetRelatedTN,
		dialogWidth: 700,
		dialogHeight: 450,
		content: 'ClipboardManager.html'
	};
	(mainWnd.main || mainWnd).ArasModules.Dialog.show('iframe', arguments).promise.then(
		function(result) {
			if (result && result.ids) {
				var clipboardItems = aras.clipboard.clItems,
					clipboardItem, i;

				for (i = 0; i < result.ids.length; i++) {
					clipboardItem = clipboardItems[result.ids[i]];

					if (!aras.pasteRelationship(item, clipboardItem, result.as_is, result.as_new, targetRelationshipTN, targetRelatedTN)) {
						aras.AlertError(aras.getResource('', 'itemsgrid.pasting_failed'));
						return;
					}
				}
				aras.AlertSuccess(aras.getResource('', 'itemsgrid.pasting_success'));

				onRefresh();
				updateItemsGrid(item);
			}
		}
	);
}

function onShow_clipboardCommand() {
	var arguments = {
		aras: aras,
		title: aras.getResource('', 'clipboardmanager.clipboard_manager'),
		srcItemTypeId: itemTypeID,
		dialogWidth: 700,
		dialogHeight: 450,
		content: 'ClipboardManager.html'
	};
	(mainWnd.main || mainWnd).ArasModules.Dialog.show('iframe', arguments).promise.then(
		function(res) {
			if (res) {
				onRefresh();
				if (mainWnd.main && mainWnd.main.menu) {
					mainWnd.main.menu.setControlEnabled('show_clipboard', !aras.clipboard.isEmpty());
				}
			}
		}
	);
}
