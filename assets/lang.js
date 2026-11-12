// BM by default; the choice is remembered on this device
(function () {
  var lang = "ms";
  try {
    lang = localStorage.getItem("waris-lang") || "ms";
  } catch (e) {}
  var set = function (l) {
    lang = l;
    document.documentElement.classList.remove("l-ms", "l-en");
    document.documentElement.classList.add("l-" + l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem("waris-lang", l);
    } catch (e) {}
    var b = document.querySelectorAll(".langbtn");
    for (var i = 0; i < b.length; i++) b[i].textContent = l === "ms" ? "EN" : "BM";
  };
  set(lang);
  document.addEventListener("DOMContentLoaded", function () {
    set(lang);
    var b = document.querySelectorAll(".langbtn");
    for (var i = 0; i < b.length; i++)
      b[i].addEventListener("click", function () {
        set(lang === "ms" ? "en" : "ms");
      });
  });
})();
