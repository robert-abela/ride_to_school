const steps = [
  { id: "model", label: "Model", icon: "✦" },
  { id: "hair", label: "Hairstyle", icon: "✂" },
  { id: "outfit", label: "Clothing", icon: "♚" },
  { id: "accessory", label: "Accessories", icon: "◈" },
  { id: "shoes", label: "Shoes", icon: "⌁" },
  { id: "pose", label: "Final pose", icon: "★" }
];

const options = {
  hair: [
    ["bob", "Sleek bob", "◒"], ["curls", "Soft curls", "❀"],
    ["ponytail", "High pony", "♬"], ["crop", "Cool crop", "✺"]
  ],
  outfit: [
    ["suit", "Statement suit", "♛"], ["dress", "Flowy dress", "♢"],
    ["street", "Street layers", "▤"], ["sport", "Sporty set", "◒"]
  ],
  accessory: [
    ["glasses", "Big sunglasses", "●—●"], ["bag", "Star shoulder bag", "▣"],
    ["necklace", "Gem necklace", "◇"], ["hat", "Wide brim hat", "⌒"]
  ],
  shoes: [
    ["sneakers", "Sneakers", "➟"], ["boots", "Bold boots", "▰"],
    ["loafers", "Loafers", "▱"], ["heels", "Party shoes", "⌁"]
  ],
  pose: [
    ["power", "Power pose", "★"], ["wave", "Friendly wave", "⌁"],
    ["spin", "The spin", "↻"], ["peace", "Peace sign", "✌"]
  ]
};

const defaults = {
  gender: "female", age: "adult", hair: "bob", outfit: "suit",
  accessory: "glasses", shoes: "sneakers", pose: "power"
};

let state = { step: 0, showing: false, showKey: 0, selections: { ...defaults } };
const app = document.getElementById("app");

function modelHTML(walking = false) {
  const s = state.selections;
  const skin = s.gender === "female" ? "#9f633f" : "#70462f";
  return `<div class="model ${s.age} ${s.gender} hair-${s.hair} outfit-${s.outfit} accessory-${s.accessory} pose-${s.pose} ${walking ? "walking" : ""}" ${walking ? "" : 'style="bottom:0"'}>
    <div class="model-shadow"></div>
    <div class="model-head" style="background:${skin}">
      <div class="hair"></div><span class="eye eye-left"></span><span class="eye eye-right"></span><span class="smile"></span>
      ${s.accessory === "glasses" ? '<span class="glasses"><i></i><b></b><em></em></span>' : ""}
      ${s.accessory === "hat" ? '<span class="fashion-hat"></span>' : ""}
    </div>
    <div class="neck" style="background:${skin}"></div>
    <div class="model-body"><span class="lapel"></span></div>
    <div class="arm arm-left" style="background:${skin}"></div><div class="arm arm-right" style="background:${skin}"></div>
    <div class="leg leg-left" style="background:${skin}"><span class="shoe ${s.shoes}"></span></div>
    <div class="leg leg-right" style="background:${skin}"><span class="shoe ${s.shoes}"></span></div>
    ${s.accessory === "bag" ? '<div class="mini-bag"><span>★</span></div>' : ""}
    ${s.accessory === "necklace" ? '<div class="necklace"><span>◆</span></div>' : ""}
  </div>`;
}

function topbarHTML() {
  return `<header class="topbar">
    <button class="brand" data-action="restart" aria-label="Restart Your Runway"><span>✦</span> YOUR RUNWAY <i>✦</i></button>
    <nav class="step-nav" aria-label="Styling progress">
      ${steps.slice(1).map((s, i) => `<button data-step="${i + 1}" class="${state.step === i + 1 ? "active" : ""} ${state.step > i + 1 ? "done" : ""}"><b>${i + 1}</b><span>${s.icon}</span>${s.label}</button>`).join("")}
    </nav>
  </header>`;
}

function editorHTML() {
  const s = state.selections;
  const current = steps[state.step];
  const summary = `${s.age} ${s.gender} · ${s.outfit} look`;
  const controls = state.step === 0 ? `<span class="eyebrow">LET’S GET STARTED</span>
    <h1>Build your look.<br><em>Own the spotlight.</em></h1>
    <p class="intro">Choose your model, then style every detail.</p><h2>Choose your model <span>〰</span></h2>
    <div class="field"><label>Gender</label><div class="model-choices">
      <button data-choice="gender:female" class="${s.gender === "female" ? "selected" : ""}"><i>♀</i> Female</button>
      <button data-choice="gender:male" class="${s.gender === "male" ? "selected" : ""}"><i>♂</i> Male</button>
    </div></div>
    <div class="field"><label>Age</label><div class="model-choices">
      <button data-choice="age:adult" class="${s.age === "adult" ? "selected" : ""}"><i>♟</i> Adult</button>
      <button data-choice="age:kid" class="${s.age === "kid" ? "selected" : ""}"><i>♙</i> Kid</button>
    </div></div>` : `<span class="eyebrow">STEP ${state.step} OF 5</span>
    <h1>Pick your<br><em>${current.label.toLowerCase()}.</em></h1>
    <p class="intro">Tap a style to see it on your model.</p>
    <div class="choice-grid">${options[current.id].map(([id, label, icon]) => `<button data-choice="${current.id}:${id}" class="${s[current.id] === id ? "selected" : ""}"><span class="choice-icon">${icon}</span><b>${label}</b>${s[current.id] === id ? "<i>✓</i>" : ""}</button>`).join("")}</div>`;

  return `<div class="workspace"><section class="config-panel"><div class="progress-mobile">Step ${state.step + 1} of 6</div>${controls}
    <div class="panel-actions">${state.step > 0 ? '<button class="back" data-action="back">← Back</button>' : ""}<button class="primary" data-action="next">${state.step === 0 ? "Start styling" : state.step === 5 ? "Start the show" : "Next step"}<span>→</span></button></div>
    </section><section class="preview-stage"><div class="stage-label"><span>LIVE LOOK</span><strong>${state.step === 0 ? "Meet your model" : `Trying ${current.label.toLowerCase()}`}</strong></div>
    <div class="confetti c1">◆</div><div class="confetti c2">●</div><div class="confetti c3">✦</div>
    <div class="runway"><div class="arch">${modelHTML()}</div><div class="catwalk"><span></span><span></span></div><div class="lights left">● ● ● ●</div><div class="lights right">● ● ● ●</div></div>
    <div class="look-pill">${summary}</div></section></div>`;
}

function showHTML() {
  const s = state.selections;
  const summary = `${s.age} ${s.gender} · ${s.outfit} look`;
  const audience = Array.from({ length: 8 }, () => "<span><i></i></span>").join("");
  return `<section class="show-mode"><div class="show-copy"><span class="eyebrow">YOUR RUNWAY PRESENTS</span><h1>Lights. Camera. You!</h1><p>${summary}</p></div>
    <div class="runway full-runway"><div class="audience audience-left">${audience}</div><div class="audience audience-right">${audience}</div>
    <div class="arch"><div class="spark s1">✦</div><div class="spark s2">◆</div>${modelHTML(true)}</div><div class="catwalk"><span></span><span></span></div><div class="lights left">● ● ● ●</div><div class="lights right">● ● ● ●</div></div>
    <div class="show-actions"><button class="secondary" data-action="edit">Edit look</button><button class="primary" data-action="again">Walk again <span>↻</span></button><button class="secondary" data-action="restart">New model</button></div></section>`;
}

function render() {
  app.innerHTML = topbarHTML() + (state.showing ? showHTML() : editorHTML());
}

app.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.choice) {
    const [key, value] = button.dataset.choice.split(":");
    state.selections[key] = value;
  } else if (button.dataset.step && !state.showing) {
    state.step = Number(button.dataset.step);
  } else {
    switch (button.dataset.action) {
      case "next": state.step < 5 ? state.step++ : state.showing = true; break;
      case "back": state.step--; break;
      case "edit": state.showing = false; state.step = 5; break;
      case "again": state.showKey++; break;
      case "restart": state = { step: 0, showing: false, showKey: 0, selections: { ...defaults } }; break;
    }
  }
  render();
});

render();
