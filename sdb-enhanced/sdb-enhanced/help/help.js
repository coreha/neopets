$(document).ready(function (){
	$('p.q').click(function () {
		$(this).find('+ .a').slideToggle();
	});
	
	$('#expandall').click(function (){
		$('p.q + .a').slideToggle();
	});
	
	/*
	 * Auto-link the sidebars to the headers.
	 */
	$('.nav li a').each(function(index, element) {
		element.setAttribute('href', '#' + element.innerText.toLowerCase().replace(/[^A-Za-z0-9]/g, ''));
	});
	
	$('h3, h4, h5').each(function (index, element) {
		element.setAttribute('id', element.innerText.toLowerCase().replace(/[^A-Za-z0-9]/g, ''));
	});
	
	/*
	 * Switch the active link when clicked.
	 */
	$('.nav a').click(function (e) {
		e.preventDefault();
		
		$('.nav li').removeClass('active');
		$(this).closest('li').addClass('active');
		
		/*
		 * Handle webkit/chrome bug - https://code.google.com/p/chromium/issues/detail?id=223903
		 */
		$('body').animate({
			scrollTop: $(this.href.match(/#.*/)[0]).position().top
		});
		$('h3, h4, h5').removeClass('target');
		$(this.href.match(/#.*/)[0]).addClass('target');
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