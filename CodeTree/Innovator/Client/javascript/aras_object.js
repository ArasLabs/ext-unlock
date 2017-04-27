// (c) Copyright by Aras Corporation, 2004-2013.

/*
*   Aras Object used to expose the Client Side API for the Innovator Server.
*
*/

/*
global Aras variables: to (set/get) these variables use aras.(set/get)Variable
TearOff
DEBUG
*/

var system_progressbar1_gif = "../images/Progress.gif";

/*-- Aras
*
*   Constructor for the Aras object.
*/
function Aras(parent) {
	if (parent) {
		this.parentArasObj = parent;
		for (var prop in parent) {
			if (prop != "privateProperties" && prop != "parentArasObj" && prop != "modalDialogHelper" && prop != "shortcutsHelperFactory" && prop != "CriteriaConverter" && !Aras.prototype[prop]) {
				this[prop] = parent[prop];
			}
		}
		this.IomInnovator = this.newIOMInnovator();
		this.vault = controlWrapperFactory.createVaultWrapper(this, parent);
		this.utils = controlWrapperFactory.createUtilsWrapper(this, parent);
	}
	else {
		var innovatorWindow = window; // !!! wrong, but temporary work
		this.Enums = Enums;
		this.commonProperties = new ArasCommonProperties();
		this.SetupURLs(window.location.href);
		this.varsStorage = null;
		this.vault = null;
		this.itemsCache = new ClientCache(this);
		this.windowsByName = new Array();
		this.preferenceCategoryGuid = "B0D45DA3B9CE4196A9FEB1D7AD3E4870";
		this.mainWindowName = innovatorWindow.name;
		if (!this.mainWindowName) {
			var d = new Date();
			innovatorWindow.name = "innovator_" + d.getHours() + "h" + d.getMinutes() + "m" + d.getSeconds() + "s";
			this.mainWindowName = innovatorWindow.name;
		}
		this.maxNestedLevel = 3; //constant to prevent recurrsion of nested forms (zero based)
		this.newFieldIndex = 0; //variable used in formtool to generate new field name
		this.sGridsSetups = new Object();
		this.rels2gridXSL = new Object();
		this.clipboard = new Clipboard(this);
		this.VaultServerURLCache = new Object();
		this.translationXMLNsURI = "http://www.aras.com/I18N";
		this.translationXMLNdPrefix = "i18n";

		this.IomFactory = null;
		this.IomInnovator = null;
		this.MetadataCache = null;
		this.metadataCacheCategotries = new Object();
		this.metadataCacheCategotries.variables = "824E7AB9B52446e58E05FC47A7507B21";
	}

	this.modalDialogHelper = new ModalDialogHelper(this.getScriptsURL());
	this.privateProperties = new ArasPrivateProperties(this);
	this.controlsFactoryHelper = new ClientControlsFactoryHelper();
	this.shortcutsHelperFactory = new ShortcutsHelperFactory();
	this.customActionHelper = new CustomActionHelper(this);

	var critConverter;
	var self = this;
	Object.defineProperty(this, "CriteriaConverter", {
		get: function () {
			if (!critConverter) {
				var clientUrl = (new ClientUrlsUtility(self.commonProperties.BaseURL)).getBaseUrlWithoutSalt();
				critConverter = new CriteriaConverter(clientUrl);
			}
			return critConverter;
		}
	});
}

/*
* ArasCommonProperties - object to store common for all Aras objects properties
*/
function ArasCommonProperties() {
	this.formsCacheById = new Object();
	this.userDom = Aras.prototype.createXMLDocument();
	this.userDom.loadXML("<Empty/>");
	this.userID = "";
	this.loginName = "";
	this.password = "";
	this.database = "";
	this.identityList = "";
	this.scriptsURL = "";
	this.baseURL = "";
	this.serverBaseURL = "";
	this.serverEXT = ".aspx";
	this.user_type = "";
	this.idsBeingProcessed = new Object();
	this.clientRevision = "";
	this.IsSSVCLicenseOk = false;
	this.userReportServiceBaseUrl = "";
}

/*
* ArasPrivateProperties - object to store private properties of each of Aras objects
*/
function ArasPrivateProperties(owner) {
	this.soap = new SOAP(owner);
}

function Aras_onerror_handler(sMsg, sUrl, sLine) {
	//there are cases when exception is not passed to a caller function but error is displayed to user
	//when call is executed from different frame
	var re = /^(Known exception [^:]+):::([^:]+):::(.*)$/;
	if (re.test(sMsg)) {
		//known exception
		re = /^([^:]+):::(.*)$/;
		if (re.test(RegExp.$3)) {
			var msg = RegExp.$1;
			var faultstring = RegExp.$2;

			if (aras && aras.AlertError) {
				aras.AlertError(msg, faultstring);
			}
		}

		return false;
	}
	else {
		//to simulate onerror handler absence
		//to generate standard UI error if the exception is not from the known place.
		window.onerror = null; //turn OFF our special handler
		throw new Error(1, sMsg);
		window.onerror = Aras_onerror_handler; //turn ON our special handler
		return true;
	}
}

if (!TopWindowHelper.getMostTopWindowWithAras(window).aras || !TopWindowHelper.getMostTopWindowWithAras(window).aras.DEBUG) {
	onerror = Aras_onerror_handler;
}

Aras.prototype.assignEventhandlerToControl = function Aras_AssignEventhandlerToControl(obj, eventName, parameters, func) {
	var body;
	if (typeof (func) === "function") {
		body = "return func(" + parameters + ");";
	}
	else {
		body = func;
	}

	if (obj && eventName) {
		eval("function obj::" + eventName + "(" + parameters + ") {" + body + "}");
	}
	else {
		throw new Error(1, this.getResource("", "aras_object.specify_object_ex"));
	}
}

Aras.prototype.removeEventhandlerFromControl = function Aras_AssignEventhandlerToControl(obj, eventName) {
	if (obj && eventName) {
		eval("function obj::" + eventName + "() {return;}");
	}
	else {
		throw new Error(1, this.getResource("", "aras_object.specify_object_ex"));
	}
}

Aras.prototype.showColorDialog = function Aras_showColorDialog(oldColor) {
	var reg = new RegExp("^#?(([a-fA-F0-9]){3}){1,2}$");
	if (!reg.test(oldColor)) {
		oldColor = "#ffffff";
	}
	//summary: show ColorDalog.html as modal window and allows to choose the color
	var options = {
		dialogHeight: 200,
		dialogWidth: 560
	};
	var params = { oldColor: oldColor, aras: this };
	return this.modalDialogHelper.show("DefaultModal", window, params, options, "colorDialog.html");
}

Aras.prototype.ShowSplashScreen = function Aras_ShowSplashScreen(wnd, maxProgressValue, OnTimeInterval_handler_str, msg) {
	var initSplashFailed = false;
	// try->catch here because of control may fail for some reason.
	try {
		var obj = this.utils.createSplashScreen();
		obj.IntervalLength = 100;
		wnd.focus(); //because of a frame inside the window frameset may be active.
		dTop = wnd.screenTop || wnd.screenY || 0;
		dLeft = wnd.screenLeft || wnd.screenX || 0;
		var res = this.getDocumentBodySize(wnd.document);
		obj.SetBounds(dLeft, dTop, parseInt(res.width), parseInt(res.height));
		obj.MaximumProgressValue = maxProgressValue;
		var message = (msg !== undefined) ? msg : this.getResource("", "aras_object.please_wait_while_open_window_are_being_closing");
		obj.SetSubscriptionMessage(message);
		this.assignEventhandlerToControl(obj, "OnTimeInterval", "", OnTimeInterval_handler_str + "(obj);");
	}
	catch (Excep) {
		initSplashFailed = true;
	}

	if (!initSplashFailed) {
		obj.ShowSplashScreen();
	}
}

Aras.prototype.getOpenedWindowsCount = function Aras_GetOpenedWindowsCount(closeAllDuringLooping) {
	var winCount = 0;
	for (var wn in this.windowsByName) {
		var wnd = this.windowsByName[wn];
		if (typeof wnd == "function") {
			continue;
		}

		if (this.isWindowClosed(wnd)) {
			this.deletePropertyFromObject(this.windowsByName, wn);
		}
		else {
			winCount++;
			if (closeAllDuringLooping) {
				wnd.logout_confirmed = true;
				wnd.close();
			}
		}
	}
	return winCount;
}

Aras.prototype.updateOfWindowsClosingProgress = function Aras_updateOfWindowsClosingProgress(splashScreen) {
	var cntrName = this.updateOfWindowsClosingProgress.toString();
	cntrName = cntrName.substring(0, cntrName.indexOf("(")) + "_calls_count";
	if (this[cntrName] === undefined) {
		this[cntrName] = 0;
	}
	var nowOpenedWindowsCount = this.getOpenedWindowsCount();
	if (nowOpenedWindowsCount > 0) {
		//check if any window is closed
		//if (no window were closed since last check then) count++;
		if (splashScreen.CurrentProgressValue == (splashScreen.MaximumProgressValue - nowOpenedWindowsCount)) {
			this[cntrName]++;
		}
		else {
			this[cntrName] = 0;
		}
	}

	var newProgrV = splashScreen.MaximumProgressValue - nowOpenedWindowsCount;
	splashScreen.CurrentProgressValue = newProgrV;

	//treat the rest of windows cannot be closed automatically. User has to close them manually.
	var timeout = 5000; //5 seconds
	var maxTries = timeout / splashScreen.IntervalLength;
	if (nowOpenedWindowsCount == 0 || this[cntrName] >= maxTries) {
		this.deletePropertyFromObject(this, cntrName);
		splashScreen.CloseSplashScreen(100);
	}
}

Aras.prototype.getCommonPropertyValue = function Aras_getCommonPropertyValue(propertyName, propertyDescription) {
	return this.CommonPropertyValue("get", propertyName, propertyDescription);
}

Aras.prototype.setCommonPropertyValue = function Aras_setCommonPropertyValue(propertyName, propertyValue, propertyDescription) {
	return this.CommonPropertyValue("set", propertyName, propertyValue, propertyDescription);
}

Aras.prototype.CommonPropertyValue = function Aras_CommonPropertyValue(action, propertyName, propertyValue, propertyDescription) {
	var res;
	try {
		if (action == "get") {
			res = this.commonProperties[propertyName];
		}
		else {
			this.commonProperties[propertyName] = propertyValue;
		}
	}
	catch (excep) {
		//only one known exception may occur here:
		//-2147418094: The callee (server [not server application]) is not available and disappeared; all connections are invalid. The call did not execute.

		var num = excep.number;
		if (num == -2147418094) {
			if (!propertyDescription) {
				propertyDescription = propertyName;
			}

			var specialDescr = this.getResource("", "aras_object.known_exception_during_get_common_properties", num, propertyDescription); //because description is empty for this particular error
			throw new Error(num, specialDescr);
		}
		else {
			//such exceptions are unknown and thus not processed here
			throw excep;
		}
	}

	return res;
}

/*
* Adds id to a list of ids which are being processed in async operation.
* Parameters are item id and operation description.
*/
Aras.prototype.addIdBeingProcessed = function Aras_addIdBeingProcessed(id, operationDescription) {
	this.commonProperties.idsBeingProcessed[id] = operationDescription;
}

/*
* Removes id from a list of ids which are being processed in async operation.
* Parameter is item id.
*/
Aras.prototype.removeIdBeingProcessed = function Aras_removeIdBeingProcessed(id) {
	this.deletePropertyFromObject(this.commonProperties.idsBeingProcessed, id);
}

/*
* Checks if id is being processed in async operation.
* Parameter is item id.
*/
Aras.prototype.isIdBeingProcessed = function Aras_isIdBeingProcessed(id) {
	return (this.commonProperties.idsBeingProcessed[id] !== undefined);
}

/*
* User item representing the user logged in is a special item
* and thus is stored in the separate DOM.
*/
Aras.prototype.getLoggedUserItem = function Aras_getLoggedUserItem() {
	var item = this.commonProperties.userDom.selectSingleNode("Innovator/Item[@type='User']");
	if (!item) {
		var res = this.getMainWindow().arasMainWindowInfo.getUserResult;
		if (res.getFaultCode() != 0) {
			if (this.DEBUG) {
				this.AlertError(this.getResource("", "aras_object.fault_loading", typeName, res.getFaultCode()));
			}
			return false;
		}

		var newItem = res.results.selectSingleNode(this.XPathResult("/Item"));
		if (!newItem) {
			this.AlertError(this.getResource("", "aras_object.user_not_found"));
		}
		else {
			this.commonProperties.userDom.loadXML("<Innovator>" + newItem.xml + "</Innovator>");
			item = this.commonProperties.userDom.selectSingleNode("Innovator/Item[@type='User']");
		}
	}
	return item;
}

Aras.prototype.getIsAliasIdentityIDForLoggedUser = function Aras_getIsAliasIdentityIDForLoggedUser() {
	var identityID = "";
	var loggedUser = this.getLoggedUserItem();
	var identityNd = loggedUser.selectSingleNode("Relationships/Item[@type='Alias']/related_id/Item[@type='Identity']");
	if (identityNd) {
		identityID = identityNd.getAttribute("id");
	}

	return identityID;
}

Aras.prototype.getLoginName = function Aras_getLoginName() {
	return this.commonProperties.loginName;
}

// return "admin" if logged user has Administrators or SuperUser Identity
// otherwise return "user"
Aras.prototype.getUserType = function Aras_getUserType() {
	return this.commonProperties.user_type;
}

Aras.prototype.isAdminUser = function Aras_isAdminUser(itemTypeName) {
	if (this.getUserType() === "admin") {
		return true;
	}

	if (itemTypeName === undefined) {
		return this.getUserType() === "admin";
	}

	return this.getCanUnlockItem(itemTypeName);
}

Aras.prototype.setUserType = function Aras_setUserType(usertype) {
	this.commonProperties.user_type = usertype;
}

Aras.prototype.setLoginName = function Aras_setLoginName(loginName) {
	this.commonProperties.loginName = loginName;
}

Aras.prototype.getPassword = function Aras_getPassword() {
	return this.commonProperties.password;
}

Aras.prototype.setPassword = function Aras_setPassword(pwdPlain, dohash) {
	if (dohash == undefined) {
		dohash = true;
	}
	if (dohash) {
		this.commonProperties.password = calcMD5(pwdPlain);
	}
	else {
		this.commonProperties.password = pwdPlain;
		this.InnovatorUser.Password = pwdPlain;
	}
}

Aras.prototype.getUserReportServiceBaseUrl = function Aras_getUserReportServiceBaseUrl() {
	return this.commonProperties.userReportServiceBaseUrl;
}

Aras.prototype.setUserReportServiceBaseUrl = function Aras_setUserReportServiceBaseUrl(url) {
	this.commonProperties.userReportServiceBaseUrl = url;
}

Aras.prototype.SetupURLs = function Aras_SetupURLs(start_url) {
	var s = start_url.replace(/(^.+scripts\/)(.+)/i, "$1");
	this.commonProperties.scriptsURL = s;
	this.commonProperties.BaseURL = s.replace(/\/scripts\/$|\/reports\/$/i, "");
	this.commonProperties.serverBaseURL = this.commonProperties.BaseURL.replace(/\/client(\/.*)?$/i, "/Server/");
	this.commonProperties.innovatorBaseURL = this.commonProperties.serverBaseURL.replace(/\/Server\/$/i, "/");
	this.scriptsURL = this.commonProperties.scriptsURL;
}

Aras.prototype.setServer = function Aras_setServer(baseURL, EXT) {
	if (baseURL != "") {
		this.commonProperties.serverBaseURL = baseURL;
	}
	if (EXT != "") {
		this.commonProperties.serverEXT = EXT;
	}
}

Aras.prototype.getServerBaseURL = function Aras_getServerBaseURL() {
	return this.commonProperties.serverBaseURL;
}

Aras.prototype.getScriptsURL = function Aras_getScriptsURL(additionalPath) {
	var res = this._pathCombine(this.commonProperties.scriptsURL, additionalPath);
	return res;
}

Aras.prototype.getServerURL = function Aras_getServerURL() {
	var res = this.getCommonPropertyValue("serverBaseURL", "Innovator server base URL") +
		"InnovatorServer" + this.getCommonPropertyValue("serverEXT", "Innovator server pages extension");
	return res;
}

Aras.prototype.getBaseURL = function Aras_getBaseURL(additionalPath) {
	var res = this._pathCombine(this.commonProperties.BaseURL, additionalPath);
	return res;
}

Aras.prototype.getInnovatorUrl = function Aras_getInnovatorUrl() {
	return this.commonProperties.innovatorBaseURL;
}

Aras.prototype._pathCombine = function Aras_pathCombine() {
	if (!arguments || !arguments.length) {
		return;
	}
	if (arguments.length === 1 || arguments.length === 2 && arguments[1] === undefined) {
		return arguments[0]; //minor optimization
	}
	var curr, prev = arguments[0], res = [];
	if (prev) {
		res.push(prev);
	}
	for (var i = 1; i < arguments.length; i++) {
		prev = arguments[i - 1];
		curr = arguments[i];
		if (!prev || !curr) {
			continue;
		}
		if (prev.indexOf("/", prev.length - 1) > 0 && curr.substr(0, 1) === "/" ||
			prev.indexOf("\\", prev.length - 1) > 0 && curr.substr(0, 1) === "\\") {
			curr = curr.substr(1);
		}
		res.push(curr);
	}
	return res.join("");
}

//parentUrl4XmlFolder, resourceId are optional parameters
Aras.prototype.getI18NXMLResource = function Aras_getI18NXMLResource(resourceFileNm, parentUrl4XmlFolder, resourceId) {
	if (!resourceFileNm) {
		return "";
	}
	if (!parentUrl4XmlFolder) {
		parentUrl4XmlFolder = this.getBaseURL();
	}
	if (parentUrl4XmlFolder.substr(parentUrl4XmlFolder.length - 1, 1) != "/") {
		parentUrl4XmlFolder += "/";
	}
	var Cache = this.getCacheObject();
	var langCd = this.IomInnovator.getI18NSessionContext().GetLanguageCode();
	var langCd2 = this.getCommonPropertyValue("lang_code_faked");
	if (langCd2 !== undefined) {
		langCd = langCd2;
	}
	var fullLocalizedUrl = parentUrl4XmlFolder + "xml" + (langCd ? "." + langCd : "") + "/" + resourceFileNm;
	var fullEnglishUrl = parentUrl4XmlFolder + "xml" + "/" + resourceFileNm;
	if (resourceId === undefined) {
		resourceId = fullLocalizedUrl;
	}
	if (langCd == "en") {
		return fullEnglishUrl;
	}
	if (Cache.XmlResourcesUrls[resourceId]) {
		return Cache.XmlResourcesUrls[resourceId];
	}

	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open("HEAD", fullLocalizedUrl, false);
	xmlhttp.send("");
	if (xmlhttp.status == 404 || xmlhttp.statusText == "Not Found") {
		Cache.XmlResourcesUrls[resourceId] = fullEnglishUrl;
	}
	else {
		Cache.XmlResourcesUrls[resourceId] = fullLocalizedUrl;
	}

	return Cache.XmlResourcesUrls[resourceId];
}

Aras.prototype.getTopHelpUrl = function Aras_getTopHelpUrl() {
	var topHelpVariable = this.getItemFromServerByName("Variable", "TopHelpUrl", "value");
	var topHelpUrl;
	if (topHelpVariable) {
		topHelpUrl = topHelpVariable.getProperty("value");
	}
	if (!topHelpUrl) {
		topHelpUrl = this.getBaseURL() + "/WebHelp/";
	}

	return topHelpUrl;
}

Aras.prototype.getUserID = function Aras_getUserID() {
	return this.commonProperties.userID;
}

Aras.prototype.setUserID = function Aras_setUserID(userID) {
	this.commonProperties.userID = userID;
}

Aras.prototype.getDatabase = function Aras_getDatabase() {
	return this.commonProperties.database;
}

Aras.prototype.setDatabase = function Aras_setDatabase(database) {
	this.commonProperties.database = database;
}

Aras.prototype.getIdentityList = function Aras_getIdentityList() {
	return this.commonProperties.identityList;
}

Aras.prototype.setIdentityList = function Aras_setIdentityList(identityList) {
	this.commonProperties.identityList = identityList;
}

Aras.prototype.setVarsStorage = function Aras_setVarsStorage(varsStorage) {
	this.varsStorage = new VarsStorageClass();
}

Aras.prototype.getSelectCriteria = function Aras_getSelectCriteria(itemTypeId, isForRelationshipsGrid) {
	if (!itemTypeId) {
		return "";
	}

	var currItemType = this.getItemTypeForClient(itemTypeId, "id");
	if (!currItemType || currItemType.isError()) {
		return "";
	}

	currItemType = currItemType.node;
	var itTypeName = this.getItemProperty(currItemType, "name");
	var isVersionable = (this.getItemProperty(currItemType, "is_versionable") == "1");
	var isRelationshipType = (this.getItemProperty(currItemType, "is_relationship") == "1");

	if (isForRelationshipsGrid == undefined) {
		isForRelationshipsGrid = false;
	}

	var key = this.MetadataCache.CreateCacheKey("getSelectCriteria", itemTypeId, isForRelationshipsGrid);
	if (isForRelationshipsGrid && isRelationshipType) {
		var relType = this.getRelationshipType(this.getRelationshipTypeId(itTypeName));
		if (relType && !relType.isError()) {
			var related_id = relType.getProperty("related_id");
			if (related_id) {
				key.push(related_id);
			}
		}
	}

	var cachedResult = this.MetadataCache.GetItem(key);
	if (!cachedResult) {
		var selectAttr = "";

		var visiblePropsItms = currItemType.selectNodes(this.getVisiblePropertiesXPath(itTypeName, isForRelationshipsGrid));
		for (var i = 0; i < visiblePropsItms.length; i++) {
			var propertyNd = visiblePropsItms[i];
			var propName = this.getItemProperty(propertyNd, "name");
			if (selectAttr != "") {
				selectAttr += ",";
			}
			selectAttr += propName;
			if (this.getItemProperty(propertyNd, "data_type") == "foreign") {
				var dataSourceId = this.getItemProperty(propertyNd, "data_source");
				var dataSourceItem = currItemType.selectSingleNode("Relationships/Item[@type=\"Property\" and @id=\"" + dataSourceId + "\"]");
				selectAttr += "," + this.getItemProperty(dataSourceItem, "name");
			}
		}

		if (selectAttr == "") {
			selectAttr = "id";
		}

		selectAttr += ",created_by_id,created_on,modified_by_id,modified_on,locked_by_id,major_rev,css,current_state,keyed_name";

		if (isRelationshipType) {
			var relType = this.getRelationshipType(this.getRelationshipTypeId(itTypeName));
			if (relType && !relType.isError()) {
				var relatedTypeId = relType.getProperty("related_id");
				if (relatedTypeId) {
					selectAttr += ",related_id(" + this.getSelectCriteria(relatedTypeId, isForRelationshipsGrid) + ")";
				}
			}
		}

		if (isVersionable) {
			selectAttr += ",new_version,generation,release_date,effective_date,is_current";
		}
		if (isRelationshipType) {
			selectAttr += ",source_id";
		}

		this.MetadataCache.SetItem(key, selectAttr);
		return selectAttr;
	}
	else {
		return cachedResult;
	}
}

Aras.prototype.getSearchMode = function Aras_getSearchMode(searchModeId) {
	return this.getSearchModes(searchModeId)[0];
}

Aras.prototype.getSearchModes = function Aras_getSearchModes(searchModeId2Return) {
	var self = this;
	function sortByKeyedName(modeA, modeB) {
		var nameA = self.getItemProperty(modeA, "keyed_name");
		var nameB = self.getItemProperty(modeB, "keyed_name");
		if (nameA == nameB) {
			return 0;
		}
		return nameA > nameB ? 1 : -1;
	}

	var result = [];
	var searchModesRes = this.MetadataCache.GetSearchModes();
	var nodes = searchModesRes.selectNodes("Item");

	for (var i = 0; i < nodes.length; i++) {
		var itm = nodes[i];

		if (searchModeId2Return) {
			if (itm.getAttribute("id") == searchModeId2Return) {
				result[0] = itm;
				return result;
			}
		}
		else {
			result[i] = itm;
		}
	}

	result.sort(sortByKeyedName);
	return result;
}

Aras.prototype.saveSavedSearches = function Aras_saveSavedSearches() {
	var specialID4SavedSearches_global = "56E808C94358462EAA90870A2B81AD96";
	var tmpArr = this.MetadataCache.GetItemsById(specialID4SavedSearches_global);
	var xml = "";
	for (var i = 0; i < tmpArr.length; i++) {
		var itm = tmpArr[i].content;
		if (itm && itm.getAttribute("action")) {
			itm.setAttribute("doGetItem", "0");
			xml += itm.xml;
		}
	}
	if (xml) {
		return this.soapSend("ApplyAML", "<AML>" + xml + "</AML>");
	}
}

Aras.prototype.getSavedSearches = function Aras_getSavedSearches(itemTypeName, location, autoSavedOnly, savedSearchId2Return) {
	var result = this.newArray();
	var specialID4SavedSearches_global = "56E808C94358462EAA90870A2B81AD96";
	var specialID4SavedSearches = this.getCommonPropertyValue("SavedSearchesSpecialID_" + itemTypeName);
	if (!specialID4SavedSearches) {
		specialID4SavedSearches = this.generateNewGUID();
		this.setCommonPropertyValue("SavedSearchesSpecialID_" + itemTypeName, specialID4SavedSearches);
	}
	var tmpArr;
	if (savedSearchId2Return) {
		tmpArr = this.MetadataCache.GetItemsById(savedSearchId2Return);
	}
	else {
		tmpArr = this.MetadataCache.GetItemsById(specialID4SavedSearches);
	}
	if (tmpArr.length < 1) {
		var qry = this.newIOMItem("SavedSearch", "get");
		if (savedSearchId2Return) {
			qry.setAttribute("id", savedSearchId2Return);
		}
		else {
			if (location !== "ProjectTree") {
				qry.setProperty("itname", itemTypeName);
			} else {
				qry.setProperty("location", "ProjectTree");
				qry.setAttribute("orderBy", "label");
			}
		}
		qry.setProperty("owned_by_id", this.getIdentityList());
		qry.setPropertyCondition("owned_by_id", "in");
		var res = qry.apply();
		if (res.isEmpty()) {
			var key = this.MetadataCache.CreateCacheKey("getSavedSearches", "Just A Stub When No Saved Searches", specialID4SavedSearches, specialID4SavedSearches_global);
			var cacheCont = this.IomFactory.CreateCacheableContainer("", "");
			this.MetadataCache.SetItem(key, cacheCont);
			return result;
		}

		if (res.isError()) {
			this.AlertError(res);
			return result;
		}
		var allSearches = this.getSearchModes();
		var items = res.getItemsByXPath(this.XPathResult("/Item"))
		var itemsCount = items.getItemCount();
		for (var i = 0; i < itemsCount; i++) {
			var itm = items.getItemByIndex(i);
			var key = this.MetadataCache.CreateCacheKey("getSavedSearches", itm.getAttribute("id"), specialID4SavedSearches, specialID4SavedSearches_global);
			for (var j = 0; j < allSearches.length; j++) {
				key.push(allSearches[j].getAttribute("id"));
			}
			var cacheCont = this.IomFactory.CreateCacheableContainer(itm.node, itm.node);
			this.MetadataCache.SetItem(key, cacheCont);
		}
	}
	tmpArr = this.MetadataCache.GetItemsById(specialID4SavedSearches);
	for (var i = 0; i < tmpArr.length; i++) {
		var f1 = true;
		var f2 = true;
		var f3 = true;
		var f4 = true;
		var itm = tmpArr[i].content;
		if (itm) {
			if (itemTypeName && this.getItemProperty(itm, "itname") != itemTypeName && itemTypeName !== "ProjectTreeSalt_klj43") {
				f1 = false;
			}

			if (location && this.getItemProperty(itm, "location") != location) {
				f2 = false;
			}
			if (autoSavedOnly && this.getItemProperty(itm, "auto_saved") != "1") {
				f3 = false;
			}
			if (savedSearchId2Return && itm.getAttribute("id") != savedSearchId2Return) {
				f4 = false;
			}
			if (f1 && f2 && f3 && f4) {
				result.push(itm);
			}
		}
	}
	return result;
}

Aras.prototype.getVariable = function Aras_getVariable(varName) {
	try {
		if (!this.varsStorage) {
			return "";
		}

		return this.varsStorage.getVariable(varName);
	}
	catch (excep) {
		return "";
	}
}

Aras.prototype.resetUserPreferences = function Aras_resetUserPreferences() {
	this.MetadataCache.RemoveById(this.preferenceCategoryGuid);
	this.varsStorage = new VarsStorageClass();
}

Aras.prototype.setVariable = function Aras_setVariable(varName, varValue) {
	if (!this.varsStorage) {
		return 1;
	}

	try {
		if (this.getVariable(varName) != varValue) {
			var pp = this.varsStorage.setVariable(varName, varValue);

			params = new Object();
			params.varName = varName;
			params.varValue = varValue;
			this.fireEvent("VariableChanged", params);
		}
	}
	catch (excep) {
		return 2;
	}

	return 0;
}

Aras.prototype.removeVariable = function Aras_removeVariable(varName) {
	if (!this.varsStorage) {
		return 2;
	}

	return this.setVariable(varName, null);
}

//url - location of new document if window with nameForNewWindow hasn't defined. Optional parameter. Created for IR-008617 "One Window (Main) Service report gives Access Denied"
Aras.prototype.getActionTargetWindow = function Aras_getActionTargetWindow(nameForNewWindow, url) {
	var win = this.commonProperties.actionTargetWindow;

	if (win) {
		try {
			//IR-007415 "Status Bar/Indicator never ceases"
			//Check win.document to avoid access denied error
			if (!this.isWindowClosed(win) && win.document) {
				win = win;
			}
			else {
				win = null;
			}
		}
		catch (excep) {
			win = null;
		}
	}

	if (!win) {
		var width = 710; // This is a printable page width.
		var height = screen.availHeight / 2;
		var x = (screen.availHeight - height) / 2;
		var y = (screen.availWidth - width) / 2;
		var args = "scrollbars=yes,resizable=yes,status,width=" + width + ",height=" + height + ",left=" + y + ",top=" + x;
		var loc = (url != undefined) ? url : this.getScriptsURL() + "blank.html";
		win = window.open(loc, "", args);
		win.document.title = nameForNewWindow;
		this.browserHelper.hidePanels(win, ["locationbar"]);

		this.setActionTargetWindow(win);
	}

	return win;
}

Aras.prototype.setActionTargetWindow = function Aras_setActionTargetWindow(win) {
	this.commonProperties.actionTargetWindow = win;
}

Aras.prototype._selectStatusBar = function Aras_selectStatusBar() {
	try {
		var topWnd = this.getMostTopWindowWithAras(window);
		if (topWnd.main && topWnd.main.statusbar) {
			return topWnd.main.statusbar;
		}

		if (topWnd.document.frames && topWnd.document.frames["statusbar"]) {
			var statusbar = topWnd.document.frames["statusbar"];
			return statusbar;
		}

		var iframes = document.getElementsByTagName("iframe"), tmpFrames;
		for (var i = 0; i < iframes.length; i++) {
			tmpFrames = iframes[i] && iframes[i].contentWindow ? iframes[i].contentWindow.document.frames : null;
			if (tmpFrames && tmpFrames["statusbar"]) {
				return tmpFrames["statusbar"];
			}
		}

		return false;
	}
	catch (excep) {
		return false;
	}
}

Aras.prototype.showStatusMessage = function Aras_showStatusMessage(id, text, imgURL) {
	try {
		var statusbar = this._selectStatusBar();
		if (statusbar) {
			return statusbar.setStatus(id, text, imgURL);
		}
		return false;
	}
	catch (excep) {
		return false;
	}
}

Aras.prototype.clearStatusMessage = function Aras_clearStatusMessage(messageID) {
	try {
		var statusbar = this._selectStatusBar();
		if (statusbar) {
			return statusbar.clearStatus(messageID);
		}
		return false;
	}
	catch (excep) {
		return false;
	}
}

Aras.prototype.setDefaultMessage = function Aras_setDefaultMessage(id, infoOrText, imgURL) {
	var info;
	if (imgURL != undefined) {
		info = new Object();
		info.text = infoOrText;
		info.imgURL = imgURL;
	}
	else {
		info = infoOrText;
	}

	try {
		var statusbar = this._selectStatusBar();
		if (this.getMostTopWindowWithAras(window).isTearOff && statusbar) {
			return statusbar.setDefaultMessage(id, info);
		}
		return false;
	}
	catch (excep) {
		return false;
	}
}

Aras.prototype.setStatus = function Aras_setStatus(text, image) {
	return this.showStatusMessage("status", text, image);
}

Aras.prototype.setStatusEx = function Aras_setStatusEx(text, id, image) {
	return this.showStatusMessage(id, text, image);
}

/*-- clearStatus
*
*   Method to set the clear status bar value.
*
*/
Aras.prototype.clearStatus = function ArasObject_clearStatus(statID) {
	return this.clearStatusMessage(statID);
}

//returns a set of "header name" -> "header value" pairs. The headers are used to send request to server.
Aras.prototype.getHttpHeadersForSoapMessage = function Aras_getHttpHeadersForSoapMessage(soapAction) {
	var res = this.newObject();
	res["SOAPACTION"] = soapAction;
	res["AUTHUSER"] = encodeURIComponent(this.getCurrentLoginName());
	res["AUTHPASSWORD"] = this.getCurrentPassword();
	res["DATABASE"] = encodeURIComponent(this.getDatabase());

	//+++ setup HTTP_LOCALE and HTTP_TIMEZONE_NAME headers
	res["LOCALE"] = this.getCommonPropertyValue("systemInfo_CurrentLocale");
	res["TIMEZONE_NAME"] = this.getCommonPropertyValue("systemInfo_CurrentTimeZoneName");
	//--- setup HTTP_LOCALE and HTTP_TIMEZONE_NAME headers

	return res;
}

Aras.prototype.soapSend = function Aras_soapSend(methodName, xmlBody, url, saveChanges, soapController, is_bgrequest, authController, skip_empty_pwd) {
	return this.privateProperties.soap.send(methodName, xmlBody, url, saveChanges, soapController, is_bgrequest, authController, skip_empty_pwd);
}

/*
* For internal use only
*/
Aras.prototype.getEmptySoapResult = function Aras_getEmptySoapResult() {
	return new SOAPResults(this, "");
}

/*----------------------------------------
* getCurrentLoginName
*
* Purpose:
* returns login name to communicate with Server (logged user login name)
*
* Arguments: none
*/
Aras.prototype.getCurrentLoginName = function Aras_getCurrentLoginName() {
	return this.getLoginName();
}

/*----------------------------------------
* getCurrentPassword
*
* Purpose:
* returns password to communicate with Server (logged user password)
*
* Arguments: none
*/
Aras.prototype.getCurrentPassword = function Aras_getCurrentPassword() {
	return this.getPassword();
}

/*----------------------------------------
* getCurrentUserID
*
* Purpose:
* returns User id to communicate with Server (logged user password)
*
* Arguments: none
*/
Aras.prototype.getCurrentUserID = function Aras_getCurrentUserID() {
	return this.getUserID();
}

Aras.prototype.login = function Aras_login(login_name, password, database, dohash_flag, server_BaseURL, server_EXT) {
	this.setLoginName(login_name);
	this.setPassword(password, dohash_flag);
	this.setDatabase(database);
	this.setServer(server_BaseURL, server_EXT);

	var userInfo = this.newObject();
	ArasModules.soap(null, {
		url: this.getServerURL(),
		method: "ApplyItem",
		headers: {
			"AUTHUSER": encodeURIComponent(this.getCurrentLoginName()),
			"AUTHPASSWORD": this.getCurrentPassword(),
			"DATABASE": encodeURIComponent(this.getDatabase()),
			"LOCALE": this.getCommonPropertyValue("systemInfo_CurrentLocale"),
			"TIMEZONE_NAME": this.getCommonPropertyValue("systemInfo_CurrentTimeZoneName")
		}
	});
	var validateRes = this.validateUser(userInfo);
	if (validateRes == "ok") {
		this.setUserID(userInfo.id);
		if (userInfo.user_type != null) {
			this.setUserType(userInfo.user_type);
		}

		this.setVarsStorage();
		var serverBaseUrl = this.getServerBaseURL();
		serverBaseUrl = serverBaseUrl.substr(0, serverBaseUrl.length - 1);//to remove the last '/' character
		this.SyncWinInetAndDotNetCredentials(serverBaseUrl);
	}

	return validateRes;
}

/*-- logout
*
*   Method to logoff the Innovator Server and close the session.
*
*/
Aras.prototype.logout = function () {
	this.setCommonPropertyValue("ignoreSessionTimeoutInSoapSend", true);

	with (this) {
		if (getUserID()) {
			// Save in prefs the statistics about meta-data requested in this session
			// from the server. The statistics is used to preload meta-data in background.
			this.savePreferenceItems();
			this.saveSavedSearches();

			// send logoff message to primary and Notification servers
			soapSend("Logoff", "<logoff skip_unlock='0'/>");
			if (this.UserNotification) {
				soapSend("Logoff", "", this.UserNotification.url);
			}

			fireEvent("AfterLogout", null);
			commonProperties.userID = null;
			commonProperties.login;
			commonProperties.loginName = "";
			commonProperties.password = "";
			commonProperties.database = "";
			commonProperties.identityList = "";
		}
	}
	this.setCommonPropertyValue("ignoreSessionTimeoutInSoapSend", undefined);
}

Aras.prototype.getVisiblePropertiesXPath = function Aras_getVisiblePropertiesXPath(itemTypeName, getForRelshipGrid) {
	var xpath;
	var isHidden = "is_hidden" + (getForRelshipGrid ? "2" : "");
	if (this.isAdminUser() && itemTypeName == "ItemType") {
		xpath = "Relationships/Item[@type=\"Property\" and (not(" + isHidden + ") or " + isHidden + "=\"0\" or name=\"label\")]";
	}
	else {
		xpath = "Relationships/Item[@type=\"Property\" and (not(" + isHidden + ") or " + isHidden + "=\"0\")]";
	}

	return xpath;
}

Aras.prototype.XPathResult = function Aras_XPathResult(str) {
	var path = "//Result";
	if (str == undefined) {
		return (path);
	}
	if (!str) {
		return (path);
	}
	if (str == "") {
		return (path);
	}
	return (path + str);
}

Aras.prototype.XPathFault = function Aras_XPathResult(str) {
	var path = SoapConstants.EnvelopeBodyFaultXPath;
	if (str == undefined) {
		return (path);
	}
	if (!str) {
		return (path);
	}
	if (str == "") {
		return (path);
	}
	return (path + str);
}

Aras.prototype.XPathMessage = function Aras_XPathMessage(str) {
	var path = "//Message";
	if (str == undefined) {
		return (path);
	}
	if (!str) {
		return (path);
	}
	if (str == "") {
		return (path);
	}
	return (path + str);
}

/*----------------------------------------
* hasMessage
*
* Purpose:
* check if xmldom (soap message) contains Message
*
* Arguments:
* xmlDom - xml document with soap message
*/
Aras.prototype.hasMessage = function Aras_hasMessage(xmlDom) {
	return (xmlDom.selectSingleNode(this.XPathMessage()) != null);
}

/*----------------------------------------
* getMessageNode
*
* Arguments:
* xmlDom - xml document with soap message
*/
Aras.prototype.getMessageNode = function Aras_getMessageNode(xmlDom) {
	return xmlDom.selectSingleNode(this.XPathMessage());
}

/*-- validateUser
*
*   Method to validate the user and is used by the login method.
*   The reason you do not see the users creadentions here is
*   because they are automatically sent in the SOAP HTTP header.
*
* Arguments:
*   userInfo - object to return User ID
*/
Aras.prototype.validateUser = function Aras_validateUser(userInfo) {
	var res = this.soapSend("ValidateUser", "");
	if (!res) {
		return this.getResource("", "aras_object.validate_user_failed_communicate_with_innovator_server");
	}

	var passwordExpired_const = SoapConstants.SoapNamespace + ":Server.Authentication.PasswordIsExpired";
	if (res.getFaultCode() == passwordExpired_const) {
		var newPwd;
		var d = this.createXMLDocument();
		var xml = res.getMessageValue("password_validation_info");
		if (!xml) {
			xml = "";
		}
		d.loadXML("<r>" + xml + "</r>");
		var methodCodeNd = d.selectSingleNode("/*/Item[@type='Method']/method_code");
		var variableNds = d.selectNodes("/*/Item[@type='Variable']");
		var variablesXml = undefined;
		if (variableNds.length > 0) {
			variablesXml = "<Result>";
			for (var i = 0, l = variableNds.length; i < l; i++) {
				variablesXml += variableNds[i].xml;
			}
			variablesXml += "</Result>";
		}
		var data = new Object();
		data["title"] = this.getResource("", "common.pwd_expired");
		data["md5"] = this.getPassword();
		data["oldMsg"] = this.getResource("", "common.old_pwd");
		data["newMsg1"] = this.getResource("", "common.new_pwd");
		data["newMsg2"] = this.getResource("", "common.confirm_pwd");
		data["errMsg1"] = this.getResource("", "common.old_pwd_wrong");
		data["errMsg2"] = this.getResource("", "common.check_pwd_confirmation");
		data["errMsg3"] = this.getResource("", "common.pwd_empty");
		data["check_empty"] = true;
		data["code_to_check_pwd_policy"] = (methodCodeNd) ? methodCodeNd.text : this.getResource("", "aras_object.return_method_check_password_policy_not_found");
		data["vars_to_check_pwd_policy"] = variablesXml;
		data.aras = this;
		var isPwdChanged = false;
		while (!isPwdChanged) {
			var options = {
				dialogWidth: 300,
				dialogHeight: 180,
				center: true
			};
			newPwd = this.modalDialogHelper.show("DefaultModal", window, data, options, "changeMD5Dialog.html");
			if (newPwd === undefined) {
				return this.getResource("", "aras_object.new_password_not_set");
			}
			else {
				isPwdChanged = true;
				var r2 = this.soapSend("ChangeUserPassword", "<new_password>" + newPwd + "</new_password>");
				if (r2.getFaultCode() != 0) {
					this.AlertError(r2);
					isPwdChanged = false;
				}
			}
		}
		this.setPassword(newPwd, false);
		ArasModules.soap(null, {
			headers: {
				"AUTHUSER": encodeURIComponent(this.getCurrentLoginName()),
				"AUTHPASSWORD": this.getCurrentPassword(),
				"DATABASE": encodeURIComponent(this.getDatabase()),
				"LOCALE": this.getCommonPropertyValue("systemInfo_CurrentLocale"),
				"TIMEZONE_NAME": this.getCommonPropertyValue("systemInfo_CurrentTimeZoneName")
			}
		});
		res = this.soapSend("ValidateUser", "");
		if (!res) {
			return this.getResource("", "aras_object.validate_user_failed_communicate_with_innovator_server");
		}
	}

	if (res.getFaultCode() == 0) {
		var node = res.results.selectSingleNode(this.XPathResult("/id"));
		if (!node) {
			return this.getResource("", "aras_object.validate_user_wrong_innovator_sever_response");
		}

		if (userInfo) {
			userInfo.id = node.text;
			node = res.results.selectSingleNode(this.XPathResult("/user_type"));
			if (node) {
				userInfo.user_type = node.text;
			}
		}

		return "ok";
	}
	else {
		return res.getFaultString();
	}
}

/*-- generateNewGUID
*
*   Method to generate a new ID by getting it from the server
*
*/
Aras.prototype.generateNewGUID = function Aras_generateNewGUID() {
	return this.IomInnovator.getNewID();
}

/*-- isTempID
*
*   Method to test id value to be temporary.
*
*/
Aras.prototype.isTempID = function Aras_isTempID(id) {
	if (id.substring(0, 6) == "ms__id") {
		return true;
	}
	else {
		var item = this.itemsCache.getItem(id);
		if (!item) {
			return false;
		}
		return (item.getAttribute("isTemp") == "1");
	}
}

/*-- applyXsltString
*
*   Method to transform a dom using the XSLT style sheet passed as string.
*
*/
Aras.prototype.applyXsltString = function (domObj, xslStr) {
	var xsl = this.createXMLDocument();
	xsl.loadXML(xslStr);
	return domObj.transformNode(xsl);
}

/*-- applyXsltFile
*
*   Method to transform a dom using the XSLT style sheet passed as a URL.
*
*/
Aras.prototype.applyXsltFile = function (domObj, xslFile) {
	var xsl = this.createXMLDocument();
	var xmlhttp = this.XmlHttpRequestManager.CreateRequest();
	xmlhttp.open("GET", xslFile, false);
	xmlhttp.send(null);
	xsl.loadXML(xmlhttp.responseText);
	return domObj.transformNode(xsl);
}

/*-- evalJavaScript
*
*   Method to evaluate the JavaScript code in the Aras object space.
*
*/
Aras.prototype.evalJavaScript = function Aras_evalJavaScript(jsCode) {
	eval("with(this){" + jsCode + "}");
}

/*-- printFrame
*
*   Method to print the frame
*   frame = the frame object
*
*/
Aras.prototype.printFrame = function Aras_printFrame(frame) {
	frame.focus();
	frame.print();
};

/*-- evalMethod
*
*   Method to evaluate JavaScript stored as a Method item on the client side.
*   methodNameOrNd = the name of the Method item or Method Node
*   XMLinput   = inDom or XML string that is loaded into the _top.inDom
*   inArgs     = arguments for method(can not be changed the object in evalMethod)
*
*/
Aras.prototype.evalMethod = function Aras_evalMethod(methodNameOrNd, XMLinput, inArgs) {
	var isXmlNode = (typeof (XMLinput) === "object") ? true : false;
	var methodNd, methodName;
	if (typeof (methodNameOrNd) === "object") {
		methodName = this.getItemProperty(methodNameOrNd, "name");
		methodNd = methodNameOrNd;
	}
	else {
		methodName = methodNameOrNd;
		methodNd = this.MetadataCache.GetClientMethod(methodName, "name").results.selectSingleNode(this.XPathResult("/Item"));
	}

	if (!methodNd) {
		this.AlertError(this.getResource("", "aras_object.error_in_evalmethod", methodName), "", "");
		return;
	}

	var methodCode = this.getItemProperty(methodNd, "method_code");
	var methodNameUpper = methodName.toUpperCase();
	if ("ONCREATENEWPROJECT" === methodNameUpper) {
		var mixedFlag = "/* METHOD WAS MIXED DYNAMICALLY BY ARAS OBJECT */\n\n\n\n",
			oldSubString = "var callbacks = {",
			newSubString = "var callbacks = {\n" +
				"onload: function (dialog) {\n" +
				"	var windowToFocus = dialog.content.contentWindow;\n" +
				"	aras.browserHelper.setFocus(windowToFocus);\n" +
				"},";

		if (-1 === methodCode.indexOf(mixedFlag)) {
			methodCode = mixedFlag + methodCode.replace(oldSubString, newSubString);
			methodCode = mixedFlag + methodCode.replace(/\btop.aras\b/g, "aras");
		}
	} else {
		var methodNamesWithTopAras = ["PE_ADDCHANGEITEM", "PE_CHOOSECMITEM", "PE_GETSELECTEDITEMS", "PE_CHOOSECMOPTIONS", "PE_COMPLETENESSCHECK", "PE_LAUNCHAMLEDITOR", "AFTERPROJECTUPDATECLIENT",
			"PM_CALL_SERVER_SIDE_SCHEDULE", "PROJECT_CREATEPROJFROMTEMPLATE", "PROJECT_CREATEPROJECTFROMPROJECT", "PROJECT_CREATETEMPLATEFROMPROJ", "PROJECT_CREATETEMPLATEFROMTEMPL",
			"PROJECT_SHOWGANTTCHART"];
		if (methodNamesWithTopAras.indexOf(methodNameUpper) !== -1) {
			methodCode = methodCode.replace(/\btop.aras\b/g, "aras");
			var methodNamesWithTop = ["PE_COMPLETENESSCHECK", "PE_GETSELECTEDITEMS", "PE_CHOOSECMITEM"];
			if (methodNamesWithTop.indexOf(methodNameUpper)) {
				methodCode = methodCode.replace(/\btop\b/g, "aras.getMostTopWindowWithAras(window)");
			}
		}
	}

	var inDom;
	if (isXmlNode) {
		inDom = XMLinput.ownerDocument;
	}
	else {
		inDom = this.createXMLDocument();
		inDom.loadXML(XMLinput);
	}
	var self = this;

	function evalMethod_work() {
		var item = self.newIOMItem();
		var itemNode;

		item.dom = inDom;

		if (isXmlNode) {
			itemNode = XMLinput;
		}
		else {
			itemNode = item.dom.selectSingleNode("//Item");
		}

		if (itemNode) {
			item.node = itemNode;
		}
		else {
			item.node = undefined;
		}

		item.setThisMethodImplementation(new Function("inDom, inArgs", methodCode));

		return item.thisMethod(item.node, inArgs);
	}

	var compatibilityMode = MethodCompatibilityMode.create(this.commonProperties.innovatorUpdateInfo.version, this.commonProperties.clientRevision, this);
	try {
		compatibilityMode.enable();
		if (!this.DEBUG) {
			try {
				return (evalMethod_work());
			}
			catch (excep) {
				this.AlertError(this.getResource("", "aras_object.method_failed", methodName), this.getResource("", "aras_object.aras_object", excep.number, excep.description || excep.message), this.getResource("", "common.client_side_err"));
				return;
			}
			finally {
			}
		}
		else {
			//IR-007020
			var error1 = window.onerror;
			window.onerror = null; //turn OFF our special handler
			return (evalMethod_work());
			window.onerror = error1;
			error1 = null;
		}
	}
	finally {
		compatibilityMode.disable();
	}
}

function AlertInternalCustomizationBase() {
	/// <summary>Base class to implement customizations of AlertInternal</summary>
}

AlertInternalCustomizationBase.prototype.buttonsCellAlign = "right";

AlertInternalCustomizationBase.prototype.DrawAdditionalContent = function AlertInternalCustomizationBase_DrawAdditionalContent(aras) {
	/// <summary>Draws additiobal content on the dilaog. Draws nothing.</summary>
	return "";
}

AlertInternalCustomizationBase.prototype.DrawButtons = function AlertInternalCustomizationBase_DrawButtons(aras) {
	/// <summary>Draws buttons of the dilaog. Draws OK button.</summary>

	return "<input type='button' id='ok' onclick='returnValue=true; window.close();' class='btn' value='" + aras.getResource("", "common.ok") + "'/>";
}

AlertInternalCustomizationBase.prototype.GetDialogArguments = function AlertInternalCustomizationBase_GetDialogArguments(aras) {
	return new Object();
}

function AlertInternalCustomizationForError(technicalErrorMessage, stackTrace) {
	/// <summary>Customizations of AlertInternal specific to Error dialog</summary>
	this.technicalErrorMessage = technicalErrorMessage;
	this.stackTrace = stackTrace;
	this.showDetails = Boolean(technicalErrorMessage || stackTrace);
	if (this.showDetails) {
		this.buttonsCellAlign = "";
	}
	else {
		this.buttonsCellAlign = "right";
	}
}

AlertInternalCustomizationForError.prototype = new AlertInternalCustomizationBase();

AlertInternalCustomizationForError.prototype.DrawAdditionalContent = function AlertInternalCustomizationForError_DrawAdditionalContent(aras) {
	/// <summary>Draws additiobal content on the dilaog. Draws info area if required.</summary>
	var standard = AlertInternalCustomizationBase.prototype.DrawAdditionalContent.call(this, aras);

	var before;
	if (this.showDetails) {
		before =
			"<script type='text/javascript'>" +
			"	showInfoArea(false);" +
			"</script>" +
			this.DrawInfoAreaContent(aras);
	}
	else {
		before = "";
	}

	return before + standard;
}

AlertInternalCustomizationForError.prototype.DrawButtons = function AlertInternalCustomizationForError_DrawButtons(aras) {
	/// <summary>Draws buttons of the dilaog. Draws OK and Cancel button.</summary>
	var standard = AlertInternalCustomizationBase.prototype.DrawButtons.call(this, aras);

	var before;
	if (this.showDetails) {
		before = "<script type=\"text/javascript\">\n" +
			"var currentInfoAreaVisibility;\n" +
			"function showInfoArea(visibility) {\n" +
			"	var additionalContent = document.getElementById('additionalContent');\n" +
			"	var btn = document.getElementById('toggleInfo');\n" +
			"	currentInfoAreaVisibility = visibility;\n" +
			"	if (visibility) {\n" +
			"		additionalContent.style.display='';" +
			"		btn.value = '" + aras.getResource("", "aras_object.hide_details") + "';\n" +
			"		resizeDialog();\n" +
			"	}\n" +
			"	else {\n" +
			"		additionalContent.style.display = 'none';\n" +
			"		btn.value = '" + aras.getResource("", "aras_object.show_details") + "';\n" +
			"		if (preferredWidth && preferredHeight) window.dialogArguments.aras.browserHelper.resizeWindowTo(window, preferredWidth, preferredHeight);\n" +
			"	}\n" +
			"}\n" +
			"</script>\n" +
			"<input type='button' id='toggleInfo' class='btn' onclick='showInfoArea(!currentInfoAreaVisibility);'/>" +
			"</td>" +
			"<td valign='top' align='" + AlertInternalCustomizationBase.prototype.buttonsCellAlign + "'>";
	}
	else {
		before = "";
	}

	var after;
	if (this.showDetails) {
		after = "<br><br><input type='button' id='copyBuffer' class='btn' onclick='CopyToBuffer();' value='" + aras.getResource("", "aras_object.copy_buffer") + "'/>" +
			"<script type=\"text/javascript\">\n" +
			"function CopyToBuffer() {\n" +
			"	var msg = document.getElementById('msg');\n" +
			"	var buffer = msg ? msg.innerHTML : '';\n" +
			"	buffer += dialogArguments.ErrorDetails.GetCompleteDescription();\n" +
			"	if (window.clipboardData) {\n" +
			"		window.clipboardData.setData('Text', buffer);\n" +
			"	} \n" +
			"	else {\n" +
			"		dialogArguments.aras.utils.setClipboardData('Text', buffer);\n" +
			"	}\n" +
			"}\n" +
			"</script>";
	}
	else {
		after = "";
	}

	return before + standard + after;
}

AlertInternalCustomizationForError.prototype.DrawInfoAreaContent = function AlertInternalCustomizationForError_DrawInfoAreaContent(aras) {
	return "<div id='info' style='overflow:auto; background:#eeeeee; margin-right: 0px; margin-bottom: 0px; border:1px solid #ffffff;'>" +
		"<table><tr><td valign='top'><p><b>" + aras.getResource("", "aras_object.technical_message") + "</b></p></td><td><p  id='faultstring'>" + this.technicalErrorMessage +
		"</p></td></tr><tr><td valign='top'><p><b>" + aras.getResource("", "aras_object.stack_trace") + "</b></p></td><td><p id='faultactor'>" + this.stackTrace +
		"</p></td></tr></table>" +
		"</div>";
}

AlertInternalCustomizationForError.prototype.GetDialogArguments = function AlertInternalCustomizationForError_GetDialogArguments(aras) {
	var res = AlertInternalCustomizationBase.prototype.GetDialogArguments.call(this, aras);
	res.ErrorDetails = this.GetErrorDetails();

	return res;
}

AlertInternalCustomizationForError.prototype.GetErrorDetails = function AlertInternalCustomizationForError_GetErrorDetails() {
	function ErrorDetails(technicalErrorMessage, stackTrace) {
		if (!technicalErrorMessage) {
			technicalErrorMessage = "";
		}

		if (!stackTrace) {
			stackTrace = "";
		}

		this.technicalErrorMessage = technicalErrorMessage;
		this.stackTrace = stackTrace;
	}

	ErrorDetails.prototype.GetCompleteDescription = function ErrorDetails_GetCompleteDescription() {
		return this.technicalErrorMessage + this.stackTrace;
	}

	return new ErrorDetails(this.technicalErrorMessage, this.stackTrace);
}

function AlertInternalCustomizationForSOAPResultsError(soapResults) {
	AlertInternalCustomizationForError.call(this, undefined, undefined);
	this.soapResults = soapResults;
	this.showDetails = true;
	this.buttonsCellAlign = "";
	this.drawResponseAsText = false;
	if (soapResults) {
		this.drawResponseAsText = Boolean(soapResults.getParseError());
	}
}

AlertInternalCustomizationForSOAPResultsError.prototype = new AlertInternalCustomizationForError();

AlertInternalCustomizationForSOAPResultsError.prototype.DrawInfoAreaContent = function AlertInternalCustomizationForSOAPResultsError_DrawInfoAreaContent() {
	var res = [];
	res.push("<iframe src='blank.html' id='errXml' style='width:100%; height:100%; border:0;'></iframe>" +
		"<script type='text/javascript'>\n" +
		"var errXml = document.getElementById('errXml').contentWindow;\n" +
		"var doc = errXml.document.open();\n");

	if (this.drawResponseAsText) {
		res.push(
			"doc.write(dialogArguments.ErrorDetails.GetCompleteDescription());\n"
			);
	}
	else {
		res.push(
			"dialogArguments.aras.uiViewXMLstringInFrame(errXml, dialogArguments.ErrorDetails.GetCompleteDescription(), true);\n"
			);
	}

	res.push(
		"doc.close();\n" +
		"</script>"
		);

	return res.join("");
}

AlertInternalCustomizationForSOAPResultsError.prototype.GetErrorDetails = function AlertInternalCustomizationForSOAPResultsError_GetErrorDetails() {
	function ErrorDetails(soapResults) {
		this.soapResults = soapResults;
	}

	ErrorDetails.prototype.GetCompleteDescription = function ErrorDetails_GetCompleteDescription() {
		return this.soapResults.getResponseText();
	}

	return new ErrorDetails(this.soapResults);
}

AlertInternalCustomizationForSOAPResultsError.prototype.GetDialogArguments = function AlertInternalCustomizationForSOAPResultsError_GetDialogArguments(aras) {
	var res = AlertInternalCustomizationForError.prototype.GetDialogArguments.call(this, aras);
	res.aras = aras;

	return res;
}

function AlertInternalCustomizationForIomError(iomError) {
	AlertInternalCustomizationForSOAPResultsError.call(this, undefined);
	this.iomError = iomError;
	this.drawResponseAsText = false;
}

AlertInternalCustomizationForIomError.prototype = new AlertInternalCustomizationForSOAPResultsError();

AlertInternalCustomizationForIomError.prototype.GetErrorDetails = function AlertInternalCustomizationForIomError_GetErrorDetails() {
	function ErrorDetails(iomError) {
		this.iomError = iomError;
	}

	ErrorDetails.prototype.GetCompleteDescription = function ErrorDetails_GetCompleteDescription() {
		return this.iomError.toString();
	}

	return new ErrorDetails(this.iomError);
}

function AlertInternalCustomizationForConfirm() {
}

AlertInternalCustomizationForConfirm.prototype = new AlertInternalCustomizationBase();

AlertInternalCustomizationForConfirm.prototype.DrawButtons = function AlertInternalCustomizationForConfirm_DrawButtons(aras) {
	/// <summary>Draws buttons of the dilaog. Draws OK and Cancel button.</summary>
	var standard = AlertInternalCustomizationBase.prototype.DrawButtons.call(this, aras);
	var additional = "<input type='button' id='cancel' class='btn cancel_button' onclick='returnValue=false; window.close();' value='" + aras.getResource("", "common.cancel") + "'/>";
	return standard + additional;
}

/*
* AlertError
* params:  errorMessage = client-facing error message
*      technicalErrorMessage = the technical error message
*      stackTrace = the stack trace
*      ardwin = the window to use
*
*/
Aras.prototype.AlertError = function Aras_AlertError(errorMessage, technicalErrorMessage, stackTrace, argwin) {
	function isWindow(wnd) {
		var res;
		try {
			res = Boolean(wnd.navigator && wnd.location && wnd.history);
		}
		catch (e) {
			res = false;
		}

		return res;
	}
	var args = new Array();
	//check in case only parent window was specified.
	if (technicalErrorMessage && stackTrace) {
		for (var i = 0, L = arguments.length; i < L; i++) {
			args.push(arguments[i]);
		}
		if (args.length > 0 && isWindow(args[args.length - 1])) {
			args.pop();
		}
	}
	else {
		args.push(arguments[0]);
	}

	//now args contains a list of argumets except a reference to a parent window
	var customization;
	if (args.length == 1 && typeof (args[0]) !== "string") {
		if (SOAPResults.prototype.isPrototypeOf(args[0])) {
			//passed argument is instance of SOAPResults
			var soapResults = args[0];
			var parseError = soapResults.getParseError();
			customization = new AlertInternalCustomizationForSOAPResultsError(soapResults);
			errorMessage = parseError ? this.getResource("", "aras_object.invalid_soap_message") : soapResults.getFaultString();
		}
		else if (args[0].isError) {
			//passed argument is instance of IOM.Item with error description
			customization = new AlertInternalCustomizationForIomError(args[0]);
			errorMessage = args[0].getErrorString();
		}
		else {
			customization = new AlertInternalCustomizationForError(technicalErrorMessage, stackTrace);
		}
	}
	else {
		customization = new AlertInternalCustomizationForError(technicalErrorMessage, stackTrace);
	}

	return this.AlertInternal(errorMessage, "error", argwin, customization);
}

Aras.prototype.AlertSuccess = function Aras_AlertSuccess(msg, argwin) {
	this.AlertInternal(msg, "success", argwin, new AlertInternalCustomizationBase());
}

Aras.prototype.AlertWarning = function Aras_AlertSuccess(msg, argwin) {
	this.AlertInternal(msg, "warning", argwin, new AlertInternalCustomizationBase());
}

Aras.prototype.AlertAboutSession = function Aras_AlertAboutSession() {
	var formNd = this.getItemByName("Form", "MySession", 0);
	if (formNd) {
		var param = {
			title: "About My Session",
			formId: formNd.getAttribute("id"),
			aras: this
		};
		var width = this.getItemProperty(formNd, "width") || 500;
		var height = this.getItemProperty(formNd, "height") || 320;

		var win = this.getMostTopWindowWithAras(window);
		this.modalDialogHelper.show("DefaultPopup", win.main || win, param, { dialogWidth: width, dialogHeight: height }, "ShowFormAsADialog.html");
	}
}

Aras.prototype.AlertAbout = function Aras_AlertAbout(argwin) {
	this.AlertInternal(this.aboutInnovatorMessage, "about", argwin, new AlertInternalCustomizationBase());
}

Aras.prototype.AlertInternal_1 = function Aras_AlertInternal_1(argwin) {
	var win = window;
	if (argwin && !this.isWindowClosed(argwin)) {
		win = argwin;
	}

	var doc = null;
	try {
		doc = win.document;
	}
	catch (excep) {
	}

	var actEl = null;
	if (doc) {
		actEl = doc.activeElement;
	}

	if (actEl && actEl.tagName == "FRAMESET") {
		var frms = doc.getElementsByTagName("FRAME");
		if (frms.length > 0) {
			actEl = frms[0];;
		}
	}

	try {
		if (actEl) {
			actEl.focus();
		}
	}

	catch (excep) {
	}
	try {
		win.focus();
	}
	catch (excep) {
	}

	return win;
}

/*
Displays a confirmation dialog box which contains a message and OK and Cancel buttons.
Parameters:
message - string. Message to display in a dialog.
win - parent window for the dialog.

Returns:
true  - if a user clicked the OK button.
false - if a user clicked Cancel button.
*/
Aras.prototype.confirm = function Aras_confirm(message, ownerWindow, callback) {
	var params = {
		buttons: {
			btnYes: this.getResource("", "common.ok"),
			btnCancel: this.getResource("", "common.cancel")
		},
		defaultButton: "btnCancel",
		aras: this,
		message: message,
		callback: callback
	};
	var res = this.modalDialogHelper.show(callback ? "DefaultPopup" : "DefaultModal", ownerWindow || window, params, {
		dialogWidth: 300,
		dialogHeight: 200,
		center: true
	}, "groupChgsDialog.html");
	return res === "btnYes";
}

Aras.prototype.prompt = function Aras_prompt(msg, defValue, argwin) {
	if (this.getCommonPropertyValue("exitWithoutSavingInProgress")) {
		return;
	}
	var win = this.AlertInternal_1(argwin);

	var htmlContent =
		"<head>" +
		"	<link rel=\"stylesheet\" href=\"../styles/default.css\">" +
		"	<style type=\"text/css\">@import \"../javascript/include.aspx?classes=common.css\";</style>" +
		"</head>" +
		"<div id=\"dialogContent\" style=\"height: 160px; margin: 0px; overflow: hidden; left:0px; top:0px; right:0px; bottom:0px; padding: 10px;\">" +
			"<div style=\"position:relative; margin-bottom:10px; text-align:right;\">" +
				"<span style=\"position: absolute; left:0px; font-size: 14px;\" class=\"sys_f_label\">Script Prompt:</span>" +
				"<input type=\"button\" style=\"width: 100px; margin-right: 10px;\" id=\"ok\" class=\"btn\" onclick=\"returnValue=textInput.value; window.close()\" value=\"" + this.getResource("", "common.ok") + "\"/>" +
			"</div>" +
			"<div style=\"position: relative; margin-bottom: 5px; text-align:right;\">" +
				"<input type=\"button\" style=\"width: 100px; margin-right: 10px;\" id=\"cancel\" class=\"btn cancel_button\" onclick=\"returnValue=null; window.close()\" value=\"" + this.getResource("", "common.cancel") + "\"/>" +
			"</div>" +
			"<div style=\"position: relative; margin-bottom: 10px;\">" +
				"<div id=\"msg\" style=\"margin-bottom: 5px; font-size: 14px;\" class=\"sys_f_label\">" + msg + "</div>" +
				"<input style=\"position: relative; width:468px; \" id=\"textInput\" value=" + defValue + ">" +
			"</div>" +
		"</div>";

	var title = this.getResource("", "aras_object.aras_user_prompt");
	var scriptContent =
		"<script>" +
		"onload = function onload_handler(){\n" +
		"	document.title = \"" + title + "\";" +
		"	document.body.addEventListener(\"keydown\", function(evt){\n" +
		"		var keyCode = evt.keyCode || evt.which;\n" +
		"		if(keyCode == 27){\n" +
		"			window.returnValue = null;\n" +
		"			window.close()}\n" +
		"		});\n" +
		"	var textInput = document.getElementById('textInput');\n" +
		"	if (textInput) {\n" +
		"		textInput.focus();\n" +
		"	}\n" +
		"	window.focus();\n" +
		"}\n" +
		"onunload = function onunload_handler(){\n" +
		"	if (window.returnValue==undefined) window.returnValue = null;" +
		"}\n" +
		"</script>";
	function writeContent(targetWindow) {
		var doc = targetWindow.document;
		doc.write(htmlContent);
		doc.write(scriptContent);
	}

	var params = {};
	params.writeContent = writeContent;
	params.aras = this;

	var options = {
		dialogWidth: 500,
		dialogHeight: 150
	};

	var res = this.modalDialogHelper.show("DefaultModal", win, params, options, "modalDialog.html");
	var w = this.getMainWindow();
	if (w && w.DoFocusAfterAlert) {
		w.focus();
	}

	return res;
}

Aras.prototype.AlertInternal = function Aras_AlertInternal(msg, type, argwin, customization) {
	// method used as content builder for alert dialog
	if (this.getCommonPropertyValue("exitWithoutSavingInProgress")) {
		return;
	}
	var win = this.AlertInternal_1(argwin),
		imageSrc, title,
		imageTDStyle = "padding: 20px 10px 0px 10px",
		imageStyle = "",
		msgTDStyle = "padding-top:26px; padding-bottom:12px; padding-right:10px;";

	switch (type) {
		case "success":
			var successmessage_type = this.getPreferenceItemProperty("Core_GlobalLayout", null, "core_successmessage_type");
			title = this.getResource("", "aras_object.aras_innovator");
			imageStyle = "max-width: 32px; max-height: 32px;";
			imageSrc = this.getBaseURL() + "/images/Message.svg";

			if ("Popup" == successmessage_type) {
				var statusbarFrame;
				var topWnd = this.getMostTopWindowWithAras(window);
				if (topWnd.name == this.mainWindowName) {
					statusbarFrame = document.getElementById("main").contentWindow.frames["statusbar"];
				}
				else {
					statusbarFrame = document.frames["statusbar"];
				}

				if (statusbarFrame) {
					var popupNotification = statusbarFrame.contentWindow.PopupNotification.GetNotificationControl();
					popupNotification.AddOrUpdate(popupNotification.Count, msg, imageSrc, 1);
					var timeClose = parseInt(this.getPreferenceItemProperty("Core_GlobalLayout", null, "core_popupmessage_timeout"));
					statusbarFrame.contentWindow.PopupNotification.ShowPopup(timeClose);
					return;
				}
			}
			break;
		case "about":
			title = this.getResource("", "aras_object.about_aras_innovator");
			imageSrc = "../images/aras-innovator.svg";
			imageStyle = "width: 225px; height: 40px;";
			imageTDStyle = "padding-left:18px; padding-top: 15px;";
			msgTDStyle += " padding-left:40px;";
			break;
		case "error":
			title = this.getResource("", "aras_object.error");
			imageStyle = "max-width: 48px; max-height: 48px;";
			imageSrc = "../images/Error.svg";
			break;
		case "warning":
			title = this.getResource("", "common.warning");
			imageStyle = "max-width: 48px; max-height: 48px;";
			imageSrc = "../images/Warning.svg";
			break;
	}

	var htmlContent =
	"<head>\n" +
	"<base href='" + this.getScriptsURL() + "'/>\n" +
	"<title>" + title + "</title>\n" +
	"<style>\n" +
	"	@import '../javascript/include.aspx?classes=common.css';\n\n" +
	"	@import '../styles/default.css';\n\n" +
	"	html, body {width:100%; height:100%; margin:0px; padding:0px; border:none; overflow:hidden;}\n" +
	"	.btn {width:100px;}\n" +
	"	#generalContent {overflow:hidden; position:absolute; top:0px; left:0px; right:0px; bottom:0px;}\n" +
	"	#additionalContent {position:absolute; width:100%; top:0px; bottom:0px; border-top: 1px solid #b3b3b3;}\n" +
	"	#msg {font-size:13px;}\n" +
	"</style>";

	htmlContent +=
	"<script type=\"text/javascript\">\n" +
	"	var preferredWidth;\n" +
	"	var preferredHeight;\n" +
	"	var additionalContentExists = Boolean(" + customization.showDetails + ");\n" +
	"	var additionalContentHeight = additionalContentExists ? 200 : 0;\n" +
	"	var resizeDialog_tmtHandle;\n" +
	"	function resizeDialog() {\n" +
	"		//this clearTimeout helps display dialogs better in IE9\n" +
	"		clearTimeout(resizeDialog_tmtHandle);\n" +
	"		var outerWidth;\n" +
	"		try {\n" +
	"			outerWidth = window.outerWidth;\n" +
	"		}\n" +
	"		catch (e) {\n" +
	"			if (e.number === -2147467259 && window.closed) {\n" +
	"				//on IE when dialog is being opened the window object is 'closed' and access to window.outerWidth produces 'Unspecified error'\n" +
	"				//Thus try to call resizeDialog a little bit later when IE is ready for that.\n" +
	"				resizeDialog_tmtHandle = setTimeout(resizeDialog, 0);\n" +
	"				return;\n" +
	"			}\n" +
	"			//otherwise throw the exception further\n" +
	"			throw e;\n" +
	"		}\n" +
	"		var documentElement = document.documentElement;\n" +
	"		var generalContent = document.getElementById('generalContent');\n" +
	"		var dw = window.outerWidth - window.innerWidth;\n" +
	"		var dh = window.outerHeight - window.innerHeight;\n" +
	"		var width = generalContent.scrollWidth + dw;\n" +
	"		var height = generalContent.scrollHeight + dh;\n" +
	"		generalContent.style.height = generalContent.scrollHeight + 'px';\n" +
	"		if (additionalContentExists) {\n" +
	"			var additionalContent = document.getElementById('additionalContent');\n" +
	"			height += currentInfoAreaVisibility ? additionalContentHeight : 0;\n" +
	"			additionalContent.style.top = generalContent.scrollHeight + 'px';\n" +
	"		}\n" +
	"		window.dialogArguments.aras.browserHelper.resizeWindowTo(window, width, height);\n" +
	"	}\n" +
	"	onload = function onload_handler() {\n" +
	"		setTimeout(function () {\n" +
	"			dialogArguments.aras.getMostTopWindowWithAras(dialogArguments.win).focus();\n" +
	"		},0);\n" +
	"		resizeDialog();\n" +
	"		preferredWidth = window.outerWidth;\n" +
	"		preferredHeight = window.outerHeight;\n" +
	"		var okButton = document.getElementById('ok');\n" +
	"		if (okButton) okButton.focus();\n" +
	"	}\n" +
	"</script>\n" +
	"</head>\n" +
	"<body onkeydown='if (event.keyCode === 27) window.close()' scroll='no'>\n" +
	"<div id='generalContent'>\n" +
	"	<div id='infoContainer'>" +
	"		<table border='0' cellspacing='0' cellpadding='0'>" +
	"			<tr>" +
	"				<td valign='top' style='" + imageTDStyle + "'>" +
	"					<img src='" + imageSrc + "' style='" + imageStyle + "'>" +
	"				</td>";

	if (type === "about") {
		htmlContent +=
		"			</tr>" +
		"			<tr>";
	}

	htmlContent +=
	"				<td style='" + msgTDStyle + "'>" +
	"					<div id='msg'>" + msg + "</div>" +
	"				</td>" +
	"			</tr>" +
	"		</table>" +
	"	</div>" +
	"	<div id='buttonContainer' style='position:relative; padding: 10px;'>" +
	"		<table style='width:100%;' cellspacing='0' cellpadding='0'>" +
	"			<tr>" +
	"				<td valign='top' align='" + customization.buttonsCellAlign + "'>" +
					customization.DrawButtons(this) +
	"				</td>" +
	"			</tr>" +
	"		</table>" +
	"	</div>" +
	"</div>";

	// additional content building
	if (customization.showDetails) {
		htmlContent +=
		"<div id='additionalContent'>" +
		"	<div style='position:absolute; top:0px; bottom:2px; left:2px; right:2px;'>" +
				customization.DrawAdditionalContent(this) +
		"	</div>" +
		"</div>";
	}

	htmlContent += "</body>";

	function writeContent(w) {
		var doc = w.document;
		doc.write(htmlContent);
	}

	var params = customization.GetDialogArguments(this);
	params.writeContent = writeContent;
	params.aras = this;
	params.win = win;

	var options = {
		dialogWidth: 500,
		dialogHeight: 100,
		resizable: true
	};

	var res = this.modalDialogHelper.show("DefaultModal", win, params, options, "modalDialog.html");

	var w = this.getMainWindow();
	if (w && w.DoFocusAfterAlert) {
		w.focus();
	}

	return res;
}

/*-- evalItemMethod
*
*   Method to evaluate JavaScript stored as a Method item on the client side.
*   methodName = the name of the Method item
*   itemDom    = the item dom
*   addArgs    = optional argument. Object with any additional parameters.
*/
Aras.prototype.evalItemMethod = function Aras_evalItemMethod(methodName, itemNode, addArgs) {
	var methodNd = this.MetadataCache.GetClientMethod(methodName, "name").results.selectSingleNode(this.XPathResult("/Item"));
	if (!methodNd) {
		this.AlertError(this.getResource("", "aras_object.erroe_eval_item_method", methodName), "", "");
		return;
	}

	var methodCode = this.getItemProperty(methodNd, "method_code"),
		methodNameUpper = methodName.toUpperCase();

	var methodNamesWithTopAras = ["PE_ADDCHANGEITEM", "PE_CHOOSECMITEM", "PE_GETSELECTEDITEMS", "PE_CHOOSECMOPTIONS", "PE_COMPLETENESSCHECK", "PE_LAUNCHAMLEDITOR", "AFTERPROJECTUPDATECLIENT",
		"PM_CALL_SERVER_SIDE_SCHEDULE", "PROJECT_CREATEPROJFROMTEMPLATE", "PROJECT_CREATEPROJECTFROMPROJECT", "PROJECT_CREATETEMPLATEFROMPROJ", "PROJECT_CREATETEMPLATEFROMTEMPL",
		"PROJECT_SHOWGANTTCHART", "PROJECT_CFGSEARCHDIALOG4ASSGNMTS", "PROJECTTIMEREPORT"];
	if (methodNamesWithTopAras.indexOf(methodNameUpper) !== -1) {
		methodCode = methodCode.replace(/\btop.aras\b/g, "aras");
		var methodNamesWithTop = ["PE_COMPLETENESSCHECK", "PE_GETSELECTEDITEMS", "PE_CHOOSECMITEM", "PROJECT_CFGSEARCHDIALOG4ASSGNMTS"];
		if (methodNamesWithTop.indexOf(methodNameUpper)) {
			methodCode = methodCode.replace(/\btop\b/g, "aras.getMostTopWindowWithAras(window)");
		}
	}

	var self = this;

	function evalItemMethod_work() {
		var item = self.newIOMItem();
		if (itemNode) {
			item.dom = itemNode.ownerDocument;
			item.node = itemNode;
		}
		item.setThisMethodImplementation(new Function("inDom", "inArgs", methodCode));

		return item.thisMethod(item.node, addArgs);
	}

	var compatibilityMode = MethodCompatibilityMode.create(this.commonProperties.innovatorUpdateInfo.version, this.commonProperties.clientRevision, this);
	try {
		compatibilityMode.enable();

		if (!this.DEBUG) {
			try {
				return (evalItemMethod_work());
			}
			catch (excep) {
				this.AlertError(this.getResource("", "aras_object.method_failed", methodName), this.getResource("", "aras_object.aras_object", excep.number, excep.description), this.getResource("", "common.client_side_err"));
				return;
			}
			finally {
			}
		}
		else {
			return (evalItemMethod_work());
		}
	}
	finally {
		compatibilityMode.disable();
	}
}

/*-- applyMethod
*
*   Method to invoke an Innovator Method on the server side.
*   action = the server action to be performed
*   body   = the message body for the action
*
*/
Aras.prototype.applyMethod = function Aras_applyMethod(action, body) {
	var res = this.soapSend("ApplyMethod", "<Item type=\"Method\" action=\"" + action + "\">" + body + "</Item>");
	if (res.getFaultCode() != 0) {
		this.AlertError(res);
		return false;
	}
	return res.getResultsBody();
}

/*-- applyItemMethod
*
*   Method to invoke an action on an item on the server side.
*   action = the the server action to be performed, which is the Innovator Method name
*   type   = the ItemType name
*   body   = the message body for the action
*
*/
Aras.prototype.applyItemMethod = function (action, type, body) {
	var res = this.soapSend("ApplyItem", "<Item type=\"" + type + "\" action=\"" + action + "\">" + body + "</Item>");

	if (res.getFaultCode() != 0) {
		this.AlertError(res);
		return false;
	}
	return res.getResultsBody();
}

/*-- applyAML
*
*   Method to apply an item on the server side.
*   body = the message body for the item
*
*/
Aras.prototype.applyAML = function (body) {
	var res = this.soapSend("ApplyAML", body);
	if (res.getFaultCode() != 0) {
		this.AlertError(res);
		return false;
	}
	return res.getResultsBody();
}

/*-- compileMethod
*
*   Method to compile VB or C# code on the server side to check syntax.
*   body = the method item xml
*
*/
Aras.prototype.compileMethod = function (body) {
	var res = this.soapSend("CompileMethod", body);
	if (res.getFaultCode() != 0) {
		this.AlertError(res);
		return "";
	}
	return res.getResultsBody();
}

/*-- applyItem
*
*   Method to apply an item on the server side.
*   body = the message body for the item
*
*/
Aras.prototype.applyItem = function Aras_applyItem(body) {
	var res = this.soapSend("ApplyItem", body);
	if (res.getFaultCode() != 0) {
		this.AlertError(res);
		return "";
	}
	return res.getResultsBody();
}

/*-- invokeAction
*
*   Invoke the Method associated with an action.
*   action = the the Action item
*
*/
Aras.prototype.invokeAction = function Aras_invokeAction(action, itemTypeID, thisSelectedItemID) {
	with (this) {
		var statusId = showStatusMessage("status", getResource("", "aras_object.invoking_action"), system_progressbar1_gif);
		var name = getItemProperty(action, "name");
		var actionType = getItemProperty(action, "type");
		var target = getItemProperty(action, "target");
		var location = getItemProperty(action, "location");
		var body = getItemProperty(action, "body");
		var onCompleteMethodName = this.getItemPropertyAttribute(action, "on_complete", "keyed_name");
		var itemTypeName = null;

		if (itemTypeID != undefined && itemTypeID) {
			itemTypeName = getItemTypeName(itemTypeID);
		}

		var methodName = this.getItemPropertyAttribute(action, "method", "keyed_name");
		var results;
		var selectedItem;

		if (actionType == "item") {
			var item_query = getItemProperty(action, "item_query");
			var xslt = "<xsl:stylesheet xmlns:xsl='http://www.w3.org/1999/XSL/Transform' version='1.0'>" +
				"<xsl:output method='xml' omit-xml-declaration='yes' standalone='yes' indent='yes'/>" +
				"<xsl:template match='/'>" +
				"<xsl:apply-templates/></xsl:template>" +
				"<xsl:template match='Item'>" + item_query + "</xsl:template>" +
				"</xsl:stylesheet>";
			var itemDom = createXMLDocument();
			var doApplyQuery = false;

			// IR-016631 "InvokeAction works wrong."
			selectedItem = itemsCache.getItemByXPath("//Item[@id='" + thisSelectedItemID + "' and (@isDirty='1' or @isTemp='1')]");

			// if item isn't dirty and isn't temp
			if (!selectedItem) {
				// retrieve item from server
				selectedItem = getItemById(itemTypeName, thisSelectedItemID, 0);

				// seems, item was deleted
				if (!selectedItem) {
					AlertError(this.getResource("", "aras_object.item_not_found", itemTypeName, thisSelectedItemID));
					return;
				}

				if (item_query != "") {
					itemDom.loadXML(selectedItem.xml);
					doApplyQuery = true;
				}
			}

			//request selectedItem from server via item_query transformation
			if (doApplyQuery) {
				// if item_query is invalid string(__is_new__ for example), then this request do not return anything and value from cache will be used.
				var query = applyXsltString(itemDom, xslt);
				if (query) {
					var result = this.soapSend("ApplyItem", query);
					//if nothing was received, then use item from cache or if it is not existed in cache use temp item.
					if (result.getFaultCode() != 0) {
						selectedItem = itemDom.documentElement;
					}
					else {
						var resultItem = result.getResult().selectSingleNode("Item");
						mergeItem(selectedItem, resultItem);
					}
				}
			}

			if (location == "server") {
				var inDom = createXMLDocument();
				inDom.loadXML(selectedItem.xml);
				var inItem = inDom.selectSingleNode("//Item");
				inItem.setAttribute("action", methodName);
				var res = soapSend("ApplyItem", inItem.xml);
				if (res.getFaultCode() != 0) {
					this.AlertError(res);
					clearStatusMessage(statusId);
					return false;
				}
				results = res.getResultsBody();
			}
			else if (location == "client") {
				var selectedItemXmlBeforeAction = selectedItem.xml;
				var itemWasChangedDurinAction = false;

				results = evalItemMethod(methodName, selectedItem, null);

				if (selectedItem) {
					itemWasChangedDurinAction = (selectedItemXmlBeforeAction !== selectedItem.xml);

					if (itemWasChangedDurinAction && this.isLocked(selectedItem)) {
						selectedItem.setAttribute("isDirty", "1");
						this.uiReShowItemEx(thisSelectedItemID, selectedItem);
					}
				}
			}

			if (onCompleteMethodName) {
				var methodArgs = new Object();
				methodArgs.results = results;
				results = evalItemMethod(onCompleteMethodName, selectedItem, methodArgs);
			}
		}
		else if (actionType == "itemtype" || actionType == "generic") {
			if (location == "server") {
				if (body != "" && actionType == "itemtype") {
					results = applyItemMethod(methodName, itemTypeName, body);
				}
				else if (body != "" && actionType == "generic") {
					results = applyMethod(methodName, body);
				}
				else {
					if (body == "") {
						body = "<id>" + thisSelectedItemID + "</id>";
					}
					results = applyMethod(methodName, body);
				}
			}
			else if (location == "client") {
				var methodNode = this.MetadataCache.GetClientMethod(methodName, "name").results.selectSingleNode(this.XPathResult("/Item"));
				results = evalMethod(methodName, body, methodNode);
				if (onCompleteMethodName) {
					var methodArgs = new Object();
					methodArgs.results = results;
					results = evalItemMethod(onCompleteMethodName, body, methodArgs);
				}
			}
		}

		var doc;

		if (location == "server") {
			var subst = createXMLDocument();
			subst.loadXML(results);

			if (subst.documentElement) {
				var content = subst.documentElement.text;
			}
			else {
				var content = "";
			}
			subst = null;
		}
		else {
			var content = results;
		}

		switch (target) {
			case "window":
				var width = 710; // This is a printable page width.
				var height = screen.height / 2;
				var x = (screen.height - height) / 2;
				var y = (screen.width - width) / 2;
				var args = "scrollbars=yes,resizable=yes,status,width=" + width + ",height=" + height + ",left=" + y + ",top=" + x;
				var win = open("", "", args);
				this.browserHelper.hidePanels(win, ["locationbar"]);
				win.focus();
				this.browserHelper.hidePanels(win, ["locationbar"]);
				doc = win.document.open();
				doc.write(content);
				doc.close();
				doc.title = name;
				break;
			case "main":
				var mainWindow = getMainWindow();
				doc = mainWindow.main.work.document.open();
				doc.write(content);
				doc.close();
				break;
			case "none":
				break;
			case "one window":
				var targetWindow = getActionTargetWindow(name);
				doc = targetWindow.document;
				// if content is very large doc.write(content) falls with errors(out of memory, example)
				// so write content by parts
				var contentLength = 250000;
				var cycles = Math.ceil(content.length / contentLength);
				for (var i = 0; i < cycles; i++) {
					doc.write(content.substring(i * contentLength, (i + 1) * contentLength));
				}
				doc.write("<br />");
				break;
		}
		clearStatusMessage(statusId);
	}
}

Aras.prototype.runReport = function Aras_runReport(report, itemTypeID, item) {
	if (!report) {
		this.AlertError(this.getResource("", "aras_object.failed_get_report"), "", "");
		return;
	}

	var report_location = this.getItemProperty(report, "location");
	var results;

	if (report_location == "client") {
		results = this.runClientReport(report, itemTypeID, item);
	}
	else if (report_location == "server") {
		results = this.runServerReport(report, itemTypeID, item);
		var tmpDom = this.createXMLDocument();
		if (results) {
			tmpDom.loadXML(results);
			results = tmpDom.documentElement.text;
		}
	}
	else if (report_location == "service") {
		var url = this.getServerBaseURL() + "RSGateway.aspx?irs:Report=" + this.getItemProperty(report, "name");
		var report_query = this.getItemProperty(report, "report_query");
		if (report_query) {
			var xslt = "" +
			"<?xml version='1.0' encoding='utf-8'?>" +
			"<xsl:stylesheet xmlns:xsl='http://www.w3.org/1999/XSL/Transform' version='1.0'>" +
			"	<xsl:output method='xml' omit-xml-declaration='yes' standalone='yes' indent='yes'/>" +
			"	<xsl:template match='/'><xsl:apply-templates/></xsl:template>" +
			"	<xsl:template match='Item'><result>" + report_query + "</result></xsl:template>" +
			"</xsl:stylesheet>";
			var itemDom = this.createXMLDocument();
			if (item) {
				itemDom.loadXML(item.xml);
			} else {
				var typeName;
				if (itemTypeID) {
					typeName = this.getItemTypeName(itemTypeID);
					itemDom.loadXML("<Item type='" + typeName + "' id=''/>");
					item = true;
				}

			}

			var qryString = report_query;
			if (item) {
				qryString = this.applyXsltString(itemDom, xslt);
				if (qryString) {
					tmpDom = this.createXMLDocument();
					tmpDom.loadXML(qryString);
					qryString = tmpDom.documentElement.text;
				}
			}
			if (qryString) {
				url += "&" + qryString;
			}
		}
	}

	if (typeof (results) === "undefined") {
		results = "";
	}
	else if (typeof (results) !== "string") {
		results = results.toString();
	}
	// Transformation for vault-images
	var substr = "vault:\/\/\/\?fileid\=";
	var fileIdpos = results.toLowerCase().indexOf(substr);
	while (fileIdpos != -1) {
		var vaultUrl = results.substring(fileIdpos, fileIdpos + substr.length + 32);
		fileIdpos += substr.length;
		var fileId = vaultUrl.replace(/vault:\/\/\/\?fileid\=/i, "");
		var vaultUrlwithToken = this.IomInnovator.getFileUrl(fileId, this.Enums.UrlType.SecurityToken);
		results = results.replace(vaultUrl, vaultUrlwithToken);
		var fileIdpos = results.toLowerCase().indexOf(substr, fileIdpos + 32);
	}

	// Add element <base> in result for correct loading picture.
	var searchBaseTagRegExp = /<head[^]*?>[^]*?<base[^]*?>[^]*?<\/head>/i;
	if (!searchBaseTagRegExp.test(results)) {
		var base = "<base href=\"" + this.getScriptsURL() + "\"></base>";
		results = results.replace(/<(head[^]*?)\/>/i, "<$1></head>");
		results = results.replace(/(<head[^]*?>)([^]*?<\/head>)/i, "$1" + base + "$2");
		if (!searchBaseTagRegExp.test(results)) {
			results = results.replace(/<html[^]*?>/i, "$0" + "<head>" + base + "</head>");
		}
	}

	this.targetReport(report, report_location, url, results);
}

Aras.prototype.targetReport = function (report, report_location, url, results, doReturnWindow) {
	var target = this.getItemProperty(report, "target") || "window";
	var doc = null;
	if (target == "window") {
		var width = 800, // This is a printable page width.
			height = screen.availHeight / 2,
			x = (screen.availHeight - height) / 2,
			y = (screen.availWidth - width) / 2,
			args = "scrollbars=yes,resizable=yes,status=yes,width=" + width + ",height=" + height + ",left=" + y + ",top=" + x;

		if (report_location == "service") {
			var win = open(url, "", args);
			this.browserHelper.hidePanels(win, ["locationbar"]);
			if (doReturnWindow) {
				return win;
			}
			return;
		}

		var win = open("", "", args);
		doc = win.document.open();
		var name = this.getItemProperty(report, "label");
		if (!name) {
			name = this.getItemProperty(report, "name");
		}
		name = this.getResource("", "aras_object.report_with_label", name);
		doc.write(results);
		doc.close();
		win.document.title = name;
		this.browserHelper.hidePanels(win, ["locationbar"]);
		if (doReturnWindow) {
			return win;
		}
	}
	else if (target == "main") {
		var mainWindow = this.getMainWindow();

		if (report_location == "service") {

			var container = "<iframe width='100%' height='100%' frameborder='0' src='" + url + "'></iframe>";
			doc = mainWindow.main.work.document.open();
			doc.write(container);
			doc.close();
			return;
		}
		doc = mainWindow.main.work.document.open();
		doc.write(results);
		doc.close();
	}
	else if (target == "none") {
		return;
	}
	else if (target == "one window") {
		var targetWindow;

		if (report_location == "service") {
			targetWindow = this.getActionTargetWindow(name, url);
			return;
		}

		targetWindow = this.getActionTargetWindow(name);
		doc = targetWindow.document;
		doc.write(results);
		doc.write("<br>");
	}
};

/*-- runClientReport
*
*   Invoke the Method associated with a report.
*   report = the the Report item
*
*   parameter itemTypeID is ignored
*/
Aras.prototype.runClientReport = function Aras_runClientReport(report, itemTypeID, item) {
	if (!report) {
		this.AlertError(this.getResource("", "aras_object.failed_get_report"), "", "");
		return;
	}

	var results = "";
	var selectedItem = item;

	report = this.getItemFromServer("Report", report.getAttribute("id"), "label,name,description,report_query,target,type,xsl_stylesheet,location,method(name,method_type,method_code)").node;

	var reportType = this.getItemProperty(report, "type");
	var methodName = this.getItemPropertyAttribute(report, "method", "keyed_name");

	if (methodName) {
		results = reportType == "item" ? this.evalItemMethod(methodName, selectedItem) : this.evalMethod(methodName, "");
	}
	else {
		var report_query = this.getItemProperty(report, "report_query");

		if (!report_query) {
			if (reportType == "item") {
				report_query = "<Item typeId='{@typeId}' id='{@id}' action='get' levels='1'/>";
			}
			else if (reportType == "itemtype") {
				report_query = "<Item typeId='{@typeId}' action='get'/>";
			}
			else if (reportType == "generic") {
				report_query = "";
			}
		}

		if (report_query) {
			var xslt = "<xsl:stylesheet xmlns:xsl='http://www.w3.org/1999/XSL/Transform' version='1.0'>" +
				"<xsl:output method='xml' omit-xml-declaration='yes' standalone='yes' indent='yes'/>" +
				"	<xsl:template match='/'>" +
				"		<xsl:apply-templates/>" +
				"	</xsl:template>" +
				"	<xsl:template match='Item'>" + report_query + "</xsl:template>" +
				"</xsl:stylesheet>";
			var itemDom = this.createXMLDocument();

			if (item) {
				itemDom.loadXML(item.xml);
			}

			var query = this.applyXsltString(itemDom, xslt);
			if (query) {
				results = this.applyItem(query);
			}
			else {
				results = this.applyItem(report_query);
			}

			var xsl_stylesheet = this.getItemProperty(report, "xsl_stylesheet");
			if (xsl_stylesheet) {
				var xslt_stylesheetDOM = this.createXMLDocument();
				xslt_stylesheetDOM.loadXML(xsl_stylesheet);

				var toolLogicNode = xslt_stylesheetDOM.selectSingleNode("//script[@userData=\"Tool Logic\"]");
				if (toolLogicNode) {
					toolLogicNode.parentNode.removeChild(toolLogicNode);
				}

				xsl_stylesheet = xslt_stylesheetDOM.xml;

				var res = this.createXMLDocument();
				res.loadXML(results);

				if (reportType == "item") {
					res.loadXML("<Result>" + results + "</Result>");
				}
				else {
					res.loadXML(results);
				}

				results = this.applyXsltString(res, xsl_stylesheet);
			}
		}
	}

	return results;
}

Aras.prototype.runServerReport = function Aras_runServerReport(report, itemTypeID, item) {
	if (!report) {
		this.AlertError(this.getResource("", "aras_object.failed_get_report"), "", "");
		return;
	}

	var report_name = this.getItemProperty(report, "name");

	var AML = "";
	if (item) {
		var item_copy = item.cloneNode(true);
		if (itemTypeID) {
			item_copy.setAttribute("typeId", itemTypeID);
		}
		AML = item_copy.xml;
	}
	else if (itemTypeID) {
		AML = "<Item typeId='" + itemTypeID + "'/>";
	}

	var body = "<report_name>" + report_name + "</report_name><AML>" + AML + "</AML>";
	var results = this.applyMethod("Run Report", body);

	return results;
}

/*-- setNodeElementWithAction
*
*   Method to set the value of an element on the node
*   and set action attribute on the node, if it is absent.
*   The item is the node and the property is the element.
*   node    = the item object
*   element = the property to set
*   value   = the value for the property
*   apply_the_change_to_all_found = flag to signal if the change must be common or local
*   action - action attribute to be set on the node. By default, if action is not defined
*   and node action attribute != 'add' or != 'create' we set action 'update'
*/
Aras.prototype.setNodeElementWithAction = function Aras_setNodeElementWithAction(srcNode, element, value, apply_the_change_to_all_found, action) {
	this.setNodeElement(srcNode, element, value, apply_the_change_to_all_found);

	if (!srcNode.getAttribute("action") || (srcNode.getAttribute("action") != "add") && (srcNode.getAttribute("action") != "create")) {
		if (action) {
			srcNode.setAttribute("action", action);
		}
		else {
			srcNode.setAttribute("action", "update");
		}
	}
}

/*-- setItemProperty/setNodeElement
*
*   Method to set the value of an element on the node.
*   The item is the node and the property is the element.
*   node    = the item object
*   element = the property to set
*   value   = the value for the property
*   apply_the_change_to_all_found = flag to signal if the change must be common or local
*/
Aras.prototype.setNodeElement = Aras.prototype.setItemProperty = function Aras_setItemProperty(srcNode, element, value, apply_the_change_to_all_found, itemTypeNd) {
	if (apply_the_change_to_all_found === undefined) {
		apply_the_change_to_all_found = true;
	}

	var id = srcNode.getAttribute("id");
	var propertyName = element;
	var propertyValue = value;
	if (propertyValue == null) {
		propertyValue = "";
	}

	function isEmptyElement(xmlElem) {
		if (xmlElem) {
			if (xmlElem.hasChildNodes() || xmlElem.attributes.length != 0) {
				return false;
			}
		}
		return true;
	}

	function getPropertyDataType(arasObj, itemTypeName, propertyName) {
		var itemType = itemTypeNd ? itemTypeNd : arasObj.getItemTypeForClient(itemTypeName).node;
		if (!itemType) {
			return "";
		}

		var data_type = itemType.selectSingleNode("Relationships/Item[@type=\"Property\"][name=\"" + propertyName + "\"]/data_type");
		if (data_type) {
			return data_type.text;
		}

		return "";
	}

	var currDate = new Date();
	var LastModifiedOn = currDate.getTime();
	function setItemProperty_internal(arasObj, node) {
		var elm = node.selectSingleNode(propertyName);
		if (!elm) {
			elm = node.appendChild(node.ownerDocument.createElement(propertyName));
		}
		if (elm.getAttribute("is_null") != "") {
			elm.removeAttribute("is_null");
		}

		var elementWasEmpty = isEmptyElement(elm);

		var item_Type = "";
		var valueIsNode;
		if (propertyValue.xml == undefined) {
			valueIsNode = false;
			elm.text = propertyValue;
		}
		else {
			valueIsNode = true;
			elm.text = "";

			var value2use = propertyValue;

			//check if we insert node into itself
			item_Type = propertyValue.getAttribute("type");
			var item_ID = propertyValue.getAttribute("id");
			var propertyValueClones = value2use.selectNodes("ancestor-or-self::Item[@type='" + item_Type + "' and @id='" + item_ID + "']");
			var isACopyOfParent = false;
			for (var i = 0; i < propertyValueClones.length; i++) {
				if (propertyValue == propertyValueClones[i]) {
					isACopyOfParent = true;
					break;
				}
			}

			if (isACopyOfParent || propertyValueWasTransfered) {
				value2use = value2use.cloneNode(true);
			}

			propertyValueWasTransfered = true;
			elm.appendChild(value2use);
		}

		var updateKeyedName = false;
		if (elm.getAttribute("keyed_name") != null) {
			updateKeyedName = true;
		}
		else if (elementWasEmpty) {
			var srcItemType = srcNode.getAttribute("type");
			if (srcItemType) {
				if (getPropertyDataType(arasObj, srcItemType, propertyName) == "item") {
					updateKeyedName = true;
				}
			}
		}

		if (updateKeyedName) {
			var newKeyedName;
			if (valueIsNode) {
				newKeyedName = arasObj.getKeyedNameEx(propertyValue);
			}
			else {
				var propertyItemType = elm.getAttribute("type");
				if (propertyItemType == null) {
					propertyItemType = "";
				}
				newKeyedName = arasObj.getKeyedName(propertyValue, propertyItemType);
			}

			elm.setAttribute("keyed_name", newKeyedName);

			elm.removeAttribute("discover_only");
			if (propertyValue) {
				var cachedItem = null;
				if (item_Type == "ItemType") {
					cachedItem = arasObj.getItemTypeDictionary((valueIsNode ? propertyValue.getAttribute("id") : propertyValue), "id");
					if (cachedItem && cachedItem.node) {
						cachedItem = cachedItem.node;
					}
				}
				else {
					cachedItem = arasObj.itemsCache.getItem(valueIsNode ? propertyValue.getAttribute("id") : propertyValue);
				}

				if (cachedItem && cachedItem.getAttribute("discover_only") == "1") {
					elm.setAttribute("discover_only", "1");
				}
			}

			if (valueIsNode) {
				var oldKeyedName = arasObj.getItemProperty(propertyValue, "keyed_name");
				if (!oldKeyedName && newKeyedName) {
					arasObj.setItemProperty(propertyValue, "keyed_name", newKeyedName, false);
				}
			}
		}

		node.setAttribute("LastModifiedOn", LastModifiedOn);
	}

	var node;
	var skip_src_node = false;
	var nodes = this.itemsCache.getItemsByXPath("//Item[@id='" + id + "']");
	var propertyValueWasTransfered = false;

	if (apply_the_change_to_all_found) {
		for (var i = 0; i < nodes.length; i++) {
			node = nodes[i];
			if (node === srcNode) {
				skip_src_node = true;
			}
			setItemProperty_internal(this, node);
		}
	}

	if (!skip_src_node) {
		setItemProperty_internal(this, srcNode);
	}

	var oParent = srcNode;
	var nds2MarkAsDirty = oParent.selectNodes("ancestor-or-self::Item");
	var nd;
	for (var i = 0; i < nds2MarkAsDirty.length; i++) {
		nd = nds2MarkAsDirty[i];
		if (this.isLockedByUser(nd)) {
			nd.setAttribute("isDirty", "1");
		}
	}

	return true;
}

/*-- getItemProperty/getNodeElement
*
*   Method to get the value of an element on the node.
*   The item is the node and the property is the element.
*   node    = the item object
*   element = the property to set
*
*/
Aras.prototype.getItemProperty = Aras.prototype.getNodeElement = function (node, element, defaultVal) {
	if (!node) {
		return;
	}
	var value;
	if (node.nodeName == "Item" && element == "id") {
		value = node.getAttribute("id");
	}
	else {
		var tmpNd = node.selectSingleNode(element);
		if (tmpNd) {
			var tmpNd2 = tmpNd.selectSingleNode("Item");
			if (tmpNd2) {
				value = tmpNd2.getAttribute("id");
			}
			else {
				value = tmpNd.text;
			}
		}
		else {
			value = (defaultVal === undefined ? "" : defaultVal);
		}
	}
	return value;
}

Aras.prototype.setNodeTranslationElement = Aras.prototype.setItemTranslation = function Aras_setItemTranslation(srcNode, mlPropNm, value, lang) {
	var pNd;
	this.getItemTranslation(srcNode, mlPropNm, lang, null, function (foundNode) {
		pNd = foundNode;
	});

	if (!pNd) {
		pNd = this.browserHelper.createTranslationNode(srcNode, mlPropNm, this.translationXMLNsURI, this.translationXMLNdPrefix);
		pNd = srcNode.appendChild(pNd);
		pNd.setAttribute("xml:lang", lang);
	}

	if (value === null || value === undefined) {
		value = "";
		pNd.setAttribute("is_null", "1");
	}
	pNd.text = value;
}

Aras.prototype.getNodeTranslationElement = Aras.prototype.getItemTranslation = function Aras_getItemTranslation(srcNode, mlPropNm, lang, defaultVal, foundNodeCb) {
	var pNd = this.browserHelper.getNodeTranslationElement(srcNode, mlPropNm, this.translationXMLNsURI, lang);
	if (foundNodeCb) {
		foundNodeCb(pNd);
	}
	if (!pNd) {
		return (defaultVal === undefined ? "" : defaultVal);
	}
	return pNd.text;
}

Aras.prototype.setNodeTranslationElementAttribute = Aras.prototype.setItemTranslationAttribute = function Aras_setItemTranslationAttribute(srcNode, mlPropNm, lang, attribute, value) {
	this.getItemTranslation(srcNode, mlPropNm, lang, null, function (foundNode) {
		if (foundNode) {
			foundNode.setAttribute(attribute, value);
		}
	});
}

Aras.prototype.getNodeTranslationElementAttribute = Aras.prototype.getItemTranslationAttribute = function Aras_getItemTranslationAttribute(srcNode, mlPropNm, lang, attribute, defaultVal) {
	var r;
	this.getItemTranslation(srcNode, mlPropNm, lang, null, function (foundNode) {
		if (foundNode) {
			r = foundNode.getAttribute(attribute);
		}
	});

	if (r === undefined) {
		r = (defaultVal === undefined ? "" : defaultVal);
	}
	return r;
}

Aras.prototype.removeItemTranslation = function Aras_removeItemTranslation(srcNode, mlPropNm, lang) {
	this.getItemTranslation(srcNode, mlPropNm, lang, null, function (foundNode) {
		if (foundNode) {
			srcNode.removeChild(foundNode);
		}
	});
}

Aras.prototype.removeNodeTranslationElementAttribute = Aras.prototype.removeItemTranslationAttribute = function Aras_setItemTranslationAttribute(srcNode, mlPropNm, lang, attribute) {
	this.getItemTranslation(srcNode, mlPropNm, lang, null, function (foundNode) {
		if (foundNode) {
			foundNode.removeAttribute(attribute);
		}
	});
}

/*-- setNodeElementAttribute/setItemPropertyAttribute
*
*   Method to set the value of an attribute on an element on the node.
*   The item is the node and the property is the element.
*   node      = the item object
*   element   = the property to set
*   attribute = the name of the attribute
*   value     = the value for the attribute
*
*/
Aras.prototype.setNodeElementAttribute = Aras.prototype.setItemPropertyAttribute = function (node, element, attribute, value) {
	if (!node) {
		return;
	}
	var elm = node.selectSingleNode(element);
	if (elm) {
		elm.setAttribute(attribute, value);
	}
	else {
		this.newNodeElementAttribute(node, element, attribute, value);
	}
}

/*-- getNodeElementAttribute/getItemPropertyAttribute
*
*   Method to get the value of an attribute on an element on the node.
*   The item is the node and the property is the element.
*   node      = the item object
*   element   = the property to get
*   attribute = the name of the attribute
*
*/
Aras.prototype.getNodeElementAttribute = Aras.prototype.getItemPropertyAttribute = function (node, element, attribute) {
	if (!node) {
		return null;
	}
	var value = null;
	var elm = node.selectSingleNode(element);
	if (!elm) {
		return null;
	}
	else {
		value = elm.getAttribute(attribute);
	}
	return value;
}

Aras.prototype.removeNodeElementAttribute = Aras.prototype.removeItemPropertyAttribute = function (node, element, attribute) {
	var elm = node.selectSingleNode(element);
	if (elm) {
		elm.removeAttribute(attribute);
	}
}

/*-- newNodeElementAttribute/newItemPropertyAttribute
*
*   Method to create a new element (property) for the item node and set the value of an attribute on an element on the node.
*   The item is the node and the property is the element.
*   node      = the item object
*   element   = the property to set
*   attribute = the name of the attribute
*   value     = the value for the attribute
*
*/
Aras.prototype.newNodeElementAttribute = Aras.prototype.newItemPropertyAttribute = function (node, element, attribute, value) {
	var elm = this.createXmlElement(element, node);
	elm.setAttribute(attribute, value);
	return elm;
}

/*-- getValueByXPath
*
*   Method to get the text value for an element by XPath.
*   xpath = the APath to the element
*   node  = the optional node otherwise use the global dom
*
*/
Aras.prototype.getValueByXPath = function (xpath, node) {
	if (arguments.length < 2) {
		var node = this.dom;
	}
	if (!node.selectSingleNode(xpath)) {
		return;
	}
	return node.selectSingleNode(xpath).text
}

/*-- getItemTypeByFormID
*
*   Method to load a ItemType by Form ID
*   id  = the id for the Form item
*
*/
Aras.prototype.getItemTypeByFormID = function (id, ignoreFault) {
	if (ignoreFault == undefined) {
		ignoreFault = false;
	}
	var res = this.soapSend("GetItemTypeByFormID", "<Item id=\"" + id + "\" />");

	if (res.getFaultCode() != 0) {
		if (!ignoreFault) {
			this.AlertError(res);
		}
		return false;
	}

	var itemTypeID = res.results.selectSingleNode("//Item").getAttribute("id");
	return this.getItemTypeDictionary(itemTypeID, "id").node;
}

/*-- setUserWorkingDirectory
*
*   Method to set the users working directory
*   id = the id for the user
*   workingDir = the working directory
*
*/
Aras.prototype.setUserWorkingDirectory = function (id, workingDir) {
	var elm = this.createXmlElement("Item");
	elm.setAttribute("id", id);
	elm.setAttribute("workingDir", workingDir);
	var res = this.soapSend("SetUserWorkingDirectory", elm.xml);
	if (res.getFaultCode() != 0) {
		this.AlertError(res);
		return false;
	}
}

/*-- getNextSequence
*
*   Method to get the next value from a sequence item
*   id      = the id for the sequence (optional if seqName is used)
*   seqName = the sequence name (optional is the id is used)
*
*/
Aras.prototype.getNextSequence = function (id, seqName) {
	if (id == undefined) {
		id = "";
	}

	var body = "<Item";
	if (id != "") {
		body += " id=\"" + id + "\"";
	}
	body += ">";
	if (seqName != undefined) {
		body += "<name>" + seqName + "</name>";
	}
	body += "</Item>";

	var res = this.soapSend("GetNextSequence", body);
	if (res.getFaultCode() != 0) {
		this.AlertError(res);
		return false;
	}

	return res.results.selectSingleNode(this.XPathResult()).text;
}

/*-- buildIdentityList
*
*   Method to get list of identity IDs for those current user is a member.
*   The list is a string and has following format:
*       identityID,identityID,...,identityID
*
*/
Aras.prototype.buildIdentityList = function Aras_buildIdentityList(identityListSoapResults) {
	if (identityListSoapResults.getFaultCode() != 0) {
		this.AlertError(identityListSoapResults);
		this.setIdentityList("");
	}
	else {
		this.setIdentityList(identityListSoapResults.results.selectSingleNode(this.XPathResult()).text);
	}
	return this.getIdentityList();
}

Aras.prototype.applySortOrder = function Aras_applySortOrder(relationshipsArray) {
	//this method is for internal purposes only.
	var arasObj = this;
	function sortOrderComparer(nd1, nd2) {
		var sortOrder1 = parseInt(arasObj.getItemProperty(nd1, "sort_order"));
		if (isNaN(sortOrder1)) {
			return 1;
		}

		var sortOrder2 = parseInt(arasObj.getItemProperty(nd2, "sort_order"));
		if (isNaN(sortOrder2)) {
			return -1;
		}

		if (sortOrder1 > sortOrder2) {
			return 1;
		}
		else if (sortOrder1 == sortOrder2) {
			return 0;
		}
		return -1;
	}

	//relationshipsArray.sort(sortOrderComparer); doesn't work sometimes with error "Object doesn't support this property or method".
	//in debugger I see that relationshipsArray.sort is defined but call relationshipsArray.sort() throws the exception

	//work around:
	var tmpArray = new Array();
	for (var i = 0; i < relationshipsArray.length; i++) {
		tmpArray.push(relationshipsArray[i]);
	}

	tmpArray.sort(sortOrderComparer);

	for (var i = 0; i < relationshipsArray.length; i++) {
		relationshipsArray[i] = tmpArray[i];
	}

	tmpArray = null;
}

Aras.prototype.getSeveralListsValues = function Aras_getSeveralListsValues(listsArray, is_bgrequest, readyResponseIfNeed) {
	//this method is for internal purposes only.
	var res = this.newObject();
	var listIds = new Array();
	var filterListIds = new Array();
	var listsArrayCopy = new Array();
	var typesArray = new Object();

	for (var i = 0; i < listsArray.length; i++) {
		var listDescr = listsArray[i];
		var listId = listDescr.id;
		var relType = listDescr.relType;
		typesArray[listId] = relType;

		if (is_bgrequest && !readyResponseIfNeed) {
			var listDescrCopy = { id: listId, relType: relType };
			listsArrayCopy.push(listDescrCopy);
		}
		var key = this.MetadataCache.CreateCacheKey("getSeveralListsValues-" + relType, listId);
		if (!this.MetadataCache.GetItem(key)) {
			if (relType == "Value") {
				listIds.push(listId);
			}
			else if (relType == "Filter Value") {
				filterListIds.push(listId);
			}
		}
	}

	var response = readyResponseIfNeed;
	if ((listIds.length != 0) || (filterListIds.length != 0)) {
		if (!response) {
			response = this.MetadataCache.GetList(listIds, filterListIds);
		}

		if (response.getFaultCode() != 0) {
			return res;
		}

		var items = response.results.selectNodes(this.XPathResult("/Item"));
		for (var i = 0; i < items.length; i++) {
			var listNd = items[i];
			var id = this.getItemProperty(listNd, "id");
			var key = this.MetadataCache.CreateCacheKey("getSeveralListsValues-" + typesArray[id], id);
			this.MetadataCache.SetItem(key, listNd);
		}
	}

	for (var i = 0; i < listsArray.length; i++) {
		var valuesArr = this.newArray();
		var listDescr = listsArray[i];
		var listId = listDescr.id;
		var key = this.MetadataCache.CreateCacheKey("getSeveralListsValues-" + typesArray[listId], listId)
		var listNode = this.MetadataCache.GetItem(key);
		if (listNode) {
			var values = listNode.selectNodes("Relationships/Item");
			for (var j = 0; j < values.length; j++) {
				valuesArr.push(values[j]);
			}

			this.applySortOrder(valuesArr);

			res[listNode.getAttribute("id")] = valuesArr;
		}
	}

	// 1) add stubs for not found lists
	// 2) mark lists as requested in the session for preloading in future sessions
	for (var i = 0; i < listsArray.length; i++) {
		var listDescr = listsArray[i];
		var listId = listDescr.id;
		var relType = listDescr.relType;
		if (res[listId] === undefined) {
			res[listId] = this.newArray();
		}
	}

	return res;
}

Aras.prototype.getListValues_implementation = function Aras_getListValues_implementation(listID, relType, is_bgrequest) {
	//this method is for internal purposes only.
	var listsArray = this.newArray();
	var listDescr = this.newObject();
	listDescr.id = listID;
	listDescr.relType = relType;
	listsArray.push(listDescr);

	var res = this.getSeveralListsValues(listsArray, is_bgrequest);

	return res[listID];
}

/*-- getListValues
*
*   Method to get the Values for a List item
*   listId = the id for the List
*
*/
Aras.prototype.getListValues = function Aras_getListValues(listID, is_bgrequest) {
	return this.getListValues_implementation(listID, "Value", is_bgrequest);
}

/*-- getListFilterValues
*
*   Method to get the Filter Value for a List item
*   listId = the id for the List
*
*/
Aras.prototype.getListFilterValues = function Aras_getListFilterValues(listID, is_bgrequest) {
	return this.getListValues_implementation(listID, "Filter Value", is_bgrequest);
}

/*-- clearCache
*
*   Method to clear the server cache
*
*/
Aras.prototype.clearCache = function () {
	var res = this.soapSend("ClearCache", "<Item />");
	if (res.getFaultCode() != 0) {
		this.AlertError(res);
		return false;
	}
	return true;
}

/*-- getItemStyles
*
*   Method to get the style for the item
*   item - dom object for the item
*
*/
Aras.prototype.getItemStyles = function (item) {
	if (!item) {
		return null;
	}

	var css = this.getItemProperty(item, "css");
	if (css == "") {
		return null;
	}

	var res = new Object();
	var styles = css.split("\n");
	var styleTmplt = new RegExp(/^\.(\w)+(\s)*\{(\w|\s|\:|\-|\#|\;)*\}$/);

	for (var i = 0; i < styles.length; i++) {
		var style = styles[i];
		if (!styleTmplt.test(style)) {
			continue;
		}

		var tmp = style.split("{");
		var styleNm = tmp[0].substr(1).replace(/\s/g, "");

		var propertiesStr = tmp[1].substr(0, tmp[1].length - 1);
		var properties = propertiesStr.split(";");
		var styleObj = new Object();

		for (var j = 0; j < properties.length; j++) {
			tmp = properties[j].split(":");
			if (tmp.length == 2) {
				var propNm = tmp[0].replace(/\s/g, "");
				var propVl = tmp[1].replace(/\s/g, "");
				if (propNm) {
					styleObj[propNm] = propVl;
				}
			}
		}

		res[styleNm] = styleObj;
	}

	return res;
}

/*-- applyCellStyle
*
*   Method to to apply the item style to teh grid cell
*   cell  - the grid cell object
*   style - the style for the cell
*   setBg - boolean to set the background for the cell
*
*/
Aras.prototype.applyCellStyle = function (cell, style, setBg) {
	if (style["color"]) {
		cell.setTextColor(style["color"]);
	}
	if (setBg && style["background-color"]) {
		cell.setBgColor_Experimental(style["background-color"]);
	}
	if (style["font-family"]) {
		var font = style["font-family"].split(",")[0];
		if (style["font-size"]) {
			font += "-" + style["font-size"].split("p")[0];
		}
		cell.setFont(font);
	}
	if (style["font-weight"] && style["font-weight"] == "bold") {
		cell.setTextBold();
	}
}

Aras.prototype.preserveTags = function (str) {
	if (str == undefined) {
		return;
	}

	if (str == "") {
		return str;
	}

	str = str.replace(/&/g, "&amp;");
	str = str.replace(/</g, "&lt;");
	str = str.replace(/>/g, "&gt;");

	return str;
}

Aras.prototype.escapeXMLAttribute = function (strIn) {
	if (strIn == undefined) {
		return;
	}

	if (strIn == "") {
		return strIn;
	}

	strIn = strIn.replace(/&/g, "&amp;");
	strIn = strIn.replace(/</g, "&lt;");
	strIn = strIn.replace(/>/g, "&gt;");
	strIn = strIn.replace(/"/g, "&quot;");
	strIn = strIn.replace(/'/g, "&apos;");

	return strIn;
}

/*-- hasFileChanged
*
*   Determine if file was changed
*   file - file item
*
*/
Aras.prototype.hasFileChanged = function (file) {
	var oldSize = this.getItemProperty(file, "file_size");
	var filePath = this.getItemProperty(file, "checkedout_path");

	if (!Path.isValidFilePath(filePath)) {
		return true;
	}

	var fileName = this.getItemProperty(file, "filename");
	filePath = Path.combinePath(filePath, fileName);

	var oldFileName = this.getItemProperty(file, "keyed_name");
	if (oldFileName !== fileName) {
		return true;
	}
	var newSize;
	try {
		newSize = this.vault.getFileSize(filePath);
	}
	catch (ex) {
		return true; //file or directory does not exist.
	}
	if (newSize == oldSize) {
		var oldCheckSum = this.getItemProperty(file, "checksum");
		var newCheckSum = this.vault.getFileChecksum(filePath);
		if (newCheckSum == oldCheckSum) {
			return false;
		}
		else {
			return true;
		}
	}
	else {
		return true;
	}
}

/*-- findMainArasObject
*
*  Returns a pointer to the main Aras object (from the main window)
*
*/
Aras.prototype.findMainArasObject = function Aras_findMainArasObject() {
	var isMainWindow = (this.getMainWindow().name == this.mainWindowName);

	if (!isMainWindow) {
		if (this.parentArasObj) {
			return this.parentArasObj.findMainArasObject();
		}
		else {
			var topWnd = this.getMostTopWindowWithAras(window);
			if (topWnd.opener && !this.isWindowClosed(topWnd.opener) && topWnd.opener.topWnd.aras) {
				return topWnd.opener.topWnd.aras.findMainArasObject();
			}
		}
	}

	return this;
}

/*-- registerEventHandler
*
*  Register Handler for event by win
*  see fireEvent description for details
*/
Aras.prototype.registerEventHandler = function Aras_registerEventHandler(eventName, win, handler) {
	var EvHandlers;

	var topWnd = this.getMostTopWindowWithAras();

	try {
		EvHandlers = topWnd["Event Handlers"];
	}
	catch (excep) {
		return false;
	}

	if (!EvHandlers) {
		topWnd.eval("window['Event Handlers'] = new Object();");
		EvHandlers = topWnd["Event Handlers"];
	}

	if (!EvHandlers[eventName]) {
		topWnd.eval("window['Event Handlers']['" + eventName + "'] = new Array();");
	}

	EvHandlers[eventName].push(handler);

	return true;
}

/*-- unregisterEventHandler
*
*  UnRegister Handler for event by win
*
*/
Aras.prototype.unregisterEventHandler = function Aras_unregisterEventHandler(eventName, win, handler) {
	var EvHandlers;

	var topWnd = this.getMostTopWindowWithAras();

	try {
		EvHandlers = topWnd["Event Handlers"];
	}
	catch (excep) {
		return false;
	}

	if (!EvHandlers) {
		return true;
	}

	var handlersArr = EvHandlers[eventName];
	if (!handlersArr) {
		return true;
	}

	for (var i = 0; i < handlersArr.length; i++) {
		if (handlersArr[i] == handler) {
			handlersArr.splice(i, 1);
			return true;
		}
	}

	return false;
}

/*-- fireEvent
*
*  fires event in all windows
*  supported events:
*  "VariableChanged": {varName, varValue}
*  "ItemLock": {itemID, itemNd, newLockedValue}
*  "ItemSave": {itemID, itemNd}
*
*/
Aras.prototype.fireEvent = function Aras_fireEvent(eventName, params) {
	var mainAras = this.findMainArasObject();
	if (this != mainAras) {
		return mainAras.fireEvent(eventName, params);
	}

	if (!eventName) {
		return false;
	}

	var topWindow = this.getMostTopWindowWithAras(window);

	for (var winId in this.windowsByName) {
		if (!this.windowsByName.hasOwnProperty(winId)) {
			continue;
		}

		var win = null;
		try {
			win = this.windowsByName[winId];
			if (this.isWindowClosed(win)) {
				continue;
			}
			if (this.getMostTopWindowWithAras(win) == topWindow) {
				continue;
			}
		}
		catch (excep) {
			continue;
		}

		var EvHandlers = null;
		try {
			EvHandlers = this.getMostTopWindowWithAras(win)["Event Handlers"];
			if (!EvHandlers) {
				continue;
			}
		}
		catch (excep) {
			continue;
		}

		var handlersArr = EvHandlers[eventName];
		if (!handlersArr) {
			continue;
		}

		for (var i = 0; i < handlersArr.length; i++) {
			try {
				handlersArr[i](params);
			}
			catch (excep) {
			}
		}
	}

	var EvHandlers = topWindow["Event Handlers"];
	if (!EvHandlers) {
		return true;
	}

	var handlersArr = EvHandlers[eventName];
	if (!handlersArr) {
		return true;
	}

	var handlers2Remove = new Array();

	for (var i = 0; i < handlersArr.length; i++) {
		var f = handlersArr[i];
		try {
			f(params);
		}
		catch (e) {
			if (e.number == -2146823277) {
				handlers2Remove.push(f);
			}
			else {
				throw e;
			}
		}
	}

	for (var i = handlers2Remove.length - 1; i >= 0; i--) {
		this.unregisterEventHandler(eventName, topWindow, handlers2Remove[i]);
	}
}

Aras.prototype.getCurrentWindow = function Aras_getCurrentWindow() {
	return window;
}

Aras.prototype.getMainWindow = function Aras_getMainWindow() {
	try {
		if (this.getCommonPropertyValue("mainWindow")) {
			return this.getCommonPropertyValue("mainWindow");
		}

		var topWindowWithAras = this.getMostTopWindowWithAras(window);
		var isMainWindow = (topWindowWithAras.name == this.mainWindowName);
		if (isMainWindow) {
			return topWindowWithAras;
		}

		//this function is to avoid explicit "top" usage
		function getTopWindow(windowObj) {
			var win = windowObj ? windowObj : window;
			while (win !== win.parent) {
				//We should not care about any cross-domain case since "main window" case is not considered here
				win = win.parent;
			}
			return win;
		}

		var topWnd = getTopWindow(), topWnd2;
		if (topWnd.opener && !this.isWindowClosed(topWnd.opener)) {
			topWnd2 = this.getMostTopWindowWithAras(topWnd.opener);
			topWnd2 = this.isWindowClosed(topWnd2) ? null : topWnd2;
		}
		if (!topWnd2) {
			topWnd2 = this.getMostTopWindowWithAras(topWnd.dialogOpener);
			topWnd2 = this.isWindowClosed(topWnd2) ? null : topWnd2;
		}

		return topWnd2 ? topWnd2.aras.getMainWindow() : topWnd;
	}
	catch (excep) {
		return null;
	}
}

Aras.prototype.getMainArasObject = function Aras_getMainArasObject() {
	var res = null;

	var mainWnd = this.getMainWindow();
	if (mainWnd && !this.isWindowClosed(mainWnd)) {
		res = mainWnd.aras;
	}

	return res;
}

Aras.prototype.newQryItem = function Aras_newQryItem(itemTypeName) {
	var mainArasObj = this.getMainArasObject();

	if (mainArasObj && mainArasObj != this) {
		return mainArasObj.newQryItem(itemTypeName);
	}
	else {
		var topWnd = this.getMostTopWindowWithAras(window);
		return (new topWnd.QryItem(topWnd.aras, itemTypeName));
	}
}

Aras.prototype.newObject = function Aras_newObject() {
	var mainArasObj = this.getMainArasObject();

	if (mainArasObj && mainArasObj != this) {
		return mainArasObj.newObject();
	}
	else {
		return (new Object());
	}
}
Aras.prototype.deletePropertyFromObject = function Aras_deletePropertyFromObject(obj, key) {
	if (key in obj) {
		return delete obj[key];
	}
	return true;
}

Aras.prototype.newIOMItem = function Aras_newIOMItem(itemTypeName, action) {
	return this.IomInnovator.newItem(itemTypeName, action);
}

Aras.prototype.newIOMInnovator = function Aras_newIOMInnovator() {
	var mainArasObj = this.getMainArasObject();

	if (mainArasObj && mainArasObj != this) {
		return mainArasObj.newIOMInnovator();
	}
	else {
		var connector = this.IomFactory.CreateComISConnection(new Aras.IOM.InnovatorServerConnector(this));
		return this.IomFactory.CreateInnovator(connector);
	}
}

Aras.prototype.newArray = function Aras_newArray() {
	var mainArasObj = this.getMainArasObject();

	if (mainArasObj && mainArasObj != this) {
		var str2eval = "";
		for (var i = 0; i < arguments.length; i++) {
			str2eval += "args[" + i + "],";
		}
		if (str2eval != "") {
			str2eval = str2eval.substr(0, str2eval.length - 1);
		}
		str2eval = "return mainArasObj.newArray(" + str2eval + ");";

		var f = new Function("mainArasObj", "args", str2eval);
		return f(mainArasObj, arguments);
	}
	else {
		var res;
		if (arguments.length == 1) {
			res = new Array(arguments[0]);
		}
		else {
			res = new Array();
			for (var i = 0; i < arguments.length; i++) {
				res.push(arguments[i]);
			}
		}

		res.concat = function newArray_concat() {
			var resArr = new Array();
			for (var i = 0; i < this.length; i++) {
				resArr[i] = this[i];
			}

			for (var i = 0; i < arguments.length; i++) {
				if (arguments[i].pop) {
					for (var j = 0; j < arguments[i].length; j++) {
						resArr.push(arguments[i][j])
					}
				}
				else {
					resArr.push(arguments[i]);
				}
			}

			return resArr;
		}

		return res;
	}
}

Aras.prototype.getFileItemTypeID = function Aras_getFileItemTypeID() {
	return this.getItemTypeId("File");
}

Aras.prototype.cloneForm = function Aras_cloneForm(formID, newFormName) {
	if (!formID || !newFormName) {
		return false;
	}

	var bodyStr = "<Item type=\"Form\" id=\"" + formID + "\" newFormName=\"" + newFormName + "\" do_lock=\"true\" />";
	var res = null;

	with (this) {
		var statusId = showStatusMessage("status", getResource("", "aras_object.copying_form"), system_progressbar1_gif);
		res = soapSend("CloneForm", bodyStr);
		clearStatusMessage(statusId);
	}

	if (res.getFaultCode() != 0) {
		var win = this.uiFindWindowEx(formID);
		if (!win) {
			win = window;
		}
		this.AlertError(res, win);
		return false;
	}

	return true;
}

/*----------------------------------------
* getVaultServerURL
*
* Purpose:
* get Vault Server url for current User
*
* Arguments:
* none
*/
Aras.prototype.getVaultServerURL = function Aras_getVaultServerURL() {
	var vaultServerID = this.getVaultServerID();
	if (!vaultServerID) {
		return "";
	}

	if (this.vaultServerURL != undefined) {
		return this.vaultServerURL;
	}

	var vaultNd = this.getItemById("Vault", vaultServerID, 0, "", "vault_url,name");
	if (!vaultNd) {
		return "";
	}

	var vaultServerURL = this.getItemProperty(vaultNd, "vault_url");
	this.VaultServerURL = this.TransformVaultServerURL(vaultServerURL);
	return this.VaultServerURL;
}

Aras.prototype.SyncWinInetAndDotNetCredentials = function Aras_SyncWinInetAndDotNetCredentials(baseUrl, authUrl, isDirectUrl) {
	//it is possible to check some variable here to not send additional requests when windows auth is disabled.
	//but in normal situation this is either 3 fast HEAD requests (when windows auth is disabled)
	//or much more requests but when windows auth is enabled and we cannot get passwords from Protected Storage.
	//thus for now I do not see a reason for a special check.
	if (!isDirectUrl) {
		this.WinInetCredentialsCollection.AddFromWinInet(baseUrl, baseUrl + "/WinInetHelper.aspx");
	}
	else {
		this.WinInetCredentialsCollection.AddFromWinInet(baseUrl, authUrl);
	}
}

Aras.prototype.TransformVaultServerURL = function Aras_TransformVaultServerURL(url) {
	var xform_url = this.VaultServerURLCache[url];
	if (xform_url != undefined) {
		return (xform_url);
	}

	var res = this.soapSend("TransformVaultServerURL", "<url>" + url + "</url>");

	if (res.getFaultCode() != 0) {
		this.AlertError(res);
		return url;
	}

	var rb = res.getResult();
	xform_url = rb.text;

	var vaultBaseUrl = xform_url + "/..";
	this.SyncWinInetAndDotNetCredentials(vaultBaseUrl);

	this.VaultServerURLCache[url] = xform_url;
	return xform_url;
}

/*----------------------------------------
* getVaultServerURL
*
* Purpose:
* get Vault Server ID for current User
*
* Arguments:
* none
*/
Aras.prototype.getVaultServerID = function Aras_getVaultServerID() {
	var userNd = null;
	var tmpUserID = this.getCurrentUserID();

	if (tmpUserID == this.getUserID()) {
		userNd = this.getLoggedUserItem();
	}
	else {
		userNd = getItemFromServer("User", tmpUserID, "default_vault").node;
	}

	if (!userNd) {
		return "";
	}

	var vaultServerID = this.getItemProperty(userNd, "default_vault");
	return vaultServerID;
}

/*
* Create Xml Element. If parent variable exist, add element as child
* elName - element name to be created
* parent - parent element
* return created element
*/
Aras.prototype.createXmlElement = function (elName, parent) {
	var doc = this.createXMLDocument();
	var element = doc.createElement(elName);
	if (parent) {
		parent.appendChild(element);
	}
	return element;
}

/*----------------------------------------
* createXMLDocument
*
* Purpose:
* provide simple way to create xml documents without specifing needed attributes each time
*
* Arguments:
* none
*/
Aras.prototype.createXMLDocument = function Aras_createXMLDocument() {
	var mainArasObj = this.getMainArasObject();

	if (mainArasObj && mainArasObj != this) {
		return mainArasObj.createXMLDocument();
	}
	else {
		return new XmlDocument();
	}
}

/*----------------------------------------
* hasFault
*
* Purpose:
* check if xmldom (soap message) contains Fault
*
* Arguments:
* xmlDom - xml document with soap message
* ignoreZeroFault - boolean. ignore zero faultcode or not
*/
Aras.prototype.hasFault = function Aras_hasFault(xmlDom, ignoreZeroFault) {
	if (ignoreZeroFault) {
		return (xmlDom.selectSingleNode(this.XPathFault("[faultcode!='0']")) != null);
	}
	else {
		return (xmlDom.selectSingleNode(this.XPathFault()) != null);
	}

}

/*----------------------------------------
* getFaultDetails
*
* Purpose:
* get text with fault details
*
* Arguments:
* xmlDom - xml document with soap message
*/
Aras.prototype.getFaultDetails = function Aras_getFaultDetails(xmlDom) {
	var fdNd = xmlDom.selectSingleNode(this.XPathFault("/detail"));

	if (fdNd == null) {
		return "";
	}
	else {
		return fdNd.text;
	}
}

/*----------------------------------------
* getFaultString
*
* Purpose:
* get text with faultstring
*
* Arguments:
* xmlDom - xml document with soap message
*/
Aras.prototype.getFaultString = function Aras_getFaultString(xmlDom) {
	var fdNd = xmlDom.selectSingleNode(this.XPathFault("/faultstring"));

	if (fdNd == null) {
		return "";
	}
	else {
		return fdNd.text;
	}
}

/*----------------------------------------
* getFaultString
*
* Purpose:
* get text with faultactor (contains stack trace)
*
* Arguments:
* xmlDom - xml document with soap message
*/
Aras.prototype.getFaultActor = function Aras_getFaultActor(xmlDom) {
	var fdNd = xmlDom.selectSingleNode(this.XPathFault("/detail/legacy_faultactor"));

	if (fdNd == null) {
		return "";
	}
	else {
		return fdNd.text;
	}
}

Aras.prototype.isInCache = function Aras_isInCache(itemID) {
	return this.itemsCache.hasItem(itemID);
}

Aras.prototype.addToCache = function Aras_addToCache(item) {
	if (!item) {
		return (new CacheResponse(false, this.getResource("", "aras_object.nothing_to_add"), item));
	}

	var itemID = item.getAttribute("id");
	if (this.isInCache(itemID)) {
		return (new CacheResponse(false, this.getResource("", "aras_object.already_in_cache"), this.getFromCache(itemID)));
	}

	this.itemsCache.addItem(item);
	return (new CacheResponse(true, "", this.getFromCache(itemID)));
}

Aras.prototype.updateInCache = function Aras_updateInCache(item) {
	if (!item) {
		return (new CacheResponse(false, this.getResource("", "aras_object.nothing_to_update"), item));
	}

	var itemID = item.getAttribute("id");
	this.itemsCache.updateItem(item);
	return (new CacheResponse(true, "", this.getFromCache(itemID)));
}

Aras.prototype.updateInCacheEx = function Aras_updateInCacheEx(oldItm, newItm) {
	if (!oldItm) {
		return this.addToCache(newItm);
	}
	if (!newItm) {
		return (new CacheResponse(false, this.getResource("", "aras_object.nothing_to_update"), newItm));
	}

	var itemID = newItm.getAttribute("id");
	this.itemsCache.updateItemEx(oldItm, newItm);
	return (new CacheResponse(true, "", this.getFromCache(itemID)));
}

Aras.prototype.removeFromCache = function Aras_removeFromCache(item) {
	if (!item) {
		return (new CacheResponse(false, this.getResource("", "aras_object.nothing_to_remove"), item));
	}

	var paramType = typeof (item);
	var itemID;
	if (paramType == "string") {
		itemID = item;
	}
	else if (paramType == "object") {
		itemID = item.getAttribute("id");
	}

	if (this.isInCache(itemID)) {
		this.itemsCache.deleteItem(itemID);
	}

	return (new CacheResponse(true, "", null));
}

Aras.prototype.getFromCache = function getFromCache(itemID) {
	if (!itemID) {
		return null;
	}
	else {
		return this.itemsCache.getItem(itemID);
	}
}

Aras.prototype.isPropFilledOnServer = function isPropFilledOnServer(propName) {
	if (!propName) {
		return false;
	}

	var props = "^permission_id$|^created_on$|^created_by_id$|^config_id$";
	return (propName.search(props) != -1);
}

Aras.prototype.generateExceptionDetails = function Aras_generateExceptionDetails(err, func) {
	var resXMLDOM = this.createXMLDocument();

	resXMLDOM.loadXML("<Exception />");

	var callStackCounter = 0;
	var callStack = null;

	function addChNode(pNode, chName, chValue) {
		var tmp = pNode.appendChild(resXMLDOM.createElement(chName));
		if (chValue != "") {
			tmp.text = chValue;
		}
		return tmp;
	}

	function getFunctionName(func) {
		if (!func) {
			return this.getResource("", "aras_object.incorrect_parameter");
		}
		if (typeof (func) != "function") {
			return this.getResource("", "aras_object.not_function");
		}

		var funcDef = func.toString();
		funcDef = funcDef.replace(/\/\*([^\*\/]|\*[^\/]|\/)*\*\//g, "");
		funcDef = funcDef.replace(/^\s\/\/.*$/gm, "");

		/^function([^\(]*)/.exec(funcDef);
		var funcName = RegExp.$1;
		funcName = funcName.replace(/\s/g, "");

		return funcName;
	}

	function addCallStackEntry(aCaller) {
		var funcName;
		var funcBody;

		if (aCaller) {
			funcName = getFunctionName(aCaller);
			funcBody = aCaller.toString();
		}
		else {
			funcName = "global code";
			funcBody = "unknown";
		}

		var fNd = addChNode(callStack, "function", "");
		fNd.setAttribute("name", funcName);
		fNd.setAttribute("order", callStackCounter);

		var callArgsNd = addChNode(fNd, "call_arguments", "");
		if (aCaller) {
			for (var i = 0; i < aCaller.arguments.length; i++) {
				var argVal = aCaller.arguments[i];
				var argType = "string";

				if (argVal != undefined) {
					if (argVal.xml != undefined) {
						argType = "xml";
						argVal = argVal.xml;
					}
				}

				var argNd = addChNode(callArgsNd, "argument", argVal);
				argNd.setAttribute("order", i);
				argNd.setAttribute("type", argType);
			}
		}

		addChNode(fNd, "body", funcBody);

		callStackCounter++;
	}

	var root = resXMLDOM.documentElement;
	try {
		addChNode(root, "number", err.number);
		addChNode(root, "message", err.message);

		var aCaller = func;
		callStack = addChNode(root, "call_stack", "");

		while (aCaller) {
			addCallStackEntry(aCaller);
			aCaller = aCaller.caller;
			if (aCaller.caller.length) {
				break;
			}
		}
		addCallStackEntry(aCaller);
	}
	catch (ex2) {
		root.text = ex2.message;
	}

	return resXMLDOM.xml;
}

Aras.prototype.showExceptionDetails = function Aras_showExceptionDetails(err) {
	var anErr = err;
	var aCaller = this.showExceptionDetails.caller;

	var xmlDesc = this.generateExceptionDetails(anErr, aCaller);

	var xmlDoc = this.createXMLDocument();
	xmlDoc.loadXML(xmlDesc);
	var exNd = xmlDoc.selectSingleNode("//Exception");
	if (!exNd) {
		return;
	}
	var self = this;

	var htmlPrefix =
	"<html><head><style type=\"text/css\">" +
	".h1 {font-size:150%;}.h2 {font-size:120%;}pre {float:left;}</style></head>" +
	"<scr" +
	"ipt>function f(){window.clipboardData.setData(\"Text\", document.getElementById(\"ta\").value);}</scr" +
	"ipt>" +
	"<body>" +
	"<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">" +
	"<tr><td colspan=\"2\" class=\"h1\">Exception&nbsp;<input type=\"button\" value=\"Copy Details\" onclick=\"f()\"/></td></tr>" +
	"<tr><td class=\"h2\">Number&nbsp;</td><td width=\"100%\"><pre>" + getNdVal(exNd.selectSingleNode("number")) + "</pre></td></tr>" +
	"<tr><td class=\"h2\">Message&nbsp;</td><td><pre>" + getNdVal(exNd.selectSingleNode("message")) + "</pre></td></tr>" +
	"<tr><td class=\"h2\" valign=\"top\">Details</td><td style=\"width:100%;height:300;\"><textarea id=\"ta\" style=\"width:400;height:95%;\" readonly>";
	var htmlSfx = "</textarea></td></tr>" +
	"</table>" +
	"</body></html>";
	htmlPrefix = htmlPrefix.replace(/'/g, "\\\'");

	truncateExDetails();

	var maxHtmlLen = 2070;
	var dtls = exNd.xml;
	dtls = dtls.replace(/'/g, "\\\'");
	var maxLen = maxHtmlLen - htmlPrefix.length - htmlSfx.length - 4;
	if (maxLen > 0 && dtls && dtls.length > maxLen) {
		dtls = dtls.substr(0, maxLen) + "...";
	}

	if (maxLen <= 0) {
		dtls = "";
	}

	var html = htmlPrefix + dtls + htmlSfx;
	if (html.length > maxHtmlLen) {
		html = html.substr(0, maxHtmlLen);
	}

	var options = {
		dialogWidth: 500,
		dialogHeight: 450,
		center: true,
		resizable: true
	};

	this.modalDialogHelper.show("DefaultModal", window, null, options, "javascript:'" + html + "'");

	function getNdVal(nd) {
		if (!nd) {
			return "";
		}

		return self.EscapeSpecialChars(nd.text);
	}
	function truncateExDetails() {
		var nd;
		var nds = exNd.selectNodes("call_stack/function/body");
		for (var i = 0; i < nds.length; i++) {
			nd = nds[i];
			if (nd.text && nd.text.length > 80) {
				nd.text = nd.text.substr(0, 80) + "...";
			}
		}
		nds = exNd.selectNodes("call_stack/function/call_arguments/argument");
		for (var i = 0; i < nds.length; i++) {
			nd = nds[i];
			if (nd.text && nd.text.length > 20) {
				nd.text = nd.text.substr(0, 30) + "...";
			}
		}
	}
}

Aras.prototype.copyRelationship = function Aras_copyRelationship(relationshipType, relationshipID) {
	var relResult = this.getItemById(relationshipType, relationshipID, 0, undefined);
	var sourceType = this.getItemPropertyAttribute(relResult, "source_id", "type");
	var sourceID = this.getItemProperty(relResult, "source_id");
	var sourceKeyedName = this.getItemPropertyAttribute(relResult, "source_id", "keyed_name");

	var relatedItem = this.getRelatedItem(relResult);

	var relatedType = "";
	var relatedID = "";
	var relatedKeyedName = "";

	if (!relatedItem || (relatedItem && "1" == relatedItem.getAttribute("is_polymorphic"))) {
		var relType = this.getRelationshipType(this.getRelationshipTypeId(relationshipType));
		if (!relType || relType.isError()) {
			return;
		}

		relatedType = this.getItemPropertyAttribute(relType.node, "related_id", "name");
		relatedKeyedName = this.getItemPropertyAttribute(relType.node, "related_id", "keyed_name");
	}
	else {
		relatedID = relatedItem.getAttribute("id");
		relatedType = relatedItem.getAttribute("type");
		relatedKeyedName = this.getItemProperty(relatedItem, "keyed_name");
	}

	var clipboardItem = this.newObject();
	clipboardItem.source_id = sourceID;
	clipboardItem.source_itemtype = sourceType;
	clipboardItem.source_keyedname = sourceKeyedName;
	clipboardItem.relationship_id = relationshipID;
	clipboardItem.relationship_itemtype = relationshipType;
	clipboardItem.related_id = relatedID;
	clipboardItem.related_itemtype = relatedType;
	clipboardItem.related_keyedname = relatedKeyedName;

	return clipboardItem;
}

Aras.prototype.pasteRelationship = function Aras_pasteRelationship(parentItem, clipboardItem, as_is, as_new, targetRelationshipTN, targetRelatedTN, showConfirmDlg) {
	var self = this;

	function getProperties4ItemType(itemTypeName) {
		if (!itemTypeName) {
			return;
		}

		var qryItem = new Item("ItemType", "get");
		qryItem.setAttribute("select", "name");
		qryItem.setAttribute("page", 1);
		qryItem.setAttribute("pagesize", 9999);
		qryItem.setProperty("name", itemTypeName);

		var relationshipItem = new Item();
		relationshipItem.setType("Property");
		relationshipItem.setAction("get");
		relationshipItem.setAttribute("select", "name,data_type");
		qryItem.addRelationship(relationshipItem);

		var results = qryItem.apply();
		if (results.isError()) {
			self.AlertError(result);
			return;
		}

		return results.getRelationships("Property");
	}

	function setRelated(targetItem) {
		if (relatedType && relatedType !== "File") {
			var relatedItemType = self.getItemTypeForClient(relatedType, "name");
			if (relatedItemType.getProperty("is_dependent") == "1") {
				as_new = true;
			}

			if (as_new == true) {
				var queryItemRelated = new Item();
				queryItemRelated.setType(relatedType);
				queryItemRelated.setID(relatedID);
				queryItemRelated.setAttribute("do_add", "0");
				queryItemRelated.setAttribute("do_lock", "0");
				queryItemRelated.setAction("copy");
				var newRelatedItem = queryItemRelated.apply();
				if (newRelatedItem.isError()) {
					self.AlertError(self.getResource("", "aras_object.failed_copy_related_item", newRelatedItem.getErrorDetail()), newRelatedItem.getErrorString(), newRelatedItem.getErrorSource());
					return false;
				}
				targetItem.setRelatedItem(newRelatedItem);
			}
		}
	}

	if (as_is == undefined || as_new == undefined) {
		var qryItem4RelationshipType = new Item();
		qryItem4RelationshipType.setType("RelationshipType");
		qryItem4RelationshipType.setProperty("name", relationshipType);
		qryItem4RelationshipType.setAction("get");
		qryItem4RelationshipType.setAttribute("select", "copy_permissions, create_related");
		var RelNode = qryItem4RelationshipType.apply();
		if (as_is == undefined) {
			as_is = (RelNode.getProperty("copy_permissions") == "1");
		}
		if (as_new == undefined) {
			as_new = (RelNode.getProperty("create_related") == "1");
		}
	}

	var statusId = this.showStatusMessage("status", this.getResource("", "aras_object.pasting_in_progress"), system_progressbar1_gif);
	if (!clipboardItem) {
		return;
	}

	var relationshipType = clipboardItem.relationship_itemtype;
	var relationshipID = clipboardItem.relationship_id;
	var relatedID = clipboardItem.related_id;
	var relatedType = clipboardItem.related_itemtype;

	if (relationshipType == targetRelationshipTN) {
		var qryItem4CopyRelationship = new Item();
		qryItem4CopyRelationship.setType(relationshipType);
		qryItem4CopyRelationship.setID(relationshipID);
		qryItem4CopyRelationship.setAction("copy");
		qryItem4CopyRelationship.setAttribute("do_add", "0");
		qryItem4CopyRelationship.setAttribute("do_lock", "0");

		var newRelationship = qryItem4CopyRelationship.apply();
		if (newRelationship.isError()) {
			this.AlertError(this.getResource("", "aras_object.copy_operation_failed", newRelationship.getErrorDetail()), newRelationship.getErrorString(), newRelationship.getErrorSource());
			this.clearStatusMessage(statusId);
			return false;
		}
		newRelationship.removeProperty("source_id");

		if (newRelationship.getType() == "Property" && newRelationship.getProperty("data_type") == "foreign") {
			newRelationship.removeProperty("data_source");
			newRelationship.removeProperty("foreign_property");
		}

		setRelated(newRelationship);

		if (!parentItem.selectSingleNode("Relationships")) {
			parentItem.appendChild(parentItem.ownerDocument.createElement("Relationships"));
		}
		var res = parentItem.selectSingleNode("Relationships").appendChild(newRelationship.node.cloneNode(true));
		this.clearStatusMessage(statusId);
		parentItem.setAttribute("isDirty", "1");
		return res;
	}
	var topWnd = this.getMostTopWindowWithAras(window);
	var item = new topWnd.Item(relationshipType, "get");
	item.setID(relationshipID);
	var sourceItem = item.apply();

	if (sourceItem.getAttribute("isNew") == "1") {
		this.AlertError(this.getResource("", "aras_object.failed_get_source_item"), "", "");
		this.clearStatusMessage(statusId);
		return false;
	}
	sourceRelationshipTN = sourceItem.getType();

	var targetItem = new Item();
	targetItem.setType(sourceRelationshipTN);
	targetItem.setAttribute("typeId", sourceItem.getAttribute("typeId"));

	if (targetRelationshipTN == undefined) {
		targetRelationshipTN = sourceRelationshipTN;
	}

	if (sourceRelationshipTN != targetRelationshipTN) {
		if ((!targetRelatedTN && !relatedType) || targetRelatedTN == relatedType) {
			if (showConfirmDlg) {
				var convert = this.confirm(this.getResource("", "aras_object.you_attempting_paste_different_relationship_types", sourceRelationshipTN, targetRelationshipTN));
				if (!convert) {
					this.clearStatusMessage(statusId);
					return this.getResource("", "aras_object.user_abort");
				}
			}
			targetItem.setType(targetRelationshipTN);
		}
		else {
			this.clearStatusMessage(statusId);
			return false;
		}
	}

	targetItem.setNewID();
	targetItem.setAction("add");
	targetItem.setAttribute("isTemp", "1");
	parentItem.setAttribute("isDirty", "1");

	var sourceProperties = getProperties4ItemType(sourceRelationshipTN);
	var targetProperties = getProperties4ItemType(targetRelationshipTN);

	var srcCount = sourceProperties.getItemCount();
	var trgCount = targetProperties.getItemCount();

	var sysProperties =
		"^id$|" +
		"^created_by_id$|" +
		"^created_on$|" +
		"^modified_by_id$|" +
		"^modified_on$|" +
		"^classification$|" +
		"^keyed_name$|" +
		"^current_state$|" +
		"^state$|" +
		"^locked_by_id$|" +
		"^is_current$|" +
		"^major_rev$|" +
		"^minor_rev$|" +
		"^is_released$|" +
		"^not_lockable$|" +
		"^css$|" +
		"^source_id$|" +
		"^behavior$|" +
		"^sort_order$|" +
		"^config_id$|" +
		"^new_version$|" +
		"^generation$|" +
		"^managed_by_id$|" +
		"^owned_by_id$|" +
		"^history_id$|" +
		"^relationship_id$";

	if (as_is != true) {
		sysProperties += "|^permission_id$";
	}

	var regSysProperties = new RegExp(sysProperties, "ig");
	for (var i = 0; i < srcCount; i++) {
		var sourceProperty = sourceProperties.getItemByIndex(i);
		var srcPropertyName = sourceProperty.getProperty("name");
		var srcPropertyDataType = sourceProperty.getProperty("data_type");

		if (srcPropertyName.search(regSysProperties) != -1) {
			continue;
		}

		for (var j = 0; j < trgCount; ++j) {
			var targetProperty = targetProperties.getItemByIndex(j);
			var trgPropertyName = targetProperty.getProperty("name");
			var trgPropertyDataType = targetProperty.getProperty("data_type");

			if ((srcPropertyName == trgPropertyName) && (srcPropertyDataType == trgPropertyDataType)) {
				var item = sourceItem.getPropertyItem(srcPropertyName);
				if (!item) {
					var value = sourceItem.getProperty(srcPropertyName);
					targetItem.setProperty(srcPropertyName, value);
				}
				else {
					targetItem.setPropertyItem(srcPropertyName, item);
				}
				break;
			}
		}
	}
	setRelated(targetItem);
	if (!parentItem.selectSingleNode("Relationships")) {
		parentItem.appendChild(parentItem.ownerDocument.createElement("Relationships"));
	}
	var res = parentItem.selectSingleNode("Relationships").appendChild(targetItem.node.cloneNode(true));
	this.clearStatusMessage(statusId);
	return res;
}

Aras.prototype.isLCNCompatibleWithRT = function Aras_isLastCopyNodeCompatibleWithRelationshipType(targetRelatedTN) {
	var sourceRelatedTN = this.clipboard.getLastCopyRelatedItemTypeName();
	if (!sourceRelatedTN && !targetRelatedTN) {
		return true;
	}
	if (sourceRelatedTN == targetRelatedTN) {
		return true;
	}
	return false;
}

Aras.prototype.isLCNCompatibleWithRTOnly = function Aras_isLastCopyNodeCompatibleWithRelationshipTypeOnly(targetRelationshipTN) {
	var sourceRelationshipTN = this.clipboard.getLastCopyRTName();
	if (!sourceRelationshipTN && !targetRelationshipTN) {
		return true;
	}
	if (sourceRelationshipTN == targetRelationshipTN) {
		return true;
	}
	return false;
}

Aras.prototype.isLCNCompatibleWithIT = function Aras_isLastCopyNodeCompatibleWithItemType(itemTypeID) {
	var clipboardItem = this.clipboard.getLastCopyItem();
	return this.isClItemCompatibleWithIT(clipboardItem, itemTypeID);
}

Aras.prototype.isClItemCompatibleWithIT = function Aras_IsClipboardItemCompatibleWithItemType(clipboardItem, itemTypeID) {
	var RelationshipTypeName = clipboardItem.relationship_itemtype;

	if (!RelationshipTypeName || !itemTypeID) {
		return false;
	}

	return this.getRelationshipTypeId(RelationshipTypeName) != "";
}

Aras.prototype.isClItemCompatibleWithRT = function Aras_IsClipboardItemCompatibleWithRelationshipType(clipboardItem, targetRelatedTN) {
	var sourceRelatedTN = clipboardItem.related_itemtype;
	if (!sourceRelatedTN && !targetRelatedTN) {
		return true;
	}
	if (sourceRelatedTN == targetRelatedTN) {
		return true;
	}
	return false;
}

/*-- getAssignedTasks
*
*   Returns the Active and Pending tasks for the user (Workflow Activities, Project Activities, FMEA Action Items).
*   The user"s tasks are those assigned to an Identity for which the user is a Member
*   workflowTasks, projectTasks and actionTasks are booleans (1/0)
*
*/
Aras.prototype.getAssignedTasks = function (inBasketViewMode, workflowTasks, projectTasks, actionTasks) {
	var body = "<params><inBasketViewMode>" + inBasketViewMode + "</inBasketViewMode>";
	body += "<workflowTasks>" + workflowTasks + "</workflowTasks>";
	body += "<projectTasks>" + projectTasks + "</projectTasks>";
	body += "<actionTasks>" + actionTasks + "</actionTasks></params>";
	var statusId = this.showStatusMessage("status", this.getResource("", "workflow_methods.getting_user_activities"), system_progressbar1_gif);
	var res = this.soapSend("GetAssignedTasks", body);

	if (statusId != -1) {
		this.clearStatusMessage(statusId);
	}

	if (res.getFaultCode() != 0) {
		this.AlertError(res);
		return false;
	}

	var r = res.getResult().selectSingleNode("./Item").text;
	var s1 = r.indexOf("<thead>");
	var s2 = r.indexOf("</thead>", s1);
	if (r && s1 > -1 && s2 > -1) {
		var s =
			"<thead>" +
			"<th><![CDATA[" + this.getResource("", "inbasket.locked_column_nm") + "]]></th>" +
			"<th><![CDATA[" + this.getResource("", "inbasket.type_column_nm") + "]]></th>" +
			"<th><![CDATA[" + this.getResource("", "inbasket.workflow_project_column_nm") + "]]></th>" +
			"<th><![CDATA[" + this.getResource("", "inbasket.activity_name_column_nm") + "]]></th>" +
			"<th><![CDATA[" + this.getResource("", "inbasket.status_column_nm") + "]]></th>" +
			"<th><![CDATA[" + this.getResource("", "inbasket.start_date_column_nm") + "]]></th>" +
			"<th><![CDATA[" + this.getResource("", "inbasket.end_date_column_nm") + "]]></th>" +
			"<th><![CDATA[" + this.getResource("", "inbasket.instrucations_column_nm") + "]]></th>" +
			"<th><![CDATA[" + this.getResource("", "inbasket.assigned_to_column_nm") + "]]></th>" +
			"</thead>";
		r = r.substr(0, s1) + s + r.substr(s2 + 8);
	}
	return r;
}

Aras.prototype.getFormForDisplay = function Aras_getFormForDisplay(id, mode) {
	// this function is not a part of public API. please do not use it
	var criteriaName = mode == "by-name" ? "name" : "id";
	var resIOMItem;
	// if form is new return form from client cache
	var formNd = this.itemsCache.getItem(id);
	if (formNd && this.isTempEx(formNd)) {
		resIOMItem = this.newIOMItem();
		resIOMItem.dom = formNd.ownerDocument;
		resIOMItem.node = formNd;
		return resIOMItem;
	}

	// Show progress image in the status bar for main requests only
	var statusId = this.showStatusMessage("status", this.getResource("", "aras_object.loading_form", (mode == "by-name" ? id : "")), system_progressbar1_gif);
	res = this.MetadataCache.GetForm(id, criteriaName);
	this.clearStatusMessage(statusId);

	if (res.getFaultCode() != 0) {
		var resIOMError = this.newIOMInnovator().newError(res.getFaultString());
		return resIOMError;
	}

	res = res.getResult();
	resIOMItem = this.newIOMItem();
	resIOMItem.dom = res.ownerDocument;
	resIOMItem.node = res.selectSingleNode("Item");

	// Mark that the item type was requested by main thread in this session
	var ftypeName;
	try {
		ftypeName = resIOMItem.getProperty("name");
	} catch (exc) {
		ftypeName = null;
	}

	return resIOMItem;
}

Aras.prototype.clearClientMetadataCache = function Aras_resetCachedMetadataOnClient() {
	this.makeItemsGridBlank();
	this.MetadataCache.ClearCache();
}

Aras.prototype.getCacheObject = function Aras_getCacheObject() {
	//this is private internal function
	var mainWnd = this.getMainWindow();
	var Cache = mainWnd.Cache;

	if (!Cache) {
		Cache = this.newObject();
		mainWnd.Cache = Cache;
	}

	//for now because there are places where cache is accessed directly instead of call to this function
	if (!Cache.XmlResourcesUrls) {
		Cache.XmlResourcesUrls = this.newObject();
	}
	if (!Cache.UIResources) {
		Cache.UIResources = this.newObject();
	}

	return mainWnd.Cache;
}

Aras.prototype.getItemTypeDictionary = function Aras_getItemTypeDictionary(criteriaValue, criteriaName) {
	//this function is only a wrapper around for getItemTypeForClient
	//please do not use this function. call getItemTypeForClient instead.
	return this.getItemTypeForClient(criteriaValue, criteriaName);
}

Aras.prototype.getItemTypeForClient = function Aras_getItemTypeForClient(criteriaValue, criteriaName) {
	//this function is a very specific function. please use it only if it is critical for you
	//and there is no another good way to solve your task.
	var itemTypeName;
	var resIOMItem;
	var res;
	var statusId;

	if (criteriaName === undefined) {
		criteriaName = "name";
	}

	if (criteriaName == "name") {
		itemTypeName = criteriaValue;
	}
	else if (criteriaName == "id") {
		itemTypeName = this.getItemTypeName(criteriaValue);
	}
	else {
		throw new Error(1, this.getResource("", "aras_object.not_supported_criteria", criteriaName));
	}

	statusId = this.showStatusMessage("status", this.getResource("", "aras_object.loading_itemtype", (itemTypeName ? itemTypeName : "")), system_progressbar1_gif);
	res = this.MetadataCache.GetItemType(criteriaValue, criteriaName);
	this.clearStatusMessage(statusId);

	if (res.getFaultCode() != 0) {
		this.AlertError(res);
		var resIOMError = this.newIOMInnovator().newError(res.getFaultString());
		return resIOMError;
	}

	res = res.getResult();
	resIOMItem = this.newIOMItem();
	resIOMItem.dom = res.ownerDocument;
	resIOMItem.node = res.selectSingleNode("Item");
	return resIOMItem;
}

Aras.prototype.getItemTypeId = function Aras_getItemTypeId(name) {
	return this.MetadataCache.GetItemTypeId(name);
}

Aras.prototype.getItemTypeName = function Aras_getItemTypeName(id) {
	return this.MetadataCache.GetItemTypeName(id);
}

Aras.prototype.getRelationshipTypeId = function Aras_getRelationshipTypeId(name) {
	return this.MetadataCache.GetRelationshipTypeId(name);
}

Aras.prototype.getRelationshipTypeName = function Aras_getRelationshipTypeId(id) {
	return this.MetadataCache.GetRelationshipTypeName(id);
}

Aras.prototype.getListId = function Aras_getListId(name) {
	var key = this.MetadataCache.CreateCacheKey("getListId", name);
	var result = this.MetadataCache.GetItem(key);
	if (!result) {
		var value = this.getItemFromServerByName("List", name, "name", false);
		if (!value) {
			return "";
		}

		result = value.getID();
		this.MetadataCache.SetItem(key, result);
	}

	return result;
}

Aras.prototype.getFormId = function Aras_getFormId(name) {
	return this.MetadataCache.GetFormId(name);
}

Aras.prototype.getRelationshipType = function Aras_getRelationshipType(id) {
	var res = this.MetadataCache.GetRelationshipType(id, "id");
	if (res.getFaultCode() != 0) {
		this.AlertError(res);
	}
	res = res.getResult();

	var resIOMItem = this.newIOMItem();
	resIOMItem.dom = res.ownerDocument;
	resIOMItem.node = res.selectSingleNode("Item");

	return resIOMItem;
}

Aras.prototype.getLanguagesResultNd = function Aras_getLanguagesResultNd() {
	var cacheKey = this.MetadataCache.CreateCacheKey("getLanguagesResultNd", "Language");
	var cachedItem = this.MetadataCache.GetItem(cacheKey);

	if (cachedItem) {
		return cachedItem.content;
	}

	var res = this.getMainWindow().arasMainWindowInfo.getLanguageResult;
	if (res.getFaultCode() != 0) {
		return null;
	}
	var langs = res.results.selectSingleNode(this.XPathResult(""));

	cachedItem = aras.IomFactory.CreateCacheableContainer(langs, langs);
	this.MetadataCache.SetItem(cacheKey, cachedItem);

	return cachedItem.content;
}

Aras.prototype.getLocalesResultNd = function Aras_getLocalesResultNd() {
	var cacheKey = this.MetadataCache.CreateCacheKey("getLocalesResultNd", "Locale");
	var cachedItem = this.MetadataCache.GetItem(cacheKey);

	if (cachedItem) {
		return cachedItem.content;
	}

	var res = this.soapSend("ApplyItem", "<Item type='Locale' action='get' select='code, name, language'/>");
	if (res.getFaultCode() != 0) {
		return null;
	}
	var langs = res.results.selectSingleNode(this.XPathResult(""));

	cachedItem = aras.IomFactory.CreateCacheableContainer(langs, langs);
	this.MetadataCache.SetItem(cacheKey, cachedItem);

	return cachedItem.content;
}

Aras.prototype.getItemFromServer = function Aras_getItemFromServer(itemTypeName, id, selectAttr, related_expand, language) {
	if (!related_expand) {
		related_expand = false;
	}
	if (!selectAttr) {
		selectAttr = "";
	}
	var qry = this.getMostTopWindowWithAras(window).Item(itemTypeName, "get");
	qry.setAttribute("related_expand", (related_expand) ? "1" : "0");
	qry.setAttribute("select", selectAttr);
	qry.setProperty("id", id);
	if (language) {
		qry.setAttribute("language", language);
	}

	var results = qry.apply();

	if (results.isEmpty()) {
		return false;
	}

	if (results.isError()) {
		this.AlertError(results);
		return false;
	}

	return results.getItemByIndex(0);
}

Aras.prototype.getItemFromServerByName = function Aras_getItemFromServer(itemTypeName, name, selectAttr, related_expand) {
	if (!related_expand) {
		related_expand = false;
	}

	var qry = this.newIOMItem(itemTypeName, "get");
	qry.setAttribute("related_expand", (related_expand) ? "1" : "0");
	qry.setAttribute("select", selectAttr);
	qry.setProperty("name", name);

	var results = qry.apply();

	if (results.isEmpty()) {
		return false;
	}

	if (results.isError()) {
		this.AlertError(results);
		return false;
	}

	return results.getItemByIndex(0);
}

Aras.prototype.getItemFromServerWithRels = function Aras_getItemFromServerWithRels(itemTypeName, id, itemSelect, reltypeName, relSelect, related_expand) {
	if (!related_expand) {
		related_expand = false;
	}

	var qry = this.getMostTopWindowWithAras(window).Item(itemTypeName, "get");
	qry.setProperty("id", id);
	qry.setAttribute("select", itemSelect);

	if (reltypeName) {
		var topWnd = this.getMostTopWindowWithAras(window);
		var rel = new topWnd.Item(reltypeName, "get");
		rel.setAttribute("select", relSelect);
		rel.setAttribute("related_expand", (related_expand) ? "1" : "0");
		qry.addRelationship(rel);
	}

	var results = qry.apply();

	if (results.isEmpty()) {
		return false;
	}

	if (results.isError()) {
		this.AlertError(results);
		return false;
	}

	return results.getItemByIndex(0);
}

// This is not used and should be removed...
Aras.prototype.getFile = function Aras_getFile(value, fileSelect) {
	var topWnd = this.getMostTopWindowWithAras(window);
	var qry = new topWnd.Item("File", "get");
	qry.setAttribute("select", fileSelect);
	qry.setID(value);

	var results = qry.apply();

	if (results.isEmpty()) {
		return false;
	}

	if (results.isError()) {
		this.AlertError(results);
		return false;
	}
	return results.getItemByIndex(0);
}

Aras.prototype.refreshWindows = function Aras_refreshWindows(message, results, saveChanges) {
	if (saveChanges == undefined) {
		saveChanges = true;
	}

	// Skip the refresh if this is the unlock portion of the "Save, Unlock and Close" operation.
	if (!saveChanges) {
		return;
	}

	// If no IDs modified then nothing to refresh.
	var nodeWithIDs = message.selectSingleNode("event[@name='ids_modified']");
	if (!(nodeWithIDs && results)) {
		return;
	}

	// Get list of modified IDs
	var IDsArray = nodeWithIDs.getAttribute("value").split("|");

	// Refresh changed items in main window grid
	try {
		var mainWindow = this.getMainWindow();
		if (mainWindow.main.work.isItemsGrid) {
			var grid = mainWindow.main.work.grid;
			for (var chID = 0; chID < IDsArray.length; chID++) {
				var schID = IDsArray[chID];
				//new item
				var itmNode = results.selectSingleNode("//Item[@id='" + schID + "']");
				if (!itmNode || grid.getRowIndex(schID) == -1) {
					continue;
				}
				//old item
				this.refreshItemsGrid(itmNode.getAttribute("type"), schID, itmNode);
			}
		}
	}
	catch (excep) { }

	// Check if there are any other opened windows, that must be refreshed.
	var doRefresh = false;
	for (var winId in this.windowsByName) {
		var win = null;
		try {
			if (this.windowsByName.hasOwnProperty(winId)) {
				win = this.windowsByName[winId];
				if (this.isWindowClosed(win)) {
					this.deletePropertyFromObject(this.windowsByName, winId);
					continue;
				}

				// Item doesn't updated if it was changed by action(Manual Release, Create New Revision)
				/*if (win.top_ == top_) added "_" to "top" because we removed all the "top" in this file.
				continue;*/

				doRefresh = true;
				break;
			}
		}
		catch (excep) {
			continue;
		}
	}
	// Return if there are no windows to refresh.
	if (!doRefresh) {
		return;
	}

	// Get changed item ID (new Item) or new id=0 if item was deleted.
	var itemNode = results.selectSingleNode("//Item");
	var currentID = 0;
	if (itemNode) {
		currentID = itemNode.getAttribute("id");
	}

	var RefreshedRelatedItems = new Array();
	var RefreshedItems = new Object();
	var alreadyRefreshedWindows = new Object();
	var self = this;

	function refreshWindow(oldItemId, itemNd) {
		if (alreadyRefreshedWindows[oldItemId]) {
			return;
		}

		var win = self.uiFindWindowEx(oldItemId);
		if (!win) {
			return;
		}

		alreadyRefreshedWindows[oldItemId] = true;
		alreadyRefreshedWindows[itemNd.getAttribute("id")] = true; //just fo a case item is versionable
		self.uiReShowItemEx(oldItemId, itemNd);
	}
	var dependency = getTypeIdDependencyForRefreshing(IDsArray);
	refreshVersionableItem(dependency);

	function getTypeIdDependencyForRefreshing(IDsArray) {
		var result = new Object();
		for (var i in IDsArray) {
			var itemID = IDsArray[i];
			if (currentID == itemID) {
				continue;
			}

			//not locked items with id=itemID *anywhere* in the cache
			var nodes = self.itemsCache.getItemsByXPath("//Item[@id='" + itemID + "' and string(locked_by_id)='']");
			for (var j = 0; j < nodes.length; j++) {
				itemFromDom = nodes[j];
				var type = itemFromDom.getAttribute("type");
				//if type if LCM, Form, WFM, IT or RelshipType or id already refreshed skip adding it to array
				if (type == "Life Cycle Map" || type == "Form" || type == "Workflow Map" || type == "ItemType" || type == "RelationshipType" || RefreshedItems[itemID]) {
					continue;
				}

				var cid = itemFromDom.selectSingleNode("config_id");
				var value;
				if (cid) {
					value = { id: itemID, config_id: cid.text };
				}
				else {
					value = { id: itemID, config_id: undefined };
				}
				if (result[type]) {
					//get structure: type  = Array of {id, config_id}
					result[type].push(value);
				}
				else {
					result[type] = new Array();
					result[type].push(value);
				}
			}
		}
		return result;
	}

	function refreshVersionableItem(dependency) {
		for (var e in dependency) {
			var element = dependency[e];
			//e - type. Type contains multiple ids
			//create server request for data:
			/*
			<Item type="e" action="get">
				<config_id condition="in">id1, id2...</config_id>
				<is_current>1</is_current>
			</Item>
			*/
			var configIds = getConfigIdsForRequest(element);
			if (configIds == "") {
				continue;
			}

			var itemsToRefresh = self.loadItems(e, "<config_id condition='in'>" + configIds + "</config_id>" + "<is_current>1</is_current>", 0);
			for (var i = 0; i < itemsToRefresh.length; i++) {
				var itemNd = itemsToRefresh[i];
				var cid = itemNd.selectSingleNode("config_id").text;
				var id = getOldIdForRefresh(element, cid);
				refreshWindow(id, itemNd);
				self.refreshItemsGrid(e, id, itemNd);
			}
		}
	}

	function getOldIdForRefresh(dependencyArray, configID) {
		for (var i = 0; i < dependencyArray.length; i++) {
			if (dependencyArray[i].config_id == configID) {
				return dependencyArray[i].id;
			}
		}
	}

	function getConfigIdsForRequest(dependencyArray) {
		var preResult = new Array(); //create array of ids for request in order to make request string in the end
		var result = "";
		for (var i = 0; i < dependencyArray.length; i++) {
			if (dependencyArray[i].config_id) {
				preResult.push("'" + dependencyArray[i].config_id + "'");
			}
		}
		if (preResult.length > 0) {
			while (preResult.length > 1) {
				result += preResult.pop() + ",";
			}
			result += preResult.pop();
		}
		return result;
	}

	for (var i in IDsArray) {
		var itemID = IDsArray[i];
		//items with related_id=itemID
		var nodes1 = this.itemsCache.getItemsByXPath("//Item[count(descendant::Item[@isTemp='1'])=0 and string(@isDirty)!='1' and Relationships/Item/related_id/Item[@id='" + itemID + "']]");

		nodes = nodes1;
		// processing of items with related_id=itemID
		for (var j = 0; j < nodes.length; j++) {
			var itemNd = nodes[j];
			var id = itemNd.getAttribute("id");
			var type = itemNd.getAttribute("type");
			var bAlreadyRefreshed = false;
			for (var k = 0; k < RefreshedRelatedItems.length; k++) {
				if (id == RefreshedRelatedItems[k]) {
					bAlreadyRefreshed = true;
					break;
				}
			}

			if (bAlreadyRefreshed) {
				continue;
			}
			else {
				RefreshedRelatedItems.push(id);
			}

			if (id == currentID) {
				continue;
			}

			if (type == "Life Cycle Map" || type == "Form" || type == "Workflow Map" || type == "ItemType") {
				continue;
			}

			//IR-006509
			if (!this.isDirtyEx(itemNd)) {
				var related_ids = itemNd.selectNodes("Relationships/Item/related_id[Item/@id=\"" + currentID + "\"]"); //get related_id list with items with id=currentID

				//update related_id nodes in cache
				for (var i_r = 0, L = related_ids.length; i_r < L; i_r++) {
					var relshipItem = related_ids[i_r].parentNode;
					var relship_id = relshipItem.getAttribute("id");
					var relship_type = relshipItem.getAttribute("type");
					var res = this.soapSend("GetItem", "<Item type=\"" + relship_type + "\" id=\"" + relship_id + "\" select=\"related_id\"/>", undefined, false);

					if (res.getFaultCode() == 0) {
						var res_related_id = res.getResult().selectSingleNode("Item/related_id/Item[@id=\"" + currentID + "\"]");
						if (res_related_id == null) {
							continue;
						}

						//update attributes and child nodes
						var attr;
						for (var i_att = 0; i_att < res_related_id.attributes.length; i_att++) {
							attr = res_related_id.attributes[i_att];
							related_ids[i_r].setAttribute(attr.nodeName, attr.nodeValue);
						}

						//it more safe than replace node. Because it is possible that there are places where reference to releated_id/Item node
						//is chached in local variable. The replacement would just break the code.
						//mergeItem does not merge attributes in its current implementation. Thus the attributes are copied with the legacy code above.
						this.mergeItem(relshipItem.selectSingleNode("related_id/Item[@id=\"" + currentID + "\"]"), res_related_id);
					}
				}
			}

			refreshWindow(id, itemNd);
		} // ^^^ processing of items with related_id=itemID
	}
}

Aras.prototype.refreshItemsGrid = function Aras_refreshItemsGrid(itemTypeName, itemID, updatedItem) {
	var mainWindow = this.getMainWindow();

	if (!updatedItem) {
		return false;
	}
	var updatedID = updatedItem.getAttribute("id");

	try {
		if (!mainWindow.main.work.isItemsGrid) {
			return false;
		}
	}
	catch (excep) { return false; }

	if (itemTypeName == "ItemType") {
		if (itemID == mainWindow.main.work.itemTypeID) {
			mainWindow.main.work.location.replace("../scripts/blank.html");
			return true;
		}
	}

	if (mainWindow.main.work.itemTypeName != itemTypeName) {
		return false;
	}

	var grid = mainWindow.main.work.grid;
	if (grid.getRowIndex(itemID) == -1) {
		return true;
	}

	var wasSelected = (grid.getSelectedItemIds().indexOf(itemID) > -1);

	if (updatedID != itemID) {
		//hack to prevent rewrite deleteRow to use typeName and Id instead of node
		var oldItem = this.createXMLDocument();
		oldItem.loadXML("<Item type='" + itemTypeName + "' id='" + itemID + "'/>");
		oldItem = oldItem.documentElement;

		mainWindow.main.work.deleteRow(oldItem);
	}

	mainWindow.main.work.updateRow(updatedItem);

	if (wasSelected) {
		if (updatedID == itemID) {
			mainWindow.main.work.onSelectItem(itemID);
		}
		else {
			var currSel = grid.getSelectedId();
			//if (currSel)
			mainWindow.main.work.onSelectItem(currSel);
		}
	} //if (wasSelected)

	return true;
}

Aras.prototype.dirtyItemsHandler = function Aras_dirtyItemsHandler(win, readOnly) {
	if (this.getCommonPropertyValue("exitWithoutSavingInProgress")) {
		return;
	}
	var dirtyExist =
	(
		this.itemsCache.getItemsByXPath(
			"/Innovator/Items/Item[@action!='' and (@isTemp='1' or (locked_by_id='" +
			this.getUserID() +
			"' and (@isDirty='1' or .//Item/@isDirty='1' or .//Item/@isTemp='1')))]").length > 0
	);

	if (dirtyExist) {
		var param = new Object();

		param.aras = this.getMostTopWindowWithAras(window).aras;
		if (readOnly) {
			param.mode = "read_only";
		}
		if (!win) {
			win = window;
		}

		var options = {
			dialogWidth: 400,
			dialogHeight: 500,
			center: true
		};

		return this.modalDialogHelper.show("DefaultModal", win, param, options, "dirtyItemsList.html");
	}
}

Aras.prototype.openedWindowsHandler = function Aras_openedWindowsHandler(dhtmlEvent) {
	var openedExist = (this.getOpenedWindowsCount() > 0);

	if (openedExist) {
		var specialFlag = this.getCommonPropertyValue("exitWithoutSavingInProgress");
		if (this.isFirstCall_of_openedWindowsHandler && !specialFlag) {
			var param = new Object();
			param.buttons = new Object();
			param.buttons.btnYes = this.getResource("", "common.yes");
			param.buttons.btnNo = this.getResource("", "common.no");
			param.defaultButton = "btnYes";
			param.message = this.getResource("", "aras_object.innovator_windows_still_open");
			param.aras = this;
			var options = {
				dialogWidth: 300,
				dialogHeight: 130,
				resizable: true,
				center: true
			};

			var resButton = this.modalDialogHelper.show("DefaultModal", window, param, options, "groupChgsDialog.html");
			if (resButton != "btnYes") {
				this.deletePropertyFromObject(this, "isFirstCall_of_openedWindowsHandler");
			}
		}
		if (this.isFirstCall_of_openedWindowsHandler) {
			this.deletePropertyFromObject(this, "isFirstCall_of_openedWindowsHandler");
			var mainWnd = this.getMainWindow();
			var opWndsCount = this.getOpenedWindowsCount(true);
			this.ShowSplashScreen(mainWnd, opWndsCount, "aras.updateOfWindowsClosingProgress");
			if (specialFlag) {
				return { logout_confirmed: true };
			}

			openedExist = (this.getOpenedWindowsCount() > 0);
		}

		if (openedExist && (specialFlag ? (dhtmlEvent == "onunload") : true)) {
			var param = new Object();
			param.aras = this.getMostTopWindowWithAras(window).aras;
			param.mode = "opened_windows";
			param.event = dhtmlEvent;
			var options = {
				dialogWidth: 400,
				dialogHeight: 500,
				center: true
			};

			return this.modalDialogHelper.show("DefaultModal", window, param, options, "dirtyItemsList.html");
		}
	}

	if (openedExist) {
		return false;
	}
	else {
		return { logout_confirmed: true };
	}
}

Aras.prototype.getPreferenceItem = function Aras_getPreferenceItem(prefITName, specificITorRTId) {
	if (!prefITName) {
		return null;
	}

	var self = this;
	var prefKey;
	if (specificITorRTId) {
		if (prefITName == "Core_RelGridLayout") {
			var relType = this.getRelationshipType(specificITorRTId).node;
			var itID = specificITorRTId;
			if (relType) {
				itID = this.getItemProperty(relType, "relationship_id");
			}
			prefKey = this.MetadataCache.CreateCacheKey("Preference", prefITName, specificITorRTId, itID, this.preferenceCategoryGuid);
		}
		else {
			prefKey = this.MetadataCache.CreateCacheKey("Preference", prefITName, specificITorRTId, this.preferenceCategoryGuid);
		}
	}
	else {
		prefKey = this.MetadataCache.CreateCacheKey("Preference", prefITName, this.preferenceCategoryGuid);
	}

	var res = this.MetadataCache.GetItem(prefKey);
	if (res) {
		return res.content;
	}

	var findCriteriaPropNm = "";
	var findCriteriaPropVal = specificITorRTId;
	switch (prefITName) {
		case "Core_ItemGridLayout": {
			findCriteriaPropNm = "item_type_id";
			break;
		}
		case "Core_RelGridLayout": {
			findCriteriaPropNm = "rel_type_id";
			break;
		}
	}

	function getPrefQueryXml(prefCondition) {
		var xml = "<Item type='Preference' action='get'>";
		xml += prefCondition;

		xml += "<Relationships>";
		xml += "<Item type='" + prefITName + "'>";

		if (findCriteriaPropNm) {
			xml += "<" + findCriteriaPropNm + ">" + findCriteriaPropVal + "</" + findCriteriaPropNm + ">";
		}

		xml += "</Item>";
		xml += "</Relationships></Item>";
		return xml;
	}
	var xml = getPrefQueryXml(inner_getConditionForUser());
	var resDom = this.createXMLDocument();
	var prefMainItemID = this.getVariable("PreferenceMainItemID");
	var prefMainItemDom = this.createXMLDocument();
	var res = this.soapSend("ApplyItem", xml);
	if (res.getFaultCode() != 0) {
		this.AlertError(res);
		return null;
	}
	res = res.getResultsBody();
	if (res && res.indexOf("Item") > -1) {
		resDom.loadXML(res);
		if (!prefMainItemID) {
			prefMainItemDom.loadXML(res);
			var tmpNd = prefMainItemDom.selectSingleNode("/*/Relationships");
			if (tmpNd) {
				tmpNd.parentNode.removeChild(tmpNd);
			}
		}
	}
	if (!resDom.selectSingleNode("//Item[@type='" + prefITName + "']")) {
		xml = getPrefQueryXml(inner_getConditionForSite());
		res = this.soapSend("ApplyItem", xml);
		if (res.getFaultCode() != 0) {
			this.AlertError(res);
			return null;
		}
		var newPref = this.newItem(prefITName);
		var tmp = newPref.cloneNode(true);

		newPref = tmp;
		res = res.getResultsBody();
		if (res && res.indexOf("Item") > -1) {
			resDom.loadXML(res);
			var nds2Copy = resDom.selectNodes("//Item[@type='" + prefITName + "']/*[local-name()!='source_id' and local-name()!='permission_id']");
			for (var i = 0; i < nds2Copy.length; i++) {
				var newNd = newPref.selectSingleNode(nds2Copy[i].nodeName);
				if (!newNd) {
					newNd = newPref.appendChild(newPref.ownerDocument.createElement(nds2Copy[i].nodeName));
				}
				newNd.text = nds2Copy[i].text;
			}
		}
		if (findCriteriaPropNm) {
			var tmpNd = newPref.appendChild(newPref.ownerDocument.createElement(findCriteriaPropNm));
			tmpNd.text = findCriteriaPropVal;
		}
		resDom.loadXML(newPref.xml);
		if (!prefMainItemID) {
			var mainPref = this.newItem("Preference");
			var tmp = mainPref.cloneNode(true);

			mainPref = tmp;
			var userNd = this.getLoggedUserItem();
			identityNd = userNd.selectSingleNode("Relationships/Item[@type='Alias']/related_id/Item[@type='Identity']");
			if (!identityNd) {
				return null;
			}

			this.setItemProperty(mainPref, "identity_id", identityNd.getAttribute("id"));
			prefMainItemDom.loadXML(mainPref.xml);
		}
	}

	if (!prefMainItemID) {
		var mainPref = prefMainItemDom.documentElement;
		var tmpKey = this.MetadataCache.CreateCacheKey("Preference", mainPref.getAttribute("id"));
		var itm = aras.IomFactory.CreateCacheableContainer(mainPref, mainPref);
		this.MetadataCache.SetItem(tmpKey, itm);
		this.setVariable("PreferenceMainItemID", mainPref.getAttribute("id"));
	}

	var result = resDom.selectSingleNode("//Item[@type='" + prefITName + "']");

	var itm = aras.IomFactory.CreateCacheableContainer(result, result);
	this.MetadataCache.SetItem(prefKey, itm);
	return result;

	function inner_getConditionForSite() {
		var res =
			"<identity_id>" +
			"<Item type='Identity'>" +
			"<name>World</name>" +
			"</Item>" +
			"</identity_id>";
		return res;
	}
	function inner_getConditionForUser() {
		var res;
		var userNd = self.getLoggedUserItem();
		var identityNd = userNd.selectSingleNode("Relationships/Item[@type='Alias']/related_id/Item[@type='Identity']");
		if (!identityNd) {
			return "";
		}

		res = "<identity_id>" + identityNd.getAttribute("id") + "</identity_id>";
		return res;
	}
}

Aras.prototype.getPreferenceItemProperty = function Aras_getPreferenceItemProperty(prefITName, specificITorRTId, propNm, defaultVal) {
	var prefItm = this.getPreferenceItem(prefITName, specificITorRTId);
	return this.getItemProperty(prefItm, propNm, defaultVal);
}

Aras.prototype.setPreferenceItemProperties = function Aras_setPreferenceItemProperties(prefITName, specificITorRTId, varsHash) {
	if (!prefITName || !varsHash) {
		return false;
	}

	var prefNode = this.getPreferenceItem(prefITName, specificITorRTId);
	var varName;
	for (varName in varsHash) {
		var varValue = varsHash[varName];
		var nd = prefNode.selectSingleNode(varName);
		if (!nd) {
			nd = prefNode.appendChild(prefNode.ownerDocument.createElement(varName));
		}
		if (nd.text != varValue) {
			nd.text = varValue;
			var params = new Object();
			params.type = prefITName;
			params.specificITorRTId = specificITorRTId;
			params.propertyName = varName;
			this.fireEvent("PreferenceValueChanged", params);
		}
	}
	if (varName && !prefNode.getAttribute("action")) {
		prefNode.setAttribute("action", "update");
	}

	return true;
}

Aras.prototype.savePreferenceItems = function Aras_savePreferenceItems() {
	var prefArr = this.MetadataCache.GetItemsById(this.preferenceCategoryGuid);
	if (!prefArr || prefArr.length < 1) {
		return;
	}

	var prefMainItemID = this.getVariable("PreferenceMainItemID");
	var prefItem;
	if (prefMainItemID) {
		var tmpArr = this.MetadataCache.GetItemsById(prefMainItemID);
		if (tmpArr.length > 0) {
			prefItem = tmpArr[0].content;
		}
	}
	if (!prefItem) {
		return;
	}

	if (!prefItem.getAttribute("action")) {
		prefItem.setAttribute("action", "edit");
	}

	var rels = prefItem.selectSingleNode("Relationships");
	if (!rels) {
		rels = prefItem.appendChild(prefItem.ownerDocument.createElement("Relationships"));
	}
	var prefItemAction = prefItem.getAttribute("action");
	var i = 0;
	while (prefArr[i]) {
		var nd = prefArr[i].content;
		var ndAction = nd.getAttribute("action");
		if (ndAction) {
			nd = rels.appendChild(nd.cloneNode(true));
			if (ndAction == "add") {
				var whereArr = new Array();
				switch (nd.getAttribute("type")) {
					case "Core_GlobalLayout":
						whereArr.push("[Core_GlobalLayout].source_id='" + prefItem.getAttribute("id") + "'");
						break;
					case "Core_ItemGridLayout":
						whereArr.push("[Core_ItemGridLayout].source_id='" + prefItem.getAttribute("id") + "'");
						whereArr.push("[Core_ItemGridLayout].item_type_id='" + this.getItemProperty(nd, "item_type_id") + "'");
						break;
					case "Core_RelGridLayout":
						whereArr.push("[Core_RelGridLayout].source_id='" + prefItem.getAttribute("id") + "'");
						whereArr.push("[Core_RelGridLayout].rel_type_id='" + this.getItemProperty(nd, "rel_type_id") + "'");
						break;
				}
				if (whereArr.length) {
					nd.setAttribute("action", "merge");
					nd.setAttribute("where", whereArr.join(" AND "));
					nd.removeAttribute("id");
				}
			}
		}
		i++;
	}
	if (prefItemAction == "add") {
		prefItem.setAttribute("action", "merge");
		prefItem.setAttribute("where", "[Preference].identity_id='" + this.getItemProperty(prefItem, "identity_id") + "'");
		prefItem.removeAttribute("id");
	}

	prefItem.setAttribute("doGetItem", "0");
	try { this.soapSend("ApplyItem", prefItem.xml); } catch (e) { return; }
	return true;
}

Aras.prototype.mergeItemRelationships = function Aras_mergeItemRelationships(oldItem, newItem) {
	//this method is for internal purposes only.

	var newRelationships = newItem.selectSingleNode("Relationships");
	if (newRelationships != null) {
		var oldRelationships = oldItem.selectSingleNode("Relationships");
		if (oldRelationships == null) {
			var oldDoc = oldItem.ownerDocument;
			oldRelationships = oldItem.appendChild(oldDoc.createElement("Relationships"));
		}

		this.mergeItemsSet(oldRelationships, newRelationships);
	}
}

Aras.prototype.mergeItem = function Aras_mergeItem(oldItem, newItem) {
	//this method is for internal purposes only.
	var oldId = oldItem.getAttribute("id");
	if (oldId) {
		var newId = newItem.getAttribute("id");
		if (newId && oldId !== newId) {
			return; //do not merge Items with different ids.
		}
	}

	var allPropsXpath = "*[local-name()!='Relationships']";

	var oldAction = oldItem.getAttribute("action");
	if (!oldAction) {
		oldAction = "skip";
	}

	if (oldAction == "delete") {
		//do not merge newItem into oldSet
	}
	else if (oldAction == "add") {
		//this should never happen because getItem results cannot return not saved Item. do nothing here.
	}
	else if (oldAction == "update" || oldAction == "edit") {
		//we can add only missing properties here and merge relationships
		var newProps = newItem.selectNodes(allPropsXpath);
		for (var i = 0; i < newProps.length; i++) {
			var newProp = newProps[i];

			var propNm = newProp.nodeName;
			var oldProp = oldItem.selectSingleNode(propNm);

			if (!oldProp) {
				oldItem.appendChild(newProp.cloneNode(true));
			}
			else {
				var oldPropItem = oldProp.selectSingleNode("Item");
				if (oldPropItem) {
					var newPropItem = newProp.selectSingleNode("Item");
					if (newPropItem) {
						this.mergeItem(oldPropItem, newPropItem);
					}
				}
			}
		}

		mergeSpecialAttributes(oldItem, newItem);

		//merge relationships
		this.mergeItemRelationships(oldItem, newItem);
	}
	else if (oldAction == "skip") {
		//all properties not containing Items can be replaced here.

		//process oldItem properies with * NO * Item inside
		var oldProps = oldItem.selectNodes(allPropsXpath + "[not(Item)]");
		for (var i = 0; i < oldProps.length; i++) {
			var oldProp = oldProps[i];

			var propNm = oldProp.nodeName;
			var newProp = newItem.selectSingleNode(propNm);

			if (newProp) {
				oldItem.replaceChild(newProp.cloneNode(true), oldProp);
			}
		}

		//process oldItem properies with Item inside
		var oldItemProps = oldItem.selectNodes(allPropsXpath + "[Item]");
		for (var i = 0; i < oldItemProps.length; i++) {
			var oldProp = oldItemProps[i];

			var propNm = oldProp.nodeName;
			var newProp = newItem.selectSingleNode(propNm);

			if (newProp) {
				var oldPropItem = oldProp.selectSingleNode("Item");
				var newPropItem = newProp.selectSingleNode("Item");
				var oldPropItemId = oldPropItem.getAttribute("id");
				if (newPropItem) {
					var newPropItemId = newPropItem.getAttribute("id");
					//id of item may be changed in case of versioning or when item is replaced with another item on server-side
					if (oldPropItemId != newPropItemId) {
						var oldItemHasUnsavedChanges = Boolean(oldPropItem.selectSingleNode("descendant-or-self::Item[@action!='skip']"));
						if (oldItemHasUnsavedChanges) {
							//do nothing. mergeItem will do all it's best.
						}
						else {
							//set the new id on "old" Item tag
							oldPropItem.setAttribute("id", newPropItemId);

							//content of "old" Item tag is useless. Remove that.
							var children = oldPropItem.selectNodes("*");
							for (var j = 0, C_L = children.length; j < C_L; j++) {
								oldPropItem.removeChild(children[j]);
							}
						}
					}
					this.mergeItem(oldPropItem, newPropItem);
				}
				else {
					var oldPropItemAction = oldPropItem.getAttribute("action");
					if (!oldPropItemAction) {
						oldPropItemAction = "skip";
					}

					var newPropItemId = newProp.text;
					if (oldPropItemAction == "skip") {
						if (newPropItemId != oldPropItemId) {
							oldItem.replaceChild(newProp.cloneNode(true), oldProp);
						}
					}
				}
			}
		}

		//process all newItem properties which are missing in oldItem
		var newProps = newItem.selectNodes(allPropsXpath);
		for (var i = 0; i < newProps.length; i++) {
			var newProp = newProps[i];

			var propNm = newProp.nodeName;
			var oldProp = oldItem.selectSingleNode(propNm);

			if (!oldProp) {
				oldItem.appendChild(newProp.cloneNode(true));
			}
		}

		mergeSpecialAttributes(oldItem, newItem);

		//merge relationships
		this.mergeItemRelationships(oldItem, newItem);
	}

	function mergeSpecialAttributes(oldItem, newItem) {
		var specialAttrNames = new Array("discover_only", "type");
		for (var i = 0; i < specialAttrNames.length; i++) {
			if (newItem.getAttribute(specialAttrNames[i])) {
				oldItem.setAttribute(specialAttrNames[i], newItem.getAttribute(specialAttrNames[i]));
			}
		}
	}
}

Aras.prototype.mergeItemsSet = function Aras_mergeItemsSet(oldSet, newSet) {
	//this method is for internal purposes only.

	//both oldSet and newSet are nodes with Items inside. (oldSet and newSet normally are AML or Relationships nodes)
	var oldDoc = oldSet.ownerDocument;

	//we don't expect action attribute specified on Items from newSet
	var newItems = newSet.selectNodes("Item[not(@action)]");
	for (var i = 0; i < newItems.length; i++) {
		var newItem = newItems[i];
		var newId = newItem.getAttribute("id");
		var newType = newItem.getAttribute("type");
		var newTypeId = newItem.getAttribute("typeId");

		var oldItem = oldSet.selectSingleNode("Item[@id=\"" + newId + "\"][@type=\"" + newType + "\"]");
		if (!oldItem) {
			//
			oldItem = oldSet.appendChild(oldDoc.createElement("Item"));
			oldItem.setAttribute("id", newId);
			oldItem.setAttribute("type", newType);
			oldItem.setAttribute("typeId", newTypeId);
		}

		this.mergeItem(oldItem, newItem);
	}
}

// +++ Export to Office section +++
//this method is for internal purposes only.
Aras.prototype.export2Office = function Aras_export2Office(gridXmlCallback, toTool, itemNd, itemTypeName, tabName) {
	var statusId = this.showStatusMessage("status", this.getResource("", "aras_object.exporting"), system_progressbar1_gif);
	var aras = this;
	var contentCallback = function () {
		if (toTool == "export2Excel") {
			return Export2Excel(typeof (gridXmlCallback) == "function" ? gridXmlCallback() : gridXmlCallback, itemNd, itemTypeName, tabName);
		}
		return Export2Word(typeof (gridXmlCallback) == "function" ? gridXmlCallback() : gridXmlCallback, itemNd);
	};

	this.clearStatusMessage(statusId);
	this.saveString2File(contentCallback, toTool);

	function Export2Excel(gridXml, itemNd, itemTypeName, tabName) {
		var result;
		var relatedResult;
		var itemTypeNd;
		var gridDoc = aras.createXMLDocument();
		if (itemNd) {
			itemTypeNd = aras.getItemTypeForClient(itemNd.getAttribute("type"), "name").node;
		}

		if (!itemTypeName) {
			if (itemTypeNd) {
				itemTypeName = aras.getItemProperty(itemTypeNd, "name");
			}
			else {
				itemTypeName = "Innovator";
			}
		}

		if (!tabName) {
			tabName = "RelationshipsTab";
		}

		if (gridXml != "") {
			gridDoc.loadXML(gridXml);

			result = generateXML(gridDoc, (itemNd && itemNd.xml) ? tabName : itemTypeName);
		}

		if (itemNd && itemNd.xml && itemTypeNd) {
			var itemTypeID = itemTypeNd.getAttribute("id");
			var resDom = aras.createXMLDocument();
			resDom.loadXML("<Result>" + itemNd.xml + "</Result>");

			var xpath = "Relationships/Item[@type=\"Property\"]";
			var propNds = itemTypeNd.selectNodes(xpath);

			aras.uiPrepareDOM4GridXSLT(resDom);

			var grid_xml = aras.uiGenerateGridXML(resDom, propNds, null, itemTypeID, { mode: "forExport2Html" }, true);
			gridDoc.loadXML(grid_xml);

			var tableNd = gridDoc.selectSingleNode("//table");
			if (tableNd.selectSingleNode("thead").childNodes.length == 0) {
				generateThs(gridDoc, propNds);
			}

			if (tableNd.selectSingleNode("columns").childNodes.length == 0) {
				generateColumns(gridDoc, propNds);
			}

			relatedResult = generateXML(gridDoc, itemTypeName);
		}

		//form valid result xml for Excel export
		if (result) {
			if (relatedResult) {
				var relatedDom = aras.createXMLDocument();
				relatedDom.loadXML(relatedResult);
				relatedStyles = relatedDom.documentElement.childNodes[0].childNodes;

				var resultDom = aras.createXMLDocument();
				resultDom.loadXML(result);
				styles = resultDom.documentElement.childNodes[0].childNodes;

				result = "<?xml version=\"1.0\"?><ss:Workbook xmlns:p=\"urn:ExportBook\" xmlns:msxsl=\"urn:schemas-microsoft-com:xslt\" xmlns:usr=\"urn:the-xml-files:xslt\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\"><ss:Styles>";
				//merge all styles from from and relationships grid
				for (var i = 0; i < relatedStyles.length; i++) {
					result += relatedStyles[i].xml;
				}
				for (var j = 0; j < styles.length; j++) {
					result += styles[j].xml;
				}
				result += "</ss:Styles>";

				//merge two worksheets
				result += relatedDom.documentElement.childNodes[1].xml;
				result += resultDom.documentElement.childNodes[1].xml;

				result += "</ss:Workbook>";
			}
		}
		else {
			if (relatedResult) {
				result = relatedResult;
			}
			else {
				result = generateXML(gridDoc);
			}
		}
		return result;

		function generateThs(dom, propNds) {
			var parentNode = dom.selectSingleNode("//thead");
			for (var i = 0; i < propNds.length; i++) {
				var pNd = propNds[i];
				var lbl = aras.getItemProperty(pNd, "label");
				var nm = aras.getItemProperty(pNd, "name");
				var newTh = parentNode.appendChild(dom.createElement("th"));
				newTh.setAttribute("align", "c");
				newTh.text = (lbl ? lbl : nm);
			}
			return dom;
		}

		function generateColumns(dom, propNds) {
			var parentNode = dom.selectSingleNode("//columns");
			for (var i = 0; i < propNds.length; i++) {
				var pNd = propNds[i];
				var lbl = aras.getItemProperty(pNd, "label");
				var nm = aras.getItemProperty(pNd, "name");
				var type = aras.getItemProperty(pNd, "data_type");
				var widthAttr = (lbl ? lbl : nm).length * 8;
				var newCol = parentNode.appendChild(dom.createElement("column"));
				if (type == "date") {
					newCol.setAttribute("sort", "DATE");
				}
				else if (type == "integer" || type == "float" || type == "decimal") {
					newCol.setAttribute("sort", "NUMERIC");
				}
				newCol.setAttribute("width", widthAttr);
				newCol.setAttribute("order", i);
			}
			return dom;
		}
	}

	function Export2Word(gridXml, itemNd) {
		function generateThs(propNds) {
			var res = "<tr/>";
			var tmpDom = aras.createXMLDocument();
			tmpDom.loadXML(res);
			for (var i = 0; i < propNds.length; i++) {
				var pNd = propNds[i];
				var lbl = aras.getItemProperty(pNd, "label");
				var nm = aras.getItemProperty(pNd, "name");
				var newTh = tmpDom.documentElement.appendChild(tmpDom.createElement("th"));
				newTh.setAttribute("align", "center");
				newTh.setAttribute("style", "background-color:#d4d0c8;");
				newTh.text = (lbl ? lbl : nm);
			}
			res = tmpDom.xml;
			return res;
		}

		var html = generateHtml(gridXml);
		if (itemNd && itemNd.xml) {
			var itemTypeNd = aras.getItemTypeForClient(itemNd.getAttribute("type"), "name").node;
			if (itemTypeNd) {
				var itemTypeID = itemTypeNd.getAttribute("id");
				var resDom = aras.createXMLDocument();
				resDom.loadXML("<Result>" + itemNd.xml + "</Result>");

				var xpath = "Relationships/Item[@type=\"Property\"]";
				var propNds = itemTypeNd.selectNodes(xpath);

				aras.convertFromNeutralAllValues(resDom.selectSingleNode("/Result/Item"));

				aras.uiPrepareDOM4GridXSLT(resDom);
				var grid_xml = aras.uiGenerateGridXML(resDom, propNds, null, itemTypeID, { mode: "forExport2Html" }, true);
				var tmpHtml = generateHtml(grid_xml);
				if (tmpHtml.indexOf("<th") == -1) {
					var a = tmpHtml.indexOf("<tr");
					tmpHtml = tmpHtml.substr(0, a) + generateThs(propNds) + tmpHtml.substr(a);
				}

				var i = html.indexOf("<table");
				var i2 = tmpHtml.indexOf("<table");
				var i3 = tmpHtml.lastIndexOf("</table>");
				if (i > 0) {
					html = html.substr(0, i) + tmpHtml.substr(i2, i3 - i2 + 8) + "<br/>" + html.substr(i);
				}
			}
		}
		return html;
	}

	function generateHtml(gridXml) {
		var res = "";
		var gridDom = aras.createXMLDocument();
		if (!gridXml) {
			gridXml = "<table></table>";
		}
		gridDom.loadXML(gridXml);
		if (gridDom.parseError.errorCode == 0) {
			var tblNd = gridDom.selectSingleNode("//table");
			if (tblNd) {
				tblNd.setAttribute("base_href", aras.getScriptsURL());
			}
			res = aras.applyXsltFile(gridDom, aras.getScriptsURL() + "../styles/printGrid4Export.xsl");
		}
		return res;
	}

	function generateXML(gridDom, workSheetName) {
		var res = "";
		var tblNd = gridDom.selectSingleNode("//table");
		if (tblNd) {
			tblNd.setAttribute("base_href", aras.getScriptsURL());

			if (workSheetName) {
				tblNd.setAttribute("workSheet", workSheetName);
			}
		}
		try {
			return aras.applyXsltFile(gridDom, aras.getScriptsURL() + "../styles/printGrid4ExportToExcel.xsl");
		}
		catch (excep) {
			if (aras && aras.AlertError) {
				aras.AlertError(excep.number, excep.description);
			}
		}
	}
}

//this method is for internal purposes only.
Aras.prototype.saveString2File = function Aras_saveString2File(contentCallback, extension, fileName, showSaveAsDialog, quite) {
	var ext = "unk";
	if (extension) {
		ext = extension.toLowerCase();
	}

	var fileNamePrefix = "export2unknown_type";
	if (fileName) {
		fileNamePrefix = fileName;
	}

	if (ext.indexOf("excel") != -1) {
		ext = "xls";
		fileNamePrefix = this.getResource("", "aras_object.export2excel_file_prefix");
	}
	else if (ext.indexOf("word") != -1) {
		ext = "doc";
		fileNamePrefix = this.getResource("", "aras_object.export2word_file_prefix");
	}

	try {
		var vaultApplet = this.vault;
		var getWorkingDirResult = this.getWorkingDir(true);
		if (getWorkingDirResult === undefined) {
			return;
		}

		var fn = getWorkingDirResult + "\\" + fileNamePrefix + "." + ext;
		if (showSaveAsDialog === undefined || showSaveAsDialog === true) {
			fn = vaultApplet.fileCreateWithSaveAsDialog(fileNamePrefix, ext);
		}

		if (fn != "") {
			var content = contentCallback();
			if (content) {
				vaultApplet.fileCreate(fn);
				vaultApplet.fileOpenAppend(fn, "UTF-8");
				vaultApplet.fileWriteLine(content);
				vaultApplet.fileClose();
			}
		}
	}
	catch (excep) {
		fn = "";
	}

	if (fn && !quite) {
		this.AlertSuccess(this.getResource("", "aras_object.file_saved_as", fn));
	}

	return true;
}
// --- Export to Office section ---

Aras.prototype.EscapeSpecialChars = function Aras_EscapeSpecialChars(str) {
	if (!this.utilDoc) {
		this.utilDoc = this.createXMLDocument();
	}
	var element_t = this.utilDoc.createElement("t");
	element_t.text = str;
	var result = element_t.xml;
	return result.substr(3, result.length - 7);
}

// value returned as xpath function concat(), ie addition quotes aren't needed
Aras.prototype.EscapeXPathStringCriteria = function Aras_EscapeXPathStringCriteria(str) {
	var res = str.replace(/'/g, "',\"'\",'");
	if (res != str) {
		return "concat('" + res + "')";
	}
	else {
		return "'" + res + "'"
	}
}

/*
//unit tests for Aras_isPropertyValueValid function
Boolean ? value is 0 or 1. (*)
Color ? must satisfy regexp /^#[a-f0-9]{6}$|^btnface$/i. (*)
Color List ? must satisfy regexp /^#[a-f0-9]{6}$|^btnface$/i. (*)
Date ? input string must represent a date in a supported format. (*)
Decimal ? must be a number. (*)
Federated ? read-only. No check.
Filter List ? string length must be not greater than 64. (*)
Float ? must be a number. (*)
Foreign ? read-only. No check.
Formatted Text ? No check.
Image ? string length must be not greater than 128. (*)
Integer ? must be an integer number. (*)
Item ? must be an item id (32 characters from [0-9A-F] set). (*)
List ? string length must be not greater than 64. (*)
MD5 ? 32 characters from [0-9A-F] set. (*)
Sequence ? read-only. No check.
String ? check if length of inputted string is not greater than maximum permissible string length.
Verify against property pattern if specified. (*)
Text ? No check.

Where (*) means: Empty value is not permissible if property is marked as required.

Property definition:
data_type - string
pattern   - string
is_required - boolean
stored_length - integer
*/
/*common tests part* /
var allDataTypes = new Array("boolean", "color", "color list", "date", "decimal", "federated", "filter list", "float", "foreign", "formatted text", "image", "integer", "item", "list", "md5", "sequence", "string", "text");
function RunTest(testDescription, testDataArr, expectedResults)
{
var failedTests = new Array();
for (var i=0; i<testDataArr.length; i++)
{
var testData = testDataArr[i];
var data_type = testData.propertyDef.data_type;
var expectedRes = expectedResults[data_type.replace(/ /g, "_")];

var r = Aras_isPropertyValueValid(testData.propertyDef, testData.propertyValue);

if (r !== expectedRes)
{
failedTests.push(data_type);
}
}

var resStr = (failedTests.length == 0) ? "none" : failedTests.toString();
alert(testDescription + "\n\nFailed tests: " + resStr);
}
/**/
/*empty value tests* /
var expectedRes_EmptyValue =
{
boolean: true,
color  : true,
color_list: true,
date   : true,
decimal: true,
federated: true,
filter_list: true,
float  : true,
foreign: true,
formatted_text: true,
image  : true,
integer: true,
item   : true,
list   : true,
md5    : true,
sequence: true,
string : true,
text   : true
};

var expectedRes_EmptyValueAndIsRequired =
{
boolean: false,
color  : false,
color_list: false,
date   : false,
decimal: false,
federated: true,
filter_list: false,
float  : false,
foreign: true,
formatted_text: true,
image  : false,
integer: false,
item   : false,
list   : false,
md5    : false,
sequence: true,
string : false,
text   : true
};

var testData_EmptyValueAndIsRequired = new Array();
var testData_EmptyValue = new Array();
for (var i=0; i<allDataTypes.length; i++)
{
var propertyDef = {data_type: allDataTypes[i], is_required:true};
var testData    = {propertyDef: propertyDef, propertyValue: ""};
testData_EmptyValueAndIsRequired.push(testData);

propertyDef = {data_type: allDataTypes[i], is_required:false};
testData    = {propertyDef: propertyDef, propertyValue: ""};
testData_EmptyValue.push(testData);
}

RunTest("Empty value", testData_EmptyValue, expectedRes_EmptyValue);
RunTest("Empty value and property is required", testData_EmptyValueAndIsRequired, expectedRes_EmptyValueAndIsRequired);
/**/

Aras.prototype.isInteger = function Aras_isInteger(propertyValue) {
	return (String(parseInt(propertyValue)) == propertyValue);
}

Aras.prototype.isPositiveInteger = function Aras_isPositiveInteger(propertyValue) {
	return (this.isInteger(propertyValue) && parseInt(propertyValue) > 0);
}

Aras.prototype.isNegativeInteger = function Aras_isPositiveInteger(propertyValue) {
	return (this.isInteger(propertyValue) && parseInt(propertyValue) < 0);
}

Aras.prototype.isPropertyValueValid = function Aras_isPropertyValueValid(propertyDef, propertyValue, inputLocale) {
	this.ValidationMsg = "";
	var data_type = propertyDef.data_type;

	if (propertyValue !== "") {
		switch (data_type) {
			case "boolean":
				if (!propertyValue == "0" && !propertyValue == "1") {
					this.ValidationMsg = this.getResource("", "aras_object.value_property _must_be _boolean");
				}
				break;
			case "color":
			case "color list":
				if (!/^#[a-f0-9]{6}$|^btnface$/i.test(propertyValue)) {
					this.ValidationMsg = this.getResource("", "aras_object.value_property_invalid_contains_incorrect_symbols");
				}
				break;
			case "date":
				var dateFormat = this.getDateFormatByPattern(propertyDef.pattern || "short_date"),
					lessStrictFormat = dateFormat,
					neutralDate, dotNetPattern;

				propertyValue = typeof (propertyValue) === "string" ? propertyValue.trim() : propertyValue;
				while (lessStrictFormat && !neutralDate) {
					dotNetPattern = this.getClippedDateFormat(lessStrictFormat) || this.getDotNetDatePattern(lessStrictFormat);
					neutralDate = this.IomInnovator.getI18NSessionContext().ConvertToNeutral(propertyValue, data_type, dotNetPattern);
					lessStrictFormat = this.getLessStrictDateFormat(lessStrictFormat);
				}

				if (typeof neutralDate !== "string") {
					this.ValidationMsg = this.getResource("", "aras_object.value_property_invalid_must_be_date");
				}
				break;
			case "decimal":
				var decimalNumber = this.IomInnovator.getI18NSessionContext().ConvertToNeutral(propertyValue, data_type);
				if (isNaN(parseFloat(decimalNumber))) {
					this.ValidationMsg = this.getResource("", "aras_object.value_property_invalid_must_be_decimal");
				}
				break;
			case "federated":
				break;
			case "float":
				var floatNumber = this.IomInnovator.getI18NSessionContext().ConvertToNeutral(propertyValue, data_type);
				if (isNaN(parseFloat(floatNumber))) {
					this.ValidationMsg = this.getResource("", "aras_object.value_property_invalid_must_be_float");
				}
				break;
			case "foreign":
			case "formatted text":
				break;
			case "image":
				if (propertyValue.length > 128) {
					this.ValidationMsg = this.getResource("", "aras_object.length_image_property_cannot_be_larger_128_symbols");
				}
				break;
			case "integer":
				if (!this.isInteger(propertyValue)) {
					this.ValidationMsg = this.getResource("", "aras_object.value_property_invalid_must_be_integer");
				}
				break;
			case "item":
				if (typeof (propertyValue) == "string" && !/^[0-9a-f]{32}$/i.test(propertyValue)) {
					this.ValidationMsg = this.getResource("", "aras_object.value_property_invalid_must_be_item_id");
				}
				break;
			case "md5":
				if (!/^[0-9a-f]{32}$/i.test(propertyValue)) {
					this.ValidationMsg = this.getResource("", "aras_object.value_property_invalid_must_be_md5");
				}
				break;
			case "sequence":
				break;
			case "filter list":
			case "list":
			case "ml_string":
			case "mv_list":
			case "string":
				if (propertyDef.stored_length < propertyValue.length) {
					this.ValidationMsg = this.getResource("", "aras_object.length_properties_value_canot_be_larger", propertyDef.stored_length);
					break;
				}
				if (data_type == "string" && propertyDef.pattern) {
					var re = new RegExp(propertyDef.pattern);
					if (!re.test(propertyValue)) {
						this.ValidationMsg = this.getResource("", "aras_object.value_property_invalid_must_correspond_with_pattern", propertyDef.pattern);
						break;
					}
				}
				break;
			case "text":
				break;
			default:
				throw new Error(5, this.getResource("", "aras_object.invalid_parameter_propertydef_data_type"));
				break;
		}
	}

	if (this.ValidationMsg != "") {
		this.ValidationMsg += " " + this.getResource("", "aras_object.edit_again");
	}
	return this.ValidationMsg == "";
}

Aras.prototype.ValidationMsg = "";

Aras.prototype.showValidationMsg = function Aras_showValidationMsg(ownerWindow) {
	return this.confirm(this.ValidationMsg, ownerWindow);
}

/// Indicate whether window is closed.
/// Supposition: sometimes invoking of property window.closed launch exception "Permission denied". (After applying patch KB918899)
Aras.prototype.isWindowClosed = function Aras_isWindowClosed(window) {

	return this.browserHelper && this.browserHelper.isWindowClosed(window);
}

//+++ some api for classification +++
Aras.prototype.isClassPathRoot = function Aras_isClassPathRoot(class_path) {
	return "" == class_path || !class_path;
}

Aras.prototype.areClassPathsEqual = function Aras_areClassPathsEqual(class_path1, class_path2) {
	//return this.doesClassPath1StartWithClassPath2(class_path1, class_path2, true);
	return class_path1 == class_path2;
}

Aras.prototype.doesClassPath1StartWithClassPath2 = function Aras_doesClassPath1StartWithClassPath2(class_path1, class_path2) {
	if (class_path2.length > class_path1.length) {
		return false;
	}

	var class_path1Elements = class_path1.split("\/");
	var class_path2Elements = class_path2.split("\/");

	if (class_path2Elements.length > class_path1Elements.length) {
		return false;
	}

	for (var i = 0; i < class_path2Elements.length; i++) {
		if (class_path2Elements[i] != class_path1Elements[i]) {
			return false;
		}
	}

	return true;
}

/*
Aras.prototype.fireUnitTestsForSelectPropNdsByClassPath = function Aras_fireUnitTestsForSelectPropNdsByClassPath()
{
var pNms = new Array("simple classpath", "with chars to escape", "root1", "root2", "root3", "child class path", "wrong root");
//!!!before testing remove // and the second occurence of /* in the next code line
//var cps = new Array("/test/simple Classpath", "/*/
/*with \\chars\\ \" to escape<<>>[[[[]:-))))B!!!!", "", "/*", "/test", "/test/simple Classpath/its child", "/WRONG ROOT/simple Classpath");
var checkSums = new Array(4, 4, 3, 3, 3, 5, 5);//numbers of nodes returned according to class paths stored in cps array.

if (pNms.length!=cps.length || pNms.length!=checkSums.length)
{
alert("test setup is incorrect");
return;
}
var xml = "<Item type='ItemType'><name>test</name>"+
"<Relationships>"+
"<Item type='Property'>"+
"<name>"+pNms[0]+"</name>"+
"<class_path>"+cps[0]+"</class_path>"+
"</Item>"+
"<Item type='Property'>"+
"<name>"+pNms[1]+"</name>"+
"<class_path><![CDATA["+cps[1]+"]]></class_path>"+
"</Item>"+
"<Item type='Property'>"+
"<name>"+pNms[2]+"</name>"+
"<class_path>"+cps[2]+"</class_path>"+
"</Item>"+
"<Item type='Property'>"+
"<name>"+pNms[3]+"</name>"+
"<class_path>"+cps[3]+"</class_path>"+
"</Item>"+
"<Item type='Property'>"+
"<name>"+pNms[4]+"</name>"+
"<class_path>"+cps[4]+"</class_path>"+
"</Item>"+
"<Item type='Property'>"+
"<name>"+pNms[5]+"</name>"+
"<class_path>"+cps[5]+"</class_path>"+
"</Item>"+
"<Item type='Property'>"+
"<name>"+pNms[6]+"</name>"+
"<class_path>"+cps[6]+"</class_path>"+
"</Item>"+
"</Relationships></Item>"
var d = this.createXMLDocument();
d.loadXML(xml);
var itemTypeNd = d.documentElement;
var propNds;
var res = "Result:\n";
var class_path;
for (var i=0; i<cps.length; i++)
{
class_path = cps[i];
propNds = this.selectPropNdsByClassPath(class_path, itemTypeNd);
res += "class_path="+class_path + ", result="+((propNds && propNds.length==checkSums[i]) ? "true" : "false") + "\n";
}
alert(res);
}
*/

Aras.prototype.selectPropNdsByClassPath = function Aras_selectPropNdsByClassPath(class_path, itemTypeNd, excludePropsWithThisClassPath, ignoreProps2Delete) {
	if (!itemTypeNd || !itemTypeNd.xml) {
		return null;
	}

	var xp = "Relationships/Item[@type='Property']";
	if (ignoreProps2Delete) {
		xp += "[string(@action)!='delete' and string(@action)!='purge']";
	}
	var tmpXp = " starts-with(" + this.EscapeXPathStringCriteria(class_path) + ", class_path)";
	if (excludePropsWithThisClassPath) {
		tmpXp = "not(" + tmpXp + ")";
	}
	xp += "[" + tmpXp + "]";
	return itemTypeNd.selectNodes(xp);
}
//--- some api for classification ---

//+++ internal api for converting to/from neutral +++
Aras.prototype.getSessionContextLocale = function Aras_getSessionContextLocale() {
	return this.IomInnovator.getI18NSessionContext().GetLocale();
}

Aras.prototype.getSessionContextLanguageCode = function Aras_getSessionContextLanguageCode() {
	return this.IomInnovator.getI18NSessionContext().GetLanguageCode();
}

Aras.prototype.getLanguageDirection = function Aras_getLanguageDirection(languageCode) {
	var direction,
		languages = this.getLanguagesResultNd(),
		currentLanguage;

	if (!languageCode) {
		languageCode = this.getSessionContextLanguageCode();
	}

	if (languageCode) {
		currentLanguage = languages.selectSingleNode("Item[@type='Language' and code='" + languageCode + "']");
		if (currentLanguage) {
			direction = this.getItemProperty(currentLanguage, "direction");
		}
	}

	// default value is ltr
	if (!direction) {
		direction = "ltr";
	}

	return direction;
}

Aras.prototype.getCorporateToLocalOffset = function Aras_getCorporateToLocalOffset() {
	var r = this.IomInnovator.getI18NSessionContext().GetCorporateToLocalOffset();
	r = parseInt(r);
	if (isNaN(r)) {
		r = 0;
	}
	return r;
}

Aras.prototype.parse2NeutralEndOfDayStr = function Aras_parse2NeutralEndOfDayStr(dtObj) {
	var yyyy = String(dtObj.getFullYear());
	var h = new Object();
	h.MM = String("0" + (dtObj.getMonth() + 1));
	h.dd = String("0" + dtObj.getDate());
	h.hh = String("0" + dtObj.getHours());
	h.mm = String("0" + dtObj.getMinutes());
	h.ss = String("0" + dtObj.getSeconds());
	for (var k in h) {
		h[k] = h[k].substr(h[k].length - 2);
	}
	var r = yyyy + "-" + h.MM + "-" + h.dd + "T" + h.hh + ":" + h.mm + ":" + h.ss;
	r = this.convertToNeutral(r, "date", "yyyy-MM-ddTHH:mm:ss");
	yyyy = r.substr(0, 4);
	h.MM = r.substr(5, 2);
	h.dd = r.substr(8, 2);
	r = yyyy + "-" + h.MM + "-" + h.dd + "T23:59:59";
	return r;
}

Aras.prototype.getDateFormatByPattern = function Aras_getDateFormatByPattern(pattern) {
	if (/_date/.test(pattern)) {
		return pattern;
	}
	else {
		var dateFormats = ["short_date", "short_date_time", "long_date", "long_date_time"],
			currentFormat, dotNetPattern,
			i;

		for (i = 0; i < dateFormats.length; i++) {
			currentFormat = dateFormats[i];
			dotNetPattern = this.getDotNetDatePattern(currentFormat);
			alteredPattern = dotNetPattern.replace(/tt/g, "a").replace(/dddd/g, "EEEE");

			if (pattern === dotNetPattern || pattern === alteredPattern) {
				return currentFormat;
			}
		}
	}

	return undefined;
}

Aras.prototype.getClippedDateFormat = function Aras_getClippedDateFormat(dateFormat) {
	switch (dateFormat) {
		case "long_date_time|no_ampm":
			var fullFormatString = this.getDotNetDatePattern("long_date_time");
			return fullFormatString.replace(/[a|t]/g, "").trim();
		case "short_date_time|no_ampm":
			var fullFormatString = this.getDotNetDatePattern("short_date_time");
			return fullFormatString.replace(/[a|t]/g, "").trim();
		default: return "";
	}
}

Aras.prototype.getLessStrictDateFormat = function Aras_getLessStrictDateFormat(dateFormat) {
	switch (dateFormat) {
		case "long_date":
			return "short_date";
		case "long_date_time":
			return "long_date_time|no_ampm";
		case "long_date_time|no_ampm":
			return "short_date_time";
		case "short_date_time":
			return "short_date_time|no_ampm";
		case "short_date_time|no_ampm":
			return "short_date";
		default:
			return "";
	}
}

//converts localValue to neutral format if need
Aras.prototype.convertToNeutral = function Aras_convertToNeutral(localValue, dataType, dotNetPattern) {
	var convertedValue;

	if (localValue && (typeof (localValue) !== "object") && dataType) {
		switch (dataType) {
			case "date":
				localValue = typeof (localValue) === "string" ? localValue.trim() : localValue;
				dotNetPattern = dotNetPattern || "short_date";
				convertedValue = this.IomInnovator.getI18NSessionContext().ConvertToNeutral(localValue, dataType, dotNetPattern);

				if (!convertedValue) {
					var dateFormat = this.getDateFormatByPattern(dotNetPattern),
						lessStrictFormat = this.getLessStrictDateFormat(dateFormat);

					while (lessStrictFormat && !convertedValue) {
						dotNetPattern = this.getClippedDateFormat(lessStrictFormat) || this.getDotNetDatePattern(lessStrictFormat);
						convertedValue = this.IomInnovator.getI18NSessionContext().ConvertToNeutral(localValue, dataType, dotNetPattern);
						lessStrictFormat = this.getLessStrictDateFormat(lessStrictFormat);
					}
				}
				break;
			default:
				convertedValue = this.IomInnovator.getI18NSessionContext().ConvertToNeutral(localValue, dataType, dotNetPattern);
				break;
		}
	}

	return convertedValue || localValue;
}

//converts val from neutral format if need
Aras.prototype.convertFromNeutral = function Aras_convertFromNeutral(val, data_type, dotNetPattern4Date) {
	if (!val) {
		return val;
	}
	if (!data_type) {
		return val;
	}
	if (!dotNetPattern4Date) {
		dotNetPattern4Date = "";
	}
	if (val === null || val === undefined) {
		val = "";
	}
	if (typeof (val) == "object") {
		return val;
	}

	var retVal = this.IomInnovator.getI18NSessionContext().ConvertFromNeutral(val, data_type, dotNetPattern4Date);
	if (!retVal) {
		retVal = val;
	}
	return retVal;
}

Aras.prototype.convertFromNeutralAllValues = function Aras_convertFromNeutralAllValues(itmNd) {
	if (itmNd && itmNd.xml) {
		var itemTypeNd = this.getItemTypeForClient(itmNd.getAttribute("type"), "name").node;
		if (itemTypeNd) {
			var xpath = "Relationships/Item[@type='Property']";
			var propNds = itemTypeNd.selectNodes(xpath);
			for (var i = 0; i < propNds.length; i++) {
				var propNm = this.getItemProperty(propNds[i], "name");
				var v = this.getItemProperty(itmNd, propNm);
				if (v) {
					var propDataType = this.getItemProperty(propNds[i], "data_type");
					var datePtrn = "";
					if (propDataType == "date") {
						datePtrn = this.getDotNetDatePattern(this.getItemProperty(propNds[i], "pattern"));
					}
					this.setItemProperty(itmNd, propNm, this.convertFromNeutral(v, propDataType, datePtrn), false);
				}
			}
		}
	}
}

Aras.prototype.getDotNetDatePattern = function Aras_getDotNetDatePattern(innovatorDatePattern) {
	if (!innovatorDatePattern) {
		innovatorDatePattern = "";
	}
	var retVal = this.IomInnovator.getI18NSessionContext().GetUIDatePattern(innovatorDatePattern);
	return retVal;
}

Aras.prototype.getDecimalPattern = function Aras_getDecimalPattern(precision, scale) {
	var index,
		optionalDigitCharacter = "#",
		requiredDigitCharacter = "0",
		decimalSeparatorCharacter = ".",
		integralPartPattern = "",
		fractionalPartPattern = "";

	precision = (!precision || isNaN(precision)) ? 38 : precision;
	scale = (!scale || isNaN(scale)) ? 0 : scale;

	for (index = 0; index < precision - scale - 1; index++) {
		integralPartPattern += optionalDigitCharacter;
	}
	integralPartPattern += requiredDigitCharacter;

	for (index = 0; index < scale; index++) {
		fractionalPartPattern += requiredDigitCharacter;
	}

	return fractionalPartPattern ? integralPartPattern + decimalSeparatorCharacter + fractionalPartPattern : integralPartPattern;
}
//--- internal api for converting to/from neutral ---

Aras.prototype.getResource = function Aras_getResource() {
	if (arguments.length < 2) {
		return;
	}

	var solution = arguments[0];
	if (!solution) {
		solution = "core";
	}
	solution = solution.toLowerCase();
	var key = arguments[1];
	var params2replace = this.newArray();
	for (var i = 0; i < arguments.length - 2; i++) {
		params2replace.push(arguments[i + 2]);
	}

	var Cache = this.getCacheObject();
	if (!Cache.UIResources[solution]) {
		Cache.UIResources[solution] = this.newUIResource(solution);
	}

	return Cache.UIResources[solution].getResource(key, params2replace);
};

Aras.prototype.newUIResource = function Aras_newUIResource(solution) {
	var mainArasObj = this.getMainArasObject();

	if (mainArasObj && mainArasObj != this) {
		return mainArasObj.newUIResource(solution);
	}
	else {
		return (new UIResource(this, solution));
	}
};

function UIResource(parentAras, solution) {
	this.parentAras = parentAras;
	this.msgsCache = parentAras.newObject();
	var parentUrl = parentAras.getBaseURL();
	if (parentUrl.substr(parentUrl.length - 1, 1) != "/") {
		parentUrl += "/";
	}
	switch (solution) {
		case "core":
			break;
		case "plm":
			parentUrl += "Solutions/PLM/";
			break;
		case "qp":
			parentUrl += "Solutions/QP/";
			break;
		case "project":
			parentUrl += "Solutions/Project/";
			break;
		default:
			parentUrl += "Solutions/" + solution + "/";
			break;
	}
	var docUrl = parentAras.getI18NXMLResource("ui_resources.xml", parentUrl);

	var xmlhttp = parentAras.XmlHttpRequestManager.CreateRequest();
	xmlhttp.open("GET", docUrl, false);
	xmlhttp.send(null);
	this.doc = parentAras.createXMLDocument();
	this.doc.loadXML(xmlhttp.responseText);
	if (!this.doc.xml) {
		this.doc = null;
	}
}

UIResource.prototype.getResource = function UIResource_getResource(key, params) {
	key = this.parentAras.EscapeXPathStringCriteria(key);
	if (this.msgsCache[key] && (!params || params.length === 0)) {
		return this.msgsCache[key];
	}
	if (!this.doc) {
		return "Error loading ui_resources.xml file.";
	}
	var re, val;
	if (this.msgsCache[key]) {
		val = this.msgsCache[key];
	}
	else {
		var nd = this.doc.selectSingleNode("/*/resource[@key=" + key + "]");
		if (!nd) {
			return "Resource with key=\"" + key + "\" is not found.";
		}
		val = nd.getAttribute("value");
		this.msgsCache[key] = val;
	}
	for (var i = 0; i < params.length; i++) {
		eval("re = /\\{" + i + "\\}/g");
		val = val.replace(re, params[i]);
	}

	return val;
}

Aras.prototype.getFileText = function Aras_getFileText(fileUrl) {
	require(["dojo/_base/xhr"]);
	var tmp_xmlhttp = dojo.xhrGet({ url: fileUrl, sync: true });
	if (tmp_xmlhttp.ioArgs.xhr.status != 404) {
		return tmp_xmlhttp.results[0];
	}
	return;
}

Aras.prototype.getLCStateLabel = function Aras_getLCStateLabel(currentStateId, soapSendCaller, callback) {
	if (!currentStateId) {
		return "";
	}
	var key = this.MetadataCache.CreateCacheKey("getCurrentState", currentStateId);
	var state = this.MetadataCache.GetItem(key);

	if (state) {
		callback(state.Content());
		return;
	}

	var self = this,
		resultHanlder = function (result) {
			var xPath = "", state = "";

			if (result[0]) {
				result = result[0];
				xPath = "./id";
			}
			else {
				result.results.loadXML(result.getResultsBody());
				result = result.results;
				xPath = "./Item/id";
			}

			state = self.getItemProperty(result, "label");
			if (!state) {
				var idNode = result.selectSingleNode(xPath);
				state = idNode.getAttribute("keyed_name");
			}

			var item = self.IomFactory.CreateCacheableContainer(state, currentStateId);
			self.MetadataCache.SetItem(key, item);
			callback(state);
		};
	soapSendCaller = soapSendCaller || function (xmlBody, resultHanlder) {
		var result = self.soapSend("ApplyItem", xmlBody, "", false);
		resultHanlder(result);
	};

	var xmlBody = "<Item type=\"Life Cycle State\" action=\"get\" select=\"label\" id=\"" + currentStateId + "\"/>";
	soapSendCaller(xmlBody, resultHanlder);
}

Aras.prototype.arrayToMVListPropertyValue = function Aras_arrayToMVListPropertyValue(arr) {
	var tmpArr = new Array();
	for (var i = 0; i < arr.length; i++) {
		tmpArr.push(arr[i].replace(/,/g, "\\,"));
	}
	return tmpArr.join(",");
}

Aras.prototype.mvListPropertyValueToArray = function Aras_mvListPropertyValueToArray(val) {
	var Delimiter = ",";
	var EscapeString = "\\";
	var tmpDelim = "#";

	val = val.replace(/#/g, EscapeString + Delimiter);
	val = val.replace(/\\,/g, tmpDelim + tmpDelim);
	var tmpArr = val.split(Delimiter);

	var retArr = new Array();
	for (var i = 0; i < tmpArr.length; i++) {
		retArr.push(tmpArr[i].replace(/##/g, Delimiter).replace(/\\#/g, tmpDelim));
	}
	return retArr;
}

Aras.prototype.ShowContextHelp = function Aras_ShowContextHelp(itemTypeName) {
	var tophelpurl = this.getTopHelpUrl();
	if (tophelpurl) {
		if (tophelpurl.charAt(tophelpurl.length - 1) != "/") {
			tophelpurl += "/";
		}
		var currItemType = this.getItemFromServerByName("ItemType", itemTypeName, "help_item,help_url");
		var tmpurl = tophelpurl + this.getSessionContextLanguageCode() + "/index.htm";

		tophelpurl = WebFile.Exists(tmpurl) ? tmpurl : tophelpurl + "en/index.htm";
		var urlstring = tophelpurl;
		if (currItemType) {
			var thisHelpId = currItemType.getProperty("help_item");
			var thisHelpURL = currItemType.getProperty("help_url");
			var thisHelp = this.getItemById("Help", thisHelpId, 0);
			if (thisHelpURL != undefined && thisHelpURL != "") {
				urlstring += "#" + thisHelpURL;
			}
			else {
				if (thisHelpId != undefined && thisHelpId != "") {
					this.uiShowItemEx(thisHelp, undefined);
					return;
				}
				else {
					urlstring = tophelpurl;
				}
			}
		}
		window.open(urlstring);
	}
}

Aras.prototype.UpdateFeatureTreeIfNeed = function Aras_UpdateFeatureTreeIfNeed() {
	if (this.isAdminUser()) {
		if (this.getMainWindow().arasMainWindowInfo.isFeatureTreeExpiredResult === "True") {
			var license = new Licensing(this);
			license.UpdateFeatureTree(function (isSuccess) {
				if (isSuccess) {
					license.showState();
				} else {
					license._showErrorPage();
				}
			});
		}
	}
}

//This function is obsolete. Exists for compatibility only
//Use this.MetadataCache.CreateCacheKey()
Aras.prototype.CreateCacheKey = function Aras_CreateCacheKey() {
	var key = this.IomFactory.CreateArrayList();
	for (var i = 0; i < arguments.length; i++) {
		key.push(arguments[i]);
	}
	return key;
}

Aras.prototype.ValidateXml = function Aras_ValidateXml(schemas, xml) {
	var xmlBody = shapeXmlBody(schemas, xml);
	var url = this.getBaseURL() + "/HttpHandlers/XmlValidatorHandler.ashx";
	var xmlhttp = this.XmlHttpRequestManager.CreateRequest();
	xmlhttp.open("POST", url, false);
	xmlhttp.send(xmlBody);
	var resText = xmlhttp.responseText;
	var resDom = this.createXMLDocument();
	resDom.loadXML(resText);
	return resDom;

	function shapeXmlBody(schemas, targetXml) {
		var xmlBody = [];
		xmlBody.push("<data>");
		for (var i = 0; i < schemas.length; i++) {
			var schema = schemas[i];
			xmlBody.push("<schema namespace='" + schema.namespace + "' >");
			xmlBody.push("<![CDATA[");
			xmlBody.push(schema.xml);
			xmlBody.push("]]>");
			xmlBody.push("</schema>");
		}
		xmlBody.push("<targetXml>");
		xmlBody.push("<![CDATA[");
		xmlBody.push(xml);
		xmlBody.push("]]>");
		xmlBody.push("</targetXml>");
		xmlBody.push("</data>");
		return xmlBody.join("");
	}

}

Aras.prototype.getMostTopWindowWithAras = function Aras_getMostTopWindowWithAras(windowObj) {
	return TopWindowHelper.getMostTopWindowWithAras(windowObj);
}

Aras.prototype.SsrEditorWindowId = "BB91CEC07FF24BE5945F2E5412752E8B";

Aras.prototype.getCanUnlockItem = function Aras_getCanUnlockItem(itemTypeName) {	
	var item = this.getItemByName("ItemType", itemTypeName, 0);
	var canUnlockUser = new Item("z_canUnlockUser", "get");
	canUnlockUser.setAttribute("where", "z_canUnlockUser.z_item = '" + item.getAttribute("id") + "'");
	var canUnlockUserItem = canUnlockUser.apply();

	if (canUnlockUserItem.isError()) {
		return false;
	}
	
	var canUnlockUserIdentities = new Item("z_canUnlockUser_Identity", "get");
	canUnlockUserIdentities.setProperty("source_id", canUnlockUserItem.getAttribute("id"));
	canUnlockUserIdentities.setPropertyCondition("source_id", "eq");
	var Identities = canUnlockUserIdentities.apply();
	
	if (Identities.isError()) {
		return false;
	}

	var loginUserIdentities = top.aras.getIdentityList().split(',');
	var itemCount = Identities.getItemCount();
	for (var i = 0; i < loginUserIdentities.length; i++) {
		for (var j = 0; j < itemCount; j++) {
			var b = Identities.getItemByIndex(j).getProperty("related_id");
			if (loginUserIdentities[i] == Identities.getItemByIndex(j).getProperty("related_id")) {
				return true;
			}
		}
	}
	return false;
}
