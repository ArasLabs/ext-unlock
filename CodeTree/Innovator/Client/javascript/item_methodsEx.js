// c Copyright by Aras Corporation, 2004-2012.

/*
*   The item extended methods extension for the Aras Object.
*   methods in this file use xml nodes as parameters
*/

/// <reference path="soap_object.js" />

Aras.prototype.isNew = function(itemNd) {
	if (!this.isTempEx(itemNd)) {
		return false;
	}
	return ('add' == itemNd.getAttribute('action'));
};

Aras.prototype.isTempEx = function(itemNd) {
	if (itemNd == undefined) {
		return undefined;
	}
	return (itemNd.getAttribute('isTemp') == '1');
};

Aras.prototype.isDirtyEx = function(itemNd) {
	if (itemNd == undefined) {
		return undefined;
	}
	return (itemNd.selectSingleNode('descendant-or-self::Item[@isDirty="1"]') != null);
};

Aras.prototype.isLocked = function Aras_isLocked(itemNd) {
	if (this.isTempEx(itemNd)) {
		return false;
	}
	return ('' != this.getItemProperty(itemNd, 'locked_by_id'));
};

Aras.prototype.isLockedByUser = function Aras_isLockedByUser(itemNd) {
	if (this.isTempEx(itemNd)) {
		return false;
	}

	var locked_by_id = this.getItemProperty(itemNd, 'locked_by_id');

// Add Neosystem Start
	if(aras.isAdminUser(itemNd.getAttribute("type")) && locked_by_id) {
		return true;
	}
// Add Neosystem End

	return (locked_by_id == this.getCurrentUserID());
};

/*-- copyItemEx
*
*   Method to copy an item
*   itemNd = item to be cloned
*
*/
Aras.prototype.copyItemEx = function(itemNd, action, do_add) {
	if (!itemNd) {
		return false;
	}
	if (!action) {
		action = 'copyAsNew';
	}
	if (do_add == undefined) {
		do_add = true;
	}
	if (do_add == null) {
		do_add = true;
	}

	var itemTypeName = itemNd.getAttribute('type');
	var bodyStr = '<Item type="' + itemTypeName + '" id="' + itemNd.getAttribute('id') + '" ';
	if (itemTypeName.search(/^ItemType$|^RelationshipType$|^User$/) == 0) {
		bodyStr += ' action="copy" ';
	} else {
		bodyStr += ' action="' + action + '" ';
	}
	if (!do_add) {
		bodyStr += ' do_add="0" ';
	}
	bodyStr += ' />';

	var res = null;

	with (this) {
		var statusId = showStatusMessage('status', getResource('', 'common.copying_item'), system_progressbar1_gif);
		res = soapSend('ApplyItem', bodyStr);
		clearStatusMessage(statusId);
	}

	if (res.getFaultCode() != 0) {
		this.AlertError(res);
		return null;
	}

	var itemCopy = res.results.selectSingleNode('//Item');
	return itemCopy;
};

//+++++ saving item +++++
Aras.prototype.checkItemType = function(itemNd, win) {
	var isTaskOrItsChildCache;
	function isDataSourceSpecified(arasObj) {
		var isTaskOrItsChild = itemNd && (arasObj.getItemProperty(itemNd, 'name') == 'InBasket Task' || itemNd.selectSingleNode('../../../../../Item[name=\'InBasket Task\']'));
		if (!isTaskOrItsChild) {
			if (isTaskOrItsChildCache === undefined) {
				var tmpRes = arasObj.applyItem(
					'<Item type=\'Morphae\' action=\'get\' select=\'id\'>' +
					'<source_id><Item type=\'ItemType\'><keyed_name>InBasket Task</keyed_name></Item></source_id>' +
					'<related_id>' + itemNd.getAttribute('id') + '</related_id>' +
					'</Item>');
				if (tmpRes) {
					var tmpDoc = arasObj.createXMLDocument();
					tmpDoc.loadXML(tmpRes);
					tmpRes = tmpDoc.selectSingleNode('//Item') ? true : false;
				} else {
					tmpRes = false;
				}
				isTaskOrItsChildCache = tmpRes;
			}
			isTaskOrItsChild = isTaskOrItsChildCache;
		}

		if (!propDs && propName != 'related_id' && propName != 'source_id' && !isTaskOrItsChild) {
			arasObj.AlertError(arasObj.getResource('', 'item_methods_ex.property_data_source_not_specified', propKeyedName), '', '', win);
			return false;
		} else {
			return true;
		}
	}

	with (this) {
		var name = getItemProperty(itemNd, 'name');
		if (name == '') {
			AlertError(getResource('', 'item_methods_ex.item_type_name_cannot_be_blank'), '', '', win);
			return false;
		}

		var property, propKeyedName, propDt, propName, propDs, tmpStoredLength, storedLength, pattern;

		var properties = itemNd.selectNodes('Relationships/Item[@type="Property" and (not(@action) or (@action!="delete" and @action!="purge"))]');
		for (var i = 0; i < properties.length; i++) {
			property = properties[i];
			propKeyedName = getKeyedNameEx(property);

			propName = getItemProperty(property, 'name');
			if (!propName) {
				this.AlertError(getResource('', 'item_methods_ex.item_type_has_property_with_no_name', getItemProperty(itemNd, 'label')), win);
				return false;
			}

			propDt = getItemProperty(property, 'data_type');
			propDs = getItemProperty(property, 'data_source');

			if (propDt == 'string' || propDt == 'ml_string' || propDt == 'mv_list') {
				tmpStoredLength = getItemProperty(property, 'stored_length');
				storedLength = parseInt(tmpStoredLength);

				if (isNaN(storedLength)) {
					AlertError(getResource('', 'item_methods_ex.length_of_property_not_specified', propKeyedName), '', '', win);
					return false;
				} else if (storedLength <= 0) {
					AlertError(getResource('', 'item_methods_ex.length_of_property_invalid', propKeyedName, tmpStoredLength), '', '', win);
					return false;
				}

				if ('mv_list' == propDt && !isDataSourceSpecified(this)) {
					return false;
				}
			} else if ((propDt == 'item' || propDt == 'list' || propDt == 'filter list' || propDt == 'color list' || propDt == 'sequence' || propDt == 'foreign') && !isDataSourceSpecified(this)) {
				return false;
			} else if (propDt == 'filter list') {
				if (!isDataSourceSpecified(this)) {
					return false;
				}

				pattern = getItemProperty(property, 'pattern');
				if (!pattern) {
					AlertError(getResource('', 'item_methods_ex.fliter_list_property_has_to_have_pattern', propKeyedName), '', '', win);
					return false;
				}

				var tmpNd_1 = itemNd.selectSingleNode('Relationships/Item[@type="Property" and name="' + pattern + '" and (not(@action) or (@action!="delete" and @action!="purge"))]');
				if (!tmpNd_1) {
					AlertError(getResource('', 'item_methods_ex.filter_list_property_has_wrong_pattern', propKeyedName, pattern), win);
					return false;
				} else if (getItemProperty(tmpNd_1, 'name') == getItemProperty(property, 'name')) {
					AlertError(getResource('', 'item_methods_ex.property_for_pattern_cannot_property_itself', propKeyedName), '', '', win);
					return false;
				}
			}
		}
		var discussionTemplates = itemNd.selectNodes('Relationships/Item[@type="DiscussionTemplate" and (not(@action) or (@action!="delete" and @action!="purge"))]');
		if (discussionTemplates.length > 0) {
			var isRootClassificationExists = false;
			for (var i = 0; i < discussionTemplates.length; i++) {
				var discussionTemplate = discussionTemplates[i];
				if (getItemProperty(discussionTemplate, 'class_path') === '') {
					isRootClassificationExists = true;
				}
			}
			if (!isRootClassificationExists) {
				AlertError(getResource('', 'item_methods_ex.item_type_should_have_discussiontemplate_for_root_class_path', propKeyedName, pattern), win);
				return isRootClassificationExists;
			}
		}
	}
	return true;
};

Aras.prototype.checkItemForErrors = function Aras_checkItemForErrors(itemNd, exclusion, itemType, breakOnFirstError, emptyPropertyWithDefaultValueCallback) {
	var resultErrors = [];

	with (this) {
		var propNd, reqId, isRequired, reqName, reqDataType, itemPropVal, defVal;

		var typeOfItem = itemNd.getAttribute('type');
		if (!typeOfItem) {
			return resultErrors;
		}

		var itemType = itemType ? itemType : getItemTypeDictionary(typeOfItem).node;
		if (!itemType) {
			return resultErrors;
		}

		var propertiesXpath = 'Relationships/Item[@type="Property" and (is_required="1" or data_type="string")' + (exclusion ? ' and name!="' + exclusion + '"' : '') + ']';
		var requirements = itemType.selectNodes(propertiesXpath);
		for (var i = 0; i < requirements.length; i++) {
			propNd = requirements[i];
			reqId = propNd.getAttribute('id');
			reqName = getItemProperty(propNd, 'name');
			reqDataType = getItemProperty(propNd, 'data_type');
			isRequired = (getItemProperty(propNd, 'is_required') == '1');

			if (!reqName) {
				var noNameError = getResource('', 'item_methods_ex.item_type_has_property_with_no_name', getItemProperty(itemType, 'label'));
				resultErrors.push({ message: noNameError });
				if (breakOnFirstError) {
					return resultErrors;
				}
			}

			var proplabel = getItemProperty(propNd, 'label');
			if (!proplabel) {
				proplabel = getItemProperty(propNd, 'keyed_name');
			}
			if (!proplabel) {
				proplabel = '';
			}

			itemPropVal = getItemProperty(itemNd, reqName);
			if (isRequired && itemPropVal == '') {
				defVal = getItemProperty(propNd, 'default_value');
				if (defVal) {
					if (emptyPropertyWithDefaultValueCallback && typeof(emptyPropertyWithDefaultValueCallback) === 'function') {
						var callbackResult = emptyPropertyWithDefaultValueCallback(itemNd, reqName, proplabel, defVal);
						if (!callbackResult.result) {
							if (callbackResult.message) {
								resultErrors.push({ message: callbackResult.message });
							} else {
								resultErrors.push({});
							}
							if (breakOnFirstError) {
								return resultErrors;
							}
						}
					}
					continue;
				} else if (!isPropFilledOnServer(reqName) && (reqDataType != 'md5' || itemNd.getAttribute('action') == 'add' || itemNd.selectSingleNode(reqName))) {
					var fieldRequiredError = getResource('', 'item_methods_ex.field_required_provide_value', proplabel);
					resultErrors.push({ message: fieldRequiredError });
					if (breakOnFirstError) {
						return resultErrors;
					}
				}
			}

			if (reqDataType == 'string') {
				var storedLength = parseInt(getItemProperty(propNd, 'stored_length'));
				if (!isNaN(storedLength) && itemPropVal.length - storedLength > 0) {
					var maxLengthError = getResource('', 'item_methods_ex.maximum_length_characters_for_property', proplabel, storedLength, itemPropVal.length);
					resultErrors.push({ message: maxLengthError });
					if (breakOnFirstError) {
						return resultErrors;
					}
				}
			}

		}
	}
	return resultErrors;
};

Aras.prototype.checkItem = function Aras_checkItem(itemNd, win, exclusion, itemType) {
	var self = this;
	var defaultFieldCheckCallback = function(itemNode, reqName, proplabel, defVal) {
		var ask = self.confirm(self.getResource('', 'item_methods_ex.field_required_default_will_be_used', proplabel, defVal));
		if (ask) {
			self.setItemProperty(itemNode, reqName, defVal);
		}
		return {result: ask, message: ''};
	};

	var errors = this.checkItemForErrors(itemNd, exclusion, itemType, true, defaultFieldCheckCallback);
	if (errors.length > 0) {
		if (errors[0].message) {
			this.AlertError(errors[0].message, '', '', win);
		}
	}
	return errors.length === 0;
};

Aras.prototype.prepareItem4Save = function Aras_prepareItem4Save(itemNd) {
	var itemTypeName = itemNd.getAttribute('type');
	var itemID, item, items, items2;
	var i, j, parentNd;

	itemID = itemNd.getAttribute('id');
	items = itemNd.selectNodes('.//Item[@id="' + itemID + '"]');

	for (i = 0; i < items.length; i++) {
		item = items[i];
		parentNd = item.parentNode;
		parentNd.removeChild(item);
		parentNd.text = itemID;
	}

	items = itemNd.selectNodes('.//Item[@action="delete"]');
	for (i = 0; i < items.length; i++) {
		item = items[i];
		var childs = item.selectNodes('*[count(descendant::Item[@action])=0]');
		for (var j = 0; j < childs.length; j++) {
			var childItem = childs[j];
			item.removeChild(childItem);
		}
	}

	items = itemNd.selectNodes('.//Item');
	for (i = 0; i < items.length; i++) {
		item = items[i];
		itemID = item.getAttribute('id');
		items2 = itemNd.selectNodes('.//Item[@id="' + itemID + '"][@data_type != "foreign"]');
		for (j = 1; j < items2.length; j++) {
			item = items2[j];
			parentNd = item.parentNode;
			parentNd.removeChild(item);
			parentNd.text = itemID;
		}
	}

	items = itemNd.selectNodes('.//Item[not(@action) and not(.//Item/@action)]');
	for (i = 0; i < items.length; i++) {
		items[i].setAttribute('action', 'get');
	}

	items = itemNd.selectNodes('.//Item[@action="get" and (not(.//Item) or not(.//Item/@action!="get"))]');
	for (i = 0; i < items.length; i++) {
		item = items[i];
		itemID = item.getAttribute('id');
		parentNd = item.parentNode;

		if (parentNd.nodeName == 'Relationships') {
			parentNd.removeChild(item);
		} else {
			if (itemID) {
				parentNd.removeChild(item);
				parentNd.text = itemID;
			}
		}
	}

	items = itemNd.selectNodes('.//Item[@action="get"]');
	for (i = 0; i < items.length; i++) {
		items[i].setAttribute('action', 'skip');
	}
};

function ClearDependenciesInMetadataCache(aras, itemNd) {
	items = itemNd.selectNodes('descendant-or-self::Item');
	for (i = 0; i < items.length; i++) {
		var tmpId = items[i].getAttribute('id');
		if (tmpId) {
			aras.MetadataCache.RemoveItemById(tmpId);
		}
	}
	var srcId = aras.getItemProperty(itemNd, 'source_id');
	if (srcId) {
		aras.MetadataCache.RemoveItemById(srcId);
	}
	//calling new method to clear metadata dates in Cache if Item has certain type
	var NeedClearCache = itemNd.getAttribute('type');
	if (NeedClearCache == 'ItemType' || NeedClearCache == 'Property' || NeedClearCache == 'Grid Event' || NeedClearCache == 'View' || NeedClearCache == 'TOC View' || NeedClearCache == 'Item Action' || NeedClearCache == 'Item Report' ||
			NeedClearCache == 'Client Event' || NeedClearCache == 'Morphae' || NeedClearCache == 'RelationshipType' || NeedClearCache == 'Relationship View' || NeedClearCache == 'Relationship Grid Event' ||
			NeedClearCache == 'Can Add' || NeedClearCache == 'History Template' || NeedClearCache == 'History Template Action' || NeedClearCache == 'History Action') {

		aras.MetadataCache.DeleteITDatesFromCache();// if saving IT - remove all IT dates from cache, form dates can stay
	}

	if (NeedClearCache == 'ItemType' || NeedClearCache == 'RelationshipType' || NeedClearCache == 'Relationship View' || NeedClearCache == 'Relationship Grid Event') {
		aras.MetadataCache.DeleteRTDatesFromCache();
	}

	if (NeedClearCache == 'Identity') {
		aras.MetadataCache.DeleteITDatesFromCache();
		aras.MetadataCache.DeleteIdentityDatesFromCache();
	}

	//If node isn't not part of ItemType, but List - remove List dates from cache
	if (NeedClearCache == 'List' || NeedClearCache == 'Value' || NeedClearCache == 'Filter Value') {
		aras.MetadataCache.DeleteListDatesFromCache();
	}

	//If node isn't not part of ItemType nor List but Form - remove Form and IT dates from cache
	//hack: When new ItemType is being created server creates for it new form using "Create Form for ItemType" server method. To update form cache ItemType variant is being added.
	if (NeedClearCache == 'Form' || NeedClearCache == 'Form Event' || NeedClearCache == 'Method' || NeedClearCache == 'Body' || NeedClearCache == 'Field' || NeedClearCache == 'Field Event' || NeedClearCache == 'Property' || NeedClearCache == 'List' || NeedClearCache == 'ItemType') {
		aras.MetadataCache.DeleteFormDatesFromCache();
		aras.MetadataCache.DeleteITDatesFromCache();//remove IT dates on saving Form, since it affects IT
		aras.MetadataCache.DeleteClientMethodDatesFromCache();
	}

	//If node is searchMode, remove SearchMode dates from cache
	if (NeedClearCache == 'SearchMode') {
		aras.MetadataCache.DeleteSearchModeDatesFromCache();
	}

	var _needClearCache = ',' + (NeedClearCache || '').toLowerCase() + ',';
	if (',globalpresentationconfiguration,itpresentationconfiguration,presentationconfiguration,presentationcommandbarsection,commandbarsection,commandbarsectionitem,commandbaritem,'.indexOf(_needClearCache) > -1) {
		aras.MetadataCache.DeleteConfigurableUiDatesFromCache();
	}
	if (',presentationconfiguration,presentationcommandbarsection,'.indexOf(_needClearCache) > -1) {
		aras.MetadataCache.DeletePresentationConfigurationDatesFromCache();
	}

	if (NeedClearCache === 'CommandBarSection') {
		aras.MetadataCache.DeleteCommandBarSectionDatesFromCache();
	}
	if (NeedClearCache == 'ItemType' || NeedClearCache === 'cmf_ContentType') {
		aras.MetadataCache.DeleteContentTypeByDocumentItemTypeDatesFromCache();
		aras.MetadataCache.DeleteITDatesFromCache();//remove IT dates on saving ContentType, since it affects a lot of IT
	}
}

Aras.prototype.calcMD5 = function(s) {
	return calcMD5(s);
};

Aras.prototype.sendFilesWithVaultApplet = function Aras_sendFilesWithVaultApplet(itemNd, statusMsg, XPath2ReturnedNd) {
	/*----------------------------------------
	* sendFilesWithVaultApplet
	*
	* Purpose:
	* This function is for iternal use only. DO NOT use in User Methods
	* Checks physical files.
	* Sets headers and send physical files to Vault
	*
	* Arguments:
	* itemNd    - xml node to be processed
	* statusMsg - string to show in status bar while files being uploaded
	* XPath2ReturnedNd = xpath to select returned node. Default: aras.XPathResult('/Item')
	*/

	var win = this.uiFindWindowEx2(itemNd);
	if (!XPath2ReturnedNd) {
		XPath2ReturnedNd = this.XPathResult('/Item');
	}

	var vaultServerURL = this.getVaultServerURL();
	var vaultServerID = this.getVaultServerID();
	if (vaultServerURL == '' || vaultServerID == '') {
		this.AlertError(this.getResource('', 'item_methods_ex.vault_sever_not_specified'), '', '', win);
		return null;
	}

	var vaultApplet = this.vault;
	vaultApplet.clearClientData();
	vaultApplet.clearFileList();

	var headers = this.getHttpHeadersForSoapMessage('ApplyItem');
	headers['VAULTID'] = vaultServerID;
	for (var hName in headers) {
		vaultApplet.setClientData(hName, headers[hName]);
	}

	var fileNds = itemNd.selectNodes('descendant-or-self::Item[@type="File" and (@action="add" or @action="update")]');
	for (var i = 0; i < fileNds.length; i++) {
		var fileNd = fileNds[i];
		var fileID = fileNd.getAttribute('id');

		if (fileID) {
			var fileRels = fileNd.selectSingleNode('Relationships');
			if (!fileRels) {
				fileRels = this.createXmlElement('Relationships', fileNd);
			} else {
				var all_located = fileRels.selectNodes('Item[@type=\'Located\']');
				// If file has more than one 'Located' then remove all of them except the
				// one that points to the default vault of the current user.
				// NOTE: it's a FUNDAMENTAL Innovator's approach - file is always
				//       submitted to the default vault of the current user. If this
				//       concept will be changed in the future then this code must be modified.
				var lcount = all_located.length;
				for (var j = 0; j < lcount; j++) {
					var located = all_located[j];
					var rNd = located.selectSingleNode('related_id');
					if (!rNd) {
						fileRels.removeChild(located);
					} else {
						var rvId = '';
						var rItemNd = rNd.selectSingleNode('Item[@type=\'Vault\']');
						if (rItemNd) {
							rvId = rItemNd.getAttribute('id');
						} else {
							rvId = rNd.text;
						}

						if (rvId != vaultServerID) {
							fileRels.removeChild(located);
						}
					}
				}
			}

			var fileLocated = fileRels.selectSingleNode('Item[@type=\'Located\']');
			if (!fileLocated) {
				fileLocated = this.createXmlElement('Item', fileRels);
				fileLocated.setAttribute('type', 'Located');
			}
			if (!fileLocated.getAttribute('action')) {
				var newLocatedAction = '';
				if (fileNd.getAttribute('action') == 'add') {
					newLocatedAction = 'add';
				} else {
					newLocatedAction = 'merge';
				}
				fileLocated.setAttribute('action', newLocatedAction);
			}

			// When file could have only one 'Located' we used on Located the condition 'where="1=1"' which essentially meant
			// "add if none or replace any existing Located on the File". With ability of a file to reside in multiple
			// vaults (i.e. item of type 'File' might have several 'Located' relationships) the behavior is "add Located
			// if file is not there yet; update the Located if the file already in the vault". This is achieved by
			// specifying on 'Located' condition 'where="related_id='{vault id}'"'. Note that additional condition
			// 'source_id={file id}' will be added on server when the sub-AML <Item type='Located' ...> is processed.
			if (!fileLocated.getAttribute('id') && !fileLocated.getAttribute('where')) {
				fileLocated.setAttribute('where', 'related_id=\'' + vaultServerID + '\'' /*"AND source_id='"+fileID+"'"*/);
			}
			this.setItemProperty(fileLocated, 'related_id', vaultServerID);
		}

		//code related to export/import functionality. server_id == donor_id.
		var server_id = this.getItemProperty(fileNd, 'server_id');
		if (server_id == '') {
			//this File is not exported thus check physical file.
			var checkedout_path = this.getItemProperty(fileNd, 'checkedout_path');
			var filename = this.getItemProperty(fileNd, 'filename');
			var FilePath;

			var itemId = this.getItemProperty(fileNd, 'id');
			var isFileSelected = false;
			if (this.getItemProperty(fileNd, 'file_size')) {
				isFileSelected = true;
			}

			if (!isFileSelected || !vaultApplet.setWorkingDir(checkedout_path) ||
				!filename || !this.setFileNameInVaultWithPathCheck(isFileSelected ? itemId : checkedout_path, filename)) {

				FilePath = vaultApplet.selectFile();
				if (!FilePath) {
					return null;
				}

				var parts = FilePath.split(/[\\\/]/);
				filename = parts[parts.length - 1];
				this.setItemProperty(fileNd, 'filename', filename);
			} else {
				if (checkedout_path) {
					if (0 == checkedout_path.indexOf('/')) {
						FilePath = checkedout_path + '/' + filename;
					} else {
						FilePath = checkedout_path + '\\' + filename;
					}
				} else {
					FilePath = aras.vault.vault.associatedFileList[itemId];
				}

			}

			this.setItemProperty(fileNd, 'checksum', vaultApplet.getFileChecksum(FilePath));
			this.setItemProperty(fileNd, 'file_size', vaultApplet.getFileSize(FilePath));

			vaultApplet.addFileToList(fileID, FilePath);
		}
	}

	var statusId = this.showStatusMessage('status', statusMsg, system_progressbar1_gif);
	var XMLdata = SoapConstants.EnvelopeBodyStart + '<ApplyItem>' +
				itemNd.xml + '</ApplyItem>' + SoapConstants.EnvelopeBodyEnd;

	vaultApplet.setClientData('XMLdata', XMLdata);

	var boolRes = vaultApplet.sendFiles(vaultServerURL);
	this.clearStatusMessage(statusId);

	var resXML = vaultApplet.getResponse();
	if (!boolRes || !resXML) {
		this.AlertError(this.getResource('', 'item_methods_ex.failed_upload_file', vaultServerURL), '', '', win);
		if (!boolRes) {
			resXML += vaultApplet.getLastError();
		}
		this.AlertError(this.getResource('', 'item_methods_ex.internal_error_occured'), boolRes + '\n' + resXML, this.getResource('', 'common.client_side_err'), win);
		return null;
	}

	var soapRes = new SOAPResults(this, resXML);

	if (soapRes.getFaultCode() != 0) {//because user can has just add access and no get access
		this.AlertError(soapRes, win);
		return null;
	}

	var resDom = soapRes.results;
	if (this.hasMessage(resDom)) {// check for message
		this.refreshWindows(this.getMessageNode(resDom), resDom);
	}
	return resDom.selectSingleNode(XPath2ReturnedNd);
};

Aras.prototype.clientItemValidation = function Aras_clientItemValidation(itemTypeName, itemNd, breakOnFirstError, emptyPropertyWithDefaultValueCallback) {
	var resultErrors = [];
	var checkErrors = [];

	//general checks for the item to be saved: all required parameters should be set
	if (itemTypeName) {
		checkErrors = this.checkItemForErrors(itemNd, null, null, breakOnFirstError, emptyPropertyWithDefaultValueCallback);
		if (checkErrors.length > 0) {
			resultErrors = resultErrors.concat(checkErrors);
			if (breakOnFirstError) {
				return resultErrors;
			}
		}
	}

	//special checks for relationships and related items
	var newRelNodes = itemNd.selectNodes('Relationships/Item[@isDirty=\'1\' or @isTemp=\'1\']');
	var iter;
	for (iter = 0; iter < newRelNodes.length; iter++) {
		checkErrors = this.checkItemForErrors(newRelNodes[iter], 'source_id', null, breakOnFirstError, emptyPropertyWithDefaultValueCallback);
		if (checkErrors.length > 0) {
			resultErrors = resultErrors.concat(checkErrors);
			if (breakOnFirstError) {
				return resultErrors;
			}
		}
	}

	var newRelatedNodes = itemNd.selectNodes('Relationships/Item/related_id/Item[@isDirty=\'1\' or @isTemp=\'1\']');
	for (iter = 0; iter < newRelatedNodes.length; iter++) {
		checkErrors = this.checkItemForErrors(newRelatedNodes[iter], 'source_id', null, breakOnFirstError, emptyPropertyWithDefaultValueCallback);
		if (checkErrors.length > 0) {
			resultErrors = resultErrors.concat(checkErrors);
			if (breakOnFirstError) {
				return resultErrors;
			}
		}
	}

	return resultErrors;
};

/*-- saveItemEx
*
*   Method to save an item
*   id = the id for the item to be saved
*
*/
Aras.prototype.saveItemEx = function Aras_saveItemEx(itemNd, confirmSuccess, doVersion) {
	if (!itemNd) {
		return null;
	}
	if (confirmSuccess == undefined) {
		confirmSuccess = true;
	}
	if (doVersion == undefined) {
		doVersion = false;
	}

	var itemID = itemNd.getAttribute('id');

	var itemTypeName = itemNd.getAttribute('type');
	var oldItemTypeName;
	if (itemTypeName == 'ItemType' && !this.isTempEx(itemNd)) {
		oldItemTypeName = this.getItemTypeName(itemID);
	}

	var win = this.uiFindWindowEx2(itemNd);

	//special checks for the item of ItemType type
	if (itemTypeName == 'ItemType' && !this.checkItemType(itemNd, win)) {
		return null;
	}

	var self = this;
	var defaultFieldCheckCallback = function(itemNode, reqName, proplabel, defVal) {
		var ask = self.confirm(self.getResource('', 'item_methods_ex.field_required_default_will_be_used', proplabel, defVal));
		if (ask) {
			self.setItemProperty(itemNode, reqName, defVal);
		}
		return {result: ask, message: ''}
	};

	var validationErrors = this.clientItemValidation(itemTypeName, itemNd, true, defaultFieldCheckCallback);
	if (validationErrors.length > 0) {
		if (validationErrors[0].message) {
			this.AlertError(validationErrors[0].message, '', '', win);
		}
		return null;
	}

	var backupCopy = itemNd;
	var oldParent = backupCopy.parentNode;
	itemNd = itemNd.cloneNode(true);
	this.prepareItem4Save(itemNd);

	var isTemp = this.isTempEx(itemNd);

	if (isTemp) {
		itemNd.setAttribute('action', 'add');
		this.setItemProperty(itemNd, 'locked_by_id', this.getCurrentUserID());

		if (itemTypeName == 'RelationshipType') {
			if (!itemNd.selectSingleNode('relationship_id/Item')) {
				var rsItemNode = itemNd.selectSingleNode('relationship_id');
				if (rsItemNode) {
					var rs = this.getItemById('', rsItemNode.text, 0);
					if (rs) {
						rsItemNode.text = '';
						rsItemNode.appendChild(rs.cloneNode(true));
					}
				}
			}

			var tmp001 = itemNd.selectSingleNode('relationship_id/Item');
			if (tmp001 && this.getItemProperty(tmp001, 'name') == '') {
				this.setItemProperty(tmp001, 'name', this.getItemProperty(itemNd, 'name'));
			}
		}
	} else if (doVersion) {
		itemNd.setAttribute('action', 'version');
	} else {
		itemNd.setAttribute('action', 'update');
	}

	var tempArray = new Array();
	this.doCacheUpdate(true, itemNd, tempArray);

	var statusMsg = '';
	if (isTemp) {
		statusMsg = this.getResource('', 'item_methods_ex.adding', itemTypeName);
	} else if (doVersion) {
		statusMsg = this.getResource('', 'item_methods_ex.versioning', itemTypeName);
	} else {
		statusMsg = this.getResource('', 'item_methods_ex.updating', itemTypeName);
	}

	var res = this.applyItemWithFilesCheck(itemNd, win, statusMsg, this.XPathResult('/Item'));

	if (!res) {
		return null;
	}
	res.setAttribute('levels', '0');

	var newID = res.getAttribute('id');
	this.updateInCacheEx(backupCopy, res);
	var topWindow;

	if (win && win.isTearOff) {
		if (win.updateItemsGrid) {
			win.updateItemsGrid(res);
		}

		topWindow = opener ? this.getMostTopWindowWithAras(opener) : null;
		if (topWindow && topWindow.main != undefined) {
			if (itemTypeName == 'ItemType') {
				topWindow.main.tree.updateTree(itemID.split(';'));
			} else if (itemTypeName == 'Action') {
				topWindow.main.menu.updateGenericActions();
			} else if (itemTypeName == 'Report') {
				topWindow.main.menu.updateGenericReports(true);
			} else if (itemTypeName == 'SelfServiceReport' && topWindow.main.work.itemTypeName == 'MyReports') {
				topWindow.main.work.updateReports();
			}
		}
	} else {
		topWindow = this.getMostTopWindowWithAras(window);
		if (itemTypeName == 'ItemType') {
			topWindow.main.tree.updateTree(itemID.split(';'));
		} else if (itemTypeName == 'Action') {
			topWindow.main.menu.updateGenericActions();
		} else if (itemTypeName == 'Report') {
			topWindow.main.menu.updateGenericReports(true);
		}
	}

	if (itemTypeName == 'RelationshipType') {
		var relationship_id = this.getItemProperty(itemNd, 'relationship_id');
		if (relationship_id) {
			this.removeFromCache(relationship_id);
		}

	} else if (itemTypeName == 'ItemType') {
		var item_name = (oldItemTypeName) ? oldItemTypeName : this.getItemProperty(itemNd, 'name');
		this.deletePropertyFromObject(this.sGridsSetups, item_name);
	}

	if (oldParent) {
		var tmpRes = oldParent.selectSingleNode('Item[@id="' + newID + '"]');
		if (tmpRes == null && newID != itemID && oldParent.selectSingleNode('Item[@id="' + itemID + '"]') != null) {
			//possible when related item is versionable and relationship behavior is fixed
			//when relationship still points to previous generation.
			tmpRes = this.getFromCache(newID);
			this.updateInCacheEx(tmpRes, res);
			res = this.getFromCache(newID);
		} else {
			res = tmpRes;
		}
	} else {
		res = this.getFromCache(newID);
	}

	if (!res) {
		return null;
	}

	this.doCacheUpdate(false, itemNd, tempArray);

	ClearDependenciesInMetadataCache(this, itemNd);
	if (confirmSuccess) {
		var keyed_name = this.getKeyedNameEx(res);
		if (keyed_name && '' != keyed_name) {
			this.AlertSuccess(this.getResource('', 'item_methods_ex.item_saved_successfully', '\'' + keyed_name + '\' '), win);
		} else {
			this.AlertSuccess(this.getResource('', 'item_methods_ex.item_saved_successfully', ''), win);
		}
	}
	var params = this.newObject();
	params.itemID = itemID;
	params.itemNd = res;
	this.fireEvent('ItemSave', params);

	return res;
};

Aras.prototype.doCacheUpdate = function Aras_doCacheUpdate(prepare, itemNd, tempArray) {
	var nodes;
	if (prepare) {
		nodes = itemNd.selectNodes('descendant-or-self::Item[@id and (@action="add" or @action="create")]');
		for (var i = 0; i < nodes.length; i++) {
			tempArray.push(new Array(nodes[i].getAttribute('id'), nodes[i].getAttribute('type')));
		}

	} else {
		for (var i = 0; i < tempArray.length; i++) {
			nodes = this.itemsCache.getItemsByXPath('/Innovator/Items//Item[@id="' + tempArray[i][0] + '" and (@action="add" or @action="create")]');
			for (var o = 0; o < nodes.length; o++) {
				nodes[o].setAttribute('action', 'skip');
				nodes[o].removeAttribute('isTemp');
				nodes[o].removeAttribute('isDirty');
			}
			if (i == 0) {
				continue;
			}
			var itemID = tempArray[i][0];
		}
	}
};

Aras.prototype.setFileNameInVaultWithPathCheck = function Aras_setFileNameInVaultWithPathCheck(downloadDir, filename, doAlert) {
	if (!downloadDir || !filename) {
		return null;
	}
	if (downloadDir.length + filename.length > 260 - 2) {
		if (doAlert || doAlert === undefined) {
			this.AlertError(this.getResource('', 'item_methods_ex.file_path_length_is_greater_than_260_wrnng'));
		}
		return null;
	}
	var vault = this.vault;
	if (!vault) {
		return null;
	}
	return vault.setFileName(filename);
};

Aras.prototype.downloadPhysicalFileAs = function Aras_downloadPhysicalFileAs(fileNode, downloadPath, parentWindow, skipExistsCheck, callback) {
	var fileUrl = this.getFileURLEx(fileNode);

	if (fileUrl) {
		var vault = this.vault,
			fileName = Path.getFileName(downloadPath) || this.getItemProperty(fileNode, 'filename'),
			downloadDir = Path.getDirectoryName(downloadPath) || vault.getWorkingDir(),
			downloadResult;

		vault.clearClientData();
		vault.clearFileList();
		vault.setClientData('SOAPACTION', 'GetFile');
		vault.setClientData('DATABASE', this.getDatabase());
		vault.setClientData('AUTHUSER', this.getLoginName());
		vault.setClientData('AUTHPASSWORD', this.getPassword());

		vault.setWorkingDir(downloadDir);

		if (!skipExistsCheck) {
			var tmpRes = this.setFileNameInVaultWithPathCheck(downloadDir, fileName);
			if (tmpRes) {
				var param = {
					buttons: {
						btnYes: this.getResource('', 'common.yes'),
						btnNo: this.getResource('', 'common.no')
					},
					defaultButton: 'btnNo',
					message: this.getResource('', 'item_methods_ex.file_already_exists', downloadPath),
					aras: this,
					dialogWidth: 350,
					dialogHeight: 150,
					content: 'groupChgsDialog.html'
				};
				var win = this.getMostTopWindowWithAras(window);
				(win.main || win).ArasModules.Dialog.show('iframe', param).promise.then(
					function(res) {
						if (res && res !== 'btnNo') {
							vault.setLocalFileName(fileName);
							var downloadResult = vault.downloadFile(fileUrl);
							if (!downloadResult) {
								this.AlertError(this.getResource('', 'item_methods_ex.failed_download_file_into_path', fileName, downloadDir), '', '', parentWindow);
								return false;
							}
							callback(downloadResult);
						}
					}
				);
				return;
			} else if (tmpRes === null) {
				return false;
			}
		}

		vault.setLocalFileName(fileName);
		downloadResult = vault.downloadFile(fileUrl);

		if (!downloadResult) {
			this.AlertError(this.getResource('', 'item_methods_ex.failed_download_file_into_path', fileName, downloadDir), '', '', parentWindow);
			return false;
		}

		return downloadResult;
	} else {
		this.AlertError(this.getResource('', 'item_methods_ex.failed_download_file_url_empty'));
		return false;
	}
};

Aras.prototype.downloadPhysicalFileTo = function Aras_downloadPhysicalFileTo(fileNd, downloadDir, win) {
	var filename = this.getItemProperty(fileNd, 'filename'),
		vault = this.vault,
		fileURL = this.getFileURLEx(fileNd);

	if (fileURL == '') {
		this.AlertError(this.getResource('', 'item_methods_ex.failed_download_file_url_empty'));
		return false;
	}

	vault.clearClientData();
	vault.clearFileList();

	vault.setClientData('SOAPACTION', 'GetFile');
	vault.setClientData('DATABASE', this.getDatabase());
	vault.setClientData('AUTHUSER', this.getLoginName());
	vault.setClientData('AUTHPASSWORD', this.getPassword());

	vault.setWorkingDir(downloadDir);
	vault.setLocalFileName(filename);

	var res = vault.downloadFile(fileURL);
	if (!res) {
		this.AlertError(this.getResource('', 'item_methods_ex.failed_download_file_into_path', filename, downloadDir), '', '', win);
		return false;
	}

	return res;
};

Aras.prototype.downloadPhysicalFile = function Aras_downloadPhysicalFile(fileNd, downloadDir, win, callback) {
	/* this method is for internal use *** only *** */

	var filename = this.getItemProperty(fileNd, 'filename');
	var filePath = Path.combinePath(downloadDir, filename);
	var vault = this.vault;

	//check if file with such name already exist in directory <downloadDir>
	vault.setWorkingDir(downloadDir);
	var tmpRes = this.setFileNameInVaultWithPathCheck(downloadDir, filename);
	if (tmpRes) {
		var param = {
			buttons: {
				btnYes: this.getResource('', 'common.yes'),
				btnNo: this.getResource('', 'common.no')
			},
			defaultButton: 'btnNo',
			message: this.getResource('', 'item_methods_ex.file_already_exists', filePath),
			aras: this,
			dialogWidth: 350,
			dialogHeight: 150,
			center: true,
			content: 'groupChgsDialog.html'
		};

		win.ArasModules.Dialog.show('iframe',param).promise.then(
			function(res) {
				if (res === 'btnYes') {
					callback(this.downloadPhysicalFileTo(fileNd, downloadDir, win));
				}
			}.bind(this)
		);

	} else if (tmpRes === null) {
		return false;
	} else {
		callback(this.downloadPhysicalFileTo(fileNd, downloadDir, win));
	}
};

// === lockItemEx ====
// Method to lock the item passing the item object
// itemNode = the item
// ===================
Aras.prototype.lockItemEx = function Aras_lockItemEx(itemNode) {
	var ownerWindow = this.uiFindWindowEx2(itemNode),
		itemID = itemNode.getAttribute('id'),
		itemTypeName = itemNode.getAttribute('type'),
		itemType = this.getItemTypeDictionary(itemTypeName),
		isRelationship = this.getItemProperty(itemType.node, 'is_relationship'),
		isPolyItem = this.isPolymorphic(itemType.node);

	if (isRelationship == '1' && this.isDirtyEx(itemNode)) {
		var sourceNd = itemNode.selectSingleNode('../..');

		if (sourceNd && this.isDirtyEx(sourceNd)) {
			var itLabel = this.getItemProperty(itemType.node, 'label') || this.getItemProperty(itemType.node, 'name'),
				param = {
					aras: this,
					buttons: {btnOK: this.getResource('', 'common.ok'), btnCancel: this.getResource('', 'common.cancel')},
					defaultButton: 'btnCancel',
					message: this.getResource('', 'item_methods_ex.locking_it_lose_changes', itLabel)
				},
				options = {dialogWidth: 300, dialogHeight: 150, center: true},
				result;
			if (window.showModalDialog) {
				result = this.modalDialogHelper.show('DefaultModal', ownerWindow, param, options, 'groupChgsDialog.html');
			} else {
				result = window.confirm(param.message) ? 'btnYes' : 'btnCancel';
			}

			if (result == 'btnCancel') {
				return null;
			}
		}
	}

	var statusId = this.showStatusMessage('status', this.getResource('', 'common.locking_item_type', itemTypeName), system_progressbar1_gif),
		bodyStr = '<Item type=\'' + (!isPolyItem ? itemTypeName : this.getItemTypeName(this.getItemProperty(itemNode, 'itemtype'))) + '\' id=\'' + itemID + '\' action=\'lock\' />',
		requestResult = this.soapSend('ApplyItem', bodyStr),
		returnedItem;

	this.clearStatusMessage(statusId);

	if (requestResult.getFaultCode() != 0) {
		this.AlertError(requestResult, ownerWindow);
		return null;
	}

	returnedItem = requestResult.results.selectSingleNode(this.XPathResult('/Item'));
	if (returnedItem) {
		var oldParent = itemNode.parentNode;

		returnedItem.setAttribute('loadedPartialy', '0');
		this.updateInCacheEx(itemNode, returnedItem);

		if (oldParent) {
			itemNode = oldParent.selectSingleNode('Item[@id="' + itemID + '"]') || oldParent.selectSingleNode('Item');
		} else {
			itemNode = this.getFromCache(itemID);
		}

		this.fireEvent('ItemLock', {itemID: itemNode.getAttribute('id'), itemNd: itemNode, newLockedValue: this.isLocked(itemNode)});
		return itemNode;
	} else {
		this.AlertError(getResource('', 'item_methods_ex.failed_get_item_type_from_sever', itemTypeName), '', '', ownerWindow);
		return null;
	}
};

// === unlockItemEx ====
// Method to unlock the item passing the item object
// itemNode = the item
// =====================
Aras.prototype.unlockItemEx = function Aras_unlockItemEx(itemNode, saveChanges) {
	var itemTypeName = itemNode.getAttribute('type'),
		ownerWindow = this.uiFindWindowEx2(itemNode);

	if (this.isTempEx(itemNode)) {
		this.AlertError(this.getResource('', 'item_methods_ex.failed_unlock_item_type', itemTypeName), '', '', ownerWindow);
		return null;
	}

	var itemType = this.getItemTypeDictionary(itemTypeName),
		isPolyItem = (itemType && itemType.node) ? this.isPolymorphic(itemType.node) : false;

	if (saveChanges === undefined) {
		var isDirty = this.isDirtyEx(itemNode);

		if (isDirty) {
			var options = {dialogWidth: 400, dialogHeight: 200, center: true},
				params = {
					aras: this,
					message: this.getResource('', 'item_methods_ex.unlocking_discard_your_changes', itemTypeName, this.getKeyedNameEx(itemNode)),
					buttons: {
						btnYes: this.getResource('', 'common.yes'),
						btnSaveAndUnlock: this.getResource('', 'item_methods_ex.save_first'),
						btnCancel: this.getResource('', 'common.cancel')
					},
					defaultButton: 'btnCancel'
				},
				returnedValue;

			if (window.showModalDialog) {
				returnedValue = this.modalDialogHelper.show('DefaultModal', ownerWindow, params, options, 'groupChgsDialog.html');
			} else {
				returnedValue = 'btnCancel';
				if (window.confirm(this.getResource('', 'item_methods_ex.save_your_changes', itemTypeName, this.getKeyedNameEx(itemNode)))) {
					returnedValue = 'btnSaveAndUnlock';
				} else if (window.confirm(this.getResource('', 'item_methods_ex.unlocking_discard_your_changes', itemTypeName, this.getKeyedNameEx(itemNode)))) {
					returnedValue = 'btnYes';
				}
			}

			if (returnedValue == 'btnCancel') {
				return null;
			} else {
				saveChanges = (returnedValue != 'btnYes');
			}
		}
	}

	if (saveChanges) {
		itemNode = this.saveItemEx(itemNode);

		if (!itemNode) {
			return null;
		}
	}

	var statusId = this.showStatusMessage('status', this.getResource('', 'item_methods_ex.unlocking_itemtype', itemTypeName), system_progressbar1_gif),
		itemId = itemNode.getAttribute('id'),
		lockedById = itemNode.selectSingleNode('locked_by_id'),
		queryResult;

	if (!lockedById) {
		queryResult = this.soapSend('ApplyItem', '<Item type=\'' + itemTypeName + '\' id=\'' + itemId + '\' action=\'get\' />');
	} else {
		queryResult = this.soapSend('ApplyItem', '<Item type=\'' + (!isPolyItem ? itemTypeName : this.getItemTypeName(this.getItemProperty(itemNode, 'itemtype'))) + '\' id=\'' + itemId + '\' action=\'unlock\' />', '', saveChanges);
	}
	this.clearStatusMessage(statusId);

	if (!queryResult.getFaultCode()) {
		var resultItem = queryResult.results.selectSingleNode(this.XPathResult('/Item')),
			newResult;

		if (resultItem) {
			resultItem.setAttribute('loadedPartialy', '0');

			var oldParent = itemNode.parentNode;
			this.updateInCacheEx(itemNode, resultItem);
			this.updateFilesInCache(resultItem);

			newResult = oldParent ? oldParent.selectSingleNode('Item[@id="' + itemId + '"]') : this.getFromCache(itemId);
			resultItem = newResult || resultItem;

			this.fireEvent('ItemLock', {itemID: resultItem.getAttribute('id'), itemNd: resultItem, newLockedValue: this.isLocked(resultItem)});
			return resultItem;
		} else {
			this.AlertError(this.getResource('', 'item_methods_ex.failed_get_item_type_from_server', itemTypeName), '', '', ownerWindow);
			return null;
		}
	} else {
		this.AlertError(queryResult, ownerWindow);
		return null;
	}
};

Aras.prototype.updateFilesInCache = function Aras_updateFilesInCache(itemNd) {
	var itemTypeName = itemNd.getAttribute('type'),
		isDiscoverOnly = itemNd.getAttribute('discover_only') == '1';

	if (itemTypeName != 'File' && !isDiscoverOnly) {
		var itemType = this.getItemTypeForClient(itemTypeName).node,
			fileProperties = this.getPropertiesOfTypeFile(itemType),
			propertyName, fileId, fileNode,
			queryItem, queryResult, i;

		for (i = 0; i < fileProperties.length; i++) {
			propertyName = this.getItemProperty(fileProperties[i], 'name');
			fileId = this.getItemProperty(itemNd, propertyName);

			if (fileId) {
				this.removeFromCache(fileId);

				queryItem = new this.getMostTopWindowWithAras(window).Item();
				queryItem.setType('File');
				queryItem.setAction('get');
				queryItem.setID(fileId);
				queryItem.setAttribute('select', 'filename,file_size,file_type,checkedout_path,comments,checksum,label,mimetype');
				queryResult = queryItem.apply();

				if (queryResult.isEmpty()) {
					continue;
				} else {
					if (!queryResult.isError()) {
						fileNode = queryResult.getItemByIndex(0).node;
						this.updateInCache(fileNode);
					} else {
						this.AlertError(queryResult);
						return;
					}
				}
			}
		}
	}
};

Aras.prototype.purgeItemEx = function Aras_purgeItemEx(itemNd, silentMode) {
	/*-- purgeItem
	*
	*   Method to delete the latest version of the item (or the item if it's not versionable)
	*   itemNd -
	*   silentMode - flag to know if user confirmation is NOT needed
	*
	*/
	return this.PurgeAndDeleteItem_CommonPartEx(itemNd, silentMode, 'purge');
};

Aras.prototype.deleteItemEx = function Aras_deleteItemEx(itemNd, silentMode) {
	/*-- deleteItem
	*
	*   Method to delete all versions of the item
	*   itemNd -
	*   silentMode - flag to know if user confirmation is NOT needed
	*
	*/
	return this.PurgeAndDeleteItem_CommonPartEx(itemNd, silentMode, 'delete');
};

Aras.prototype.PurgeAndDeleteItem_CommonPartEx = function Aras_PurgeAndDeleteItem_CommonPartEx(itemNd, silentMode, purgeORdelete) {
	/*-- PurgeAndDeleteItem_CommonPartEx
	*
	*   This method is for ***internal purposes only***.
	*
	*/

	if (silentMode === undefined) {
		silentMode = false;
	}

	var ItemId = itemNd.getAttribute('id');
	var ItemTypeName = itemNd.getAttribute('type');

	//prepare
	if (!silentMode && !this.Confirm_PurgeAndDeleteItem(ItemId, this.getKeyedNameEx(itemNd), purgeORdelete)) {
		return false;
	}

	var DeletedItemTypeName;
	var relationship_id;
	if (!this.isTempEx(itemNd)) {
		//save some information
		if (ItemTypeName == 'ItemType') {
			if (this.getItemProperty(itemNd, 'is_relationship') == '1') {
				relationship_id = ItemId;
			}
			DeletedItemTypeName = this.getItemProperty(itemNd, 'name');

		} else if (ItemTypeName == 'RelationshipType') {
			relationship_id = this.getItemProperty(itemNd, 'relationship_id');
			DeletedItemTypeName = this.getItemProperty(itemNd, 'name');
		}

		//delete
		if (!this.SendSoap_PurgeAndDeleteItem(ItemTypeName, ItemId, purgeORdelete)) {
			return false;
		}
	}

	itemNd.setAttribute('action', 'skip');

	//remove node from parent
	var tmpNd = itemNd.parentNode;
	if (tmpNd) {
		tmpNd.removeChild(itemNd);
	}

	//delete all dependent stuff
	this.RemoveGarbage_PurgeAndDeleteItem(ItemTypeName, ItemId, DeletedItemTypeName, relationship_id);
	this.MetadataCache.RemoveItemById(ItemId);

	return true;
};

Aras.prototype.getKeyedNameEx = function Aras_getKeyedNameEx(itemNd) {
	/*----------------------------------------
	* getKeyedNameEx
	*
	* Purpose: build and return keyed name of an Item.
	*
	* Arguments:
	* itemNd - xml node of Item to get keyed name of.
	*/

	with (this) {
		var res = '';
		if (itemNd.nodeName != 'Item') {
			return res;
		}

		if ((!isDirtyEx(itemNd)) && (!isTempEx(itemNd))) {
			res = itemNd.getAttribute('keyed_name');
			if (res) {
				return res;
			}
			res = this.getItemProperty(itemNd, 'keyed_name');
			if (res != '') {
				return res;
			}
		}

		var itemTypeName = itemNd.getAttribute('type');
		res = itemNd.getAttribute('id');

		var itemType = getItemTypeDictionary(itemTypeName);
		if (!itemType) {
			return res;
		}

		var relationshipItems = itemType.node.selectNodes('Relationships/Item[@type="Property"]');
		var tmpArr = new Array(); //pairs keyOrder -> propValue
		var counter = 0;
		for (var i = 0; i < relationshipItems.length; i++) {
			var propNd = relationshipItems[i];
			var propName = getItemProperty(propNd, 'name');
			if (propName == '') {
				continue;
			}

			var keyOrder = getItemProperty(propNd, 'keyed_name_order');
			if (keyOrder == '') {
				continue;
			}

			var node = itemNd.selectSingleNode(propName);
			if (!node || node.childNodes.length != 1) {
				continue;
			}

			var txt = '';
			if (node.firstChild.nodeType == 1) {//if nested Item
				txt = getKeyedNameEx(node.firstChild);
			} else {
				txt = node.text;
			}

			if (txt != '') {
				tmpArr[counter] = new Array(keyOrder, txt);
				counter++;
			}
		}

		if (tmpArr.length > 0) {
			tmpArr = tmpArr.sort(keyedNameSorter);
			res = tmpArr[0][1];
			for (var i = 1; i < tmpArr.length; i++) {
				res += ' ' + tmpArr[i][1];
			}
		}

		return res;
	} //with this
};

Aras.prototype.getKeyedNameAttribute = function(node, element) {
	if (!node) {
		return;
	}
	var value;
	var tmpNd = node.selectSingleNode(element);
	if (tmpNd) {
		value = tmpNd.getAttribute('keyed_name');
		if (!value) {
			value = '';
		}
	} else {
		value = '';
	}
	return value;
};

function keyedNameSorter(a, b) {
	var s1 = parseInt(a[0]);
	if (isNaN(s1)) {
		return 1;
	}
	var s2 = parseInt(b[0]);
	if (isNaN(s2)) {
		return -1;
	}

	if (s1 < s2) {
		return -1;
	} else if (s1 == s2) {
		return 0;
	} else {
		return 1;
	}
}

/*-- getItemRelationshipsEx
*
*   Method to
*
*
*/
Aras.prototype.getItemRelationshipsEx = function(itemNd, relsName, pageSize, page, body, forceReplaceByItemFromServer) {
	if (!(itemNd && relsName)) {
		return null;
	}
	if (pageSize == undefined) {
		pageSize = '';
	}
	if (page == undefined) {
		page = '';
	}
	if (body == undefined) {
		body = '';
	}
	if (forceReplaceByItemFromServer == undefined) {
		forceReplaceByItemFromServer = false;
	}

	var itemID = itemNd.getAttribute('id');
	var itemTypeName = itemNd.getAttribute('type');
	var res = null;
	with (this) {
		if (!forceReplaceByItemFromServer && (pageSize == -1 || isTempID(itemID) || (itemNd.getAttribute('levels') && parseInt(itemNd.getAttribute('levels')) > 0))) {
			if (!isNaN(parseInt(pageSize)) && parseInt(pageSize) > 0 && !isNaN(parseInt(page)) && parseInt(page) > -1) {
				res = itemNd.selectNodes('Relationships/Item[@type="' + relsName + '" and @page="' + page + '"]');
				if (res && res.length == pageSize) {
					return res;
				}
			} else {
				res = itemNd.selectNodes('Relationships/Item[@type="' + relsName + '"]');
				if (res && res.length > 0) {
					return res;
				}
			}
		}

		var bodyStr = '<Item type="' + itemTypeName + '" id="' + itemID + '" relName="' + relsName + '" action="getItemRelationships"';
		if (pageSize) {
			bodyStr += ' pageSize="' + pageSize + '"';
		}
		if (page) {
			bodyStr += ' page="' + page + '"';
		}
		if (body == '') {
			bodyStr += '/>';
		} else {
			bodyStr += '>' + body + '</Item>';
		}

		var res = soapSend('ApplyItem', bodyStr);

		if (res.getFaultCode() != 0) {
			this.AlertError(res);
			return null;
		}

		if (!itemNd.selectSingleNode('Relationships')) {
			createXmlElement('Relationships', itemNd);
		}

		var rels = res.results.selectNodes(XPathResult('/Item[@type="' + relsName + '"]'));
		var itemRels = itemNd.selectSingleNode('Relationships');
		var idsStr = '';
		for (var i = 0; i < rels.length; i++) {
			var rel = rels[i].cloneNode(true);
			var relId = rel.getAttribute('id');
			if (i > 0) {
				idsStr += ' or ';
			}
			idsStr += '@id="' + relId + '"';
			var prevRel = itemRels.selectSingleNode('Item[@type="' + relsName + '" and @id="' + relId + '"]');
			if (prevRel) {
				if (forceReplaceByItemFromServer == true) {
					// By some reason the previous implementation did not replaced existing on the node
					// relationships with the new relationships obtained from the server but rather
					// just removed some attributes on them (like "pagesize", etc.). From other side those
					// relationships that don't exist on the 'itemNd' are added to it. This is wrong as
					// the newly obtained relationships even if they already exist on 'itemNd' might have
					// some properties that are different in db from what is in the client memory.
					// NOTE: the fix will break the case when the client changes some relationship properties
					//       in memory and then calls this method expecting that these properties will stay unchanged,
					//       but: a) this method seems to be called only from getFileURLEx(..); b) if the above
					//       behavior is expected then another method is probably required which must be called
					//       something like 'mergeRelationships'.
					// by Andrey Knourenko
					itemRels.removeChild(prevRel);
				} else {
					this.mergeItem(prevRel, rel);
					continue;
				}
			}
			itemRels.appendChild(rel);
		}
		itemNd.setAttribute('levels', '0');
		if (idsStr == '') {
			return null;
		}
		res = itemRels.selectNodes('Item[@type="' + relsName + '" and (' + idsStr + ')]');
	} //with (this)

	return res;
};

/*-- getItemLastVersionEx
*
*   Method to load the latest version for the item
*   itemTypeName = the ItemType name
*   itemId       = the id for the item
*
*/
Aras.prototype.getItemLastVersionEx = function(itemNd) {
	with (this) {
		var res = soapSend('ApplyItem', '<Item type="' + itemNd.getAttribute('type') + '" id="' + itemNd.getAttribute('id') + '" action="getItemLastVersion" />');

		if (res.getFaultCode() != 0) {
			return null;
		}

		res = res.results.selectSingleNode(XPathResult('/Item'));
		if (!res) {
			return null;
		}

		itemNd.parentNode.replaceChild(res, itemNd);

		return res;
	}
}; //getItemLastVersionEx

Aras.prototype.checkinFile = function Aras_checkinFile(fileNd, win) {
	/*
	this method is for internal use *** only ***
	*/
	if (this.isTempEx(fileNd)) {
		return null;
	}
	if (!this.isLockedByUser(fileNd)) {
		return null;
	}

	fileNd.setAttribute('action', 'update');
	fileNd.setAttribute('version', '0');

	var updatedFile = this.sendFilesWithVaultApplet(fileNd, this.getResource('', 'item_methods_ex.checking_file_in'));
	if (!updatedFile) {
		return null;
	}

	var oldParent = fileNd.parentNode;
	this.updateInCacheEx(fileNd, updatedFile);

	if (oldParent) {
		updatedFile = oldParent.selectSingleNode('Item[@id="' + updatedFile.getAttribute('id') + '"]');
		oldParent.setAttribute('keyed_name', this.getItemProperty(updatedFile, 'keyed_name'));
	} else {
		updatedFile = this.getFromCache(updatedFile.getAttribute('id'));
	}

	return updatedFile;
};

Aras.prototype.checkoutFiles = function Aras_checkoutFiles(itemNd, checkedout_path) {
	/*
	this method is for internal use *** only ***
	*/
	if (!itemNd) {
		return false;
	}

	var success = true;
	var win = this.uiFindWindowEx2(itemNd);

	var itemTypeName = itemNd.getAttribute('type');
	if (itemTypeName == 'File') {
		return; // do not check Files to prevent recursion
	}
	var itemType = this.getItemTypeForClient(itemTypeName).node;
	var fileProps = this.getPropertiesOfTypeFile(itemType);
	var vault = this.vault;

	for (var i = 0; i < fileProps.length; i++) {
		var propNm = this.getItemProperty(fileProps[i], 'name');
		var fileNode = itemNd.selectSingleNode(propNm);
		if (!fileNode) {
			continue;
		}

		var fileNd = itemNd.selectSingleNode(propNm + '/Item');
		if (!fileNd) {
			var fileID = this.getItemProperty(itemNd, propNm);
			if (!fileID) {
				continue;
			}

			fileNd = this.getItemById('File', fileID, 0);
			if (!fileNd) {
				success = false;
				continue;
			}
		}

		if (this.isLockedByUser(fileNd)) {
			var res = this.downloadPhysicalFile(fileNd, checkedout_path, win);
			if (!res) {
				success = false;
				continue;
			}

		} else if (!this.lockItemEx(fileNd, checkedout_path)) {
			success = false;
			continue;
		}
	}

	return success; //because of issue IR-004174
};

Aras.prototype.downloadItemFiles = function Aras_downloadItemFiles(itemNd, localPath) {
	/*
	this method is for internal use *** only ***
	*/
	if (!itemNd) {
		return false;
	}

	var itemTypeName = itemNd.getAttribute('type');
	var itemType = this.getItemTypeForClient(itemTypeName).node;
	var fileProps = this.getPropertiesOfTypeFile(itemType);

	for (var i = 0; i < fileProps.length; i++) {
		var propNm = this.getItemProperty(fileProps[i], 'name');
		var fileNd = itemNd.selectSingleNode(propNm + '/Item');
		if (!fileNd) {
			var fileID = this.getItemProperty(itemNd, propNm);
			if (!fileID) {
				continue;
			}

			fileNd = this.getItemFromServer('File', fileID, 'filename').node;
		}

		if (!fileNd) {
			continue;
		}

		var res = this.downloadPhysicalFile(fileNd, localPath, window);

		if (!res) {
			continue;
		}
	}

	return true;
};

Aras.prototype.undoCheckOut = function Aras_undoCheckOut(itemNd) {
	/*
	this method is for internal use *** only ***
	*/
	if (!itemNd) {
		return false;
	}

	var itemTypeName = itemNd.getAttribute('type');
	var itemType = this.getItemTypeForClient(itemTypeName).node;
	var fileProps = this.getPropertiesOfTypeFile(itemType);

	var res;
	for (var i = 0; i < fileProps.length; i++) {
		var propNm = this.getItemProperty(fileProps[i], 'name');
		var fileNd = itemNd.selectSingleNode(propNm + '/Item');
		if (fileNd) {
			if (!this.isLockedByUser(fileNd)) {
				continue;
			}
			res = this.unlockItemEx(fileNd, false);
		} else {
			var fileID = this.getItemProperty(itemNd, propNm);
			if (!fileID) {
				continue;
			}

			fileNd = this.getItemById('File', fileID, 0);
			if (!fileNd || !this.isLockedByUser(fileNd)) {
				continue;
			}
			res = this.unlockItemEx(fileNd, false);
		}
	}

	if (itemTypeName == 'File') {
		return res; //to fix "undo checkout" for related item if related item is File
	}
};

Aras.prototype.promoteEx = function Aras_promoteEx(itemNd, stateName, comments, soapController) {
	if (!itemNd) {
		return null;
	}

	var itemID = itemNd.getAttribute('id');
	var itemTypeName = itemNd.getAttribute('type');

	var promoteParams = {
		typeName: itemTypeName,
		id: itemID,
		stateName: stateName,
		comments: comments
	};

	var res = this.promoteItem_implementation(promoteParams, soapController);
	if (!res) {
		return null;
	}

	var oldParent = itemNd.parentNode;
	this.updateInCacheEx(itemNd, res);

	if (oldParent) {
		res = oldParent.selectSingleNode('Item[@id="' + itemID + '"]');
	} else {
		res = this.getFromCache(itemID);
	}

	var params = this.newObject();
	params.itemID = res.getAttribute('id');
	params.itemNd = res;
	this.fireEvent('ItemSave', params);

	return res;
};

Aras.prototype.getFileURLEx = function Aras_getFileURLEx(itemNd) {
	/*
	* Private method that returns 'Located' pointing to the vault in which the
	* specified file resides. The vault is selected by the following algorithm:
	*   - if file is not stale in the default vault of the current user then return this vault
	*   - else return the first vault in which the file is not stale
	* NOTE: file is called 'not stale' in vault if 'Located' referencing the vault has
	*       the maximum value of property 'file_version' among other 'Located' of the same file.
	*/
	function getLocatedForFile(aras, itemNd) {
		var fitem = aras.newIOMItem();
		fitem.loadAML(itemNd.xml);
		var all_located = fitem.getRelationships('Located');

		// First find the max 'file_version' among all 'Located' rels
		var maxv = 0;
		var lcount = all_located.getItemCount();
		for (var i = 0; i < lcount; i++) {
			var located = all_located.getItemByIndex(i);
			var file_version = located.getProperty('file_version') * 1;
			if (file_version > maxv) {
				maxv = file_version;
			}
		}

		var sorted_located = getSortedLocatedList(aras, fitem, all_located);

		// Now go through the sorted list and return first non-stale vault
		for (var i = 0; i < sorted_located.length; i++) {
			var located = sorted_located[i];
			var file_version = located.getProperty('file_version') * 1;
			if (file_version == maxv) {
				return located.node;
			}
		}

		// It should never reach this point as at least one of vaults has non-stale file.
		return null;
	}

	// Build a list of 'Located' sorted by the priorities of vaults that they reference.
	// Sorting is done based on the 'ReadPriority' relationships of the current user + the
	// default vault of the user + remaining vaults.
	function getSortedLocatedList(aras, fitem, all_located) {
		var lcount = all_located.getItemCount();

		var sorted_located = new Array();

		// Get all required information (default vault; etc.) for the current user
		var aml = '<Item type=\'User\' action=\'get\' select=\'default_vault\' expand=\'1\'>' +
				'  <id>' + aras.getUserID() + '</id>' +
				'  <Relationships>' +
				'    <Item type=\'ReadPriority\' action=\'get\' select=\'priority, related_id\' expand=\'1\' orderBy=\'priority\'/>' +
				'  </Relationships>' +
				'</Item>';

		var ureq = aras.newIOMItem();
		ureq.loadAML(aml);
		var uresult = ureq.apply();
		if (uresult.isError()) {
			throw new Error(1, uresult.getErrorString());
		}

		// Note that because the above AML has 'orderBy' the 'all_rps' collection is sorted
		// by ReadPriority.priority.
		var all_rps = uresult.getRelationships('ReadPriority');
		var rpcount = all_rps.getItemCount();
		for (var i = 0; i < rpcount; i++) {
			var vault = all_rps.getItemByIndex(i).getRelatedItem();
			// If the file is in the vault from the "ReadPriority" then add 'Located' that references
			// the vault to the sorted list.
			for (var l = 0; l < lcount; l++) {
				var located = all_located.getItemByIndex(l);
				if (vault.getID() == located.getRelatedItem().getID()) {
					sorted_located[sorted_located.length] = located;
					break;
				}
			}
		}

		// Now append the 'Located' to the default vault to the list if it's not there yet
		// (providing that the file is in the default vault).
		var dvfound = false;
		var default_vault = uresult.getPropertyItem('default_vault');
		for (var i = 0; i < sorted_located.length; i++) {
			if (sorted_located[i].getRelatedItem().getID() == default_vault.getID()) {
				dvfound = true;
				break;
			}
		}
		if (!dvfound) {
			for (var i = 0; i < lcount; i++) {
				var located = all_located.getItemByIndex(i);
				if (default_vault.getID() == located.getRelatedItem().getID()) {
					sorted_located[sorted_located.length] = located;
					break;
				}
			}
		}

		// Finally append 'Located' to all remaining vaults that the file resides in but that are
		// not in the sorted list yet.
		for (var i = 0; i < lcount; i++) {
			var located = all_located.getItemByIndex(i);
			var vfound = false;
			for (var l = 0; l < sorted_located.length; l++) {
				if (sorted_located[l].getID() == located.getID()) {
					vfound = true;
					break;
				}
			}
			if (!vfound) {
				sorted_located[sorted_located.length] = located;
			}
		}

		return sorted_located;
	}

	/*----------------------------------------
	* getFileURLEx
	*
	* Purpose:
	* get file URL using the following algorithm:
	*   - take the default vault of the current user unless the file does not exist or stale in the vault
	*   - otherwise take the first vault in which the file is not stale
	*
	* Arguments:
	* itemNd - xml node of the File to be downloaded
	*
	*/
	this.getItemRelationshipsEx(itemNd, 'Located', undefined, undefined, undefined, true);
	var locatedNd = getLocatedForFile(this, itemNd);

	if (locatedNd == null) {
		this.AlertError(this.getResource('', 'item_methods_ex.failed_get_file_vault_could_not_be_located'));
		return '';
	}

	var vaultNode = locatedNd.selectSingleNode('related_id/Item[@type="Vault"]');
	var vault_id = '';
	if (!vaultNode) {
		vault_id = locatedNd.selectSingleNode('related_id').text;
		vaultNode = this.getItemById('Vault', vault_id, 0);
	} else {
		vault_id = vaultNode.getAttribute('id');
	}

	var vaultServerURL = vaultNode.selectSingleNode('vault_url').text;
	if (vaultServerURL == '') {
		return '';
	}

	vaultServerURL = this.TransformVaultServerURL(vaultServerURL);

	var fileID = itemNd.getAttribute('id');
	var fileName = this.getItemProperty(itemNd, 'filename');
	var fileURL = vaultServerURL +
		'?dbName=' + encodeURIComponent(this.getDatabase()) +
		'&fileID=' + encodeURIComponent(fileID) +
		'&fileName=' + encodeURIComponent(fileName) +
		'&vaultId=' + vault_id;
	return fileURL;
};

Aras.prototype.replacePolyItemNodeWithNativeItem = function Aras_replacePolyItemNodeWithNativeItem(ritem) {
	if (!(ritem && ritem.parentNode)) {
		this.AlertError('Item is null or doesn\'t have parent item.');
		return ritem;
	}
	var typeId = ritem.getAttribute('typeId');
	var relatedItemType = this.getItemTypeForClient(typeId, 'id').node;
	if (!relatedItemType) {
		this.AlertError('Can\'t get type of related item.');
		return ritem;
	}

	if (this.isPolymorphic(relatedItemType)) {
		var nativeRelatedITID = this.getItemProperty(ritem, 'itemtype');
		var relatedItemNd = this.getItemTypeForClient(nativeRelatedITID, 'id').node;
		if (!relatedItemNd) {
			this.AlertError('Can\'t get native item type of polymorphic item.');
			return ritem;
		}
		var nativeRelated = this.getItemFromServer(this.getItemProperty(relatedItemNd, 'name'), ritem.getAttribute('id'), '*').node;
		if (nativeRelated) {
			ritem.parentNode.replaceChild(nativeRelated, ritem);
			return nativeRelated;
		}
	}
	return ritem;
};
