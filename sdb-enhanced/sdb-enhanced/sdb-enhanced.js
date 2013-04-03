// By running the scripts this way, the "tabs" permission is not required, which is good.
if ( window.location.href.indexOf('http://www.neopets.com/safetydeposit.phtml') === 0 ) {
/* Start SDB */
/* Initialize Regex */
var objregex = new RegExp('back_to_inv\\\[(\\\d+)\\\]');

var items = [];

jQuery(document).ready(function() {
	var trList = jQuery("td.contentModuleHeaderAlt").closest("table").find("tr[bgcolor]").has('img');
	console.log ( "Matched Elements:", trList.length );
	
	trList.each(
		function(index, element) {
		
			var item = {};
			
			try {
				item.img		= element.children[0].querySelector('img').getAttribute('src');
				item.name		= element.children[1].querySelector('b').childNodes[0].textContent; // childNodes returns text nodes
				item.rarity		= 0; // We can only get an estimate of rarity from the SDB page
				item.wearable	= 0;
				item.desc		= element.children[2].querySelector('i').textContent;
				item.type		= element.children[3].querySelector('b').textContent;
				item.qty		= element.children[4].querySelector('b').textContent;
				item.obj_info_id= element.children[5].querySelector('input').getAttribute('name').match(objregex)[1];
				
				var rarityTemp = element.children[1].querySelectorAll('span font, span span b');
				for ( var i = 0; i < rarityTemp.length; i++ ) {
					var curString = rarityTemp[i].textContent;
					
					if ( curString.match(/RARITY (\d{3})/) ) {
						item.rarity = curString.match(/RARITY (\d{3})/)[1];
					} else {
						switch ( curString ) {
							case '(uncommon)':		// 75-84
								item.rarity = 75; break;
							case '(rare)':			// 85-89
								item.rarity = 85; break;
							case '(very rare)':		// 90-94
								item.rarity = 90; break;
							case '(ultra rare)':	// 95-98
								item.rarity = 95; break;
							case '(super rare)':	// 99
								item.rarity = 99; break;
							case '(MEGA RARE)':		// 107-110
								item.rarity = 107; break;
							case '(special)':
								item.rarity = 101; break;
							case '(retired)':
								item.rarity = 180; break;
							case '(Artifact)': // Unsure
							case '(Artifact - 200)':
							case '(Artifact - 250)':
								switch ( item.name ) {
									case 'Faerie Slingshot':
									case 'Sword of the Air Faerie':
									case 'Everlasting Crystal Apple':
									case 'Earth Faerie Leaves':
									case 'Noxious Carrot Blade':
										item.rarity = 250; break;
									default:
										item.rarity = 200; break;
								}
								break;
							
							case '(wearable)':
								item.wearable = 1; break;
						}
					}
				}
			} catch (e) {
				alert('[SDB-Enhanced]\nUnexpected Error while processing\n' + item.name + '\n\n' + e.name + ': ' + e.message);
				return true;
			}
			
			items.push(item);
		}
	);
	
	if ( items.length !== trList.length ) {
		console.log( "Warning: item count mismatch. Expected:", trList.length, ", Got:", items.length );
	} 
	
	//console.log( items );
	chrome.runtime.sendMessage( { "action": "add", "items": items } );
	console.log( "[SDB-Enhanced] Queued", items.length, "items for processing." );
	
	$('<div style="width: 100%; position: fixed; top: 10px;">'+
	  '<div style="width: 996px; margin: 0 auto; border-radius: 25px; background: '+
	  'rgba(40,130,22,0.9); z-index: 10099991;"><span style="vertical-align: middle; font-size: 2em;">'+
	  'Queued ' + items.length + ' items for processing.</span></div></div>')
	.appendTo(document.body)
	.fadeOut(5000)
	.on('click', function () { $(this).remove(); });
});
/* End SDB */
} else if ( window.location.href.indexOf('http://www.neopets.com/quickstock.phtml') === 0 ) {
/* Start Quick Stock */
$(document).ready( function () {
	$('input[type=submit][value=Submit]').click(function (e) {

		// BUG: If user has old quick stock page open, we can't detect errors.
		var depositList = $('form[name=quickstock] input[type=radio][value=deposit]').filter( function () { return this.checked; } );
	
		var items = {};

		function addItem (name) {
			if ( name == "" || name == undefined ) {
				return;
			} 
			if ( typeof items[name] == "undefined" ) {
				 items[name] = 1;
			} else {
				items[name]++;
			}
		}
	
		depositList.each(
			function (index, element) {
				// Neopets only allows 70 items in Quick Stock, index starts at 0
				if ( index > 69 ) { return false; }
			
				addItem( $(element).closest('tr').find('td:first-child').text() );
			}
		);
		
		chrome.runtime.sendMessage({ "action": "addIncomplete", "items": items });
	});
});
/* End Quick Stock */
} else if ( window.location.href.indexOf('http://www.neopets.com/iteminfo.phtml') === 0 ) {
/* Start Inventory */
$(document).ready( function () {
	$('input#submit').click(function (e) {
		// BUG: If user has old inventory page open, we can't detect errors.
		if ( document.querySelector('select[name=action]').value == "safetydeposit" ) {
			try {
				var itemName = $('td:nth-child(2)', 'table:eq(0)').text().match(/Item\s+:\s+(.*)/)[1];
				var items = {};
				items[itemName] = 1;
				
				chrome.runtime.sendMessage({ "action": "addIncomplete", "items": items });
			} catch (e) {
				// Make it obvious that there was an error.
				alert("[SDB-Enhanced] Unexpected Error\n\nItem not added.\n" + e);
			}
		}
	});
});
/* End Inventory */
} else if ( window.location.href.indexOf('http://www.neopets.com/search.phtml?selected_type=object&SDB&string=') === 0 ) {
/* Start Rarity Lookup */
/*
http://www.neopets.com/search.phtml?selected_type=object&SDB&string=Negg

document.body.querySelector('td.contentModule img[width="80"]')
document.body.innerHTML.match(/Name:[\s\S]+?<b>(.*?)<\/b>/)[1]
document.body.innerHTML.match(/Rarity:[\s\S]+?<b>(.*?)<\/b>/)[1]
document.body.innerHTML.match(/Estimated Value[\S\s]+<i>([\s\S]+)<\/i>/)[1]
*/
$('link, script').remove();
$('img[width!="80"]').remove();

$('body').html( document.body.innerHTML );

try {
	if ( document.body.innerHTML.match(/this item either doesn't exist or is too rare to view/) === null ) {
		var item = {};
		item.name	= document.body.innerHTML.match(/Name:[\s\S]+?<b>(.*?)<\/b>/)[1];
		item.rarity	= document.body.innerHTML.match(/Rarity:[\s\S]+?<b>(.*?)<\/b>/)[1];
		item.desc	= document.body.innerHTML.match(/Estimated Value[\S\s]+<i>([\s\S]+)<\/i>/)[1];
		item.image	= document.body.querySelector('td.contentModule img[width="80"]').getAttribute('src');
		
		chrome.runtime.sendMessage({ "action": "addRarity", "item": item });
	} else {
		chrome.runtime.sendMessage({ "action": "rarityNotFound", "item": decodeURIComponent(window.location.search.match(/string=(.*)/)[1]) });
	}
} catch (e) {
	console.log(e);
}
/* End Rarity Lookup */
}
