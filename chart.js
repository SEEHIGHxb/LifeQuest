// chart.js - LifeQuest Interactive SVG Radar Chart Renderer

const ASPECT_LABELS = {
  finance: "Finance",
  physical: "Physical",
  mental: "Mental",
  relationships: "Relationships",
  personalGoals: "Personal Goals",
  socialContribution: "Social Contribution",
  environment: "Environment",
  humanityFuture: "Humanity's Future"
};

const ASPECT_KEYS = [
  "finance",
  "physical",
  "mental",
  "relationships",
  "personalGoals",
  "socialContribution",
  "environment",
  "humanityFuture"
];

export function renderRadarChart(containerId, aspects) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const width = container.clientWidth || 360;
  const height = 360;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 50;

  // Create SVG element
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.overflow = "visible";

  // Create Glow Filter Definition
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  filter.setAttribute("id", "astral-glow");
  filter.setAttribute("x", "-20%");
  filter.setAttribute("y", "-20%");
  filter.setAttribute("width", "140%");
  filter.setAttribute("height", "140%");
  
  const blur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
  blur.setAttribute("stdDeviation", "4");
  blur.setAttribute("result", "blur");
  
  const merge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
  const node1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
  node1.setAttribute("in", "blur");
  const node2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
  node2.setAttribute("in", "SourceGraphic");
  
  merge.appendChild(node1);
  merge.appendChild(node2);
  filter.appendChild(blur);
  filter.appendChild(merge);
  defs.appendChild(filter);
  svg.appendChild(defs);

  // 1. Draw Concentric Grid Lines (concentric octagons for 8 axes)
  const gridLevels = [20, 40, 60, 80, 100];
  gridLevels.forEach(level => {
    const points = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius * (level / 100);
      const y = cy + Math.sin(angle) * radius * (level / 100);
      points.push(`${x},${y}`);
    }
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", points.join(" "));
    polygon.setAttribute("fill", "none");
    polygon.setAttribute("stroke", "rgba(32, 50, 76, 0.1)"); // Light slate grid lines
    polygon.setAttribute("stroke-width", "1");
    if (level === 100) {
      polygon.setAttribute("stroke", "rgba(205, 161, 66, 0.4)"); // Gold outer rim
      polygon.setAttribute("stroke-dasharray", "4,2");
    }
    svg.appendChild(polygon);
  });

  // 2. Draw 8 Axis lines & Labels
  ASPECT_KEYS.forEach((key, i) => {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const endX = cx + Math.cos(angle) * radius;
    const endY = cy + Math.sin(angle) * radius;

    // Axis line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", cx);
    line.setAttribute("y1", cy);
    line.setAttribute("x2", endX);
    line.setAttribute("y2", endY);
    line.setAttribute("stroke", "rgba(32, 50, 76, 0.15)");
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);

    // Label positioning
    const labelDistance = radius + 22;
    const lx = cx + Math.cos(angle) * labelDistance;
    const ly = cy + Math.sin(angle) * labelDistance;

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", lx);
    text.setAttribute("y", ly + 4);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "var(--color-text-chart)");
    text.style.fontFamily = "var(--font-serif)";
    text.style.fontSize = "11px";
    text.style.fontWeight = "bold";
    text.textContent = ASPECT_LABELS[key];

    // Adjust text alignments slightly depending on quadrant
    if (Math.cos(angle) > 0.1) text.setAttribute("text-anchor", "start");
    else if (Math.cos(angle) < -0.1) text.setAttribute("text-anchor", "end");

    svg.appendChild(text);
  });

  // 3. Draw User Score Polygon
  const scorePoints = [];
  ASPECT_KEYS.forEach((key, i) => {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const score = aspects[key] || 0;
    const x = cx + Math.cos(angle) * radius * (score / 100);
    const y = cy + Math.sin(angle) * radius * (score / 100);
    scorePoints.push(`${x},${y}`);
  });

  const scorePolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  scorePolygon.setAttribute("points", scorePoints.join(" "));
  scorePolygon.setAttribute("fill", "rgba(0, 225, 255, 0.15)"); // Astral Blue translucent fill
  scorePolygon.setAttribute("stroke", "var(--color-astral)");
  scorePolygon.setAttribute("stroke-width", "2.5");
  scorePolygon.setAttribute("filter", "url(#astral-glow)");
  svg.appendChild(scorePolygon);

  // 4. Draw Score Points (dots at vertices)
  ASPECT_KEYS.forEach((key, i) => {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const score = aspects[key] || 0;
    const x = cx + Math.cos(angle) * radius * (score / 100);
    const y = cy + Math.sin(angle) * radius * (score / 100);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", "4");
    circle.setAttribute("fill", "var(--color-gold)");
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", "1.5");
    svg.appendChild(circle);

    // Score label numbers
    const scoreText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    scoreText.setAttribute("x", x);
    scoreText.setAttribute("y", y - 8);
    scoreText.setAttribute("text-anchor", "middle");
    scoreText.setAttribute("fill", "var(--color-astral-dark)");
    scoreText.style.fontFamily = "var(--font-mono)";
    scoreText.style.fontSize = "9px";
    scoreText.style.fontWeight = "bold";
    scoreText.textContent = score;
    svg.appendChild(scoreText);
  });

  container.appendChild(svg);
}
