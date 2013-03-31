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
var db;
db = openDatabase('sdb', '1.0', 'sdb items', 200 * 1024 * 1024);
db.transaction(function (tx) {
	tx.executeSql('CREATE TABLE IF NOT EXISTS items (obj_info_id INTEGER UNIQUE, name TEXT, desc TEXT, img TEXT, type TEXT, folder TEXT, qty INTEGER, rarity INTEGER)');
});
db.transaction( function (tx) {
	tx.executeSql('SELECT DISTINCT folder FROM items', [], listFolders, handleError);
});
db.transaction( function (tx) {
	tx.executeSql('SELECT DISTINCT type FROM items', [], listTypes, handleError);
});
db.transaction( function (tx) {
	tx.executeSql('SELECT * FROM items ORDER BY obj_info_id ASC LIMIT 30', [], updateView, handleError);
});


var folders = [];
var types = [];

$(document).ready( function () {

	/* Searching */
	$('div.search input').bind("keyup change click", getResults);
	$('.error, .noresults').bind('click', function () { $(this).addClass('hidden'); } );
	
	$('div.action select[name=action]').bind('change blur', function () {
		if ( this.value == 'Folder' ) {
			$('div.action #folder').fadeIn('slow');
		} else {
			$('div.action #folder').fadeOut('slow');
		}
	});
	
	$('input.removeQty').bind('keyup', function () {
		console.log(this);
		var parentQty = $(this).closest('tr').data('qty')
		if ( this.value > parentQty ) {
			this.value = parentQty;
		}
		console.log( parentQty );
	});
	
	$('div.action #action-button').bind('click', function (e) {
		e.preventDefault();
		
		if ( $('div.action select[name=action]').val() == 'Inventory' ) {
			var itemArray = $(document.itemForm).serializeArray();
			$.post("http://www.neopets.com/process_safetydeposit.phtml?checksub=scan", $(document.itemForm).serialize()).done(
				function (data) {
					if ( data.match(/welcomeLogin/) ) {
						handleError(null, {"message": "You are not logged in."});
					} else if ( data.match(/Your Safety Deposit Box/) ) {
						handleMsg(null, {"message": "Item(s) have been moved."});
					} else {
						handleError(null, {"message": "An Unexpected Error has occured."});
					}
					
					itemArray = $.grep(itemArray, function ( obj, index ) {
						return ( obj.value !== "0" );
					});
					
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
		}
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

function listFolders (tx, results) {
	for (var row = 0; row < results.rows.length; row++)
		folders.push(results.rows.item(row).folder);
		
	$.each( folders, function ( index, folder ) {
		$('div.action #folder').append('<option>' + folder + '</option>');
	});
}

function listTypes (tx, results) {
	for (var row = 0; row < results.rows.length; row++)
		types.push(results.rows.item(row).type);
}

function updateView (tx, results) {

	$('tr[data-name]').remove();

	if ( results.rows.length == 0 ) {
		$('div.noresults').removeClass('hidden');
	} else {
		$('div.noresults').addClass('hidden');
	}

	for (var row = 0; row < results.rows.length; row++) {
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

function getResults () {

	var search = $('input#search').val();
	if ( search == this.lastsearch ) {
		return;
	}
	
	var searchHow;
	
	if ( $('input#regex:checked').length ) {
		searchHow = 'REGEXP';
	} else {
		searchHow = 'LIKE'
		search = '%'+search+'%';
	}
	
	db.transaction( function (tx) {
		tx.executeSql('SELECT * FROM items WHERE name ' + searchHow + ' ? LIMIT 30', [search], updateView, handleError);
	});
	
	/* For testing
	$('tr[data-name]').each( function(i,e) {
		if( ! e.getAttribute('data-name').match(new RegExp(search, "i")) ) {
			$(this).addClass('hidden');
		} else {
			$(this).removeClass('hidden');
		}
	}); */
	
	this.lastsearch = search;
}
