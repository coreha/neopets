//"use strict";
var VERSION	= chrome.app.getDetails().version;
var DEBUG	= true;

/**
 * Checks if the extension has been newly installed or updated.
 * @param {String} url
 */
function checkInstalled ( url ) {
	if ( typeof localStorage['version'] == "undefined" ) {
		// New Install, show help page.
		window.open( url );
		localStorage['version'] = VERSION;
	} else if ( localStorage['version'] != VERSION ) {
		// Updated
		window.open( url );
		localStorage['version'] = VERSION;
	}
}
checkInstalled( chrome.extension.getURL('/help/help.html') );

/**
 * WebSQL DB object
 * @id db
 */
var db;
try {
	db = openDatabase('sdb', '1.0', 'sdb items', 100 * 1024 * 1024);
} catch (e) {
	handleError (null, {"code": e.name, "message": e.message});
}

/**
 * Creates tables if necessary.
 */
db.init = function () {
	db.transaction(function (tx) {
		// tx.executeSql('DROP TABLE IF EXISTS items');
		tx.executeSql('CREATE TABLE IF NOT EXISTS items (obj_info_id INTEGER UNIQUE, name TEXT, desc TEXT, img TEXT, type TEXT, folder TEXT default "None", qty INTEGER, rarity INTEGER, wearable INTEGER, raritySet INTEGER)');
		// raritySet = 0 - Rarity has been set from SDB only. (Estimate)
		// raritySet = 1 - Rarity has been lookup up with Neopets search.
		// raritySet = 2 - Attempted lookup, but got no results.
		tx.executeSql('CREATE TABLE IF NOT EXISTS itemFolders ( obj_info_id INTEGER UNIQUE, folderName TEXT )');
		tx.executeSql('CREATE TABLE IF NOT EXISTS incompleteItems ( name TEXT UNIQUE, qty INTEGER )');
	});
};
db.init();

/**
 * Asynchronously calls function to create tables, returns db object.
 * @return db
 */
db.getDB = function () {
	db.init();
	return db;
};

/**
 * Updates the table for storing item folders.
 */
db.updateFolderMap = function () {
	db.executeQuery('INSERT OR REPLACE INTO itemFolders ( obj_info_id, folderName ) SELECT obj_info_id, folder FROM items WHERE folder != "None"');
};

/**
 * Removes an item from the DB.
 */
db.removeItem = function (obj_info_id, removeQty) {
	db.executeQuery('SELECT qty FROM items WHERE obj_info_id = ?', [obj_info_id], function (tx, results) {
		if ( results.rows.length > 0 ) {
			var qty = results.rows.item(0).qty;
			if ( qty >= removeQty ) {
				db.executeQuery('DELETE FROM items WHERE obj_info_id = ?', [obj_info_id]);
			} else if ( qty > 0 ) {
				db.executeQuery('UPDATE items SET qty = qty - ? WHERE obj_info_id = ?', [removeQty, obj_info_id]);
			}
		}
	})
};

/**
 * Empty the items table, and re-create it.
 */
db.emptyDatabase = function () {
	db.executeQuery('DROP TABLE items', [], db.init, handleError);
};

/**
 * Wrapper to executeSql
 * @param {String} Query
 * @param {Array} data
 * @param {Function} success
 * @param {Function} error
 */
db.executeQuery = function ( Query, data, success, error) {
	db.transaction( function (tx) {
		tx.executeSql( Query, data, success, error );
	});
};

/**
 * For debug, print all queries to the console.
 */
/*
if ( DEBUG ) {
	db._transaction = db.transaction;
	db.transaction = function ( tx ) {
		console.debug(tx);
		db._transaction(tx);
	}
}
*/

/**
 * Settings Manager
 * @return Settings Manager instance
 * @id settingsManager
 * 
*/
var settingsManager = (function () {
	var defaultSettings = {
		"showRarity":		1,
		"showDescriptions":	1,
		"maintainState":	1,
		"regexSearch":		0,
		"lookupRarities":	0,
		"notifications":	2,
		"itemsPerPage":		10
	};
	
	var settings;
	
	var validateSettings = function ( checkSettings ) {
		Object.keys(defaultSettings).forEach(
			function (name) {
				DEBUG && console.log(name, typeof checkSettings[name]);
				/*
				 * If the new settings do not contain a value that the default settings do,
				 * then they are invalid and cannot be used. Default will be applied instead.
				 */
				if ( typeof checkSettings[name] == "undefined" ) {
					throw new TypeError( 'Missing setting: ' + name + ' (' + typeof defaultSettings[name] + ')' );
				} else if ( typeof checkSettings[name] != typeof defaultSettings[name] ) {
					throw new TypeError('Invalid Type for setting: ' + name +
										'. got: ' + typeof checkSettings[name] +
										', expected: ' + typeof defaultSettings[name]
					);
				}
			});
	};
	
	try {
		settings = JSON.parse(localStorage["settings"]);
		validateSettings( settings );
	} catch (e) {
		DEBUG && console.warn(e.name, e.message);
		settings = defaultSettings;
	}
	
	return {
		/**
		 * Get a setting by name.
		 * @param {String} name
		 * @return {Setting, Undefined}
		 */
		get: function ( name ) {
			return settings[name];
		},
		
		/**
		 * Set a setting by name.
		 * @param {String} name
		 * @param {Object} value
		 * @return {Bool} Success
		 */
		set: function ( name, value ) {
			settings[name] = value;
			// True: success; false: fail
			return this.save(settings);
		},
		
		/**
		 * Save settings
		 * @param {Object} newSettings
		 * @return {Bool} Success
		 */
		save: function ( newSettings ) {
			try {
				validateSettings ( newSettings );
				settings = newSettings;
				// Only store settings that are defined in the defaults.
				localStorage["settings"] = JSON.stringify(settings, Object.keys(defaultSettings));
				return true;
			} catch (e) {
				console.warn(e.name, e.message);
				return false;
			}
		},
		
		/**
		 * Returns current settings object (all settings).
		 * @return {Object} Settings
		 */
		settings: function () {
			return settings;
		}
	};
	
})();

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		DEBUG && console.log(sender.tab ?
		            "from a content script:" + sender.tab.url :
		            "from the extension");
		DEBUG && console.log( request );
		
		switch ( request.action ) {
			case 'add':
				actions.add( request.items );
			break;
			
			case 'addIncomplete':
				actions.addIncomplete( request.items );
			break;
			
			case 'addRarity':
				actions.addRarity( request.item );
				break;
			break;
			
			case 'rarityNotFound':
				actions.rarityNotFound( request.item );
			break;
			
			default:
				console.warn("Unexpected request:", request.action);
			break;
		}
	}
);

var actions = {
	/**
	 * Adds items from the SDB
	 * @param {Object} items
	 */
	add: function ( items ) {
		$.each( items, function ( index, item ) {
			(function (item) {
				db.transaction(function (tx) {
					tx.executeSql('INSERT OR REPLACE INTO items VALUES' +
					'(?, ?, ?, ?, ?, coalesce((SELECT folderName FROM itemFolders WHERE obj_info_id = ?), "None")'+
					', ?, coalesce((SELECT rarity FROM items WHERE obj_info_id = ?), ?), ?, '+
					'coalesce((SELECT raritySet FROM items WHERE obj_info_id = ?), 0))',

					[item.obj_info_id, item.name, item.desc, item.img, item.type, item.obj_info_id,
					item.qty, item.obj_info_id, item.rarity, item.wearable,
					item.obj_info_id]
						//,function (tx, results) { console.log(results); },
						//function (tx, results) { console.log(results); }
					);
				});
			})(item);
		});
		
		/*
		 Queue a lookup. Could add code to make sure there is only one timeout, but it is not an expensive operation.
		*/
		if ( settingsManager.get('lookupRarities') ) {
			setTimeout( lookupRarities, 30000 );
		}
	},
	
	/**
	 * Adds incomplete items to waiting list, or updates Qty if information is already present.
	 * @param {Object} items
	 */
	addIncomplete: function ( items ) {
		var itemNames = [];
		var seen = 0, total = Object.keys(items).length;
		
		$.each( items, function ( name, qty, items ) {
			db.transaction(function (tx) {
				tx.executeSql('SELECT obj_info_id FROM items WHERE name = ?', [name],
					function ( tx, result ) {
						
						if ( result.rows.length > 0 ) {
							// Add to main items
							tx.executeSql('UPDATE items SET qty = qty + ? WHERE name = ?', [qty, name],
								function (tx, results) { DEBUG && console.log(results); },
								function (tx, results) { DEBUG && console.log(results); });
						} else {
							// Add to Incomplete
							tx.executeSql('INSERT INTO incompleteItems ( name, qty ) VALUES ( ?, ? )', [name, qty],
								function (tx, results) { DEBUG && console.log(results); },
								function (tx, results) { DEBUG &&console.log(results); });
							
							itemNames.push( name );
							DEBUG && console.log(itemNames);
						}
						
						if ( ++seen === total ) {
							// Looped over all items
							DEBUG && console.log(itemNames.length, itemNames);
							if ( itemNames.length > 0 ) {
								 // createHTMLNotification is set to be removed in Chrome 28+.
								 // https://code.google.com/p/chromium/issues/detail?id=137297
								var notification = webkitNotifications.createHTMLNotification(
									'/notifications/notification.html#' + encodeURIComponent(JSON.stringify(itemNames))
								);
								notification.show();
							}
						}
					}
				);
			});
		});
	},
	
	/**
	 * Adds Rarity information to an item.
	 * @param {Object} item
	 */
	addRarity: function (item) {
		db.executeQuery('UPDATE items SET raritySet = 1, rarity = ?, desc = ?, img = ? WHERE name = ?', [item.rarity, item.desc, item.image, item.name], function () {}, handleError);
	},
	
	/**
	 * Record when an item failed to show up in search, so that we know not to search for it again.
	 * @param {String} item
	 */
	rarityNotFound: function (item) {
		db.executeQuery('UPDATE items SET raritySet = 2 WHERE name = ?', [item], function () {}, handleError);
	}
}

/*
 * Record when items are removed from the SDB.
 */
chrome.webRequest.onBeforeRequest.addListener(
	function (details) {
		var data;
		
		if ( details.url.indexOf('ref=SDB-Enhanced') > -1 ) {
			// The extension page can more accurately handle removing items.
			DEBUG && console.log("Ignored SDB Removal because request was made from within extension.");
			return;
		} else if ( data = details.url.match(/remove_one_object=(\d+)/) ) {
			DEBUG && console.log("Removing one of:", data[1])
			db.removeItem(data[1], 1);
		} else {
			try {
				data = details.requestBody.formData;
				$.each(data, function (elementName, elementValue) {
					
					// If the input name starts with back_to_inv, it is something being removed
					// And if more than 0 are being removed, we need to remove them from our local DB too.
					if ( elementName.indexOf('back_to_inv') === 0 && elementValue[0] > 0 ) {
						
						// Extract the item ID
						var obj_info_id = elementName.match(/^back_to_inv\[(\d+)\]/);
						
						// And remove the item if successful.
						if ( typeof obj_info_id[1] != "undefined" ) {
							DEBUG && console.log("Removing", elementValue[0], "of item:", obj_info_id[1]);
							db.removeItem(obj_info_id[1], elementValue[0]);
						}
					}
				});
			} catch (e) {
				// No form data available.
				return;
			}
		}
	},
	{urls: ["http://www.neopets.com/process_safetydeposit.phtml*"]},
	["requestBody"]
)

/*
 * Referer must be set correctly when removing items from the SDB for it to be accepted.
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
	function (details) {
		console.log(details.requestHeaders);
		details.requestHeaders.push({"name":"Referer", "value":"http://www.neopets.com/safetydeposit.phtml"});
		for (var i = 0; i < details.requestHeaders.length; ++i) {
			if (details.requestHeaders[i].name == 'Origin') {
				details.requestHeaders.splice(i, 1);
				break;
			}
		}
		return {requestHeaders: details.requestHeaders};
	},
	{urls: ["http://www.neopets.com/process_safetydeposit.phtml?checksub=scan"]},
	["blocking", "requestHeaders"]
);

/*
 * Logout when looking up item info, to make sure that the extension is not
 * performing actions on behalf of the user (i.e. triggering REs)
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
	function (details) {
		console.log(details.requestHeaders);
		for (var i = 0; i < details.requestHeaders.length; ++i) {
			if (details.requestHeaders[i].name == 'Origin' || details.requestHeaders[i].name == 'Cookie') {
				details.requestHeaders.splice(i, 1);
				break;
			}
		}
		return {requestHeaders: details.requestHeaders};
	},
	{urls: ["http://www.neopets.com/search.phtml?selected_type=object&SDB&string=*"]},
	["blocking", "requestHeaders"]
);

/*
 * Make sure any cookies sent when looking up item info
 * as a logged out user do not replace existing cookies. 
 */
chrome.webRequest.onHeadersReceived.addListener(
	function (details) {
		console.log(details.url);
		for (var i = 0; i < details.responseHeaders.length; ++i) {
			if (details.responseHeaders[i].name == 'Set-Cookie' || details.responseHeaders[i].name == 'Set-Cookie3') {
				details.responseHeaders.splice(i, 1);
			}
		}
		
		return {responseHeaders: details.responseHeaders};
	},
	{urls: ["http://www.neopets.com/search.phtml?selected_type=object&SDB&string=*"]},
	["blocking", "responseHeaders"]
);

/*
 * When looking up item info, prevent the page from loading any external resources.
 * This saves a large amount of requests and bandwidth. 
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
	function (details) {
		for (var i = 0; i < details.requestHeaders.length; ++i) {
			if (details.requestHeaders[i].name == 'Referer') {
				if (details.requestHeaders[i].value.indexOf('http://www.neopets.com/search.phtml?selected_type=object&SDB&string=') === 0 ) {
					return {cancel: true}
				}
				break;
			}
		}
	},
	{urls: ["<all_urls>"]},
	["blocking", "requestHeaders"]
);

var lookupManager = (function () {
	var lookupInProgress	= false;
	var lookupQueue			= [];
	
	var frame				= document.createElement('iframe');
	
	// Sandbox prevents scripts from being requested, which helps reduce resource use.
	frame.setAttribute('sandbox', '');
	
	/**
	 * Starts loading information for the next item in the Queue.
	 */
	var getNext = function () {
		if ( lookupQueue.length === 0 ) {
			frame.removeAttribute('src');
			lookupInProgress = false;
			return false;
		}
		
		DEBUG && console.log("Looking up:", lookupQueue[0], "Remaining:", lookupQueue.length);
		
		/*
		 * Add a delay between requests to be polite; we don't want to hammer the server.
		 * If the browser is closed before lookups complete, they will resume where they left off. 
		 */
		setTimeout(function () {
				frame.src = 'http://www.neopets.com/search.phtml?selected_type=object&SDB&string=' + encodeURIComponent( lookupQueue.shift() );
			},
			Math.random() * 10000
		);
		
		// console.log('http://www.neopets.com/search.phtml?selected_type=object&SDB&string=' + encodeURIComponent( lookupQueue.shift() ));
		// return getNext();
	};
	
	/**
	 * Called when the SQL transaction to retrieve items needing information has completed.
	 * @param {Object} tx
	 * @param {Object} results
	 */
	var doLookupRarities = function (tx, results) {
		DEBUG && console.warn("doLookupRarities started");
		
		frame.onload = getNext;
		document.body.appendChild(frame);
		
		for ( var row = 0; row < results.rows.length; row++ )
			lookupQueue.push(results.rows.item(row).name);
		
		DEBUG && console.log(lookupQueue);
		getNext();
	}
	
	return {
		/**
		 * Begins looking up item information.
		 * @return {Bool} Lookup Running
		 */
		run: function () {
			DEBUG && console.warn("lookupRarities called, lookupInProgress = ", lookupInProgress);
			if ( !lookupInProgress ) {
				lookupInProgress = true;
				
				db.transaction(function (tx) {
					/*
					 * Items of rarity 99 and higher do not show up in search.
					 * However, we are generally able to obtain much better estimates
					 * for them from the SDB than for lower-rarity items.
					 */
					tx.executeSql('SELECT name FROM items WHERE rarity < 99 AND raritySet = 0 AND type != "Neocash"', [], doLookupRarities, handleError);
				});
				
				return true;
			}
			
			return false;
		}
	}
})();

function handleError (tx, error) {
	var notification = webkitNotifications.createNotification(
		'/images/icon-128.png',
		'An Unexpected error has occured',
		'Code: ' + error.code + ', Message: ' + error.message +
		'\n\nPlease report this.'
	);
	notification.show();
	if ( !db ) {
		// The DB is not accessible
		window.close();
	}
	console.warn(error);
}

if ( settingsManager.get('lookupRarities') ) {
	lookupManager.run();
}