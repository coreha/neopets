// ==UserScript==
// @name           Neopets - Turn Off User Lookup Code
// @description    Removes user code from user lookups.
// @include        http://www.neopets.com/userlookup*
// @match          http://www.neopets.com/userlookup*
// @version        1.00
// @updated        18.03.2013
// ==/UserScript==

e = document.createElement("script");
e.textContent = "jQuery('a[href*=\"/s/index.phtml?track_cat_id\"]').closest('div').nextAll('div')[0].innerHTML = '';";
document.body.appendChild(e);
