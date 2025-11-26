// Smooth fade effect for cards
document.querySelectorAll(".card").forEach((card, i) => {
  card.style.animationDelay = `${i * 0.1}s`;
});
const imageInput = document.getElementById("image_url");
const preview = document.getElementById("preview");

imageInput.addEventListener("input", () => {
  const url = imageInput.value.trim();
  if(url) {
    preview.src = url;
    preview.style.display = "block";
  } else {
    preview.src = "";
    preview.style.display = "none";
  }
});
