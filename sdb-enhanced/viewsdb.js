/*
var items = JSON.parse(localStorage["items"]);

[
	{	"desc": "Baaaaaa - ZAP!  Hee hee!",
		"img": "http://images.neopets.com/items/lightninggun.gif",
		"name": "Lightning Gun",
		"obj_info_id": "568",
		"qty": "1",
		"rarity": 0,
		"type": "Battle Magic" },
	{	"desc": "A Negg is a Neopian delicacy.  *** WORTH 1 NEGG POINT AT THE NEGGERY ***",
		"img": "http://images.neopets.com/items/negg.gif",
		"name": "Negg",
		"obj_info_id": "8",
		"qty": "1",
		"rarity": 0,
		"type": "Food" }
];

console.log(localStorage["items"]);
*/

//var db = chrome.extension.getBackgroundPage().db;

var defaultSettings = {
	"showRarity":	1,
	"showSort":		1,
	"showFolder":	1,
	"regexSearch":	1,
	"itemsPerPage":	10
};

var settings;

try {
	settings = JSON.parse(localStorage["settings"]);
} catch (e) {
	settings = defaultSettings;
	localStorage["settings"] = JSON.stringify(settings);
}

var db;
db = openDatabase('sdb', '1.0', 'sdb items', 200 * 1024 * 1024);
db.transaction(function (tx) {
	tx.executeSql('CREATE TABLE IF NOT EXISTS items (obj_info_id INTEGER UNIQUE, name TEXT, desc TEXT, img TEXT, type TEXT, folder TEXT, qty INTEGER, rarity INTEGER)');
});

function updateFolders () {
	db.transaction( function (tx) {
		tx.executeSql('SELECT DISTINCT folder FROM items', [], listFolders, handleError);
	});
}

function updateTypes () {
	db.transaction( function (tx) {
		tx.executeSql('SELECT DISTINCT type FROM items', [], listTypes, handleError);
	});
}

function updateRarities () {
	db.transaction( function (tx) {
		tx.executeSql('SELECT DISTINCT rarity FROM items', [], listRarity, handleError);
	});
}

function checkSettings () {
	if ( !settings.showSort )
		$('label[for=sort]').addClass('hidden');
	if ( !settings.showRarity )
		$('label[for=rarity]').addClass('hidden');
	if ( !settings.showFolder )
		$('label[for=folder]').addClass('hidden');
	if ( !settings.regexSearch )
		$('.regexSearch').addClass('hidden');
}

function restoreState () {
	var defaultState = {
		"search":		"",
		"regexChecked":	0,
		"folder":		"(Any Folder)",
		"rarityType":	"=",
		"rarity":		"",
		"rarityGuide":	"",
		"sort":			"obj_info_id",
		"sortWay":		"ASC",
		"page":			0
	};
	
	try {
		state = JSON.parse(localStorage["state"]);
	} catch (e) {
		state = defaultState;
		localStorage["state"] = JSON.stringify(state);
	}
	
	console.log("Restoring state:", state);
	
	var searchForm			= document.searchForm;
	searchForm.search.value	= state.search;
	searchForm.rarity.value	= state.rarity;
	searchForm.regex.checked= ~~state.regexChecked;
	window.rarityLastValue	= state.rarity;
	
	$.each([searchForm.folder, searchForm.rarityType, searchForm.rarityGuide, searchForm.sort, searchForm.sortWay],
		function (index, item) {
			for ( var i = 0; i < item.options.length; i++ ) {
				if ( item.options[i].value == state[item.name] ) {
					item.options[i].selected = true;
					break;
				}
			}
		}
	);
	
	// Autocomplete doesn't fire a change event until after blur
	// This really shouldn't be necessary, but it is.
	setInterval( function () {
		if ( document.searchForm.rarity.value != window.rarityLastValue ) {
			$(document.searchForm.rarity).change();
			window.rarityLastValue = document.searchForm.rarity.value;
		} }, 1000
	);
	
	getResults();
}

// No longer in use.
function setInitialView () {
	db.transaction( function (tx) {
		tx.executeSql('SELECT * FROM items ORDER BY obj_info_id ASC LIMIT ?', [settings.itemsPerPage], updateView, handleError);
	});
}

function saveState () {
	var searchForm		= document.searchForm;
	state.search		= searchForm.search.value;
	state.regexChecked	= ~~searchForm.regex.checked;
	state.rarity		= searchForm.rarity.value;
	
	console.log("Saving state: ", state);
	
	$.each([searchForm.folder, searchForm.rarityType, searchForm.rarityGuide, searchForm.sort, searchForm.sortWay],
		function (index, item) {
			state[item.name] = item.value;
		}
	);
	
	console.log(state);
	
	localStorage["state"] = JSON.stringify(state);
}

var folders = [];
var types = [];
var rarities = [];

$(document).ready( function () {

	updateFolders();
	//updateTypes();
	updateRarities();
	checkSettings();
	// restoreState();
	// setInitialView();

	/* Searching */
	$('div.search input, div.search select').bind("keyup change click", delayedResults);
	
	$(document.searchForm.rarityGuide).bind("change", function () {
		document.searchForm.rarity.value = this.value;
		$(document.searchForm.rarity).change();
	});
	
	$('div.popoutLink a').bind("click",
		function () {
			window.open( chrome.extension.getURL('/viewsdb.html') );
		}
	);
	$('div.settingsLink a').bind("click",
		function () {
			window.open( chrome.extension.getURL('/settings.html') );
		}
	);
	
	$('div.pagelink.pull-right').bind("click",
		function () {
			state.page++;
			getResults();
		}
	);
	
	$('div.pagelink.pull-left').bind("click",
		function () {
			state.page--;
			getResults();
		}
	);
	
	$('a.selectAll').bind("click",
		function () {
			$('.items input[type=number]').each( function (index, item) {
				item.value = $(item).closest('tr').data('qty');
			});
		}
	);
	
	$('a.selectOne').bind("click",
		function () {
			$('.items input[type=number]').each( function (index, item) {
				item.value = 1;
			});
		}
	);
	
	$('a.selectLeave').bind("click",
		function () {
			$('.items input[type=number]').each( function (index, item) {
				item.value = $(item).closest('tr').data('qty') - 1;
			});
		}
	);
	
	$('a.selectNone').bind("click",
		function () {
			$('.items input[type=number]').each( function (index, item) {
				item.value = 0;
			});
		}
	);
	
	$('.error, .noresults').bind('click', function () { $(this).addClass('hidden'); } );
	
	$('div.action select[name=action]').bind('change blur', function () {
		if ( this.value == 'Folder' ) {
			$('div.action #folder').fadeIn('slow');
		} else {
			$('div.action #folder').fadeOut('slow');
		}
	});
	
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
		
		this.setAttribute('disabled', 'true');

		var itemArray = $(document.itemForm).serializeArray();
			itemArray = $.grep(itemArray, function ( obj, index ) {
				return ( obj.value !== "0" );
			});

		if ( $('div.action select[name=action]').val() == 'Inventory' ) {

			$.post("http://www.neopets.com/process_safetydeposit.phtml?checksub=scan", $(document.itemForm).serialize()).done(
				function (data) {
					if ( data.match(/welcomeLogin/) ) {
						handleError(null, {"message": "You are not logged in."});
					} else if ( data.match(/Your Safety Deposit Box/) ) {
						handleMsg(null, {"message": "Item(s) have been moved."});
					} else {
						handleError(null, {"message": "An Unexpected Error has occured."});
					}
					
					$.each(itemArray, function ( index, item ) {
						var parent = $('input[name="' + item.name + '"]').closest('tr');
						if ( item.value >= parent.data('qty') ) {
							doRemove( parent.data('id') );
						} else {
							doReduce( parent.data('id'), parent.data('qty') - item.value );
						}
					});
				}
			);
		} else if ( $('div.action select[name=action]').val() == 'Folder' ) {
		
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
			
			console.log(itemArray);
		}
		
		this.removeAttribute('disabled');
	});

});

function doRemove ( obj_info_id ) {
	db.transaction( function (tx) {
		tx.executeSql('DELETE FROM items WHERE obj_info_id = ?', [obj_info_id], handleReduced, handleError);
	});
}

function doReduce ( obj_info_id, newAmount ) {
	console.log( newAmount );
	db.transaction( function (tx) {
		tx.executeSql('UPDATE items SET qty = ? WHERE obj_info_id = ?', [newAmount, obj_info_id], handleReduced, handleError);
	});
}

function handleReduced (tx, results) {
	console.log(results);
	getResults();
}

function moveCompleted (tx, results) {
	// Check affected rows...
	
	updateFolders();
	getResults();
}

function listFolders (tx, results) {
	for (var row = 0; row < results.rows.length; row++)
		folders.push(results.rows.item(row).folder);
		
	$.each( folders, function ( index, folder ) {
		$('select[name=folder]').append('<option>' + folder + '</option>');
	});
	
	$(document.actionForm.folder).autocomplete({ source: folders, position: { "collision": "flip" } });
	
	// Update Types after Folders
	updateTypes();
}

function listTypes (tx, results) {
	for (var row = 0; row < results.rows.length; row++)
		types.push(results.rows.item(row).type);
		
	// Restore State after the page is ready.
	restoreState(); 
}

function listRarity (tx, results) {
	for (var row = 0; row < results.rows.length; row++)
		rarities.push(""+results.rows.item(row).rarity);
		
	$(document.searchForm.rarity).autocomplete({ source: rarities });
}

function updateView (tx, results) {

	$('tr[data-name]').remove();

	if ( results.rows.length == 0 ) {
		$('div.noresults').removeClass('hidden');
	} else {
		$('div.noresults').addClass('hidden');
	}

	console.log("Results:", results.rows.length, "Per Page:", settings.itemsPerPage);

	if ( results.rows.length > settings.itemsPerPage ) {
		$('div.pagelink.pull-right').removeClass('hidden');
	} else {
		$('div.pagelink.pull-right').addClass('hidden');
		state.page = 0;
	}
	
	state.page = ~~state.page;
	
	if ( state.page > 0 ) {
		$('div.pagelink.pull-left').removeClass('hidden');
	} else {
		$('div.pagelink.pull-left').addClass('hidden');
	}
	
	var startNum = state.page * settings.itemsPerPage;
	var endNum = startNum + settings.itemsPerPage;

	if ( endNum > results.rows.length ) {
		endNum = results.rows.length;
	}

	console.log("Start:", startNum, "End:", endNum);

	for (var row = startNum; row < endNum; row++) {
		var item = results.rows.item(row);
		
		var tr = document.createElement('tr');
		tr.setAttribute('class', 'item');
		
		var td = [];
		for ( var i = 0; i < 6; i++ )
			td.push ( document.createElement('td') );

		$('<img>', { "src": item.img }).appendTo(td[0]);
		$('<b>', { "text": item.name }).appendTo(td[1]);
		// $('<i>', { "text": item.desc }).appendTo(td[2]);
		$('<b>', { "text": item.type }).appendTo(td[2]);
		$('<b>', { "text": item.folder }).appendTo(td[3]);
		$('<b>', { "text": item.qty }).appendTo(td[4]);
		$('<input>', {	"type":"number",
						"name":"back_to_inv[" + item.obj_info_id + "]",
						"size":"3",
						"min": "0",
						"max": item.qty,
						"value":"0",
						"pattern":"\\\d+",
						"class":"input-tiny removeQty" }).appendTo(td[5]);
		
		$(tr).attr({
			"data-name": item.name,
			"data-qty": item.qty,
			"data-id": item.obj_info_id,
			"title": item.desc
		});
		
		$.each( td, function ( i, e ) {
			tr.appendChild(e);
		});
		
		$('table.items tbody')[0].appendChild(tr);
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

function delayedResults () {
	// If the user is typing, or holding backspace
	// then there is no need to search every time.
	if ( typeof this.timeoutID == "number" ) {
		window.clearTimeout(this.timeoutID);
	}
	this.timeoutID = setTimeout( function () { getResults(); }, 300 );
}

function getResults () {

	var data = $(document.searchForm).serialize() + state.page;
	if ( data == this.lastsearch ) {
		return;
	}
	
	console.log('Searching...');
	
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
		}
		
		queryFields.push('name ' + searchHow + ' ?');
		queryParams.push(searchText);
	}
	
	if ( document.searchForm.rarity.value > 0 ) {
		queryFields.push('rarity ' + document.searchForm.rarityType.value + ' ?');
		queryParams.push( parseInt(document.searchForm.rarity.value, 10) );
	}
	
	if ( document.searchForm.folder.value != "(Any Folder)" ) {
		queryFields.push('folder = ?');
		queryParams.push( document.searchForm.folder.value );
	}
	
	if ( queryFields.length > 0 ) {
		baseQuery += ' WHERE ' + queryFields.join(' AND ');
	}
	
	baseQuery += ' ORDER BY ' + document.searchForm.sort.value + ' ' + document.searchForm.sortWay.value;
	
	// SQLite is not MySQL.
	// baseQuery += ' LIMIT ?';
	// queryParams.push( parseInt( settings.itemsPerPage, 10 ) );
	
	console.log( baseQuery, queryParams );
	
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
	
	this.lastsearch = data;
	saveState();
}
