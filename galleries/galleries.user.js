// ==UserScript==
// @name           Neopets - Turn Off Gallery Code
// @description    Removes user code from galleries.
// @include        http://www.neopets.com/gallery/*gu=*
// @match          http://www.neopets.com/gallery/*gu=*
// @version        1.00
// @updated        18.03.2013
// ==/UserScript==

$('p + div.tablestyle')[0].innerHTML = $('p + div.tablestyle')[0].innerHTML.replace(/<\/center>[\s\S]*/img, '</center>');
