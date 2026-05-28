const assetKeys = [
  "XP",
  "air_skills",
  "airborne_pass_skills",
  "break_skillchains_twice",
  "burnout_skills",
  "clean_racing_skills",
  "combo_skills",
  "convoy_skills",
  "crash_landing_skills",
  "cross_country_events",
  "daredevil_skills",
  "dirtracing_events",
  "drafting_skills",
  "drag_meet_events",
  "drag_racing_events",
  "drift_edrift_skills",
  "drift_tap_skills",
  "event_finish_score",
  "faster_multiplier",
  "freeroam",
  "get_a_new_car",
  "hard_charger_skills",
  "head-to-head_races",
  "instant_credits",
  "instant_super_wheel_spin",
  "instant_wheel_spins",
  "kangaroo_skills",
  "landscaping_skills",
  "link_skill_skills",
  "lucky_escape_skills",
  "multiplier_goes_up_to",
  "near_miss",
  "pass_skills",
  "road_racing_events",
  "showoff_skills",
  "sideswipes_skills",
  "skillchain_ends_later",
  "skillsong",
  "slingshot_skills",
  "speed_skills",
  "street_racing_events",
  "stuntman_skills",
  "threading_the_needle_skills",
  "time_attack_events",
  "touge_events",
  "trading_paint_skill",
  "tripple_pass_skills",
  "ultimate_skillchain_scores",
  "wreckage_skills",
  "wrecking_ball_skills"
];

function getSortGroup(key) {
  if (key.startsWith("instant_") || key.includes("instant")) return 0;
  if (key === "get_a_new_car") return 1;
  if (key === "XP") return 2;
  if (key.endsWith("skills") || key.endsWith("skill")) return 3;
  if (key.endsWith("events") || key.includes("events")) return 4;
  return 5; // rest
}

const sortedAssetKeys = [...assetKeys].sort((left, right) => {
  const groupA = getSortGroup(left);
  const groupB = getSortGroup(right);
  if (groupA !== groupB) {
    return groupA - groupB;
  }
  return left.localeCompare(right);
});

const perkDescriptions = {
  "near_miss": "extra % from Near Miss Skills",
  "street_racing_events": "extra XP for the next n Street Racing Events",
  "break_skillchains_twice": "Skill Chains only break after 2 collisions",
  "time_attack_events": "extra % XP for completing Time Attack",
  "trading_paint_skill": "extra % skill score from Trading Paint",
  "daredevil_skills": "extra % skill score from daredevil skills",
  "drafting_skills": "extra % from drafting",
  "slingshot_skills": "extra % from slingshot",
  "threading_the_needle_skills": "extra % from Threading the needle",
  "convoy_skills": "extra % from convoy",
  "touge_events": "extra % XP on next n Touge Events",
  "road_racing_events": "extra % on next n Road Racing Events",
  "clean_racing_skills": "extra % from clean racing",
  "faster_multiplier": "Skill multiplier builds 2.0 times as fast",
  "link_skill_skills": "extra % from Link Skills",
  "instant_super_wheel_spin": "instant super wheel spin",
  "instant_wheel_spins": "get instant wheelspins",
  "speed_skills": "extra % from speed skills",
  "drag_meet_events": "extra % from Drag Meet",
  "pass_skills": "extra % from pass skills",
  "multiplier_goes_up_to": "Skill multiplier can go to n",
  "burnout_skills": "extra % from burnout skills",
  "hard_charger_skills": "extra % from hard charger skills",
  "tripple_pass_skills": "extra % from tripple pass skills",
  "freeroam": "extra % XP from skills banked in Freeroam",
  "air_skills": "extra % from air skills",
  "airborne_pass_skills": "extra % from airborne pass skills",
  "crash_landing_skills": "extra % from crash landing skills",
  "wreckage_skills": "extra % from wreckage skills",
  "wrecking_ball_skills": "extra % from wrecking ball skills",
  "skillchain_ends_later": "skill chain ends 1.5 later",
  "event_finish_score": "extra % increase in event finish XP",
  "instant_credits": "instand n CR",
  "combo_skills": "extra % from combo_skills",
  "cross_country_events": "extra % next n cross country events",
  "head-to-head_races": "extra credits from head-to-head races",
  "skillsong": "skill multiplier 3.0 times faster when a skill song is played",
  "lucky_escape_skills": "extra % from lucky escape skills",
  "showoff_skills": "extra % from showoff skills",
  "drift_tap_skills": "extra % from drift tap skills",
  "drift_edrift_skills": "extra % from drift and e-drift skills",
  "kangaroo_skills": "extra % from kangaroo skills",
  "get_a_new_car": "a new car is added to your collection",
  "ultimate_skillchain_scores": "extra % from ultimate skill chain scores",
  "sideswipes_skills": "extra % from sideswipes skills",
  "dirtracing_events": "extra % for next n dirt racing events",
  "stuntman_skills": "extra % from stuntman skills",
  "landscaping_skills": "extra % from landscaping skills",
  "drag_racing_events": "extra % for n drag racing events"
};

const state = {
  data: [],
  masteryCounts: new Map(),
  selected: new Set(),
  searchQuery: "",
  filterMode: "any" // "any" or "all"
};

// Check if running in the single-file built version or the development src/ version
const assetBasePath = window.__MASTERY_DATA__ ? "./assets" : "../assets";

const iconGrid = document.querySelector("#icon-grid");
const results = document.querySelector("#results");
const activeFilters = document.querySelector("#active-filters");
const resultsCount = document.querySelector("#results-count");
const activeCount = document.querySelector("#active-count");
const totalIcons = document.querySelector("#total-icons");
const cardTemplate = document.querySelector("#car-card-template");
const selectAllButton = document.querySelector("#select-all");
const clearAllButton = document.querySelector("#clear-all");
const searchInput = document.querySelector("#car-search");
const modeAnyBtn = document.querySelector("#mode-any");
const modeAllBtn = document.querySelector("#mode-all");

const formatLabel = (value) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

function getSVGPath(key) {
  // SVGs in assets use spaces instead of underscores, except lucky_escape_skills which uses underscores
  const filename = key === "lucky_escape_skills" ? key : key.replace(/_/g, " ");
  return `${assetBasePath}/${filename}.svg`;
}

function handleAssetError(event) {
  const image = event.currentTarget;

  image.classList.add("asset-missing");
  image.style.opacity = "0.15"; // Dim failed assets to look locked/placeholder
}

function createAssetImage(key, alt, className = "") {
  const image = document.createElement("img");

  if (window.__MASTERY_SVGS__ && window.__MASTERY_SVGS__[key]) {
    image.src = window.__MASTERY_SVGS__[key];
  } else {
    const svgPath = getSVGPath(key);
    image.src = svgPath;
  }

  image.alt = alt;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", handleAssetError);

  if (className) {
    image.className = className;
  }

  return image;
}

function createIconButton(key, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.dataset.key = key;
  button.style.animationDelay = `${Math.min(index * 15, 300)}ms`;
  button.setAttribute("aria-pressed", "false");
  button.title = perkDescriptions[key] || formatLabel(key);

  button.append(createAssetImage(key, `${formatLabel(key)} icon`));

  const copy = document.createElement("div");
  copy.className = "icon-copy";

  const copyInner = document.createElement("div");
  const title = document.createElement("span");
  title.className = "icon-title";
  title.textContent = formatLabel(key);

  const meta = document.createElement("span");
  meta.className = "icon-meta";
  meta.textContent = "0 matches";

  copyInner.append(title, meta);
  copy.append(copyInner);
  button.append(copy);

  button.addEventListener("click", () => {
    if (state.selected.has(key)) {
      state.selected.delete(key);
    } else {
      state.selected.add(key);
    }
    syncButtons();
    render();
  });

  return button;
}

function syncButtons() {
  const buttons = iconGrid.querySelectorAll(".icon-button");
  buttons.forEach((button) => {
    const key = button.dataset.key;
    const active = state.selected.has(key);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  activeCount.textContent = String(state.selected.size);
}

function renderActiveFilters() {
  activeFilters.innerHTML = "";

  if (!state.selected.size && !state.searchQuery) {
    const hint = document.createElement("span");
    hint.className = "filter-chip empty-hint";
    hint.textContent = "No filters active";
    activeFilters.append(hint);
    return;
  }

  // Render search query chip if exists
  if (state.searchQuery) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "filter-chip active-chip search-chip";

    const label = document.createElement("span");
    label.innerHTML = `Search: <strong>${state.searchQuery}</strong>`;

    const removeBtn = document.createElement("span");
    removeBtn.className = "remove-filter-btn";
    removeBtn.innerHTML = "&times;";

    chip.append(label, removeBtn);
    chip.addEventListener("click", () => {
      state.searchQuery = "";
      searchInput.value = "";
      render();
    });
    activeFilters.append(chip);
  }

  // Render selected perk chips
  [...state.selected]
    .sort((left, right) => left.localeCompare(right))
    .forEach((key) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip active-chip";

      const label = document.createElement("span");
      label.textContent = formatLabel(key);

      const removeBtn = document.createElement("span");
      removeBtn.className = "remove-filter-btn";
      removeBtn.innerHTML = "&times;";

      chip.append(label, removeBtn);
      chip.addEventListener("click", () => {
        state.selected.delete(key);
        syncButtons();
        render();
      });

      activeFilters.append(chip);
    });
}

function buildCard(entry) {
  const fragment = cardTemplate.content.cloneNode(true);
  fragment.querySelector(".car-name").textContent = entry.Carname;
  fragment.querySelector(".car-year").textContent = entry.Year;

  const masteryContainer = fragment.querySelector(".car-masteries");
  masteryContainer.innerHTML = "";

  // Render full 4x4 grid of car masteries (16 slots)
  for (let i = 0; i < 16; i++) {
    const mastery = (entry.Mastery && entry.Mastery[i]) || null;
    const slot = document.createElement("div");
    slot.className = "mastery-slot";

    if (mastery) {
      slot.classList.add("occupied");

      const isActive = state.selected.has(mastery);
      if (isActive) {
        slot.classList.add("active");
      }

      const img = createAssetImage(mastery, `${formatLabel(mastery)} mastery icon`, "mastery-icon");
      slot.title = perkDescriptions[mastery] || formatLabel(mastery);
      slot.append(img);

      // Interactive shortcut: clicking a perk inside a card toggles it in filters!
      slot.addEventListener("click", () => {
        if (state.selected.has(mastery)) {
          state.selected.delete(mastery);
        } else {
          state.selected.add(mastery);
        }
        syncButtons();
        render();
      });
    } else {
      slot.classList.add("empty-slot");
      const dot = document.createElement("div");
      dot.className = "empty-dot";
      slot.append(dot);
    }

    masteryContainer.append(slot);
  }

  return fragment;
}

function renderEmptyState() {
  results.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-content">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <strong>Find Your Dream Car</strong>
        <p>
          Type a search term or click mastery perks in the selection panel to explore matching vehicles.
        </p>
      </div>
    </div>
  `;
  resultsCount.textContent = "0";
}

function updateIconCounts() {
  iconGrid.querySelectorAll(".icon-button").forEach((button) => {
    const key = button.dataset.key;
    const count = state.masteryCounts.get(key) || 0;
    button.querySelector(".icon-meta").textContent = `${count} match${count === 1 ? "" : "es"}`;
  });
}

function buildMasteryCounts(data) {
  return data.reduce((counts, entry) => {
    (entry.Mastery || []).forEach((mastery) => {
      if (!mastery) {
        return;
      }
      counts.set(mastery, (counts.get(mastery) || 0) + 1);
    });
    return counts;
  }, new Map());
}

function render() {
  renderActiveFilters();

  if (!state.selected.size && !state.searchQuery) {
    renderEmptyState();
    return;
  }

  // Filter cars based on search input and selected perks
  let filtered = state.data;

  // 1. Filter by text search query
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (entry) =>
        entry.Carname.toLowerCase().includes(query) ||
        entry.Manufacturer.toLowerCase().includes(query)
    );
  }

  // 2. Filter by mastery perks
  if (state.selected.size > 0) {
    filtered = filtered.filter((entry) => {
      const carPerks = entry.Mastery || [];
      if (state.filterMode === "all") {
        return [...state.selected].every((selectedPerk) => carPerks.includes(selectedPerk));
      } else {
        return [...state.selected].some((selectedPerk) => carPerks.includes(selectedPerk));
      }
    });
  }

  // Map and sort matching entries
  const matchingEntries = filtered
    .map((entry) => {
      const matches = (entry.Mastery || []).filter(
        (mastery) => mastery && state.selected.has(mastery)
      );
      return { entry, matches };
    })
    .sort((left, right) => {
      const manufacturerCompare = left.entry.Manufacturer.localeCompare(right.entry.Manufacturer);
      if (manufacturerCompare !== 0) {
        return manufacturerCompare;
      }
      const yearCompare = Number(left.entry.Year) - Number(right.entry.Year);
      if (yearCompare !== 0) {
        return yearCompare;
      }
      return left.entry.Carname.localeCompare(right.entry.Carname);
    });

  results.innerHTML = "";
  resultsCount.textContent = String(matchingEntries.length);

  if (!matchingEntries.length) {
    results.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-content">
          <strong>No matching cars found</strong>
          <p>Try clearing some perks or typing a different search query.</p>
        </div>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  let currentManufacturer = null;

  matchingEntries.forEach(({ entry }) => {
    if (entry.Manufacturer !== currentManufacturer) {
      currentManufacturer = entry.Manufacturer;

      const headerDiv = document.createElement("div");
      headerDiv.className = "manufacturer-header";

      const title = document.createElement("h3");
      title.className = "manufacturer-title";
      title.textContent = currentManufacturer;

      const underline = document.createElement("div");
      underline.className = "manufacturer-underline";

      headerDiv.append(title, underline);
      fragment.append(headerDiv);
    }
    fragment.append(buildCard(entry));
  });
  results.append(fragment);
}

async function loadData() {
  if (Array.isArray(window.__MASTERY_DATA__)) {
    state.data = window.__MASTERY_DATA__;
    state.masteryCounts = buildMasteryCounts(state.data);
    return;
  }

  const response = await fetch("./mastery_all.json");
  if (!response.ok) {
    throw new Error(`Failed to load mastery data: ${response.status}`);
  }

  state.data = await response.json();
  state.masteryCounts = buildMasteryCounts(state.data);
}

async function init() {
  totalIcons.textContent = String(sortedAssetKeys.length);
  sortedAssetKeys.forEach((key, index) => {
    iconGrid.append(createIconButton(key, index));
  });

  // Controls Event Listeners
  selectAllButton.addEventListener("click", () => {
    state.selected = new Set(sortedAssetKeys);
    syncButtons();
    render();
  });

  clearAllButton.addEventListener("click", () => {
    state.selected.clear();
    syncButtons();
    render();
  });

  searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    render();
  });

  modeAnyBtn.addEventListener("click", () => {
    state.filterMode = "any";
    modeAnyBtn.classList.add("active");
    modeAnyBtn.setAttribute("aria-checked", "true");
    modeAllBtn.classList.remove("active");
    modeAllBtn.setAttribute("aria-checked", "false");
    render();
  });

  modeAllBtn.addEventListener("click", () => {
    state.filterMode = "all";
    modeAllBtn.classList.add("active");
    modeAllBtn.setAttribute("aria-checked", "true");
    modeAnyBtn.classList.remove("active");
    modeAnyBtn.setAttribute("aria-checked", "false");
    render();
  });

  try {
    await loadData();
    updateIconCounts();
    syncButtons();
    render();

    const footerCarCount = document.getElementById("footer-car-count");
    if (footerCarCount) {
      footerCarCount.textContent = String(state.data.length);
    }
  } catch (error) {
    console.error(error);
    results.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-content">
          <strong>Could not load dataset</strong>
          <p>Open this site through a local web server so the browser can load <code>mastery_all.json</code>.</p>
        </div>
      </div>
    `;
  }
}

init();
