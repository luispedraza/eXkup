$(function() {
  var options = new Options();

  function onFontSelectorChange() {
    options.setDefaultFont($(this).find("input").attr("value"));
    console.log(options.getDefaultFont());
  }

  // Sección de eventos
  $("#option-google-font").on("change.bfhselectbox", onFontSelectorChange);
  $("#option-system-font").on("change.bfhselectbox", onFontSelectorChange);

});
