/**
 * Animated Git-style branch lines background.
 * Draws slowly-moving commit nodes and branch lines using the school colors
 * (lime green and white) on a semi-transparent canvas behind the page content.
 */
(function () {
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");

  // School color palette
  const COLORS = {
    branch1: "rgba(76, 175, 80, 0.55)",   // lime green
    branch2: "rgba(129, 199, 132, 0.40)",  // lighter green
    branch3: "rgba(255, 255, 255, 0.30)",  // white
    node: "rgba(76, 175, 80, 0.75)",
    nodeBorder: "rgba(255, 255, 255, 0.9)",
    background: "#eaf5ea",
  };

  const LANE_COUNT = 4;      // number of parallel branch lanes
  const NODE_RADIUS = 6;
  const SPEED = 0.35;         // pixels per frame (vertical scroll speed)
  const SEGMENT_HEIGHT = 90;  // vertical distance between commits

  let W = 0;
  let H = 0;
  let laneX = [];             // x positions for each lane
  let nodes = [];             // all visible commit nodes
  let tick = 0;
  let animationFrameId = null;

  // A single commit node on a specific lane
  class CommitNode {
    constructor(lane, y) {
      this.lane = lane;
      this.y = y;
      this.x = laneX[lane];
      // Some nodes branch-off or merge into adjacent lane
      this.mergeTarget = null; // lane index to draw a merge line toward
    }
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;

    // Spread lanes evenly across the canvas width, with margins
    const margin = W * 0.08;
    const spacing = (W - margin * 2) / (LANE_COUNT - 1);
    laneX = Array.from({ length: LANE_COUNT }, (_, i) => margin + i * spacing);

    rebuildNodes();
  }

  function rebuildNodes() {
    nodes = [];
    // Seed with nodes covering the entire screen plus overflow above/below
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      // stagger starting positions per lane so nodes don't all line up
      const offset = (lane * SEGMENT_HEIGHT) / LANE_COUNT;
      for (let y = -SEGMENT_HEIGHT + offset; y < H + SEGMENT_HEIGHT * 2; y += SEGMENT_HEIGHT) {
        const node = new CommitNode(lane, y);
        // Occasionally add a branch/merge line to the adjacent lane
        if (Math.random() < 0.25 && lane < LANE_COUNT - 1) {
          node.mergeTarget = lane + 1;
        }
        nodes.push(node);
      }
    }
  }

  function branchColor(lane) {
    const palette = [COLORS.branch1, COLORS.branch2, COLORS.branch3, COLORS.branch1];
    return palette[lane % palette.length];
  }

  function drawBranches() {
    // Draw vertical lane lines
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      ctx.beginPath();
      ctx.moveTo(laneX[lane], 0);
      ctx.lineTo(laneX[lane], H);
      ctx.strokeStyle = branchColor(lane);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawNodes() {
    nodes.forEach((node) => {
      const x = laneX[node.lane];
      const y = node.y;

      // Draw merge/branch line to adjacent lane if set
      if (node.mergeTarget !== null) {
        const tx = laneX[node.mergeTarget];
        // Find target node in adjacent lane closest in y
        const targetY = y + SEGMENT_HEIGHT * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        // Bezier curve for a natural-looking branch
        ctx.bezierCurveTo(x, y + SEGMENT_HEIGHT * 0.3, tx, targetY - SEGMENT_HEIGHT * 0.3, tx, targetY);
        ctx.strokeStyle = branchColor(node.lane);
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw commit circle
      ctx.beginPath();
      ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.node;
      ctx.fill();
      ctx.strokeStyle = COLORS.nodeBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  function update() {
    tick++;
    // Move all nodes downward (simulates time passing / history scrolling)
    nodes.forEach((node) => {
      node.y += SPEED;
    });

    // Recycle nodes that scroll off the bottom by moving them to the top
    nodes.forEach((node) => {
      if (node.y > H + SEGMENT_HEIGHT) {
        node.y -= (Math.ceil(H / SEGMENT_HEIGHT) + 2) * SEGMENT_HEIGHT;
        // Occasionally reassign a merge target
        node.mergeTarget = Math.random() < 0.25 && node.lane < LANE_COUNT - 1
          ? node.lane + 1
          : null;
      }
    });
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    // Soft background tint matching school colors
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    drawBranches();
    drawNodes();
    update();

    animationFrameId = requestAnimationFrame(render);
  }

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    } else {
      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(render);
      }
    }
  });
  resize();
  render();
})();
