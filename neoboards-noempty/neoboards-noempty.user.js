// ==UserScript==
// @name           Neopets - No Empty Neoboards
// @description    If you click on an empty page, goes to the last page instead.
// @include        http://www.neopets.com/neoboards/topic*
// @match          http://www.neopets.com/neoboards/topic*
// @version        1.00
// @updated        18.03.2013
// ==/UserScript==

var e = document.createElement('script');
e.type = "text/javascript";
e.textContent = "if ( $('table#boards_table > tbody > tr').length == 3 ) { $('a', 'td[align=right]')[0].click(); }";
document.body.appendChild(e);
