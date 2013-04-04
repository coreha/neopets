//"use strict";
var Controller	= chrome.extension.getBackgroundPage();
/*
 * Show an informative message on errors.
 */
window.onerror = function (type, url, line) {
	setTimeout(
	function () {
		jQuery('<div title="Unexpected Error"><h2>An error has occured.</h2><p>Please reload the extension, or restart your browser.</p>'+
		'<pre>' + type + ' on line ' + line + '</pre></div>').appendTo('body').
		dialog({
			"modal": true,
			"width": "500px",
			"closeOnEscape": false,
			"resizable": false,
			"draggable": false,
			"open": function() { $(".ui-dialog-titlebar-close").hide(); }
		});
		$('input').blur();
	}, 0);
};
var DEBUG = Controller.DEBUG;

/**
 * Retrieves read-only copy of current settings.
 * @see settingsManager
 */
var settings = Controller.settingsManager.settings();

/**
 * @see db
 */
var db = Controller.db.getDB();
var state;

var SDB = {
	types: [],
	folders: []
};

var stateManager = (function () {
	var defaultState = {
		"search":		"",
		"regexChecked":	0,
		"folder":		"",
		"rarityType":	"=",
		"rarity":		"",
		"rarityGuide":	"",
		"sort":			"obj_info_id",
		"sortWay":		"ASC",
		"page":			0
	};
	
	if ( settings.maintainState ) {
		try {
			state = JSON.parse(localStorage["state"]);
			DEBUG && console.log("Restored state:", state);
		} catch (e) {
			DEBUG && console.warn("Couldn't restore state. Reverting to default state.");
			state = defaultState;
			localStorage["state"] = JSON.stringify(state);
		}
	} else {
		state = defaultState;
	}
	
	var listFolders = function (tx, results) {
		SDB.folders = [];
		
		for (var row = 0; row < results.rows.length; row++)
			SDB.folders.push(results.rows.item(row).folder);
		
		$('.folderGuide').find('a[data-value!=""]').remove();
		
		$.each ( SDB.folders, function ( index, folder ) {
			var li = document.createElement('li');
			$('<a>', { "data-value": folder, "text": folder }).appendTo(li);
			$('.folderGuide').append(li);
		});
		
		$(document.searchForm.folder).autocomplete({ source: SDB.folders });
		$(document.actionForm.folder).autocomplete({ source: SDB.folders, position: { "collision": "flip" } });
	};
	
	var listTypes = function (tx, results) {
		SDB.types = [];
		
		for (var row = 0; row < results.rows.length; row++)
			SDB.types.push(results.rows.item(row).type);
		
		$(document.searchForm.type).find('option[value!=""]').remove();
		
		$.each( SDB.types, function ( index, type ) {
			$(document.searchForm.type).append('<option>' + type + '</option>');
		});
		
		restoreState();
	};
	
	var restoreState = function () {
		var searchForm			= document.searchForm;
		searchForm.search.value	= state.search;
		searchForm.rarity.value	= state.rarity;
		searchForm.regex.checked= ~~state.regexChecked;
		window.rarityLastValue	= state.rarity;
		searchForm.folder.value	= state.folder;
		
		$.each([searchForm.rarityType, searchForm.sort, searchForm.sortWay, searchForm.type],
			function (index, item) {
				for ( var i = 0; i < item.options.length; i++ ) {
					if ( item.options[i].value == state[item.name] ) {
						item.options[i].selected = true;
						break;
					}
				}
			}
		);
		
		window.getResults();
	};
	
	/**
	 * Handles items with incomplete information.
	 * @param {Object} SQL Transaction
	 * @param {Object} SQL Result Set
	 */
	var handleIncomplete = function (tx, results) {
		DEBUG && console.log( "Incomplete items:", results.rows.length );
		if ( results.rows.length > 0 ) {
			/*
			 * Create a list of links to searches for the items that need information
			 * The user can then click them and the information will be automatically added.
			 */
			for ( i = 0; i < results.rows.length; i++ ) {
				$('<li><a target="_blank" href="http://www.neopets.com/safetydeposit.phtml?obj_name=' +
					encodeURIComponent(results.rows.item(i).name) + '&category=0">' +
					results.rows.item(i).name + '</a></li>').appendTo('#incompleteItems ul');
				console.log(results.rows.item(i).name);
			}
			// Show the list in an in-window popup. (See: jQuery-UI Dialog)
			$('#incompleteItems').dialog({ "width": "550px", hide: { effect: "drop" } });
		}
	};
		
	return {
		/**
		 * Saves the state of the search form.
		 * @return {Boolean} State saved
		 */
		save: function () {
			if ( !settings.maintainState ) {
				return false;
			}
			var searchForm		= document.searchForm;
			state.search		= searchForm.search.value;
			state.regexChecked	= ~~searchForm.regex.checked;
			state.rarity		= searchForm.rarity.value;
			state.type			= document.searchForm.type.value;
			state.folder		= searchForm.folder.value;
			
			$.each([searchForm.folder, searchForm.rarityType, searchForm.sort, searchForm.sortWay],
				function (index, item) {
					state[item.name] = item.value;
				}
			);
			
			if ( JSON.stringify(state) == localStorage["state"] ) {
				return false;
			}
			
			DEBUG && console.log("Saving state: ", state);
			localStorage["state"] = JSON.stringify(state, Object.keys(defaultState));
			return true;
		},
		
		/**
		 * Restores essential elements for window state, then calls getResults()
		 */
		restore: function () {
			this.checkSettings();
			this.updateFolders();
			this.updateTypes();
			// restoreState will be called by listTypes(), which will then call getResults()
			
			this.checkIncomplete();
		},
		
		/**
		 * Checks settings, performs any actions that are required.
		 */
		checkSettings: function () {
			if ( settings.regexSearch ) {
				$('.regexSearch').removeClass('hidden');
				$('#search').css({"width": "572px"});
			}
			
			if ( settings.lookupRarities ) {
				Controller.lookupManager.run();
				// Could check the return value and display a message.
			}
		},
		
		/**
		 * Updates SDB.folders, the list of folders used for selection and autocomplete.
		 */
		updateFolders: function () {
			db.executeQuery('SELECT DISTINCT folder FROM items', [], listFolders, handleError);
		},
		
		/**
		 * Updates SDB.types, used for the selection on the search form.
		 */
		updateTypes: function () {
			db.executeQuery('SELECT DISTINCT type FROM items', [], listTypes, handleError);
		},
		
		/**
		 * Checks if the DB needs information for any items.
		 */
		checkIncomplete: function () {
			db.executeQuery('DELETE FROM incompleteItems WHERE name IN (SELECT name FROM items)', [],
				function () {
					db.transaction( function (tx) {
						tx.executeSql('SELECT * FROM incompleteItems', [], handleIncomplete, handleError);
					});
				}
			);
		}
	}
})();

/**
 * Sets initial view of search results.
 * No longer in use.
 * @deprecated
 */
function setInitialView () {
	db.transaction( function (tx) {
		tx.executeSql('SELECT * FROM items ORDER BY obj_info_id ASC LIMIT ?', [settings.itemsPerPage], updateView, handleError);
	});
}

/**
 * Sets up event listeners.
 */
function bindLinks() {
	$('a.popoutLink').bind("click",
		function () {
			window.open( chrome.extension.getURL('/viewsdb.html') );
		}
	);
	
	$('a.settingsLink').bind("click",
		function () {
			window.open( chrome.extension.getURL('/settings.html') );
		}
	);
	
	$('a.pageLink.next').bind("click",
		function () {
			window.scrollBy( 0, -window.scrollY );
			state.page++;
			getResults();
		}
	);
	
	$('a.pageLink.previous').bind("click",
		function () {
			window.scrollBy( 0, -window.scrollY );
			state.page--;
			getResults();
		}
	);
	
	$('.selectLinks a').bind("click", function () {
		var action	= $(this).data('action');
		var items	= $('.items input[type=number]');
		
		if ( action == "all" ) {
			items.each( function (index, item) {
				item.value = $(item).closest('tr').data('qty');
			});
		} else if ( action == "one" ) {
			items.each( function (index, item) {
				item.value = 1;
			});
		} else if ( action == "leaveOne" ) {
			items.each( function (index, item) {
				item.value = $(item).closest('tr').data('qty') - 1;
			});
		} else {
			items.each( function (index, item) {
				item.value = 0;
			});
		}
	});
	
	/*
	 * Handles the rarity dropdown selection
	 */
	$('.rarityGuide a').bind("click", function () {
		document.searchForm.rarity.value = $(this).data('value');
		$(document.searchForm.rarity).change();
	});
	
	/*
	 * Dismiss messages when clicked.
	 */
	$('.error, .msg').bind("click", function () { $(this).addClass('hidden'); } );
	
	/*
	 * Shows the folder selection box when 'folder' is selected
	 * in the 'Move To' selection.
	 */
	$('div.action select[name=action]').bind('change blur', function () {
		if ( this.value == 'Folder' ) {
			$('div.action #folder').fadeIn('slow');
		} else {
			$('div.action #folder').fadeOut('slow');
		}
	});
	
	/*
	 * Uses 'delegate' rather than 'bind' because the folders list is dynamically updated.
	 */
	$('.folderGuide').delegate('a', "click", function () {
		document.searchForm.folder.value = $(this).data('value');
		$(document.searchForm.folder).change();
	});
}

$(document).ready( function () {
	bindLinks();
	stateManager.restore();
	// setInitialView();

	/* Searching */
	$('div.search input, div.search select').bind("keyup change click", delayedResults);
	
	
	/* Handle Chrome/Webkit Bug - https://code.google.com/p/chromium/issues/detail?id=128957 */
	$(document).scroll( function () {
		$('tr.item td input[type=number]').css({ "visibility": "visible" });
	
		$('tr.item').each(function () {
			// row position
			var sum = $(this).position().top;
			// Input boxes are vertically centered
			sum += $(this).height() / 2;
			// subtract the scroll position
			sum -= window.scrollY;
			
			// less than 0 = off screen, skip
			// less than 85 = underneath search box (search box height is 85px)
			if ( sum > 0 && sum < 85) {
				$(this).find('input[type=number]').css({
					"visibility": "hidden"
				});
				// After hiding the visible element, break from the $.each loop
				return false;
			}
		});
	});
	
	/*
	 * Only allow valid numbers in the remove field.
	 * If the number attempted to remove is higher than the number available,
	 * Neopets will disregard the request.
	 */
	$('table.items').delegate('input.removeQty', 'change keyup blur', function () {
		var parentQty = $(this).closest('tr').data('qty')
		if ( this.value > parentQty ) {
			this.value = parentQty;
		} else if ( this.value < 0 ) {
			this.value = 0;
		}
	});
	
	$('div.action #action-button').bind('click', function (e) {
		e.preventDefault();
		
		$('#action-button').attr('disabled', 'disabled');
		$('#action-button').text('Loading...');
		
		var itemArray = $(document.itemForm).serializeArray();
			itemArray = $.grep(itemArray, function ( obj, index ) {
				return ( obj.value !== "0" );
			});

		switch ( $('div.action select[name=action]').val() ) {
		case 'Inventory':

			$.post("http://www.neopets.com/process_safetydeposit.phtml?checksub=scan", $(document.itemForm).serialize()).done(
				function (data) {
					if ( data.match(/welcomeLogin/) ) {
						handleError(null, {"message": "You are not logged in."});
					} else if ( data.match(/Your Safety Deposit Box/) ) {
						handleMsg(null, {"message": "Item(s) have been moved."});
						$.each(itemArray, function ( index, item ) {
							var parent = $('input[name="' + item.name + '"]').closest('tr');
							if ( item.value >= parent.data('qty') ) {
								doRemove( parent.data('id') );
							} else {
								doReduce( parent.data('id'), parent.data('qty') - item.value );
							}
						});
					} else {
						handleError(null, {"message": "An Unexpected Error has occured."});
					}
					
					$('#action-button').removeAttr('disabled');
					$('#action-button').text('Go');
				});
		break;
		
		case 'Folder':
		
			var folder = document.actionForm.folder.value;
			
			if ( folder == "" ) {
				folder = "None";
			}
			
			if ( ! folder.match(/[ .A-Za-z0-9]+/) ) {
				this.removeAttribute('disabled');
				return;
			}
		
			itemArray = $.map( itemArray, function ( item, index ) {
				return parseInt(item.name.match(/\[(\d+)\]/)[1], 10);
			});
			
			db.transaction( function (tx) {
				tx.executeSql('UPDATE items SET folder = ? WHERE obj_info_id IN (' + itemArray.join(',') + ')', [folder], moveCompleted, handleError);
			});
			db.updateFolderMap();
			
			console.log(itemArray);
			getResults(true);
			$('#action-button').removeAttr('disabled');
			$('#action-button').text('Go');
		break;
		}
	});

});

function doRemove ( obj_info_id ) {
	db.transaction( function (tx) {
		tx.executeSql('DELETE FROM items WHERE obj_info_id = ?', [obj_info_id], handleReduced, handleError);
	});
}

function doReduce ( obj_info_id, newAmount ) {
	DEBUG && console.log( "Removing items:", obj_info_id, "New Amount:", newAmount );
	db.transaction( function (tx) {
		tx.executeSql('UPDATE items SET qty = ? WHERE obj_info_id = ?', [newAmount, obj_info_id], handleReduced, handleError);
	});
}

function handleReduced (tx, results) {
	DEBUG && console.log(results);
	getResults(true);
}

function moveCompleted (tx, results) {
	// Check affected rows...
	
	stateManager.updateFolders();
	getResults(true);
}

function updateView (tx, results) {

	$('tr[data-name]').remove();

	if ( results.rows.length == 0 ) {
		$('div.noresults').removeClass('hidden');
	} else {
		$('div.noresults').addClass('hidden');
	}

	DEBUG && console.log("Results:", results.rows.length, "Per Page:", settings.itemsPerPage);

	state.page = ( results.rows.length > settings.itemsPerPage ) ? ~~state.page : 0;
	
	if ( results.rows.length > (settings.itemsPerPage * (state.page+1)) ) {
		$('a.pageLink.next').removeClass('hidden');
	} else {
		$('a.pageLink.next').addClass('hidden');
	}
	
	state.page = ~~state.page;
	
	if ( state.page > 0 ) {
		$('a.pageLink.previous').removeClass('hidden');
	} else {
		$('a.pageLink.previous').addClass('hidden');
	}
	
	var startNum = state.page * settings.itemsPerPage;
	var endNum = startNum + settings.itemsPerPage;

	if ( endNum > results.rows.length ) {
		endNum = results.rows.length;
	}
	
	var numPages = Math.floor( ( results.rows.length + settings.itemsPerPage - 1 ) / settings.itemsPerPage );
	
	$('b.pageNumbers').text( (state.page+1) + ' / ' + numPages );

	DEBUG && console.log("Start:", startNum, "End:", endNum);

	for (var row = startNum; row < endNum; row++) {
		updateView.addRow( results.rows.item(row) );
	}
	
	if ( settings.showDescriptions ) {
		$.ui.tooltip({track: true}, $('.items'));
	}
}

updateView.addRow = function (item) {
	var COLUMNS = 6;
	var rowContainer = document.createDocumentFragment();

	var tr = document.createElement('tr')
	tr.setAttribute('class', 'item');
	tr.setAttribute('title', item.desc);
	tr.setAttribute('data-name', item.name);
	tr.setAttribute('data-qty', item.qty);
	tr.setAttribute('data-id', item.obj_info_id);
	
	rowContainer.appendChild(tr);
	
	var td = [];
	for ( var i = 0; i < COLUMNS; i++ ) {
		td.push ( document.createElement('td') );
		tr.appendChild(td[i]);
	}

	td[0].appendChild( document.createElement('img') );
	td[0].childNodes[0].setAttribute('src', item.img);
	
	[item.name, item.type, item.folder, item.qty].forEach(
		function ( data, index ) {
			index++;
			td[index].appendChild( document.createElement('b') );
			td[index].childNodes[0].innerText = data;
		});

	if ( settings.showRarity ) {
		td[1].appendChild( document.createElement('span') );
		td[1].childNodes[1].setAttribute('class', 'pull-right r' + updateView.normaliseRarity(item.rarity) );
		td[1].childNodes[1].innerText = "r" + item.rarity;
	}
	
	td[5].appendChild( document.createElement('input') );
	jQuery(td[5].childNodes[0]).attr({
		"type": "number",
		"name": "back_to_inv[" + item.obj_info_id + "]",
		"size": 3,
		"min": 0,
		"max": item.qty,
		"value": 0,
		"patern": "\\\d+",
		"class": "input-tiny removeQty"});
	
	document.querySelector('table.items tbody').appendChild( rowContainer );
}

updateView.normaliseRarity = function ( rarity ) {
	if ( rarity == 0 ) {
		// Unknown rarity
		return 0;
	} else if ( rarity < 75 ) {
		// No special colour
		return 50;
	} else if ( rarity <= 84 ) {
		// Uncommon - 75-84
		return 75;
	} else if ( rarity <= 89 ) {
		// Rare - 85-89
		return 85;
	} else if ( rarity <= 94 ) {
		// Very Rare - 90-94
		return 90;
	} else if ( rarity <= 98 ) {
		// Ultra Rare - 95-98
		return 95;
	} else if ( rarity == 99 ) {
		// Super Rare - 99
		return 99;
	} else if ( rarity == 101 ) {
		// Special - 101
		return 101;
	} else if ( rarity <= 110 ) {
		// Mega Rare - 107-110
		return 107;
	} else if ( rarity < 180 ) {
		// Rarity ###
		return 115;
	} else if ( rarity == 180 ) {
		// Retired
		return 180;
	} else if ( rarity < 250 ) {
		// Artifact
		return 200;
	} else if ( rarity == 500 ) {
		// NC Mall
		return 500;
	} else {
		// Unknown
		return 999;
	}
}

function handleError (tx, error) {
	$('.error').text(error.message).removeClass('hidden').fadeIn(750).fadeOut(15000);
	console.log(error);
}
function handleMsg (tx, data) {
	$('.msg').text(data.message).removeClass('hidden').fadeIn(750).fadeOut(15000);
	console.log(data);
}

/**
 * Delays running new search, to be more responsive in case the user is typing.
 */
function delayedResults () {
	// Here, using 'this' defaults to the window object.
	if ( typeof this.timeoutID == "number" ) {
		window.clearTimeout(this.timeoutID);
	}
	this.timeoutID = setTimeout( function () { getResults(); }, 300 );
}

/**
 * Builds Query and gets new results.
 * @param {Boolean} force
 */
function getResults (force) {
	var searchData = $(document.searchForm).serialize();

	if ( !force && getResults.lastSearch ) {
		if ( searchData === getResults.lastSearch ) {
			if ( state.page === getResults.lastPage ) {
				return;
			}
		} else {
			console.log("Last Search:", getResults.lastSearch);
			// Reset to page 0 when changing search options
			state.page = 0;
		}
	} 
	
	console.log('Searching...', searchData);
	
	// There should be a better way to do this.
	var baseQuery = 'SELECT * FROM items';
	var queryFields = [];
	var queryParams = [];
	
	var searchText = $(document.searchForm.search).val();
	var searchHow, searchRarityType, searchRarity;
	
	if ( searchText != "" ) {
		if ( $('input#regex:checked').length ) {
			searchHow = 'REGEXP';
		} else {
			searchHow = 'LIKE'
			searchText = '%'+searchText+'%';
			searchText = searchText.replace('*', '%');
		}
		
		queryFields.push('name ' + searchHow + ' ?');
		queryParams.push(searchText);
	}
	
	if ( document.searchForm.rarity.value.length > 0 ){
		var rarity;
		
		console.log( document.searchForm.rarity.value.match(/(\d{1,3})-(\d{1,3})/) );
		
		if ( rarity = document.searchForm.rarity.value.match(/(\d{1,3})-(\d{1,3})/) ) {
			queryFields.push('rarity BETWEEN ? AND ?');
			queryParams.push(rarity[1]);
			queryParams.push(rarity[2]);
		} else if ( ~~document.searchForm.rarity.value > 0 ) {
			queryFields.push('rarity ' + document.searchForm.rarityType.value + ' ?');
			queryParams.push( parseInt(document.searchForm.rarity.value, 10) );
		}
	}
	
	if ( document.searchForm.folder.value != "" ) {
		// Allow "!folder" to show all folders except one
		if ( document.searchForm.folder.value.indexOf("!") === 0 ) {
			queryFields.push('folder != ?');
			queryParams.push( document.searchForm.folder.value.substr(1) );
		} else {
			queryFields.push('folder = ?');
			queryParams.push( document.searchForm.folder.value );
		}
	}
	
	if ( document.searchForm.type.value != "" ) {
		queryFields.push('type = ?');
		queryParams.push( document.searchForm.type.value );
	}
	
	if ( queryFields.length > 0 ) {
		baseQuery += ' WHERE ' + queryFields.join(' AND ');
	}
	
	baseQuery += ' ORDER BY ' + document.searchForm.sort.value + ' ' + document.searchForm.sortWay.value;
	
	// SQLite is not MySQL, there is no reason to use LIMIT.
	// baseQuery += ' LIMIT ?';
	// queryParams.push( parseInt( settings.itemsPerPage, 10 ) );
	
	DEBUG && console.log( baseQuery, queryParams );
	
	db.transaction( function (tx) {
		tx.executeSql(baseQuery, queryParams, updateView, handleError);
	});
	
	/* For testing
	$('tr[data-name]').each( function(i,e) {
		if( ! e.getAttribute('data-name').match(new RegExp(search, "i")) ) {
			$(this).addClass('hidden');
		} else {
			$(this).removeClass('hidden');
		}
	}); */
	
	getResults.lastSearch	= searchData;
	getResults.lastPage	= state.page;
	if ( settings.maintainState ) {
		stateManager.save();
	}
}
