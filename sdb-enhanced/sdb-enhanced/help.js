$(document).ready(function (){
	$('p.q').click(function () {
		$(this).find('+ p.a').slideToggle();
	});
	
	$('#expandall').click(function (){
		$('p.q + p.a').slideToggle();
	});
	
	/*
	 * Auto-link the sidebars to the headers.
	 */
	$('.nav li a').each(function(index, element) {
		element.setAttribute('href', '#' + element.innerText.toLowerCase().replace(' ', ''));
	});
	
	$('h3, h4, h5').each(function (index, element) {
		element.setAttribute('id', element.innerText.toLowerCase().replace(' ', ''));
	});
	
	/*
	 * Switch the active link when clicked.
	 */
	$('.nav a').click(function () {
		$('.nav li').removeClass('active');
		$(this).closest('li').addClass('active');
	});
	
	/*
	 * Keep the sidebar in view.
	 */
	$(document).scroll( function () {
		var nav = $('.sidebar-container').position().top;
		
		if ( nav < window.scrollY ) {
			$('.sidebar-container').addClass('nav-fixed');
		} else {
			$('.sidebar-container').removeClass('nav-fixed');
		}
	});
	
	$(window).resize( sidebarScroll );
	sidebarScroll();
});

/**
 * Adds a scroll bar to the sidebar if it is too long to fit into the window.
 * +40 for padding.
 */
function sidebarScroll () {
		if ( $(window).height() < $('.sidebar-container').height() + 40 ) {
			$('.sidebar-container').addClass('nav-scroll');
			sidebarScroll.resizedCount++;
		}
		
		sidebarScroll.resizedCount && $('.sidebar-container').css('max-height', $(window).height() - 40);
}

sidebarScroll.resizedCount = 0;