/* Initialize Regex */
var nameregex = new RegExp('<b>(.*?)<br><span class="medText">(?:<b><font color="(?:.*?)">(.*?)</font></b><br>)?(?:<span (?:.*?)><b>(.*?)</b></span>)?</span></b>');
var dataregex = new RegExp('<[ib]>((?:.|\\\n)*?)</[ib]>');
var imgregex  = new RegExp('<img src="(.*?)"');
var objregex = new RegExp('back_to_inv\\\[(\\\d+)\\\]');

var items = [];

jQuery(document).ready(function() {
	jQuery("td.contentModuleHeaderAlt").closest("table").find("tr[bgcolor!=#E4E4E4]").each(
		function(i,e) {
			// console.log(i + ": " + $(this).children("td")[1].innerHTML);
			var namematch = $(this).children("td")[1].innerHTML.match(nameregex);
			if ( namematch === null ) { console.log("No match."); return; }
			var rarity = 0;
			var name = namematch[1];
			if ( typeof namematch[2] != "undefined" ) {
				switch ( namematch[2] ) {
					case "(special)":
						rarity = 101; break;
					case "(retired)":
						rarity = 180; break;
					case "(super rare)":
						/* super rare = 99 */
						rarity = 99; break;
					case "(ultra rare)":
						/* ultra rare = 95-98 */
						rarity = 95; break;
					case "(very rare)":
						/* very rare = 90-94 */
						rarity = 90; break;
					case "(rare)":
						/* rare = 85-89 */
						rarity = 85; break;
					case "(uncommon)":
						/* uncommon = 75-84 */
						rarity = 75; break;
				}
			}

			
			var imgmatch = $(this).children("td")[0].innerHTML.match(imgregex);
			var img = imgmatch[1];
			var descmatch = $(this).children("td")[2].innerHTML.match(dataregex);
			var desc = descmatch[1];
			var typematch = $(this).children("td")[3].innerHTML.match(dataregex);
			var type = typematch[1];
			var qtymatch = $(this).children("td")[4].innerHTML.match(dataregex);
			var qty = qtymatch[1];
			var objmatch = $(this).find("td input[name]")[0].getAttribute('name').match(objregex);
			var obj_info_id = objmatch[1];
			
			/* // Debug
			console.log( name );
			console.log( rarity );
			console.log(img);
			console.log(desc);
			console.log(type);
			console.log(qty);
			console.log( objmatch );
			*/
			
			items.push({ "name": name, "rarity": rarity, "img": img, "desc": desc, "type": type, "qty": qty, "obj_info_id": obj_info_id });
		}
	);
		console.log( items );
		chrome.runtime.sendMessage( items );
        console.log( "[SDB-Enhanced] Loaded." );
});
