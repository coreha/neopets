/* Initialize source array */
var autocompletedata = new Array();
$(document).ready(function() {

        /* check for SSW */
        if ( typeof document.getElementById('superfooter') == "undefined" ) {
                console.log("[AUTOCOMPLETE] SSW not found. Exiting.");
                return;
        }

		var NS_SSW = {}; // For the extension, recreate NS_SSW as an empty object.

        /* If the browser does not support local storage, do not cause problems */
        try {
                /* localStorage only supports strings, so use JSON */
                autocompletedata = localStorage["autocompletedata"];

                /* If nothing has been stored, reset to an empty array */
                if ( typeof autocompletedata == "undefined" ) {
                        console.log("[AUTOCOMPLETE] Initializing autocomplete data.");
                        autocompletedata = [];
                        localStorage["autocompletedata"] = JSON.stringify(autocompletedata);
                } else {
                        /* If something has been stored and JSON fails to parse it, something went wrong. Reset to an empty array. */
                        try {
                                autocompletedata = JSON.parse(autocompletedata);
                        } catch (e) {
                                console.log("[AUTOCOMPLETE] Resetting autocomplete data.");
                                autocompletedata = [];
                                localStorage["autocompletedata"] = JSON.stringify(autocompletedata);
                        }
                }

        } catch (e) {
                /* If localStorage is not supported, abort gracefully */
                console.log("[AUTOCOMPLETE]" + e.name + ": " + e.data);
                return;
        }

        /* jQuery UI Autocomplete */
        $("#searchstr").autocomplete({ source: autocompletedata });

        /* Add new searches to the array, and persist to local storage */
        NS_SSW.storeAutocomplete = function () {
                console.log( "[AUTOCOMPLETE] Storing " + $("#searchstr").val() );

                /* Skip duplicates */
                if ( jQuery.inArray( $("#searchstr").val(), autocompletedata ) == -1 ) {
                        autocompletedata.push( $("#searchstr").val() );
                        $("#searchstr").autocomplete({ source: autocompletedata });
                        /* localStorage only allows strings - use JSON */
                        localStorage["autocompletedata"] = JSON.stringify(autocompletedata);
                }
        };

        /* Below based on neopets.com code */
        $("div#button-search").bind("click", NS_SSW.storeAutocomplete ); 
        $("#button-resubmit").bind("click", NS_SSW.storeAutocomplete );
        $("ul.sswdrop").keyup(function(e) {
                if(e.keyCode == 13) {
                        NS_SSW.storeAutocomplete();
                }
        });
        /* End neopets.com code */
        /* Make it easy to clear autocomplete data */
        jQuery("#search-form #area").append('<p><a style="cursor: pointer;" onclick=\'javascript:localStorage["autocompletedata"]=undefined;jQuery(this).fadeOut("slow");\';>Click here to clear AutoComplete Data</a></p>');

        console.log( "[AUTOCOMPLETE] Loaded." );
});
