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
						case '(special)':
							item.rarity = 101; break;
						case '(retired)':
							item.rarity = 180; break;
						
						case '(wearable)':
							item.wearable = 1; break;
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
	chrome.runtime.sendMessage( items );
	console.log( "[SDB-Enhanced] Queued", items.length, "items for processing." );
	
	$('<div style="width: 100%; position: fixed; top: 10px;">'+
	  '<div style="width: 996px; margin: 0 auto; border-radius: 25px; background: '+
	  'rgba(40,130,22,0.9); z-index: 10099991;"><span style="vertical-align: middle; font-size: 2em;">'+
	  'Queued ' + items.length + ' items for processing.</span></div></div>')
	.appendTo(document.body)
	.fadeOut(5000)
	.on('click', function () { $(this).remove(); });
});
