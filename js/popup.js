window.addEventListener("load", initPopup);
function initPopup() {
	loadProfile();
	LoadTemasBlock();
	// Eventos
	document.getElementById("search").addEventListener("click", Search);
	document.getElementById("board").addEventListener("scroll", scroller);
	document.getElementById("todo").addEventListener("click", loadData);
	document.getElementById("sigo").addEventListener("click", loadData);
	document.getElementById("mios").addEventListener("click", loadData);
	document.getElementById("priv").addEventListener("click", loadData);
	document.getElementById("favs").addEventListener("click", loadFavs);
	document.getElementById("logout").onclick = logOut;
}