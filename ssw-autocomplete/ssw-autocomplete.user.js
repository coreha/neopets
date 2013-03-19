// ==UserScript==
// @name           Neopets - SSW Autocomplete
// @description    Uses jQuery UI's Autocomplete for SSW
// @include        http://www.neopets.com/*
// @include        http://neopets.com/*
// @match          http://www.neopets.com/*
// @match          http://neopets.com/*
// @updated        18.03.2013
// ==/UserScript==

// Written for Chrome, may work in Firefox

// neopets jQuery UI is missing autocomplete, so import it from Google
e = document.createElement("script");
e.type = "text/javascript";
e.src = "http://ajax.googleapis.com/ajax/libs/jqueryui/1.8/jquery-ui.min.js"
// Wait for jQuery UI to load before starting autocomplete
e.onload = function () { initAutocomplete(); };
document.head.appendChild(e);

e = document.createElement("link");
e.href = "http://ajax.googleapis.com/ajax/libs/jqueryui/1.8/themes/base/jquery-ui.css";
e.type = "text/css";
e.rel = "stylesheet";
document.head.appendChild(e);

e = document.createElement("style");
e.type = "text/css";
e.textContent = "#ssw-tabs { background: #D2D2D2; }";
document.head.appendChild(e);

function initAutocomplete() {
        e = document.createElement("script");
        e.type = "text/javascript";
        e.textContent = ''+
'/* Initialize source array */'+
'var autocompletedata = new Array();'+
'$(document).ready(function() {'+

        '/* check for SSW */'+
        'if ( typeof NS_SSW == "undefined" ) {'+
                'console.log("[AUTOCOMPLETE] SSW not found. Exiting.");'+
                'return;'+
        '}'+

        '/* If the browser does not support local storage, do not cause problems */'+
        'try {'+
                '/* localStorage only supports strings, so use JSON */'+
                'autocompletedata = localStorage["autocompletedata"];'+

                '/* If nothing has been stored, reset to an empty array */'+
                'if ( typeof autocompletedata == "undefined" ) {'+
                        'console.log("[AUTOCOMPLETE] Initializing autocomplete data.");'+
                        'autocompletedata = [];'+
                        'localStorage["autocompletedata"] = JSON.stringify(autocompletedata);'+
                '} else {'+
                        '/* If something has been stored and JSON fails to parse it, something went wrong. Reset to an empty array. */'+
                        'try {'+
                                'autocompletedata = JSON.parse(autocompletedata);'+
                        '} catch (e) {'+
                                'console.log("[AUTOCOMPLETE] Resetting autocomplete data.");'+
                                'autocompletedata = [];'+
                                'localStorage["autocompletedata"] = JSON.stringify(autocompletedata);'+
                        '}'+
                '}'+

        '} catch (e) {'+
                '/* If localStorage is not supported, abort gracefully */'+
                'console.log("[AUTOCOMPLETE]" + e.name + ": " + e.data);'+
                'return;'+
        '}'+

        '/* jQuery UI Autocomplete */'+
        '$("#searchstr").autocomplete({ source: autocompletedata });'+

        '/* Add new searches to the array, and persist to local storage */'+
        'NS_SSW.storeAutocomplete = function () {'+
                'console.log( "[AUTOCOMPLETE] Storing " + $("#searchstr").val() );'+

                '/* Skip duplicates */'+
                'if ( jQuery.inArray( $("#searchstr").val(), autocompletedata ) == -1 ) {'+
                        'autocompletedata.push( $("#searchstr").val() );'+
                        '$("#searchstr").autocomplete({ source: autocompletedata });'+
                        '/* localStorage only allows strings - use JSON */'+
                        'localStorage["autocompletedata"] = JSON.stringify(autocompletedata);'+
                '}'+
        '};'+

        '/* Below based on neopets.com code */'+
        '$("div#button-search").bind("click", NS_SSW.storeAutocomplete ); '+
        '$("#button-resubmit").bind("click", NS_SSW.storeAutocomplete );'+
        '$("ul.sswdrop").keyup(function(e) {'+
                'if(e.keyCode == 13) {'+
                        'NS_SSW.storeAutocomplete();'+
                '}'+
        '});'+
        '/* End neopets.com code */'+
        '/* Make it easy to clear autocomplete data */'+
        'jQuery("#search-form #area").append(\'<p><a style="cursor: pointer;" onclick=\\\'javascript:localStorage["autocompletedata"]=undefined;jQuery(this).fadeOut("slow");\\\';>Click here to clear AutoComplete Data</a></p>\');'+

        'console.log( "[AUTOCOMPLETE] Loaded." );'+
'});';
        document.head.appendChild(e);
}
