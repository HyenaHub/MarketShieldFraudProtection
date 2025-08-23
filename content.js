function insertFlag(element, riskLevel) {
  let flag = document.createElement("span");
  flag.style.marginLeft = "6px";
  flag.style.fontWeight = "bold";

  if (riskLevel === "low") {
    flag.textContent = "🟢";
    flag.title = "Low Risk";
  } else if (riskLevel === "medium") {
    flag.textContent = "🟡";
    flag.title = "Medium Risk";
  } else {
    flag.textContent = "🔴";
    flag.title = "High Risk";
  }

  element.appendChild(flag);
}

// Scan listings periodically
setInterval(() => {
  let listings = document.querySelectorAll("a[href*='/marketplace/item/']");
  listings.forEach(listing => {
    if (!listing.dataset.flagged) {
      listing.dataset.flagged = "true";

      // Example: Send to your backend for risk analysis
      fetch("https://yourwebapp.com/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: listing.href })
      })
        .then(res => res.json())
        .then(data => {
          insertFlag(listing, data.risk); 
          // data.risk should be "low", "medium", or "high"
        })
        .catch(() => {
          insertFlag(listing, "low"); // fallback
        });
    }
  });
}, 3000); // every 3 seconds
