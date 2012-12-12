// Saves options to localStorage.
function save_options() {
  var key = document.getElementById("key");
  localStorage["eskupkey"] = key.value;  
  // Update status to let user know options were saved.
  var status = document.getElementById("status");
  status.innerHTML = "Options Saved.";
  setTimeout(function() {
    status.innerHTML = "";
  }, 2000);
}

// Restores select box state to saved value from localStorage.
function restore_options() {
  var key = document.getElementById("key");
  key.value = localStorage["eskupkey"];
  if (key.value == 'undefined') {
    key.value = "";
    key.placeholder = "ej.: 5gTvFkSaO-va1342AlhqMg"
  }
}

function load() {
  restore_options();
  var save = document.getElementById("save");
  save.addEventListener("click", save_options, false);
}

document.addEventListener("DOMContentLoaded", load, false);