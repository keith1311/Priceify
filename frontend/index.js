let selectedChannel = "telegram";

window.addEventListener("DOMContentLoaded", async () => {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
    document.getElementById("moonIcon").style.display = "none";
    document.getElementById("sunIcon").style.display = "inline-block";
  } else {
    document.documentElement.classList.remove("dark");
    document.getElementById("moonIcon").style.display = "inline-block";
    document.getElementById("sunIcon").style.display = "none";
  }

  const response = fetch("http://localhost/api/render-home", {
    Headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch trackers:", response.statusText);
    return;
  }

  const trackedItems = await response.json();

  renderTrackerGrid(trackedItems);
});

// Toggle Dark Mode
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  document.getElementById("moonIcon").style.display = isDark
    ? "none"
    : "inline-block";
  document.getElementById("sunIcon").style.display = isDark
    ? "inline-block"
    : "none";

  if (isDark) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
}

// Alert Channel Selection
function selectChannel(channel) {
  selectedChannel = channel;
  ["telegram", "whatsapp", "email", "discord "].forEach((ch) => {
    const btn = document.getElementById(`chan-${ch}`);
    if (ch === channel) {
      btn.className = "channel-btn active";
    } else {
      btn.className = "channel-btn";
    }
  });
}

// Render Card Grid
function renderTrackerGrid(items) {
  const grid = document.getElementById("trackerGrid");
  grid.innerHTML = "";

  document.getElementById("statTotalItems").innerText =
    `${items.length} Products`;

  if (items.length === 0) {
    grid.innerHTML = `
                    <div style="grid-column: span 3; padding: 3rem 0; text-align: center; background-color: var(--bg-card); border-radius: 0.75rem; border: 1px solid var(--border-color);">
                        <i class="fa-solid fa-radar" style="font-size: 2.25rem; color: var(--text-muted); margin-bottom: 0.75rem;"></i>
                        <p style="font-size: 0.875rem; font-weight: 600; color: var(--text-main);">No active price trackers found.</p>
                        <p style="font-size: 0.75rem; color: var(--text-muted);">Paste a link above to start auto-checking price drops.</p>
                    </div>
                `;
    return;
  }

  items.forEach((item) => {
    const targetMet = item.currentPrice <= item.targetPrice;
    const platformStyle = getPlatformStyle(item.platform);

    const card = document.createElement("div");
    card.className = `tracker-card ${targetMet ? "target-met" : ""}`;

    card.innerHTML = `
                    <div>
                        <!-- Card Top Bar: Platform & Status -->
                        <div class="card-top">
                            <span class="platform-tag ${platformStyle.bgClass}">
                                <i class="${platformStyle.icon} style="margin-right: 0.25rem;"></i> ${item.platform}
                            </span>
                            <div class="status-indicator">
                                <span class="dot ${item.paused ? "paused" : "active"}"></span>
                                <span>${item.paused ? "Paused" : "Checking 4x daily"}</span>
                            </div>
                        </div>

                        <!-- Product Thumbnail & Title -->
                        <div class="card-product">
                            <img src="${item.img}" alt="${item.title}">
                            <div class="card-product-info">
                                <h3>${item.title}</h3>
                                <p>Last checked: ${item.lastChecked}</p>
                            </div>
                        </div>

                        <!-- Price Comparison & Target Progress -->
                        <div class="card-price-box">
                            <div class="price-row">
                                <div>
                                    <span class="price-label">Current Price</span>
                                    <span class="current-price-val">RM ${item.currentPrice.toFixed(2)}</span>
                                </div>
                                <div style="text-align: right;">
                                    <span class="price-label">Alert Target</span>
                                    <span class="target-price-val">RM ${item.targetPrice.toFixed(2)}</span>
                                </div>
                            </div>

                            <!-- Target Visual Progress Bar -->
                            <div>
                                <div class="progress-track">
                                    <div class="progress-fill" style="width: ${Math.min(100, (item.targetPrice / item.currentPrice) * 100)}%;"></div>
                                </div>
                                <div class="progress-footer">
                                    <span>${targetMet ? "🎉 Target Price Met!" : "Awaiting Price Drop"}</span>
                                    <span>Lowest: RM ${item.lowestPrice.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Card Actions Row -->
                    <div class="card-actions">
                        <button onclick="triggerManualCheck(${item.id})" class="btn-manual-check">
                            <i class="fa-solid fa-arrows-rotate" style="font-size: 10px;"></i> Check Now
                        </button>
                        
                        <div class="card-action-icons">
                           
                            <button onclick="togglePauseTracker(${item.id})" class="text-amber" title="${item.paused ? "Resume" : "Pause"}">
                                <i class="fa-solid ${item.paused ? "fa-play" : "fa-pause"}"></i>
                            </button>
                            <button onclick="deleteTracker(${item.id})" class="text-rose" title="Delete">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
    grid.appendChild(card);
  });
}

// Platform Styling Helper
function getPlatformStyle(platform) {
  switch (platform) {
    case "Shopee":
      return { bgClass: "bg-shopee", icon: "fa-solid fa-bag-shopping" };
    case "Lazada":
      return { bgClass: "bg-lazada", icon: "fa-solid fa-cart-shopping" };
    case "TikTok Shop":
      return { bgClass: "bg-tiktok", icon: "fa-brands fa-tiktok" };
    case "Taobao":
      return { bgClass: "bg-taobao", icon: "fa-solid fa-store" };
    case "Pinduoduo":
      return { bgClass: "bg-pinduoduo", icon: "fa-solid fa-truck" };
    default:
      return { bgClass: "bg-amazon", icon: "fa-solid fa-globe" };
  }
}

// Create New Tracker Handler
function handleCreateTracker(e) {
  e.preventDefault();
  const url = document.getElementById("productUrlInput").value;
  const targetPrice = parseFloat(
    document.getElementById("targetPriceInput").value,
  );

  let platform = "Shopee";
  if (url.includes("lazada")) platform = "Lazada";
  if (url.includes("tiktok")) platform = "TikTok Shop";
  if (url.includes("tokopedia")) platform = "Tokopedia";

  const newItem = {
    id: Date.now(),
    title: `Auto-Scraped Product (${platform})`,
    url: url,
    platform: platform,
    img: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=200",
    currentPrice: targetPrice * 1.15,
    targetPrice: targetPrice,
    lowestPrice: targetPrice * 0.95,
    status: "checking",
    lastChecked: "Just now",
    frequency: "Every 3 hours",
    paused: false,
  };

  trackedItems.unshift(newItem);
  renderTrackerGrid(trackedItems);

  document.getElementById("addTrackerForm").reset();
  detectPlatform("");
  showToast(`Tracker added! Monitoring via ${selectedChannel.toUpperCase()}`);
}

// Simulate Manual Check
function triggerManualCheck(id) {
  const item = trackedItems.find((i) => i.id === id);
  if (item) {
    showToast(`Pinging ${item.platform} server for live price...`);
    setTimeout(() => {
      item.lastChecked = "Just now";
      renderTrackerGrid(trackedItems);
      showToast(
        `Updated! Price confirmed at RM ${item.currentPrice.toFixed(2)}`,
      );
    }, 1000);
  }
}

// Pause/Resume Tracker
function togglePauseTracker(id) {
  const item = trackedItems.find((i) => i.id === id);
  if (item) {
    item.paused = !item.paused;
    renderTrackerGrid(trackedItems);
    showToast(item.paused ? "Tracker paused" : "Tracker resumed");
  }
}

// Delete Tracker
function deleteTracker(id) {
  trackedItems = trackedItems.filter((i) => i.id !== id);
  renderTrackerGrid(trackedItems);
  showToast("Tracker removed");
}

// Filter Grid Function
function filterTrackers() {
  const query = document
    .getElementById("searchTrackerInput")
    .value.toLowerCase();
  const platform = document.getElementById("platformFilter").value;

  const filtered = trackedItems.filter((i) => {
    const matchesQuery =
      i.title.toLowerCase().includes(query) ||
      i.platform.toLowerCase().includes(query);
    const matchesPlatform = platform === "all" || i.platform === platform;
    return matchesQuery && matchesPlatform;
  });

  renderTrackerGrid(filtered);
}

// Open Detail Modal
function openModal(id) {
  const item = trackedItems.find((i) => i.id === id);
  if (!item) return;

  document.getElementById("modalImg").src = item.img;
  document.getElementById("modalTitle").innerText = item.title;
  document.getElementById("modalLink").href = item.url;
  document.getElementById("modalCurrentPrice").innerText =
    `RM ${item.currentPrice.toFixed(2)}`;
  document.getElementById("modalTargetPrice").innerText =
    `RM ${item.targetPrice.toFixed(2)}`;
  document.getElementById("modalLowestPrice").innerText =
    `RM ${item.lowestPrice.toFixed(2)}`;

  const platformStyle = getPlatformStyle(item.platform);
  const modalPlatformEl = document.getElementById("modalPlatform");
  modalPlatformEl.className = `platform-tag ${platformStyle.bgClass}`;
  modalPlatformEl.innerHTML = `<i class="${platformStyle.icon}"></i> ${item.platform}`;

  document.getElementById("detailModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("detailModal").classList.add("hidden");
}

// Toast Helper
function showToast(msg) {
  const toast = document.getElementById("toast");
  document.getElementById("toastMsg").innerText = msg;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
